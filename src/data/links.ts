export interface LinkEntry {
  name: string;
  href: string;
  type: string;
  icon?: string;
}

export const links: LinkEntry[] = [
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
    name: 'Placeholder',
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
];