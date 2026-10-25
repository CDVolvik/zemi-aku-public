## Browser used

Google Chrome, opened logged out at `https://zemi.r21digital.com/app`, at a 1455×639 desktop viewport and a 390×844 phone viewport. The first open was usable in roughly 3–4 seconds; later `/app` and `/compare` navigations took roughly 0.7–1.8 seconds. The app's own evidence reported 0.3–2.0 seconds for the tested answers and control runs. I saw no user-visible request failure or failed answer. One generic message-channel console error appeared on `/compare`, but it had no visible effect and was not clearly attributable to the app. I did not use the microphone or voice agent and did not press speech playback.

## Persona A walkthrough (what you did, what you saw, quotes of on-screen text)

I entered through the Spanish-first landing screen, selected **Panaderías**, then selected **San Juan** from “Más gusto y pocos negocios.” The transition was fast and the map followed the choice. The main result called San Juan a “brecha” for bakeries: taste rank 5 of 76, 16 employer establishments, 0.5 per 10,000 residents versus a 1.3 median. It separated three datasets rather than blending them: 37 saved Qloo places, 64 Overture places, and 16 Census establishments with employees.

The result was unusually candid for a business-recommendation demo. It said, “Afinidad, demografía y oferta observada no prueban demanda ni rentabilidad,” and the limitations block explicitly excluded “Demanda, ventas, rentas, tráfico peatonal, permisos ni ganancias.” The source disclosure dated the Qloo heatmap to 2026-10-11, named County Business Patterns 2023 and PRCS 2020–2024, explained suppressed Census counts, and said Qloo affinity describes aggregated cultural patterns rather than people. The three next steps—visit named bakeries, check real rents and permits, and compare another town—were practical and appropriately framed as fieldwork rather than a verdict.

The amount of material is also a usability cost for a nontechnical owner. The panel mixes affinity rank, counts, rates, confidence margins, NAICS scope, Qloo, Overture, Census, a map, and dozens of places. The short spoken-style answer helps, but the source panel reads more like an analyst's appendix than a small-business decision aid.

Off script, I asked in Spanish whether opening a café in small-town Maricao made sense. The app did not overclaim: it showed “Datos insuficientes,” Qloo 0, Overture 3, and a Census-suppressed range of 0–2 establishments. It also said what it could not infer and suggested municipal verification. However, that Spanish flow displayed the English empty-state sentence, “Qloo has no places to show here. That does not mean there are none,” and one instruction said to visit “los lugares de la lista” even though the Qloo list contained zero places.

For the deliberately ambiguous “¿Dónde debería abrir?”, the agent asked which supported business type I meant instead of guessing. When asked for monthly rent and expected bakery sales in San Juan, it answered, “No tengo renta mensual ni ventas: esas cifras no están en los datos. Yo no las invento,” then redirected me to rental listings and the municipality. It also rejected an out-of-scope Miami question and asked for a Puerto Rico town.

The comparison question “Para una panadería, ¿San Juan o Río Grande tiene menos competencia por residente?” was internally consistent: San Juan 0.48 versus Río Grande 0.65 establishments per 10,000, so it named San Juan as lower while warning that both are only “brecha” leads. On a 390px viewport, the landing screen remained readable with no horizontal overflow and the business/result panels used normal-sized type; one overlapping control described below makes the detailed result harder to collapse.

## Persona B walkthrough

After switching the business flow to **Restaurantes**, I asked the required “Where do Bad Bunny fans eat in San Juan?” The app automatically switched the answer UI to English and returned five food places. It led with La Placita de Santurce at 88% affinity, La Victoria and Los Kings Lounge at 87%, then clearly said these were Qloo affinities, “not places tied to Bad Bunny.”

The expanded Evidence control was substantive rather than decorative. It showed `artist_places San Juan, Bad Bunny, food → Qloo · 5 places · 0.3 s`, one tool call, two model rounds, a 1.4-second total, an answer timestamp, model/provider, and five truncated Qloo IDs. That is strong evidence that the typed turn used an actual model/tool loop.

I then ran the live “Ask again without Qloo” control. The control used no history and no Qloo tools, made zero tool calls, and refused to invent restaurants. The comparison explicitly said Qloo changed La Placita de Santurce, La Victoria, and Los Kings Lounge. This is the strongest proof in the demo that Qloo materially affects the answer, although the surrounding panel retained unrelated Qloo content after the control run (see Defects).

On `/compare`, seven saved pairs use the same model, prompt, and settings. Six remove Qloo tools; the last preserves the Qloo place catalog but removes affinity tools. The Bayamón Bad Bunny pair changed from three named affinity matches to an honest “I don't have a taste tool” response. In the stricter San Juan ablation, both runs could read the place catalog, while the taste signal uniquely added La Victoria. The page openly says the runs are saved in `compare-qloo.json` and generated against a local server, so this page is a frozen experiment, not a live benchmark; the on-demand control in `/app` compensates for that limitation.

The permitted public repository corroborates the visible claims: it contains a real OpenRouter multi-round function-calling loop, a read-only tool registry whose `artist_places` path calls the Qloo-backed artist answer, evidence traces derived from executed tool results, and the script that generates paired with/without-Qloo runs. The business-opening headline is a disclosed hybrid: deterministic logic produces the data verdict and an LLM adds a bounded note. That is sensible safety engineering, but judges should score it as a hybrid decision tool rather than treating every business sentence as autonomous agent reasoning. The public snapshot does not include saved Qloo results, and the live UI truncates Qloo IDs, so I could corroborate the mechanism but not independently resolve every entity or recompute the heatmap without Qloo credentials.

## Defects (severity High/Med/Low, reproducible steps)

- **High — none observed.** All required and off-script questions returned, the map followed named Puerto Rico towns, and limitations were surfaced instead of hidden.

- **Med — landing-page controls overlap at the tested desktop height.** Reproduce at approximately 1455×639 on `/app`: the “VER UN RECORRIDO” block spans roughly y=426–539 while the suggestion block begins around y=466, covering the lower part of the first tour row and most of “Ponce, en español.” The visible chips obscure primary demo controls before any interaction.

- **Med — the live no-Qloo control leaves contradictory Qloo state on screen.** Ask “Where do Bad Bunny fans eat in San Juan?”, open Evidence, and choose “Ask again without Qloo.” The comparison says the with-Qloo places were removed, but the left panel remains titled “Bad Bunny fans in San Juan” / “Qloo places” and fills with generic San Juan results such as hotels, shopping, and The Cheesecake Factory. The control answer itself is honest, but the stale/unrelated panel weakens the proof and can look fabricated.

- **Med — mobile map-style control overlaps the details-panel collapse control.** Produce any detailed result, resize to 390×844, and inspect the upper-right of the panel. The 40px map-style button sits over most of the 40px collapse button with the higher stacking order; only a narrow lower strip of the collapse target remains exposed, so the obvious tap opens map styling instead of collapsing the panel.

- **Low — Spanish empty-state localization and instructions are inconsistent.** Ask “¿Conviene abrir una cafetería en Maricao?” The otherwise Spanish flow displays “Qloo has no places to show here. That does not mean there are none,” and tells the user to visit list places despite reporting zero saved Qloo places.

## Scores (four criteria, 1-5 each, one sentence of evidence per score)

- **Intelligent and thoughtful use of LLMs + the Qloo API — 5/5.** Live turns selected relevant read-only tools, exposed the executed Qloo call and model trace, materially changed under a no-Qloo ablation, and refused claims the data could not support.

- **Technical implementation and execution — 4/5.** The 3D map, multilingual agent, 78-town data flows, source drawers, safeguards, and fast responses all worked, but overlapping controls and incoherent state after the live control keep it from being fully polished.

- **Originality and creativity — 5/5.** Turning cross-domain cultural affinity into an explorable Puerto Rico map and then pairing it with Census and observed-supply context is distinctive and more ambitious than a conventional recommendation chatbot.

- **Real-world application and potential impact — 4/5.** It gives owners concrete towns, peers, source dates, caveats, and next actions, but it cannot yet supply the rent, foot traffic, demand, permits, or revenue evidence needed for an actual site decision.

## Top 3 changes that would raise the score, in order

1. Make the live with/without-Qloo experiment state-clean and fully auditable: clear old map/panel results, show the two result sets side by side, expose complete request-scoped IDs or a downloadable sanitized trace, and link each source record where licensing permits.

2. Fix responsive layering before judging: remove the desktop tour/suggestion collision, reserve a clear 44×44 mobile target for panel collapse, and test short laptop heights as well as 390px phones.

3. Turn the business result into a concise decision worksheet: lead with the verdict, confidence/data freshness, and two comparable towns; keep methodology in a disclosure; and provide an exportable checklist for the missing rent, permit, traffic, and field-visit inputs without pretending the app already knows them.

## What a rival entry would need to beat this

A rival would need more than attractive Qloo recommendations. It would need a demonstrably live multi-tool agent, an equally convincing ablation proving Qloo changes the result, direct and reproducible provenance for every recommendation, and guardrails as explicit as this entry's. To win outright, it would also need cleaner mobile/desktop execution and stronger outcome evidence—current commercial inputs, field validation with real Puerto Rico businesses, or measured decision improvement—while preserving the speed, local specificity, and candor shown here.
