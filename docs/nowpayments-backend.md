# NOWPayments backend — phase one

This phase adds server endpoints only. The existing direct-wallet crypto UI is
unchanged and does not call these endpoints. Direct transfers to its existing
addresses are not tracked by NOWPayments or added to the supporter board.

## Migration applied

`migrations/001_support_crypto_payments.sql` was approved and applied to the
configured Neon database on 2026-10-05. It creates `public.support_crypto_payments` only;
it does not alter `support_contributions` or any Stripe columns/constraints.
No migration runner executes it during check, build, or request handling.
Do not reapply it: the migration deliberately fails if the table already exists.
Catalog verification confirmed 23 columns, 28 validated constraints (including
NOT NULL constraints), and four valid/ready indexes. The existing ledger's columns,
constraints, and indexes match the pre-migration snapshot.

The pending table stores the server-generated UUID order, unique provider payment
ID, validated public name/privacy choice, moderation result, requested USD cents,
asset/network/provider currency, expected crypto amount and public deposit address,
actual amount, creation outcome, provider status/time, IPN processing time,
confirmation time, and a unique foreign key to the eventual contribution.
The order UUID also supplies the eventual contribution's primary key.
No API/IPN secrets, private keys, sender wallets, payout wallets, emails, raw IPNs,
or full provider responses are persisted.

## Server configuration

Configure these in Vercel's server environment after migration approval:

- `PHXFDB_DATABASE_URL`: existing production Neon connection.
- `NOWPAYMENTS_ENVIRONMENT`: `production` (default when absent) or `sandbox`.
- `NOWPAYMENTS_API_URL`: `https://api.nowpayments.io/v1` for production.
- `NOWPAYMENTS_API_KEY`: production NOWPayments API key.
- `NOWPAYMENTS_IPN_SECRET`: production IPN secret, separate from the API key.
- `NOWPAYMENTS_IPN_CALLBACK_URL`: canonical public HTTPS URL ending in
  `/api/support/crypto/ipn`, with no query, fragment, or embedded credentials.
- `NOWPAYMENTS_ENABLED`: exactly `true` to activate the endpoints; absent/false
  returns 503 before any DB or provider access.

Never use `PUBLIC_` credentials. `astro:env/server` provides the server-only
boundary. API URLs are configured in the environment and restricted to the selected
official HTTPS host and `/v1` path, with no credentials, query, or fragment. Requests use a
10-second timeout, no caching, and no redirects. Provider POSTs are not retried.
The provider account's currencies, settlement configuration, fee settings, and
underpayment tolerance must be reviewed before live use.

## Payment creation

`POST /api/support/crypto/payment` accepts JSON:

```json
{"amount":25,"asset":"usdc","anonymous":false,"displayName":"Example"}
```

`amount` is a number in USD, $1–$1,000 with at most two decimal places. `asset`
is one of the exact lowercase identifiers below. `anonymous` must be a boolean.
Named contributions use the existing 2–24 character name validation and moderation.
Anonymous orders discard the submitted name entirely. Unexpected fields are rejected;
the caller cannot select an order ID, callback URL, wallet address, provider status,
USD currency, moderation result, or arbitrary network. Requests are capped at 4 KiB.
Browser requests must originate from the configured callback URL's origin.

| Asset | Network | NOWPayments pay_currency |
| --- | --- | --- |
| ltc | Litecoin | ltc |
| btc | Bitcoin | btc |
| eth | Ethereum | eth |
| sol | Solana | sol |
| doge | Dogecoin | doge |
| usdc | Solana | usdcsol |
| usdt | Solana | usdtsol |

The centralized map is `src/lib/support/cryptoAssets.ts`. No backend preference
is assigned to LTC. The service checks current provider currency availability;
NOWPayments' payment creation endpoint enforces its current merchant/minimum rules.

The server persists the pending order **before** calling the provider and sends
`price_currency: usd`, the mapped `pay_currency`, the generated order ID, and the
configured IPN URL. It checks the provider response against the stored order before
binding the unique provider ID. A 201 response contains only payment instructions
(order/payment IDs, status, price, asset/network, expected amount and deposit address).
It never creates a contribution during payment creation.

If POST times out, its response is invalid, or its response cannot be persisted,
the order remains `creating`/`creation_unknown` for operator reconciliation. The
response includes the order ID and asks callers not to automatically retry or send
funds. Find the provider payment by this order ID in the NOWPayments dashboard and
validate/bind it before replaying its IPN. This phase does not provide an automatic
reconciliation job or a public payment-status endpoint.

## IPN and promotion policy

`POST /api/support/crypto/ipn` accepts JSON up to 64 KiB. It recursively sorts the
payload keys, serializes the complete payload with JSON.stringify, calculates
HMAC-SHA512 using the trimmed IPN secret, and compares `x-nowpayments-sig` with a
constant-time comparison. No DB or payment-status API access occurs before signature
verification. Unknown properties participate in signing but are not persisted.

After verification, the endpoint requires a known order and the exact already-bound
provider payment ID. It fetches `GET /payment/{id}` using our API key, validating
order ID, USD price, crypto currency/network and provider status. Child/repeated
deposit payments are unsupported and cannot be promoted. An IPN arriving before
payment binding returns 503 so the provider can retry.

Only provider status **`finished`** may promote, and only when the verified
`actually_paid` covers the order's original expected crypto amount. NOWPayments
documents `confirmed` as incoming confirmation and `sending` as ongoing processing;
neither is final. `waiting`, `confirming`, `confirmed`, `sending`, `spending`,
`partially_paid`, `failed`, `refunded`, and `expired` never create contributions.
Even a provider-tolerated or manually finished underpayment is kept for review.
Amounts are compared as decimals in Postgres, not floating point. Ledger USD value
is the validated original gross USD price; overpayments do not increase it. Network
fees and net settlement value are not supporter-board amounts.

One READ COMMITTED transaction locks the order, records current status/actual amount,
inserts its confirmed ledger record via the contribution repository, and links that
record back to the order. The fixed UUID primary key and unique payment/contribution
IDs prevent duplicate crediting. If any statement fails, all changes roll back and
IPN returns 503 for retry. Older provider timestamps cannot regress state; `finished`
cannot regress to an intermediate status, and `refunded` remains terminal.
The board automatically reads promoted `source: crypto` contributions through its
existing privacy/moderation logic. Pending rows never appear there.

Refund notifications update pending-table status but do not delete or reverse an
already confirmed ledger contribution. Refund accounting, repeated deposits,
manual reconciliation, rate limiting, status polling, and frontend connection are
follow-up work before a public launch. The endpoints stay disabled until enabled.

## Validation

Run `node --test tests/cryptoBackend.test.mjs`, `npm run check`, and `npm run build`.
Tests use embedded local Postgres and synthetic provider/API data; they never connect
to Neon, NOWPayments, or Stripe and never submit real payments.

Post-migration validation also executed the repository SQL and signed-IPN handler
against Neon with synthetic provider responses inside an outer transaction that
rolled back. All seven asset mappings, confirmed-status exclusion, finished promotion,
idempotency, anonymity, decimal underpayment rejection, and network constraints passed.
Zero synthetic pending orders or contributions remained after rollback. Provider
credentials were not used and no provider payment was created.

## Vercel Preview sandbox configuration

Set these variables for **Preview only**, preferably scoped to the test branch:

| Variable | Required value |
| --- | --- |
| `NOWPAYMENTS_ENVIRONMENT` | `sandbox` |
| `NOWPAYMENTS_ENABLED` | `true` |
| `NOWPAYMENTS_SANDBOX_API_URL` | `https://api-sandbox.nowpayments.io/v1` |
| `NOWPAYMENTS_SANDBOX_API_KEY` | API key from the NOWPayments sandbox account |
| `NOWPAYMENTS_SANDBOX_IPN_SECRET` | IPN secret from that same sandbox account |
| `NOWPAYMENTS_SANDBOX_IPN_CALLBACK_URL` | `https://<your-preview-host>/api/support/crypto/ipn` |
| `NOWPAYMENTS_SANDBOX_CASE` | `success` for the first complete lifecycle test |
| `NOWPAYMENTS_SANDBOX_DATABASE_URL` | Connection URL of a separate migrated Neon test branch |

The provider API URL above is an outbound destination. The IPN callback URL is
your **application's** HTTPS Preview URL; do not use the provider API URL there.
Use a stable Preview alias for the test branch, or the exact deployment hostname
that will process the callback. Configure it in both this environment variable and
the sandbox dashboard if the dashboard requests a callback URL. Redeploy after
changing variables. Vercel Deployment Protection must allow unauthenticated provider
POSTs to the IPN route; use an accessible dedicated test deployment (this backend
does not add a protection-bypass query or remove signature verification).

Sandbox reads only the `NOWPAYMENTS_SANDBOX_*` credentials, URL, and callback;
it never falls back to production credentials. Its repository requires the sandbox
database URL and rejects the same Neon database endpoint as `PHXFDB_DATABASE_URL`
when that production URL is configured. Stripe retains its existing database path.
Preview's existing `PHXFDB_DATABASE_URL` may be pointed at the test branch too if
you want to see test contributions in the Preview supporter board. Both tables
must exist in the test branch; a branch cloned after migration already contains
them. Do not change the Production database URL for sandbox testing.

`NOWPAYMENTS_SANDBOX_CASE` is server-controlled and accepts the documented
`success`, `common`, `failed`, or `partially_paid` cases. Only sandbox POSTs contain
the provider's `case` field. Production ignores all sandbox settings and never sends
that field. Invalid environments fail closed; Vercel Production refuses sandbox mode.
Missing URL or credentials return 503; the existing enable switch applies to both modes.
No database migration is needed for this configuration change.

## End-to-end provider test procedure

1. Create/configure a NOWPayments sandbox account at
   `https://account-sandbox.nowpayments.io`, including its account settlement settings,
   API key, IPN secret, and enabled coins. Never use production keys for this test.
2. Prepare a separate Neon test branch and the accessible Vercel Preview deployment
   with the variables above. Confirm the callback hostname belongs to that deployment.
3. Put the test values in a local ignored `.env.sandbox.local` file for the runner.
   The runner needs `NOWPAYMENTS_ENVIRONMENT`, `NOWPAYMENTS_ENABLED`,
   `NOWPAYMENTS_SANDBOX_CASE`, `NOWPAYMENTS_SANDBOX_IPN_CALLBACK_URL`, and
   `NOWPAYMENTS_SANDBOX_DATABASE_URL`. API/IPN credentials belong on the server;
   the runner does not use them.
4. Run this explicit opt-in command from the repository root:

   ```powershell
   node --env-file=.env.sandbox.local tests/nowPaymentsSandbox.e2e.mjs
   ```

   The runner POSTs a $25 anonymous LTC request to the normal Preview payment route
   exactly once, checks that it reports sandbox mode, and polls the test database
   for up to three minutes for provider IPN processing. It does not send funds,
   manufacture/sign IPNs, call promotion directly, or retry payment creation.
5. For `success`, confirm the actual provider's `finished` state, full crypto payment,
   IPN processing timestamp, and exactly one linked anonymous contribution. An early
   callback may receive 503 before payment binding; allow provider retry or use its
   documented IPN replay facility. Inspect dashboard/logs if the test times out.
6. Repeat with `failed` and `partially_paid`, updating the Preview case variable and
   redeploying before each runner invocation. Both must produce zero contributions.
   `common` is available for manual lifecycle observation but is not an automated
   terminal test case in the runner.
7. To test replay idempotency end to end, resend a real provider notification using
   its replay facility when available, then verify the same order still has exactly
   one contribution. Do not generate a replacement signature locally. The isolated
   tests already cover duplicate IPNs and wrong-environment signature rejection.
8. Disable the kill switch after testing. Test rows remain only on the disposable
   Neon branch; the runner does not delete data or modify the production database.

The provider integration runner is prepared but is not part of
`node --test tests/cryptoBackend.test.mjs`. It must be run separately once the real
sandbox credentials, migrated test branch, and Preview deployment are configured.
No real provider payment was submitted while implementing this support.

References:

- [NOWPayments API reference](https://documenter.getpostman.com/view/7907941/2s93JusNJt)
- [Official sandbox API and cases](https://documenter.getpostman.com/view/7907941/T1LSCRHC)
- [Official IPN signature implementation](https://github.com/NowPaymentsIO/nowpayments-sdk-nodejs/blob/master/src/ipn.js)
- [Payment status and integration guide](https://nowpayments.io/blog/nowpayments-api-explained-customize-your-payment-gateway)
- [Supported asset/network identifiers](https://nowpayments.io/supported-coins)
