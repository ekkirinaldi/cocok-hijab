import { startTask, getTask } from './_youcam.mjs';
import { handle, rateLimit, bad } from './_http.mjs';

const TASK = 'skin-tone-analysis';

// POST { fileId } -> { taskId }      starts AI Facial Color Tones Analyzer (20 units on success)
// GET  ?taskId=... -> { status, color }  polls once; the browser keeps polling
export default handle(async (req, res) => {
  if (req.method === 'POST') {
    const fileId = req.body?.fileId;
    if (typeof fileId !== 'string' || !fileId) throw bad('fileId required');
    rateLimit(req, 'tone', 10);
    // Medium strictness tolerates the slight head tilt of a handheld phone selfie.
    const taskId = await startTask(TASK, { src_file_id: fileId, face_angle_strictness_level: 'medium' });
    return res.status(200).json({ taskId });
  }
  const taskId = req.query?.taskId;
  if (!taskId) throw bad('taskId required');
  const r = await getTask(TASK, taskId);
  res.status(200).json({ status: r.status, color: r.color, error: r.error, message: r.message });
});
