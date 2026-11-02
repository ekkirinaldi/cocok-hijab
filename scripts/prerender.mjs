// Runs the real YouCam API over the four sample models and saves the results into
// public/cached/, so the sample flow is instant and works even if API units run out.
// It doubles as the hijab framing test: every tone result and render is real API output.
//
//   node scripts/prerender.mjs                       all models, all shades, plus "my match" looks
//   node scripts/prerender.mjs --models sari --products kain-matte,seri-serum
//   node scripts/prerender.mjs --tone-only           tone + skin analysis only (20 + 12 units/model)
//
// Already-saved files are skipped, so it is safe to re-run after an interruption.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (fs.existsSync(path.join(root, '.env'))) process.loadEnvFile(path.join(root, '.env'));

const { uploadImage, startTask, getTask } = await import('../api/_youcam.mjs');
const { buildEffects } = await import('../api/tryon.mjs');
const { products } = await import('../public/js/catalog.js');
const { sampleModels } = await import('../public/js/models.js');
const { describeSkin, describeHijab, rankFoundation, rankLips } = await import('../public/js/recommend.js');
const { SKIN_CONCERNS, skinNeeds, parseSkin } = await import('../public/js/skin.js');

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
const onlyModels = opt('models')?.split(',');
const onlyProducts = opt('products')?.split(',');
const toneOnly = args.includes('--tone-only');

const cacheDir = path.join(root, 'public', 'cached');
const manifestPath = path.join(cacheDir, 'manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
const save = () => fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// YouCam allows 250 requests per 300 s per key and per IP; stay near 0.7 req/s.
let nextSlot = 0;
async function paced(fn) {
  const wait = Math.max(0, nextSlot - Date.now());
  nextSlot = Math.max(Date.now(), nextSlot) + 1400;
  if (wait) await sleep(wait);
  return fn();
}

async function runTask(task, body) {
  const taskId = await paced(() => startTask(task, body));
  const started = Date.now();
  for (;;) {
    await sleep(2500);
    const r = await paced(() => getTask(task, taskId));
    if (r.status === 'success' || r.status === 'error') return { ...r, seconds: (Date.now() - started) / 1000 };
    if (Date.now() - started > 180_000) return { status: 'error', error: 'local_timeout' };
  }
}

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

const keyOf = (looks) => looks.map((l) => `${l.productId}__${l.shadeId}`).join('+');

async function render(model, entry, fileId, looks) {
  const key = keyOf(looks);
  const rel = `${model.id}/${key}.jpg`;
  if (entry.renders[key] && fs.existsSync(path.join(cacheDir, rel))) return;
  const r = await runTask('makeup-vto', { src_file_id: fileId, effects: buildEffects(looks), version: '1.0' });
  if (r.status !== 'success' || !r.url) {
    entry.errors[key] = r.error || 'no_url';
    console.log(`  ✗ ${key}: ${r.error}`);
  } else {
    await download(r.url, path.join(cacheDir, rel));
    entry.renders[key] = rel;
    delete entry.errors[key];
    console.log(`  ✓ ${key} (${r.seconds.toFixed(1)} s)`);
  }
  save();
}

for (const model of sampleModels.filter((m) => !onlyModels || onlyModels.includes(m.id))) {
  console.log(`\n== ${model.label} (${model.note})`);
  const entry = (manifest[model.id] ||= { tone: null, renders: {}, errors: {} });
  entry.errors ||= {};
  const buffer = fs.readFileSync(path.join(root, 'public', model.src));
  const fileId = await paced(() => uploadImage(buffer, 'image/jpeg'));

  if (!entry.tone) {
    const r = await runTask('skin-tone-analysis', { src_file_id: fileId, face_angle_strictness_level: 'medium' });
    if (r.status === 'success') {
      entry.tone = r.color;
      delete entry.errors.tone;
      console.log('  tone', JSON.stringify(r.color));
    } else {
      entry.errors.tone = r.error;
      console.log('  tone error', r.error, r.message || '');
    }
    save();
  }
  if (!entry.skin) {
    const r = await runTask('skin-analysis', {
      src_file_id: fileId,
      dst_actions: SKIN_CONCERNS,
      miniserver_args: { enable_mask_overlay: false },
      format: 'json',
    });
    const parsed = parseSkin(r.status === 'success' ? r.raw?.results?.output || [] : []);
    if (parsed.scores.length) {
      const masks = {};
      for (const [type, url] of Object.entries(parsed.masks)) {
        const rel = `${model.id}/mask_${type}.png`;
        await download(url, path.join(cacheDir, rel));
        masks[type] = rel;
      }
      entry.skin = { overall: parsed.overall, scores: parsed.scores, masks };
      delete entry.errors.skin;
      console.log('  skin', entry.skin.scores.map((x) => `${x.type}:${x.score}`).join(' '));
    } else {
      entry.errors.skin = r.error || 'no_output';
      console.log('  skin error', r.error, r.message || '');
    }
    save();
  }
  if (toneOnly) continue;

  for (const product of products.filter((p) => !onlyProducts || onlyProducts.includes(p.id))) {
    for (const shade of product.shades) await render(model, entry, fileId, [{ productId: product.id, shadeId: shade.id }]);
  }

  // The full "my match" look the page offers: best halal-labelled foundation + best lip.
  if (entry.tone?.skin_color && !onlyProducts) {
    const skin = describeSkin(entry.tone.skin_color);
    const hijab = describeHijab(model.hijabHex, skin);
    const needs = entry.skin ? skinNeeds(entry.skin.scores) : null;
    const face = rankFoundation(products, skin, { needs })[0];
    const lip = rankLips(products, skin, { lipHex: entry.tone.lip_color, hijab })[0];
    await render(model, entry, fileId, [
      { productId: face.product.id, shadeId: face.shade.id },
      { productId: lip.product.id, shadeId: lip.shade.id },
    ]);
  }
}
console.log('\nmanifest:', path.relative(root, manifestPath));
