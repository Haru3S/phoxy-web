export interface WorkEntry {
  title: string;
  type: string;

  issuer?: string;
  date?: string;
  description?: string;

  href?: string;
}

export const work: WorkEntry[] = [
  {
    title: 'Cybersecurity Student',
    type: 'Education',
    issuer: 'Austin Community College',
  },
  {
    title: 'Blender',
    type: 'Experience',
    description:
      '3D Modeling / Animation / Rendering',
  },
  {
    title: 'DaVinci Resolve',
    type: 'Experience',
    description:
      'Video Editing / Color / Post-Production',
  },
  {
    title: 'Figma',
    type: 'Experience',
    description:
      'Graphic Design / Visual Assets',
  },
  {
    title: 'Clip Studio Paint',
    type: 'Experience',
    description:
      'Illustration / Digital Art',
  },
];