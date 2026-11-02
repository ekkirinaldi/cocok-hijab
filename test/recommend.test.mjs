import test from 'node:test';
import assert from 'node:assert/strict';
import { products, effectFor, findShade } from '../public/js/catalog.js';
import {
  deltaE2000,
  hexToLab,
  describeSkin,
  describeHijab,
  rankFoundation,
  rankLips,
} from '../public/js/recommend.js';

test('CIEDE2000 matches Sharma et al. reference pairs', () => {
  const pairs = [
    [{ L: 50, a: 2.6772, b: -79.7751 }, { L: 50, a: 0, b: -82.7485 }, 2.0425],
    [{ L: 50, a: -1.3802, b: -84.2814 }, { L: 50, a: 0, b: -82.7485 }, 1.0],
    [{ L: 50, a: 2.5, b: 0 }, { L: 56, a: -27, b: -3 }, 31.903],
    [{ L: 60.2574, a: -34.0099, b: 36.2677 }, { L: 60.4626, a: -34.1751, b: 39.4387 }, 1.2644],
    [{ L: 22.7233, a: 20.0904, b: -46.694 }, { L: 23.0331, a: 14.973, b: -42.5619 }, 2.0373],
  ];
  for (const [a, b, want] of pairs) assert.ok(Math.abs(deltaE2000(a, b) - want) < 1e-3);
});

test('hexToLab of white and black', () => {
  const w = hexToLab('#ffffff');
  assert.ok(Math.abs(w.L - 100) < 0.05 && Math.abs(w.a) < 0.05 && Math.abs(w.b) < 0.05);
  assert.ok(Math.abs(hexToLab('#000000').L) < 0.01);
});

test('foundation ranking puts the nearest shade first and respects the halal filter', () => {
  const skin = describeSkin('#b6947a'); // skin_color YouCam returned for the "sari" sample

  const all = rankFoundation(products, skin, { halalOnly: false });
  const halal = rankFoundation(products, skin, { halalOnly: true });
  assert.ok(all[0].dE < 4);
  assert.ok(halal.every((r) => r.product.halal === 'labelled'));
  assert.ok(all.some((r) => r.product.halal === 'unlabelled'));
});

test('a pale hijab penalises nude lips, a dark hijab rewards saturated ones', () => {
  const skin = describeSkin('#d9ae86');
  const pale = describeHijab('#e8dccb', skin);
  const dark = describeHijab('#151515', skin);
  assert.equal(dark.family, 'dark');
  const score = (rows, id) => rows.find((r) => r.shade.id === id).score;
  const withPale = rankLips(products, skin, { hijab: pale });
  const withDark = rankLips(products, skin, { hijab: dark });
  assert.ok(score(withPale, 'nude-kayu') < score(withPale, 'merah-cabe'));
  assert.ok(score(withDark, 'merah-cabe') > score(rankLips(products, skin, {}), 'merah-cabe'));
});

test('every catalog shade builds a valid makeup-vto effect', () => {
  for (const p of products) {
    for (const s of p.shades) {
      assert.ok(findShade(p.id, s.id));
      const e = effectFor(p, s);
      assert.match(e.palettes[0].color, /^#[0-9A-F]{6}$/i);
      if (e.category === 'lip_color' && ['gloss', 'sheer', 'shimmer'].includes(e.palettes[0].texture)) {
        assert.ok(e.palettes[0].gloss != null && e.palettes[0].transparencyIntensity != null);
      }
    }
  }
  assert.ok(products.length >= 5 && products.length <= 10);
});

test('skin analysis scores steer foundation finish and coverage', async () => {
  const { skinNeeds, fitPenalty } = await import('../public/js/skin.js');
  const oily = skinNeeds([
    { type: 'oiliness', score: 40 },
    { type: 'moisture', score: 70 },
    { type: 'redness', score: 50 },
    { type: 'acne', score: 52 },
  ]);
  assert.equal(oily.finish, 'matte');
  assert.equal(oily.coverage, 'full');
  const dry = skinNeeds([{ type: 'oiliness', score: 80 }, { type: 'moisture', score: 45 }]);
  assert.equal(dry.finish, 'dewy');
  const matteFull = products.find((p) => p.id === 'teduh-cushion');
  const dewyLight = products.find((p) => p.id === 'selaras-tint');
  assert.ok(fitPenalty(matteFull, oily).penalty < fitPenalty(dewyLight, oily).penalty);
  const skin = describeSkin('#b6947a');
  assert.notEqual(rankFoundation(products, skin, { needs: oily })[0].product.id, 'selaras-tint');
});
