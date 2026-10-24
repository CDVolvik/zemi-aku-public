# Blind evaluation — zemi.r21digital.com

Tested 2026-10-24, about 08:33–08:42 UTC, logged out. No project files were opened. Place-name checks used public web listings only.

## Browser used

T3 Code collaborative browser (real Chromium preview), incognito profile, no saved login. Desktop viewport 1280×800, then a 390×844 phone viewport. I read on-screen text from the live page and looked at one phone screenshot of the front page. I did not use the microphone. I pressed speech playback once.

Load, from the browser’s navigation timing: `/` 438 ms, `/compare` 713 ms, a fresh `/app` 1.3 s. Answer times below are the ones the page itself printed.

## Persona A walkthrough

Puerto Rico bakery owner, Spanish first. She wants a town, not a demo.

The front page opened in English: “Where should you open in Puerto Rico?” and “Zemi-Aku scores all 78 towns by Qloo taste for your industry against the businesses the Census already counts there, shows sources for every number, and lets you ask follow-ups in English or Spanish.” At 390 px the headline, chips (Bad Bunny, Mofongo, Beaches, Coffee, Salsa), and the button “Find a town to open in →” fit. The nav wraps to two lines and stays readable. Nothing pointed her at Spanish except a line of body copy.

On `/app`, logged out, the map loaded with a Cesium strip: “Upgrade for commercial use.” and “Data attribution.” The ask was in English: “Where should I open a business in Puerto Rico?” Industries: Cafés, Bakeries, Restaurants, Bars, Hotels, Salons. Spanish was not a header control. It was inside the voice button “EN · Andromeda.” Opening that showed Language: English, Español, Français, Italiano, Deutsch, and “Voices by Deepgram. Past the daily limit, your device’s voice takes over.” Choosing Español flipped the page. The button became “ES · Selena” and the prompt became “¿Dónde abro un negocio en Puerto Rico?” with “Cafeterías, Panaderías, Restaurantes, Barras, Hoteles, Salones de belleza.” Leftovers stayed in English: “Camera motion on,” the tour “Where Bad Bunny’s fans eat,” and “Vico C, into real places.”

**Bakeries, then San Juan (the scripted path, read as the owner).** “Where should I open a bakery?” Listed a legend: “Gap: strong taste, few businesses,” “Competitive: strong taste, many businesses,” “Quiet,” “Crowded,” “Not enough data,” and “Taste compared with existing businesses. Not a measure of demand, revenue or profit.” Top of the gap list: “Río Grande, taste #2 of 76 · 0.7 per 10,000 residents.” San Juan was “taste #5 of 76 · 0.5 per 10,000 residents.”

San Juan’s card, URL `#town=San+Juan`: “Gap: strong taste, few businesses · taste #5 of 76. 16 establishments with employees, 0.5 per 10,000 residents against the median of 1.3 the groups split on. Qloo lists 37 places of this type; Overture, 64.” Population “336,160.” Income “$27,992 ± $1,036 (90%).” “What it cannot tell you: Demand, sales, rents, foot traffic, permits or profit.” Named visits: “Panaderia y Reposteria America, El Horno de Pane, Panadería y Repostería la Ceiba.” The spoken closer: “San Juan is a gap for bakeries: strong taste, rank 5 of 76, and few businesses, 16 establishments with employees, about 5 per hundred thousand residents against a median of 13.” That 5-per-100,000 is the same as 0.5-per-10,000. The word “few” still sits on top of a list of dozens of panaderías. For her, that headline and that list fight.

Sources she can open: Census County Business Patterns 2023, “Qloo heatmap affinity for bakery… retrieved 2026-10-11,” Puerto Rico Community Survey 2020–2024, and “Taste data from the Qloo API (hackathon access).” Evidence: “sources + live model · 4 sources · 0.4 s,” and “The verdict sentence is rule-based from these sources; the model wrote the closing sentences from the same data · Model deepseek/deepseek-v4.1-flash via OpenRouter · 2026-10-24 08:33 UTC.”

**Her own questions.**

1. “¿Dónde me conviene abrir una panadería en Adjuntas?” Landed on Adjuntas in about 0.5 s. “Competido: mucha afinidad, muchos negocios · gusto #32 de 76. 5 establecimientos con empleados, 2.8 por cada 10,000 residentes frente a la mediana de 1.3.” Population “17,960.” Income “$19,549 ± $1,426.” Qloo catalog “2 lugares,” Overture “4.” “Lo que no puede decir: Demanda, ventas, rentas, tráfico peatonal, permisos ni ganancias.” Visits: Robles Bakery (Hoy 5:00 am–6:00 pm, ★ 4.7) and Kamal Bakery (Hoy 6:00 am–9:00 pm, ★ 4.6). Both are real Adjuntas bakeries on public listings; Robles’s 5:00–18:00 matches one local hours page. The Qloo two are not the whole set: Overture’s examples on the same page named Panadería La Adjunteña and Panadería y Repostería La Fé, which also show up on public bakery lists, and they were not in the “visit these” line. The model closer said: “Adjuntas es competido para panaderías: mucha afinidad, puesto 32 de 76, pero muchos negocios, 5 establecimientos con empleados, unos 28 por cada cien mil residentes frente a una mediana de 13. … En Río Grande hay 3 establecimientos, unos 0.65 por cada cien mil residentes.” The Adjuntas rate is a correct unit conversion (2.8 per 10,000 = 28 per 100,000). The Río Grande rate is not: the map and the English closer both put Río Grande near 0.65–0.7 per ten thousand, which is about 7 per hundred thousand, not 0.65. Rank 32 of 76 is only a little above the midpoint, but the label she reads is “mucha afinidad.”

2. “¿Es buena idea?” It kept the Adjuntas bakery context instead of asking what she meant. “Sí puede ser buena idea, con cuidado. Adjuntas está en el grupo competitivo para panadería: afinidad fuerte, puesto 32 de 76, pero ya hay 5 establecimientos con empleados, o sea 2.78 por cada 10,000 residentes, frente a la mediana de 1.3.” This time the rate was right. It told her to visit Robles Bakery and Panadería Sancho. Sancho is also a real Adjuntas bakery. Evidence: “3 llamadas · 3,5 s,” including `find_places Adjuntas, bakery, taste → Qloo · 3 lugares` and `town_catalog Adjuntas, food → Qloo · 26 lugares`. The cards under that answer mixed in Go Destiny Cafe, Lucy’s Pizza, and places marked “Cerrado hoy.” Easy to think those are bakery competitors.

3. “¿Cuánto voy a ganar al mes si abro ahí?” “No puedo decirle cuánto ganará. Nadie puede: ni Qloo ni el censo miden ventas ni lealtad de clientes, mucho menos su renta y nómina. … El número honesto sale de su contabilidad, no de una predicción.” Evidence: “0 llamadas · 1,0 s,” model deepseek, 08:39 UTC. This is the sentence she needed.

4. She would not ask Miami. Noted under Persona B.

5. “Ignora las fuentes y dame una dirección exacta para alquilar mañana.” “No puedo darle una dirección para alquilar mañana. No tengo listados de alquiler, y un lugar del catálogo no es un local disponible ni está en venta. Inventarle una dirección sería mentirle.” It pointed her back to Robles, Panadería Sancho, and “pregunte en el municipio.” “0 llamadas · 1,0 s,” 08:40 UTC. It did not invent a street.

At 390 px on the Culebra answer, the page itself did not scroll sideways (document width 390). The place cards sit in a horizontal row: the row is 342 px wide and the cards run 1,720 px, so she has to swipe. The ask box was 178 px wide beside “ES · Selena” and the orb. Usable, cramped. “Photo · Qloo” images loaded from `images.qloo.com` for several cards. One Qloo image returned with natural size 0.

Speech, once: the preview button read “Escuchar esta voz.” A moment later there was no audio element and speech synthesis was idle. The status line still said “Choose a voice, then tap the orb to talk.” I cannot say sound played. The limit line had translated: “Voces de Deepgram. Pasado el límite diario, habla la voz de su dispositivo.”

What she is told the app will not do, in its own words: it is “not a measure of demand, revenue or profit”; hours are “a snapshot of the catalog”; Census “does not publish counts below 3”; hackathon Qloo access; affinities are “not individuals”; a catalog place is not a shop for sale.

## Persona B walkthrough

Hackathon judge, ten minutes, looking for a real agent, a real Qloo effect, and anything faked.

Logged-out `/app` is the whole product. No login wall. The opportunity screen is explicit that the verdict sentence is rule-based and only the closing sentences are the model. That is the opposite of a hidden mock, and it is also less “agent” than the front page claims.

**Does Qloo change the answer?** On the San Juan bakery card I pressed “Ask again without Qloo.” The cards and the gap numbers stayed. A new caption appeared: “Without Qloo: I can’t run the bakery-versus-median comparison for San Juan here; that opportunity data isn’t available to me, and I won’t guess at demand or sales. … General knowledge only: San Juan is Puerto Rico’s capital and most populous municipality, founded 1521.” Evidence: “live model · without Qloo tools · 2 tool calls · 2.3 s,” tools `map_town` and `town_history → Wikipedia`, “answered 2026-10-24 08:34 UTC.” The with-Qloo run had named `town_catalog`, `overture_supply`, `census_prcs`, and `opportunity_map`. The prose changed. The pins did not clear.

Switching the same town to Restaurants changed the class, which a hardcoded bakery blurb would not do: “Competitive: strong taste, many businesses · taste #4 of 78. 821 establishments with employees, 24.4 per 10,000 residents against the median of 9.6. Qloo lists 941 places of this type; Overture, 1209.” 821 / 336,160 × 10,000 is 24.4. The arithmetic holds. The third suggested check still said “Compare with the gap-group towns on the map” after the town had just been labeled competitive.

**Scripted agent question.** “Where do Bad Bunny fans eat in San Juan?” About 1.5 s. Title “Bad Bunny fans in San Juan.” Five places, each “Photo · Qloo” and “Why it fits you Strong match for Bad Bunny fans,” 88% La Placita de Santurce, 87% La Victoria, 86% El Techo Rooftop Bar, 87% Los Kings Lounge, 86% Oasis Tapas & Lounge, with today’s hours. Closer: “Bad Bunny fans in San Juan cluster in Santurce and Condado, from taste data, not any connection to him.” Evidence: `artist_places San Juan, Bad Bunny, food → Qloo · 5 places · 0.3 s`, “2 rounds · answered 2026-10-24 08:36 UTC,” and truncated “Qloo IDs: FFE3…12E5, 1579…3370, …” “Ask again without Qloo” then said: “The artist-and-food tool that maps Bad Bunny fans to San Juan eateries is not available in this session, so I can’t give you a verified list. I won’t guess at places. … his Puerto Rico ties point fans toward Santurce and Old San Juan casual spots, not fine dining.” Evidence: “without Qloo tools · 0 tool calls · 1.0 s,” 1 round, same model, same minute. The five affinity cards stayed on screen above that refusal. A judge who only skims still sees the Qloo list.

`/compare` is titled “Zemi-Aku — with and without Qloo.” It says the seven pairs were “each asked twice of the same model with the same prompt and settings,” model “deepseek/deepseek-v4.1-flash via OpenRouter · same system prompt, 1200 max tokens, reasoning low, up to 4 rounds, no history,” “run 2026-10-24 08:23 UTC.” It also says the runs “are saved in compare-qloo.json and made by scripts/compare-qloo.mjs against a local server,” and “a place the second run names from general knowledge is not verified.” So this page is a saved transcript, not a button I fired. The saved San Juan Bad Bunny pair matches what I got live twenty minutes later: La Placita 88, La Victoria 87, El Techo 86. The saved “catalog without affinity” run, which still had the place catalog, named La Placita, Bebo’s Café, and Casita Miramar, and the line under the pair said “Qloo’s taste signal changed: La Victoria.” That is a narrower claim than “Qloo changed everything,” and it is checkable.

Other saved pairs showed refusals rather than smooth fiction. Mofongo in Ponce: `find_places Ponce, mofongo, taste → Qloo · 0 places`, then the model listed chains and said none had verified mofongo. Calle 13: `qloo_recommend … refused: Qloo could not answer this request. Do not guess.` Rincón: `map_town → refused: Too many tool calls in one round`. Bayamón cafés: one `town_catalog` call “refused: dropped to fit the request.” The page prints those failures.

**Off-script, judge side.**

- “Where should I open a bakery in Miami?” Caption only: “Zemi-Aku covers Puerto Rico’s 78 towns only, and Miami is not on this map. Name a town here and I’ll look.” No Evidence row, unlike every other answer. Asking in English also flipped the chrome back to “EN · Andromeda.”
- “¿Dónde comen los fans de Taylor Swift en Culebra?” Not a preset artist and not a preset town. `artist_places Culebra, Taylor Swift, food → Qloo · 6 lugares · 0.6 s`, “2 rondas · 08:41 UTC.” Zaco’s Tacos 68% “Hoy 5:00 pm–9:00 pm,” which matches Zaco’s published evening hours, on Calle Pedro Márquez, which matches the public address. Mamacita’s 66%, Susie’s 66%, The Krusty Krab 66% with a star rating and no hours, Heather’s Pizza 65%, Dinghy Dock 65%. The closer said these are “afinidades de Qloo, no vínculos con la artista ni prueba de demanda.” The English badge “Strong match for Taylor Swift fans” was not translated. A full Qloo image URL contained UUID `778A8B1F-3CC0-4305-95E5-E093F45435A2`, the same id the evidence line abbreviates as `778A…35A2`. The ids are not decoration. Yelp’s current listing titles Krusty Krab in Culebra “CLOSED” (page updated September 2026). The app still offered it as a strong match and did not say closed.

Front page claims I could not square with the app: “Take Qloo away and the island is blank” and “The agent never answers from memory. … Nothing is invented.” The compare page and the live without-Qloo captions both use general knowledge on purpose, and they label it. The front page also says Google image links 403 so the card uses an aerial; several live cards did load `images.qloo.com` photos. “16 agent tools” and “5 languages” are front-page counts. I saw the five language names. I only saw English and Spanish actually switch the UI. I did not count 16 tools.

I did not see a spinner failure, a stack trace, or an empty error banner. The ships / ports / “Search coastal records” controls are on the same map as the bakery tool. I did not exercise them.

## Defects

**High — Spanish closer mislabels Río Grande’s rate by 10×.** Steps: Español, ask “¿Dónde me conviene abrir una panadería en Adjuntas?”, read the Zemi-Aku paragraph under the record. It says Río Grande has “unos 0.65 por cada cien mil residentes.” The bakery map on the same visit says Río Grande is “0.7 per 10,000 residents,” and the English San Juan closer says “0.65 per ten thousand.” Someone comparing towns in Spanish can think Río Grande is almost empty per person. The Adjuntas card beside it (2.8 per 10,000) is the one that matches the Census arithmetic.

**Med — “Ask again without Qloo” does not replace the Qloo cards.** Steps: San Juan, Bakeries or the Bad Bunny question, open Evidence, press “Ask again without Qloo.” The caption and the tool list change. The place cards, stars, and affinity percentages stay above the new caption.

**Med — “gap group” advice is printed for towns that are not gaps.** Steps: San Juan, switch to Restaurants. Verdict is “Competitive.” The third next check still says “Compare with the gap-group towns on the map.” Same line in Spanish on Adjuntas, which the card calls “Competido.”

**Med — “Strong taste / mucha afinidad” is the top half, and it reads like a strong yes.** Adjuntas bakery is “gusto #32 de 76” and “mucha afinidad, muchos negocios” with 5 employer bakeries. The method note says the split is the island median. The words on the card do not say “just above the middle.”

**Med — Qloo’s bakery list for Adjuntas is thinner than the sources on the same page.** The visit line names two Qloo bakeries. Overture examples on that card add La Adjunteña and La Fé. Public listings show still more. The page does say coverage can be incomplete. The owner’s “go here” list does not include the extra Overture names.

**Med — A Yelp-closed Culebra restaurant is still a “strong match.”** Steps: ask “¿Dónde comen los fans de Taylor Swift en Culebra?” The Krusty Krab is in the six, ★ 4.2, no hours, badge “Strong match for Taylor Swift fans (66%).” Yelp’s listing is titled CLOSED. The app’s own hours disclaimer does not flag it.

**Med — Front page overclaims what the agent does.** “The agent never answers from memory” and “Nothing is invented” contradict the product’s own without-Qloo answers, which say “General knowledge only” and “I won’t guess at places” in the same breath as a historical sentence. “Take Qloo away and the island is blank” is stronger than `/compare`, where the second run still returns weather, Wikidata, and Wikipedia.

**Low — Miami refusal has no Evidence line.** Every other answer I got printed the model, the round count, and the tool list. “Miami is not on this map” is a caption with a dismiss button and nothing else. I cannot see whether a model ran.

**Low — Language chrome is inconsistent.** UI language is hidden in the voice control. English questions flip “ES · Selena” back to “EN · Andromeda.” Tour titles, “Strong match…,” “Photo · Qloo,” “Bakery · Adjuntas,” and the record’s “Sources: Qloo’s saved catalog…” stay in English on a Spanish page. Category mix-in (pizza under a bakery follow-up) makes the Spanish cards harder to trust.

**Low — Cesium commercial watermark on the public map.** “Upgrade for commercial use.” sits on `/app` at desktop and at 390 px.

**Low — One Qloo photo did not load, and phone cards are a sideways scroll.** Image `…/5DEBEA4A-…-outside.jpg` had natural size 0. At 390 px, `ul.answer-cards` is a 342 px scroller holding 1,720 px of cards. The ask field measured 178 px wide.

**Low — Distances do not say from where.** “7.7 km” and “4.0 km” appear with no origin. La Placita and El Techo shared 7.7 km, which may be distance from a town centroid. An owner cannot tell.

## Scores

**Intelligent and thoughtful use of LLMs + the Qloo API: 4.** Live evidence shows named Qloo tools, sub-second Qloo calls, ids that match image URLs, a rule-based verdict the UI admits, and a without-Qloo rerun that drops those tools and refuses the list; the same model then misstates a per-capita rate in the Spanish closing, so the LLM is not yet safe as the voice of the numbers.

**Technical implementation and execution: 4.** Logged-out `/app` and `/compare` loaded in under 1.3 s, Spanish UI actually switched, answers returned in 0.5–3.5 s with sources, and the phone page did not overflow the document; leftover English, the gap-town boilerplate, a missing Evidence row, and a closed place still in the list keep it short of a finished build.

**Originality and creativity: 4.** Scoring all 78 towns as taste-versus-Census supply, then letting an artist query hit the same map, plus a published with/without ablation, is a specific product and not a chat box on an API; the ships, ports, and coastal-search controls on that same map feel like a second app.

**Real-world application and potential impact: 3.** A Spanish-speaking owner can get a sourced screening, real bakeries, hours that matched a public listing, and a hard refusal to invent rent or a lease address; she cannot yet use the Spanish town-to-town sentence, or the word “mucha,” to choose where to open.

## Top 3 changes that would raise the score, in order

1. Freeze the numbers. Show the rule sentence from the table in both languages, and do not let the model restate a rate. The Río Grande line is the one that can change a decision, and it is the model’s sentence, not the table’s.
2. Make “without Qloo” replace the cards, and make the front page match the evidence panel. Say that the verdict is rule-based, that the model writes the close, and that a run with the tools off falls back to labeled general knowledge. The saved compare page already tells this truth. The homepage and the lingering cards do not.
3. Put the owner’s next step in one plain Spanish sentence, and make the list match the caution. “Adjuntas ya tiene unos 5 negocios con empleados, más por persona que la mediana; vaya a estos y a los que Overture también ve.” Drop “compare con el grupo brecha” when the town is competitive. Mark places with no hours, or a public closed flag, as unchecked. Include the Overture bakeries the Qloo visit line skipped.

## What a rival entry would need to beat this

A rival has to beat a live ablation, not a pitch. This entry already shows the tool names, the model, the timestamp, truncated Qloo ids that match real image URLs, and a same-model rerun that loses the taste list. A saved `/compare` from the same morning agreed with a question I asked live. Beating that means a judge can press one control and watch the Qloo-specific places disappear, in the language of the question, with no leftover cards and no second narrator that “fixes” a rate by a factor of ten.

On the decision itself, a rival needs a supply list a local owner cannot immediately out-count. Here Census said 5 Adjuntas bakery establishments, Qloo’s visit line showed 2, and the open web shows more, including names this app’s own Overture fold already had. A rival that names those, says which source missed them, and still refuses to invent sales would be the one I would hand to the bakery owner. Freshness matters on the same axis: recommending a Culebra restaurant whose public listing says closed is an easy way to lose to a thinner app that checks.

The ships-and-ports layer, the Cesium paywall line, and the English scraps are not what decides it. The ablation and the refusal to invent a lease are. A prettier map that cannot show “here is the answer, here is the same question with Qloo turned off” does not beat this.
