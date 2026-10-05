import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';
import { getNowPaymentsConfig, createNowPaymentsClient } from '../../../../lib/support/nowPayments';
import { createPendingCryptoOrder, attachProviderPayment, markCryptoCreationUnknown } from '../../../../lib/support/cryptoPaymentRepository';
import { validateCryptoOrder, CryptoValidationError } from '../../../../lib/support/cryptoValidation';
import { CRYPTO_ASSETS } from '../../../../lib/support/cryptoAssets';
import { cryptoJson, readCryptoJson } from '../../../../lib/support/cryptoHttp';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let config: ReturnType<typeof getNowPaymentsConfig>;
  try { config = getNowPaymentsConfig(); }
  catch { return cryptoJson({ error: 'Crypto payments are unavailable.' }, 503); }
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(config.callbackUrl).origin) ||
    request.headers.get('sec-fetch-site') === 'cross-site') {
    return cryptoJson({ error: 'Invalid request origin.' }, 403);
  }
  let input: ReturnType<typeof validateCryptoOrder>;
  try { input = validateCryptoOrder(await readCryptoJson(request, 4096)); }
  catch (error) {
    return cryptoJson({ error: error instanceof CryptoValidationError ? error.message : 'Invalid payment request.' }, 400);
  }
  const orderId = randomUUID();
  const order = { orderId, amountUsdCents: input.amountUsdCents, asset: input.asset, paymentId: null };
  try { await createPendingCryptoOrder(orderId, input); }
  catch {
    console.error('Could not persist pending crypto order.', { orderId });
    return cryptoJson({ error: 'Crypto payments are unavailable.' }, 503);
  }
  try {
    const payment = await createNowPaymentsClient(config).createPayment(order);
    await attachProviderPayment(order, payment);
    return cryptoJson({
      orderId, paymentId: payment.paymentId, status: payment.status,
      amount: input.amountUsdCents / 100, priceCurrency: 'usd', asset: input.asset,
      network: CRYPTO_ASSETS[input.asset].network, payCurrency: payment.payCurrency,
      payAmount: payment.payAmount, payAddress: payment.payAddress,
    }, 201);
  } catch (error) {
    // Preserve the order for reconciliation if the provider POST timed out or
    // succeeded but its response could not be saved. Do not create a second payment.
    try { await markCryptoCreationUnknown(orderId); }
    catch { console.error('Could not mark crypto creation outcome.', { orderId }); }
    console.error('Crypto payment creation did not complete.', { orderId });
    return cryptoJson({
      orderId, error: error instanceof CryptoValidationError ? error.message :
        'Payment creation could not be completed. Do not send funds or automatically retry this order.',
    }, error instanceof CryptoValidationError ? 422 : 503);
  }
};
