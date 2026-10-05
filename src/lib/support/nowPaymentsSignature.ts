import { createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

export function sortObjectDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectDeep);
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = Object.create(null);
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortObjectDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

export function verifyNowPaymentsSignature(payload: unknown, signature: string | null, secret: string): boolean {
  if (!signature || !/^[0-9a-f]{128}$/i.test(signature) || !secret.trim()) return false;
  const expected = createHmac('sha512', secret.trim())
    .update(JSON.stringify(sortObjectDeep(payload))).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
