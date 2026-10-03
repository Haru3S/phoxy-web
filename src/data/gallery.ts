export type GalleryType =
  | 'artwork'
  | 'render'
  | 'animation';

export type GallerySize =
  | 'square'
  | 'wide'
  | 'tall'
  | 'large';

export interface GalleryEntry {
  title: string;
  src: string;
  alt: string;

  year?: number;
  type?: GalleryType;
  size?: GallerySize;
}

export const gallery: GalleryEntry[] = [
  {
    title: 'Artwork 01',
    src: '/assets/dev/Debugempty.png',
    alt: 'Gallery artwork placeholder',
    year: 2026,
    type: 'artwork',
    size: 'large',
  },
  {
    title: 'Artwork 02',
    src: '/assets/dev/Debugempty.png',
    alt: 'Gallery artwork placeholder',
    year: 2026,
    type: 'artwork',
    size: 'tall',
  },
  {
    title: 'Artwork 03',
    src: '/assets/dev/Debugempty.png',
    alt: 'Gallery artwork placeholder',
    year: 2026,
    type: 'render',
    size: 'square',
  },
  {
    title: 'Artwork 04',
    src: '/assets/dev/Debugempty.png',
    alt: 'Gallery artwork placeholder',
    year: 2026,
    type: 'artwork',
    size: 'wide',
  },
  {
    title: 'Artwork 05',
    src: '/assets/dev/Debugempty.png',
    alt: 'Gallery artwork placeholder',
    year: 2026,
    type: 'render',
    size: 'square',
  },
  {
    title: 'Artwork 06',
    src: '/assets/dev/Debugempty.png',
    alt: 'Gallery artwork placeholder',
    year: 2026,
    type: 'artwork',
    size: 'tall',
  },
  {
    title: 'Artwork 07',
    src: '/assets/dev/Debugempty.png',
    alt: 'Gallery artwork placeholder',
    year: 2026,
    type: 'animation',
    size: 'wide',
  },
  {
    title: 'Artwork 08',
    src: '/assets/dev/Debugempty.png',
    alt: 'Gallery artwork placeholder',
    year: 2026,
    type: 'artwork',
    size: 'square',
  },
  {
    title: 'Artwork 09',
    src: '/assets/dev/Debugempty.png',
    alt: 'Gallery artwork placeholder',
    year: 2026,
    type: 'artwork',
    size: 'square',
  },
];