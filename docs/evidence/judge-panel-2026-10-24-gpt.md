## Browser used

Google Chrome through browser automation, first at the normal desktop viewport and then at an explicit 390 × 844 phone viewport. I tested the hosted `/app`, `/compare`, and the public GitHub repository on October 24, 2026. I asked four questions total: the required Bad Bunny question plus three off-script questions, so I stayed well below the 12-question cap. I did not use the microphone, voice agent, or speech playback. Normal deterministic transitions felt effectively immediate; the live evidence panel reported 2.3 seconds for the Bad Bunny answer, 5.5 seconds for the more involved Adjuntas business question, and 2.6 seconds for a without-Qloo control run. I saw no application error message or failed answer.

## Persona A walkthrough (what you did, what you saw, quotes of on-screen text)

As a Spanish-first Puerto Rico small-business owner, I opened `/app` logged out. There was no login gate. The first screen is visually inviting but defaults to English: “Where should I open a business in Puerto Rico?” and “Qloo's taste for all 78 towns, against the businesses the Census already counts. Pick an industry.” The six large industry buttons made the intended task obvious.

I chose **Bakeries**, then **San Juan**. The opportunity view labeled San Juan a gap: bakery taste ranked **#5 of 76**, with **16 establishments**, **237 employees**, and **0.5 businesses per 10,000 residents** versus **0.8 island-wide** among published counts. It also showed 37 Qloo catalog places and 64 Overture listings, instead of presenting those incompatible counts as one number. The summary was usefully cautious: “A lead, not proof: visit and check rents before you sign.”

I opened **Sources and limits**. This was the strongest part for a nontechnical owner: it plainly said, “Not a measure of demand, revenue or profit,” explained that Census excludes self-employed and government workers, explained suppression below three establishments, dated the Qloo heatmap to 2026-10-11, and identified population as Puerto Rico Community Survey 2020–2024. The product repeatedly distinguished Qloo taste, Census establishments, and Overture observed supply.

I changed the industry to **Restaurants**. San Juan changed from a bakery “gap” to a restaurant market labeled **Competitive**, with taste **#4 of 78**, **821 establishments**, **16,137 employees**, and **24.4 per 10,000 residents** versus **12.5 island-wide**. This was a meaningful, legible change rather than a cosmetic rewrite.

For the Spanish/small-town test I asked, “¿Dónde abrirías una cafetería en Adjuntas y por qué?” The app automatically answered in Spanish and ranked Adjuntas **#11 of 78** for café taste, with Census showing an unpublished 0–2 count. It responsibly complicated that signal with observed supply: “el inventario observado sí lista cafeterías y coffee shops locales,” then named Hacienda Tres Ángeles, Robles Bakery, and El Campo Es Leña and ended, “Es afinidad y supply observado, no demanda ni ganancia.” The answer took 5.5 seconds and used five calls.

For an intentionally impossible business forecast I asked, “Which bakery in Adjuntas will be most profitable next year?” It did not invent a winner. It replied: “A couple of bakeries show up in Qloo, and other map data counts 4 across town. We don’t measure demand; tastes aren’t sales.” That refusal is correct, although too terse to help the owner decide what to do next.

At 390px, the landing screen reflowed cleanly: all six industry buttons, artist buttons, and tour buttons were usable, with the query bar fixed at the bottom. After an answer, however, the map, detail panel, result cards, and bottom answer sheet competed for the same narrow screen; the business-research panel became visually cramped and text-heavy. The query placeholder was also visibly truncated.

## Persona B walkthrough

I followed the prescribed path, changed to Restaurants, and asked, “Where do Bad Bunny fans eat in San Juan?” The answer named La Placita de Santurce (88% affinity), La Victoria (87%), Los Kings Lounge (87%), El Techo Rooftop Bar (86%), and Oasis Tapas & Lounge (86%). It explicitly disclaimed the obvious overclaim: “These are taste affinities from Qloo, not places tied to the artist.”

The expanded evidence line said **“live model · 1 tool call · 2.3 s”**, identified the call as `artist_places San Juan, Bad Bunny, food → Qloo · 5 places`, named the model and provider, showed two rounds and an answer timestamp, and exposed truncated Qloo IDs. This is strong evidence that the agent path is real rather than a prewritten paragraph. By contrast, the business-research answers honestly said **“no model turn · 4 sources”**; the entry does not pretend every interaction is agentic.

On `/compare`, six frozen questions are shown with the same model and settings, once with Qloo tools and once without them. The page clearly labels the run date and the non-Qloo tool set. In the Bayamón Bad Bunny example, the Qloo run named Los Socios Cafe, TocaMadera Café, and Hacienda Carrión Café de Altura; without Qloo, the model refused to invent restaurants. Other pairs cover cafés, Maricao, mofongo in Ponce, rain in Rincón, and Calle 13. This is unusually good hackathon evidence, though it is a saved control page rather than a live experiment.

I also used the live **“Preguntar otra vez sin Qloo”** control after the ambiguous Spanish question “¿Dónde está bueno?” in the existing Adjuntas context. With Qloo, it named Star Light, El Campo Es Leña, and Robles Bakery; without Qloo, it fell back to the plaza, town hall, bridge, river, and weather. Both versions reported four calls, and the no-Qloo run was explicitly labeled. That directly demonstrated that Qloo changes the answer content.

The ambiguous question was not clarified: the app silently interpreted “bueno” as places to eat in the current town. Context retention is useful, but a judge cannot tell whether the user meant food, nightlife, lodging, or a business opportunity. This is agent behavior, but not yet robust ambiguity handling.

The public repository substantially supports the demo’s claims: it exposes the app, server, scripts, tests, environment example, and a README describing 16 read-only tools, provider boundaries, caps, local setup, and verification commands. The repository page showed a latest commit mentioning 432 tests, while the rendered README still said 415 local automated tests; that stale number slightly weakens the otherwise strong reproducibility story. The README also says saved Qloo results are intentionally omitted and must be rebuilt with the evaluator’s own keys, so the frozen `/compare` data is inspectable but not independently reproducible from the clone without credentials.

## Defects (severity High/Med/Low, reproducible steps)

- **Med — Spanish localization is incomplete.** Steps: open `/app`; ask “¿Dónde abrirías una cafetería en Adjuntas y por qué?”; inspect the answer and result cards. The narrative, directions, and “Preguntar más” switch to Spanish, but surrounding labels remain English, including “Food,” “Today,” “Closed today,” “BROWSE ALL 35 PLACES IN ADJUNTAS,” “Sources and the record behind this answer,” and several map controls. This is especially damaging for the stated Spanish-first persona.

- **Med — The 390px result state is overcrowded.** Steps: obtain any business-research answer; resize to 390 × 844. The landing screen is good, but the open detail panel becomes a narrow, dense column over the map while a second answer sheet and fixed query bar consume the lower area. The important business evidence is technically present but harder to scan than on desktop, and the query placeholder truncates.

- **Med — Ambiguity is resolved silently instead of clarified.** Steps: open Adjuntas, then ask “¿Dónde está bueno?” The app assumes restaurants/food and returns specific places. A one-line clarification (“¿Para comer, salir, hospedarte o abrir un negocio?”) would avoid a confident answer to the wrong intent.

- **Low — The profit-refusal path stops too early.** Steps: ask “Which bakery in Adjuntas will be most profitable next year?” The refusal is honest, but it only says tastes are not sales. It should offer a concrete next-step checklist using the data it already has: visit competitors, check rents, foot traffic, permits, price points, and hours.

- **Low — Public verification count is stale.** Steps: open the public repository root. The latest commit text says 432 tests while the README says 415 local automated tests. This does not affect the running demo, but judges use the README as the reproducibility contract.

- **Low — The business opportunity ranking can momentarily look contradictory.** Steps: ask about opening a café in Adjuntas. Census suppression supports a 0–2 count and a “gap” classification, while observed supply and Qloo show existing cafés/food venues. The app does explain the different datasets, but the key reconciliation appears late in the generated answer; it should be surfaced beside the classification itself.

## Scores (four criteria, 1-5 each, one sentence of evidence per score)

- **Intelligent and thoughtful use of LLMs + the Qloo API — 5/5.** Live tool traces, Qloo IDs, timings, honest deterministic-vs-model labels, and both frozen and on-demand without-Qloo controls show that Qloo materially grounds the agent rather than decorating generic model prose.

- **Technical implementation and execution — 4/5.** The hosted 3D map, 78-town business analysis, multi-source evidence, public source, caps, and responsive landing all worked, but incomplete Spanish localization, cramped mobile answer states, and a stale public test count keep it from a five.

- **Originality and creativity — 5/5.** Turning cultural affinity into a Puerto Rico-specific map that joins Qloo taste with Census scarcity and Overture supply is a distinctive concept, and the self-auditing control is more creative than a standard recommendation chatbot.

- **Real-world application and potential impact — 4/5.** It is a useful reconnaissance tool for tourism and small-business hypothesis generation, but it correctly lacks rents, foot traffic, permits, margins, and demand validation, so nobody should make an investment decision from it alone.

## Top 3 changes that would raise the score, in order

1. **Finish the Spanish-first product, not just Spanish answers.** Translate every persistent label, status, source heading, time/closure string, control description, and fallback; make the language switch explicit and persistent.

2. **Turn the business result into a decision workflow.** After the gap/competitive classification, produce a compact “what this proves / what it does not / next three checks” card with rents, permits, competitor visits, foot traffic, and a downloadable comparison of towns.

3. **Redesign the post-answer phone state and ambiguity handling.** On 390px, make map/details/result sheet mutually exclusive or snap between them, keep the evidence summary readable, and ask a clarifying question when the user’s category or goal is unclear.

## What a rival entry would need to beat this

A rival would need more than a prettier Qloo recommendation demo. It would need equally inspectable live tool use and an honest with/without-Qloo control, while going further on end-to-end decisions: fully localized Spanish UX, clearer uncertainty, live commercial variables such as rent/permits/foot traffic, better mobile information architecture, and independent reproducibility of its evaluation data. The strongest route to beating Zemi-Aku is to preserve its unusually good provenance and refusal behavior, then prove measured usefulness with real small-business users rather than stopping at culturally interesting leads.
