// Local server: serves public/ and runs the same api/*.mjs handlers Vercel deploys.
// Usage: put YOUCAM_API_KEY in .env, then `npm start` and open http://localhost:3000
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
if (fs.existsSync(path.join(root, '.env'))) process.loadEnvFile(path.join(root, '.env'));

const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

function readBody(req, limit = 6 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) reject(new Error('body too large'));
      else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Mimics the Vercel Node helpers the handlers use: req.query, req.body, res.status().json().
function vercelify(req, res, url) {
  req.query = Object.fromEntries(url.searchParams);
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (obj) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/[^a-z-]/g, '');
    const file = path.join(root, 'api', `${name}.mjs`);
    if (!name || !fs.existsSync(file)) return void ((res.statusCode = 404), res.end('not found'));
    vercelify(req, res, url);
    try {
      const raw = req.method === 'POST' ? await readBody(req) : '';
      req.body = raw ? JSON.parse(raw) : {};
    } catch {
      return res.status(400).json({ error: 'bad_request', message: 'Invalid or oversized JSON body' });
    }
    const mod = await import(pathToFileURL(file).href);
    return mod.default(req, res);
  }
  const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const file = path.join(root, 'public', path.normalize(rel));
  if (!file.startsWith(path.join(root, 'public')) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.statusCode = 404;
    return res.end('not found');
  }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Cocok Hijab on http://localhost:${PORT} (live YouCam API: ${process.env.YOUCAM_API_KEY ? 'yes' : 'no key'})`);
});
