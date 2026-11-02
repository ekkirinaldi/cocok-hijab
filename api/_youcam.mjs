// Thin server-side client for the YouCam API (https://docs.perfectcorp.com).
// The key is read from YOUCAM_API_KEY and never leaves the server.

const BASE = process.env.YOUCAM_API_BASE || 'https://yce-api-01.makeupar.com/s2s/v2.0';

export class YouCamError extends Error {
  constructor(message, { status = 502, code = 'youcam_error' } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function apiKey() {
  const key = process.env.YOUCAM_API_KEY;
  if (!key) throw new YouCamError('YOUCAM_API_KEY is not set on the server', { status: 503, code: 'no_api_key' });
  return key;
}

export function hasKey() {
  return Boolean(process.env.YOUCAM_API_KEY);
}

async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new YouCamError(`YouCam returned non-JSON (${res.status})`, { status: 502 });
  }
  if (!res.ok || (json.status && json.status >= 400)) {
    const code = json.error_code || json.error || `http_${res.status}`;
    const status = code === 'CreditInsufficiency' ? 402 : res.status === 429 ? 429 : 502;
    throw new YouCamError(`YouCam ${method} ${path} failed: ${code}`, { status, code });
  }
  return json;
}

// File API: register the file, then PUT the bytes to the signed URL it returns.
export async function uploadImage(buffer, contentType) {
  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const reg = await call('/file', {
    method: 'POST',
    body: { files: [{ content_type: contentType, file_name: `selfie.${ext}`, file_size: buffer.length }] },
  });
  const file = reg.data?.files?.[0];
  const put = file?.requests?.[0];
  if (!file?.file_id || !put?.url) throw new YouCamError('File API returned no upload URL');
  const headers = { ...(put.headers || {}) };
  delete headers['Content-Length'];
  delete headers['content-length'];
  const up = await fetch(put.url, { method: put.method || 'PUT', headers, body: buffer });
  if (!up.ok) throw new YouCamError(`Upload to signed URL failed (${up.status})`);
  return file.file_id;
}

export async function startTask(task, body) {
  const json = await call(`/task/${task}`, { method: 'POST', body });
  const taskId = json.data?.task_id;
  if (!taskId) throw new YouCamError(`No task_id from ${task}`);
  return taskId;
}

// Polls once and normalises the result. The docs show results both as an object
// with `url` and as an array with `download_url`, so both shapes are accepted.
export async function getTask(task, taskId) {
  const json = await call(`/task/${task}/${encodeURIComponent(taskId)}`);
  const d = json.data || {};
  const status = d.task_status;
  if (status === 'success') {
    const r = d.results;
    const first = Array.isArray(r) ? r[0] : r;
    return {
      status: 'success',
      url: first?.url || first?.download_url || null,
      color: first?.color || r?.color || null,
      raw: d,
    };
  }
  if (status === 'error') {
    return { status: 'error', error: d.error || d.failure_reason || 'unknown_error', message: d.error_message || null };
  }
  return { status: status || 'running' };
}
