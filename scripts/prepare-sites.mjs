import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url);
const dist = new URL('../dist/', import.meta.url);
const client = new URL('../dist/client/', import.meta.url);
const server = new URL('../dist/server/', import.meta.url);

await rm(client, { recursive: true, force: true });
await rm(server, { recursive: true, force: true });
await mkdir(client, { recursive: true });

for (const entry of await readdir(dist)) {
  if (entry === 'client' || entry === 'server') continue;
  await rename(join(dist.pathname, entry), join(client.pathname, entry));
}

await mkdir(server, { recursive: true });
await writeFile(
  new URL('../dist/server/index.js', import.meta.url),
  `const worker = {
  async fetch(request, env) {
    if (!env?.ASSETS || typeof env.ASSETS.fetch !== 'function') {
      return new Response('Static assets are unavailable.', { status: 503 });
    }

    let response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || !['GET', 'HEAD'].includes(request.method)) return response;

    const url = new URL(request.url);
    if (url.pathname.endsWith('/')) {
      url.pathname += 'index.html';
    } else if (!url.pathname.split('/').at(-1)?.includes('.')) {
      url.pathname += '/index.html';
    } else {
      return response;
    }

    return env.ASSETS.fetch(new Request(url, request));
  },
};

export default worker;
`
);

console.log(`Prepared ${new URL('.', root).pathname} for Sites deployment.`);
