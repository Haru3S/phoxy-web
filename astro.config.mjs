// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://haru3s.github.io',
  base: '/phoxy-web',

  vite: {
    plugins: [tailwindcss()],
  },
});