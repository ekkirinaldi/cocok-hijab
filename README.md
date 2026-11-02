# Cocok Hijab

**Colour and skin analysis for hijab wearers, then virtual try-on of halal-labelled lipstick and foundation, as a mobile-first shopping app.**

*Cocok* is Indonesian for "suits you" or "a match". Cocok Hijab is an e-commerce product page where a shopper picks a face (one of four sample shoppers or their own selfie), tries shades on with the **YouCam AI Makeup Virtual Try-On API**, and gets foundation and lip matches from the **YouCam AI Facial Color Tones Analyzer** and **AI Skin Analysis**, ranked for her skin colour, her skin condition, her natural lip colour and the colour of the hijab framing her face.

It works as an installable mobile web app: three steps in a bottom tab bar (**Analyse → Match & try on → Shop**), a sticky buy bar, and an "Add to Home Screen" manifest. `/phone.html` shows it inside a phone frame on a desktop screen.

**Live demo:** https://cocok-hijab.vercel.app · phone-frame view: https://cocok-hijab.vercel.app/phone.html

> Demo store: every brand, product, price and halal label in this app is sample data. No real product is described or claimed to be halal certified.

## Why Indonesia, why hijab

- **The market.**
  - 87.08% of Indonesians are Muslim, about 246 million people ([Dukcapil, H1 2024](https://databoks.katadata.co.id/en/demographics/statistics/66b45dd8e5dd0/the-majority-of-indonesias-population-is-muslim-in-the-first-half-of-2024)).
  - Worldwide, Muslims spent US$347 billion on modest fashion and US$92 billion on halal cosmetics in 2024 ([DinarStandard SGIE 2025/26](https://www.dinarstandard.com/insights/state-of-the-global-islamic-economy-report-2025-26)).
  - Indonesia is the only country ranked first for Muslim fashion in that report's indicator, and fourth for halal cosmetics ([Fortune Indonesia](https://www.fortuneidn.com/sharia/posisi-indonesia-melorot-di-panggung-ekonomi-islam-dunia-00-4vfn9-7120xv)).
  - Beauty is the largest FMCG e-commerce category in Indonesia: 52.1% of Rp128 trillion, January to November 2025 ([Compas, via Industry.co.id](https://www.industry.co.id/read/147736/tumbuh-27-pasar-fmcg-e-commerce-indonesia-2025-tembus-rp128-triliun)).
- **The rule.** Since 17 October 2026, cosmetics sold in Indonesia must be halal certified ([BPJPH](https://bpjph.halal.go.id/read/bpjph-produk-kosmetik-wajib-bersertifikat-halal-pada-oktober-2026)). In a real store the badge would come from the BPJPH registry; here it is demo data.
- **The faces.**
  - Indonesia counts 1,340 ethnic groups ([BPS Census 2010, via Kontan](https://nasional.kontan.co.id/news/jokowi-sebut-714-suku-dan-1100-bahasa-daerah-di-indonesia-begini-faktanya)).
  - Its national skin-mapping study enrols Fitzpatrick types III to V ([NCT05844904](https://clinicaltrials.gov/study/NCT05844904)).
  - So matches start from a measurement of each face, not one assumed shade range.
- **The hijab.** Try-on and shade finders assume visible hair, but the hijab changes how a shade reads:
  - a black or navy hijab frames the face like a dark picture mount, so muted lips look flat;
  - a cream or skin-tone hijab plus a nude lip washes the face out;
  - a coloured hijab makes some lip colours look coordinated and others clash.

## What it does

1. **Choose a face.** Four fictional, AI-generated sample shoppers wear different hijabs (black jersey, dusty-rose pashmina, navy floral, cream satin). Or upload a selfie after an explicit consent tick.
2. **Analyse (step 1, up front).**
   - *Colour:* `skin-tone-analysis` returns skin, natural lip, eye and eyebrow colours. The app shows depth on an ITA scale and undertone on a hue scale. The hijab colour comes from the crown of the photo, and the shopper can re-pick it with an eyedropper. Hair is marked "covered, not used".
   - *Skin:* `skin-analysis` scores 8 concerns (oil control, hydration, redness, pores, texture, blemishes, spots, radiance) plus an overall score. Tapping a concern overlays YouCam's mask on the photo to show where it was found.
   - *What it means:* the scores choose a base finish (matte, satin or dewy) and a coverage level (light, medium or full), with one-sentence reasons.
3. **Match.** Skin colour goes to CIELAB. Depth uses the Individual Typology Angle and undertone uses the hue angle. Foundation shades are ranked by CIEDE2000 distance, then by how well the product's finish and coverage fit the skin analysis. Lip shades are scored on depth contrast, undertone family, closeness to the natural lip, and harmony with the hijab. Every match shows its reasons.
4. **Try on.** `makeup-vto` renders a single shade, or "Wear my match" renders foundation plus lip in one call. Skin smoothing is switched off so the shopper judges the shade, not a beauty filter. A before/after slider compares the two.
5. **Halal filter.** On by default. When the closest shade overall sits in a product without a halal label, the app says so instead of silently dropping it.

## YouCam APIs used

| API | Endpoint | Used for |
|---|---|---|
| File API | `POST /s2s/v2.0/file` + signed `PUT` | uploading the selfie once, shared by both tasks |
| AI Facial Color Tones Analyzer | `POST/GET /s2s/v2.0/task/skin-tone-analysis` | skin, lip, eye and brow colours that drive shade matching |
| AI Skin Analysis (SD, 8 concerns) | `POST/GET /s2s/v2.0/task/skin-analysis` | scores and masks that choose finish and coverage |
| AI Makeup Virtual Try-On | `POST/GET /s2s/v2.0/task/makeup-vto` | `lip_color`, `foundation` and `skin_smooth` effects |

The API key stays on the server (`api/_youcam.mjs`). The browser never sees it, and the try-on endpoint only accepts shade IDs from the catalog, never raw effects, so the key can't be used as a general proxy. A per-IP limiter protects the demo's API units.

## Hijab framing test

We ran the real API over four hijab styles. Full results are in [docs/hijab-test.md](docs/hijab-test.md):

- **Tone analysis works with a hijab on.** It succeeded on all four photos at `face_angle_strictness_level: "medium"`, even though the photo guide asks for hair down.
- **`hair_color` is meaningless under a hijab.** A black hijab came back "Auburn" and a navy one "Blonde", so the app samples the hijab colour from the photo instead.
- **Skin analysis also works under a hijab**, even though its guide asks for a fully visible forehead.
- **Foundation stays on the face with dark hijabs.** Black and navy fabric changed by about 0.5 levels, against 10-16 on skin. **Light hijabs draped under the chin pick up a faint tint from deep shades**, because the foundation mask reaches just below the jaw. That's documented as a limitation, with a proposed fix.

The sample-shopper results in `public/cached/` are genuine API output, saved by `scripts/prerender.mjs`, so the demo stays fast and keeps working after the hackathon's API units run out.

## Run it

Requires Node 20 or later. No dependencies to install.

```bash
cp .env.example .env          # then put your key in YOUCAM_API_KEY
npm start                     # http://localhost:3000
npm test                      # colour maths and catalog checks
npm run prerender             # re-render the sample shoppers with the real API (uses units)
python3 scripts/compress_cached.py   # re-encode saved renders as JPEG (needs Pillow)
```

Without a key, the sample shoppers still work from `public/cached/`, and selfie upload is switched off.

Deploy to Vercel: `api/*.mjs` are serverless functions, `public/` is static, and `YOUCAM_API_KEY` goes in the project's environment variables.

## Project layout

```
api/            serverless handlers (upload, tone, skin, tryon, health) + YouCam client
public/         storefront page, catalog, matcher, sample shoppers, cached renders
scripts/        prerender.mjs: real API run over the sample shoppers; hijab_edge_check.py: bleed measurement
test/           node:test unit tests (CIEDE2000 reference pairs, ranking rules)
docs/           hijab test results, submission text, demo video script
```

## Images and data

- The four sample shoppers are fictional people generated with an AI image model for this project. No real person is shown.
- Product packshots are drawn in SVG from each shade's colour.
- Shade names use everyday Indonesian colour words (Sawo Matang, Kuning Langsat, Merah Cabe).

## Licence

MIT, see [LICENSE](LICENSE).
