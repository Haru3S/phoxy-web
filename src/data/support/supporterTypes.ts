import type {
  ModerationReason,
  ModerationStatus,
} from '../../lib/support/displayNameModeration';

export type SupportSource =
  | 'stripe'
  | 'crypto'
  | 'manual';

export type SupportAsset =
  | 'usd'
  | 'btc'
  | 'ltc'
  | 'eth'
  | 'usdc'
  | 'usdt'
  | 'sol'
  | 'doge'
  | null;

export type SupporterRecord = {
  id: string;

  displayName: string | null;
  anonymous: boolean;

  amountUsd: number;

  source: SupportSource;
  asset: SupportAsset;

  nativeAmount: string | null;

  supportedAt: string;

  verified: boolean;

  moderationStatus: ModerationStatus;
  moderationReason: ModerationReason;
};

export type PublicSupporterRecord = {
  id: string;

  displayName: string;
  anonymous: boolean;

  amountUsd: number;

  source: SupportSource;
  asset: SupportAsset;

  supportedAt: string;
};

export type AggregatedSupporter = {
  key: string;

  displayName: string;
  anonymous: false;

  totalUsd: number;
  contributionCount: number;

  latestSupportAt: string;
};

export type SupporterDisplayData = {
  records: PublicSupporterRecord[];

  totalSupportUsd: number;
  verifiedContributionCount: number;
};