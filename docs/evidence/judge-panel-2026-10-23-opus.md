# Zemi-Aku blind evaluation (evaluator: Opus)

Tested 2026-10-23, about 21:05 to 21:13 UTC, against https://zemi.r21digital.com. I used only the public site and the public GitHub API. I opened no project files.

## Browser used

Headless Chromium driven by the Playwright MCP server. Viewport was 1280×900, then 390×844 for the phone check. I read on-screen text with `innerText`, took viewport screenshots, and read the browser's own network log, including the request and response bodies of `/api/chat`. Audio was not audible in headless mode. I did not use the microphone and did not press speech playback, but see D9: the app requested `/api/speak` on its own.

Load times: front page 4.9 s to network idle, `/app` 2.7 s, `/compare` 0.7 s. Clicking an industry or a town took about 2.5–3 s, mostly camera animation. Deterministic "sources" answers came back in 34–174 ms. Model answers took 1.0–3.8 s. Console errors were all favicon 404s from `icons.duckduckgo.com`; there were no JS errors.

Question count: the Bad Bunny question plus 6 of my own, so 7 typed. Clicking the Bakeries chip and the Restaurants chip also fired two `/api/chat` calls.

## Persona A walkthrough: Puerto Rico bakery owner, Spanish first, not technical

1. **Opened `/app` logged out.** No login wall appeared. The first screen is entirely in English: "Where should I open a business in Puerto Rico? Qloo's taste for all 78 towns, against the businesses the Census already counts. Pick an industry." The language control is a small pill at the bottom, "EN · Andromeda", and nothing marks it as a language switch. A Spanish-first owner would not find it without luck. The words "Qloo" and "taste" are never explained on this screen.
2. **Clicked Bakeries.** The map recolours into four groups. The legend reads "Gap: strong taste, few businesses / Competitive: strong taste, many businesses / Quiet: less taste, few businesses / Crowded: less taste, many businesses / Not enough data". The caveat is stated plainly: "Taste compared with existing businesses. Not a measure of demand, revenue or profit." Sources are named: "U.S. Census Bureau, County Business Patterns 2023 … Census does not publish counts below 3, so a town without a published count has 0–2 establishments", and "Qloo heatmap affinity for bakery, averaged over the town's map cells, retrieved 2026-10-11". The list "Strongest taste with few businesses" begins at "Río Grande, taste #2 · 0.7 per 10,000 residents". There is no taste #1, and nothing says where it went; presumably it is not a "Gap" town, but she would have to guess. At 1280 px the side panel covers the west third of the island.
3. **Clicked San Juan.** The panel is titled "Business research · San Juan" and gives four different counts:
   - "35 places in Qloo's saved catalog. Food: 35"
   - "Overture · observed supply … 64 listed places of this type"
   - "16 establishments · 237 employees (County Business Patterns 2023) · 0.5 per 10,000 residents"
   - Group label "Gap: strong taste, few businesses · taste #5"

   The spoken/chat bubble at the same moment said: **"San Juan's busy. A couple dozen bakeries show up in Qloo, and other map data counts about fifty across town. Want to see who's nearby?"**

   The bubble says "busy" while the panel says "Gap … few businesses". It calls 35 "a couple dozen" and 64 "about fifty". She would not know which to believe, and the bubble never answers "should I open here?". The request log shows this answer was `evidence.mode: "sources"`, a template with no model involved.
4. **Opened the sources.** "Sources and the record behind this answer" lists "Sources: Qloo's saved catalog for local context. Observed supply: Overture release 2026-09-23.1. Dataset coverage, not a verified competitor census. Demographics: Census PRCS 2020–2024." That is honest and well hedged. "Copy brief" is a useful button for her.
5. **Switched to Spanish** (language select → Español). The hero, chips and legend translate reasonably: "¿Dónde abro un negocio en Puerto Rico?", "Panaderías", "Brecha: mucho gusto, pocos negocios". However:
   - "WATCH A TOUR", the three tour buttons, the four suggestion chips, the subtitle "Puerto Rico, through Qloo's taste data", the search placeholder "Ask about any town, or search a place", and the "Camera motion on" control all stay in English.
   - In a town panel, cards still read "Bakery · Caguas", "Food" and "Today 5:00 am–10:00 pm".
   - "mucho gusto" is the everyday phrase for "nice to meet you". As a label for high affinity it reads oddly to a Puerto Rican reader; "mucha afinidad" or "mucho interés" would read better.
   - Language is not remembered. After a reload at phone width the app was back in English.
6. **My question (Spanish):** "Vivo en Caguas. ¿Me conviene abrir una panadería allí o en Río Grande?" The reply came in 171 ms, from the template again: "Caguas tiene opciones. En Qloo aparecen un par de docenas de panaderías, y otros datos del mapa cuentan un par de docenas en todo el pueblo. ¿Quiere ver quién está cerca?" **Río Grande was ignored completely**, and the comparison she asked for was not made. The tool calls show 17 (Qloo) and 28 (Overture), and both became "un par de docenas".
7. **Small town (Spanish):** "¿Qué tal Maricao para una panadería pequeña? ¿Cuánta competencia hay?" The template replied in 34 ms: "Maricao es pequeño. En Qloo no aparecen panaderías, pero otros datos del mapa cuentan uno en todo el pueblo. ¿Quiere ver quién está cerca?"
   - The grammar is off ("uno" should be "una").
   - It offers "who's nearby" with zero places to show.
   - The panel honestly says "Datos insuficientes · gusto #37 · de 0 a 2 establecimientos (el Census no publica cifras menores de 3)".
   - **It contradicts itself one turn later** and contradicts `/compare`, which both name "Erik's Bakery" in Maricao (see step 8).
8. **Deliberately ambiguous follow-up:** "¿Y cuál es mejor?" This time the model answered (DeepSeek, 2.3 s) and used the conversation history correctly: "Para una panadería, Río Grande muestra el hueco más claro … unos 0.65 negocios por cada 10,000 residentes … Caguas también sale en ese grupo, con más gente y más competencia. Maricao queda en el grupo sin datos suficientes … Allí Qloo sí muestra una panadería, Erik's Bakery and Pastry Shop. Le conviene Río Grande antes que Maricao." This was the most useful answer she got. But:
   - It is a firmer recommendation ("Le conviene") than the app's own caveats allow.
   - It did not consider that she lives in Caguas.
   - One tool call failed: `map_town {}` returned `ok=false`.
9. **Taste question (Spanish):** "¿Qué le gusta a la gente de Arecibo? Quiero saber qué tipo de negocio pegaría allí." The model answered in 3.8 s: "En Arecibo la gente escucha música urbana y bolero: Bad Bunny, Residente, Tommy Torres y Kany García, según el perfil de Qloo … La edad media es 45.5 años … ingreso medio de unos 23,635 dólares … el café es el que más se asoma … Eso es afinidad de gusto, no prueba de demanda ni de rentabilidad. El café tiene mejor encaje que la panadería en Arecibo."
   - "Ingreso medio" should be "mediano"; the panel says median.
   - It compared only café and bakery, then declared café the better fit.
   - Two of its six tool calls were `opportunity_map {}` with empty arguments and failed.
   - Of everything I saw, this answer best shows "Qloo taste" in plain language.
10. **Phone, 390 px.** The home screen fits with no horizontal scroll (scrollWidth 390). After Bakeries → San Juan, the map controls (compass, 2D, ⌂, 3D) sit on top of the panel header and cover the breadcrumb and title "Business research · San Juan". The research panel and the chat bubble stack until the map is hidden. The verdict line ("Gap … taste #5 … 16 establishments") is below the fold. The search placeholder is cut to "Ask about San J".

**Persona A bottom line:** the sources and caveats are more honest than most consumer tools, and the bakery list with hours and ratings is concrete and useful. But the first two answers to her two most natural questions ("should I open here?" and "here or there?") were canned, contradicted the map's own label, or dropped half the question. She would leave unsure whether San Juan is "busy" or a "gap".

## Persona B walkthrough: hackathon judge, 10 minutes

1. **Is the agent real?** Partly. `/api/chat` answers in two distinct modes, and the response body says which one:
   - **`evidence.mode: "model"`**: Bad Bunny, the ambiguous follow-up, Arecibo, and the jailbreak attempt. These carry `model: "deepseek/deepseek-v4.1-flash"`, a round count, timings, and the actual tool calls with arguments, for example `artist_places {"town":"San Juan","artist":"Bad Bunny"} → Qloo · 8 places · 1.0 s`. The Evidence drawer on screen shows the same thing: "Evidence · live model · 2 tool calls · 2.8 s … Model deepseek/deepseek-v4.1-flash via OpenRouter · 2 rounds · answered 2026-10-23 21:07 UTC · Qloo IDs: FC44…AFC1, …". This looks genuine: the IDs in the drawer match the place IDs in the response payload.
   - **`evidence.mode: "sources"`**: any message that looks like "open a [business] in [town]", including both industry chips. These are templates that return in 34–174 ms with no model call. They fixed up the first town and dropped everything else ("Compare Ponce and Mayagüez for opening a café … what do locals there like?" got "Ponce has some options. About a dozen cafés show up in Qloo, and other map data counts about fifty across town."). The UI never says the answer is canned, so a user cannot tell which mode answered.
2. **Does Qloo change the answers?** Yes, for discovery questions. The Bad Bunny answer named La Placita de Santurce (88%) and La Victoria on Calle Loíza (87%) and said "Both are Qloo affinity matches, not Bad Bunny's own spots." `/compare` shows six saved paired runs. Without Qloo, the model says things like "I can't name verified Bayamón eateries … I won't invent them". With Qloo it names places, and each pair ends with a "Qloo changed:" line. The page admits: "The runs are saved in compare-qloo.json … the public site has no 'without Qloo' switch", and the run is dated 2026-10-14, so it is a recording, not a live A/B. **For the business question, Qloo's role is thinner**: the bakery panel's places carry `affinity: null`. The only Qloo signal in the "where to open" verdict is a heatmap average retrieved 2026-10-11, and all place counts come from a "saved catalog" measured 2026-10-07.
3. **Anything faked or wrong?**
   - **Bad Bunny "eat" list includes non-eating places.** The first card under the answer is "Colegio San Ignacio de Loyola — Services and more … Strong match for Bad Bunny fans (88%)", a Jesuit boys' school. Also listed: "Puerta de la Bandera — History and culture", "San Juan, Puerto Rico — Places to stay (88%)", and "Colegio de Ingenieros y Agrimensores de Puerto Rico - Sede". The spoken answer filtered correctly; the card list did not. The school's own record says `city: "Guaynabo", municipality: "San Juan"`, and it is shown as San Juan.
   - The Evidence drawer says `artist_places → 8 places`, yet 14 cards are shown. The other six have no visible provenance in that answer.
   - The number words are inaccurate: 64 and 70 both became "about fifty", and 35 became "a couple dozen".
   - Maricao: the template said "En Qloo no aparecen panaderías"; the model, one turn later, said "Qloo sí muestra una panadería, Erik's Bakery". The bakery-type filter misses a bakery that is in the catalog.
   - In the San Juan bakery view, the "Gap" label contradicts the "San Juan's busy" speech.
   - I saw no invented revenue numbers or testimonials. The jailbreak answer: "I can't give you monthly bakery earnings in Carolina or a customer testimonial. I don't have revenue data, and inventing a quote would be dishonest." It then assumed she was buying a business ("Real financials come from the seller's tax returns…"), but she wants to open one.
4. **Engineering quality.** It is a real, working build: a Cesium 3D globe with ArcGIS imagery and 78 municipal polygons, a structured agent response format (`speech`, `actions`, `evidence.calls[]`), deep links (`#town=San+Juan`), "Copy brief", hours and ratings, and favicons. The only console errors were third-party favicon 404s. The public repo (MIT) exists with `server/`, `app/`, `test/`, `scripts/`, `Dockerfile` and `.env.example`. It has only 4 commits, the last pushed 2026-10-21, so a judge cannot see the history and cannot confirm the live site matches it. The Cesium footer shows "Upgrade for commercial use", which is a licensing caveat for the real-world claim.
5. **Front-page claims checked:** "78 towns" matches the map. "7,717 places on Qloo" and "16 agent tools" I could not verify from the UI. "5 languages" matches the language select (EN/ES/FR/IT/DE). The claim "Seven Qloo calls … The three qloo_* calls go through Qloo's official agent kit over MCP" matches the `qloo_recommend`, `qloo_entity_tags` and `qloo_describe` calls visible on `/compare`.

**Where the app admits limitations (credit):** "Not a measure of demand, revenue or profit"; "Places recorded by Qloo, not confirmed businesses for sale"; "Census does not publish counts below 3"; "Coverage may be incomplete or have changed"; "Dataset coverage, not a verified competitor census"; "Affinities describe aggregate cultural patterns, not individuals. Rankings and interpretations are Zemi-Aku's"; "affinities, not endorsements"; `/compare`'s "the public site has no 'without Qloo' switch … a place the second run names from general knowledge is not verified"; voice note "Past the daily limit, your device's voice takes over". This is unusually thorough.

## Defects

| # | Sev | Defect | Steps to reproduce |
|---|---|---|---|
| D1 | **High** | Template answer contradicts the map's own verdict | `/app` → Bakeries → San Juan. Panel: "Gap: strong taste, few businesses". Bubble: "San Juan's busy." |
| D2 | **High** | Comparison and multi-part questions routed to a template that drops the second town and the rest of the question | Ask "Vivo en Caguas. ¿Me conviene abrir una panadería allí o en Río Grande?" or "Compare Ponce and Mayagüez for opening a café…". Only the first town is answered (`evidence.mode: "sources"`, under 200 ms). |
| D3 | **High** | "Where do Bad Bunny fans eat" card list includes a boys' school, a monument, a professional association and the city itself as a "place to stay" | `/app` → Restaurants → San Juan → ask the question. The first card under the answer is "Colegio San Ignacio de Loyola" (88%). |
| D4 | Med | Number words are wrong | San Juan bakeries: Overture 64 → "about fifty". Ponce cafés: 70 → "about fifty". Qloo 35 → "a couple dozen". |
| D5 | Med | Bakery-type catalog filter misses a known bakery, so template and model disagree | Ask "¿Qué tal Maricao para una panadería pequeña?" → "En Qloo no aparecen panaderías". Then "¿Y cuál es mejor?" → "Qloo sí muestra una panadería, Erik's Bakery". |
| D6 | Med | Spanish mode only partly translated | Language → Español: tours, suggestion chips, search placeholder, subtitle, card genres ("Bakery", "Food") and hours ("Today …") stay English. "mucho gusto" is an awkward label. |
| D7 | Med | 390 px: map controls cover the panel title and breadcrumb; panels hide the map; verdict below the fold | Resize to 390×844 → Bakeries → San Juan. |
| D8 | Med | Model tool calls with empty arguments fail silently | Arecibo question: two `opportunity_map {}` with `ok=false`. Ambiguous follow-up: `map_town {}` with `ok=false`. The answer still sounds confident. |
| D9 | Low | Speech synthesis requested without user action | Clicking an industry chip, then a town, fires `POST /api/speak` with no play press (seen in the network log). |
| D10 | Low | Language choice not persisted | Choose Español, then reload: back to English. |
| D11 | Low | Language control not discoverable | The only entry point is the pill "EN · Andromeda", which reads as a voice name. |
| D12 | Low | Distance origin never stated | Cards show "4.8 km", "10.9 km" with no "from where". |
| D13 | Low | Taste ranking starts at #2 with no explanation | Bakeries list starts "Río Grande · taste #2". |
| D14 | Low | Grammar and term slips in Spanish output | "cuentan uno" (should be "una"); "ingreso medio" for a median. |
| D15 | Low | Hover card overlaps the answer text at desktop width | After San Juan loads, the "Panadería y Repostería Winnys 2" hover card with a grey placeholder image covers the chat bubble. |
| D16 | Low | Third-party favicon 404s in the console | Any town view: `icons.duckduckgo.com/ip3/*.ico` 404s. |

## Scores

1. **Intelligent use of LLMs + Qloo API: 3/5.** Model answers chain real Qloo tools with visible IDs and timings, and refuse to invent figures. But the core "where should I open" path is mostly templates over a saved catalog with `affinity: null`, and the artist path shows a school as a place to eat.
2. **Technical implementation and execution: 4/5.** A fast, stable 3D map with structured evidence, deep links and no JS errors across about 20 interactions. Points off for template/model contradictions, silent failed tool calls and the 390 px layout.
3. **Originality and creativity: 4/5.** Crossing Qloo taste heatmaps with Census County Business Patterns to classify 78 municipios into gap, competitive, quiet and crowded, plus an artist-to-place lens and a published with-and-without-Qloo comparison, is a distinctive framing I have not seen in a taste API demo.
4. **Real-world application and impact: 3/5.** The audience and caveats are right, but the target user got contradictory or half answers to her first two natural questions, Spanish is incomplete, and nothing helps her past "which town" (rent, foot traffic, permits).

## Top 3 changes that would raise the score, in order

1. **Retire the canned "sources" speech for decision questions, or make it agree with the panel.** Send "should I open / here or there / compare" to the model with the opportunity data. At minimum, generate the template sentence from the group label ("Gap: fewer bakeries per resident than the island, 0.5 vs 0.8 per 10,000") and use exact numbers, not "about fifty". Mark template answers in Evidence as "rule-based".
2. **Filter artist/taste results by the asked category before rendering cards.** If the question says "eat", drop `category: other` / "Services and more" / "Places to stay" and municipality mismatches, and show only the places the model actually cited, with provenance on each.
3. **Finish Spanish and phone as first-class.** Default to Spanish for PR visitors or show a visible "Español" toggle on the first screen, translate the chips, tours, placeholder and card metadata, rename "mucho gusto", persist the choice, and move the map controls off the panel at 390 px with the verdict line first.

## What a rival entry would need to beat this

- **Score 4+ on LLM + Qloo use:** every answer, including the "where to open" path, comes from a live Qloo call whose affinity actually shifts the ranking, with no template fallbacks that contradict the visuals.
- **Match this entry's honesty:** the same source-level citations and caveats. This entry's sourcing discipline is its strongest asset, and most demos lack it.
- **Ship a live with/without-Qloo toggle,** not a recorded comparison, to beat `/compare`.
- **Win on impact by closing the loop for a real owner:** one coherent recommendation per question in fluent Puerto Rican Spanish, working on a phone, ideally ending in something actionable (shortlist of corridors, comparable businesses, next steps) rather than "¿Quiere ver quién está cerca?".

A rival that gets those right with a simpler 2D map would likely outscore this on criteria 1 and 4. To beat it on criteria 2 and 3, it would need comparable engineering polish and an equally original data cross.
