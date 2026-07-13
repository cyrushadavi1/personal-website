import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://kuros.io',
  trailingSlash: 'ignore',
  markdown: {
    shikiConfig: {
      theme: 'vitesse-dark',
    },
  },
});
