import { startTask, getTask } from './_youcam.mjs';
import { handle, rateLimit, bad } from './_http.mjs';
import { findShade, effectFor } from '../public/js/catalog.js';

const TASK = 'makeup-vto';

// Skin smoothing is switched off so the shopper judges the shade, not a beauty filter.
const NO_SMOOTHING = { category: 'skin_smooth', skinSmoothStrength: 0, skinSmoothColorIntensity: 0 };

export function buildEffects(looks) {
  if (!Array.isArray(looks) || looks.length === 0 || looks.length > 2) throw bad('looks must have 1 or 2 items');
  const effects = [NO_SMOOTHING];
  const seen = new Set();
  for (const look of looks) {
    const found = findShade(look?.productId, look?.shadeId);
    if (!found) throw bad(`Unknown shade ${look?.productId}/${look?.shadeId}`);
    if (seen.has(found.product.category)) throw bad('At most one lip and one face product');
    seen.add(found.product.category);
    effects.push(effectFor(found.product, found.shade));
  }
  return effects;
}

// POST { fileId, looks: [{ productId, shadeId }] } -> { taskId }   AI Makeup Virtual Try-On (1 unit)
// GET  ?taskId=... -> { status, url }
export default handle(async (req, res) => {
  if (req.method === 'POST') {
    const { fileId, looks } = req.body || {};
    if (typeof fileId !== 'string' || !fileId) throw bad('fileId required');
    const effects = buildEffects(looks);
    rateLimit(req, 'tryon', 60);
    const taskId = await startTask(TASK, { src_file_id: fileId, effects, version: '1.0' });
    return res.status(200).json({ taskId });
  }
  const taskId = req.query?.taskId;
  if (!taskId) throw bad('taskId required');
  const r = await getTask(TASK, taskId);
  res.status(200).json({ status: r.status, url: r.url, error: r.error, message: r.message });
});
