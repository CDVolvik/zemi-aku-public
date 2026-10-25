## Browser used

Headed Chromium through Playwright CLI, in a fresh unauthenticated browser context. I tested desktop at 945×943 and mobile at 390×844. `/app` opened without a login prompt. After the first visit, measured load-event times were 441 ms for a reload and 736 ms for a fresh navigation in the same browser; the app's own Evidence badges reported answer times of 0.5–1.5 seconds. The only console errors I saw were failed DuckDuckGo favicon requests (HTTP 404), not application crashes.

I made seven typed requests total: the required Bad Bunny question plus six off-script questions. I did not use the microphone, voice agent, or speech playback.

## Persona A walkthrough (what you did, what you saw, quotes of on-screen text)

I entered `/app` logged out. The first screen was attractive and understandable, but English-first: it asked where to open a business, offered six industry buttons, three artist shortcuts, tours, and a search box. The language control was the cryptic voice-style chip `EN · Andromeda`, so a Spanish-first, nontechnical owner might not recognize it as the language setting.

I selected Bakeries. The app immediately ranked towns using Qloo taste against Census business supply. The leading list showed Río Grande at taste rank 2 of 76, Luquillo at 3, Fajardo at 4, and San Juan at 5; it separately disclosed that Vieques, Culebra, and Maunabo could not be classified because Census counts were withheld.

I selected San Juan and read the sources. The result classified it as a bakery “gap”: Qloo taste rank 5 of 76, 16 establishments with employees, 0.5 per 10,000 residents versus a 1.3 grouping median, 37 Qloo catalog places, and 64 Overture places. It suggested visiting named bakeries, checking queues and prices, asking about rent and permits, and comparing another town. The short answer explicitly called the result “A lead, not proof.” Sources were clearly separated: County Business Patterns 2023, Qloo bakery heatmap affinity retrieved 2026-10-11, Puerto Rico Community Survey 2020–2024, and Overture release 2026-09-23.1. It also explained why the three place counts cover different scopes.

The limitation disclosure was unusually responsible: no claim of demand, sales, rent, foot traffic, permits, or profit; hours were described as a dated catalog snapshot; affinities were aggregate cultural patterns rather than facts about individuals.

I then chose Español. The tagline and voice chip changed, but the already-open San Juan research, warnings, buttons, and answer remained in English. A subsequent Spanish question — `¿Dónde me conviene abrir una panadería en Maricao y qué no puedes saber?` — did produce a largely Spanish result. It correctly said the Census supports only a 0–2 range, Qloo and Overture each list one place, and the evidence is insufficient; the panel's “Lo que no puede decir” section again named demand, sales, rents, foot traffic, permits, and profit. This was useful restraint for a small-town decision.

At 390 px, the initial screen was clean and usable. Once results and an answer were open, however, the map was almost entirely covered by two independently scrolling sheets; dismissing the answer and collapsing the result panel restored a good map experience.

## Persona B walkthrough

I switched back to English, changed the industry to Restaurants, and asked exactly: `Where do Bad Bunny fans eat in San Juan?` The answer named La Placita de Santurce (88% affinity), La Victoria (87%), Los Kings Lounge (87%), El Techo Rooftop (86%), and Oasis Tapas & Lounge (86%), while stating that these were Qloo affinities and not venues connected to Bad Bunny.

Evidence was not decorative. Expanding it showed a live-model run, one `artist_places` call, `San Juan, Bad Bunny, food → Qloo · 5 places · 0.2 s`, two model rounds, a 1.5-second total, a UTC timestamp, truncated Qloo IDs, and an `Ask again without Qloo` control. This is strong browser-visible provenance, although a blind browser review cannot independently prove what the server sent to Qloo.

On `/compare`, seven saved same-model/same-settings pairs disclosed the available tools and run time. Six removed Qloo while retaining map, weather, Wikidata, and Wikipedia tools; the final pair retained Qloo's place catalog but removed affinity tools. For the same San Juan/Bad Bunny question, the affinity run selected La Placita, La Victoria, and El Techo, while the catalog-only run fell back to La Placita, Bebo's Café, and Casita Miramar. Other pairs openly said when Qloo added nothing or when the no-Qloo model could not support a claim. That is credible evidence that Qloo changes the answer rather than merely decorating it.

Off-script checks:

- `Where should I go?` produced a sensible clarification about food, nightlife, outdoors, culture, or business scouting in the current town, with zero tool calls and a 0.9-second Evidence badge.
- `Which restaurant in San Juan has the cheapest rent and highest guaranteed profit?` refused the premise because the tools contain neither rents nor guaranteed returns, then offered restaurant density and a safer comparison step; Evidence showed two tool calls and 1.5 seconds.
- `Where do Taylor Swift fans eat in San Juan?` returned a meaningfully different Qloo ranking led by Cayo Blanco, JungleBird, and El Batey at 74–75%, rather than recycling the Bad Bunny list.
- `Where do fans of the invented artist 'Mar Azul 3000' eat in San Juan?` said Qloo found no matching artist and refused to invent a fan base or places. It then added an unnecessary speculative “blue-sea mood” fallback based on the invented name.
- The deliberate multi-town request `Compare opening a bakery in Vieques versus Culebra and give exact customer demand and expected monthly profit.` broke intent parsing: the app treated `Give Exact` as a place, claimed it was outside Puerto Rico, ignored both valid towns, and left stale San Juan content visible.

The compare page adapted cleanly to 390 px by stacking the with/without answers. The live result view did not: the old Taylor Swift result sheet remained above the no-match Mar Azul response, with both panes consuming nearly the whole viewport until manually dismissed or collapsed.

## Defects (severity High/Med/Low, reproducible steps)

- **High — directive text is parsed as a town, blocking a core comparison.** On `/app`, ask `Compare opening a bakery in Vieques versus Culebra and give exact customer demand and expected monthly profit.` The response treats `Give Exact` as the requested place, ignores Vieques and Culebra, leaves the URL at `#town=San+Juan`, and shows irrelevant stale San Juan results. A normal two-town business question therefore fails rather than comparing available data and refusing only the unsupported demand/profit fields.
- **Med — result state is not cleared or labeled stale after a no-result/error answer.** Ask for Taylor Swift fan places, then ask about the invented artist Mar Azul 3000; the answer correctly reports no match, but the details panel still says Taylor Swift fans and continues showing those places. At mobile width the contradictory old result and new answer appear simultaneously.
- **Med — Spanish localization is partial and state-dependent.** Open San Juan bakery research in English, select Español under `EN · Andromeda`, and observe that only the tagline/chip changes; ask a Spanish question and the new content localizes, but map controls, the search placeholder, `Dismiss`, `Research details`, and some subsequent place-card labels remain English or switch independently.
- **Med — mobile result mode is overcrowded.** At 390×844 after any place-rich answer, the details sheet and answer sheet each have a scrollbar and together obscure nearly the entire map; the user must discover two separate close/collapse actions to regain context.
- **Low — Spanish copy has visible grammar and formatting defects.** The Maricao result included singular/plural errors such as `1 lugares`, missing spaces between fields, concatenated labels, and the awkward contradiction that no catalog places exist except the one immediately named.
- **Low — external favicon requests produce console errors.** Opening place-rich San Juan results generated HTTP 404 errors for DuckDuckGo-hosted favicons for domains including `facciolapr.com`, `elconvento.com`, and `nps.gov`; content still worked, but the errors add avoidable noise and broken-image risk.

## Scores (four criteria, 1-5 each, one sentence of evidence per score)

- **Intelligent and thoughtful use of LLMs + Qloo API: 4/5.** Live tool traces, no-tool clarification, no-match restraint, artist-specific rankings, and a catalog-only counterfactual make Qloo causally relevant, but brittle entity parsing prevents a top score.
- **Technical implementation and execution: 3/5.** The fast 3D map, responsive comparison page, evidence instrumentation, multilingual generation, and graceful unsupported-data responses are substantial, but the reproducible core-query parser failure, stale state, partial localization, and crowded mobile results are material execution defects.
- **Originality and creativity: 5/5.** Combining all-town cultural affinity, observed/Census supply, an explorable map, agent tool traces, and a with/without-Qloo control is a distinctive hackathon concept rather than a generic recommendation chatbot.
- **Real-world application and potential impact: 4/5.** The product turns weak signals into concrete field checks and repeatedly limits its claims, but it still lacks the rent, demand, foot-traffic, permit, and economics inputs needed for an actual site decision and its Spanish-first experience is not yet dependable.

## Top 3 changes that would raise the score, in order

1. Make intent/entity parsing transactional: recognize multiple Puerto Rico towns, never promote directive fragments such as `give exact` into locations, test comparison prompts, and clear or explicitly mark prior results whenever a new request fails.
2. Finish the bilingual mobile product: expose an obvious Idioma/Language control, re-render the whole current state on language change, translate visible and accessible labels with proper pluralization, and replace the two competing mobile scroll sheets with one map/results mode or one coordinated bottom sheet.
3. Add a decision-grade town comparison workflow using current rents, foot traffic, permits, tourism/seasonality, and user-entered cost assumptions with dates and confidence ranges; do not promise profit, but let owners compare scenarios beyond cultural affinity and employee-establishment counts.

## What a rival entry would need to beat this

A rival would need to match Zemi-Aku's strongest differentiator — visible proof that Qloo changes a live agent's reasoning — while delivering more reliable multi-town planning, a genuinely end-to-end Spanish mobile experience, and fresher local business economics. A prettier generic recommender would not be enough; the winning alternative would pair traceable Qloo affinity calls with verifiable local demand/supply inputs, coherent failure states, and a comparison that a real owner could carry into rent and permit due diligence.
