# Demo video script (target 2:30, hard limit 3:00)

Record the screen at 1440×900 or on a phone, with voice-over in English. No music, or royalty-free music only. Rules: no third-party trademarks, so don't show Shopee or Tokopedia. Upload to YouTube as Public or Unlisted-but-viewable (the rules say "publicly visible") and paste the link into Devpost.

| Time | On screen | Voice-over |
|---|---|---|
| 0:00-0:15 | Title card "Cocok Hijab", then the storefront | "Most virtual try-on assumes visible hair. Across Southeast Asia, tens of millions of women shop for makeup in a hijab, and the hijab changes how every shade looks. Cocok Hijab is a product page built for them." |
| 0:15-0:45 | On a phone (or `/phone.html`): Analyse tab, tap **Sari** (black hijab). Scroll the report: skin swatch, depth and undertone scales, eyes, brows, "Hair: covered, not used", then the 8 skin scores. Tap **Oil control** and the mask appears on her face. Show "Finish: matte" | "Step one is analysis. The YouCam AI Facial Color Tones Analyzer reads her skin, lips, eyes and brows, and it works with the hair covered. Its hair field doesn't: it called this black hijab 'Auburn', so we mark hair as covered and sample the hijab colour instead. YouCam AI Skin Analysis scores eight concerns, and we turn those scores into what her base should be: matte, medium coverage." |
| 0:45-1:05 | Tap **See my matches**. Scroll the match list. Point at the top lip, Merah Cabe, and its reason ("Deep, saturated shade that holds its own next to a dark hijab"), and at "ΔE 1.3" on the top foundation | "Foundation is matched in CIELAB with CIEDE2000, so 'ΔE 2' means practically invisible. Lips are scored on contrast, undertone and the hijab: a black hijab makes muted shades look flat, so bolder shades rise." |
| 1:00-1:25 | Click the top lip rec. The render appears; drag the before/after slider. Zoom on the jaw where it meets the hijab | "Every try-on is a YouCam AI Makeup Virtual Try-On render. We switch off skin smoothing so you judge the shade, not a filter. We measured the edge on four hijabs: on dark hijabs the fabric is untouched; on light hijabs draped under the chin, a very deep shade leaves a faint tint, and we document that." Cut to `docs/img/hijab-edge.png` for 3 seconds. |
| 1:25-1:45 | Click **Nisa** (cream hijab). The hijab chip reads "pale", the top lip becomes Senja ("Bright, mid-depth colour gives definition against a pale hijab"). Then click **Wear my match** | "Change the hijab and the advice changes. A cream hijab plus a soft nude washes the face out, so the pick moves to a brighter, mid-depth shade. Aisyah's dusty-rose pashmina gets a rose shade in the same family. 'Wear my match' renders foundation and lip together in one API call." |
| 1:45-2:05 | Back on **Sari**: toggle **Halal-labelled only** off and on. Show the yellow note naming the hidden closer shade (210 Light, Studio HD) | "Since 17 October 2026, cosmetics in Indonesia must be halal certified. The filter is on by default, and if a closer shade sits in an unlabelled product, we say so instead of hiding it. The labels here are demo data. A real store would check the BPJPH registry." |
| 2:05-2:25 | Tick consent, upload a selfie (Ekki's own photo or a consenting friend's), and show the live result | "Shoppers can use their own selfie. It goes to the YouCam API through our server, the key never reaches the browser, and we store nothing." |
| 2:25-2:40 | README architecture table, or end card | "Cocok Hijab: three YouCam APIs, one honest shade match for hijab wearers. Thanks for watching." |

## Shot checklist

- [ ] Browser zoom at 100%, light mode, no bookmarks bar
- [ ] Clear the cart counter before recording
- [ ] Use the live deployment URL, not localhost, so judges see the same thing
- [ ] Don't show the `.env` file or terminal with the key
- [ ] Selfie segment: only a photo of someone who agreed to appear publicly
