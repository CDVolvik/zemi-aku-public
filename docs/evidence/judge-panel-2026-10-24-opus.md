# Zemi-Aku — blind evaluation (Opus)

Tested 2026-10-24, 07:14–07:22 UTC, against https://zemi.r21digital.com. I worked only from the public site, the public repo metadata, and network and console output in the browser. I did not read any project code or docs.

## Browser used

Playwright MCP (Chromium, headless) at a 948×948 desktop viewport, then resized to 390×844 for the phone pass. I used `curl` only for timing and repo metadata. I did not touch the microphone or the voice agent. I never found a standalone speech-playback button, so I didn't press one. The network log does show `POST /api/speak` firing automatically after answers (see Defects).

Load and response times as measured:
- `/`, `/app` and `/compare` HTML: TTFB 0.07–0.10 s. `/app` DOMContentLoaded at 209 ms. Satellite tiles fill in over several seconds, and on the phone pass the map first showed no imagery at all.
- Clicking an industry colored the choropleth within about 3–4 s.
- Evidence lines reported live-model answers at 1.4 s, 3.0 s, 4.0 s and 4.7 s. The templated business-research answers come back faster.
- Console errors: only favicon 404s from `icons.duckduckgo.com` (facciolapr.com, antoninosusa.com, dinghydockrestaurant.shop, onrdersonline.wixsite.com). No JS exceptions.

Question count: the scripted Bad Bunny question, one "Ask again without Qloo" re-run, and 6 of my own. That's 8 typed or re-run questions. The two industry and town clicks also triggered `/api/chat`, which brings the total to 10–11 backend answers.

## Persona A walkthrough (PR bakery owner, Spanish first)

**Landing page (`/`).** English only. I found no language switch on the front page. The headline was "Where should you open in Puerto Rico?", and the page is dense with API field names (`/v2/insights`, `admin2_region`, JSON of a Qloo record). For this persona that page is a wall. The "Find a town to open in →" CTA is what she needs.

**`/app` logged out.** I saw "Where should I open a business in Puerto Rico?" with six industry chips and three artist chips. The UI was English at first because my browser locale is en-US. After I typed in Spanish, the whole UI switched to Spanish and stayed Spanish across reloads: "¿Dónde abro un negocio en Puerto Rico?", "Escoja una industria", "Panaderías", "Salones de belleza". The "Ver un recorrido" tour buttons stayed English ("Where Bad Bunny's fans eat", "Vico C, into real places").

**Bakeries.** I saw the legend "Gap: strong taste, few businesses / Competitive / Quiet / Crowded / Not enough data" and the caveat "Taste compared with existing businesses. Not a measure of demand, revenue or profit." The sources are listed right there: County Business Patterns 2023, "Qloo heatmap affinity for bakery, averaged over the town's map cells, retrieved 2026-10-11", and PRCS 2020–2024. The shortlist "Strongest taste with few businesses" read: Río Grande #2, Luquillo #3, Fajardo #4, San Juan #5, Loíza #6, Rincón #7, Guaynabo #9, Carolina #11 ("of 76"). The desktop side panel covers the western third of the island.

**San Juan.** The answer card read: *"San Juan is a gap for bakeries: strong taste, rank 5 of 76, and few businesses, 16 establishments or about 5 per hundred thousand residents against 8 island-wide. Qloo lists 37 and other map data 64. A lead, not proof: visit and check rents before you sign."* Below it were 37 bakery cards with ★ rating, today's hours, Directions and Ask more.

As a bakery owner I'd be confused here. The card says "few businesses" and then lists 37 bakeries, with a sentence admitting 64 in Overture. The unit also changes from "0.5 per 10,000" in the list to "5 per hundred thousand" in the answer. Each card shows a distance ("4.8 km"), but nothing says what it's measured from.

**Sources.** The panel "Sources and the record behind this answer" lists: "Sources: Qloo's saved catalog… Observed supply: Overture release 2026-09-23.1. Dataset coverage, not a verified competitor census. Demographics: Census PRCS 2020–2024." There's a "Copy brief" button. On desktop, the ask dock covers the bottom summary row (Defect 3).

**Spanish, off-script.**
- *"Quiero abrir una panadería pequeña con poco dinero. ¿En qué pueblo me conviene y por qué?"* The response was **"Zemi-Aku cubre solo los 78 pueblos de Puerto Rico, y Por no está en este mapa. Dígame un pueblo de aquí y lo busco."** It read "por qué" as a town called "Por". The raw response was `{"kind":"outside", ...}`, so a pre-router rejected the question before any model or Qloo call. This is the most natural question this persona would ask, and it failed (Defect 1).
- *"¿Me conviene abrir una panadería en Caguas?"* This worked, in Spanish: "Caguas es una brecha para panaderías: mucha afinidad, puesto 14 de 76, y pocos negocios, 9 establecimientos o unos 7 por cada cien mil residentes frente a 8 en la isla. Qloo registra 17 y otros datos del mapa 28. Pista, no prueba: visite y revise rentas antes de firmar." The Evidence label was honest: **"Evidencia · investigación de negocio · sin turno del modelo · 4 fuentes"**, so it's templated, not LLM. Some strings stayed English in Spanish mode: badges "Food", "Today 5:00 am–10:00 pm", "Site icon", "About this town", "Sources and the record behind this answer". "Pista, no prueba" reads translated; a Puerto Rican owner would say something closer to "es una señal, no una garantía".
- *Small town: "¿Dónde puedo comer algo típico en Las Marías?"* Good answer: "En Las Marías no hay coincidencia estricta para 'comida típica criolla' en Qloo, pero sí lugares que sirven comida puertorriqueña. La Casona de Artemio… hoy aparece cerrado. Delicias Marieñas… Confirme horarios por teléfono antes de subir." The evidence showed `find_places … → Qloo · 0 lugares` and `town_catalog Las Marías, food → 6 lugares`. "Rey Liquor Store" is filed under Food.
- *"¿Y una panadería en Culebra?"* It admitted thin data: "Culebra cae en el grupo sin datos suficientes del mapa: el Censo no publica conteo… serían de 0 a 2 negocios, contra una mediana isleña de 1.3 por cada diez mil residentes." Then it asserted something without a source: "la demanda de una panadería nueva depende del turismo, no de residentes… Ese es el panorama real de Culebra." No tool returned tourism data. The cards that came back were Dinghy Dock, Zaco's Tacos, Mamacita's and Heather's Pizza; only Pan Café is a bakery.

**Phone, 390 px.** No horizontal overflow, the chips wrap cleanly, and the Spanish UI persisted. After I tapped San Juan, the research sheet plus the answer card covered essentially the whole map (the "god's-eye map" is not visible). The sheet also overlaps the "Zemi-Aku" title and the layers button. The input placeholder is cut to "Pregunte por un pue…" / "Pregunte por San Ju…".

## Persona B walkthrough (judge, 10 minutes)

**Is the agent real?** Partly. Answers about artists and places go through a live model. The Evidence line read "Evidence · live model · 1 tool call · 1.4 s / artist_places San Juan, Bad Bunny, food → Qloo · 5 places · 0.4 s / Model deepseek/deepseek-v4.1-flash via OpenRouter · 2 rounds · answered 2026-10-24 07:16 UTC / Qloo IDs: FFE3…12E5, …". Answers about where to open a business go through a deterministic template, and the Evidence label says so ("sin turno del modelo"). That honesty is good. It also means the headline use case ("where should I open") is not agentic: the LLM is not doing the reasoning there. When the business question was phrased loosely ("How much money will a bakery in Ponce make…"), it did go to the live model, which called `opportunity_map` and `town_catalog`.

**Does Qloo change the answer?**
- Bad Bunny / San Juan with Qloo: *"Bad Bunny fans lean toward La Placita de Santurce… La Victoria on Calle Loíza… El Techo, a rooftop… These are affinity matches from Qloo, not Bad Bunny's own spots."* The cards show "Why it fits you: Strong match for Bad Bunny fans (88%)".
- "Ask again without Qloo" on the same question: *"The tool that matches an artist's fans to food spots returns nothing right now, so I don't have verified places to name. I won't invent restaurants… Santurce and Río Piedras carry the island's densest casual eating scene, per general knowledge, not a catalog."* Its evidence shows only `map_town San Juan → done`.

So yes, Qloo changes the answer. But the control mainly proves "no catalog → no names", which is close to tautological. It doesn't show that Qloo's *taste* signal beats a plain place list. The without-Qloo model also says "returns nothing right now", which frames the control as a tool failure rather than a different model configuration. And it does answer from general knowledge, which contradicts the landing claim "The agent never answers from memory." It does label that as general knowledge.

**`/compare`.** Six pairs from a saved run dated 2026-10-14 17:11 UTC, with the model, settings and tool list disclosed. Strengths: each pair ends with a "Qloo changed:" line, and the page admits weak spots. For example, "¿Dónde comer mofongo en Ponce?" with Qloo says "no aparece un lugar con etiqueta estricta de mofongo" (`find_places … → 0 places`). The Calle 13 run shows four `qloo_recommend … → 0 places` calls before `artist_places` returned 8. Weaknesses: the page is static, not live, though the in-app button is live. The "Qloo changed" line only lists place names, not whether the answer got better. Also, Calle 13 → "Which town should I visit" was answered with San Juan without actually comparing towns, because the per-town recommend calls all returned 0.

**Anything faked?** I found nothing fabricated. Qloo IDs, per-call counts and timestamps are shown, and evidence matched the cards. These looked inconsistent or hard-coded:
- The landing hero hard-codes "Qloo infers Bad Bunny fan taste → top towns Bayamón, San Juan, Carolina" with fixed sample spots.
- The same venue shows different hours in two views a minute apart. La Placita de Santurce was "Today 5:00 pm–3:00 am" in the Restaurants list and "Today 5:00 pm–12:00 am" in the Bad Bunny answer.
- The island baseline shifts between answers: "8 island-wide" (per 100k) for San Juan and Caguas, "0.76 island-wide" (per 10k) for Ponce, and "una mediana isleña de 1.3 por cada diez mil" for Culebra. The quadrant split uses the median (legend: "Groups split at the island median"), but most answers quote the aggregate. So Ponce comes out as *"a bakery gap: taste rank 36 of 76, 15 establishments, 1.13 per 10,000 residents against 0.76 island-wide"*. That is "few businesses" while being 49% above the number shown beside it, with a taste rank barely above the middle.
- The landing says "all 78 towns", but the rankings say "of 76".

**Where the app admits limits.** It does this often, and that's a real strength:
- "Not a measure of demand, revenue or profit"
- "Places recorded by Qloo, not confirmed businesses for sale"
- "A lead, not proof: visit and check rents before you sign"
- "Census does not publish counts below 3, so a town without a published count has 0–2"
- "These are affinity matches from Qloo, not Bad Bunny's own spots"
- Revenue: "No tool here returns revenue, so I won't invent a number… The honest figure for monthly earnings simply does not exist in my data."
- The landing page's LIMITS section, including "Hours and contact lines can be stale in Qloo's feed".

**Context handling.** In Las Marías I asked the ambiguous "which one is better". It resolved to the three places it had just named: "La Casona de Artemio is the best of the three: … the top rating at 4.7… but is closed today. Delicias Marieñas… is your better bet… right now". It answered sensibly. It didn't ask what "better" meant, and it switched back to English to match the question, even though the UI was in Spanish.

## Defects

| # | Sev | Defect | Steps to reproduce |
|---|---|---|---|
| 1 | **High** | A natural Spanish question is rejected because "por qué" is parsed as a town called "Por". The server returns `{"kind":"outside"}` with "…y Por no está en este mapa." | `/app` → type "Quiero abrir una panadería pequeña con poco dinero. ¿En qué pueblo me conviene y por qué?" → Enter. |
| 2 | **Med** | "Gap / few businesses" is justified with an island figure that isn't the threshold actually used, so some answers contradict themselves (Ponce: 1.13 per 10k "against 0.76 island-wide" is called few; Culebra quotes a 1.3 median; San Juan and Caguas quote 8 per 100k). | Ask "How much money will a bakery in Ponce make per month? Just give me a number." Then ask "¿Y una panadería en Culebra?" and compare the baselines. |
| 3 | Med | On desktop the floating answer card covers the research panel's text (the "Gap: strong taste, few…" line is hidden), and the ask dock covers the "Sources and the record behind this answer" row. A Playwright click on that row failed with "dockbar … intercepts pointer events". | 948×948 → Bakeries → San Juan → scroll the left panel to the bottom → try to click "Sources and the record behind this answer". |
| 4 | Med | Phone (390 px): after opening a town, the sheet and the answer card hide the whole map, and the sheet overlaps the title and layers button. | Resize to 390×844 → Panaderías → San Juan. |
| 5 | Med | "Few businesses" next to a visible list of 37 Qloo bakeries and 64 in Overture (San Juan: CBP says 16). The source conflict is mentioned in the answer but not explained for a non-technical user. | Bakeries → San Juan, then read the answer and count the cards. |
| 6 | Low | The same venue shows different "today" hours in two views (La Placita de Santurce: 5 pm–3 am vs 5 pm–12 am). | Restaurants → San Juan, then ask "Where do Bad Bunny fans eat in San Juan?" |
| 7 | Low | Spanish mode leaves English strings: "Food", "Today …", "Closed today", "Site icon", "About this town", "Sources and the record behind this answer", and the tour buttons. "Census" isn't translated to "Censo" in the UI copy. | Ask any Spanish question and look at the cards. |
| 8 | Low | The alt text "Site icon" renders as visible text under card titles. Wrong logos appear: Barrachina shows a WordPress logo, and La Placita de Santurce shows a blank white tile. | Restaurants → San Juan → look at the top three cards. |
| 9 | Low | Bakery questions return non-bakery cards (Ponce: Chili's, McDonald's, New York Buffet; Culebra: Dinghy Dock, Zaco's Tacos). "Rey Liquor Store" is tagged Food. Cafetería ABEL is listed as a bakery. | Ask the Ponce revenue question or the Culebra bakery question. |
| 10 | Low | Card distances ("4.8 km") don't say what they're measured from. | Any card list. |
| 11 | Low | Model inference is stated as fact: Culebra's "la demanda… depende del turismo… Ese es el panorama real" has no tool backing it. | "¿Y una panadería en Culebra?" |
| 12 | Low | `POST /api/speak` fires after answers without the user pressing anything, which is extra TTS cost per answer. Headless, I didn't confirm whether audio is audible. Favicon 404s fill the console. | Network tab while asking any question. |
| 13 | Low | "Taste #N of 76" vs "all 78 towns" is never explained. The landing page has no Spanish version, so the target user's first screen is English and technical. | Compare the Bakeries list with the landing page. |

## Scores

1. **Intelligent use of LLMs + Qloo: 4/5.** The evidence trail shows real Qloo calls with IDs, counts and timings (`artist_places … → Qloo · 5 places · 0.4 s`), there's a live without-Qloo control, and failed calls are disclosed. It's not a 5 because the flagship "where to open" answer is a template with no model turn, Qloo's role there is one averaged heatmap number, and the control mostly proves "no catalog, no names".
2. **Technical implementation and execution: 3/5.** The build is broad and works: Cesium 3D map, choropleth, bilingual UI with auto-switch, evidence panels, cached catalogs, answers in 1–5 s with no JS errors. It loses points on execution: the target persona's first natural Spanish question failed outright, overlays block content on desktop and phone, the baselines shown are inconsistent, and the same venue's hours differ between views.
3. **Originality and creativity: 4/5.** Crossing Qloo taste heatmaps with Census CBP supply into a gap/competitive/quiet/crowded map of 78 municipalities is a fresh use of Qloo. So are the artist → place discovery and the in-product "Ask again without Qloo" button. The map-plus-chat format itself is familiar.
4. **Real-world application and impact: 3/5.** The problem is real and the honesty about limits is excellent ("A lead, not proof: visit and check rents before you sign"). But the core verdict calls San Juan "few businesses" next to 37 listed bakeries and calls Ponce a gap at 1.13 vs 0.76, and the Spanish-first owner hits a parse failure. That limits trust and use by the stated audience today.

## Top 3 changes that would raise the score, in order

1. **Fix the Spanish pre-router and test it on 20 natural Spanish small-business phrasings** ("¿por qué?", "¿dónde me conviene?", "con poco dinero", "cerca de mí"). When the town is unrecognized, fall through to the model instead of answering `outside`. This is the primary persona's first experience.
2. **Make the gap verdict self-consistent and plain-language.** Quote the same baseline the quadrant split uses (the median per 10,000), in one unit everywhere. Reconcile CBP 16 vs Qloo 37 vs Overture 64 in one sentence a baker understands (e.g. "El Censo cuenta 16 panaderías con empleados; Qloo ve 37 lugares que venden pan, incluidas cafeterías"). Drop or justify the "gap" label when the town's rate is above the comparison number shown.
3. **Put the LLM on the business path and make the control prove taste, not presence.** Let the model reason over the opportunity data (the template can stay as the fallback), and give `/compare` a pair where both runs have the place catalog but only one has Qloo affinity, so judges see that taste re-ranks the answer. Also fix the overlay layout (the answer card should never cover the Sources control or the whole phone map).

## What a rival entry would need to beat this

A rival would need the same level of provenance — per-claim source, Qloo IDs, honest "0 places" disclosures, a live with/without-Qloo switch — plus three things this entry lacks:
1. An agent that actually reasons over Qloo signals for the headline decision instead of templating it.
2. Numbers that stay internally consistent across views.
3. A first-run experience in the target user's language that survives ordinary phrasing.

A rival that only shows a chat over Qloo results, without evidence panels and explicit limits, would not beat this. Zemi-Aku's transparency is its strongest asset, and most of its weaknesses are fixable execution bugs.
