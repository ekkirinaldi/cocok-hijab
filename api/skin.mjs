import { startTask, getTask } from './_youcam.mjs';
import { handle, rateLimit, bad } from './_http.mjs';
import { SKIN_CONCERNS, parseSkin } from '../public/js/skin.js';

const TASK = 'skin-analysis';

// POST { fileId } -> { taskId }   AI Skin Analysis, 8 SD concerns (12 units on success)
// GET  ?taskId=... -> { status, overall, scores: [{ type, score, ui }], masks: { type: url } }
export default handle(async (req, res) => {
  if (req.method === 'POST') {
    const fileId = req.body?.fileId;
    if (typeof fileId !== 'string' || !fileId) throw bad('fileId required');
    rateLimit(req, 'skin', 6);
    const taskId = await startTask(TASK, {
      src_file_id: fileId,
      dst_actions: SKIN_CONCERNS,
      miniserver_args: { enable_mask_overlay: false },
      format: 'json',
    });
    return res.status(200).json({ taskId });
  }
  const taskId = req.query?.taskId;
  if (!taskId) throw bad('taskId required');
  const r = await getTask(TASK, taskId);
  if (r.status !== 'success') return res.status(200).json({ status: r.status, error: r.error, message: r.message });
  res.status(200).json({ status: 'success', ...parseSkin(r.raw?.results?.output || []) });
});
