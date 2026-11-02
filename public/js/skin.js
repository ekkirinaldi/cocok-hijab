// Turns YouCam AI Skin Analysis scores into base-makeup needs. YouCam's raw_score runs
// 1-100 where higher means healthier skin, so a low score marks a concern.

// The 8 SD concerns that change which foundation finish and coverage suit someone.
export const SKIN_CONCERNS = ['oiliness', 'moisture', 'redness', 'pore', 'texture', 'acne', 'age_spot', 'radiance'];

// The API also returns an overall score ("all"), "skin_age" and a resized copy of the photo;
// only the 8 requested concerns and the overall score are kept.
export function parseSkin(output) {
  const concerns = output.filter((o) => SKIN_CONCERNS.includes(o.type) && o.raw_score != null);
  const all = output.find((o) => o.type === 'all');
  return {
    overall: all?.score != null ? Math.round(all.score) : null,
    scores: concerns.map((o) => ({ type: o.type, score: Math.round(o.raw_score), ui: o.ui_score })),
    masks: Object.fromEntries(concerns.filter((o) => o.mask_urls?.[0]).map((o) => [o.type, o.mask_urls[0]])),
  };
}

export const CONCERN_LABELS = {
  oiliness: 'Oil control',
  moisture: 'Hydration',
  redness: 'Evenness (redness)',
  pore: 'Pores',
  texture: 'Texture',
  acne: 'Clarity (blemishes)',
  age_spot: 'Spots & pigmentation',
  radiance: 'Radiance',
};

export function level(score) {
  if (score >= 70) return 'good';
  if (score >= 55) return 'fair';
  return 'concern';
}

// needs.finish: 'matte' | 'satin' | 'dewy'; needs.coverage: 'light' | 'medium' | 'full'
export function skinNeeds(scores) {
  const s = Object.fromEntries(scores.map((x) => [x.type, x.score]));
  const reasons = [];
  let finish = 'satin';
  if (s.oiliness != null && s.oiliness < 55 && !(s.moisture < 55)) {
    finish = 'matte';
    reasons.push(`Oil control scored ${s.oiliness}: a matte finish lasts longer under a hijab in humid weather`);
  } else if (s.moisture != null && s.moisture < 55) {
    finish = 'dewy';
    reasons.push(`Hydration scored ${s.moisture}: a dewy, glowy base avoids a dry, cakey look`);
  } else if (s.radiance != null && s.radiance < 55) {
    finish = 'dewy';
    reasons.push(`Radiance scored ${s.radiance}: a little glow lifts the complexion`);
  } else {
    reasons.push('Oil and hydration are balanced: a natural satin finish works');
  }

  const coverageDrivers = ['redness', 'acne', 'age_spot', 'pore'].filter((k) => s[k] != null && s[k] < 55);
  let coverage = 'light';
  if (coverageDrivers.length >= 2) coverage = 'full';
  else if (coverageDrivers.length === 1 || ['redness', 'acne', 'age_spot'].some((k) => s[k] < 65)) coverage = 'medium';
  reasons.push(
    coverageDrivers.length
      ? `${cap(coverageDrivers.map((k) => CONCERN_LABELS[k].toLowerCase()).join(' and '))} scored low: ${coverage} coverage evens it out`
      : `Skin is fairly even: ${coverage} coverage keeps it natural`
  );
  return { finish, coverage, reasons };
}

export function finishOf(product) {
  const g = product.finish.glowIntensity ?? 0;
  return g >= 45 ? 'dewy' : g <= 15 ? 'matte' : 'satin';
}

export function coverageOf(product) {
  const c = product.finish.coverageIntensity ?? 0;
  return c >= 70 ? 'full' : c >= 45 ? 'medium' : 'light';
}

const ORDER = { light: 0, medium: 1, full: 2, matte: 0, satin: 1, dewy: 2 };

// Extra ranking cost for a base product that doesn't suit the measured skin (0-2).
export function fitPenalty(product, needs) {
  if (!needs) return { penalty: 0, reason: null };
  const f = finishOf(product);
  const c = coverageOf(product);
  const penalty = Math.abs(ORDER[f] - ORDER[needs.finish]) * 0.6 + Math.abs(ORDER[c] - ORDER[needs.coverage]) * 0.4;
  const fits = f === needs.finish && c === needs.coverage;
  const reason = fits
    ? `${cap(f)} finish, ${c} coverage: what your skin analysis asks for`
    : `${cap(f)} finish, ${c} coverage (your skin suits ${needs.finish}, ${needs.coverage})`;
  return { penalty, reason };
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);
