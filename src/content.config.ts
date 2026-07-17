import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    category: z.string(),
    year: z.string(),
    timeframe: z.string(),
    status: z.string(),
    role: z.string(),
    order: z.number(),
    stack: z.array(z.string()).default([]),
    results: z
      .array(z.object({ label: z.string(), value: z.string() }))
      .default([]),
    links: z
      .array(z.object({ label: z.string(), url: z.string() }))
      .default([]),
  }),
});

export const collections = { work };
