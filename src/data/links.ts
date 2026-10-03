export type LinkType =
  | 'SOCIAL'
  | 'PROFILE'
  | 'DEV'
  | 'ART'
  | 'PROJECT'
  | 'SHOP'
  | 'COMMUNITY'
  | 'MISC';

export interface LinkEntry {
  name: string;
  href: string;
  type: LinkType;
  icon?: string;
}

/*
 * TYPE PRIORITY
 *
 * Links are grouped by type in this order.
 *
 * Links within the same type are then
 * sorted alphabetically by name.
 */

const typePriority: LinkType[] = [
  'SOCIAL',
  'DEV',
  'PROFILE',
  'ART',
  'PROJECT',
  'SHOP',
  'COMMUNITY',
  'MISC',
];

/*
 * LINKS
 *
 * Array order here does not matter.
 * The exported list is automatically sorted
 * using the type priority above.
 */

const linkEntries: LinkEntry[] = [
  {
    name: 'YouTube',
    href: 'https://www.youtube.com/@Haru_3S',
    type: 'SOCIAL',
    icon: 'youtube-logo',
  },
  {
    name: 'Spotify',
    href: 'https://open.spotify.com/user/gcr8cwxg9h6hww7u02crc1yi3',
    type: 'SOCIAL',
    icon: 'spotify-logo',
  },
  {
    name: 'Bluesky',
    href: 'https://bsky.app/profile/haru3s.bsky.social',
    type: 'SOCIAL',
    icon: 'butterfly',
  },
  {
    name: 'GitHub',
    href: 'https://github.com/Haru3S',
    type: 'DEV',
    icon: 'github-logo',
  },
  {
    name: 'Modrinth',
    href: 'https://modrinth.com/user/Haru3S',
    type: 'DEV',
    icon: 'cube',
  },
  {
    name: 'Pronouns',
    href: 'https://en.pronouns.page/@Haru_3S',
    type: 'PROFILE',
    icon: 'intersect-three',
  },
];

/*
 * SORTING
 *
 * 1. Type priority
 * 2. Alphabetical by name
 */

export const links = linkEntries.toSorted(
  (a, b) => {
    const typeDifference =
      typePriority.indexOf(a.type) -
      typePriority.indexOf(b.type);

    if (typeDifference !== 0) {
      return typeDifference;
    }

    return a.name.localeCompare(
      b.name,
      undefined,
      {
        sensitivity: 'base',
      }
    );
  }
);