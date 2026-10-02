export interface LinkEntry {
  name: string;
  href: string;
  type: string;
  icon?: string;
}

export const links: LinkEntry[] = [
  {
    name: 'YouTube',
    href: '#',
    type: 'SOCIAL',
    icon: 'youtube-logo',
  },
  {
    name: 'Spotify',
    href: '#',
    type: 'SOCIAL',
    icon: 'spotify-logo',
  },
  {
    name: 'Bluesky',
    href: '#',
    type: 'SOCIAL',
    icon: 'butterfly',
  },
  {
    name: 'GitHub',
    href: '#',
    type: 'DEV',
    icon: 'github-logo',
  },
  {
    name: 'Modrinth',
    href: '#',
    type: 'DEV',
    icon: 'cube',
  },
];