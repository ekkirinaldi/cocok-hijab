import { YouCamError } from './_youcam.mjs';

// Small per-instance limiter so a public demo link cannot drain the API units.
const hits = new Map();
export function rateLimit(req, bucket, max, windowMs = 60 * 60 * 1000) {
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local').split(',')[0].trim();
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) throw new YouCamError('Too many requests, try again later', { status: 429, code: 'rate_limited' });
  list.push(now);
  hits.set(key, list);
}

export function handle(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      const status = err instanceof YouCamError ? err.status : 500;
      if (!(err instanceof YouCamError)) console.error(err);
      res.status(status).json({ error: err.code || 'server_error', message: err.message });
    }
  };
}

export function bad(message) {
  return new YouCamError(message, { status: 400, code: 'bad_request' });
}
