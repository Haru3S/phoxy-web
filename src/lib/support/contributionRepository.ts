import {
  getDatabase,
} from './database';

import type {
  ModerationReason,
  ModerationStatus,
} from './displayNameModeration';

import type {
  SupportAsset,
  SupportSource,
} from '../../data/support/supporterTypes';

export type ContributionInsert = {
  displayName:
    string | null;

  normalizedDisplayName:
    string | null;

  anonymous:
    boolean;

  amountUsdCents:
    number;

  source:
    SupportSource;

  asset:
    SupportAsset;

  nativeAmount:
    string | null;

  supportedAt:
    Date;

  moderationStatus:
    ModerationStatus;

  moderationReason:
    ModerationReason;

  stripeEventId:
    string | null;

  stripeSessionId:
    string | null;
};

export type ContributionInsertResult = {
  inserted:
    boolean;

  id:
    string | null;
};

type InsertedContributionRow = {
  id: string;
};

// A lazy query for the crypto repository's transaction. The order row must be
// locked before this query runs. Its UUID is also the ledger idempotency key.
// The Stripe insert path below remains unchanged.
export function cryptoContributionQuery(sql: ReturnType<typeof getDatabase>, orderId: string) {
  return sql`
    INSERT INTO support_contributions (
      id, display_name, normalized_display_name, anonymous, amount_usd_cents,
      source, asset, native_amount, supported_at, moderation_status, moderation_reason
    )
    SELECT order_id, display_name, normalized_display_name, anonymous, amount_usd_cents,
      'crypto', asset, actually_paid::text, confirmed_at, moderation_status, moderation_reason
    FROM support_crypto_payments
    WHERE order_id = ${orderId} AND contribution_id IS NULL
      AND provider_status = 'finished' AND confirmed_at IS NOT NULL
      AND actually_paid >= expected_crypto_amount
    ON CONFLICT (id) DO NOTHING
    RETURNING id;
  `;
}

export async function insertContribution(
  contribution:
    ContributionInsert
): Promise<ContributionInsertResult> {
  const sql =
    getDatabase();

  const result =
    await sql`
      INSERT INTO support_contributions (
        display_name,
        normalized_display_name,
        anonymous,
        amount_usd_cents,
        source,
        asset,
        native_amount,
        supported_at,
        moderation_status,
        moderation_reason,
        stripe_event_id,
        stripe_session_id
      )
      VALUES (
        ${contribution.displayName},
        ${contribution.normalizedDisplayName},
        ${contribution.anonymous},
        ${contribution.amountUsdCents},
        ${contribution.source},
        ${contribution.asset},
        ${contribution.nativeAmount},
        ${contribution.supportedAt.toISOString()},
        ${contribution.moderationStatus},
        ${contribution.moderationReason},
        ${contribution.stripeEventId},
        ${contribution.stripeSessionId}
      )
      ON CONFLICT DO NOTHING
      RETURNING id;
    `;

  const rows =
    result as InsertedContributionRow[];

  const row =
    rows[0];

  if (!row) {
    return {
      inserted:
        false,

      id:
        null,
    };
  }

  return {
    inserted:
      true,

    id:
      row.id,
  };
}
