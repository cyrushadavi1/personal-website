import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://kuros.io',
  trailingSlash: 'always',
  markdown: {
    shikiConfig: {
      theme: 'vitesse-dark',
    },
  },
});
