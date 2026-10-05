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