import {
  getDatabase,
} from './database';

import type {
  ModerationReason,
  ModerationStatus,
} from './displayNameModeration';

import type {
  SupportAsset,
  SupporterRecord,
  SupportSource,
} from '../../data/support/supporterTypes';

type SupporterDatabaseRow = {
  id: string;
  display_name:
    string | null;
  anonymous:
    boolean;
  amount_usd_cents:
    number | string;
  source:
    string;
  asset:
    string | null;
  native_amount:
    string | null;
  supported_at:
    Date | string;
  moderation_status:
    string;
  moderation_reason:
    string | null;
};

function isSupportSource(
  value: string
): value is SupportSource {
  return (
    value === 'stripe' ||
    value === 'crypto' ||
    value === 'manual'
  );
}

function isSupportAsset(
  value: string | null
): value is SupportAsset {
  return (
    value === null ||
    value === 'usd' ||
    value === 'btc' ||
    value === 'ltc' ||
    value === 'eth' ||
    value === 'usdc' ||
    value === 'usdt' ||
    value === 'sol' ||
    value === 'doge'
  );
}

function isModerationStatus(
  value: string
): value is ModerationStatus {
  return (
    value === 'approved' ||
    value === 'rejected' ||
    value === 'pending'
  );
}

function isModerationReason(
  value: string | null
): value is ModerationReason {
  return (
    value === null ||
    value === 'hate' ||
    value === 'extremism' ||
    value === 'harassment' ||
    value === 'threat' ||
    value === 'impersonation' ||
    value === 'political_advocacy' ||
    value === 'other'
  );
}

function parseAmountUsdCents(
  value: number | string
): number | null {
  const amount =
    typeof value === 'number'
      ? value
      : Number(value);

  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    return null;
  }

  return amount;
}

function parseSupportedAt(
  value: Date | string
): string | null {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
}

function mapSupporterRow(
  row: SupporterDatabaseRow
): SupporterRecord | null {
  const amountUsdCents =
    parseAmountUsdCents(
      row.amount_usd_cents
    );

  const supportedAt =
    parseSupportedAt(
      row.supported_at
    );

  if (
    amountUsdCents === null ||
    supportedAt === null ||
    !isSupportSource(
      row.source
    ) ||
    !isSupportAsset(
      row.asset
    ) ||
    !isModerationStatus(
      row.moderation_status
    ) ||
    !isModerationReason(
      row.moderation_reason
    )
  ) {
    console.warn(
      'Ignoring invalid PHXF-DB supporter record.',
      {
        id:
          row.id,
      }
    );

    return null;
  }

  return {
    id:
      row.id,

    displayName:
      row.display_name,

    anonymous:
      row.anonymous,

    amountUsd:
      amountUsdCents /
      100,

    source:
      row.source,

    asset:
      row.asset,

    nativeAmount:
      row.native_amount,

    supportedAt,

    verified:
      true,

    moderationStatus:
      row.moderation_status,

    moderationReason:
      row.moderation_reason,
  };
}

export async function getSupporterRecords():
  Promise<SupporterRecord[]> {
  const sql =
    getDatabase();

  const result =
    await sql.query(`
      SELECT
        id,
        display_name,
        anonymous,
        amount_usd_cents,
        source,
        asset,
        native_amount,
        supported_at,
        moderation_status,
        moderation_reason
      FROM support_contributions
      ORDER BY supported_at DESC;
    `, [], {
      fetchOptions: {
        signal: AbortSignal.timeout(3000),
      },
    });

  const rows =
    result as SupporterDatabaseRow[];

  return rows
    .map(
      mapSupporterRow
    )
    .filter(
      (
        record
      ): record is SupporterRecord =>
        record !== null
    );
}
