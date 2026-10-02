export interface Project {
  title: string;
  description: string;
  href?: string;
  image?: string;
  tags?: string[];
}

export const projects: Project[] = [
  {
    title: 'Source-Footsteps',
    description: 'Procedural footstep audio generation tool.',
    href: 'https://github.com/Haru3S/Source-Footsteps',
    tags: ['Python', 'Audio'],
  },
  {
    title: 'Project Placeholder',
    description: 'Something will live here eventually.',
    href: 'https://github.com/Haru3S',
    tags: ['Placeholder'],
  },
];