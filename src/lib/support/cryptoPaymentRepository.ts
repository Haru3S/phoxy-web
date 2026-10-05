import { getDatabase } from './database';
import { cryptoContributionQuery } from './contributionRepository';
import { CRYPTO_ASSETS, type CryptoAsset } from './cryptoAssets';
import type { CryptoOrderInput } from './cryptoValidation';
import { assertPaymentMatches, type ProviderPayment } from './nowPayments';

export type PendingCryptoOrder = {
  orderId: string;
  amountUsdCents: number;
  asset: CryptoAsset;
  paymentId: string | null;
};

export async function createPendingCryptoOrder(orderId: string, input: CryptoOrderInput) {
  const sql = getDatabase();
  const asset = CRYPTO_ASSETS[input.asset];
  await sql`
    INSERT INTO support_crypto_payments (
      order_id, display_name, normalized_display_name, anonymous,
      moderation_status, moderation_reason, amount_usd_cents, asset, network, pay_currency
    ) VALUES (
      ${orderId}, ${input.displayName}, ${input.normalizedDisplayName}, ${input.anonymous},
      ${input.moderationStatus}, ${input.moderationReason}, ${input.amountUsdCents},
      ${input.asset}, ${asset.network}, ${asset.payCurrency}
    );
  `;
}

export async function markCryptoCreationUnknown(orderId: string) {
  const sql = getDatabase();
  await sql`UPDATE support_crypto_payments SET creation_state = 'creation_unknown', updated_at = now()
    WHERE order_id = ${orderId} AND creation_state = 'creating';`;
}

export async function attachProviderPayment(order: PendingCryptoOrder, payment: ProviderPayment) {
  assertPaymentMatches(payment, order);
  const sql = getDatabase();
  const rows = await sql`
    UPDATE support_crypto_payments SET
      nowpayments_payment_id = ${payment.paymentId}, creation_state = 'created',
      expected_crypto_amount = ${payment.payAmount}, pay_address = ${payment.payAddress},
      provider_status = ${payment.status}, provider_updated_at = ${payment.updatedAt}, updated_at = now()
    WHERE order_id = ${order.orderId} AND nowpayments_payment_id IS NULL
    RETURNING order_id;
  `;
  if (!(rows as { order_id: string }[]).length) throw new Error('Could not bind the provider payment.');
}

export async function findPendingCryptoOrder(orderId: string): Promise<PendingCryptoOrder | null> {
  const sql = getDatabase();
  const rows = await sql`SELECT order_id, amount_usd_cents, asset, nowpayments_payment_id
    FROM support_crypto_payments WHERE order_id = ${orderId};`;
  const row = (rows as {
    order_id: string; amount_usd_cents: string; asset: CryptoAsset; nowpayments_payment_id: string | null;
  }[])[0];
  return row ? {
    orderId: String(row.order_id), amountUsdCents: Number(row.amount_usd_cents),
    asset: row.asset as CryptoAsset, paymentId: row.nowpayments_payment_id as string | null,
  } : null;
}

export async function processCryptoPayment(order: PendingCryptoOrder, payment: ProviderPayment) {
  assertPaymentMatches(payment, order);
  if (!order.paymentId) throw new Error('Provider payment has not been bound yet.');
  const sql = getDatabase();
  // READ COMMITTED gives each statement a fresh view after the row lock is
  // acquired. All four writes/reads commit together or roll back together.
  await sql.transaction([
    sql`SELECT order_id FROM support_crypto_payments WHERE order_id = ${order.orderId} FOR UPDATE;`,
    sql`
      UPDATE support_crypto_payments SET
        provider_status = ${payment.status}, actually_paid = ${payment.actuallyPaid},
        provider_updated_at = ${payment.updatedAt}, last_ipn_at = now(), updated_at = now(),
        confirmed_at = CASE WHEN ${payment.status} = 'finished'
          AND ${payment.actuallyPaid}::numeric >= expected_crypto_amount
          THEN COALESCE(confirmed_at, ${payment.updatedAt}::timestamptz) ELSE confirmed_at END
      WHERE order_id = ${order.orderId} AND nowpayments_payment_id = ${payment.paymentId}
        AND pay_currency = ${payment.payCurrency} AND amount_usd_cents = ${payment.amountUsdCents}
        AND (provider_updated_at IS NULL OR provider_updated_at <= ${payment.updatedAt}::timestamptz)
        AND (provider_status <> 'refunded' OR ${payment.status} = 'refunded')
        AND (provider_status <> 'finished' OR ${payment.status} IN ('finished', 'refunded'));
    `,
    cryptoContributionQuery(sql, order.orderId),
    sql`
      UPDATE support_crypto_payments SET contribution_id = order_id, updated_at = now()
      WHERE order_id = ${order.orderId} AND contribution_id IS NULL AND confirmed_at IS NOT NULL
        AND EXISTS (SELECT 1 FROM support_contributions
          WHERE id = ${order.orderId} AND source = 'crypto');
    `,
  ], { isolationLevel: 'ReadCommitted' });
}
