# Zemi-Aku, blind evaluation, ninth round (Claude Opus 5.5)

Tested 2026-10-26, 03:51–04:04 UTC, logged out, from the public web only. Nine questions in total. I did not use the microphone or the voice agent, and I never pressed speech playback.

## Browser used

A real browser: Chromium driven by the Playwright MCP server, desktop viewport 1366×900, phone checks at 390×844. Logged out everywhere; the GitHub header showed "Sign in / Sign up". Every UI description below comes from a screenshot or the accessibility tree.

The browser profile still held site storage from an earlier session (`zemi-voice-lang: es`, `zemi-theme: night`), so /app first opened in Spanish. I cleared localStorage and reloaded, and the scripted run then started as a true first visit in English. To confirm which engine answered, I read the `/api/chat` JSON through in-browser network listeners. I opened no local project files.

Load times I observed:
- Landing page: TTFB 363 ms, DOM ready 476 ms, 55 KB HTML.
- /app: HTML ready in about 0.2 s. Satellite imagery and municipio outlines streamed in over the next 2–3 s; the session logged about 1,900 tile and terrain requests in ten minutes.
- Answers: rules-only answers took 0.27–1.1 s. The two live-model answers report 0.8 s and 1.1 s on their Evidence lines.
- Business card live Qloo calls: audience 1.7 s, footprint 2.4 s, culture 4.6 s.

Console errors were all 404s from third-party favicon lookups (`icons.duckduckgo.com/ip3/facciolapr.com.ico`, `elconvento.com.ico`, `nps.gov.ico`).

## Persona A walkthrough

*A Puerto Rico bakery owner, Spanish first, no technical background.*

**What I did.** Landing page, then /app (English first, as the script says): Bakeries, then San Juan, then Restaurants. After that I opened /app?lang=es through "El mapa en español", asked about a small town in Spanish, sent an ambiguous follow-up, asked her real island-wide question in Spanish, opened one business card, and checked the phone layout.

**What she sees, and how it reads to her.**

- **Landing page.** The hero reads "Where should you open in Puerto Rico?", then "Zemi-Aku scores Puerto Rico's towns by Qloo taste for your industry against the businesses the Census already counts there (76 to 78 of the 78, by industry), shows sources for every number…". It is clean and editorial, but "Qloo taste" means nothing to her.
- **/app in Spanish.** The first screen says "¿Dónde abro un negocio en Puerto Rico?" and "El gusto de Qloo pueblo por pueblo, frente a los negocios que el Census ya cuenta. Escoja una industria." The chips are "Cafeterías · Panaderías · Restaurantes · Barras · Hoteles · Salones de belleza".
  - "Barras" is natural Puerto Rican usage. "el Census" is not; she would say "el Censo".
  - Two of the three tours are labelled "(en inglés)".
- **Bakeries panel.** The island turns four colours. The legend reads "Gap: taste above the median, few businesses / Competitive / Quiet / Crowded / Not enough data", followed by five dense monospace paragraphs of sources ("Businesses: U.S. Census Bureau, County Business Patterns 2023. Excludes the self-employed and government. Census does not publish counts below 3…").
  - The list "Strongest taste with few businesses" reads "Río Grande taste #2 of 76 · 0.7 per 10,000 residents … San Juan taste #5 of 76 · 0.5 per 10,000 residents".
  - She can follow "few businesses". "taste #2 of 76" and "the median the groups split on" will lose her.
- **San Juan (bakeries).**
  - The answer bubble reads: "San Juan is a gap for bakeries: taste above the median, rank 5 of 76, and few businesses, 16 establishments with employees, fewer per resident than the median town. Qloo lists 37 and other map data 64. A lead, not proof: visit and check rents. See Panaderia y Reposteria America, El Horno de Pane and Double Cake, and check whether they are open when you go. Next, compare with Loíza, where the count is withheld, so the two cannot be ordered."
  - The panel's "Next three checks" is the most useful thing in the app for her. For example: "Ask rents on the main street and permits at the municipio before you sign."
  - The bubble's last sentence sends her to a town that "cannot be ordered". For a non-analyst that is a dead end.
- **Restaurants.** The same town re-answers: "San Juan is competitive for restaurants … 821 establishments with employees … Visit La Placita de Santurce, Barrachina and Marmalade, and check the prices." It also explains a mismatch she would have noticed: "Qloo lists this bar under restaurants, which is why it appears here."
- **Her small-town question:** "Quiero abrir una panadería en Las Marías. ¿Vale la pena?"
  - The answer is honest: "No hay datos suficientes para panaderías en Las Marías: sin cifra publicada, de 0 a 2 establecimientos, y sin datos de afinidad. Qloo registra uno y otros datos del mapa 3. Visite antes de decidir."
  - Step 3 is good advice: "Pida al municipio su propio conteo de negocios; el Census no publica el de aquí."
  - The panel leaks English and shows a template seam: "Qloo etiqueta el gusto del pueblo como Puerto Rican, Place, Hotel. de 0 a 2 establecimientos con empleados…"
  - "Qloo registra uno y otros datos del mapa 3" is hard to parse.
- **Ambiguous follow-up:** "¿Y cuál es mejor?" The answer: "Los turnos del modelo de hoy en esta conexión se usaron, así que ahora solo contesto preguntas fijas: un pueblo, un tipo de lugar en un pueblo, los fans de un artista en un pueblo, o dónde abrir un negocio. Esta no la adivino." She would not know what "turnos del modelo" means. For her, the conversation ended after five questions.
- **Her real question:** "¿En qué pueblo me conviene abrir una panadería?"
  - The island recolours, but the bubble only says "Aquí el gusto por panadería es fuerte y hay pocos negocios. Toque un pueblo para ver más."
  - No town is named, and the camera stayed on San Juan from before, so "Aquí" reads as San Juan.
  - The ask bar still said "Ask about San Juan..." in English inside the Spanish UI.
- **Business card (Campioni, Ponce), in Spanish.**
  - Qloo's description stays in English but is labelled "Qloo · en inglés".
  - "A sus fans también les gusta" lists "Música: Tony Dize, Tito El Bambino, Vico C" and "Viajes: San Juan, Fajardo, Santo Domingo", with the note "Conexiones del público en Qloo, no la música del lugar."
  - "A quién le gusta" shows bars labelled "cerca del promedio" and "sobre el promedio". This is the clearest screen in the app for her.
- **Phone at 390 px.** /app has no sideways overflow: map on top, bottom sheet below. The town list sits under about ten lines of monospace method text, and the search placeholder is clipped ("Pregunte por un pueblo o b").
- **Speech.** Answers are read aloud automatically: two `POST /api/speak` calls went out without a press. The voice menu offers Language, Voice and "Hear this voice" but no mute.

**Verdict for A.** She would leave with "San Juan or the east coast may be short of bakeries; go and check rents". The advice to go and check is sound, but she could not follow the reasoning behind it, and the Spanish experience gets worse as soon as she asks her own questions.

## Persona B walkthrough

*A judge with ten minutes, checking whether the agent is real, whether Qloo changes the answers, and whether anything is faked.*

**Engine log.** Times are UTC. The Evidence lines are quoted as they appeared on screen.

| # | Time | Question | Evidence line on screen | Engine |
|---|---|---|---|---|
| 1 | 03:52 | Bakeries, then San Juan (the app sends "Should I open a bakery in San Juan?") | "Evidence · business research · sources + live model · 4 sources · 0.8 s". Expanded: "The verdict sentence is rule-based from these sources; the model wrote the closing sentences from the same data · Model deepseek/deepseek-v4.1-flash via OpenRouter". Has an "Ask again without Qloo" button. | Rule verdict plus live DeepSeek V4.1 Flash |
| 2 | 03:54 | Restaurants (same town) | "… sources + live model · 4 sources · 1.1 s" | Rules plus live model |
| 3 | 03:55 | "Where do Bad Bunny fans eat in San Juan?" | "Evidence · rules router · no model turn (the model did not answer: http-402)", then "Answered by the rule-based router from Qloo's records, without a model turn" | Rules router; the model returned HTTP 402 |
| 4 | 03:57 | "Quiero abrir una panadería en Las Marías. ¿Vale la pena?" | "Evidencia · investigación de negocio · sin turno del modelo · 4 fuentes" | Sources only (JSON: `fallback: http-402`) |
| 5 | 03:57 | "¿Y cuál es mejor?" (deliberately ambiguous) | "Evidencia · reglas · sin turno del modelo (sus turnos del modelo de hoy se usaron)" | Rules (`reason: visitor-cap`) |
| 6 | 03:58 | "Why is San Juan called a bakery gap when Overture lists 64 bakeries there?" | "Evidence · rules router · no model turn (your model turns for today are used)" | Rules (`visitor-cap`); misrouted |
| 7 | 03:59 | "Où ouvrir une boulangerie à Ponce ?" | Same as row 6 | Rules (`visitor-cap`); refused in English |
| 8 | 03:59 | "Where should I open a bakery in Orlando, Florida?" | No Evidence line. "Zemi-Aku covers Puerto Rico's 78 towns only, and Orlando is not on this map." | Scope guard |
| 9 | 03:59 | "¿En qué pueblo me conviene abrir una panadería?" | "Evidencia · mapa de oportunidad · sin turno del modelo (sus turnos del modelo de hoy se usaron) · 1 fuente" | Sources only (`visitor-cap`) |

**Is the agent real?** Yes, but only for my first two questions.
- The two answers that got a model turn show a real hybrid. The verdict sentence is written by rules, and the model writes the closing sentences. Each answer lists its tool calls (`town_catalog`, `overture_supply`, `census_prcs`, `opportunity_map`), and each offers "Ask again without Qloo".
- /compare shows multi-round tool traces that include refusals ("town_weather → refused: Too many tool calls in one round; ask for this one next."). A faked transcript seldom shows its own failures.
- From 03:55 on, every answer was rules-only. First the model provider returned HTTP 402, then a per-connection cap took over.
- Other panel reports were written to the same folder between 03:59 and 04:07 UTC, so parallel evaluators were probably sharing the connection and the credit. That is also what a real judging day looks like.

**Does Qloo change the answers?** /compare is a saved run from 2026-10-24 22:24 UTC, DeepSeek V4.1 Flash via OpenRouter.
- In six of the seven pairs, the no-Qloo run declines to name businesses.
- In the strictest pair, the catalog is kept and only the taste tools are removed. The page states "Qloo's taste signal changed: La Victoria", so a single place changed. That is honest, but it shows the affinity signal adds little once the model has a catalog.
- The Rincón pair credits Qloo with "El Faro de Rincón", yet the no-Qloo run also sends you to the same lighthouse ("Faro de Punta Higüero"). Matching on names overstates Qloo's share there.

**Anything faked or hard-coded?** I saw nothing fabricated, and the labelling is unusually candid. A skeptical judge would still notice the following:
- **Static landing chips.** Clicking "Mofongo" sent no network request. Its text admits a saved run ("The saved run named six island-wide when filtered"); the Bad Bunny chip text does not.
- **Saved data in the core siting screen.**
  - The siting screen reads "Qloo saved catalog" (October 7) and a heatmap "retrieved 2026-10-11".
  - Only business cards call Qloo live: audience 1.7 s, footprint 2.4 s, culture 4.6 s.
  - Campioni's audience exactly matches landing Fig. 3 ("30–34 +0.65 · 35–44 −0.88 · women +0.29").
- **Saved and live disagree on the scripted question.** /compare's with-Qloo answer says "La Placita de Santurce is the strongest match". The live rules answer leads with "Los Kings Lounge, a fast food restaurant, El Techo Rooftop Bar, a restaurant, and Mesa 364" (87%, 86%, 86%).
- **The rules-answer Evidence shows no Qloo trail.** The UI shows a single sentence. The JSON behind it carries `"qloo": "GET /search · artist \"Bad Bunny\" → GET /v2/insights · place · signal.interests.entities"` and `"calls": []`. A judge cannot see that Qloo was called.
- **Numbers that drift between pages.**
  - The landing says "17 Agent tools"; the README says "18 read-only tools".
  - The README promises "forty turns per visitor"; the cap hit at my fifth question.
  - The public Judge walkthrough says /compare has six questions; the page has seven.
  - The spoken Bad Bunny answer says "You'll see about a dozen on the map", but the response's own `count` is 8.
- **A misroute.** The "why is San Juan a gap" question got "Hungry in San Juan? Here's what's already on the record. Top of the list are La Placita de Santurce, a bar and The Cheesecake Factory, an American restaurant…"

**Every limitation the app admits, as seen.**
- Opportunity panel:
  - "Taste compared with existing businesses. Not a measure of demand, revenue or profit."
  - "Census does not publish counts below 3: a town without a published count has 0–2 establishments, never a sure zero."
  - "This is a screening, not demand."
- Business research panel:
  - "Places recorded by Qloo, not confirmed businesses for sale. Affinities, demographics and observed supply are not proof of demand or profitability."
  - "What it cannot tell you: Demand, sales, rents, foot traffic, permits or profit. Hours are a snapshot of the catalog on its date."
- Answer notes and cards:
  - "The percentage is Qloo's affinity score: how strongly those fans' taste leans toward the place, not the share of fans who go."
  - "Qloo lists these bars under restaurants, which is why they appear here."
  - "Qloo · en inglés."
- Town panel: "From Qloo's taste data for the town, not a survey of its residents."
- Out of scope: "Zemi-Aku covers Puerto Rico's 78 towns only…"
- The landing page's "What it does not claim" list, including "the rule-based fallback writes English and Spanish only" (the French question confirmed this).

**Ten-minute verdict.** Serious, honest engineering with unusually explicit source labels. The headline agent, however, was unavailable for most of my visit.

## Persona C walkthrough

*A senior location-intelligence analyst deciding whether to put this in front of a client: is the method sound, are the numbers and sources defensible, where would it mislead?*

**What is right.** Sources, vintages and suppression are handled correctly, which is rare in a hackathon entry.
- County Business Patterns (CBP) 2023 is described as "employer establishments as of March 2023 from tax records … no margin of error … leaves out the self-employed". The NAICS code is stated: "311811 (retail bakeries)".
- PRCS income carries its margin of error: "$27,992 ± $1,036 (90%) · 2024-adjusted dollars".
- Suppressed counts appear as "up to … per 10,000", and "never a sure zero".
- The mismatch between the municipio and the 3 km competitor circle is disclosed ("the two are not the same area").
- Data vintages are printed next to the numbers (catalog October 7, heatmap October 11, Overture "release 2026-09-23.1").

**Where it would mislead a client.**

1. **The unit of analysis is too coarse.** Sites are chosen at corridor or storefront scale, and a municipio average hides that. San Juan, with 336,160 residents and 1,353 Qloo places, gets a single colour. The "Nearby competitors" list uses a 3 km straight-line circle that ignores barriers.
2. **The verdict rides on the weakest supply measure.** CBP 311811 counts only retail bakeries with employees. The app's own numbers expose the problem: San Juan has "16 establishments with employees", while "Qloo lists 37 … Overture, 64". At 64, San Juan would sit near 1.9 per 10,000, above the 1.3 median the groups split on, so a like-for-like Overture ranking may well take it out of "Gap". The panel says "the group reads on the Census axis", yet the headline still says "gap".
   - My assumption, to be tested: many Puerto Rico panaderías file under other NAICS codes (cafeterías and limited-service, baked-goods stores) or have no employees, so 311811 probably undercounts island-wide.
3. **The taste axis looks like a visitor signal.** The bakery taste ranks are Vieques #1, Río Grande #2, Luquillo #3, Fajardo #4, San Juan #5, Loíza #6, Rincón #7 and Culebra #8, mostly beach and tourism municipios. Qloo's audience is not the resident population. Divide CBP supply by residents, and visitor taste turns into resident "gaps". The method needs population weighting, a tourism control (lodging density or Qloo coverage), or both.
4. **"Averaged over the town's map cells" is unweighted and opaque.** How many cells does each town get? Do missing cells count as zero or get skipped? Maunabo, with 10 Qloo places, is called "the top gap-group town by taste rank" for restaurants and may rank on one or two cells. Taste ranks show no interval or stability band, while income shows its margin of error. The rigour is uneven.
5. **The median splits have no sensitivity check.** In a 2×2 split at the island median, a town flips quadrant on small changes, and nothing shows how close to the line it sits.
6. **The denominator is residents only.** For a capital, commuters and visitors make per-resident supply understate competition.
7. **One town has two populations.** The town panel shows "342,259 people · Wikidata"; the business panel shows "population: 336,160" (PRCS).
8. **There is no validation.** There is no backtest (do 2019 "gap" towns gain bakeries by CBP 2023?), no check against Overture density, and no client case. Crowdspawn and Tastecraft both publish pre-registered tests, including their losses.

**Would I put it in front of a client?** As a conversation starter for a Puerto Rico owner, yes, with the caveats it already prints. As a siting recommendation, no: the verdict depends on the supply count most likely to undercount and on a taste signal probably skewed toward visitors.

## GitHub repository first impression

**First screen, logged out.**
- The file list: app, cache, data, deploy, docs, scripts, server, test, and dotfiles.
- About: "Zemi-Aku: Qloo Agentic Hackathon entry. A 3D map of Puerto Rico's 78 towns that answers from Qloo taste data, with Census and Overture evidence. Live at zemi.r21digital.com", with the site link and MIT licence.
- 14 commits. The latest is "Round nine: island questions, an honest rules router, Spanish on the…" (two hours old); older ones read "Zemi-Aku: public snapshot of the live build…".
- No releases, no topics, 0 stars. There is no `.github` folder in the listing, so no visible CI.
- Languages: JavaScript 77.9%, HTML 21.3%.

**Does the README make the project clear in 30 seconds?** No, for three reasons.
- It starts below the fold with a different pitch: "Your music, a way into Puerto Rico. A Qloo Agentic Hackathon project: artist taste connections become real place records…". The site and the judges' script are about where to open a business.
- Next comes a single "Status, October 17, 2026" paragraph of roughly 300 words. It mixes model pricing ("two dollars a day, forty turns per visitor"), voices, AIS ports, a coastal demo, and "Google US English" voices.
- It contains claims that are now stale: "forty turns per visitor", "18 read-only tools" against the site's 17, and "three saved runs stand in, labeled replay, when the model falls back". My fallbacks were rules answers, not replays.

**Is there a visual?** None. The README has zero images, and so does the Judge walkthrough doc. The landing page's strong figures (Fig. 3 Qloo-call table, Fig. 5 screenshot, Fig. 8 system diagram) are absent from the repo.

**Are the Qloo endpoints and the agent's design understandable?** Only by inference, from the MCP section ("serves 13 of the app's 18 read-only tools") and the Structure table (`server/agent.mjs`, `server/agent-tools.mjs`). There is no endpoint-to-feature table.

**Is it easy to run and verify?**
- Running needs pinned versions (Node 22.19+, pnpm 10.14.0), `cp .env.example .env`, and keys for Qloo, OpenRouter, Deepgram, Cesium and Census.
- The start command is `pnpm eagle`, a name the README never explains.
- Verification covers "508 local automated tests" plus `node scripts/check-demo.mjs`. A judge without a Qloo key gets an app whose /compare "says the runs could not be loaded". There is no recorded-fixture mode.

**Signals of care.** MIT licence, `.env.example`, `.gitleaksignore`, Docker and deploy docs, a Judge walkthrough, and public second-model review notes.

**Compared with a winning repo.** A winning repo usually shows:
- a hero GIF or screenshot on the first screen
- a pitch paragraph that matches the demo
- demo, video and CI badges
- a "How Qloo powers it" endpoint table and an architecture diagram
- a quickstart that runs without keys on recorded responses
- a results table for the with/without-Qloo test

Among the rivals I read, Crowdspawn and Tastecraft run their tests in CI on recorded Qloo responses, and Walk-in tests against a synthetic Qloo world.

## Defects

### High

**H1. The live model is unavailable (HTTP 402).**
- Repro: open /app logged out, type "Where do Bad Bunny fans eat in San Juan?", open Evidence.
- Observed at 03:55 UTC: "rules router · no model turn (the model did not answer: http-402)". The JSON shows `"mode":"rules","reason":"http-402","calls":[]`. The Las Marías answer at 03:57 also carries `fallback: http-402`.
- Effect: no agent turns, no "Ask again without Qloo", no French, Italian or German answers.

**H2. The conversation stops after five questions per connection.**
- Repro: ask five questions from one connection, then ask anything outside the fixed shapes ("¿Y cuál es mejor?").
- Observed at 03:57:54 UTC: `reason: "visitor-cap"`, with "This connection has used today's model turns, so I only answer fixed questions right now … I won't guess this one."
- The README promises "forty turns per visitor". If judges share an office network, one judge's questions can exhaust the next judge's allowance.

### Medium

**M1. The router answers the wrong question instead of declining.**
- Repro: once capped, ask "Why is San Juan called a bakery gap when Overture lists 64 bakeries there?"
- Observed: the bubble and the speech text say "Hungry in San Juan? Here's what's already on the record. Top of the list are La Placita de Santurce, a bar and The Cheesecake Factory…". The JSON `answer` field says something else again (Plaza Las Américas, Condado Vanderbilt Hotel…).

**M2. The "Gap" verdict contradicts the app's own supply figures.**
- Repro: Bakeries, then San Juan.
- Observed: "16 establishments with employees" against "Qloo lists 37 places of this type; Overture, 64". At 64, the density (about 1.9 per 10,000) would exceed the 1.3 median.

**M3. Taste ranks look tourism-driven, with no weighting or uncertainty disclosed.**
- Repro: the Bakeries list.
- Observed: Vieques #1, Río Grande #2, Luquillo #3, Fajardo #4, San Juan #5, Loíza #6, Rincón #7, Culebra #8.

**M4. The Evidence on rules answers hides the Qloo trail.**
- Repro: open Evidence on answer 3.
- Observed: one sentence, with no endpoint, entity ID or live-versus-cached flag, although the JSON carries the trail.

**M5. Saved and live answers disagree on the scripted question.**
- Repro: compare the "With Qloo" side of /compare pair 7 with the live answer to the same question.
- Observed: /compare says La Placita is "the strongest match"; live leads with Los Kings Lounge 87%, El Techo 86%, Mesa 364 86%.

**M6. Public claims are stale or inconsistent.**
- The README says "forty turns per visitor" and "18 read-only tools"; the landing says "17 Agent tools".
- The README pitches music discovery; the site pitches business siting.
- The Judge walkthrough says /compare has "six questions"; it has seven.
- "three saved runs stand in… when the model falls back" did not match my fallbacks.

**M7. A French question in a supported shape gets an English refusal.**
- Repro: under fallback, ask "Où ouvrir une boulangerie à Ponce ?"
- Observed: "This connection has used today's model turns … I won't guess this one." The landing page advertises "5 Languages"; its Limits section does admit that the fallback is English and Spanish only.

### Low

**L1. The Spanish has leaks and seams.**
- English tags and a lowercase seam: "Qloo etiqueta el gusto del pueblo como Puerto Rican, Place, Hotel. de 0 a 2…".
- Hard to parse: "Qloo registra uno y otros datos del mapa 3".
- "el Census" instead of "el Censo".
- The ask bar reads "Ask about San Juan..." inside the Spanish UI.
- /compare has "sirve platos criolla" (should be "criollos").
- Tú and usted are mixed between answers: "confirma el mofongo … te muestra" versus "no puedo nombrarle … Le soy honesto".

**L2. The island-wide Spanish answer names no town and leaves the camera on the previous town.** It reads "Aquí el gusto por panadería es fuerte y hay pocos negocios."

**L3. Answers are spoken automatically.** `POST /api/speak` fired after answers 1 and 2 without a press, and the voice menu has no mute.

**L4. Several labels confuse.**
- "37 places in Qloo's saved catalog. Food: 37" means San Juan's bakeries; the town has 1,353 places.
- Card distances such as "4.8 km" never say measured from where.
- Bad Bunny cards say "Why it fits you" although the user never said they were a fan.
- Missing space: "64 listed places of this type ·release 2026-09-23.1".
- "You'll see about a dozen on the map" for 8 results.

**L5. The bakery answer recommends a comparison it admits it cannot make:** "Next, compare with Loíza, where the count is withheld, so the two cannot be ordered."

**L6. San Juan has two population figures:** 342,259 (Wikidata, town panel) and 336,160 (PRCS, business panel).

**L7. The San Juan landmark carousel leads with minor buildings.** "House at 665 McKinley Street", "Figueroa Apartments" and "Edificio del Valle" come before El Morro.

**L8. The landing page misbehaves slightly at 390 px.** The page scrolls 4 px sideways because a `div.tbl` table ends at 379 px in a 375 px client width. Fig. 4's markers [1]–[8] sit off-screen inside a sideways-scrolling code block.

**L9. Some text has low contrast.** On /app, the hero subtitle and the letter-spaced "OR START WITH AN ARTIST" and "WATCH A TOUR" labels sit over the satellite map, crossed by municipio lines. The landing map caption ("Press play to load the interactive map") is grey monospace on dark.

**L10. Third-party favicon requests.** Calls to `icons.duckduckgo.com` return 404 and tell DuckDuckGo which business domains a visitor opens.

**L11. The landing diagram overstates "No keys here" for the browser.** A Cesium ion token travels in browser requests. That is normal for Cesium, and the README calls it a restricted read-only token, but the diagram's wording promises more.

**L12. The landing taste chips are static.** Clicking them sends no request, and only the Mofongo text says it comes from a saved run.

## Scores

**Official criteria**

| Criterion | Score | Evidence |
|---|---|---|
| Technological Implementation | 3 | A broad, careful build (17–18 read-only tools, Qloo REST plus the official MCP kit, CBP/PRCS/Overture joins, per-answer Evidence, 508 local tests), but the live model answered 2 of my 9 questions before HTTP 402 and a per-connection cap left a rules router to handle the rest. |
| Design | 4 | High visual craft (3D island, four-quadrant choropleth, aerial cards, an editorial landing page with real figures, a clean 390 px bottom sheet), held back by analyst jargon in the main flow, English leaking into the Spanish UI, and answers spoken automatically with no mute. |
| Potential Impact | 3 | An underserved, bilingual audience gets a sourced first screen, but the municipio grain, the CBP-only supply axis and the lack of anything to take away (no brief, CSV or plan) limit what an owner can act on. |
| Quality of the Idea | 3 | Taste-against-supply screening for Puerto Rico towns is sound and locally distinctive, but it is a coarser cousin of storefront void analysis (Walk-in), and the product is split across siting, music tours, weather, ports and an iPhone signup. |
| **Total** | **13 / 20** | |

**Legacy criteria**

| Criterion | Score | Evidence |
|---|---|---|
| Intelligent and thoughtful use of LLMs + the Qloo API | 4 | Qloo is used with real care (entity IDs rather than names, `admin2_region` rather than the printed city, a tag filter rather than a signal for dishes, Spanish search terms, paging all 7,717 places), and the model is fenced to closing sentences, but the strictest control shows the affinity signal changed one place, and no quality metric is reported. |
| Technical implementation and execution | 3 | Strong engineering with weak live execution during judging: the 402, the cap after five questions, the misrouted "why" question and the French refusal. |
| Originality and creativity | 4 | The 3D bird's-eye island, the artist-to-place tours and the with/without-Qloo page are memorable, though the quadrant screen itself is a standard void-analysis pattern. |
| Real-world application and potential impact | 3 | Useful as a screening conversation in Puerto Rico, but not yet defensible as a siting tool: the taste signal looks tourism-skewed, supply is undercounted, and nothing is validated. |
| **Total** | **14 / 20** | |

If the model were funded and the cap fixed, I would expect both implementation rows at 4: 14/20 official, 15/20 legacy.

## Path to first place

Ranked by expected score gain.

1. **Make the judged path unbreakable.**
   - Raises: Technological Implementation +1 (3→4), legacy Execution +1.
   - What it takes: fund OpenRouter with headroom for a judging day; add a free-tier backup model chain; key the visitor cap on a cookie rather than the connection, and raise it for a documented judge path; add labelled saved replays for every scripted question, including "Where do Bad Bunny fans eat in San Juan?".
   - Verify: three logged-out browsers on one network, twelve questions each.
   - Effort: hours plus a small budget.
2. **Fix the two method flaws that flip verdicts.**
   - Raises: Potential Impact +1 (3→4), legacy Real-world impact +1.
   - What it takes: show an observed-supply axis (Overture and Qloo density) beside CBP and print the verdict under both; widen the NAICS set or map Overture categories; population-weight the heatmap average and control for tourism; show taste-rank stability for towns with few cells.
   - Effort: one to two days.
3. **Publish a pre-registered, measured result, losses included.**
   - Raises: Technological Implementation +0.5, Quality of the Idea +0.5, legacy LLM + Qloo +0.5.
   - What it takes: for example, a backtest (did 2019 CBP "gap" towns add bakeries by 2023 faster than other towns?) and a scored Qloo-versus-model-alone comparison on 20+ frozen questions, published as a table on /compare and in the README.
   - Effort: one to two days.
4. **Rebuild the README's first screen.**
   - Raises: Design +0.5 and Technological Implementation +0.5 for judges who read repos.
   - What it takes: a hero GIF (Bakeries → San Juan → Evidence); one paragraph matching the site's business pitch; the landing's Qloo-call table and system diagram; a criteria-to-evidence table like Crowdspawn's; a no-keys replay mode; CI on recorded Qloo responses; delete the October 17 status paragraph.
   - Effort: half a day.
5. **Give the owner something to take away.**
   - Raises: Potential Impact +0.5, legacy Real-world impact +0.5.
   - What it takes: a one-page bilingual town brief (PDF or CSV) with the verdict under both supply measures, the five nearest competitors with hours, the "Next three checks", and a permits checklist (OGPe use permit, Salud sanitary licence, patente municipal) to confirm with the municipio.
   - Effort: about one day.
6. **Do a plain-language and Spanish pass.**
   - Raises: Design +0.5.
   - What it takes: lead with plain lines such as "Mucho interés, pocas panaderías" and move NAICS and median text into Definiciones; translate Qloo tags; fix the English placeholder, "el Census", the "de 0 a 2" seam and the tú/usted mix; make island-level answers name the top three towns and zoom out; add a mute toggle.
   - Effort: hours.
7. **Show the Qloo trail on every answer and decline consistently.**
   - Raises: Technological Implementation +0.25 to +0.5, legacy LLM + Qloo +0.25.
   - What it takes: rules-answer Evidence lists endpoint, entity IDs, live or cached, and time (the JSON already holds them); out-of-shape questions get a refusal, not another question's answer; spoken text matches written text; French, Italian and German questions parse to the same templates.
   - Effort: hours.
8. **Tell one story.**
   - Raises: Quality of the Idea +0.5.
   - What it takes: hide ports/AIS, the TestFlight form and weather from the judge path; make the README, landing page, Devpost page and video all lead with the Puerto Rico bakery owner; move the artist tours to a secondary "discover" entry.
   - Effort: hours.

## What a rival entry would need to beat this

**Today, very little.** Each of the three rivals I read offers a judge path that doesn't need a live model turn: Crowdspawn's `/sample` plan and call trace, Walk-in's saved example surveys, and Tastecraft's 60-second replay. Crowdspawn and Tastecraft publish pre-registered evaluations, and Walk-in reports a head-to-head against a plain chatbot. Per the brief, I read only their Devpost pages, not their apps.

**Crowdspawn (cities and partners for indie game launches)**
- What it has:
  - A "Summary for judges" table that maps each criterion to a link that proves it.
  - An agent choosing among 8 Qloo tools.
  - A kill-switch: "With no Qloo key, nothing is produced".
  - A pre-registered Qloo-versus-LLM study that publishes its losses ("on 23 held-out games the LLM did better (4/23 vs 1/23)").
  - 146 API tests and 35 web tests in CI on recorded Qloo responses.
  - It claims Lighthouse accessibility 100 and a working 360 px layout.
- Versus Zemi-Aku: it beats Zemi-Aku on rigour and on how easy it is to judge. Zemi-Aku leads on visual craft and on public-data grounding.

**Walk-in (taste-based void analysis for the owner)**
- The closest rival in kind. What it has:
  - Real walk and drive isochrones.
  - Comparison against same-size neighbouring areas, which fixes the scale bias Zemi-Aku has.
  - "Missing" categories checked against OpenStreetMap.
  - Owner rules enforced after the model answers.
  - A launch kit: ad copy, a poster with a QR code, and a PDF report.
  - An MCP server that needs no keys, plus free example replays.
  - 629 server tests and 306 front-end tests in GitHub Actions.
- Versus Zemi-Aku: it beats Zemi-Aku on method and impact. Zemi-Aku leads on Census and PRCS integration (with suppression and margins of error), on Spanish, and on the island-scale visual.

**Tastecraft (a weekly plan for independent restaurants)**
- What it has:
  - "Judge it in 60 seconds" with a replay that always works.
  - A home-page switch that turns Qloo off for the same run.
  - A pre-registered held-out test reported plainly as "+10% … not proven", plus "+29%" against Qloo affinity data alone.
  - Eight Qloo workflows, including `/v2/analysis/compare` and the official qloo-harness.
  - English and Spanish.
  - Downloadable assets.
- Versus Zemi-Aku: it beats Zemi-Aku on judge experience and on honest evaluation.

**Once Zemi-Aku's live path is restored**, a rival would need five things to beat it:
1. A demo that survives a judging day.
2. A measured, honestly reported Qloo lift.
3. Sourcing as granular as Zemi-Aku's: dates, suppression and margins of error.
4. A localised, bilingual experience for one specific underserved market.
5. A visual centrepiece.

Walk-in already has the first two and most of the third for its own geographies; to take Zemi-Aku's niche it would need Puerto Rico coverage and Spanish. Zemi-Aku's best defence is items 1 to 3 of the path above.
