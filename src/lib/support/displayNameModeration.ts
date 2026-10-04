export type ModerationStatus =
  | 'approved'
  | 'rejected'
  | 'pending';

export type ModerationReason =
  | 'hate'
  | 'extremism'
  | 'harassment'
  | 'threat'
  | 'impersonation'
  | 'political_advocacy'
  | 'other'
  | null;

export type DisplayNameModerationResult = {
  status: ModerationStatus;
  reason: ModerationReason;
};

const EXTREMISM_TERMS = [
  'nazi',
  'whitepower',
  'heilhitler',
  '1488',
] as const;

const HATE_TERMS = [
  'killallgays',
  'killalltrans',
  'killalljews',
  'killallblacks',
  'death2gays',
  'death2trans',
] as const;

const POLITICAL_ADVOCACY_PATTERNS = [
  /^vote[a-z0-9]+$/,
  /^maga[a-z0-9]*$/,
] as const;

function normalizeForModeration(
  value: string
): string {
  return value
    .toLowerCase()
    .replaceAll('_', '');
}

function includesAny(
  value: string,
  terms: readonly string[]
): boolean {
  return terms.some(
    (term) => value.includes(term)
  );
}

function matchesAny(
  value: string,
  patterns: readonly RegExp[]
): boolean {
  return patterns.some(
    (pattern) => pattern.test(value)
  );
}

export function moderateDisplayName(
  displayName: string
): DisplayNameModerationResult {
  const normalized =
    normalizeForModeration(
      displayName
    );

  if (
    includesAny(
      normalized,
      EXTREMISM_TERMS
    )
  ) {
    return {
      status: 'rejected',
      reason: 'extremism',
    };
  }

  if (
    includesAny(
      normalized,
      HATE_TERMS
    )
  ) {
    return {
      status: 'rejected',
      reason: 'hate',
    };
  }

  if (
    matchesAny(
      normalized,
      POLITICAL_ADVOCACY_PATTERNS
    )
  ) {
    return {
      status: 'rejected',
      reason: 'political_advocacy',
    };
  }

  return {
    status: 'approved',
    reason: null,
  };
}