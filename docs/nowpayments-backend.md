# NOWPayments support integration

The Crypto Support frontend calls the payment endpoint through
Identity → Amount → Currency → Payment. It reuses fiat form styles, identity
validation/moderation, and preset/custom USD inputs with $1–$1,000 bounds. Public
asset/network metadata comes from the server's centralized asset map; the browser
sends only internal asset IDs. The old direct-wallet address list has been removed.

LTC remains a presentation preference, and all seven mapped assets are selectable.
USDC and USDT prominently show Solana. Exact provider-created crypto amount/address,
network, payment/order references, and a sandbox warning are rendered as text.
Creation is never shown as confirmed support; signed IPN verification and promotion
remain authoritative. There is no "I sent it" action or client-side ledger mutation.

The frontend blocks repeated clicks and freezes ambiguous creation for operator
reconciliation. Known validation failures can be corrected; a known pre-provider
unavailable response offers another method or a later attempt. There are no
automatic POST retries. Session storage preserves one payment's public instructions
and chosen public identity in the same tab through reload, or preserves an unresolved
request guard; anonymous names and draft inputs are not stored. If storage is
unavailable, the in-memory guard still prevents repeat clicks, but reload recovery
is unavailable. This storage is not an account or server-side supporter identity.

The API has no public verified status/reconciliation endpoint or quote expiry.
The UI cannot poll settlement, verify a restored quote's freshness, or automatically
reopen creation after payment. Saved instructions are not refreshed quotes. A real
sandbox end-to-end provider test is still required before activation. No payment
enablement, Vercel environment settings, or deployment changed while connecting
the frontend. Older transfers to direct wallets are not tracked.

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

## Settlement migration applied

`migrations/002_support_crypto_settlement.sql` was approved exactly as written and
applied to the configured `PHXFDB_DATABASE_URL` Neon database on 2026-10-05. It adds three nullable columns to the
pending table: `expected_outcome_currency varchar(16)`, `outcome_currency varchar(16)`,
and `outcome_amount numeric(78,30)`. Currency identifiers must be lowercase
alphanumeric provider identifiers of 2–16 characters; outcome amounts must be
nonnegative and cannot be NaN. No index is needed for this order-ID-based lookup.
Migration 001, existing ledger rows, Stripe constraints, and all indexes remain intact.

These columns record the settlement currency configured when an order is created
and the final provider-reported settlement. Existing orders deliberately receive
NULLs, with no guessed backfill. Previously confirmed contributions are preserved;
an old pending order cannot newly promote until its expected settlement currency
is verified and reconciled by an operator. The isolated tests apply both migrations
only to disposable local Postgres. Verification confirmed 26 pending-table columns,
31 validated constraints, and the same four valid/ready indexes. All migration-001
columns and constraints matched the saved baseline. The ledger's schema and rows
were unchanged. There were zero existing crypto rows when 002 was applied.

Post-migration Neon validation passed 14 groups of rollback-only checks using the
actual repository SQL and signed-IPN route with synthetic provider responses:
all seven assets, final settlement checks, converted settlement, nullable legacy
orders, excluded statuses, privacy, duplicate promotion, and database constraints.
Rollback verification found zero persistent test orders or contributions. Nine
statements also passed through the real Neon HTTP driver using read-only lookup
and EXPLAIN without executing mutation queries. These checks made no NOWPayments
network calls and do not replace a real sandbox provider E2E test.

Deployment order: keep `NOWPAYMENTS_ENABLED` disabled, obtain migration approval,
apply 002 to any other intended database after approval, configure the matching settlement currency,
deploy this backend, then enable and test. The revised queries require these columns;
do not deploy them over an unmigrated enabled backend.

## Server configuration

Configure these in Vercel's server environment after migration approval:

- `PHXFDB_DATABASE_URL`: existing production Neon connection.
- `NOWPAYMENTS_ENVIRONMENT`: `production` (default when absent) or `sandbox`.
- `NOWPAYMENTS_API_URL`: `https://api.nowpayments.io/v1` for production.
- `NOWPAYMENTS_API_KEY`: production NOWPayments API key.
- `NOWPAYMENTS_IPN_SECRET`: production IPN secret, separate from the API key.
- `NOWPAYMENTS_SETTLEMENT_CURRENCY`: exact lowercase NOWPayments outcome
  currency/network identifier matching the account's settlement configuration
  (for example `usdttrc20` only if that is the configured settlement).
- `NOWPAYMENTS_IPN_CALLBACK_URL`: canonical public HTTPS URL ending in
  `/api/support/crypto/ipn`, with no query, fragment, or embedded credentials.
- `NOWPAYMENTS_ENABLED`: exactly `true` to activate the endpoints; absent/false
  returns 503 before any DB or provider access.

Never use `PUBLIC_` credentials. `astro:env/server` provides the server-only
boundary. API URLs are configured in the environment and restricted to the selected
official HTTPS host and `/v1` path, with no credentials, query, or fragment. Requests use a
10-second timeout for creation, no caching, and no redirects. IPN processing has
a separate 2.5-second total deadline. Provider POSTs are not retried.
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
The canonicalizer follows the authoritative API/guide **Node.JS** example exactly,
recursively sorting objects, including nested fee fields. That Node example converts
arrays to numeric-key objects; the guide's Python example preserves arrays. We use
one Node-compatible canonicalization and never accept alternative serializations
after a failed signature. Test actual provider replay payloads containing non-null
arrays before launch. Excessively deep nesting fails signature validation safely.

After verification, the endpoint requires a known order and the exact already-bound
provider payment ID. It fetches `GET /payment/{id}` using our API key, validating
order ID, USD price, crypto currency/network and provider status. Child/repeated
deposit payments are unsupported and cannot be promoted. An IPN arriving before
payment binding returns 503 so the provider can retry.

Only provider status **`finished`** may promote, and only when the provider GET
response contains a positive `outcome_amount` and its `outcome_currency` exactly
matches the settlement currency captured on that order. Missing, zero, invalid,
or mismatched settlement data returns retryable failure without promotion. A signed
IPN's outcome fields alone cannot override missing/invalid provider GET data. NOWPayments
documents `confirmed` as incoming confirmation and `sending` as ongoing processing;
neither is final. `waiting`, `confirming`, `confirmed`, `sending`, `spending`,
`partially_paid`, `failed`, `refunded`, and `expired` never create contributions.
This is a **donation recognition** policy, rather than delivery of a fixed-price
product or crediting a spendable balance. The original `pay_amount` is the incoming
asset quote; `actually_paid` is incoming crypto, while the outcome is settlement
after conversion/fees. Comparing these different assets or requiring the original
crypto quote to remain the final threshold is inappropriate. A fixed-price product
would instead need an expected price in the settlement asset and a same-currency
outcome comparison; this backend does not implement that product policy.

Ledger USD value remains the validated original gross USD pledge, consistent with
the existing board behavior. It is not a valuation of net settlement or actual USD
cash received. Overpayments do not increase it; fees do not reduce it. Provider
covering/tolerance or an operator's manual finish may accept a smaller incoming
payment, which this donation policy recognizes at the original pledge amount.
Review those account settings before enabling payments; do not manually finish a
payment if that recognition would be inappropriate. We do not invent a historical
USD conversion from a current estimate or assume stablecoins are exactly one dollar.
The provider's actual incoming and settlement amounts are retained separately on
the pending row; native ledger amounts continue to refer to the incoming asset.

One READ COMMITTED transaction locks the order, records current status/actual amount,
inserts its confirmed ledger record via the contribution repository, and links that
record back to the order. The fixed UUID primary key and unique payment/contribution
IDs prevent duplicate crediting. If any statement fails, all changes roll back and
IPN returns 503 for retry. Older provider timestamps cannot regress state; `finished`
cannot regress to an intermediate status, and `refunded` remains terminal.
The board automatically reads promoted `source: crypto` contributions through its
existing privacy/moderation logic. Pending rows never appear there.

The guide requires an IPN response within **3000 ms**. A 2500 ms application deadline
includes reading the bounded body, database lookup, provider GET, and transaction.
The signal cancels provider/Neon HTTP requests; the transaction also sets a local
2-second statement timeout. Timeout returns 503, never an early success or a
fire-and-forget promotion. HTTP cancellation can leave a DB commit outcome unknown;
the atomic transaction and order UUID make retries safe. Hosting cold starts and
network transit are outside this application timer: measure Preview response times,
configure provider retries, and review Neon cold-start behavior before launch.

The guide lists per-outgoing-IP limits: POST payment 3/sec, GET payment status
10/sec, and GET estimate 7/sec (we do not call estimate). Provider 429s are handled
without retrying POST. Creation returns 429 and IPN returns retryable 503, with a
validated `Retry-After` delay (one second when absent/invalid). Other provider
errors return generic failures without exposing raw error bodies or credentials.
No process-local limiter can enforce a shared serverless egress limit; distributed
abuse/rate controls remain a launch task. Do not automatically repeat an ambiguous
creation request when a retry delay has elapsed; reconcile its order first.

Refund notifications update pending-table status but do not delete or reverse an
already confirmed ledger contribution. Refund accounting, repeated deposits,
manual reconciliation, rate limiting, and verified status polling are
follow-up work before a public launch. The endpoints stay disabled until enabled.

## Validation

Run `node --test tests/cryptoBackend.test.mjs tests/cryptoFrontend.test.mjs`,
`npm run check`, and `npm run build`.
Tests use embedded local Postgres and synthetic provider/API data; they never connect
to Neon, NOWPayments, or Stripe and never submit real payments.

Earlier migration-001 validation executed the original repository SQL and signed-IPN handler
against Neon with synthetic provider responses inside an outer transaction that
rolled back. All seven asset mappings, confirmed-status exclusion, finished promotion,
idempotency, anonymity, decimal underpayment rejection, and network constraints passed.
Those checks predate the settlement revision and do not verify migration 002.
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
| `NOWPAYMENTS_SANDBOX_SETTLEMENT_CURRENCY` | Exact outcome currency/network used by the sandbox account/simulation |
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
must exist in the test branch, along with the approved settlement migration 002.
Do not change the Production database URL for sandbox testing.

`NOWPAYMENTS_SANDBOX_CASE` is server-controlled and accepts the documented
`success`, `common`, `failed`, or `partially_paid` cases. Only sandbox POSTs contain
the provider's `case` field. Production ignores all sandbox settings and never sends
that field. Invalid environments fail closed; Vercel Production refuses sandbox mode.
Missing URL or credentials return 503; the existing enable switch applies to both modes.
Sandbox selection itself uses the existing tables; the settlement revision requires
approved migration 002 in the isolated test database before running this backend.

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
5. For `success`, confirm the actual provider's `finished` state, positive settlement
   in the expected outcome currency,
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
- [Authoritative integration guide and Node.JS IPN canonicalization](https://nowpayments-interactive-guide.netlify.app/#start)
- [Supported asset/network identifiers](https://nowpayments.io/supported-coins)
