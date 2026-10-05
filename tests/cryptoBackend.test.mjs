import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHmac, randomUUID } from 'node:crypto';
import { build } from 'esbuild';
import { PGlite } from '@electric-sql/pglite';

// Bundle only server code with a synthetic env/database boundary. No real
// credentials are loaded and no Neon/network client is imported by this suite.
const compiled = await build({
  stdin: {
    contents: `
      export * from './src/lib/support/cryptoValidation.ts';
      export * from './src/lib/support/cryptoAssets.ts';
      export * from './src/lib/support/nowPaymentsSignature.ts';
      export * from './src/lib/support/nowPayments.ts';
      export * from './src/lib/support/cryptoPaymentRepository.ts';
      export { POST as paymentPost } from './src/pages/api/support/crypto/payment.ts';
      export { POST as ipnPost } from './src/pages/api/support/crypto/ipn.ts';
    `, resolveDir: process.cwd(),
  }, bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{
    name: 'local-test-boundaries', setup(builder) {
      builder.onResolve({ filter: /^astro:env\/server$/ }, () => ({ path: 'env', namespace: 'test' }));
      builder.onResolve({ filter: /^\.\/database$/ }, () => ({ path: 'db', namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, ({ path }) => ({ contents: path === 'env' ?
        'export const getSecret = key => globalThis.cryptoTestSecrets[key];' :
        'export const getDatabase = () => globalThis.cryptoTestDatabase;' }));
    },
  }],
});
const backend = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const db = new PGlite();
let failLedgerInsert = false;
let queryCount = 0;
function sql(strings, ...values) {
  const text = strings.reduce((result, part, index) => result + part + (index < values.length ? `$${index + 1}` : ''), '');
  const execute = async connection => {
    queryCount++;
    if (failLedgerInsert && text.includes('INSERT INTO support_contributions')) throw new Error('Synthetic ledger failure');
    return (await connection.query(text, values)).rows;
  };
  // Neon query promises are lazy and may be passed to a transaction.
  return { execute, then(resolve, reject) { return execute(db).then(resolve, reject); } };
}
sql.transaction = queries => db.transaction(async tx => {
  const results = [];
  for (const query of queries) results.push(await query.execute(tx));
  return results;
});
globalThis.cryptoTestDatabase = sql;
globalThis.cryptoTestSecrets = {
  NOWPAYMENTS_ENABLED: 'true', NOWPAYMENTS_API_KEY: 'synthetic-api-key',
  NOWPAYMENTS_IPN_SECRET: 'synthetic-ipn-secret',
  NOWPAYMENTS_IPN_CALLBACK_URL: 'https://example.test/api/support/crypto/ipn',
};
const originalFetch = globalThis.fetch;
after(async () => { globalThis.fetch = originalFetch; await db.close(); });

before(async () => {
  // Mirror the inspected existing ledger constraints, then apply only to local PG.
  await db.exec(`CREATE TABLE support_contributions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), display_name varchar(24),
    normalized_display_name varchar(24), anonymous boolean NOT NULL,
    amount_usd_cents bigint NOT NULL CHECK (amount_usd_cents > 0),
    source varchar(16) NOT NULL CHECK (source IN ('stripe','crypto','manual')),
    asset varchar(16), native_amount text, supported_at timestamptz NOT NULL,
    moderation_status varchar(16) NOT NULL CHECK (moderation_status IN ('approved','rejected','pending')),
    moderation_reason varchar(32), stripe_event_id text UNIQUE, stripe_session_id text UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK ((anonymous AND normalized_display_name IS NULL) OR
      (NOT anonymous AND display_name IS NOT NULL AND normalized_display_name IS NOT NULL))
  );`);
  await db.exec(await readFile(new URL('../migrations/001_support_crypto_payments.sql', import.meta.url), 'utf8'));
});

function provider(order, status = 'waiting', actuallyPaid = '0', time = '2026-10-05T15:00:00Z') {
  return {
    paymentId: '123456789', orderId: order.orderId, status, amountUsdCents: order.amountUsdCents,
    payCurrency: backend.CRYPTO_ASSETS[order.asset].payCurrency, payAmount: '0.25',
    payAddress: 'synthetic-public-deposit-address', actuallyPaid, updatedAt: time,
  };
}
function rawPayment(payment) {
  return {
    payment_id: payment.paymentId, order_id: payment.orderId, payment_status: payment.status,
    price_amount: payment.amountUsdCents / 100, price_currency: 'usd',
    pay_currency: payment.payCurrency, pay_amount: payment.payAmount, pay_address: payment.payAddress,
    actually_paid: payment.actuallyPaid, updated_at: payment.updatedAt,
  };
}
async function boundOrder(input = { amount: 25, asset: 'ltc', anonymous: false, displayName: 'Example' }) {
  const validated = backend.validateCryptoOrder(input);
  const order = { orderId: randomUUID(), amountUsdCents: validated.amountUsdCents, asset: validated.asset, paymentId: null };
  await backend.createPendingCryptoOrder(order.orderId, validated);
  const payment = provider(order);
  // Unique provider IDs for each test order.
  payment.paymentId = String(BigInt('123456789') + BigInt(queryCount));
  await backend.attachProviderPayment(order, payment);
  return { order: { ...order, paymentId: payment.paymentId }, payment };
}
async function ledger(orderId) {
  return (await db.query('SELECT * FROM support_contributions WHERE id = $1', [orderId])).rows;
}
function ipnRequest(payload, signature) {
  return new Request('https://example.test/api/support/crypto/ipn', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-nowpayments-sig': signature },
    body: JSON.stringify(payload),
  });
}
function sign(payload) {
  return createHmac('sha512', globalThis.cryptoTestSecrets.NOWPAYMENTS_IPN_SECRET)
    .update(JSON.stringify(backend.sortObjectDeep(payload))).digest('hex');
}

test('strict request validation, all seven networks, and anonymous name disposal', () => {
  for (const asset of Object.keys(backend.CRYPTO_ASSETS)) {
    const result = backend.validateCryptoOrder({ amount: 12.34, asset, anonymous: true, displayName: 'Ignored' });
    assert.equal(result.amountUsdCents, 1234);
    assert.equal(result.displayName, null);
    assert.equal(result.normalizedDisplayName, null);
  }
  assert.equal(backend.CRYPTO_ASSETS.usdc.payCurrency, 'usdcsol');
  assert.equal(backend.CRYPTO_ASSETS.usdt.payCurrency, 'usdtsol');
  assert.throws(() => backend.validateCryptoOrder({}));
  const invalid = [null, [], { amount: '25' }, { amount: 0.99 }, { amount: 1000.01 },
    { amount: 1.001 }, { amount: Infinity }, { asset: 'usdttrc20' }, { asset: '__proto__' },
    { anonymous: 'false' }, { displayName: 'admin' }, { displayName: 'bad name' },
    { displayName: 'nazi_1488' }, { callbackUrl: 'https://evil.test' }, { orderId: randomUUID() }];
  for (const overrides of invalid) {
    assert.throws(() => backend.validateCryptoOrder(overrides === null || Array.isArray(overrides) ? overrides :
      { amount: 25, asset: 'btc', anonymous: false, displayName: 'Example', ...overrides }));
  }
});

test('provider decimal amounts are normalized and bounded', () => {
  assert.equal(backend.decimalAmount(1e-8), '0.00000001');
  assert.equal(backend.decimalAmount('-1'), null);
  assert.equal(backend.decimalAmount('NaN'), null);
  assert.equal(backend.decimalAmount('0.249999999999999999999999999999'), '0.249999999999999999999999999999');
  assert.equal(backend.decimalAmount('1e-31'), null);
});

test('IPN HMAC recursively sorts nested objects and arrays and rejects tampering', () => {
  const payload = { z: [{ b: 2, a: 1 }], a: { y: 1, x: 'value' } };
  const canonical = '{"a":{"x":"value","y":1},"z":[{"a":1,"b":2}]}';
  const expected = createHmac('sha512', 'secret').update(canonical).digest('hex');
  assert.equal(backend.verifyNowPaymentsSignature(payload, expected, 'secret'), true);
  assert.equal(backend.verifyNowPaymentsSignature({ ...payload, extra: true }, expected, 'secret'), false);
  for (const signature of [null, '', 'a', 'z'.repeat(128), '0'.repeat(128)]) {
    assert.equal(backend.verifyNowPaymentsSignature(payload, signature, 'secret'), false);
  }
});

test('provider creation sends USD/server order/callback and validates asset binding', async () => {
  const order = { orderId: randomUUID(), amountUsdCents: 2500, asset: 'usdc' };
  const calls = [];
  const client = backend.createNowPaymentsClient(backend.getNowPaymentsConfig(), async (url, options) => {
    calls.push({ url, options });
    return Response.json(url.endsWith('/currencies') ? { currencies: ['usdcsol'] } : rawPayment(provider(order)));
  });
  const payment = await client.createPayment(order);
  assert.equal(payment.payCurrency, 'usdcsol');
  assert.equal(calls[1].options.headers['x-api-key'], 'synthetic-api-key');
  const sent = JSON.parse(calls[1].options.body);
  assert.deepEqual(sent, { price_amount: 25, price_currency: 'usd', pay_currency: 'usdcsol',
    order_id: order.orderId, order_description: 'Phoxy support', ipn_callback_url: 'https://example.test/api/support/crypto/ipn' });
  assert.throws(() => backend.assertPaymentMatches({ ...payment, payCurrency: 'usdc' }, order));
  assert.throws(() => backend.parseProviderPayment({ ...rawPayment(payment), parent_payment_id: '999' }));
  assert.throws(() => backend.parseProviderPayment({ ...rawPayment(payment), price_currency: 'eur' }));
  assert.throws(() => backend.parseProviderPayment({ ...rawPayment(payment), payment_id: Number.MAX_SAFE_INTEGER + 1 }));
});

test('intermediate/failure/partial statuses never create contributions', async () => {
  for (const status of backend.PAYMENT_STATUSES.filter(status => status !== 'finished')) {
    const { order, payment } = await boundOrder();
    await backend.processCryptoPayment(order, { ...payment, status, actuallyPaid: '0.25', updatedAt: '2026-10-05T15:01:00Z' });
    assert.equal((await ledger(order.orderId)).length, 0, status);
  }
});

test('finished underpayment remains unpromoted; full success is idempotent and preserves identity', async () => {
  const { order, payment } = await boundOrder();
  await backend.processCryptoPayment(order, { ...payment, status: 'finished', actuallyPaid: '0.249999999999999999999999999999', updatedAt: '2026-10-05T15:01:00Z' });
  assert.equal((await ledger(order.orderId)).length, 0);
  const finished = { ...payment, status: 'finished', actuallyPaid: '0.25', updatedAt: '2026-10-05T15:02:00Z' };
  await backend.processCryptoPayment(order, finished);
  await backend.processCryptoPayment(order, finished);
  const rows = await ledger(order.orderId);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source, 'crypto');
  assert.equal(rows[0].asset, 'ltc');
  assert.equal(Number(rows[0].amount_usd_cents), 2500);
  assert.equal(rows[0].display_name, 'Example');
  assert.equal(rows[0].normalized_display_name, 'example');
  assert.equal(rows[0].stripe_event_id, null);
  assert.equal(rows[0].stripe_session_id, null);
  const pending = (await db.query('SELECT contribution_id FROM support_crypto_payments WHERE order_id = $1', [order.orderId])).rows[0];
  assert.equal(pending.contribution_id, order.orderId);
  // A delayed intermediate callback cannot regress a finished payment.
  await backend.processCryptoPayment(order, { ...payment, status: 'confirming', updatedAt: '2026-10-05T15:03:00Z' });
  const status = (await db.query('SELECT provider_status FROM support_crypto_payments WHERE order_id = $1', [order.orderId])).rows[0];
  assert.equal(status.provider_status, 'finished');
});

test('SQL rollback leaves the order retryable after a ledger failure', async () => {
  const { order, payment } = await boundOrder({ amount: 25, asset: 'usdt', anonymous: true, displayName: 'PrivateName' });
  const finished = { ...payment, status: 'finished', actuallyPaid: '0.25', updatedAt: '2026-10-05T15:01:00Z' };
  failLedgerInsert = true;
  await assert.rejects(backend.processCryptoPayment(order, finished));
  failLedgerInsert = false;
  const pending = (await db.query('SELECT provider_status, confirmed_at FROM support_crypto_payments WHERE order_id = $1', [order.orderId])).rows[0];
  assert.equal(pending.provider_status, 'waiting');
  assert.equal(pending.confirmed_at, null);
  assert.equal((await ledger(order.orderId)).length, 0);
  await backend.processCryptoPayment(order, finished);
  const record = (await ledger(order.orderId))[0];
  assert.equal(record.anonymous, true);
  assert.equal(record.display_name, null);
  assert.equal(record.normalized_display_name, null);
});

test('invalid signature accesses neither DB nor provider; valid IPN uses current API state', async () => {
  const { order, payment } = await boundOrder();
  const payload = { order_id: order.orderId, payment_id: order.paymentId, payment_status: 'finished' };
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json(rawPayment(payment)); };
  const count = queryCount;
  assert.equal((await backend.ipnPost({ request: ipnRequest(payload, '0'.repeat(128)) })).status, 401);
  assert.equal(queryCount, count);
  assert.equal(calls, 0);
  // A signed finished notification does not override the current API's waiting state.
  assert.equal((await backend.ipnPost({ request: ipnRequest(payload, sign(payload)) })).status, 200);
  assert.equal((await ledger(order.orderId)).length, 0);
  globalThis.fetch = async () => Response.json(rawPayment({ ...payment, status: 'finished', actuallyPaid: '0.25', updatedAt: '2026-10-05T15:02:00Z' }));
  for (let index = 0; index < 2; index++) {
    assert.equal((await backend.ipnPost({ request: ipnRequest(payload, sign(payload)) })).status, 200);
  }
  assert.equal((await ledger(order.orderId)).length, 1);
});

test('API route creates pending payment only and default feature gate blocks all access', async () => {
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/currencies')) return Response.json({ currencies: ['btc'] });
    const input = JSON.parse(options.body);
    return Response.json(rawPayment({ ...provider({ orderId: input.order_id, amountUsdCents: 2500, asset: 'btc' }), paymentId: '987654321' }));
  };
  const request = () => new Request('https://example.test/api/support/crypto/payment', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.test' },
    body: JSON.stringify({ amount: 25, asset: 'btc', anonymous: true }),
  });
  const response = await backend.paymentPost({ request: request() });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  assert.equal(body.payCurrency, 'btc');
  assert.equal((await ledger(body.orderId)).length, 0);
  assert.equal(JSON.stringify(body).includes('synthetic-api-key'), false);
  delete globalThis.cryptoTestSecrets.NOWPAYMENTS_ENABLED;
  const count = queryCount;
  assert.equal((await backend.paymentPost({ request: request() })).status, 503);
  assert.equal(queryCount, count);
  globalThis.cryptoTestSecrets.NOWPAYMENTS_ENABLED = 'true';
});

test('creation rejects cross-origin, malformed, and oversized bodies before touching DB', async () => {
  const count = queryCount;
  let providerCalls = 0;
  globalThis.fetch = async () => { providerCalls++; throw new Error('Must not call provider'); };
  for (const [origin, body, expected] of [
    ['https://evil.test', '{}', 403],
    ['https://example.test', 'null', 400],
    ['https://example.test', '{', 400],
    ['https://example.test', JSON.stringify({ amount: 25, asset: 'btc', anonymous: 'true' }), 400],
    ['https://example.test', JSON.stringify({ amount: 25, asset: 'btc', anonymous: true, displayName: 'x'.repeat(4096) }), 400],
  ]) {
    const request = new Request('https://example.test/api/support/crypto/payment', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body,
    });
    assert.equal((await backend.paymentPost({ request })).status, expected);
  }
  assert.equal(queryCount, count);
  assert.equal(providerCalls, 0);
});

test('IPN retries unbound orders and rejects a different payment or mismatched USD price', async () => {
  const orderId = randomUUID();
  await backend.createPendingCryptoOrder(orderId, backend.validateCryptoOrder({ amount: 25, asset: 'sol', anonymous: true }));
  const early = { order_id: orderId, payment_id: '123456789' };
  assert.equal((await backend.ipnPost({ request: ipnRequest(early, sign(early)) })).status, 503);
  const { order, payment } = await boundOrder();
  const mismatch = { order_id: order.orderId, payment_id: '999999999' };
  assert.equal((await backend.ipnPost({ request: ipnRequest(mismatch, sign(mismatch)) })).status, 400);
  const payload = { order_id: order.orderId, payment_id: order.paymentId };
  globalThis.fetch = async () => Response.json(rawPayment({ ...payment, amountUsdCents: 2600, status: 'finished', actuallyPaid: '0.25' }));
  assert.equal((await backend.ipnPost({ request: ipnRequest(payload, sign(payload)) })).status, 503);
  assert.equal((await ledger(order.orderId)).length, 0);
});

test('older provider snapshots are ignored and refunded state never promotes', async () => {
  const { order, payment } = await boundOrder();
  await backend.processCryptoPayment(order, { ...payment, status: 'refunded', updatedAt: '2026-10-05T15:02:00Z' });
  await backend.processCryptoPayment(order, { ...payment, status: 'finished', actuallyPaid: '0.25', updatedAt: '2026-10-05T15:01:00Z' });
  assert.equal((await ledger(order.orderId)).length, 0);
  await backend.processCryptoPayment(order, { ...payment, status: 'finished', actuallyPaid: '0.25', updatedAt: '2026-10-05T15:03:00Z' });
  assert.equal((await ledger(order.orderId)).length, 0);
});

test('an ambiguous provider POST is not retried and leaves a reconcilable pending order', async () => {
  let posts = 0;
  globalThis.fetch = async url => {
    if (url.endsWith('/currencies')) return Response.json({ currencies: ['eth'] });
    posts++;
    throw new Error('Synthetic timeout after provider may have created payment');
  };
  const request = new Request('https://example.test/api/support/crypto/payment', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 25, asset: 'eth', anonymous: true }),
  });
  const response = await backend.paymentPost({ request });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(posts, 1);
  const pending = (await db.query('SELECT creation_state, nowpayments_payment_id FROM support_crypto_payments WHERE order_id = $1', [body.orderId])).rows[0];
  assert.equal(pending.creation_state, 'creation_unknown');
  assert.equal(pending.nowpayments_payment_id, null);
  assert.equal((await ledger(body.orderId)).length, 0);
});
