export interface Project {
  title: string;
  description: string;
  href?: string;
  image?: string;
  tags?: string[];
}

export const projects: Project[] = [
  {
    title: 'HEW2',
    description:
      'Enhanced textures, models, and sounds for Minecraft weather mods.',
    href: 'https://github.com/Haru3S/hew2',
    tags: ['Minecraft', 'Resource Pack'],
  },
  {
    title: 'AstraHUD',
    description:
      'Custom Team Fortress 2 HUD and interface modification.',
    href: 'https://github.com/Haru3S/AstraHUD',
    tags: ['TF2', 'HUD'],
  },
  {
    title: 'Source-Footsteps',
    description:
      'Procedural footstep audio generation tool.',
    href: 'https://github.com/Haru3S/Source-Footsteps',
    tags: ['Python', 'Audio'],
  },
  {
    title: 'phoxy-web',
    description:
      'Personal website, portfolio, and home on the internet.',
    href: 'https://github.com/Haru3S/phoxy-web',
    tags: ['Astro', 'TypeScript', 'Web'],
  },
];