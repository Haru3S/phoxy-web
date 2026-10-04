import type {
  SupporterRecord,
} from '../../data/support/supporterTypes';

export function canShowPublicIdentity(
  record: SupporterRecord
): boolean {
  return (
    record.verified &&
    record.moderationStatus === 'approved' &&
    !record.anonymous &&
    record.displayName !== null
  );
}

export function getPublicDisplayName(
  record: SupporterRecord
): string {
  if (
    !canShowPublicIdentity(record)
  ) {
    return 'Anonymous';
  }

  return record.displayName;
}

export function canAppearInRecent(
  record: SupporterRecord
): boolean {
  return record.verified;
}

export function canAppearInTotal(
  record: SupporterRecord
): boolean {
  return canShowPublicIdentity(record);
}

export function canAppearInAmount(
  record: SupporterRecord
): boolean {
  return canShowPublicIdentity(record);
}