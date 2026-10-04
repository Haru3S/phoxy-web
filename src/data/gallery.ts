const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';

export type GalleryType =
  | 'artwork'
  | 'render'
  | 'animation';

/*
 * Gallery tile sizes — desktop 12-column grid
 *
 * square = 3 columns × 3 rows
 * wide   = 6 columns × 3 rows
 * tall   = 3 columns × 5 rows
 * large  = 6 columns × 5 rows
 */

export type GallerySize =
  | 'square'
  | 'wide'
  | 'tall'
  | 'large';

export interface GalleryEntry {
  title: string;
  src: string;
  alt: string;

  /*
   * Creation date in YYYY-MM-DD format.
   *
   * Used to automatically sort the gallery
   * from newest → oldest.
   */
  date: string;

  type?: GalleryType;
  size?: GallerySize;
}

export const gallery: GalleryEntry[] = [
  {
    title: 'A Climate Change',
    src: `${base}assets/artwork/A_Climage_Change.webp`,
    alt: 'Organic Brutalism',
    date: '2025-08-23',
    type: 'artwork',
    size: 'wide',
  },
  {
    title: 'Battle Engineering',
    src: `${base}assets/artwork/Battle_Engineering.webp`,
    alt: 'None',
    date: '2026-01-19',
    type: 'artwork',
    size: 'square',
  },
  {
    title: 'How It FEELS To Play Scout',
    src: `${base}assets/artwork/How_It_FEELS_To_Play_Scout.webp`,
    alt: "Can't you tell I love scout!",
    date: '2026-09-12',
    type: 'artwork',
    size: 'wide',
  },
  {
    title: 'Kick It Root Down',
    src: `${base}assets/artwork/Kick_It_Root_Down.webp`,
    alt: 'None',
    date: '2026-05-09',
    type: 'artwork',
    size: 'square',
  },
  {
    title: 'The Only Thing I Know For Real',
    src: `${base}assets/artwork/Raiden_Scout.webp`,
    alt: 'Scout x Metal Gears Rising',
    date: '2026-06-03',
    type: 'artwork',
    size: 'wide',
  },
  {
    title: 'Soldiers Of Mann',
    src: `${base}assets/artwork/Soldiers_Of_Mann.webp`,
    alt: 'None',
    date: '2026-06-28',
    type: 'artwork',
    size: 'square',
  },
];