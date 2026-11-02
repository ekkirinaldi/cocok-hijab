**Live demo:** https://cocok-hijab.vercel.app (phone-frame view: /phone.html) · **Code:** https://github.com/ekkirinaldi/cocok-hijab

## Inspiration: why Indonesia, why hijab

**Indonesia is the market for this problem.**
- 87.08% of Indonesians are Muslim, about 246 million people [1].
- Muslims worldwide spent US$347 billion on modest fashion and US$92 billion on halal cosmetics in 2024. The 2029 projections are US$444 billion and US$124 billion [2].
- In the 2025/26 Global Islamic Economy Indicator, Indonesia is the only country ranked first for Muslim fashion, and it ranks fourth for halal cosmetics [3].
- Beauty is already bought online: it is the largest FMCG e-commerce category in Indonesia, 52.1% of Rp128 trillion in sales from January to November 2025 [4].
- Since 17 October 2026, cosmetics sold in Indonesia must be halal certified (PP 42/2024) [5], so halal status is now part of every shade decision.

**One shade does not fit Indonesia.** Indonesia counts 1,340 ethnic groups (BPS Population Census 2010) [6]. Its own national skin-mapping study enrols adults across three Fitzpatrick phototypes, III to V [7]. So shade matching has to measure each shopper rather than assume one "Asian" range, which is why every match here starts from YouCam's colour reading of that face.

**And the try-on has to work with hair covered.** Virtual try-on and shade finders assume a face framed by hair. A hijab changes the answer:
- a black hijab frames the face like a dark picture mount and flattens muted lips;
- a cream hijab with a nude lip washes the face out;
- a coloured hijab makes some shades look coordinated and others clash.

Here the makeup and the hijab are one look, which is what the eCommerce VTO track asks for.

**What we proved with the real YouCam API** on four hijab styles (black jersey, dusty-rose pashmina, navy floral with an inner cap, cream satin):
- The AI Facial Color Tones Analyzer and AI Skin Analysis both worked with the hair fully covered, even though their photo guides ask for hair down and a visible forehead.
- `hair_color` is unusable under a hijab: it reported a black hijab as "Auburn" and a navy one as "Blonde". Cocok Hijab samples the hijab colour from the photo instead.
- AI Makeup Virtual Try-On keeps foundation inside the face oval. On dark hijabs the fabric changed by about 0.5 levels, against 10-16 on skin. On light hijabs draped under the chin, a very deep shade leaves a faint tint; we measured it and documented it.
- Lip colour never touched the fabric.

*Cocok* means "it suits you" in Indonesian.

## What it does

Cocok Hijab is a marketplace-style product page with 8 demo products (4 lip, 4 face, 40 shades):

1. **Choose a face:** one of four fictional, AI-generated sample shoppers wearing different hijabs, or your own selfie after an explicit consent tick.
2. **Analyse first:** the YouCam **AI Facial Color Tones Analyzer** measures skin, natural lip, eye and brow colour, shown as depth (ITA) and undertone scales. The hijab colour is sampled from the photo, and the shopper can correct it with an eyedropper. YouCam **AI Skin Analysis** scores 8 concerns, and tapping one overlays its mask on the face. The scores choose a base finish (matte, satin or dewy) and coverage.
3. **Get matches with reasons:** foundation shades ranked by CIEDE2000 distance from the measured skin tone ("ΔE 1.8, practically invisible"). Lip shades are scored on depth contrast, undertone, closeness to the natural lip, and harmony with the hijab ("Saturated enough to hold its own next to a dark hijab").
4. **Try on:** the YouCam **AI Makeup Virtual Try-On** renders a shade, or "Wear my match" renders foundation and lip together, with a before/after slider. Skin smoothing is forced to zero so shoppers judge the shade, not a beauty filter.
5. **Halal filter:** on by default. When the closest shade sits in a product without a halal label, the app says so instead of hiding it. All labels are demo data. In production they would come from the BPJPH halal registry.

## How we built it

- **YouCam API:** File API upload (once per photo, shared by all three tasks), `skin-tone-analysis` and `skin-analysis` run in parallel, and `makeup-vto` with `lip_color`, `foundation` and `skin_smooth` effects.
- **Mobile app:** mobile-first layout with a bottom tab bar (Analyse → Match & try on → Shop), a sticky buy bar and a web app manifest, so it installs to the home screen. Async tasks are polled from the browser through thin serverless endpoints.
- **Security:** the API key lives only on the server. The try-on endpoint accepts catalog shade IDs, never raw effect JSON, so it can't be abused as a generic proxy, and a per-IP limiter protects API units.
- **Colour science:** sRGB to CIELAB, Individual Typology Angle for depth, hue angle for undertone, CIEDE2000 for distance (unit-tested against Sharma et al.'s reference pairs).
- **Stack:** plain HTML/CSS/JS front end with no build step; Node serverless functions on Vercel; no runtime dependencies.
- **Reliability for judges:** the sample shoppers' results are real YouCam API output, saved by a script, so the demo responds instantly and keeps working after the hackathon's API units run out. Selfie upload uses the live API.

## Challenges

- **Does the API cope with covered hair?** YouCam's colour-analysis photo guide asks for hair down, which a hijab wearer can't do. We tested four hijab styles (black jersey, loose dusty-rose pashmina, navy floral with an inner cap, cream satin), and the analysis succeeded on all four at medium angle strictness.
- **A misleading field.** With the hair covered, `hair_color` still returns a value: "Auburn" for a black hijab, "Blonde" for a navy one, with the same hex across different photos. Using it as the hijab colour would have given wrong advice, so we sample the fabric from the photo and let the shopper correct it with an eyedropper.
- **Edges.** Foundation covers the face right up to the fabric, so we measured pixel change on hijab versus skin on all four hijabs. Dark hijabs are untouched (about 0.5 levels against 10-16 on skin). Light hijabs folded under the chin pick up a faint tint from very deep shades, because the foundation mask reaches just below the jaw. We document it with difference maps and a proposed fix.
- **Skin analysis under a hijab.** Its guide asks for a fully visible forehead. It still worked on all four samples, including an inner-cap hijab.
- **Calibration.** Real `skin_color` values from phone selfies are darker and less saturated than swatch colours, so our first shade catalog matched badly (ΔE00 around 5). We recalibrated shades into the measured colour space, and best matches are now ΔE00 0.8-1.3.

## Accomplishments

- A shade matcher that explains itself, with one sentence per reason, including how the hijab changes the advice.
- A halal filter that stays honest: closer unlabelled shades are disclosed, not silently removed.
- Real API output for every sample shopper and every shade: 165 try-on renders, plus colour and skin analysis for all four.

## What we learned

- With real tone data, all four shoppers leaned warm, so undertone-only advice gave everyone the same lipstick. The hijab turned out to be the variable that actually separates them: Merah Cabe for a black hijab, Mawar Tua for dusty rose, Fuchsia for navy, Senja for cream.
- Turning off the engine's default skin smoothing (`skin_smooth` at 0) matters for shopping: shoppers should judge the shade, not a beauty filter.
- Explaining each recommendation in one sentence builds more trust than a score.

## What's next

- Check halal status live against the BPJPH registry and show the certificate number.
- Run the hijab colour read through a segmentation model instead of a sampled point.
- Clip the foundation layer at the hijab edge, using the hijab colour we already know, to remove the faint tint deep shades leave on light fabric under the chin.
- Pair it with the YouCam scarf try-on, so shoppers can try a hijab colour and a lip shade as one look.
- Bahasa Indonesia and Bahasa Melayu UI.

## Sources

1. Ditjen Dukcapil, Ministry of Home Affairs, population by religion, first half of 2024, via Katadata Databoks: https://databoks.katadata.co.id/en/demographics/statistics/66b45dd8e5dd0/the-majority-of-indonesias-population-is-muslim-in-the-first-half-of-2024
2. DinarStandard, State of the Global Islamic Economy Report 2025/26: https://www.dinarstandard.com/insights/state-of-the-global-islamic-economy-report-2025-26
3. SGIE 2025/26 Global Islamic Economy Indicator rankings, as reported by Fortune Indonesia (3 June 2026): https://www.fortuneidn.com/sharia/posisi-indonesia-melorot-di-panggung-ekonomi-islam-dunia-00-4vfn9-7120xv
4. Compas.co.id, FMCG E-commerce Outlook Report 2026, as reported by Industry.co.id: https://www.industry.co.id/read/147736/tumbuh-27-pasar-fmcg-e-commerce-indonesia-2025-tembus-rp128-triliun
5. BPJPH (Halal Product Assurance Agency), cosmetics halal certification mandatory from October 2026: https://bpjph.halal.go.id/read/bpjph-produk-kosmetik-wajib-bersertifikat-halal-pada-oktober-2026
6. BPS Population Census 2010 (1,340 ethnic groups), as cited by Kontan: https://nasional.kontan.co.id/news/jokowi-sebut-714-suku-dan-1100-bahasa-daerah-di-indonesia-begini-faktanya
7. BSTI-Ina, "Mapping of Indonesians' Skin Type…", multicentre study, inclusion criterion Fitzpatrick III-V (ClinicalTrials.gov NCT05844904): https://clinicaltrials.gov/study/NCT05844904
8. Hijab test results, measurements and difference maps: https://github.com/ekkirinaldi/cocok-hijab/blob/main/docs/hijab-test.md
