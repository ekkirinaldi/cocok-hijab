import { products, findShade, formatRupiah, DEMO_NOTICE } from './catalog.js';
import { sampleModels } from './models.js';
import { describeSkin, describeHijab, rankFoundation, rankLips, rgbToHex, hue } from './recommend.js';
import { CONCERN_LABELS, SKIN_CONCERNS, level, skinNeeds } from './skin.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const state = {
  live: false,
  manifest: {},
  view: 'analyse', // analyse | tryon | shop
  face: null, // { kind: 'sample'|'upload', id, src, fileIdPromise }
  tone: null, // AI Facial Color Tones Analyzer result: skin_color, lip_color, eye_color, ...
  toneStatus: 'idle', // idle | running | done | error
  toneError: null,
  skin: null, // AI Skin Analysis: { scores: [{ type, score, ui }], masks: { type: url } }
  skinStatus: 'idle',
  skinError: null,
  maskType: null,
  hijabHex: null,
  hijabGuessed: false,
  productId: products[0].id,
  shadeId: null,
  halalOnly: true,
  cat: 'all',
  cart: 0,
  picking: false,
  faceToken: 0, // bumped when the face changes; stale analyses are dropped
  renderToken: 0, // bumped per try-on; stale renders are dropped
};

// Friendly text for YouCam error codes a shopper can fix by retaking the photo.
const PHOTO_ERRORS = {
  error_face_position_too_small: 'Your face looks too small. Hold the phone closer so your face fills most of the frame.',
  error_src_face_too_small: 'Your face looks too small. Hold the phone closer so your face fills most of the frame.',
  error_face_position_invalid: 'We could not see your whole face. Face the camera with your face fully in frame.',
  error_face_position_out_of_boundary: 'Your face is cut off at the edge. Step back a little and centre your face.',
  error_src_face_out_of_bound: 'Your face is cut off at the edge. Step back a little and centre your face.',
  error_face_not_forward_facing: 'Look straight into the camera.',
  error_face_angle_upward: 'Tilt your head down slightly.',
  error_face_angle_downward: 'Tilt your head up slightly.',
  error_face_angle_leftward: 'Turn your head slightly to the right.',
  error_face_angle_rightward: 'Turn your head slightly to the left.',
  error_face_angle_left_tilt: 'Your head is tilted, keep it level.',
  error_face_angle_right_tilt: 'Your head is tilted, keep it level.',
  error_face_angle_invalid: 'Keep your head level and facing the camera.',
  error_lighting_dark: 'The photo is too dark. Face a window or turn on a light.',
  error_below_min_image_size: 'That photo is too small, use a larger one.',
  CreditInsufficiency: 'The demo has used up its YouCam API units for now.',
  rate_limited: 'Too many tries from this device, please wait a few minutes.',
  no_api_key: 'Live analysis is not switched on in this deployment, try a sample shopper.',
};
const friendly = (code) => PHOTO_ERRORS[code] || `YouCam could not process this photo (${code}). Try another one.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, body) {
  const res = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.message || res.statusText), { code: json.error || `http_${res.status}` });
  return json;
}

async function poll(path, taskId, limitMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < limitMs) {
    await sleep(2000);
    const r = await api(`${path}?taskId=${encodeURIComponent(taskId)}`);
    if (r.status === 'success') return r;
    if (r.status === 'error') throw Object.assign(new Error(r.message || r.error), { code: r.error });
  }
  throw Object.assign(new Error('Timed out'), { code: 'timeout' });
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 2600);
}

// ---------- images ----------

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Resize to a long side of 1024 px: inside YouCam's limits for makeup, tone and SD skin analysis.
async function toJpegDataUrl(src, maxSide = 1024) {
  const img = await loadImage(src);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.9);
}

async function sampleColor(src, fx, fy, radius = 4) {
  const img = await loadImage(src);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const x = Math.round(fx * c.width);
  const y = Math.round(fy * c.height);
  const { data } = ctx.getImageData(Math.max(0, x - radius), Math.max(0, y - radius), radius * 2 + 1, radius * 2 + 1);
  const sum = [0, 0, 0];
  for (let i = 0; i < data.length; i += 4) for (let k = 0; k < 3; k++) sum[k] += data[i + k];
  const n = data.length / 4;
  return rgbToHex(sum.map((v) => v / n));
}

// First guess at the hijab colour: the crown of the head, which in a hijab selfie is fabric.
// YouCam's hair_color can't be used: under a hijab it reports a fixed "Auburn" or "Blonde".
function guessHijab(src) {
  return sampleColor(src, 0.5, 0.07, 6);
}

// ---------- views ----------

function setView(view, { scroll = true } = {}) {
  state.view = view;
  document.body.dataset.view = view;
  document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-current', String(t.dataset.view === view)));
  renderBuybar();
  if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- face selection & analysis ----------

// One upload per face, shared by all analyses and try-ons even when they start together.
function ensureFileId() {
  const face = state.face;
  face.fileIdPromise ||= toJpegDataUrl(face.src)
    .then((image) => api('/api/upload', { image }))
    .then((r) => r.fileId)
    .catch((err) => {
      face.fileIdPromise = null;
      throw err;
    });
  return face.fileIdPromise;
}

async function runTone(token) {
  state.toneStatus = 'running';
  try {
    const { taskId } = await api('/api/tone', { fileId: await ensureFileId() });
    const r = await poll('/api/tone', taskId);
    if (token !== state.faceToken) return;
    state.tone = r.color;
    state.toneStatus = 'done';
  } catch (err) {
    if (token !== state.faceToken) return;
    state.toneStatus = 'error';
    state.toneError = friendly(err.code);
  }
  renderAll();
}

async function runSkin(token) {
  state.skinStatus = 'running';
  try {
    const { taskId } = await api('/api/skin', { fileId: await ensureFileId() });
    const r = await poll('/api/skin', taskId);
    if (token !== state.faceToken) return;
    state.skin = { overall: r.overall, scores: r.scores, masks: r.masks };
    state.skinStatus = 'done';
  } catch (err) {
    if (token !== state.faceToken) return;
    state.skinStatus = 'error';
    state.skinError = friendly(err.code);
  }
  renderAll();
}

// Colour and skin analysis run in parallel on the same uploaded file.
function analyse() {
  const token = state.faceToken;
  const jobs = [];
  if (!state.tone) jobs.push(runTone(token));
  if (!state.skin) jobs.push(runSkin(token));
  renderAll();
  return Promise.all(jobs);
}

function resetAnalysis() {
  state.faceToken++;
  state.renderToken++;
  state.tone = null;
  state.skin = null;
  state.toneStatus = state.skinStatus = 'idle';
  state.toneError = state.skinError = null;
  state.maskType = null;
  state.shadeId = null;
}

function selectSample(model) {
  resetAnalysis();
  state.face = { kind: 'sample', id: model.id, src: model.src };
  state.hijabHex = model.hijabHex;
  state.hijabGuessed = false;
  const cached = state.manifest[model.id] || {};
  if (cached.tone) {
    state.tone = cached.tone;
    state.toneStatus = 'done';
  }
  if (cached.skin) {
    const masks = Object.fromEntries(Object.entries(cached.skin.masks || {}).map(([k, v]) => [k, `/cached/${v}`]));
    state.skin = { overall: cached.skin.overall, scores: cached.skin.scores, masks };
    state.skinStatus = 'done';
  }
  showBefore(model.src);
  renderFaces();
  renderAll();
  if (state.live && (!state.tone || !state.skin)) analyse();
}

async function selectUpload(file) {
  if (!file) return;
  if (!/^image\/(jpeg|png)$/.test(file.type)) return toast('Please choose a JPG or PNG photo');
  resetAnalysis();
  const src = await toJpegDataUrl(URL.createObjectURL(file));
  state.face = { kind: 'upload', id: 'upload', src };
  state.hijabHex = await guessHijab(src);
  state.hijabGuessed = true;
  showBefore(src);
  renderFaces();
  setView('analyse');
  analyse();
}

// ---------- stage ----------

function showBefore(src) {
  $('beforeImg').src = src;
  $('afterImg').removeAttribute('src');
  $('stage').classList.add('no-after');
  showMask(null);
  setStatus('Pick a shade to try it on.');
}

function showMask(type) {
  state.maskType = type;
  const url = type && state.skin?.masks?.[type];
  $('maskImg').hidden = !url;
  $('maskTag').hidden = !url;
  if (url) {
    $('maskImg').src = url;
    $('maskTag').textContent = `Showing: ${CONCERN_LABELS[type]}`;
  }
}

function setStatus(html) {
  $('stageStatus').innerHTML = html;
}

function setBusy(on, text = 'Rendering with YouCam…') {
  $('stageBusy').hidden = !on;
  $('busyText').textContent = text;
}

const lookKey = (looks) => looks.map((l) => `${l.productId}__${l.shadeId}`).join('+');

async function renderLook(looks) {
  const token = ++state.renderToken;
  setView('tryon', { scroll: window.matchMedia('(max-width: 860px)').matches });
  const names = looks.map((l) => findShade(l.productId, l.shadeId)).map(({ product, shade }) => `${shade.name} (${product.name})`);
  const cached = state.face.kind === 'sample' && state.manifest[state.face.id]?.renders?.[lookKey(looks)];
  let url;
  let how;
  if (cached) {
    url = `/cached/${cached}`;
    how = 'pre-rendered with the YouCam API for this sample';
  } else if (state.live) {
    setBusy(true);
    try {
      const fileId = await ensureFileId();
      const { taskId } = await api('/api/tryon', { fileId, looks });
      const r = await poll('/api/tryon', taskId);
      url = r.url;
      how = 'rendered live by the YouCam API';
    } catch (err) {
      if (token === state.renderToken) {
        setBusy(false);
        setStatus(`<span class="error">${esc(friendly(err.code))}</span>`);
      }
      return;
    }
  } else {
    setStatus('Live try-on is off in this deployment. Sample shoppers show pre-rendered results.');
    return;
  }
  const img = $('afterImg');
  await new Promise((resolve) => {
    img.onload = resolve;
    img.onerror = resolve;
    img.src = url;
  });
  if (token !== state.renderToken) return;
  setBusy(false);
  $('stage').classList.remove('no-after');
  setStatus(`Wearing <strong>${esc(names.join(' + '))}</strong>: ${how}. Drag to compare.`);
}

// ---------- recommendations ----------

function needs() {
  return state.skin?.scores?.length ? skinNeeds(state.skin.scores) : null;
}

function recommendations() {
  if (!state.tone?.skin_color) return null;
  const skin = describeSkin(state.tone.skin_color);
  const hijab = state.hijabHex ? describeHijab(state.hijabHex, skin) : null;
  const n = needs();
  const opts = { lipHex: state.tone.lip_color, hijab, halalOnly: state.halalOnly, needs: n };
  return {
    skin,
    hijab,
    needs: n,
    face: rankFoundation(products, skin, opts),
    lips: rankLips(products, skin, opts),
    faceAll: rankFoundation(products, skin, { ...opts, halalOnly: false }),
    lipsAll: rankLips(products, skin, { ...opts, halalOnly: false }),
  };
}

const HIJAB_WORDS = { dark: 'dark frame', white: 'pale frame', neutral: 'neutral frame', colour: 'coloured frame' };
const DEPTHS = ['very light', 'light', 'medium', 'tan', 'brown', 'deep'];
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// ---------- analysis report (view 1) ----------

function scale(title, value, left, right, pos, gradient) {
  return `<div class="scale"><div class="scale-title">${title}<span>${esc(value)}</span></div>
    <div class="scale-bar" style="background:${gradient}"><i style="left:${(pos * 100).toFixed(1)}%"></i></div>
    <div class="scale-labels"><span>${left}</span><span>${right}</span></div></div>`;
}

function reading(hex, title, sub, extra = '') {
  return `<div class="reading"><span class="sw" style="background:${hex}"></span><span><b>${title}</b><span>${sub}</span></span>${extra}</div>`;
}

function progressRow(status, label, error) {
  const icon = status === 'running' ? '<span class="spinner"></span>' : status === 'done' ? '✓' : status === 'error' ? '✕' : '·';
  return `<li>${icon} <span>${label}${status === 'error' ? `: <span class="error">${esc(error)}</span>` : ''}</span></li>`;
}

function renderReport() {
  const el = $('report');
  const who = state.face?.kind === 'upload' ? 'your photo' : `${esc(sampleModels.find((m) => m.id === state.face?.id)?.label || 'this shopper')}`;
  let html = `<h2>Your colour &amp; skin analysis</h2><p class="src">Measured by the YouCam API on ${who}, hijab on.</p>`;

  const busy = state.toneStatus === 'running' || state.skinStatus === 'running';
  if (busy || (state.toneStatus === 'error' && !state.tone)) {
    html += `<ul class="progress">
      ${progressRow(state.face?.fileIdPromise ? 'done' : 'running', 'Photo uploaded securely')}
      ${progressRow(state.toneStatus, 'Colour analysis (AI Facial Color Tones Analyzer)', state.toneError)}
      ${progressRow(state.skinStatus, 'Skin analysis (AI Skin Analysis, 8 concerns)', state.skinError)}
    </ul>`;
  }

  if (state.tone?.skin_color) {
    const skin = describeSkin(state.tone.skin_color);
    const h = hue(skin.lab);
    const hijab = state.hijabHex ? describeHijab(state.hijabHex, skin) : null;
    const tone = { warm: 'Leans warm', cool: 'Leans cool', neutral: 'Neutral' }[skin.undertone];
    html += `<div class="section"><h3>Colour analysis <small>AI Facial Color Tones Analyzer</small></h3>
      <div class="hero-tone"><span class="big" style="background:${skin.hex}"></span>
        <span><b>${skin.depth[0].toUpperCase() + skin.depth.slice(1)}, ${tone.toLowerCase()}</b><span>Skin ${esc(skin.hex)} · L* ${skin.lab.L.toFixed(0)} · ITA ${skin.ita.toFixed(0)}°</span></span></div>
      ${scale('Depth', `${skin.depth} (ITA ${skin.ita.toFixed(0)}°)`, 'Very light', 'Deep', clamp01((70 - skin.ita) / 120), 'linear-gradient(90deg,#f1d9c6,#d9b08c,#b98d68,#9a6e4c,#6e4a33,#3f2a1f)')}
      ${scale('Undertone', `${tone} (hue ${h.toFixed(0)}°)`, 'Cool / pink', 'Warm / golden', clamp01((h - 46) / 26), 'linear-gradient(90deg,#d7a3a8,#d9b09a,#d8b47e)')}
      <div class="readings">
        ${state.tone.lip_color ? reading(state.tone.lip_color, 'Natural lip', esc(state.tone.lip_color)) : ''}
        ${state.tone.eye_color ? reading(state.tone.eye_color, 'Eyes', `${esc(state.tone.eye_color_name || '')} ${esc(state.tone.eye_color)}`) : ''}
        ${state.tone.eyebrow_color ? reading(state.tone.eyebrow_color, 'Brows', esc(state.tone.eyebrow_color)) : ''}
        ${hijab ? reading(hijab.hex, 'Hijab', `${HIJAB_WORDS[hijab.family]}${hijab.nearSkin ? ', close to skin' : ''}${state.hijabGuessed ? ' (estimated)' : ''}`, '<button class="btn btn-ghost btn-small pick" type="button">Pick</button>') : ''}
        <div class="reading muted"><span class="sw"></span><span><b>Hair</b><span>Covered, not used${state.tone.hair_color_name ? ` (API said "${esc(state.tone.hair_color_name)}")` : ''}</span></span></div>
      </div></div>`;
  } else if (!busy && state.toneStatus !== 'error') {
    html += `<p class="empty">${state.live ? 'Choose a face or upload a selfie to start the analysis.' : 'Choose a sample shopper to see the analysis.'}</p>`;
  }

  if (state.skin?.scores?.length) {
    const ordered = SKIN_CONCERNS.map((t) => state.skin.scores.find((s) => s.type === t)).filter(Boolean);
    html += `<div class="section"><h3>Skin analysis <small>AI Skin Analysis · tap to see where</small></h3>
      ${state.skin.overall != null ? `<p class="overall"><b>${state.skin.overall}</b><span>overall skin score</span></p>` : ''}
      <div class="concerns">${ordered
        .map((s) => {
          const lv = level(s.score);
          return `<button class="concern" type="button" data-type="${s.type}" aria-pressed="${state.maskType === s.type}">
            <span>${esc(CONCERN_LABELS[s.type] || s.type)}</span>
            <span class="bar ${lv === 'concern' ? 'concern-low' : lv}"><i style="width:${s.score}%"></i></span><b>${s.score}</b></button>`;
        })
        .join('')}</div>
      <p class="fine">Scores 1-100, higher is healthier. Used to choose a base finish and coverage, not as medical advice.</p></div>`;
  } else if (state.skinStatus === 'error' && state.tone) {
    html += `<div class="section"><h3>Skin analysis</h3><p class="error">${esc(state.skinError)}</p></div>`;
  }

  const n = needs();
  if (n && state.tone) {
    html += `<div class="section"><h3>What it means for your base</h3>
      <div class="needs"><div class="need"><small>Finish</small><b>${n.finish}</b></div><div class="need"><small>Coverage</small><b>${n.coverage}</b></div></div>
      <ul class="why">${n.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>`;
  }
  if (state.tone) html += `<button class="btn btn-primary cta" type="button" id="toMatches">See my matches &amp; try on →</button>`;

  el.innerHTML = html;
  el.querySelectorAll('.concern').forEach((b) =>
    b.addEventListener('click', () => {
      showMask(state.maskType === b.dataset.type ? null : b.dataset.type);
      renderReport();
      if (window.matchMedia('(max-width: 860px)').matches && state.maskType) $('stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
    })
  );
  el.querySelector('.pick')?.addEventListener('click', startPicking);
  $('toMatches')?.addEventListener('click', () => setView('tryon'));
}

// ---------- matches (view 2) ----------

function recButton(row, extra) {
  return `<button class="rec" type="button" data-p="${row.product.id}" data-s="${row.shade.id}">
    <span class="sw" style="background:${row.shade.hex}"></span>
    <span><b>${esc(row.shade.name)}</b> <small>${esc(row.product.name)} · ${row.product.halal === 'labelled' ? 'Halal label (demo)' : 'No halal label (demo)'}</small>
      <ul>${row.reasons.slice(0, extra).map((r) => `<li>${esc(r)}</li>`).join('')}</ul></span>
    <span class="try">Try on</span></button>`;
}

function renderMatch() {
  const el = $('match');
  const head = `<h2>Cocok untukmu <span class="badge badge-match">Your matches</span></h2>`;
  const rec = recommendations();
  if (!rec) {
    el.innerHTML = `${head}<p class="empty">${state.toneStatus === 'running' ? 'Analysing your colours…' : 'Run the analysis first to get shade matches.'}</p>
      <button class="btn btn-ghost btn-small" type="button" id="toAnalyse">Go to analysis</button>`;
    $('toAnalyse').addEventListener('click', () => setView('analyse'));
    return;
  }
  const { skin, hijab } = rec;
  const tone = { warm: 'leans warm', cool: 'leans cool', neutral: 'neutral undertone' }[skin.undertone];
  const excluded = [];
  if (state.halalOnly && rec.faceAll[0] && rec.faceAll[0].product.halal !== 'labelled') {
    const f = rec.faceAll[0];
    excluded.push(`Closest base overall is ${f.shade.name} from ${f.product.name} (ΔE ${f.dE.toFixed(1)}), hidden because it has no halal label in the demo data.`);
  }
  if (state.halalOnly && rec.lipsAll[0] && rec.lipsAll[0].product.halal !== 'labelled') {
    const l = rec.lipsAll[0];
    excluded.push(`Top lip overall is ${l.shade.name} from ${l.product.name}, hidden for the same reason.`);
  }
  const bestFace = rec.face[0];
  const bestLip = rec.lips[0];
  el.innerHTML = `${head}
    <p class="match-sub">For ${skin.depth} skin that ${tone}${hijab ? `, in a ${HIJAB_WORDS[hijab.family]}` : ''}${rec.needs ? `, wanting a ${rec.needs.finish} ${rec.needs.coverage}-coverage base` : ''}.</p>
    <label class="toggle"><input type="checkbox" id="halalOnly" ${state.halalOnly ? 'checked' : ''}> Halal-labelled products only</label>
    ${excluded.map((t) => `<p class="excluded">${esc(t)}</p>`).join('')}
    <div class="recs">
      <h3>Foundation &amp; skin tint</h3>
      ${rec.face.slice(0, 3).map((r) => recButton(r, 3)).join('') || '<p class="empty">No base shades match the filter.</p>'}
      <h3>Lips, with your hijab in mind</h3>
      ${rec.lips.slice(0, 3).map((r) => recButton(r, 4)).join('') || '<p class="empty">No lip shades match the filter.</p>'}
    </div>
    ${bestFace && bestLip ? `<button class="btn btn-primary look" type="button" id="wearLook">Wear my match: ${esc(bestFace.shade.name)} + ${esc(bestLip.shade.name)}</button>` : ''}`;
  el.querySelectorAll('.rec').forEach((b) => b.addEventListener('click', () => tryShade(b.dataset.p, b.dataset.s)));
  $('halalOnly').addEventListener('change', (e) => {
    state.halalOnly = e.target.checked;
    renderMatch();
    renderProduct();
  });
  $('wearLook')?.addEventListener('click', () =>
    renderLook([
      { productId: bestFace.product.id, shadeId: bestFace.shade.id },
      { productId: bestLip.product.id, shadeId: bestLip.shade.id },
    ])
  );
}

function startPicking() {
  state.picking = true;
  $('stage').classList.add('picking');
  $('eyedropHint').hidden = false;
  showMask(null);
  $('stage').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function pickAt(ev) {
  const stage = $('stage');
  const img = $('beforeImg');
  const r = stage.getBoundingClientRect();
  // Undo object-fit: cover to find the pixel under the pointer.
  const scaleF = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight);
  const dx = (r.width - img.naturalWidth * scaleF) / 2;
  const dy = (r.height - img.naturalHeight * scaleF) / 2;
  const fx = (ev.clientX - r.left - dx) / (img.naturalWidth * scaleF);
  const fy = (ev.clientY - r.top - dy) / (img.naturalHeight * scaleF);
  state.picking = false;
  stage.classList.remove('picking');
  $('eyedropHint').hidden = true;
  state.hijabHex = await sampleColor(img.src, clamp01(fx), clamp01(fy));
  state.hijabGuessed = false;
  renderAll();
  toast('Hijab colour updated, matches re-ranked');
}

// ---------- product, buy bar & catalog ----------

function bestShadeIn(product) {
  const rec = recommendations();
  if (!rec) return null;
  const rows =
    product.category === 'face'
      ? rankFoundation([product], rec.skin, { halalOnly: false })
      : rankLips([product], rec.skin, { lipHex: state.tone.lip_color, hijab: rec.hijab, halalOnly: false });
  return rows[0]?.shade.id || null;
}

function packSvg(product, hex) {
  if (product.category === 'lips') {
    return `<svg viewBox="0 0 60 110" width="44" height="88" aria-hidden="true"><path d="M20 22 L40 12 L40 46 L20 46 Z" fill="${hex}"/><rect x="16" y="46" width="28" height="14" rx="2" fill="#c9b8a6"/><rect x="14" y="60" width="32" height="44" rx="4" fill="#2a1f1d"/></svg>`;
  }
  return `<svg viewBox="0 0 70 110" width="52" height="88" aria-hidden="true"><rect x="27" y="6" width="16" height="22" rx="3" fill="#2a1f1d"/><rect x="12" y="28" width="46" height="76" rx="12" fill="${hex}"/><rect x="20" y="58" width="30" height="14" rx="3" fill="rgb(255 255 255 / 55%)"/></svg>`;
}

function halalBadge(product) {
  return product.halal === 'labelled'
    ? '<span class="badge badge-halal">✓ Halal label (demo)</span>'
    : '<span class="badge badge-none">No halal label (demo)</span>';
}

function addToCart() {
  const product = products.find((p) => p.id === state.productId);
  const shade = product.shades.find((s) => s.id === state.shadeId);
  if (!shade) return;
  state.cart++;
  $('cartCount').textContent = state.cart;
  toast(`Added ${shade.name} to cart (demo store, nothing is sold)`);
}

function renderProduct() {
  const product = products.find((p) => p.id === state.productId);
  const match = bestShadeIn(product);
  const selected = product.shades.find((s) => s.id === state.shadeId) || null;
  $('product').innerHTML = `
    <div class="crumbs">Demo store › ${product.category === 'lips' ? 'Lips' : 'Face'}</div>
    <h1>${esc(product.name)}</h1>
    <div class="brandline">${esc(product.brand)} ${halalBadge(product)}</div>
    <div class="price">${formatRupiah(product.price)}</div>
    <p class="blurb">${esc(product.blurb)}</p>
    <div class="shade-head"><h3>Shade${selected ? `: ${esc(selected.name)}` : ''}</h3>${match ? '<span><span class="badge badge-match">● Your match</span></span>' : '<span>Tap a shade to try it on</span>'}</div>
    <div class="shades">${product.shades
      .map(
        (s) => `<button class="shade" type="button" style="background:${s.hex}" data-s="${s.id}" aria-pressed="${s.id === state.shadeId}" aria-label="${esc(s.name)}${s.id === match ? ', your match' : ''}" title="${esc(s.name)}">${s.id === match ? '<span class="dot"></span>' : ''}</button>`
      )
      .join('')}</div>
    <div class="buy">
      <button class="btn btn-primary" type="button" id="addCart" ${selected ? '' : 'disabled'}>${selected ? 'Add to cart' : 'Choose a shade'}</button>
    </div>
    <p class="halal-note">${
      product.halal === 'labelled'
        ? 'Halal label shown from demo data only. Since 17 October 2026, cosmetics sold in Indonesia must be halal certified (PP 42/2024). A real store would check each product against the BPJPH halal registry.'
        : 'This demo product has no halal label, so it is left out of matches while the halal filter is on.'
    }</p>`;
  $('product').querySelectorAll('.shade').forEach((b) => b.addEventListener('click', () => tryShade(product.id, b.dataset.s)));
  $('addCart').addEventListener('click', addToCart);
  renderBuybar();
}

function renderBuybar() {
  const bar = $('buybar');
  const product = products.find((p) => p.id === state.productId);
  const shade = product.shades.find((s) => s.id === state.shadeId);
  bar.hidden = !shade || state.view !== 'tryon';
  if (bar.hidden) return;
  bar.innerHTML = `<span class="sw" style="background:${shade.hex}"></span>
    <div><b>${esc(shade.name)}</b><span class="p">${formatRupiah(product.price)}</span> · ${esc(product.name)}</div>
    <button class="btn btn-primary btn-small" type="button" id="barAdd">Add to cart</button>`;
  $('barAdd').addEventListener('click', addToCart);
}

function tryShade(productId, shadeId) {
  state.productId = productId;
  state.shadeId = shadeId;
  renderProduct();
  renderGrid();
  renderLook([{ productId, shadeId }]);
}

function renderGrid() {
  const list = products.filter((p) => state.cat === 'all' || p.category === state.cat);
  $('grid').innerHTML = list
    .map(
      (p) => `<button class="card tile" type="button" data-p="${p.id}" aria-current="${p.id === state.productId}">
      <div class="pack">${packSvg(p, p.shades[Math.floor(p.shades.length / 2)].hex)}</div>
      <div class="tile-body"><b>${esc(p.name)}</b>
        <div class="row"><span class="p">${formatRupiah(p.price)}</span><span class="mini">${p.shades.slice(0, 5).map((s) => `<i style="background:${s.hex}"></i>`).join('')}</span></div>
        <div>${halalBadge(p)}</div></div></button>`
    )
    .join('');
  $('grid').querySelectorAll('.tile').forEach((t) =>
    t.addEventListener('click', () => {
      state.productId = t.dataset.p;
      state.shadeId = null;
      renderProduct();
      renderGrid();
      setView('tryon');
    })
  );
}

function renderFaces() {
  $('faces').innerHTML = sampleModels
    .map(
      (m) => `<button class="face" type="button" data-id="${m.id}" aria-pressed="${state.face?.id === m.id}">
      <img src="${m.src}" alt="${esc(m.label)}, ${esc(m.note)}" loading="lazy"><span>${esc(m.label)}</span><small>${esc(m.note)}</small></button>`
    )
    .join('') +
    `<button class="face add" type="button" id="addSelfie" aria-pressed="${state.face?.kind === 'upload'}" aria-expanded="${!$('uploadBox').hidden}">
      <span class="plus" aria-hidden="true">+</span><span>Selfie</span><small>use your own photo</small></button>`;
  $('faces').querySelectorAll('.face[data-id]').forEach((b) => b.addEventListener('click', () => selectSample(sampleModels.find((m) => m.id === b.dataset.id))));
  $('addSelfie').addEventListener('click', () => {
    $('uploadBox').hidden = !$('uploadBox').hidden;
    $('addSelfie').setAttribute('aria-expanded', String(!$('uploadBox').hidden));
  });
}

function renderAll() {
  renderReport();
  renderMatch();
  renderProduct();
}

// ---------- boot ----------

async function boot() {
  $('demoStrip').textContent = DEMO_NOTICE;
  $('footNotice').textContent = DEMO_NOTICE;
  const [health, manifest] = await Promise.all([
    fetch('/api/health').then((r) => (r.ok ? r.json() : { live: false })).catch(() => ({ live: false })),
    fetch('/cached/manifest.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
  ]);
  state.live = Boolean(health.live);
  state.manifest = manifest;

  if (!state.live) {
    $('uploadBox').innerHTML = '<p class="fine">Selfie upload needs the live YouCam API, which is off in this deployment. Sample shoppers use results pre-rendered with the API.</p>';
  } else {
    $('consent').addEventListener('change', (e) => {
      $('fileInput').disabled = !e.target.checked;
      $('uploadLabel').setAttribute('aria-disabled', String(!e.target.checked));
    });
    $('fileInput').addEventListener('change', (e) => selectUpload(e.target.files[0]));
  }

  const stage = $('stage');
  $('split').addEventListener('input', (e) => stage.style.setProperty('--split', `${e.target.value}%`));
  stage.addEventListener('click', (e) => state.picking && pickAt(e));
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => setView(t.dataset.view)));
  document.querySelectorAll('.filters .chip').forEach((c) =>
    c.addEventListener('click', () => {
      state.cat = c.dataset.cat;
      document.querySelectorAll('.filters .chip').forEach((x) => x.classList.toggle('active', x === c));
      renderGrid();
    })
  );
  $('cartBtn').addEventListener('click', () => toast(state.cart ? `${state.cart} item(s) in your demo cart` : 'Your demo cart is empty'));

  setView('analyse', { scroll: false });
  renderGrid();
  selectSample(sampleModels[0]);
}

boot();
