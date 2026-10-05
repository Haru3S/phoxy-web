// Explicit opt-in provider test. Never invoked by the isolated backend tests.
// Uses the real Preview route, provider callbacks, and the isolated Neon branch.
import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import { setTimeout as delay } from 'node:timers/promises';

async function main() {
  assert.equal(process.env.NOWPAYMENTS_ENVIRONMENT, 'sandbox', 'Select sandbox explicitly.');
  assert.equal(process.env.NOWPAYMENTS_ENABLED, 'true', 'Enable the configured sandbox environment.');
  const simulationCase = process.env.NOWPAYMENTS_SANDBOX_CASE;
  assert.ok(['success', 'failed', 'partially_paid'].includes(simulationCase), 'Use an automated terminal sandbox case.');
  const callback = new URL(process.env.NOWPAYMENTS_SANDBOX_IPN_CALLBACK_URL);
  assert.equal(callback.protocol, 'https:');
  assert.equal(callback.pathname, '/api/support/crypto/ipn');
  assert.ok(!callback.username && !callback.password && !callback.search && !callback.hash);
  const databaseUrl = process.env.NOWPAYMENTS_SANDBOX_DATABASE_URL;
  assert.ok(databaseUrl, 'Configure the isolated sandbox Neon connection.');
  if (process.env.PHXFDB_DATABASE_URL) {
    const production = new URL(process.env.PHXFDB_DATABASE_URL);
    const sandbox = new URL(databaseUrl);
    assert.ok(production.hostname.replace('-pooler.', '.') !== sandbox.hostname.replace('-pooler.', '.') ||
      production.pathname !== sandbox.pathname, 'Sandbox must use a separate database.');
  }
  const sql = neon(databaseUrl);
  const schema = await sql`SELECT to_regclass('public.support_crypto_payments')::text AS pending,
    to_regclass('public.support_contributions')::text AS ledger`;
  assert.ok(schema[0].pending && schema[0].ledger, 'Prepare the migrated test branch first.');
  const columns = await sql`SELECT count(*) AS count FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'support_crypto_payments'
      AND column_name IN ('expected_outcome_currency', 'outcome_currency', 'outcome_amount')`;
  assert.equal(Number(columns[0].count), 3, 'Apply approved migration 002 to the test branch first.');
  const endpoint = new URL('/api/support/crypto/payment', callback);
  // No synthetic IPN signing, manual promotion, provider POST retries, or funds.
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 25, asset: 'ltc', anonymous: true }),
    signal: AbortSignal.timeout(30_000), redirect: 'error',
  });
  assert.equal(response.status, 201, 'Payment creation failed; inspect Preview logs. Do not automatically retry.');
  const payment = await response.json();
  assert.equal(payment.environment, 'sandbox', 'Deployment is not configured for sandbox; stop.');
  assert.ok(typeof payment.orderId === 'string' && typeof payment.paymentId === 'string');
  console.log(JSON.stringify({ orderId: payment.orderId, paymentId: payment.paymentId, case: simulationCase }));
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const rows = await sql`
      SELECT p.provider_status, p.last_ipn_at, p.confirmed_at, p.contribution_id,
        p.nowpayments_payment_id, p.anonymous, p.display_name, p.normalized_display_name,
        p.outcome_amount > 0 AND p.outcome_currency = p.expected_outcome_currency AS settled,
        (SELECT count(*) FROM support_contributions c WHERE c.id = p.order_id) AS contribution_count,
        (SELECT c.source FROM support_contributions c WHERE c.id = p.order_id) AS source
      FROM support_crypto_payments p WHERE p.order_id = ${payment.orderId};
    `;
    const row = rows[0];
    if (row && row.last_ipn_at) {
      assert.equal(String(row.nowpayments_payment_id), payment.paymentId);
      if (simulationCase === 'success' && row.provider_status === 'finished' && row.contribution_id) {
        assert.equal(row.settled, true);
        assert.equal(row.contribution_id, payment.orderId);
        assert.equal(Number(row.contribution_count), 1);
        assert.equal(row.source, 'crypto');
        assert.ok(row.confirmed_at);
        assert.equal(row.anonymous, true);
        assert.equal(row.display_name, null);
        assert.equal(row.normalized_display_name, null);
        console.log('PASS: provider IPN promoted exactly one anonymous sandbox contribution.');
        return;
      }
      if (simulationCase !== 'success' && row.provider_status === simulationCase) {
        assert.equal(Number(row.contribution_count), 0);
        assert.equal(row.contribution_id, null);
        assert.equal(row.confirmed_at, null);
        console.log(`PASS: provider ${simulationCase} IPN created no contribution.`);
        return;
      }
    }
    await delay(2000);
  }
  throw new Error('Timed out waiting for provider IPN processing. Inspect the sandbox dashboard and Preview logs; do not pay or retry automatically.');
}

main().catch(() => {
  // No driver errors, connection URLs, provider credentials, or raw payloads.
  console.error('Sandbox E2E did not pass. Check required configuration, schema, Preview logs, and the provider dashboard.');
  process.exitCode = 1;
});
