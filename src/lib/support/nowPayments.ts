// Imported exclusively by server routes. astro:env/server prevents client imports.
import { getSecret } from 'astro:env/server';
import { CRYPTO_ASSETS, type CryptoAsset } from './cryptoAssets';
import { decimalAmount, isObject, orderId, paymentId, usdCents, CryptoValidationError } from './cryptoValidation';

export const PAYMENT_STATUSES = [
  'waiting', 'confirming', 'confirmed', 'sending', 'spending', 'partially_paid',
  'finished', 'failed', 'refunded', 'expired',
] as const;
export type PaymentStatus = typeof PAYMENT_STATUSES[number];

export type ProviderPayment = {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  amountUsdCents: number;
  payCurrency: string;
  payAmount: string;
  payAddress: string | null;
  actuallyPaid: string | null;
  outcomeAmount: string | null;
  outcomeCurrency: string | null;
  updatedAt: string;
};

export class NowPaymentsError extends Error {
  constructor(message: string, readonly status?: number, readonly retryAfter?: string) {
    super(message);
  }
}

export function getNowPaymentsEnvironment(): 'production' | 'sandbox' {
  const environment = getSecret('NOWPAYMENTS_ENVIRONMENT') ?? 'production';
  if (environment !== 'production' && environment !== 'sandbox') {
    throw new NowPaymentsError('Invalid NOWPayments environment.');
  }
  if (environment === 'sandbox' && getSecret('VERCEL_ENV') === 'production') {
    throw new NowPaymentsError('NOWPayments sandbox is not allowed on Vercel Production.');
  }
  return environment;
}

const SANDBOX_CASES = ['success', 'common', 'failed', 'partially_paid'] as const;

export function getNowPaymentsConfig() {
  const environment = getNowPaymentsEnvironment();
  const prefix = environment === 'sandbox' ? 'NOWPAYMENTS_SANDBOX' : 'NOWPAYMENTS';
  const apiKey = getSecret(`${prefix}_API_KEY`)?.trim();
  const ipnSecret = getSecret(`${prefix}_IPN_SECRET`)?.trim();
  const callback = getSecret(`${prefix}_IPN_CALLBACK_URL`);
  const apiUrl = getSecret(`${prefix}_API_URL`);
  const settlementCurrency = getSecret(`${prefix}_SETTLEMENT_CURRENCY`);
  if (getSecret('NOWPAYMENTS_ENABLED') !== 'true' || !apiKey || !ipnSecret || !callback || !apiUrl) {
    throw new NowPaymentsError('NOWPayments is not enabled/configured.');
  }
  if (!settlementCurrency || !/^[a-z0-9]{2,16}$/.test(settlementCurrency)) {
    throw new NowPaymentsError('Configure the exact NOWPayments settlement currency/network.');
  }
  // URLs come from configuration. Restrict credential forwarding to the selected
  // official HTTPS endpoint; arbitrary hosts and cross-environment URLs fail closed.
  const baseUrl = new URL(apiUrl);
  const expectedHost = environment === 'sandbox' ? 'api-sandbox.nowpayments.io' : 'api.nowpayments.io';
  if (baseUrl.protocol !== 'https:' || baseUrl.hostname !== expectedHost || baseUrl.port ||
    baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash ||
    !/^\/v1\/?$/.test(baseUrl.pathname)) {
    throw new NowPaymentsError('Invalid NOWPayments API URL.');
  }
  const callbackUrl = new URL(callback);
  if (callbackUrl.protocol !== 'https:' || callbackUrl.username || callbackUrl.password ||
    callbackUrl.search || callbackUrl.hash || callbackUrl.pathname !== '/api/support/crypto/ipn') {
    throw new NowPaymentsError('Invalid NOWPayments callback URL.');
  }
  const sandboxCase = environment === 'sandbox' ? getSecret('NOWPAYMENTS_SANDBOX_CASE') : undefined;
  if (environment === 'sandbox' && !SANDBOX_CASES.includes(sandboxCase as typeof SANDBOX_CASES[number])) {
    throw new NowPaymentsError('Invalid or missing NOWPayments sandbox case.');
  }
  return { environment, apiKey, ipnSecret, callbackUrl: callbackUrl.toString(),
    apiUrl: baseUrl.toString().replace(/\/$/, ''), sandboxCase, settlementCurrency };
}

export function parseProviderPayment(value: unknown): ProviderPayment {
  if (!isObject(value)) throw new NowPaymentsError('Invalid provider payment.');
  const id = paymentId(value.payment_id);
  const priceAmount = decimalAmount(value.price_amount);
  const cents = priceAmount === null ? null : usdCents(Number(priceAmount));
  const payAmount = decimalAmount(value.pay_amount);
  const actuallyPaid = value.actually_paid === null || value.actually_paid === undefined ? null : decimalAmount(value.actually_paid);
  const outcomeAmount = value.outcome_amount == null ? null : decimalAmount(value.outcome_amount);
  const outcomeCurrency = value.outcome_currency == null ? null : value.outcome_currency;
  const updatedAt = typeof value.updated_at === 'string' ? new Date(value.updated_at) : null;
  if (!id || !orderId(value.order_id) || cents === null || value.price_currency !== 'usd' ||
    !payAmount || Number(payAmount) <= 0 ||
    (value.actually_paid != null && actuallyPaid === null) ||
    (value.outcome_amount != null && outcomeAmount === null) ||
    (outcomeCurrency !== null && (typeof outcomeCurrency !== 'string' || !/^[a-z0-9]{2,16}$/.test(outcomeCurrency))) ||
    typeof value.pay_currency !== 'string' ||
    !PAYMENT_STATUSES.includes(value.payment_status as PaymentStatus) ||
    !updatedAt || !Number.isFinite(updatedAt.getTime()) ||
    (value.pay_address != null && (typeof value.pay_address !== 'string' || value.pay_address.length > 256)) ||
    (value.parent_payment_id != null && String(value.parent_payment_id) !== '0')) {
    throw new NowPaymentsError('Invalid or unsupported provider payment.');
  }
  return {
    paymentId: id, orderId: value.order_id, status: value.payment_status as PaymentStatus,
    amountUsdCents: cents, payCurrency: value.pay_currency, payAmount,
    payAddress: typeof value.pay_address === 'string' && value.pay_address ? value.pay_address : null,
    actuallyPaid, outcomeAmount, outcomeCurrency: outcomeCurrency as string | null,
    updatedAt: updatedAt.toISOString(),
  };
}

export function assertPaymentMatches(payment: ProviderPayment, order: { orderId: string; amountUsdCents: number; asset: CryptoAsset; paymentId?: string | null; expectedOutcomeCurrency?: string | null }) {
  if (payment.orderId !== order.orderId || payment.amountUsdCents !== order.amountUsdCents ||
    payment.payCurrency !== CRYPTO_ASSETS[order.asset].payCurrency ||
    (order.paymentId && order.paymentId !== payment.paymentId) ||
    (order.expectedOutcomeCurrency && payment.outcomeCurrency && order.expectedOutcomeCurrency !== payment.outcomeCurrency)) {
    throw new NowPaymentsError('Provider payment does not match the internal order.');
  }
}

export function createNowPaymentsClient(config: ReturnType<typeof getNowPaymentsConfig>, fetchImpl = fetch) {
  async function request(path: string, body?: object, signal?: AbortSignal): Promise<unknown> {
    const response = await fetchImpl(`${config.apiUrl}/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'x-api-key': config.apiKey, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
      cache: 'no-store', redirect: 'error',
    });
    if (!response.ok) {
      // Forward only a validated delay, never the provider's raw error body.
      // Never retry payment POSTs, including 429s or ambiguous network failures.
      const retry = response.headers.get('retry-after');
      const seconds = retry && /^\d{1,6}$/.test(retry) ? Number(retry) :
        retry ? Math.ceil((Date.parse(retry) - Date.now()) / 1000) : NaN;
      const retryAfter = response.status === 429 ? String(Number.isFinite(seconds) ?
        Math.max(1, Math.min(86400, seconds)) : 1) : undefined;
      throw new NowPaymentsError(`NOWPayments request failed (${response.status}).`, response.status, retryAfter);
    }
    return response.json();
  }
  return {
    async createPayment(order: { orderId: string; amountUsdCents: number; asset: CryptoAsset; expectedOutcomeCurrency?: string | null }) {
      const payCurrency = CRYPTO_ASSETS[order.asset].payCurrency;
      const currencies = await request('currencies');
      if (!isObject(currencies) || !Array.isArray(currencies.currencies)) throw new NowPaymentsError('Invalid currency response.');
      if (!currencies.currencies.includes(payCurrency)) throw new CryptoValidationError('Selected asset/network is currently unavailable.');
      // The provider enforces merchant-specific minima and account availability on POST.
      // Never automatically retry POST: a network timeout may already have created a payment.
      const payment = parseProviderPayment(await request('payment', {
        price_amount: order.amountUsdCents / 100, price_currency: 'usd',
        pay_currency: payCurrency, order_id: order.orderId,
        order_description: 'Phoxy support', ipn_callback_url: config.callbackUrl,
        ...(config.environment === 'sandbox' ? { case: config.sandboxCase } : {}),
      }));
      assertPaymentMatches(payment, order);
      if (!payment.payAddress) throw new NowPaymentsError('Provider did not return payment instructions.');
      return payment;
    },
    async getPayment(id: string, signal?: AbortSignal) {
      if (!paymentId(id)) throw new NowPaymentsError('Invalid payment ID.');
      return parseProviderPayment(await request(`payment/${id}`, undefined, signal));
    },
  };
}
