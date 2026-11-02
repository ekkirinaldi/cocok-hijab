// Shade matching for Cocok Hijab. Inputs are the hex colours returned by the
// YouCam AI Facial Color Tones Analyzer (skin_color, lip_color) plus the hijab colour.
// Colour maths runs in CIELAB; foundation distance is CIEDE2000.

import { fitPenalty } from './skin.js';

export function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

export function hexToLab(hex) {
  const lin = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hexToRgb(hex).map(lin);
  // sRGB -> XYZ (D65), normalised by the D65 white point
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

const deg = (r) => (r * 180) / Math.PI;
const rad = (d) => (d * Math.PI) / 180;

export function chroma({ a, b }) {
  return Math.hypot(a, b);
}

export function hue({ a, b }) {
  const h = deg(Math.atan2(b, a));
  return h < 0 ? h + 360 : h;
}

export function deltaE2000(l1, l2) {
  const C1 = chroma(l1);
  const C2 = chroma(l2);
  const Cbar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
  const a1 = l1.a * (1 + G);
  const a2 = l2.a * (1 + G);
  const C1p = Math.hypot(a1, l1.b);
  const C2p = Math.hypot(a2, l2.b);
  const h1p = C1p === 0 ? 0 : (deg(Math.atan2(l1.b, a1)) + 360) % 360;
  const h2p = C2p === 0 ? 0 : (deg(Math.atan2(l2.b, a2)) + 360) % 360;
  const dLp = l2.L - l1.L;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp / 2));
  const Lbarp = (l1.L + l2.L) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbarp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hbarp /= 2;
    else hbarp = h1p + h2p < 360 ? (hbarp + 360) / 2 : (hbarp - 360) / 2;
  }
  const T =
    1 -
    0.17 * Math.cos(rad(hbarp - 30)) +
    0.24 * Math.cos(rad(2 * hbarp)) +
    0.32 * Math.cos(rad(3 * hbarp + 6)) -
    0.2 * Math.cos(rad(4 * hbarp - 63));
  const dTheta = 30 * Math.exp(-(((hbarp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cbarp ** 7 / (Cbarp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lbarp - 50) ** 2) / Math.sqrt(20 + (Lbarp - 50) ** 2);
  const Sc = 1 + 0.045 * Cbarp;
  const Sh = 1 + 0.015 * Cbarp * T;
  const Rt = -Math.sin(rad(2 * dTheta)) * Rc;
  return Math.sqrt(
    (dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh)
  );
}

// Individual Typology Angle (Chardon et al.), the standard colorimetric skin depth scale.
export function ita(lab) {
  return deg(Math.atan2(lab.L - 50, lab.b));
}

export function depthOf(itaDeg) {
  if (itaDeg > 55) return 'very light';
  if (itaDeg > 41) return 'light';
  if (itaDeg > 28) return 'medium';
  if (itaDeg > 10) return 'tan';
  if (itaDeg > -30) return 'brown';
  return 'deep';
}

// Undertone from the skin's hue angle: more yellow (higher hue) reads warm, more red reads cool.
// A heuristic on one colour sample, so the UI calls it "leans warm/cool", not a diagnosis.
export function undertoneOf(lab) {
  const h = hue(lab);
  if (h >= 62) return 'warm';
  if (h <= 52) return 'cool';
  return 'neutral';
}

export function describeSkin(skinHex) {
  const lab = hexToLab(skinHex);
  const angle = ita(lab);
  return { hex: skinHex, lab, ita: angle, depth: depthOf(angle), undertone: undertoneOf(lab) };
}

export function describeHijab(hijabHex, skin) {
  const lab = hexToLab(hijabHex);
  const c = chroma(lab);
  let family = 'colour';
  // Navy, charcoal and black all frame the face as "dark", whatever their slight tint.
  if (lab.L < 25 && c < 30) family = 'dark';
  else if (c < 10) family = lab.L > 75 ? 'white' : 'neutral';
  // Only beige and nude fabrics can blur into the skin; a tinted fabric reads as a colour.
  const nearSkin = family !== 'colour' && family !== 'dark' && deltaE2000(lab, skin.lab) < 15;
  return { hex: hijabHex, lab, chroma: c, hue: hue(lab), family, nearSkin };
}

const hueGap = (h1, h2) => {
  const d = Math.abs(h1 - h2) % 360;
  return d > 180 ? 360 - d : d;
};

export function closeness(dE) {
  if (dE < 2) return 'practically invisible';
  if (dE < 4) return 'very close';
  if (dE < 6) return 'close';
  return 'noticeable';
}

const halalOk = (product, halalOnly) => !halalOnly || product.halal === 'labelled';

// needs (optional) comes from skinNeeds(): finish and coverage from YouCam AI Skin Analysis.
export function rankFoundation(products, skin, { halalOnly = true, needs = null } = {}) {
  const rows = [];
  for (const product of products) {
    if (product.category !== 'face' || !halalOk(product, halalOnly)) continue;
    for (const shade of product.shades) {
      const lab = hexToLab(shade.hex);
      const dE = deltaE2000(skin.lab, lab);
      const tone = undertoneOf(lab);
      const toneMismatch =
        (skin.undertone === 'warm' && tone === 'cool') || (skin.undertone === 'cool' && tone === 'warm');
      const fit = fitPenalty(product, needs);
      const score = dE + (toneMismatch ? 2 : 0) + fit.penalty;
      const reasons = [`ΔE ${dE.toFixed(1)} from your measured skin tone: ${closeness(dE)}`];
      reasons.push(
        toneMismatch
          ? `Shade leans ${tone}, your skin leans ${skin.undertone}`
          : `Undertone fits (${tone} shade, ${skin.undertone} skin)`
      );
      if (fit.reason) reasons.push(fit.reason);
      rows.push({ product, shade, dE, score, reasons });
    }
  }
  return rows.sort((x, y) => x.score - y.score);
}

// Lip ranking: contrast with skin, undertone harmony, closeness to natural lip colour,
// and how the shade sits next to the hijab, which frames the face like a picture mount.
export function rankLips(products, skin, { lipHex, hijab, halalOnly = true } = {}) {
  const natural = lipHex ? hexToLab(lipHex) : null;
  const rows = [];
  for (const product of products) {
    if (product.category !== 'lips' || !halalOk(product, halalOnly)) continue;
    for (const shade of product.shades) {
      const lab = hexToLab(shade.hex);
      const h = hue(lab);
      const c = chroma(lab);
      let score = 0;
      const reasons = [];

      const contrast = skin.lab.L - lab.L;
      if (contrast < 8) {
        score -= 3;
        reasons.push('Too close to your skin depth, it would fade out');
      } else if (contrast > 45) {
        score -= 1;
        reasons.push('Very dark against your skin, a bold choice');
      } else {
        score += 2;
        reasons.push('Good depth contrast with your skin');
      }

      // Rose hues (8-22 degrees) sit between the warm and cool families.
      const warmHue = h >= 22 && h <= 50;
      const coolHue = h < 8 || h > 340;
      if (skin.undertone === 'warm' && warmHue) {
        score += 1.5;
        reasons.push('Warm coral/brick family suits your warm undertone');
      } else if (skin.undertone === 'cool' && coolHue) {
        score += 1.5;
        reasons.push('Berry/blue-red family suits your cool undertone');
      } else if (skin.undertone === 'neutral') {
        score += 1;
        reasons.push('Neutral undertone carries warm and cool shades');
      } else if ((skin.undertone === 'warm' && coolHue) || (skin.undertone === 'cool' && warmHue)) {
        score -= 1;
        reasons.push(`Leans ${coolHue ? 'cool' : 'warm'}, against your ${skin.undertone} undertone`);
      }

      if (natural) {
        const dLip = deltaE2000(natural, lab);
        if (dLip < 14) {
          score += 1;
          reasons.push('Close to your natural lip colour, an easy everyday shade');
        }
        score -= dLip / 200; // tie-breaker: nearer the natural lip ranks first
      }

      // Hijab reasons go first: they are what makes this matcher different.
      const hijabReasons = [];
      if (hijab) {
        if (hijab.family === 'dark') {
          if (c > 45 && lab.L < 45) {
            score += 2;
            hijabReasons.push('Deep, saturated shade that holds its own next to a dark hijab');
          } else if (c < 35) {
            score -= 1.5;
            hijabReasons.push('A dark hijab makes a muted shade look flat');
          }
        } else if (hijab.family === 'white' || hijab.nearSkin) {
          if (contrast < 18 && c < 35) {
            score -= 2;
            hijabReasons.push('With a pale or skin-tone hijab, a soft nude washes the face out');
          } else if (c > 40 && lab.L >= 45) {
            score += 2;
            hijabReasons.push('Bright, mid-depth colour gives definition against a pale hijab');
          }
        } else if (hijab.family === 'colour' && c > 25) {
          const gap = hueGap(h, hijab.hue);
          if (gap < 15) {
            score += 2;
            hijabReasons.push('Same colour family as your hijab, a coordinated look');
          } else if (gap > 140 && hijab.chroma > 20) {
            score -= 1.5;
            hijabReasons.push('Clashes with the colour of your hijab');
          }
        }
      }
      rows.push({ product, shade, score, reasons: [...hijabReasons, ...reasons] });
    }
  }
  return rows.sort((x, y) => y.score - x.score);
}
