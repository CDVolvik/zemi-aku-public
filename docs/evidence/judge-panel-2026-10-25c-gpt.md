## Browser used

Real Chromium through Playwright CLI in a fresh browser session, with no login or saved site state. I tested the desktop layout first, then resized the same browser to 390×844. The cold open, including browser startup, returned in about 2.8 seconds; `/compare` navigated in about 1.4 seconds. The app's own Evidence panels reported answer times from 0.5 to 4.9 seconds; my slowest end-to-end submission returned in about 6.8 seconds. I did not use the microphone, voice agent, or speech playback.

## Persona A walkthrough (what you did, what you saw, quotes of on-screen text)

I opened `/app` logged out. There was no login wall or consent interruption. The first screen was visually strong and immediately task-oriented, but it defaulted to English: “Where should I open a business in Puerto Rico?” and “Qloo's taste for all 78 towns, against the businesses the Census already counts.” The large industry buttons were understandable to a nontechnical owner; “EN · Andromeda” was not self-explanatory.

I chose **Bakeries**. The app replaced the hero with “Where should I open a bakery?”, a four-part legend, and “Strongest taste with few businesses.” It surfaced Río Grande, Luquillo, Fajardo, San Juan, Loíza, Rincón, Guaynabo, and Carolina rather than making me hunt town by town. It also disclosed that Vieques, Culebra, and Maunabo were omitted from this group because the Census withholds their counts.

I selected **San Juan**. The response appeared in roughly three seconds end to end, while its Evidence strip reported 0.5 seconds. The decision summary said: “Gap: taste above the median, few businesses · taste #5 of 76,” then gave 16 establishments with employees, 0.5 per 10,000 residents, 37 Qloo catalog places, and 64 Overture places. The app clearly explained why those counts differ. It named specific places, ratings, hours, directions, and three practical next checks.

The strongest part for a business owner was the restraint. The screen said, “Places recorded by Qloo, not confirmed businesses for sale,” and “Affinities, demographics and observed supply are not proof of demand or profitability.” Under “What it cannot tell you,” it listed demand, sales, rents, foot traffic, permits, and profit. Sources were identified as County Business Patterns 2023, Puerto Rico Community Survey 2020–2024, a Qloo heatmap retrieved 2026-10-11, and Overture release 2026-09-23.1. That is unusually good decision hygiene for a hackathon demo.

I then asked in Spanish: “¿Dónde debería abrir una panadería en Adjuntas y qué debo verificar antes de firmar un local?” The app switched the result and most of the interface to Spanish. It called Adjuntas “Competido,” gave 5 employer establishments and 2.8 per 10,000 residents, named Robles Bakery and Kamal Bakery, and explicitly advised: “Pregunte rentas en la calle principal y los permisos en el municipio antes de firmar.” It also said what it could not know. The short answer toast omitted that second part, but the full research panel contained it.

For an intentionally ambiguous test, I asked: “Quiero algo rico, cerca y tranquilo. ¿Qué me recomiendas?” With no town or location context, it did not invent an answer. It asked: “¿Me dice en qué pueblo está y qué se le antoja: comida, café y dulces, o algo tranquilo para beber?” I replied only “Utuado; café y dulces.” It handled the terse follow-up, returned Café Jumao, Pastelillera Otoao, and Isla Café, and added current weather advice. Evidence showed four calls: map Utuado, a Qloo café search with eight results, a Qloo sweets search with zero results, and National Weather Service/National Hurricane Center weather.

At 390×844, the home screen remained legible and all main category buttons fit. Result mode was much denser: a tall details sheet, a separate answer sheet, nested vertical scrollbars, and a horizontal place-card scroller occupied almost the whole display. It was usable, but a nontechnical owner would have to discover several independent scroll regions. Spanish mode was incomplete: tour buttons, “By category,” “Ask Zemi-Aku,” suggested questions, and some accessibility labels remained in English.

## Persona B walkthrough

I changed the industry to **Restaurants**, then asked the required question: “Where do Bad Bunny fans eat in San Juan?” The live answer named La Placita de Santurce, La Victoria, and Los Kings Lounge, clearly qualifying them as places fans like rather than places tied to Bad Bunny. Place cards showed 86–88% affinities, ratings, hours, photos, and directions.

The opened Evidence panel made the agent behavior visible: `artist_places` with San Juan, Bad Bunny, and food returned five Qloo places; `map_town` moved the map; the panel reported one tool call, two model rounds, a 2.2-second answer, a UTC timestamp, the model/provider, and truncated Qloo IDs. This is observable tool use, not merely an answer that mentions Qloo.

I pressed **Ask again without Qloo**. The control answer said it had no taste-affinity tool and would not guess verified fan favorites. The UI placed both answers together and stated: “Qloo changed: La Placita de Santurce, La Victoria, Los Kings Lounge”; those mapped places were removed from the control result. This is compelling evidence that Qloo affects the output.

I then opened `/compare`. It presents seven saved A/B pairs, labels the model, prompt/settings, enabled tool sets, tool calls, catalog-place counts, and run time (2026-10-24 22:24 UTC). Six controls remove Qloo tools; the final San Juan pair keeps the Qloo catalog but removes affinity tools, isolating the taste signal from mere catalog access. The page is static and dated, but the live on-demand control above compensates for that limitation.

To test whether the experience was hard-coded around the three preset artists, I asked at phone width: “Where do Taylor Swift fans eat in Ponce?” It returned six distinct Ponce places and affinity percentages. Evidence showed `artist_places` for Ponce, Taylor Swift, and food returning six Qloo places, plus `map_town`, two rounds, a 2.3-second answer, a current timestamp, and six Qloo IDs. That generalization materially reduces the chance that the showcased Bad Bunny path is a canned demo.

The evidence is strong but not fully auditable. A judge can see summarized calls, counts, timings, and shortened IDs, but cannot inspect the raw Qloo response or connect each generated attribute—such as “vegan small plates,” ownership, or a venue's hours—to a field-level source from the UI. The app repeatedly admits catalog freshness and coverage limits, which is honest, but those claims still require trust.

## Defects (severity High/Med/Low, reproducible steps)

- **High — none reproduced.** I saw no crash, data loss, authentication leak, or completely blocked core journey.

- **Med — the fixed ask bar can block the main source disclosure.** Desktop steps: `/app` → Bakeries → San Juan → scroll to the bottom of the long details list → click “Sources and the record behind this answer.” The fixed search/dock bar sat over the disclosure and intercepted the pointer repeatedly; I could open it only with programmatic activation. This is especially damaging because provenance is a core judging claim.

- **Med — a material user constraint can disappear.** Ask: “Entre San Juan y Ponce, ¿dónde abrirías una panadería vegana si la renta es mi prioridad?” The answer correctly said rent data was unavailable and compared generic bakery counts, but never mentioned “vegana,” vegan demand, vegan competitors, or the absence of vegan-specific data; it then recommended a generic bakery visit. A business user could mistake a generic bakery comparison for an answer to the constrained question.

- **Med — the headline coverage claim contradicts the detailed disclosure.** The home screen says “Qloo's taste for all 78 towns,” but the bakery ranking later says, “Ranks are among the 76 of 78 towns with Qloo taste data.” Reproduce with `/app` → Bakeries and read the ranking footer. The map may cover 78 municipalities, but the copy claims taste data for all 78 when the app itself says only 76 have it.

- **Low — Spanish localization is partial.** After asking a Spanish question, return to `/app`, open a town's full catalog, and switch browsing modes. The hero and category buttons are Spanish, but tour names, “By category,” “Ask Zemi-Aku,” example questions, the searchbox accessibility name, and some group labels remain English. The initial visit also starts in English without an obvious “Español” label; “EN · Andromeda”/“ES · Selena” looks like a model selector rather than a language control.

- **Low — phone results use too many competing scroll surfaces.** At 390×844, ask “Where do Taylor Swift fans eat in Ponce?” The map is mostly covered by the details/answer sheet, place cards scroll horizontally, the sheet scrolls vertically, the outer panel has another vertical scrollbar, and Evidence sits beneath the card strip. Nothing was impossible, but discovery and comparison were cumbersome.

- **Low — the visible audit trail stops short of claim-level proof.** Ask any artist-place question and open Evidence. It shows tool names, summarized inputs, result counts, timings, and shortened IDs, but not raw returned fields or a source link per claim, so a judge cannot verify whether descriptions, hours, ratings, and affinity labels came from Qloo or model prose.

- **Low — a place-type/hours combination creates a credibility flag.** The Bad Bunny result presents La Placita de Santurce—a district/market-nightlife hub—as one “Food” place with one rating and “Open 24 hours.” Even if this is exactly the catalog record, the UI should distinguish an area from an individual restaurant and avoid implying every stall is open continuously.

- **Low — one noncritical resource failed.** On the San Juan bakery path, the console logged a 404 for `https://icons.duckduckgo.com/ip3/facciolapr.com.ico`; the missing favicon did not block the card or core flow.

## Scores (four criteria, 1-5 each, one sentence of evidence per score)

- **Intelligent and thoughtful use of LLMs + the Qloo API — 5/5.** Arbitrary artist/town queries produced visible Qloo tool calls and mapped results, while live and saved no-Qloo controls demonstrated exactly what the taste signal changed and the agent declined to guess when tools lacked support.

- **Technical implementation and execution — 4/5.** The globe, town research, catalog, multilingual responses, live evidence, current weather, sources, and control experiment worked responsively on desktop and phone, but the blocked source disclosure, mixed localization, dense mobile scrolling, and incomplete traceability keep it from a five.

- **Originality and creativity — 5/5.** Combining cultural affinity, municipal taste heatmaps, Census employer density, Overture supply, place discovery, weather, and an interactive counterfactual test is a distinctive use of Qloo rather than a generic recommendation chatbot.

- **Real-world application and potential impact — 4/5.** The product can generate useful leads and a sensible due-diligence checklist for all Puerto Rico municipalities, but it lacks decisive business inputs such as rent, foot traffic, permits, revenue, menu verification, and constraint-specific demand, and one test dropped a crucial vegan requirement.

## Top 3 changes that would raise the score, in order

1. Make constraint fidelity and claim provenance first-class: show a compact checklist of what the user asked, mark each constraint as answered/unsupported, refuse to rank when the deciding variable is missing, and let every generated fact expand to the exact source field, full Qloo ID, retrieval date, and raw/redacted tool response.

2. Fix the evidence and mobile interaction layer: keep source disclosures above the dock, use one vertical scroll container on phones, avoid overlapping full-height sheets, make place cards stack cleanly, and finish Spanish localization—including accessible names and a plainly labeled language switch.

3. Add decision-grade validation data or integrations for rent, foot traffic, permits, current menus/dietary fit, closure/current-hours checks, and confidence/freshness; until then, visually separate “lead-generation signal” from “site-selection evidence” and distinguish districts from individual businesses.

## What a rival entry would need to beat this

A rival would need more than attractive recommendations. It would have to match this entry's live, non-preset Qloo tool use; geographic breadth; candid limitations; and same-model with/without-Qloo experiment, then surpass it with field-level reproducibility, current verified place data, complete bilingual UX, and a calmer mobile information architecture. The decisive advantage would be a demonstrably better business decision loop: preserve every user constraint, quantify uncertainty and missingness, combine taste with real operating economics, and show through a larger repeatable evaluation that Qloo improves answer quality rather than merely adding named places.
