import type { APIRoute } from 'astro';
import { getNowPaymentsConfig, createNowPaymentsClient } from '../../../../lib/support/nowPayments';
import { verifyNowPaymentsSignature } from '../../../../lib/support/nowPaymentsSignature';
import { isObject, orderId, paymentId, CryptoValidationError } from '../../../../lib/support/cryptoValidation';
import { findPendingCryptoOrder, processCryptoPayment } from '../../../../lib/support/cryptoPaymentRepository';
import { cryptoJson, readCryptoJson } from '../../../../lib/support/cryptoHttp';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let config: ReturnType<typeof getNowPaymentsConfig>;
  try { config = getNowPaymentsConfig(); }
  catch { return cryptoJson({ error: 'Crypto notifications are unavailable.' }, 503); }
  let payload: unknown;
  try { payload = await readCryptoJson(request, 65536); }
  catch (error) {
    return cryptoJson({ error: error instanceof CryptoValidationError ? error.message : 'Invalid notification.' }, 400);
  }
  if (!verifyNowPaymentsSignature(payload, request.headers.get('x-nowpayments-sig'), config.ipnSecret)) {
    return cryptoJson({ error: 'Invalid notification signature.' }, 401);
  }
  if (!isObject(payload) || !orderId(payload.order_id)) return cryptoJson({ error: 'Invalid order.' }, 400);
  const id = paymentId(payload.payment_id);
  if (!id) return cryptoJson({ error: 'Invalid payment.' }, 400);
  try {
    const order = await findPendingCryptoOrder(payload.order_id);
    if (!order) return cryptoJson({ error: 'Unknown crypto order.' }, 400);
    // A callback can arrive before POST's response is saved. Let NOWPayments retry;
    // never bind an arbitrary payment ID from an IPN to an unbound order.
    if (!order.paymentId) return cryptoJson({ error: 'Payment binding is pending.' }, 503);
    if (order.paymentId !== id) return cryptoJson({ error: 'Payment does not match order.' }, 400);
    // Read current provider state instead of trusting a delayed notification's status.
    const payment = await createNowPaymentsClient(config).getPayment(id);
    await processCryptoPayment(order, payment);
    return cryptoJson({ received: true });
  } catch {
    // Non-2xx allows provider retry after DB/API failures; no raw payment payloads,
    // supporter names, wallet information, or credentials are written to logs.
    console.error('Could not process verified crypto notification.', { orderId: payload.order_id, paymentId: id });
    return cryptoJson({ error: 'Notification could not be processed.' }, 503);
  }
};
