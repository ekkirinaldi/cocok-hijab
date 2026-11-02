# Devpost submission text (draft)

Paste each section into the matching Devpost field. Items in [brackets] are Ekki's to fill in.

**Project name:** Cocok Hijab

**Tagline (max ~200 chars):** A mobile beauty app for hijab wearers: YouCam colour and skin analysis first, then halal-labelled shades matched to skin, lips and hijab, tried on your face.

**Track:** eCommerce VTO, or Skin AI. It uses both: AI Skin Analysis and AI Facial Color Tones Analyzer drive the matching, and AI Makeup VTO renders it.

## Inspiration

Virtual try-on and shade finders are tuned for faces framed by visible hair. Across Indonesia, Malaysia and Brunei, tens of millions of women shop for makeup wearing a hijab, and the hijab changes the answer. A black hijab frames the face like a dark picture mount and flattens muted lips. A cream or skin-tone hijab with a nude lip washes the face out. A coloured hijab makes some lip shades look coordinated and others clash. Cosmetics and fashion are one decision here, which is the point of the eCommerce VTO track.

A second shift is regulatory. Since 17 October 2026, cosmetics sold in Indonesia must be halal certified (PP 42/2024). Shoppers in the world's largest Muslim-majority market expect halal status to be part of the shade decision, not a separate search.

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
- Real API output for every sample shopper and every shade, [N] renders in total.

## What we learned

- With real tone data, all four shoppers leaned warm, so undertone-only advice gave everyone the same lipstick. The hijab turned out to be the variable that actually separates them: Merah Cabe for a black hijab, Mawar Tua for dusty rose, Fuchsia for navy, Senja for cream.
- Turning off the engine's default skin smoothing (`skin_smooth` at 0) matters for shopping: shoppers should judge the shade, not a beauty filter.
- Explaining each recommendation in one sentence builds more trust than a score.

## What's next

- Check halal status live against the BPJPH registry and show the certificate number.
- Run the hijab colour read through a segmentation model instead of a sampled point.
- Pair it with the YouCam scarf try-on, so shoppers can try a hijab colour and a lip shade as one look.
- Bahasa Indonesia and Bahasa Melayu UI.

## Built with

YouCam API (AI Makeup Virtual Try-On, AI Facial Color Tones Analyzer, File API), JavaScript, Node.js, Vercel, CIELAB / CIEDE2000

## Links

- Live demo: [deployment URL, after Ekki approves deploying]
- Code: [GitHub URL, public with MIT licence or private shared with contact_event@PerfectCorp.com]
- Video: [YouTube URL]

## Testing instructions for judges

Open the live demo and click any of the four sample shoppers, then any shade or recommendation. No login needed. To test with your own face, tick the consent box and upload a front-facing selfie.
