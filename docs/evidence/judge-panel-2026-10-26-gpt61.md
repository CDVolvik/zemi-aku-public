## Browser used

Reviewed the public build on **26 October 2026, approximately 03:51–04:04 UTC**, using desktop Chrome through the browser interface, with rendered screenshots and DOM/accessibility inspection. I also used an incognito Chromium tab for the initial anonymous entry, the logged-out GitHub check, and a final anonymous quota check.

The collaborative browser's screenshot inspection failed twice with `Preview automation snapshot timed out after 15000ms`; I switched to Chrome for visual testing. Its incognito DOM inspection remained usable. Subsequent collaborative-browser keyboard/click automation also failed to submit the clean-session test; a direct DOM click on the visible bakery and town controls worked. Those automation timeouts are **not counted as site defects or answer latency**.

The app required no account. Chrome's GitHub session was initially signed in, so I repeated the repository inspection in incognito and verified that the public page offered sign-in. Repository observations below use that anonymous content; the additional Chrome screenshot was a visual cross-check.

Test budget: **11 submitted questions**: the three scripted questions, exactly six original off-script questions, and two replays of the scripted San Juan bakery question to check the quota/control behavior. No microphone, voice-agent session, speech playback, recorded tour, signup, or rival app was used. Phone testing used an actual **390 × 844 CSS-pixel viewport**; DOM measurement confirmed width and scroll width were both 390. I restored the desktop viewport afterward.

Only the supplied brief was read locally. This report is the only file written. I did not inspect local source, credentials, earlier reviews, or shared context, clone the repository, install dependencies, run its tests, modify the demo, or commit anything.

Timing evidence: the initial incognito document reported DOM readiness around 370 ms and load around 371 ms; this does not measure completion of the map or imagery. The first business answers displayed 1.3 s, 1.2 s, and 1.6 s. Measured submit-to-Evidence times for the method, rental, and sales probes were approximately 1.34 s, 2.20 s, and 0.69 s; those fast responses were fallbacks, not successful agent reasoning.

## Persona A walkthrough (what you did, what you saw, quotes of on-screen text)

**A1 — Spanish-first bakery owner.** I opened [/app](https://zemi.r21digital.com/app) without signing in. The first screen asked **“¿Dónde abro un negocio en Puerto Rico?”** over a satellite map with municipal boundaries. Industry buttons made the first action clear. I selected the Spanish bakery button, then San Juan from the candidate list. The app generated the bakery-opening question and opened a municipal research panel.

The bakery result classified San Juan as high taste affinity with relatively few employer establishments. It showed taste rank **5 of 76**, **16 Census establishments**, **0.5 per 10,000 residents**, **37 Qloo catalog records**, and **64 Overture records**. These numbers were visibly separated rather than presented as competing measurements of exactly the same population. The response included the short warning **“Pista, no prueba”** and practical checks involving local bakeries, rents, and permits.

I opened the source disclosure and, later, its complete definitions. These identified CBP 2023, population estimates from PRCS 2020–2024, the 11 October 2026 Qloo heatmap, Overture release 2026-09-23.1, and the bakery NAICS code. The panel explicitly excluded demand, sales, rents, pedestrian traffic, permits, and profit from what it could establish. It also warned that opening hours were dated catalog observations.

The expanded Evidence record listed four operations: `town_catalog`, `overture_supply`, `census_prcs`, and `opportunity_map`. It disclosed that rules produced the verdict while **deepseek/deepseek-v4.1-flash via OpenRouter** wrote the closing sentences from those sources. The displayed time was **1.3 s**. This was a sourced, deterministic siting screen with a live model contribution to its prose, not evidence that the model autonomously selected the research steps.

**A2 — Change industry.** I selected restaurants in the same town. The result changed to a competitive market: **rank 4 of 78**, **821 Census establishments**, **24.4 per 10,000**, **941 Qloo records**, and **1,209 Overture records**. The classification threshold was **9.6 establishments per 10,000**, versus **1.3** for bakeries. The sources explained that the restaurant Census count combines NAICS 722511 and 722513.

Evidence again disclosed the four-source business pipeline and the same live model for the closing prose, at **1.2 s**. This is meaningful industry sensitivity: the app did not simply reuse the bakery verdict. One prominent restaurant result was La Placita de Santurce, labeled as a bar; the app explained the source's broader restaurant categorization. That admission helps, although an owner still needs a more precise competitive set.

**A3 — Required artist question.** I entered the brief's exact question, `Where do Bad Bunny fans eat in San Juan?` The interface switched into English. It recommended Los Kings Lounge, El Techo Rooftop Bar, and Mesa 364, followed by additional places. The cards showed artist affinities around **85–88%**, ratings, hours, and map locations. It explained that affinity is not the proportion of fans who actually visit, and that these are not artist endorsements.

Opening Evidence exposed the major problem: **“Evidence · rules router · no model turn”**, with **`http-402`** given as the model failure. This answer came from a fallback router reading Qloo records. A nontechnical owner could receive plausible suggestions without realizing that the advertised conversational engine had failed unless she scrolled down and opened the disclosure.

**A4 — Readability and a real record.** I opened Panaderia y Reposteria America's card and its contact/source disclosure. It separated Qloo contact/rating data, Overture enrichment, and Esri aerial imagery, and admitted that OpenStreetMap lacked that place at that point. Audience connections loaded separately and were identified as audience taste, not the bakery's actual playlist.

The descriptive paragraph remained in English, explicitly marked **“Qloo · en inglés”**. This is honest but leaves a Spanish-first owner translating substantive business descriptions. On desktop, a left research panel and a separate scrollable answer box competed for attention; the map was visually strong but the reading workflow was less direct than the initial industry choice.

## Persona B walkthrough

**B1 — What is demonstrably an agent?** I inspected the expanded Evidence lines, the [front page's architecture explanation](https://zemi.r21digital.com/), and [/compare](https://zemi.r21digital.com/compare). The public explanation distinguishes a rule-based siting verdict from model-written commentary. The three initially successful business requests support that distinction. They do not independently demonstrate a functioning general tool-choosing agent.

The artist request and five other distinct off-script requests reported HTTP 402 and a rules engine. This is the decisive live-demo weakness. Transparent fallback labeling deserves credit; it does not supply the missing model turn. I cannot infer whether the HTTP 402 originated in account funding, provider policy, or another upstream condition from the UI alone.

**B2 — Off-script question 1: different artist.** I asked `Where do Taylor Swift fans eat in San Juan?` The first results changed to **Cayo Blanco Seafood Restaurant, Serafina San Juan Restaurant, and JungleBird**, with affinities around **73–75%**. Bad Bunny's first three venues were different; several later venues overlapped.

This is evidence that the public taste output changes with the artist, including an artist outside the three prominent entry buttons. It is not independent verification of Qloo's upstream responses or a measure of recommendation quality. Evidence again identified the rules router and HTTP 402, with no model answer.

**B3 — Off-script question 2: deliberately ambiguous follow-up.** I asked `¿Y allí?` after the Taylor Swift result. The app said the model was unavailable, described the fixed forms it could currently answer, and declined to guess. Evidence again identified rules and HTTP 402. This is preferable to inventing a referent, but it cannot deliver the conversational follow-up promised by the product in that state. During the language switch, parts of the existing result stayed in English while interface controls switched to Spanish.

**B4 — Qloo control.** The comparison page presented **seven saved pairs**, dated **24 October 2026, 22:24 UTC**, naming the model, prompt/settings controls, tools, and tool-call traces. Six pairs remove the Qloo catalog and taste tools while retaining map, weather, Wikidata, and Wikipedia. Those pairs mostly establish the value of having verified place data; they do not isolate taste inference.

The seventh pair is the more convincing design: both sides retain the Qloo catalog, but one loses affinity tools. For the San Juan Bad Bunny question, both sides mention La Placita; the page attributes the taste-specific difference to **La Victoria**. This is a modest, intelligible example of incremental taste value, not a broad superiority result.

I found a substantive overclaim in another saved pair. The Calle 13 answer describes San Juan as the strongest town after showing eight results each for San Juan, Bayamón, and Ponce, with a Trujillo Alto call dropped. The visible record does not establish an island-wide maximum, a complete town search, or a reproducible town aggregation. A few attractive venue matches should not become a municipal superlative.

**B5 — Try the live control after failures.** I replayed the scripted San Juan bakery question once in Chrome and once in incognito. Both still returned the sourced bakery verdict. Both now disclosed **no model turn** because the available model turns for the day had been used. The repeat in Chrome took about **0.86 s**.

The earlier successful business answers had offered a control to ask again without Qloo. These later non-model answers did not, so I could not run a contemporaneous live ablation. I did not repeatedly retry or spend additional queries. The two browser contexts do not establish whether the quota is visitor-, IP-, or globally scoped, and I do not claim that this review alone exhausted it.

Across the 11 submitted questions: **3 disclosed live model-written business notes, 6 disclosed HTTP-402 rules fallbacks, and 2 disclosed quota-limited business answers without a model note**. None of the observed general conversation requests demonstrated a successful live model/tool loop.

**B6 — Is anything fabricated?** I found no evidence that the demo secretly passed a recorded answer off as a live model run. The live output disclosed rules, source dates, and quota failures; the comparison page disclosed that its runs were saved. The first business verdicts were explicitly rule-derived. These are strengths. The unsupported Calle 13 superlative and the irrelevant method-question answer below are still reliability defects. I did not independently certify every venue, phone number, upstream API response, or saved trace.

## Persona C walkthrough (expert critique of the method)

**C1 — Off-script question 3: small town.** I asked `¿Debo abrir una panadería en Adjuntas?` at phone width. The app returned **rank 32 of 76**, **5 Census establishments**, **2.8 establishments per 10,000**, **2 Qloo bakery records**, and **4 Overture records**. It classified Adjuntas as competitive, named Robles Bakery and Kamal Bakery, and recommended on-site checks. Population was **17,960**; median household income was **$19,549 ± $1,426**, with the confidence level stated.

Evidence showed the four-source business pipeline, a live model-written closing note, and **1.6 s**. The thin catalog did not prevent a usable result because the employer supply measure came from Census. However, the very small venue list is a poor basis for a complete competitive reconnaissance.

At 390 px, the page had no horizontal overflow in my measurement. The research sheet, answer sheet, text entry, and Evidence disclosure remained operable. Opening one sheet collapsed the other answer into a preview. Long evidence required scrolling through cards in a narrow, independently scrolling region. I verified usability at that width; I did not test Safari, a physical iPhone, its keyboard, or touch performance.

**C2 — Off-script question 4: explain the method.** I asked:

`¿Por qué San Juan es una brecha para panaderías si Qloo muestra 37 y Overture 64? ¿Cómo calculas 0.5 por 10,000?`

The response instead offered San Juan food suggestions headed by **La Placita de Santurce and The Cheesecake Factory**, plus a geographical correction about Isla Verde. It did not explain the bakery counts or calculation. Evidence showed the rules router and HTTP 402. This is a reproducible semantic failure: an apparently substantive answer to an audit question that actually changes the subject.

The arithmetic itself is coherent using the displayed inputs: **16 / 336,160 × 10,000 = 0.476**, rounded to **0.5**. For restaurants, **821 / 336,160 × 10,000 = 24.42**, rounded to **24.4**. Those checks verify arithmetic, not the original source extraction.

**C3 — Off-script question 5: availability and budget.** I asked:

`Busco un local en alquiler por menos de $1,000 al mes en Ponce para una panadería. ¿Tienes alguno disponible?`

The app declined because the general model was unavailable and the request fell outside its current fixed forms. Evidence showed rules and HTTP 402. It invented neither an available storefront nor a rent. It also did not turn this concrete owner need into an evidence-led next action.

**C4 — Off-script question 6: unsupported financial forecast.** I asked:

`¿Qué ventas mensuales y probabilidad de éxito tendría una panadería en Loíza?`

It declined and explicitly noted that its sources contain no sales or profit data. Evidence again showed rules and HTTP 402. This boundary held; I did not get a fabricated monthly revenue or success probability.

**C5 — What the method does well.** It separates employer establishments, broader place catalogs, and cultural affinity; uses dated source releases; normalizes establishment counts by population; states the industry crosswalk; distinguishes the municipal map from a 3 km nearby-place circle; and exposes suppressed-count handling. Its definitions also admit that the denominator has sampling uncertainty that the displayed per-capita rate does not show. The source disclosure is materially more careful than an unexplained opportunity score.

The app treats an unpublished small CBP cell as a **0–2 interval**, rather than a certain zero, and classifies it as low supply only where even the upper bound would remain below the threshold. That approach is consistent with the historical three-establishment publication rule documented for the [2023 CBP table](https://data.census.gov/table/CBP2023.CB2300CBP). I found no reason to label that rule itself a defect. Combined-NAICS categories still need an auditable account of how multiple suppressed or missing component cells are handled; I did not audit their implementation.

**C6 — Where it could mislead a client.**

- **Taste is not unmet spending.** A municipality being above the island median on affinity and below it on employer-establishment density is a screening rule. It does not estimate addressable customers, leakage, sales capture, unit economics, or causal demand. The disclaimers say this; the opening-a-business framing and gap label can still encourage a stronger reading.
- **The geography is too coarse for a lease decision.** Municipality averages and straight-line peer circles ignore travel times, physical barriers, neighborhood variation, and cross-border catchments. A San Juan-wide verdict cannot rank two storefronts in different barrios.
- **The population denominator is not the trading population.** Commuters, tourists, daytime workers, and delivery customers matter. Using residents alone can change the apparent supply of metro and tourist towns substantially. The observed data do not quantify that effect.
- **Employer counts omit relevant supply.** Home-based, informal, self-employed, and differently classified bakeries can compete for the same purchase. Qloo and Overture are useful checks, but 37 versus 64 versus 16 cannot be reconciled into an exact current competitor census without matching records and categories.
- **Dates do not align.** CBP 2023, PRCS 2020–2024, September 2026 Overture, and October 2026 taste signals describe different periods. Displaying those dates is good practice; it does not remove the temporal mismatch.
- **Precision exceeds validation.** Taste ranks, binary median cutoffs, and rounded per-capita rates appear decisive without showing rank stability, distance from the cutoff, or how missing heatmap cells influence a town's mean. I saw no cell-coverage/weighting audit or sensitivity analysis. This is an evidence gap, not proof that the calculation is wrong.
- **Affinity scores require context.** [Qloo's own interpretation guide](https://github.com/qloo/docs-public/blob/main/docs/interpreting-affinity-scores.md) cautions that scores are normalized per query and that small differences often imply similar relevance. The UI correctly denies that 87% means 87% of fans visit. It should also prevent cross-query or one-point differences from looking like statistically meaningful business distinctions.
- **No measured business outcome was presented.** The seven saved controls show differing answers, not validated improvement in site selection. I saw no independent field check, owner pilot outcome, or held-out assessment connecting the municipal classification to a better decision.

**C7 — Limitations inventory.** The surfaces I opened admitted incomplete/uneven Qloo and Overture coverage; aggregate rather than personal taste; non-endorsement of artists; non-probabilistic affinities; employer-only Census scope; small suppressed cells; PRCS uncertainty; dated hours and contacts; different municipal and peer-circle geographies; lack of rents, demand, sales, profit, permits, or footfall; explicitly rule-derived verdicts; saved rather than fresh comparison runs; failed model turns; daily caps; English source descriptions; and an unverified upcoming iPhone build. The public documentation also distinguishes the live demo from a fresh clone that lacks private saved Qloo results. These admissions substantially improve trust. They do not establish commercial validity.

I would put this in front of a client as an **exploratory research screen accompanied by an analyst**, with source reconciliation and field checks. I would not use the observed evidence to recommend signing a lease.

## GitHub repository first impression

**B7 — Anonymous showcase check.** The [public repository](https://github.com/CDVolvik/zemi-aku-public) was accessible without login. The main branch showed commit **ba77fb4** during this review. The initial viewport was dominated by the file listing and About text; the README was below it.

The About text makes Puerto Rico, Qloo, a map, and Census/Overture evidence clear quickly. The README's introduction explains music-to-place discovery in under 30 seconds. However, that is a different lead story from the live site's business-opening question. Its prominent status paragraph is dated **17 October**, while later changes are visible in the repository.

There is **no screenshot, GIF, or architecture image in the rendered README**; anonymous DOM inspection found no images in its article. For a visually distinctive map project, that wastes its strongest immediate proof. The long opening status paragraph mixes the model, voices, hosting, controls, coastal work, business research, release links, and deadline before providing a clean judge path.

Setup is better than the presentation: Node and pnpm versions, locked installation, a Docker alternative, credential purposes, test/audit commands, and source-data omissions are documented. The README claims **508 automated tests** and explains four fresh-clone skips. **I did not run or verify that suite.** The rebuild instructions for saved comparisons are useful, but a clean clone will not immediately reproduce the hosted evidence without the necessary keys and generated data.

The module responsibility table explains where conversation, tools, business evidence, and budgets live. Actual Qloo endpoint usage is not explained compactly in the README itself; the [front page's endpoint table and system diagram](https://zemi.r21digital.com/) communicate that better. The README says 18 tools while the front page counter says 17. That small inconsistency makes a judge spend time reconciling documentation rather than assessing the work.

A stronger finalist showcase would lead with a screenshot, the owner problem, a 60-second test path, one current successful agent trace, a small endpoint-to-feature map, and an honest three-arm control. I would retain the detailed run instructions below that. This is a presentation judgment, not a claim about how every past winner structures a repository.

## Defects (severity High/Med/Low, reproducible steps)

1. **High — General conversational engine repeatedly unavailable.** **Personas A/B/C.** Open /app, enter the required Bad Bunny question, wait for its answer, and expand Evidence. In this review it reported HTTP 402 and a rules answer; Taylor Swift and the four other general probes did the same. Expected: a successful live model/tool run, or a prominent degraded-mode state before the owner interprets the response as conversational research. No upstream cause is proven here.

2. **High — Audit question silently becomes a restaurant search.** **Persona C.** Submit the exact count/calculation question in C2 while the fallback is active. The result recommends La Placita and The Cheesecake Factory instead of explaining bakery counts. Expected: answer the calculation from the available evidence, ask a clarification, or refuse explicitly. A confident answer to the wrong question is worse than a clear boundary.

3. **Med — Saved comparison makes a town-ranking claim its visible search does not support.** **Personas B/C.** Open /compare and find the Calle 13 town question. Read the strongest-town conclusion beside calls for three towns and a dropped fourth. Expected: limit the conclusion to evaluated candidates, define the aggregation, and disclose search coverage. This finding is about the displayed evidence; I did not inspect the comparison generator.

4. **Med — Live ablation disappears exactly when judge verification needs it.** **Persona B.** After a fallback or quota-limited response, expand Evidence. The current non-model answers offer no fresh without-Qloo control. The repeat bakery case was quota-limited in both browser contexts. Expected: expose control availability and reason up front, and make the judge able to distinguish a saved control, an executable control, and an unavailable one. The quota itself may be intentional; the verification gap remains.

5. **Med — Source audit does not expose enough spatial/uncertainty detail for the rank's apparent precision.** **Persona C.** Choose bakeries, San Juan, expand the method definitions, and attempt to establish cell coverage, weighting, threshold distance, and rank stability. The visible disclosure describes a cell average and median split but does not provide those diagnostics. Expected: a reproducible aggregation specification and explicit uncertainty/coverage indicators. This is a methodological disclosure defect, not a demonstrated erroneous rank.

6. **Low — Spanish-first research still requires English reading.** **Persona A.** In the Spanish bakery flow, open Panaderia y Reposteria America. The substantive description is English, labeled as such. Expected: an optional Spanish rendering that preserves source attribution. Language switching after the artist result also left some prior explanatory text in English.

7. **Low — Dense nested scrolling hides verification.** **Personas A/C.** At 390 × 844, ask the Adjuntas bakery question and open the research sheet, then the answer and its Evidence. The controls work and there is no observed horizontal overflow, but the user must manage separate scrolling panels and pass venue cards to reach provenance. Expected: a short result with a directly reachable source/engine summary.

8. **Low — Repository showcase and tool-count documentation lag the live positioning.** **Persona B.** Open the public repo logged out, then the front page. The README lacks a visual and leads with music; the site leads with opening a business. Compare the README's 18-tool statement with the front page's 17-tool counter. Expected: one current lead use case and one consistent tool inventory.

Reproduction statements describe the review window and may change with quota reset or a deployment. The browser-interface timeouts are excluded from this defect list. I found no observed fabricated rent, sales forecast, celebrity endorsement, undisclosed live replay, or horizontal phone overflow.

## Scores

Scores assess the observed public entry, including failures. Half points are used. These are judging estimates, not predicted panel results.

**Official criteria**

| Criterion | Score / 5 | Evidence |
|---|---:|---|
| Technological Implementation | 2.5 | The sourced municipal pipeline and map work, but all six observed general conversation requests fell back after HTTP 402 and later replays lost their model note to quota. |
| Design | 3.5 | The Spanish industry entry and distinctive spatial interface are effective, while nested reading panels, buried engine status, partial localization, and a text-only README weaken the judge journey. |
| Potential Impact | 3.0 | It gives a Puerto Rico owner a useful first research filter, but neither storefront suitability nor improved business decisions has been independently validated in the evidence presented. |
| Quality of the Idea | 4.0 | Combining taste with employer supply and explicit source disagreements creates a coherent owner question, although municipality-scale screening leaves substantial work before an actionable site decision. |

**Official total: 13.0 / 20.**

**Legacy criteria**

| Criterion | Score / 5 | Evidence |
|---|---:|---|
| Intelligent and thoughtful use of LLMs + the Qloo API | 2.5 | Artist-dependent results and the catalog-only control show thought about Qloo's contribution, but no observed general request completed a live model/tool loop. |
| Technical implementation and execution | 2.5 | Four dated evidence sources, changing industry results, record drill-down, and working phone controls demonstrate execution, constrained by repeatable live-engine and semantic failures. |
| Originality and creativity | 3.5 | Puerto Rico's municipal atlas and culturally grounded discovery are distinctive, while taste-based business gap analysis overlaps directly with another reviewed entry. |
| Real-world application and potential impact | 3.0 | The owner gets named places and practical next checks with responsible boundaries, but no measured client outcome or validated site-selection lift was shown. |

**Legacy total: 11.5 / 20.**

I would not currently recommend this as a first-place entry. The working evidence design is stronger than the broken general-agent experience. I cannot infer an overall rank among roughly 360 entries from three rival pages, and a software test count does not substitute for a successful live judge session.

## Path to first place

Ranked by expected judging benefit. Point changes below are estimates on the individual 1–5 criterion, are not additive promises, and assume the fix is demonstrated.

1. **Restore a dependable live general-agent session.** **Technological Implementation +1.0; legacy LLM/Qloo +1.0.** Resolve the observed HTTP 402 path, reserve enough correctly scoped quota for a short anonymous judge session, show degraded mode before submission, and demonstrate an unfamiliar question plus one follow-up with real tool traces. Merely changing the fallback wording will not earn this gain.

2. **Make Qloo's incremental taste value inspectable and fairly measured.** **Technological Implementation +0.5; Quality of the Idea +0.5.** Provide catalog-plus-taste, catalog-only, and no-Qloo arms for the same inputs; make the live control available or explicitly unavailable; include several unseen questions, negative cases, and outcomes beyond changed venue names. Fix the Calle 13 superlative. This is a bounded evaluation task, not a request to add more endpoints.

3. **Validate the municipal screen against independent ground evidence.** **Potential Impact +1.0; Quality of the Idea +0.5.** Preselect a small set of towns/categories, independently check a sample of establishments, have owners/analysts assess the resulting shortlist, and publish disagreements and uncertainty. Test whether the screen changes a useful research decision before claiming predictive demand or commercial success.

4. **Make the method reproducible at the level it is presented.** **Technological Implementation +0.5; Potential Impact +0.5.** Expose heatmap field, cell coverage/weighting, missing-cell treatment, suppressed-component aggregation, exact median thresholds, and sensitivity near each boundary. Add an explicit explanation that a municipal result cannot choose a storefront. A later travel-time catchment can address site-level use; it should not block an honest municipal prototype.

5. **Align the entire first minute around one owner job.** **Design +0.5; Quality of the Idea +0.25.** Use the same bakery-owner problem on the landing page, README, and scripted demonstration; make music discovery a supporting capability; lead the README with an actual product screenshot and one compact feature-to-Qloo-endpoint diagram. Move hosting history and secondary features below the judge path, and reconcile the tool count.

6. **Make answer, engine, and sources one readable unit.** **Design +0.5.** Put the verdict, its meaning, data dates, current engine state, and source access before long venue lists; reduce competing scroll regions at 390 px; keep the input and source controls reachable. Provide an optional Spanish version of English source descriptions, clearly attributed.

7. **Turn the research screen into a portable next step.** **Potential Impact +0.5; Design +0.25.** Extend the existing copy-summary capability into a short comparison brief containing the selected industry, two candidate towns, source dates, reasons, unresolved questions, and a visit checklist. Test it with a real owner; record whether it helps schedule a visit or rule out a bad assumption. Keep lease availability and forecast claims out unless actual data supports them.

## What a rival entry would need to beat this, with reference to the three rivals read

I read exactly the three requested Devpost pages and did not open their apps or repositories. The following are **their submission claims**, not independently verified behavior.

**[Crowdspawn](https://devpost.com/software/crowdspawn)** presents an indie-game launch decision with eight agent tools, call-level citations, and explicit Qloo endpoint mapping. Its page reports both partner-specificity advantages and a held-out country-ranking loss to an LLM baseline. That combination is a serious judging threat: a rival could beat Zemi by delivering a working autonomous session, an immediately legible decision artifact, and a baseline with published failures. Crowdspawn's admitted country-ranking weakness also shows why more API calls and geographic scores do not by themselves prove impact.

**[Walk-in](https://devpost.com/software/walk-in)** is the closest conceptual rival. It claims storefront-level travel-time areas, comparisons with nearby areas, an OpenStreetMap supply check, enforced owner constraints, and a shareable launch kit. Its page also admits that taste is not sales and describes limits on large-area checks. If that workflow works as described, it answers the small-business owner's actual site-and-constraints question more directly than Zemi's municipal map. To beat Zemi convincingly, it would need to demonstrate its geographic method and reliable constraint handling live, not merely label a taste gap as demand.

**[Tastecraft](https://devpost.com/software/tastecraft-ih58aw)** focuses an existing restaurant on next week's dishes, event, campaign, and supplier plan. Its page distinguishes impressive in-sample results from a preregistered 22-restaurant comparison showing a +10% gain over the same model alone with an interval spanning zero, and reports where it loses. A rival could beat Zemi through that combination of a concrete owner output, visible execution, and disciplined evaluation. Tastecraft's result remains a Qloo-derived proxy, not customer purchases; Zemi could differentiate with independent owner or field evidence rather than a larger unvalidated score.

The competitive bar is therefore a **reliable live agent, demonstrable incremental taste value, a specific action the owner can take, and measured limits**. Zemi already has a visually distinctive Puerto Rico map and unusually explicit source separation. The current entry still needs the live reliability and decision evidence that would make those strengths decisive.

