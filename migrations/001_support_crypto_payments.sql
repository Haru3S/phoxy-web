-- PROPOSED ONLY: do not run until the database migration is approved.
-- No changes to the existing Stripe ledger columns or constraints.
BEGIN;

CREATE TABLE public.support_crypto_payments (
  order_id uuid PRIMARY KEY,
  nowpayments_payment_id text UNIQUE,
  creation_state varchar(24) NOT NULL DEFAULT 'creating'
    CHECK (creation_state IN ('creating', 'created', 'creation_unknown')),
  display_name varchar(24),
  normalized_display_name varchar(24),
  anonymous boolean NOT NULL,
  moderation_status varchar(16) NOT NULL CHECK (moderation_status IN ('approved', 'rejected', 'pending')),
  moderation_reason varchar(32),
  amount_usd_cents bigint NOT NULL CHECK (amount_usd_cents BETWEEN 100 AND 100000),
  price_currency varchar(3) NOT NULL DEFAULT 'usd' CHECK (price_currency = 'usd'),
  asset varchar(16) NOT NULL,
  network varchar(16) NOT NULL,
  pay_currency varchar(16) NOT NULL,
  expected_crypto_amount numeric(78,30) CHECK (expected_crypto_amount > 0),
  pay_address varchar(256),
  actually_paid numeric(78,30) CHECK (actually_paid >= 0),
  provider_status varchar(16) CHECK (provider_status IN (
    'waiting', 'confirming', 'confirmed', 'sending', 'spending', 'partially_paid',
    'finished', 'failed', 'refunded', 'expired'
  )),
  provider_updated_at timestamptz,
  last_ipn_at timestamptz,
  confirmed_at timestamptz,
  contribution_id uuid UNIQUE REFERENCES public.support_contributions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (anonymous AND display_name IS NULL AND normalized_display_name IS NULL) OR
    (NOT anonymous AND display_name IS NOT NULL AND normalized_display_name IS NOT NULL
      AND normalized_display_name = lower(display_name))
  ),
  CHECK (
    (asset = 'ltc' AND network = 'litecoin' AND pay_currency = 'ltc') OR
    (asset = 'btc' AND network = 'bitcoin' AND pay_currency = 'btc') OR
    (asset = 'eth' AND network = 'ethereum' AND pay_currency = 'eth') OR
    (asset = 'sol' AND network = 'solana' AND pay_currency = 'sol') OR
    (asset = 'doge' AND network = 'dogecoin' AND pay_currency = 'doge') OR
    (asset = 'usdc' AND network = 'solana' AND pay_currency = 'usdcsol') OR
    (asset = 'usdt' AND network = 'solana' AND pay_currency = 'usdtsol')
  ),
  CHECK (nowpayments_payment_id IS NULL OR nowpayments_payment_id ~ '^[1-9][0-9]{0,39}$'),
  CHECK (creation_state <> 'created' OR
    (nowpayments_payment_id IS NOT NULL AND expected_crypto_amount IS NOT NULL AND provider_status IS NOT NULL)),
  CHECK (confirmed_at IS NULL OR nowpayments_payment_id IS NOT NULL),
  CHECK (contribution_id IS NULL OR (confirmed_at IS NOT NULL AND contribution_id = order_id))
);

-- Operational reconciliation of unpromoted orders, not a second public board.
CREATE INDEX support_crypto_payments_unconfirmed_idx
  ON public.support_crypto_payments (created_at) WHERE contribution_id IS NULL;

COMMIT;
