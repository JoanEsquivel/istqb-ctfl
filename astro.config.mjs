import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://joanesquivel.github.io',
  base: '/istqb',
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
