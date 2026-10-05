import { isCryptoAsset, type CryptoAsset } from './cryptoAssets';
import { validateDisplayName } from './displayNameValidation';
import { moderateDisplayName } from './displayNameModeration';
import type { ModerationStatus, ModerationReason } from './displayNameModeration';

export class CryptoValidationError extends Error {}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function usdCents(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const cents = Math.round(value * 100);
  // Reject fractional cents rather than silently changing the requested price.
  return Number.isSafeInteger(cents) && cents >= 100 && cents <= 100_000 &&
    Math.abs(value * 100 - cents) < 1e-8 ? cents : null;
}

export type CryptoOrderInput = {
  amountUsdCents: number;
  asset: CryptoAsset;
  anonymous: boolean;
  displayName: string | null;
  normalizedDisplayName: string | null;
  moderationStatus: ModerationStatus;
  moderationReason: ModerationReason;
};

export function validateCryptoOrder(body: unknown): CryptoOrderInput {
  if (!isObject(body) || Object.keys(body).some(key =>
    !['amount', 'asset', 'anonymous', 'displayName'].includes(key))) {
    throw new CryptoValidationError('Invalid payment request.');
  }
  const amountUsdCents = usdCents(body.amount);
  if (amountUsdCents === null) throw new CryptoValidationError('Amount must be $1–$1,000 in whole cents.');
  if (!isCryptoAsset(body.asset)) throw new CryptoValidationError('Unsupported crypto asset.');
  if (typeof body.anonymous !== 'boolean' ||
    (body.displayName !== undefined && typeof body.displayName !== 'string')) {
    throw new CryptoValidationError('Invalid supporter identity.');
  }
  let displayName: string | null = null;
  if (!body.anonymous) {
    if (typeof body.displayName !== 'string') throw new CryptoValidationError('Invalid display name.');
    const validation = validateDisplayName(body.displayName);
    if (!validation.valid) throw new CryptoValidationError('Invalid display name.');
    const moderation = moderateDisplayName(validation.displayName);
    if (moderation.status !== 'approved') throw new CryptoValidationError('Display name is not allowed.');
    displayName = validation.displayName;
  }
  return {
    amountUsdCents, asset: body.asset, anonymous: body.anonymous, displayName,
    normalizedDisplayName: displayName?.toLowerCase() ?? null,
    moderationStatus: 'approved', moderationReason: null,
  };
}

// Normalize numeric API values (including scientific notation) to bounded decimals.
// No floating point arithmetic is used for comparing native payment amounts.
export function decimalAmount(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(String(value));
  if (!match || String(value).length > 100) return null;
  const digits = match[1] + (match[2] ?? '');
  const point = match[1].length + Number(match[3] ?? 0);
  if (point < -30 || point > 48) return null;
  const expanded = point <= 0 ? '0.' + '0'.repeat(-point) + digits :
    point >= digits.length ? digits + '0'.repeat(point - digits.length) :
    digits.slice(0, point) + '.' + digits.slice(point);
  const [integer, fraction = ''] = expanded.split('.');
  const normalized = integer.replace(/^0+(?=\d)/, '') +
    (fraction.replace(/0+$/, '') ? '.' + fraction.replace(/0+$/, '') : '');
  if (integer.length > 48 || fraction.replace(/0+$/, '').length > 30) return null;
  return normalized;
}

export function paymentId(value: unknown): string | null {
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value <= 0)) return null;
  return (typeof value === 'string' || typeof value === 'number') &&
    /^[1-9]\d{0,39}$/.test(String(value)) ? String(value) : null;
}

export function orderId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
}
