# Blind evaluation — Zemi-Aku (2026-10-24)

Evaluator saw only the public site (and this brief). No project files, no repo checkout.

## Browser used

Playwright, through the connected `playwright-extension` browser (Chromium). The separate `playwright` MCP server failed its handshake (`Transport ... Send message error`), so that server was not used. Nothing was installed globally.

Desktop pass: viewport 1940×912. Phone pass: `setViewportSize` 390×844 (measured inner size 390×845). No microphone, no "Talk with Zemi-Aku", no dictate. Speech playback pressed once: "Escuchar esta voz".

Timed loads (`performance` navigation timing):

- `https://zemi.r21digital.com/` — TTFB 181 ms, DOMContentLoaded 867 ms, load 2075 ms. `documentElement.lang` was `en`.
- `https://zemi.r21digital.com/app` — TTFB 26 ms, load 500 ms.
- `https://zemi.r21digital.com/compare` — TTFB 27 ms, load 589 ms. Page `lang` was `en` even after the app had been switched to Spanish.

Eight model turns, under the cap. Three came from the scripted path (San Juan bakeries, San Juan restaurants, the Bad Bunny question). One was the on-screen control "Ask again without Qloo". Four were extra questions, three of them in Spanish, one of those about Maricao, one deliberately vague, one a fake place name, one a request for a monthly profit number.

## Persona A walkthrough (Puerto Rico bakery owner, Spanish first)

She opens the front page logged out. The page is English. Title: "Zemi-Aku — Where should you open in Puerto Rico?" The only navigation she can use without guessing is "Live map", "Code", "What Qloo brings", "With and without Qloo", "How it works". There is no Español control on this page. The hero is aimed at a hackathon reader, not at her:

> Zemi-Aku scores all 78 towns by Qloo taste for your industry against the businesses the Census already counts there, shows sources for every number, and lets you ask follow-ups in English or Spanish.

The sample already selected is "Bad Bunny", with this line under the chips:

> Qloo infers Bad Bunny fan taste → top towns Bayamón, San Juan, Carolina. Sample spots: TocaMadera Café, Los Socios Cafe (affinities, not endorsements).

Coverage counters on the same screen: "78 Towns", "7,717 Places on Qloo", "16 Agent tools", "5 Languages". A Cesium frame sits in the hero with a visible "Upgrade for commercial use." link. She would not know what Cesium is. Far down, the page does admit limits in plain English, including:

> It is not a census. A town's catalog is every place Qloo holds there, not every business that exists.

> Hours and contact lines can be stale in Qloo's feed; check before you go, especially for holidays.

> French, Italian and German are answered and spoken by the agent (Deepgram Aura-2 voices, added October 14); the rule-based fallback writes English and Spanish only.

She follows "Find a town to open in" to `/app`. Still no login. The screen asks "Where should I open a business in Puerto Rico?" and offers Cafés, Bakeries, Restaurants, Bars, Hotels, Salons, plus Bad Bunny, Vico C, and Obie Bermúdez. The language control reads "EN · Andromeda". She would not read that as "change the language."

She taps Bakeries. A panel opens immediately (no wait that felt like a model call): "Where should I open a bakery?" and "Tap a town on the map or below to see its numbers." The legend is careful:

> Taste compared with existing businesses. Not a measure of demand, revenue or profit.

The ranked "gap" towns start at Río Grande ("taste #2 of 76 · 0.7 per 10,000 residents"), then Luquillo, Fajardo, then San Juan ("taste #5 of 76 · 0.5 per 10,000 residents"). She taps San Juan because that is the city she knows. The URL becomes `/app#town=San+Juan`. The panel says:

> Gap: taste above the median, few businesses · taste #5 of 76. 16 establishments with employees, 0.5 per 10,000 residents against the median of 1.3 the groups split on. Qloo lists 37 places of this type; Overture, 64.

"Few businesses" next to 16 establishments, 37 Qloo bakeries, and 64 Overture places is the sentence she would misunderstand. The sources, which she can open under "Sources and limits", do explain the median split, and they date the taste layer:

> Taste: Qloo heatmap affinity for bakery, averaged over the town's map cells, retrieved 2026-10-11.

> Businesses: U.S. Census Bureau, County Business Patterns 2023. Excludes the self-employed and government. Census does not publish counts below 3, so a town without a published count has 0–2 establishments in this industry.

Under "What it cannot tell you":

> Demand, sales, rents, foot traffic, permits or profit. Hours are a snapshot of the catalog on its date.

Named next checks include "Panaderia y Reposteria America, El Horno de Pane, Panadería y Repostería la Ceiba" and, from Overture, "Panaderia Siglo 21 and Panadería La Nueva Frontera(Julie)". The missing space before "(Julie)" looks like a raw feed, which is reassuring and sloppy at the same time. Census context on the same card: population 336,160, median household income "$27,992 ± $1,036 (90%) · 2024-adjusted dollars."

A short answer appears in the bottom composer area, labeled as taking 0.4 s:

> San Juan is a gap for bakeries: taste above the median, rank 5 of 76, and few businesses, 16 establishments with employees, about 5 per hundred thousand residents against a median of 13. Qloo lists 37 and other map data 64. A lead, not proof: visit and check rents. See Panaderia y Reposteria America and El Horno de Pane, checking their opening hours. Compare with Río Grande, which has more businesses of this type per resident.

Opened "Evidence · business research · sources + live model · 4 sources · 0.4 s". It lists `town_catalog`, `overture_supply`, `census_prcs`, and `opportunity_map`, then:

> The verdict sentence is rule-based from these sources; the model wrote the closing sentences from the same data · Model deepseek/deepseek-v4.1-flash via OpenRouter · 2026-10-24 22:42 UTC

The 0.5-per-10,000 figure and the "5 per hundred thousand" figure are the same rate in different units. She would not do that conversion. Place cards under the verdict say "Today" plus a clock range (for example Panaderia y Reposteria America, "Today 6:00 am–9:00 pm", ★ 4.6, 4.8 km). The sources say hours are a catalog snapshot. The cards say Today.

She then finds the language control, switches the combobox to Español, and the button becomes "ES · Selena". `lang` flips to `es`. A lot of the app translates: "Puerto Rico, a través del gusto de Qloo", industry chips "Cafeterías / Panaderías / Restaurantes / Barras / Hoteles / Salones de belleza", suggestions "Dónde abrir una panadería" and "Abrir un restaurante en Ponce". The open Bad Bunny panel and the tour buttons stay in English ("Where Bad Bunny's fans eat", "Vico C, into real places"). The ask box's accessible name stays "Ask Zemi-Aku, or search a town or place".

Questions she asked, in order, and what came back. The question text itself never appeared in the transcript. Each new answer replaced the previous one. After the third question, the San Juan bakery paragraph and the Bad Bunny paragraph were gone from the page text.

1. "¿Qué panaderías tiene Qloo en Maricao?" The map hash changed to `#town=Maricao`. Answer, "Evidencia · modelo en vivo · 2 llamadas · 2,0 s":

> En Maricao, Qloo tiene una panadería: Erik's Bakery and Pastry Shop, en la Ave. Pedro Albizu Campos, con panes, pasteles y café, hoy de 6:00 am a 9:00 pm. Es el segundo lugar de comida que Qloo registra en el pueblo, junto a Lee Mary's Pizza. Esa lista viene de Qloo, no de un listado de negocios en venta, y no dice cuánta clientela hay. Verifique el horario antes de ir.

Evidence: `town_catalog Maricao, food → Qloo · 2 lugares · catálogo medido 2026-10-07`, two Qloo ids, model "deepseek/deepseek-v4.1-flash vía OpenRouter", answered 2026-10-24 22:46 UTC. The side panel later said "VER LOS 4 LUGARES EN MARICAO" and "2 de 4 en el mapa". The other two names sitting in that panel were "Vivero de Peces de Maricao" and "Casa Alcaldía de Maricao", so the town's whole Qloo set is a bakery, a pizza shop, a fish hatchery, and city hall. The same panel still had an English block, "What Maricao loves Qloo", listing Residente, Tommy Torres, Bad Bunny, and TV titles, with "● stands out here: not in Puerto Rico's own top list."

2. "¿Dónde abro algo rico cerca de lo bueno?" She did not name an industry or a town. The app stayed on Maricao and answered as if she had asked where to open a restaurant:

> En Maricao, para restaurante, el grupo es brecha. El gusto está sobre la mediana, rango 29 de 78, pero el Censo no publica conteos menores de 3: hay de 0 a 4 establecimientos, y la tasa es 0 por cada 10,000 residentes frente a la mediana de 9.6. Es una pista para visitar, no prueba de demanda. Antes de decidir, pase por Erik's Bakery and Pastry Shop y por Lee Mary's Pizza, y observe qué falta en el pueblo.

Evidence, 2.6 s, 3 calls: `opportunity_map restaurant, Maricao` "leído 2026-10-11 07:14 UTC", `map_town`, and the same food catalog of 2 places. It did not ask what "algo rico" or "lo bueno" meant.

3. "¿Cuánto voy a ganar al mes si abro la panadería mañana en Maricao?" This is the answer she most needs, and it refused:

> No puedo decirle cuánto va a ganar. Ni Qloo ni el Censo traen ventas, márgenes o ingresos, y Maricao no publica conteo de panaderías menores de 3, así que faltan los datos base. Lo único que tengo es afinidad de gusto y conteos de negocios observados, que no son demanda ni prueba de rentabilidad. Tampoco hay precios de alquiler ni tráfico peatonal en los datos. Cualquier cifra mensual sería inventada.

"Evidencia · modelo en vivo · 0 llamadas · 0,6 s". Same model, 1 round, 22:47 UTC. Still offered "Preguntar otra vez sin Qloo" on an answer that had already used no Qloo tools.

4. "¿Y en Atlántida, Puerto Rico?" Hash stayed `#town=Maricao`. 0 calls, 1.8 s:

> Atlántida no es un municipio, así que no tengo mapa, clima ni conteos para ese nombre. Por conocimiento general, Playa Atlántida queda en Yauco, en la costa. Si lo que busca es ese sector, los datos de panadería que tengo son a nivel de municipio, no de barrio o playa, y no cubren cuánta clientela habría allí. En Maricao tampoco hay tasa publicada de panaderías. Con lo que hay, no puedo comparar ese lugar.

The refusal of the fake municipality is right. The beach sentence is presented as general knowledge. A quick public search did not confirm a "Playa Atlántida" in Yauco. The English Wikipedia page for Yauco names Playa Ballenas and Atolladora Beach. Treat that beach line as unverified.

On a 390px-wide window the app remembered Spanish. The sheet for Panaderías is usable: "¿Dónde abro una panadería?", "Toque un pueblo en el mapa o abajo para ver sus números.", and the same Río Grande row. The ask field is the problem. The visible placeholder is cut to "Pregunte por un pue" because a Cesium bar sits on top of it: "CESIUM ion Upgrade for commercial use. Data attribution". The legend rows wrap mid-phrase ("pocos negocios" split across lines), and the composer covers the bottom of the sheet, including the start of the "Saturado" line. Tour chips on that phone screen stayed English. One playback: "Escuchar esta voz" changed to a button labeled "Pause", with the note "Voces de Deepgram. Pasado el límite diario, habla la voz de su dispositivo." No `<audio>` element and `speechSynthesis.speaking` was false a moment later. This environment cannot confirm sound came out. The control did change, and no new console error appeared for that click. The only console error in the session was a 404 for `https://icons.duckduckgo.com/ip3/facciolapr.com.ico`.

## Persona B walkthrough (judge, ten minutes, is the agent real)

Logged-out `/app` has no account wall and no obvious fixture banner. The first bakery verdict is labeled rule-based plus a named model, with a timestamp from this session (22:42 UTC) and four source ids. That is a real trace, and it is also a narrow use of the model: the numbers are from a saved map retrieved 2026-10-11, and the model writes the closing lines. 0.4 s fits that design. It does not fit a story in which every sentence is a fresh Qloo reasoning loop.

Changing the industry chips to Restaurants, still on San Juan, replaced the verdict. Panel:

> Competitive: taste above the median, many businesses · taste #4 of 78. 821 establishments with employees, 24.4 per 10,000 residents against the median of 9.6 the groups split on. Qloo lists 941 places of this type; Overture, 1209.

Answer, evidence "4 sources · 0.6 s":

> San Juan is competitive for restaurants: taste above the median, rank 4 of 78, but many businesses, 821 establishments with employees, about 244 per hundred thousand residents against a median of 96. Qloo lists 941 and other map data 1209. Compare what two local competitors sell. Visit La Placita de Santurce, The Cheesecake Factory and Chocobar Cortés; check their opening hours. Maunabo has fewer businesses of this type per resident than San Juan.

The industry change moves both the quadrant and the named places. La Placita's card in that list read "Today 5:00 pm–3:00 am", ★ 4.7, 7.7 km.

Typed, exactly: "Where do Bad Bunny fans eat in San Juan?" Answer in about two seconds, "Evidence · live model · 2 tool calls · 1.7 s":

> Bad Bunny fans in San Juan lean toward La Placita de Santurce, a market plaza with food stalls and dancing, and La Victoria on Calle Loíza. Los Kings Lounge is another strong pick, open late for quick bites. These are affinities from Qloo taste data, not places tied to the artist. Check today's hours before you go, since they change. La Placita de Santurce is the first stop.

Cards under it, each with "Photo · Qloo" and "Why it fits you Strong match for Bad Bunny fans" at 88%, 87%, 87%, 86%, 86% for La Placita, La Victoria, Los Kings Lounge, El Techo Rooftop Bar, Oasis Tapas & Lounge. La Placita's card in this list read "Today 5:00 pm–12:00 am". Same rating, same 7.7 km, different closing time than the restaurant card a minute earlier. Evidence, opened:

> artist_places San Juan, Bad Bunny, food → Qloo · 5 places · 0.3 s
> map_town San Juan → done
> Model deepseek/deepseek-v4.1-flash via OpenRouter · 2 rounds · answered 2026-10-24 22:44 UTC
> Qloo IDs: FFE3…12E5, 1579…3370, 5B5D…D116, 10E8…3AB7, 55C6…A362

The ids are truncated. The percents are not printed next to those ids, so 86 versus 88 cannot be checked from the drawer. The tool name and the five-place count do match the five cards.

"Ask again without Qloo" on that answer produced a side-by-side, "Evidence · live model · without Qloo tools, no history · 1 tool call · 2.0 s", tool line `landmarks San Juan → Wikidata`, same model, "2 rounds", timestamp still "22:44 UTC" (the click was at 22:44:50Z, so the minute stamp is coarse):

> With Qloo: Bad Bunny fans in San Juan lean toward La Placita de Santurce, a market plaza with food stalls and dancing, and La Victoria on Calle Loíza. Los Kings Lounge is another strong pick, open late for quick bites. These are affinities from Qloo taste data, not places tied to the artist. Check today's hours before you go, since they change. La Placita de Santurce is the first stop.

> Without Qloo: I don't have the fan-taste tool loaded here, so I can't name verified Bad Bunny fan eateries in San Juan. My San Juan results are Wikidata landmarks, not restaurants: San Juan National Historic Site, Villa Victoria and Casa Vigil, all historic rather than culinary. As general knowledge, not a data point, his song "La Perla" points to that Old San Juan barrio, which I can show on the map. Restaurant names, menus and prices simply aren't in my data.

> Qloo changed: La Placita de Santurce, Los Kings Lounge

> The places the with-Qloo answer put on the map and in the list were removed.

The prose control is real: the second voice refuses restaurant names and names landmarks instead. The removal sentence was false on the same screen. The side panel was still titled "Bad Bunny fans in San Juan" and still listed La Placita de Santurce, La Victoria, and Los Kings Lounge under "Qloo places". A wider read of that panel at the same moment also showed hotels (Condado Vanderbilt, San Juan Marriott, Caribe Hilton, Sheraton) and "Isla Verde Beach" under "Places to stay", with category counts Food 2, Places to stay 5, Shopping 1. Villa Victoria as a landmark, beside a restaurant named La Victoria, is the kind of near-miss a judge should not wave through without the Wikidata record. The drawer says the tool was Wikidata. It does not show the Wikidata ids.

`/compare` is a separate, fast, English page, "With and without Qloo." It is a saved run, and it says so:

> Seven questions, each asked twice of the same model with the same prompt and settings. The first run has Zemi-Aku's Qloo tools. In six pairs the second run keeps only the map, the weather, Wikidata landmarks and Wikipedia history. In the last pair the second run also keeps Qloo's place catalog and loses only the taste tools, so the difference is Qloo's affinity signal, not the existence of a catalog.

Header line: "Model deepseek/deepseek-v4.1-flash via OpenRouter · same system prompt, 1200 max tokens, reasoning low, up to 4 rounds, no history, no open town" and "run 2026-10-24 22:24 UTC". Footer:

> The runs are saved in compare-qloo.json and made by scripts/compare-qloo.mjs against a local server. Since October 23 every live model answer in the app offers Ask again without Qloo, the same control run on demand. Catalog places are matched by name against what the Qloo run put on the map; a place the second run names from general knowledge is not verified.

That matches what the live button did. The saved pairs also show the limit of the claim. "Where do Bad Bunny fans eat in Bayamón?" with Qloo names Los Socios Cafe (83%), TocaMadera Café (82%), Hacienda Carrión Café de Altura (81%). Without Qloo it refuses and names the Juan Ramón Loubriel stadium, the Rubén Rodríguez coliseum, and the José Celso Barbosa house museum. "¿Dónde comer mofongo en Ponce?" is better still: `find_places Ponce, mofongo, taste → Qloo · 0 places`, and the answer says there is no verified mofongo match, then offers Viktor Pollo and La Guarina Bakery as criolla substitutes. The without-Qloo side refuses to invent restaurant names and points at Plaza del Mercado as general knowledge.

The last pair is the one that keeps the catalog and drops only affinity, for the same San Juan Bad Bunny question. With affinity, La Placita, La Victoria, El Techo. Catalog only:

> I can't pull artist-fan affinity data here; that tool isn't available in this session. What I can share is Qloo's food places in San Juan, 942 listed. For a Bad Bunny kind of night, La Placita de Santurce in Santurce fits: food stalls, bars, live music and dancing until 3 am. For a sit-down meal, Bebo's Café on Loíza serves mofongo and roast chicken, and Casita Miramar in Miramar does Caribbean plates in a colorful old setting.

`town_catalog San Juan, food → Qloo · 942 places · measured 2026-10-07`. The diff line is only "Qloo's taste signal changed: La Victoria". So with the catalog left on, the model still narrates a "Bad Bunny kind of night" and still names La Placita. The live app, which strips the Qloo tools entirely, did not do that. Both results were on the public site. The catalog count is 942 here and 941 on the live San Juan restaurant panel. La Placita's close is "until 3 am" in this saved answer, 3:00 am on the live restaurant card, and 12:00 am on the live fan card.

Other saved traces worth keeping: Maricao "with Qloo" records `town_weather → refused: Too many tool calls in one round; ask for this one next.` and then a successful National Weather Service call. Rincón's two weather summaries do not match each other (with Qloo: "60 to 70 percent" Sunday and Monday thunderstorms; without: "40 percent tonight and 60 percent Sunday afternoon"). Same tool name, two paraphrases. At 390px the compare page did not overflow horizontally (`scrollWidth` 375). It is a long English essay. A judge can finish it. The bakery owner would not.

## Defects

1. **High.** After "Ask again without Qloo", the answer says the Qloo places were removed from the list, and the list still shows them. Steps: `/app`, Restaurants or the Bad Bunny question, ask "Where do Bad Bunny fans eat in San Juan?", open Evidence, press "Ask again without Qloo". Observed chat text: "The places the with-Qloo answer put on the map and in the list were removed." Observed panel at the same time: heading "Bad Bunny fans in San Juan", top picks La Placita de Santurce, La Victoria, Los Kings Lounge.

2. **Med.** Same place, three closing times. Steps: on San Juan, switch to Restaurants and read La Placita ("Today 5:00 pm–3:00 am"); ask the Bad Bunny question and read La Placita ("Today 5:00 pm–12:00 am"); open `/compare` and read the catalog-only paragraph ("dancing until 3 am"). The research panel says hours are a catalog snapshot. The cards say "Today" / "Hoy".

3. **Med.** Unpublished Census count printed as a rate of zero and as "0 a 4". Steps: Spanish UI, ask "¿Dónde abro algo rico cerca de lo bueno?" while Maricao is the open town. Answer: "hay de 0 a 4 establecimientos, y la tasa es 0 por cada 10,000 residentes". The bakery source note on the same app says a missing Census count is 0–2, and that a town is "datos insuficientes" unless even 2 establishments would stay under the median. The profit answer later got this right: "Maricao no publica conteo de panaderías".

4. **Med.** Phone width 390. The ask placeholder renders as "Pregunte por un pue". The Cesium bar "Upgrade for commercial use. Data attribution" covers the bottom of the field. The same bar is on the desktop map. The bottom sheet for "¿Dónde abro una panadería?" is partly hidden behind the composer, so "Saturado" is cut off until the sheet is scrolled. "Toque un pueblo en el mapa" is hard while the sheet covers the map.

5. **Med.** Spanish is partial. Homepage has no language control (`lang=en`). Inside `/app`, tour buttons stay English ("Where Bad Bunny's fans eat", "Vico C, into real places", "Ponce, en español"), the ask box accessible name stays English, the industry group is still named "Where should I open…", and the Maricao panel contains "What Maricao loves Qloo". `/compare` is English only.

6. **Med.** The composer shows one answer. The question is not printed. Asking the next question removes the previous answer from the page. A owner cannot put the San Juan bakery note next to the Maricao note without asking again.

7. **Low.** San Juan bakery copy uses "0.5 per 10,000" in the panel and "5 per hundred thousand" in the model note (median 1.3 vs 13). Restaurants do the same (24.4 per 10,000 vs 244 per 100,000). The arithmetic matches. The labels do not.

8. **Low.** Erik's Bakery and Pastry Shop is subtitled "Restaurant · Maricao" on the Maricao top-picks row after a question about panaderías. The list category under it says "Comida".

9. **Low.** "Panadería La Nueva Frontera(Julie)" in the San Juan bakery next-steps, and a 404 for the DuckDuckGo favicon of facciolapr.com. Overture name and a missing icon, not a broken answer.

10. **Low.** "Preguntar otra vez sin Qloo" is offered on the profit refusal, which already recorded "0 llamadas". Pressing it would spend another model call to remove tools that were not used.

## Scores

1. **Intelligent and thoughtful use of LLMs + the Qloo API: 4.** Live evidence named `artist_places`, `town_catalog`, `opportunity_map`, and a Wikidata fallback, identified deepseek-v4.1-flash via OpenRouter, and a without-Qloo rerun refused to invent Bad Bunny restaurants; the model is fenced to short closings over a 7 October catalog and an 11 October taste map, and a vague Spanish question was silently rewritten as "open a restaurant in Maricao."

2. **Technical implementation and execution: 4.** Logged-out `/app` and `/compare` loaded in about half a second, eight asks returned without an error toast, and the phone sheet plus Spanish switch mostly work; the Cesium license bar covers the phone field, prior answers disappear, and La Placita's hours do not survive three views.

3. **Originality and creativity: 4.** Scoring all 78 towns as taste-versus-Census quadrants, then putting an artist affinity and a saved with/without-Qloo ablation on the same public site, is a specific product, not a chat box on top of a taste API.

4. **Real-world application and potential impact: 3.** A Spanish-first owner can reach a sourced "visit these shops, this is not profit" answer, including an explicit refusal to invent monthly earnings, but the homepage is English, San Juan bakeries are called "few" while 16 employee establishments and 37 Qloo bakeries are on the card, small-town coverage is four Qloo records including a hatchery and city hall, and the Census note says the self-employed are excluded.

## Top 3 changes that would raise the score

1. Make the without-Qloo control true on the map and the list, not only in the paragraph. If the sentence says the fan places were removed, the "Bad Bunny fans in San Juan" picks have to clear, and the drawer should show the Wikidata ids the way it shows truncated Qloo ids. That is the difference between a judge believing the ablation and a judge catching it.

2. Print one hours string per place, labeled with the catalog date (measured 2026-10-07) instead of "Today" / "Hoy", and print unpublished Census cells as "not published, 0–2" with no rate of 0 and no "0 a 4". The Maricao restaurant sentence and the three La Placita closes are the lines that make the careful source notes look optional.

3. Finish the Spanish phone path: a language control on the homepage, translated tour chips and accessible names, the Cesium "Upgrade for commercial use" bar off the ask field, and a transcript that keeps the question and the last few answers. She cannot use a tool she cannot read or a field she cannot see.

## What a rival entry would need to beat this

A rival has to beat the ablation, not the map. This entry already shows the same model with Qloo, without Qloo, and with the catalog but without affinity, and it names the model, the token cap, and the day the pairs were saved. Beating it means a control that stays honest when the list and the paragraph disagree, a catalog or a live call whose hours and place counts do not drift between two cards, and a Spanish-first phone flow a bakery owner can finish. Adding a prettier globe, or another artist chip, would lose to the page that already prints "Qloo changed: La Victoria" and "0 places" for mofongo in Ponce.
