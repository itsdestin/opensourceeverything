// Preview the built site locally: node site/serve.mjs [port]. Serves site/dist under the same base path
// GitHub Pages will use, so links behave exactly as they will live.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE } from './src/lib.mjs';

const DIST = join(dirname(fileURLToPath(import.meta.url)), 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.md': 'text/markdown; charset=utf-8' };
const port = Number(process.argv[2] ?? 4321);
createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!path.startsWith(BASE)) { res.writeHead(302, { Location: BASE }); return res.end(); }
  let f = join(DIST, path.slice(BASE.length));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404, { 'Content-Type': TYPES['.html'] }); return res.end(existsSync(join(DIST, '404.html')) ? readFileSync(join(DIST, '404.html')) : 'Not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] ?? 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(port, '127.0.0.1', () => console.log(`Open Instead preview: http://127.0.0.1:${port}${BASE}`));
