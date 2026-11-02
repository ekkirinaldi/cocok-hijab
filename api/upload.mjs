import { uploadImage } from './_youcam.mjs';
import { handle, rateLimit, bad } from './_http.mjs';

// POST { image: "data:image/jpeg;base64,..." } -> { fileId }
// The browser resizes the selfie before sending, so bodies stay well under 4 MB.
export default handle(async (req, res) => {
  if (req.method !== 'POST') throw bad('POST only');
  const match = /^data:(image\/(?:jpeg|png));base64,(.+)$/.exec(req.body?.image || '');
  if (!match) throw bad('Expected a JPEG or PNG data URL in "image"');
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 4 * 1024 * 1024) throw bad('Image too large, keep it under 4 MB');
  rateLimit(req, 'upload', 15);
  const fileId = await uploadImage(buffer, match[1]);
  res.status(200).json({ fileId });
});
