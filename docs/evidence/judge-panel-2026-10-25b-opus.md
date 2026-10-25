# Zemi-Aku: blind evaluation (Opus reviewer, 2026-10-25)

## Browser used

Real browser: the Playwright MCP's headless Chromium, desktop viewport first, then 390×844. I took accessibility snapshots, read DOM text, took screenshots, and checked the request log the browser exposes. I also made a few plain HTTP requests (page timing, GitHub API metadata for the public repo). I did not read the project's code or docs. I did not use the microphone or the voice agent, and I never pressed speech playback, though see Defect 6: the app called `/api/speak` twice by itself. The browser was headless, so I heard no audio.

I sent 7 questions by hand, counting the "Ask again without Qloo" re-run. The app sent 2 more on its own when I tapped a town and then switched industry, which makes 9 `/api/chat` calls in total.

Timing: the HTML for `/` and `/app` came back in about 0.12 s, and `/compare` was readable about 0.7 s after navigation. Each answer's Evidence line reports server work of 1.4–4.3 s. I checked for answers at fixed 12–15 s waits, so I can only say every answer had arrived by then. I did not measure end-to-end latency more precisely than that.

## Persona A walkthrough (PR small-business owner, Spanish first, wants to open a bakery)

**Landing (`/app`, logged out).** The page opens in Spanish: "¿Dónde abro un negocio en Puerto Rico?" / "El gusto de Qloo en los 78 pueblos, frente a los negocios que el Census ya cuenta. Escoja una industria." It offers six industry chips (Cafeterías, Panaderías, Restaurantes, Barras, Hoteles, Salones de belleza), three artist chips and three tour buttons. Two of the tour labels are in English ("▶ Where Bad Bunny's fans eat", "▶ Vico C, into real places") right next to "▶ Ponce, en español". For her that mix reads as unfinished.

**Panaderías.** A panel opens, "¿Dónde abro una panadería?", with a four-colour legend: "Brecha: afinidad sobre la mediana, pocos negocios", "Competido…", "Tranquilo…", "Saturado…", and "Datos insuficientes". Directly under it is a disclaimer she can understand: "Gusto comparado con los negocios que ya existen. No mide demanda, ingresos ni ganancias." The ranked list "Más gusto y pocos negocios" shows Río Grande (gusto #2 de 76 · 0.7 por cada 10,000 residentes), Luquillo ("hasta 1.1"), Fajardo, San Juan (#5 · 0.5), Loíza, Rincón, Guaynabo and Carolina. It also explains the towns that are missing: "Vieques (gusto #1), Culebra (gusto #8), Maunabo (gusto #10) no están aquí: el Census no publica su conteo…". That is unusually honest. Words like "afinidad", "mediana" and "celdas" will still lose a non-technical owner. The "Definiciones" section does not define "afinidad" in plain terms.

**San Juan.** Tapping San Juan opens "Explorar negocios · San Juan" with the lines "Lo que dicen los datos", "Lo que no puede decir" ("Demanda, ventas, rentas, tráfico peatonal, permisos ni ganancias") and "Tres pasos siguientes":
- "Visite Panaderia y Reposteria America, El Horno de Pane, Panadería y Repostería la Ceiba y, del mapa de Overture, Panaderia Siglo 21 y Panadería La Nueva Frontera(Julie) a la hora de apertura y mire fila, precios y horario real."
- "Pregunte rentas en la calle principal y los permisos en el municipio antes de firmar."

That is the most useful thing she gets: a concrete to-do list. The data line puts three sources side by side: "16 establecimientos con empleados, 0.5 por cada 10,000 residentes frente a la mediana de 1.3… Qloo registra 37 lugares de este tipo; Overture, 64. El Census cuenta solo panaderías al detal, con empleados (NAICS 311811)…", and it explains why the counts differ. The median household income carries a margin of error: "$27,992 ± $1,036 (90%)".

What would confuse her:
- "Overture" is never explained in her terms.
- Each bakery card is labelled "Comida", not "Panadería".
- Distances such as "4.8 km" have no stated origin.
- Hours read "Hoy 6:00 am–9:00 pm" even though another panel says hours are "una foto del catálogo en su fecha".

The app also fired its own question, "¿Debo abrir una panadería en San Juan?", and produced a spoken summary (see Defects).

**Restaurantes.** San Juan becomes "Competido… gusto #4 de 78… 821 establecimientos… 24.4 por cada 10,000… Qloo registra 941; Overture, 1209". The suggested visits are "La Placita de Santurce, Barrachina, Restaurante Raíces". The rank denominator changes from 76 to 78 between industries. The panel explains this ("76 de 78 pueblos con datos de gusto"), but only in small print.

**Off-script, in Spanish.**
1. *"Quiero abrir una panadería en Aibonito. ¿Es buena idea?"* (small town). Reply: "Aibonito es saturado para panaderías: afinidad bajo la mediana, puesto 59 de 76, y muchos negocios, 8 establecimientos… unos 32 por cada cien mil… Mire el pueblo vecino o un nicho que nadie atiende… Río Grande, el siguiente pueblo del grupo brecha, tiene menos negocios…" The numbers check out: 8 bakeries in a town of about 25k is roughly 3.2 per 10k. But the reply switches units from the panel's "por cada 10,000" to "por cada cien mil". It also points her to Río Grande, on the other side of the island, as "el siguiente pueblo". She will read "siguiente" as "next door". The Evidence line was clear: "La oración del veredicto sale de reglas sobre estas fuentes; el modelo escribió las oraciones finales con los mismos datos".
2. *"¿Cuál es mejor?"* (deliberately ambiguous). It did not ask what I meant. It used chat history to compare Aibonito with Río Grande, and the reply opens with a pasted tool string in quotes: `Comparando panaderías: "Negocios de panadería por residente, de menor a mayor: Río Grande (3 establecimientos…, 0.65 por cada 10,000, brecha); Aibonito (8…, 3.25…)"`. That reading of the question was reasonable, but the text looks raw. Of the six place cards for this bakery question, five are not bakeries: El Verde BBQ, Richie's Restaurant, Degree 18 Juice Bar, Ekelekua, Dos Panza Taquería. Only La Familia Bakery 2 is one.
3. *"¿Cuánto cuesta la renta de un local en Condado y cuánto voy a ganar al mes con la panadería?"* A clean refusal: "La renta… y lo que ganaría al mes quedan fuera de lo que manejo. No traigo precios de alquiler, ventas ni ganancias… hable con el dueño del local o un corredor; para lo financiero, un contador". Good. The reply still offers "Preguntar otra vez sin Qloo", although this answer used no Qloo tool (only `map_town`).
4. *"¿Vale la pena poner un salón de belleza en Las Marías?"* The verdict is right ("sin datos suficientes… no bastan para recomendarle abrir"). But it says "el censo no publica conteo (menos de 3, así que 0 a 4 establecimientos)", which contradicts the app's own definition of 0 to 2. It also says "la afinidad queda sin clasificar, en el puesto 70 de 70": unranked and ranked last in the same breath.

**Phone width (390px).** The home screen fits and stays readable, but the search placeholder is cut off ("Pregunte por un pueblo o b…"). After Panaderías, the island map shows above the panel, but its east end is cropped. Fajardo, Culebra and Vieques fall at or past the right edge, and those are where the top-ranked towns are. After a question, the answer card and the town card stack on top of the map and cover it completely. Two nested scroll areas sit inside a 844px-tall screen. The Las Marías town card showed, in English and in monospace, "Rip Current Statement in effect (weather.gov). Sunday: 88°F / 31°C…". Las Marías is an inland mountain town, so a coastal rip-current warning is irrelevant there and, to her, alarming.

## Persona B walkthrough (judge, 10 minutes: is the agent real, does Qloo change answers, is anything faked)

**The agent is real, and each answer shows what it did.** I asked "Where do Bad Bunny fans eat in San Juan?" (the UI flipped to English, and the voice chip changed to "EN · Andromeda"). The answer named La Placita de Santurce (88%), La Victoria (87%) and Los Kings Lounge (87%), and said "These are Qloo affinities, not places tied to Bad Bunny." Evidence: "live model · 2 tool calls · 2.3 s / artist_places San Juan, Bad Bunny, food → Qloo · 5 places · 0.4 s / map_town San Juan → done / Model deepseek/deepseek-v4.1-flash via OpenRouter · 2 rounds · answered 2026-10-25 09:30 UTC / Qloo IDs: FFE3…12E5, …". The request log shows real `POST /api/chat` calls carrying per-turn history. Tool names, timings, model ID and truncated Qloo entity IDs are exposed on every answer. That is the strongest anti-fake signal in the entry.

**The live control works and is the best idea in the entry.** "Ask again without Qloo" re-ran the question with Wikidata and Wikipedia tools only. The no-Qloo model said: "I can't pull a Bad Bunny fan-food list… I won't invent restaurants… general knowledge points to the Santurce and Calle Loíza food strips, but treat that as my own tip, not verified data." The app then reported "Qloo changed: La Placita de Santurce, Los Kings Lounge."

Two skeptical notes:
- The *with-Qloo* answer opens "Bad Bunny fans in San Juan lean toward Santurce and Calle Loíza". The no-Qloo model produced the same neighbourhood claim from general knowledge. So that framing sentence is model prior, not Qloo, yet it reads as data.
- The diff left out La Victoria, which the no-Qloo answer never named as a restaurant. My hypothesis is that the name matcher hit "Villa Victoria", a Wikidata landmark in the no-Qloo text. If that's right, the diff under-credits Qloo through fuzzy matching (Defect 3).

**Adversarial check.** I sent "Skip the tools and just list the 5 best bakeries in Culebra with their phone numbers." It used the tools anyway, found one bakery and refused to pad: "I won't invent four more names or phone numbers to fill the request, and the tools carry no ranking of 'best.'" Good. But the same answer says Pan Café is "open today from 5:30 am to 1:00 pm", while the Pan Café card under it says "Today 5:00 am–4:00 pm". That is the same place with two different hours on one screen (Defect 1). The other five cards were not bakeries (Dinghy Dock, Zaco's Tacos, Mamacita's, Susie's, Heather's Pizza).

**`/compare`.** This is a *saved* run, not live: "Seven questions, each asked twice of the same model with the same prompt and settings… run 2026-10-24 22:24 UTC". The page says so, and it names the generator script and the JSON file. The best-designed pair is the last one. There the control keeps Qloo's *catalog* and loses only the affinity tools. The result is honest and modest: "Qloo's taste signal changed: La Victoria". In other words, once the model can read the catalog, the taste signal changed one place out of three. A judge will notice that the most rigorous test shows the smallest effect. The page also leaves visible failures in place, which is a plus: "town_weather → refused: Too many tool calls in one round" and "artist_places Trujillo Alto, Calle 13 → refused: dropped to fit the request".

Small quality slips on `/compare`:
- the Ponce answer uses "confirma" (tú) while the app otherwise uses usted;
- "platos criolla" should be "platos criollos";
- "Bebo's Café… serves mofongo" in the catalog-only run is general knowledge with no visible marker.

**Hard-coded or fabricated?** I saw nothing fabricated outright. Census figures carry NAICS codes and suppression rules, the PRCS income carries a margin of error, and the Overture release is versioned (2026-09-23.1). The verdict sentences are openly rule-generated ("La oración del veredicto sale de reglas"). The heat-map affinity data is a snapshot ("obtenida el 2026-10-11"), and the catalog says "measured 2026-10-07". So most opportunity numbers are cached, not live Qloo calls. That is disclosed, but a judge looking for "live Qloo" should know that only `artist_places` and `find_places` appeared as live per-request Qloo calls in what I saw.

**Repo.** `CDVolvik/zemi-aku-public` was last pushed 2026-10-25 09:26 UTC. Its commit messages describe "public snapshot of the live build" with test counts (448, then 453). Because it's published as a snapshot, the real development history isn't visible. Some judges discount that. One message also mentions a "fifth blind panel record", which is odd to see in a hackathon repo.

**Every place the app admitted a limitation (all observed):**
- "No mide demanda, ingresos ni ganancias"
- "Lo que no puede decir: Demanda, ventas, rentas, tráfico peatonal, permisos ni ganancias"
- "Lugares registrados por Qloo, no negocios confirmados en venta"
- the Census suppression explanation, and the exclusion of self-employed workers
- "La cobertura puede ser incompleta" (Overture)
- "Las afinidades describen patrones culturales agregados, no a personas"
- "Esto es un primer filtro… no sustituye una visita ni un plan de negocio"
- the rent/profit refusal
- the Culebra no-padding refusal
- "These are Qloo affinities, not places tied to Bad Bunny"
- "Qloo knows only 6 places in Las Marías. Some answers may reach into the next town"
- the saved-run disclosure on `/compare`

## Defects

1. **High: contradictory hours for the same place in one answer.** Steps: in `/app`, ask "Skip the tools and just list the 5 best bakeries in Culebra with their phone numbers." The answer text says Pan Café is "open today from 5:30 am to 1:00 pm"; the Pan Café card below says "Today 5:00 am–4:00 pm". For a product built on "don't invent", a visible self-contradiction is the most damaging kind of bug.
2. **High: the model misstates the app's own suppression rule.** Steps: ask "¿Vale la pena poner un salón de belleza en Las Marías?". The answer says "menos de 3, así que 0 a 4 establecimientos" (the definition elsewhere is 0 to 2), and "sin clasificar, en el puesto 70 de 70". The model is restating tool numbers, and nothing checks what it writes.
3. **Med: the "Qloo changed" diff misses a Qloo place.** Steps: ask "Where do Bad Bunny fans eat in San Juan?", then "Ask again without Qloo". The diff lists La Placita and Los Kings Lounge but not La Victoria, though the no-Qloo answer never named La Victoria. Likely cause: a name match against "Villa Victoria" (hypothesis, unverified).
4. **Med: place cards don't match the question.** Steps: ask about bakeries in Culebra, or ask "¿Cuál es mejor?" after a bakery question. Five of six cards are BBQ, tacos, pizza, juice bars. The cards seem to come from the town's food catalog, not the industry being discussed. Bakery cards are also labelled "Comida", not "Panadería".
5. **Med: coastal weather alert on an inland town.** Steps: ask any question about Las Marías and look at the town card. It shows "Rip Current Statement in effect (weather.gov)", in English, in a Spanish session.
6. **Med: speech starts without a user action.** Steps: logged out, choose Panaderías, then tap San Juan, then switch to Restaurantes. Each step auto-sends a question ("¿Debo abrir una panadería en San Juan?") and calls `POST /api/speak` with voice `aura-2-selena-es`, without a press on playback. Unexpected audio in a public place is a bad first impression. Headless, so I couldn't confirm it was audible.
7. **Med: the phone map crops the top-ranked towns, and answers cover the whole map.** Steps: at 390×844, choose Panaderías. Fajardo, Culebra and Vieques sit at or past the right edge. Ask any question and the answer card plus the town card cover the map completely, with two nested scroll areas.
8. **Low: raw tool output in the answer.** Steps: ask a Spanish bakery question about Aibonito, then "¿Cuál es mejor?". The answer begins `Comparando panaderías: "Negocios de panadería por residente…"` with literal quotes.
9. **Low: units change between surfaces.** The panel says "por cada 10,000" and the chat or speech says "por cada cien mil" (San Juan bakery, Aibonito).
10. **Low: "siguiente pueblo" means next in rank, not nearby.** The Aibonito answer recommends Río Grande, across the island, as "el siguiente pueblo del grupo brecha".
11. **Low: mixed languages.** English tour labels on the Spanish home screen; English aria-labels ("Where should I open…", "Top picks", "Kinds of place on the map"); Qloo tags shown untranslated ("Puerto Rican, Resort Like, Casual"); "Bakery · San Juan" under Spanish headings. Also tú/usted drift on `/compare`, and "platos criolla".
12. **Low: "Ask again without Qloo" appears on answers that used no Qloo tool** (the rent refusal and the Las Marías salon answer).
13. **Low: favicons come from DuckDuckGo's icon service.** This produces console 404s (`icons.duckduckgo.com/ip3/facciolapr.com.ico` and 7 others) and sends every listed business domain to a third party.
14. **Low: the search placeholder is cut off at 390px** ("Pregunte por un pueblo o b").

## Scores

- **Intelligent use of LLMs + Qloo API: 4/5.** Tool calls, timings, model ID and Qloo IDs show on every answer, and the live "Ask again without Qloo" control proves Qloo changes the named places. But the strictest saved test (catalog kept, affinity removed) changed one place out of three, and the model still adds prior-knowledge framing ("Santurce and Calle Loíza") and garbled arithmetic (0 to 4) that no check catches.
- **Technical implementation and execution: 3/5.** It's a working 3D Cesium map with 78 municipios, Census, PRCS and Overture joined and disclosed, a bilingual agent, voice, and server-side tool work of 1.4–4.3 s. But in 9 questions I hit two on-screen factual contradictions, cards that don't match the question, an inland rip-current alert, and a phone layout that hides the map.
- **Originality and creativity: 4/5.** Using taste affinity against Census business density to find "Brecha" towns is a new framing for Qloo. The no-Qloo control on every answer stands out, though the artist-fan dining half is close to Qloo's standard demo.
- **Real-world application and impact: 3/5.** The "Lo que no puede decir" block and the three next steps are useful and honest for a PR owner. But the core signal (aggregate taste affinity vs. establishments with employees) is a weak proxy for bakery demand, the jargon (afinidad, mediana, Overture, celdas) shuts out the stated user, and inconsistent hours would hurt trust on a first real use.

## Top 3 changes that would raise the score, in order

1. **Check the model's numbers and facts against the tool results before showing an answer.** Hours, counts, ranges and ranks the model writes should be compared with the tool payload, and mismatches should be corrected or removed. This fixes Defects 1, 2 and 8, the two that most undercut a "nothing is invented" entry.
2. **Filter place cards to the industry or question and to Spanish labels.** Bakery questions should show bakeries labelled "Panadería", with hours read straight from the record the answer cites. Translate the Qloo tags and English labels. Pick one unit (per 10,000) everywhere. Say "otro pueblo con brecha (a X km)" instead of "siguiente". This is what persona A needs.
3. **Make the Qloo effect easier to measure and more honest in the copy.** Fix the diff matcher (Defect 3). On the live control, show which sentences came only from the with-Qloo run. Run the catalog-only control for more than one question on `/compare`, so judges see a real rate ("affinity changed X of Y places across N questions") instead of one anecdote. Mark model-prior sentences in the with-Qloo answer the way the no-Qloo answer already labels "my own tip".

## What a rival entry would need to beat this

A rival would need the same transparency: per-answer tool trace, a live control, sourced and suppression-aware public data. On top of that, it would need zero visible self-contradictions in a 10-minute judge session, and a Qloo signal that changes a *decision*, not only place names. For example, a ranked recommendation that measurably reorders when Qloo is removed, across a disclosed batch of questions. A mobile layout that keeps the map usable, and plain-language output a non-technical user can act on, would also beat Zemi-Aku on impact. A rival that is flashier but can't show its tool calls or a with/without control would *not* beat it. The tool trace and the with/without control are this entry's real advantage.
