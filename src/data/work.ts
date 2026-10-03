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
];