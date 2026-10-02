export interface SupportMethod {
  title: string;
  description?: string;
  href?: string;
  type: 'money' | 'items' | 'crypto' | 'other';
}

export const supportMethods: SupportMethod[] = [
  {
    title: 'Financial Support',
    description: 'External support option.',
    href: '#',
    type: 'money',
  },
  {
    title: 'TF2 Items',
    description: 'Support through TF2 items.',
    href: '#',
    type: 'items',
  },
  {
    title: 'Crypto',
    description: 'Cryptocurrency support.',
    type: 'crypto',
  },
];