# Demo video: where should I open a business in Puerto Rico?

Target 2:45, English narration, recorded by Carlos in his own words. Use real Chrome on
the live application, https://zemi.r21digital.com, logged out. Record only working
features; keep credentials and account pages out of the recording. Live voice and iPhone
shots stay optional until fully verified.

Re-cut October 14, 2026 (plan item 8) around the decision journey that has been the first
screen since the October 13 night release, with the evidence drawer, the /compare control,
the five spoken languages and the instant samples that shipped October 14. Every shot below
runs on the live site today; the model agent is on with a daily budget, so re-check the
typed-question shot on the day (a "rules router" or "saved replay" evidence line must not be
narrated as the live model).

## Before recording

Run the [judge walkthrough](JUDGE-WALKTHROUGH.md) on the live URL, logged out. Warm the
opportunity map, the artist request and the town profile once. Qloo results can change:
narrate the actual records and numbers on screen. Hide notifications and select English.
Check `/api/voices` reports `speechEnabled:true` before the voice shot; past the daily cap
the device voice takes over and the menu says so.

Load the app fresh before the town-profile segment. A bare town name typed after business
research continues that research; it does not open the town profile.

| Time | Action | Narration draft |
|---|---|---|
| 0:00–0:12 | Landing on /app: the first screen asks "Where should I open a business in Puerto Rico?" with six industry chips | “Every entrepreneur in Puerto Rico asks the same first question: where? Zemi-Aku answers it with Qloo's taste data set against what the Census already counts, town by town.” |
| 0:12–0:35 | Tap Bakeries; let the island color; point at the legend | “Pick an industry and all 78 towns color at once. Qloo's taste for bakeries against the Census count of bakeries per ten thousand residents. Strong taste and few businesses is a gap. The legend and the sources stay on screen.” |
| 0:35–1:00 | Tap the first town in "Strongest taste with few businesses"; show the readout | “Tap a town and three sources answer side by side: Qloo's taste rank, the Census establishment count, and Overture's observed supply. Each one is labeled. This compares taste with supply; it does not promise demand or profit.” |
| 1:00–1:15 | In "Change the question", tap Restaurants; show the same town re-answer; then "Compare towns on the map" | “Change the question and the same town re-answers from the restaurant build. Go back to the island and pick another town.” |
| 1:15–1:40 | Type “What is there to do in Maricao?”; let the map fly and the caption land; open the folded Evidence line | “Ask anything. A model agent reads Qloo and the open data, answers in plain words and moves the map. Under every answer, the evidence: each tool it called, the source, the count and the time. Nothing on this map arrives without a record behind it.” |
| 1:40–2:00 | Scroll under the artists line; tap Bad Bunny; let pins load; open one card | “Music is the on-ramp underneath. Pick an artist and Qloo's cross-domain affinities lead to real places. An affinity is not a visit; the note says so on every card.” |
| 2:00–2:15 | Open /compare in a new tab; scroll one pair, read the "Qloo changed:" line | “And the control: six questions asked twice of the same model, the second time with every Qloo tool removed. Without Qloo it refuses to invent places. With Qloo, every answer changed.” |
| 2:15–2:30 | Back on /app, open the voice menu, pick Español, Female; type “¿Dónde abro una panadería?”; let the spoken caption play with the English caption on screen | “Answers are read aloud in English, Spanish, French, Italian and German. The spoken line is a short caption of the sourced answer on screen.” |
| 2:30–2:40 | Source notes; a real "not enough data" town or an empty result if encountered | “Coverage has limits. When a source has no result, the app says so instead of inventing a recommendation.” |
| 2:40–2:45 | Title, live demo and public repo links | “Zemi-Aku. Where to open, from what Puerto Rico already loves.” (tagline is Carlos's call; see NEXT-SESSION) |

Optional 10-second extension before the title: Ships and Ports from the map menu, pick a
received vessel, nearby port, Food. Only include it if a vessel is on screen at recording
time.

If the typed question comes back as "saved replay" (budget spent), the Maricao question is
one of the three instant samples and still shows the real map and evidence; narrate it as a
saved run of the same model, read at the time shown, not as a live turn.

## Claims to check against the take

- Opportunity map numbers come from the screen. On October 11 the bakery map listed Río
  Grande at taste #2, 3 establishments and 0.7 per 10,000 residents (island 0.8). Say
  “taste” and “businesses”, never “demand” or “profit”; the on-screen notes say the same.
  A town with no published Census count has 0–2 establishments, not zero.
- Artist counts come from the displayed Qloo response; don't promise a fixed ten places.
- 78 towns: app/data/municipios.geojson. The 7,717 Qloo places are the October 7 catalog
  snapshot in data/catalog-counts.json, not every operating business on the island.
- The evidence line names the model (DeepSeek V4.1 Flash via OpenRouter) and the tool
  count; read those from the screen rather than from memory.
- /compare: the six pairs are saved runs (data/compare-qloo.json), not live turns; say
  "asked twice of the same model" and read the verdict line as written.
- Voices: with the Deepgram key, Aura-2 voices (two per language, ten in all) read short
  captions; without it, the device voice reads them and the menu says so. Never present a
  device voice as Deepgram. Record on real Chrome; automation Chromium lists no Spanish voice.
- Use OSM buildings if a 3D shot is added. Google photoreal mode is off on the live site.
- Full microphone conversation, real iPhone installation and public MCP are separate
  verification items. Don't include them as confirmed features until those checks pass.
