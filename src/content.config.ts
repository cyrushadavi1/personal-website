import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    year: z.string(),
    order: z.number(),
    stack: z.array(z.string()).default([]),
    links: z
      .array(z.object({ label: z.string(), url: z.string() }))
      .default([]),
  }),
});

export const collections = { work };
