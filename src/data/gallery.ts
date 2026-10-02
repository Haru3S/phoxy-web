export interface GalleryEntry {
  title: string;
  src: string;
  alt: string;
  year?: number;
  type?: 'artwork' | 'render' | 'animation';
}

export const gallery: GalleryEntry[] = [
  {
    title: 'Test Artwork',
    src: '/assets/hero/phoxy-graffiti.webp',
    alt: 'Temporary gallery artwork',
    year: 2026,
    type: 'artwork',
  },
];