# Zemi-Aku blind evaluation

Public demo only. I did not open the repository, the project tree, or any doc under the Brain checkout.

## Browser used

T3's collaborative browser, incognito, opened `https://zemi.r21digital.com/app`. That tab's navigation timing was TTFB 16 ms, DOMContentLoaded 446 ms, load 447 ms, about 181 KB transferred. The page title was "Zemi-Aku — ask Puerto Rico" and the UI came up in English. `preview_snapshot` then failed twice with `Preview automation snapshot timed out after 15000ms`, so I switched to the Playwright extension in the signed-in Chrome profile and did the rest of the test there.

That Chrome rendered the same URL in Spanish (`lang=es`, voice chip "ES · Selena"). Desktop viewport was 1455×639, then 390×845 for the phone check. I did not press the microphone or the speaker. Selecting San Juan, and later switching that town to Restaurantes, each caused a `POST /api/speak` that returned 200. I did not hear whether audio played.

No login screen appeared. I treated the session as logged out.

## Persona A walkthrough (what you did, what you saw, quotes of on-screen text)

Persona A is a Puerto Rico owner who reads Spanish first and wants a bakery site. Observations below are hers unless marked.

**Landing, `/app`.** A dark satellite map of the island, Cesium ion logo, and the line "Upgrade for commercial use." Header: "Zemi-Aku" / "Puerto Rico, a través del gusto de Qloo". The only heading: "¿Dónde abro un negocio en Puerto Rico?" Under it: "El gusto de Qloo en los 78 pueblos, frente a los negocios que el Census ya cuenta. Escoja una industria." Six industry chips: Cafeterías, Panaderías, Restaurantes, Barras, Hoteles, Salones de belleza. Then "O empiece por un artista": Bad Bunny, Vico C, Obie Bermúdez. Then "Ver un recorrido", but the three tour buttons stayed in English: "Where Bad Bunny's fans eat", "Vico C, into real places", "Ponce, en español". Prompt chips in Spanish: "Dónde abrir una panadería", "Abrir un restaurante en Ponce", "Dónde surfear en Rincón", "Dónde comer mofongo". The ask field placeholder was "Pregunte por un pueblo o busque un lugar", with a mic, "ES · Selena", and a blue send button. "Movimiento de cámara activado" sat at the lower right. The first real click on Panaderías timed out: the button was not stable while that motion was on. I turned motion off ("Movimiento de cámara apagado") and continued.

**Panaderías.** A left panel replaced the hero. Eyebrow "PUERTO RICO · DÓNDE ABRIR", heading "¿Dónde abro una panadería?", Panaderías shown pressed. Instruction: "Toque un pueblo en el mapa o abajo para ver sus números." The map became a choropleth. Legend, in the panel:

- "Brecha: afinidad sobre la mediana, pocos negocios"
- "Competido: afinidad sobre la mediana, muchos negocios"
- "Tranquilo: afinidad bajo la mediana, pocos negocios"
- "Saturado: afinidad bajo la mediana, muchos negocios"
- "Datos insuficientes"

The disclaimer she would actually use was on this same screen: "Gusto comparado con los negocios que ya existen. No mide demanda, ingresos ni ganancias." Sources in the same block: Census County Business Patterns 2023, with the self-employed and government left out, and "un pueblo sin cifra publicada tiene de 0 a 2 establecimientos"; Qloo bakery heatmap "obtenida el 2026-10-11"; population "Puerto Rico Community Survey 2020–2024"; "Datos de gusto de la API de Qloo (acceso del hackathon). Las afinidades describen patrones culturales agregados, no a personas. Las clasificaciones e interpretaciones son de Zemi-Aku."

Under "Más gusto y pocos negocios" the first rows were Río Grande "gusto #2 de 76 · 0.7 por cada 10,000 residentes", Luquillo "#3 · hasta 1.1", Fajardo "#4 · 1.0", San Juan "#5 · 0.5", Loíza "#6 · hasta 0.9", Rincón "#7 · hasta 1.3", Guaynabo "#9 · 0.6", Carolina "#11 · 0.4". Footer: "Los puestos son entre los 76 de 78 pueblos con datos de gusto de Qloo." She noticed the list starts at #2 and skips #8 and #10. Nothing on that list says where #1 went.

**San Juan.** Clicking the San Juan row changed the URL to `/app#town=San+Juan` and replaced the panel. On screen: "Explorar negocios · San Juan". "Lugares registrados por Qloo, no negocios confirmados en venta. Afinidad, demografía y oferta observada no prueban demanda ni rentabilidad." "37 lugares en el catálogo guardado de Qloo. Comida: 37". "Lo que dicen los datos": "Brecha: afinidad sobre la mediana, pocos negocios · gusto #5 de 76. 16 establecimientos con empleados, 0.5 por cada 10,000 residentes frente a la mediana de 1.3 con la que se dividen los grupos. Qloo registra 37 lugares de este tipo; Overture, 64." It explains the gap between those counts: Census is NAICS 311811, employee retail bakeries only; Qloo and Overture include places without employees and other tags.

"Lo que no puede decir": "Demanda, ventas, rentas, tráfico peatonal, permisos ni ganancias. Los horarios son una foto del catálogo en su fecha."

"Tres pasos siguientes" told her to visit Panaderia y Reposteria America, El Horno de Pane, and Panadería y Repostería la Ceiba at opening and watch the line, then ask about rent and permits, then compare the next gap town. Overture line: "64 lugares registrados de este tipo · publicación 2026-09-23.1." Census block: population 336,160, "Ingreso mediano del hogar: $27,992 ± $1,036 (90%) · dólares ajustados a 2024." Another line: "16 establecimientos · 237 empleados (County Business Patterns 2023)".

The place list is long and specific (hours, star ratings, distance, "Cómo llegar" opening Google Maps). Examples she read: Panaderia y Reposteria America, 4.8 km, ★ 4.6, "Hoy 6:00 am–9:00 pm"; Panadería Mallorca "sin horario publicado"; Drunken Cookies "Cerrado hoy"; Lucía - Pâtisserie + Café; Cafetería ABEL. Sobao Bakery & Restaurant appears twice, 2.3 km and 8.2 km, with different map links. Calling Drunken Cookies and a café "panaderías" is the kind of thing she would argue with. The panel does warn that the Qloo list is wider than the Census code.

**Sources she opened.** "Ver ejemplos de Overture" listed Panaderia Siglo 21, Panadería La Nueva Frontera(Julie), Mantecaditos Doña Luchy, Panaderia Casa Pan, Pannera. "Fuentes y límites" repeated the Census, Qloo date, and hackathon-access paragraph, plus a "Definiciones" control. "Fuentes y el registro detrás de esta respuesta" showed the question the app asked for her, "¿Debo abrir una panadería en San Juan?", the same not-for-sale disclaimer, then in English: "Sources: Qloo's saved catalog for local context." "Observed supply: Overture release 2026-09-23.1. Dataset coverage, not a verified competitor census." "Demographics: Census PRCS 2020–2024. Municipality estimates, not business revenue." And "Copiar resumen". Links out: ClasificadosOnline, BizBuySell, and a Google search for businesses for sale in San Juan. Those sale links are not bakery listings. She would not know that from the label "Buscar anuncios de San Juan en la web".

Inside the Spanish panel, several controls stayed English: "By category", "Ask Zemi-Aku", "All places", "Restaurants", "Compare with…", "About this town".

**Switch to Restaurantes, still San Juan.** About 30 seconds. The panel then said "941 lugares en el catálogo guardado de Qloo. Comida: 941" and "Competido: afinidad sobre la mediana, muchos negocios · gusto #4 de 78. 821 establecimientos con empleados, 24.4 por cada 10,000 residentes frente a la mediana de 9.6". Overture 1,209. The visit list changed to La Placita de Santurce, The Cheesecake Factory, and Barrachina. La Placita's card was labeled "Bar · San Juan", ★ 4.7. For her, the category change was real: bakery "brecha" and 16 Census shops became restaurant "competido" and 821. The wait was long enough that she would have assumed it froze.

**Her own questions, still this session.**

"¿Conviene abrir una panadería en Maricao?" The on-screen answer: "No hay datos suficientes para panaderías en Maricao: sin cifra publicada, de 0 a 2 establecimientos, y afinidad puesto 37 de 76. Qloo registra uno y otros datos del mapa uno. Visite antes de decidir. Puede visitar Erik's Bakery and Pastry Shop y comprobar su horario de apertura. No hay cifra publicada para Maricao, así que no se compara con Río Grande." The URL became `#town=Maricao`. That is the right kind of answer for a small town: it refuses a rank and names one place. A public web listing puts Erik's Bakery at 2 Ave. Pedro Albizu Campos, Maricao 00606, so the name is not invented. Wall clock about 1.8 s including a short settle.

"el mejor sitio". On screen: "Maricao es pequeño y tiene de todo un poco, pero necesito saber qué busca. ¿Se refiere a comida, vida nocturna, playas y aire libre, cultura, o un negocio para abrir?" It kept Maricao from the previous turn and asked her to narrow it. Offering "playas" for Maricao is a generic menu, not a local one. About 2 s.

**Phone, 390×845, after a fresh load of `/app`.** No horizontal scroll. The Spanish hero, six industry chips, and artist chips fit. The map is mostly covered until she picks an industry. "Dónde surfear en Rincón" and "Dónde comer mofongo" are `display:none` here, so two of the four prompts disappear with no explanation. The ask field measured 159×42 px; the placeholder draws as "Pregunte por un pue". After Panaderías, the choropleth sits on top and a sheet occupies the bottom (about 374×405). She can scroll it. The ask bar covers the last legend line ("Saturado…" was cut on the screenshot). Cesium's "Upgrade for commercial use" remains.

## Persona B walkthrough

Same browser session after the restaurant switch, then `/compare`. This is the judge checking whether the agent and Qloo are real.

**Scripted question.** Typed "Where do Bad Bunny fans eat in San Juan?" and pressed Enter. The chrome flipped to "EN · Andromeda". A Zemi-Aku bubble read: "Bad Bunny fans in San Juan cluster around Calle Loíza and Santurce. Qloo affinity points to La Placita de Santurce at 88 percent, a market plaza with food stalls, bars and dancing. Next is La Victoria on Calle Loíza at 87 percent, a casual restaurant and bar. Los Kings Lounge follows at 87 percent. These are taste affinities, not places tied to Bad Bunny himself. That's the fan map for eating in San Juan."

Cards, with "Photo · Qloo" on some and a satellite tile labeled "Location" on others:

- La Placita de Santurce, Bar, "Why it fits you Strong match for Bad Bunny fans (88%)", 7.7 km, ★ 4.7, "Today 12:00 am–12:00 am"
- La Victoria, 87%, "Today 12:00 pm–10:00 pm"
- Los Kings Lounge, labeled "Fast food restaurant" in the list and "Food" on the card, 87%, "Today 5:00 pm–12:00 am"
- El Techo Rooftop Bar, 86%, "Closed today"
- Oasis Tapas & Lounge, 86%, "Today 11:00 am–1:00 am"

The map labeled La Placita de Santurce and La Victoria on the Santurce grid. "Sources and the record behind this answer" said "Qloo places" and "Sources: Qloo place records."

**Evidence, opened from the bubble.** On screen: "Evidence · live model · 1 tool call · 1.8 s". "artist_places San Juan, Bad Bunny, food → Qloo · 5 places · 0.4 s". "Model deepseek/deepseek-v4.1-flash via OpenRouter · 2 rounds · answered 2026-10-25 08:40 UTC". Button "Ask again without Qloo". "Qloo IDs: FFE3…12E5, 1579…3370, 5B5D…D116, 10E8…3AB7, 55C6…A362". The chat response body carried the same model, the same tool, and full ids whose prefixes match that line, plus place records (name, lat/lon, rating, tags). La Placita's hours in that payload are the same "Today 12:00 am–12:00 am". That hours string looks like a missing close time, not a real schedule. The 88/87/87/86/86 scores are tightly packed; they are at least attached to tool output rather than typed into the paragraph only.

The request for that answer included prior turns, so the model could see the bakery and restaurant summaries. It did not just answer in a vacuum.

**Ask again without Qloo.** The request sent `"tools":"no-qloo"` and an empty history. On screen, a "Without Qloo:" answer: "I can't pull that one: the artist-taste tool isn't available in this session, so I have no verified list of where Bad Bunny fans eat. As general knowledge, not tool data, his Puerto Rico ties run through Santurce and the La Placita area, a busy food and nightlife zone. For actual verified places tied to his fans, I'd need the taste lookup, which I don't have here." Evidence line: "Evidence · live model · without Qloo tools, no history · 0 tool calls · 3.2 s". Actions were empty. Qloo changed this answer from five scored places to a refusal plus one general-knowledge neighborhood. The model still volunteered La Placita without the tool, so the top name is not a secret only Qloo knows. The ranked list and the percentages did not survive the ablation.

**Town answers are not all the same path.** The San Juan bakery click posted `{"question":"¿Debo abrir una panadería en San Juan?","lang":"es","history":[]}`. Its response evidence mode was "sources", not "model": tools `town_catalog` (Qloo saved catalog, 37), `overture_supply` (64, release 2026-09-23.1), `census_prcs` (2020–2024), `opportunity_map` (Qloo heatmap · Census CBP 2023). The spoken line was a filled template, including "Río Grande tiene más negocios de este tipo por residente que San Juan." The industry heatmap itself is a snapshot: `GET /api/opportunity?industry=bakery` returned `builtAt` 2026-10-11, 78 towns, taste median about 0.439, businesses-per-10k median about 1.30. Taste rank 1 is Vieques, group `unknown`, Census count suppressed. Río Grande is rank 2, group `gap`. Florida and Las Marías have no taste rank. That matches the on-screen "76 de 78" and the list that starts at #2. The app is not hiding a live Qloo call behind the bakery map. It says "catálogo guardado" and "obtenida el 2026-10-11". The artist question is the live call.

**Off-script, judge.**

"Where should I open a bakery in Madrid?" On screen: "Zemi-Aku covers Puerto Rico’s 78 towns only, and Madrid is not on this map. Name a town here and I’ll look." No place cards. Clean refusal. About 3 s.

"¿Dónde comen los fans de Vico C en Ponce?" On screen: "Los fans de Vico C en Ponce comen por el centro. Qloo marca Melao Coffee Shop como la mejor afinidad, 94 por ciento: café de especialidad y platos vegetarianos en la Calle Reina Duarte. Le sigue Papa Rupe Brewing Co., 93 por ciento, cervecería con patio en la Calle Mayor. La Pulga también aparece con 93 por ciento, bar y restaurante casual en la Reina Isabel. Son afinidades de gusto, no lugares ligados a Vico C." Cards also included Vistas and El Vagón Bar & Tapas, all marked Ponce. Evidence: model deepseek-v4.1-flash, 2 rounds, 2.0 s, tools `map_town` and `artist_places` (Qloo, 7 places, 0.75 s). Different artist and town produced a different list. I did not visit Ponce to check those storefronts.

"San Juan no tiene panaderías, ¿verdad?" The sentence was right: "No, esa idea no cuadra. San Juan sí tiene panaderías: 16 establecimientos con empleados, según el Censo, County Business Patterns 2023, o 0.48 por cada 10,000 residentes, frente a la mediana de 1.3 del mapa. Queda en grupo brecha, con gusto puesto 5 de 76: afinidad alta y pocos negocios, no ausencia." The cards under that sentence were wrong. On screen: La Placita de Santurce, and the tool trace was `town_catalog` count 942 (the restaurant catalog from earlier, not the 37 bakeries) plus `opportunity_map` and `map_town`. The other cards in the action payload were The Cheesecake Factory, Barrachina, Chocobar Cortés, and Restaurante Raíces. A judge who only reads the paragraph thinks the agent is careful. A judge who looks at the cards thinks the agent pasted the previous answer.

**`/compare`.** Title "Zemi-Aku — with and without Qloo". Nav: Front page, Live map, Code (the public GitHub link). Heading "With and without Qloo." The method paragraph says seven questions were each asked twice of the same model, same prompt and settings; six pairs strip Qloo down to map, weather, Wikidata, and Wikipedia; the last pair keeps the place catalog and drops only taste tools. It says the line under each pair "says what Qloo changed, or that it added nothing." Model line on screen: `deepseek/deepseek-v4.1-flash` via OpenRouter, "same system prompt, 1200 max tokens, reasoning low, up to 4 rounds, no history, no open town", run "2026-10-24 22:24 UTC". This page is a saved run, not a live re-run. I did not press anything that executed those seven pairs.

Pairs I read:

- "Where do Bad Bunny fans eat in Bayamón?" With Qloo names Los Socios Cafe 83%, TocaMadera Café 82%, Hacienda Carrión Café de Altura 81%, via `artist_places`. Without: "I don't have a taste tool… so I can't name where his fans eat", then Wikidata landmarks (Juan Ramón Loubriel stadium, Rubén Rodríguez coliseum, José Celso Barbosa house museum). Footer: "Qloo changed: Los Socios Cafe, TocaMadera Café, Hacienda Carrión Café de Altura".
- Morning cafés in Bayamón. With Qloo: Castilla Bakery, Starbucks, IHOP, and an admission the catalog is partial. `find_places` for café returned 1 place. Without: refuses to invent a café and points at the town hall area. "Qloo changed: Castilla Bakery".
- "What is there to do in Maricao?" With Qloo names La Torre de Piedra, the state forest, Hacienda Juanita, and Erik's Bakery, plus weather. One `town_weather` line says "refused: Too many tool calls in one round; ask for this one next." then a second weather call succeeds. Without Qloo keeps church, hatchery, and city hall from Wikidata and labels the forest as general knowledge.
- "¿Dónde comer mofongo en Ponce?" With Qloo: `find_places` for mofongo returned 0, then it offers Viktor Pollo and La Guarina Bakery as criolla fallbacks and says to confirm the dish. Without: refuses to name restaurants and mentions Plaza del Mercado as general knowledge.
- Rainy afternoon in Rincón. With Qloo names Café 413, La Cambija, Shipwreck, and a rip-current warning. Without stays on the lighthouse and "general knowledge rather than verified data."
- Calle 13. With Qloo picks San Juan and lists La Victoria 87%, Salgado Art Company 86%, Puerta de la Bandera 87%. One call, "Trujillo Alto, Calle 13 → refused: dropped to fit the request". Without also says San Juan, from "general knowledge" that the group formed there, and says it cannot rank towns.
- "Where do Bad Bunny fans eat in San Juan?" is the catalog-only control. With Qloo: La Placita, La Victoria, El Techo, "not places tied to Bad Bunny himself." "Catalog without affinity": "I can't pull artist-fan affinity data here" but then "Qloo's food places in San Juan, 942 listed" and still recommends La Placita, plus Bebo's Café and Casita Miramar. Footer: "Qloo's taste signal changed: La Victoria". Catalog measured date on that row: 2026-10-07.

Footer: "The runs are saved in compare-qloo.json and made by scripts/compare-qloo.mjs against a local server. Since October 23 every live model answer in the app offers Ask again without Qloo, the same control run on demand. Catalog places are matched by name against what the Qloo run put on the map; a place the second run names from general knowledge is not verified."

Every pair I saw claims Qloo changed at least one name. The intro's "or that it added nothing" does not occur on this page. The page is in English only. My live San Juan ablation agrees with the shape of this page (refusal, no fabricated five-pack) but is not this page: the live control also mentioned La Placita from general knowledge, and the saved "catalog without affinity" run names extra restaurants the affinity run did not.

## Defects (severity High/Med/Low, reproducible steps)

**High. A bakery correction renders the restaurant catalog.** On `/app`, open Panaderías, open San Juan, switch the industry chips to Restaurantes, wait for the 941-place panel, then ask "San Juan no tiene panaderías, ¿verdad?". The paragraph cites 16 Census bakeries and rank 5 of 76. The cards are La Placita de Santurce, The Cheesecake Factory, Barrachina, and other restaurants, and the recorded tool call is `town_catalog` with count 942. An owner correcting a false belief is shown the previous category.

**Med. The "more taste, few businesses" list drops the highest-taste town without saying so.** Choose Panaderías. The list is headed "Más gusto y pocos negocios" and the first row is Río Grande "gusto #2 de 76". The opportunity payload for that view ranks Vieques #1, group unknown, Census count suppressed, because two bakeries would put a small population over the median rate. Luquillo (#3, also suppressed) is on the list and Vieques is not. The rule is buried in "Fuentes y límites". A reader treats Río Grande as the best taste on the island.

**Med. Switching industry on an open town took about 30 seconds.** From the San Juan bakery panel, press Restaurantes. The competing numbers (821 establishments, 941 Qloo places) appeared about 30 s later. No progress text beyond the existing panel. Easy to read as a hang.

**Med. Place hours that cannot be a schedule.** On the Bad Bunny San Juan cards, La Placita shows "Today 12:00 am–12:00 am". The saved compare page describes the same place as dancing until 3 am. The app's own bakery copy says hours are "una foto del catálogo en su fecha", which admits the problem and does not fix the card.

**Med. Spanish UI keeps English controls and English source lines.** In an `es` session: tour buttons "Where Bad Bunny's fans eat", "Vico C, into real places", "Ponce, en español"; inside the town panel "By category", "Ask Zemi-Aku", "All places", "Restaurants", "Compare with…", "About this town"; under Spanish answers "Sources: Qloo place records." and "Sources: Qloo’s saved catalog for local context." Persona A can use the page. She cannot trust that she has seen every control.

**Med. Phone ask bar is too small and covers the legend.** At 390×845, `/app`, the visible search input is 159 px wide (placeholder clipped to "Pregunte por un pue"). After choosing Panaderías, the sheet's last legend row sits under the ask bar. Two prompt chips ("Dónde surfear en Rincón", "Dónde comer mofongo") are `display:none`.

**Low. Camera motion made the first industry click miss.** With "Movimiento de cámara activado", a normal click on Panaderías waited out because the button was not stable. Turning motion off made the control usable.

**Low. Bakery cards include places an owner will not call bakeries.** San Juan bakery results include Drunken Cookies, Lucía - Pâtisserie + Café, and Cafetería ABEL. The NAICS paragraph explains that Qloo's tag is wider than Census 311811. The cards do not.

**Low. Speech fired without a press.** Selecting San Juan and changing it to Restaurantes each `POST`ed `/api/speak` (200). I never pressed "Hear this voice" or the mic. If that plays audio, it will surprise a phone user in a public place.

**Low. Cesium "Upgrade for commercial use" is on both desktop and 390 px.** Fine for a hackathon watermark. It reads as an unfinished commercial map if someone screenshots the demo.

Not filed as defects: the four console lines were Chrome `runtime.lastError` from the extension host, not page exceptions. The compare page being a frozen run is disclosed (timestamp, `compare-qloo.json`, local script). I am not calling that a fake, because the live "Ask again without Qloo" button did the same kind of control in this session.

## Scores (four criteria, 1-5 each, one sentence of evidence per score)

**Intelligent and thoughtful use of LLMs + the Qloo API: 4.** The Bad Bunny answer showed a live `artist_places` call (5 Qloo places, 0.4 s, deepseek-v4.1-flash, 2 rounds, ids on screen), a Vico C / Ponce question returned a different 7-place list, and "Ask again without Qloo" dropped to 0 tool calls and refused to invent the list. The point comes off 5 because the bakery map is a saved heatmap from 2026-10-11 rather than a live Qloo call, several town answers are source templates, and the bakery follow-up still attached the 942-place restaurant catalog.

**Technical implementation and execution: 4.** Spanish copy, a choropleth, Census suppression rules, Overture dates, an evidence drawer, and a phone sheet all worked in this session, and Madrid was refused instead of geocoded onto the island. The point comes off 5 because the restaurant refresh took about 30 seconds, the first click was unstable while the camera moved, the phone field is 159 px, and one answer's cards did not match its sentence.

**Originality and creativity: 4.** Pairing a Qloo taste heatmap with County Business Patterns so a person can see "brecha" versus "competido" for a bakery, and then saying in the same panel that this is not demand or profit, is a specific product rather than a chat box on a map. The point comes off 5 because artist-to-venue lists are the usual Qloo demo, and `/compare` is a saved exhibit from 2026-10-24 rather than a comparison the judge runs.

**Real-world application and potential impact: 3.** A Spanish-speaking owner can leave with a usable limit ("No mide demanda, ingresos ni ganancias"), a San Juan bakery count of 16 employee establishments at 0.5 per 10,000 versus a median of 1.3, and a Maricao answer that names a real bakery while Census publishes nothing. She should not act on it yet: the highlighted list hides taste rank 1, "pocos negocios" in San Juan fights what she can see on the street, and the follow-up that corrected "San Juan has no bakeries" showed Cheesecake Factory and La Placita.

## Top 3 changes that would raise the score, in order

1. Bind cards and `town_catalog` to the industry in the sentence. If the answer is about panaderías, the tool args and the cards have to be bakeries. The wrong 942-place strip is the bug that makes an otherwise careful agent look pasted together.
2. On the first screen of "Más gusto y pocos negocios", say in Spanish that the list is only the gap group, that rank 1 (Vieques, in the payload I received) is withheld because the Census count is suppressed and two shops would pass the median rate, and lead with three towns to visit before the methodology essay.
3. At 390 px, give the question field the full width, keep it off the legend, show the hidden prompt chips or drop them on purpose, and translate the leftover English (tours, Sources, Evidence, Ask more, About this town). Stop calling `/api/speak` until someone presses play.

## What a rival entry would need to beat this

The floor is already high: a named model, a tool trace with timings, a without-Qloo control that refuses instead of inventing restaurants, Census and Overture dates, and an on-screen admission that taste is not revenue. I reproduced the refusal live, and the saved `/compare` page is consistent with it.

To beat it, a rival has to clear three things this demo does not. The places on the card have to be the places in the sentence on the second question, not the previous industry. A non-technical owner, in Spanish, on a phone, has to see why the top taste town is missing and what "pocos negocios" means per 10,000 people without opening "Fuentes y límites". And the Qloo difference has to be re-runnable in the judging window, not only a JSON frozen on 2026-10-24, and it has to change a decision she can use this month (a street, a rent range, or a permit step) rather than stop, correctly, at "visite y pregunte".
