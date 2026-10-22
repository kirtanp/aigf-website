// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ai-gf.com',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  vite: {
    // Cast: @tailwindcss/vite is typed against a newer Vite than the one Astro bundles.
    plugins: [/** @type {any} */ (tailwindcss())],
  },
});
