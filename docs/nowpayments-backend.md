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

- `PHXFDB_DATABASE_URL`: existing Neon connection.
- `NOWPAYMENTS_API_KEY`: NOWPayments API key.
- `NOWPAYMENTS_IPN_SECRET`: NOWPayments IPN secret, separate from the API key.
- `NOWPAYMENTS_IPN_CALLBACK_URL`: canonical public HTTPS URL ending in
  `/api/support/crypto/ipn`, with no query, fragment, or embedded credentials.
- `NOWPAYMENTS_ENABLED`: exactly `true` to activate the endpoints; absent/false
  returns 503 before any DB or provider access.

Never use `PUBLIC_` credentials. `astro:env/server` provides the server-only
boundary. API host is fixed to `https://api.nowpayments.io/v1`; requests use a
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

## Before a provider sandbox/test payment

Local configuration currently contains an API key and IPN secret, but their account
environment and validity have not been verified. The callback URL and enable flag
are absent. Vercel environment configuration was not inspected or changed.

The current service targets the production API only. Provider sandbox simulation
requires a controlled server-only sandbox host selector and simulation-case support;
setting sandbox credentials alone cannot switch this implementation to sandbox.
These additions have not been made as part of migration validation.

For a sandbox test, configure sandbox API/IPN credentials on a publicly reachable
test deployment, use its HTTPS `/api/support/crypto/ipn` callback URL, and use a
separate Neon test branch so simulated finished payments cannot credit the live board.
Enable `NOWPAYMENTS_ENABLED=true` only in that configured test environment. The
existing crypto frontend can remain disconnected: the payment route accepts manual
JSON POST requests. Check available currencies and merchant/minimum settings before
creating a provider payment. A production payment test instead uses production
credentials and real funds; none has been initiated during this validation.

References:

- [NOWPayments API reference](https://documenter.getpostman.com/view/7907941/2s93JusNJt)
- [Official IPN signature implementation](https://github.com/NowPaymentsIO/nowpayments-sdk-nodejs/blob/master/src/ipn.js)
- [Payment status and integration guide](https://nowpayments.io/blog/nowpayments-api-explained-customize-your-payment-gateway)
- [Supported asset/network identifiers](https://nowpayments.io/supported-coins)
