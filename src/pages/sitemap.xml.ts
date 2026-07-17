import { getCollection } from 'astro:content';

export const prerender = true;

export async function GET() {
  const work = await getCollection('work');
  const paths = ['/', '/about/', ...work.map((entry) => `/work/${entry.id}/`)];
  const urls = paths
    .map((path) => `  <url><loc>${new URL(path, 'https://kuros.io')}</loc></url>`)
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
  );
}
