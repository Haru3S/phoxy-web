export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 24;

export const DISPLAY_NAME_PATTERN =
  /^[A-Za-z0-9_]+$/;

const RESERVED_DISPLAY_NAMES =
  new Set([
    'anonymous',
    'admin',
    'administrator',
    'moderator',
    'mod',
    'staff',
    'system',
    'phoxy',
    'phoxyfox',
  ]);

export type DisplayNameValidationReason =
  | 'too_short'
  | 'too_long'
  | 'invalid_characters'
  | 'reserved';

export type DisplayNameValidationResult =
  | {
      valid: true;
      displayName: string;
    }
  | {
      valid: false;
      displayName: null;
      reason: DisplayNameValidationReason;
    };

export function normalizeDisplayName(
  value: string
): string {
  return value.trim();
}

export function validateDisplayName(
  value: string
): DisplayNameValidationResult {
  const displayName =
    normalizeDisplayName(value);

  if (
    displayName.length <
    DISPLAY_NAME_MIN_LENGTH
  ) {
    return {
      valid: false,
      displayName: null,
      reason: 'too_short',
    };
  }

  if (
    displayName.length >
    DISPLAY_NAME_MAX_LENGTH
  ) {
    return {
      valid: false,
      displayName: null,
      reason: 'too_long',
    };
  }

  if (
    !DISPLAY_NAME_PATTERN.test(
      displayName
    )
  ) {
    return {
      valid: false,
      displayName: null,
      reason: 'invalid_characters',
    };
  }

  if (
    RESERVED_DISPLAY_NAMES.has(
      displayName.toLowerCase()
    )
  ) {
    return {
      valid: false,
      displayName: null,
      reason: 'reserved',
    };
  }

  return {
    valid: true,
    displayName,
  };
}