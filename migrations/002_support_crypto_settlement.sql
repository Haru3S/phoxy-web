-- PROPOSED ONLY: requires approval before application to any external database.
-- 001 is already applied and must not be rewritten. No ledger/Stripe changes.
BEGIN;

ALTER TABLE public.support_crypto_payments
  ADD COLUMN expected_outcome_currency varchar(16)
    CHECK (expected_outcome_currency ~ '^[a-z0-9]{2,16}$'),
  ADD COLUMN outcome_currency varchar(16)
    CHECK (outcome_currency ~ '^[a-z0-9]{2,16}$'),
  ADD COLUMN outcome_amount numeric(78,30)
    CHECK (outcome_amount >= 0 AND outcome_amount <> 'NaN'::numeric);

-- Existing orders intentionally remain NULL: an operator must verify their
-- settlement configuration/provider data before allowing new promotion.
-- No guessed backfill, secret data, new index, or change to existing contributions.
COMMIT;
