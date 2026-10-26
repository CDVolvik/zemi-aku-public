## Browser used

Google Chrome was used as a real browser at a desktop viewport (approximately 1456×696) and at an explicit 390×844 mobile viewport. The hosted app was used as a public visitor with no app login. The public GitHub first screen was rechecked through an unauthenticated fetch (the page showed **Sign in**) because the available Chrome profile itself was signed into GitHub; no private repository surface informed this review. I opened exactly the three assigned rival Devpost pages and did not open their apps.

I did not use the microphone, voice agent, or speech playback. I ran seven substantive questions/interactions: the two guided San Juan business questions, the required Bad Bunny question, four off-script prompts, and one same-question rerun with Qloo disabled. This stayed below the brief's cap.

Observed speed was good on grounded routes: the initial app was usable in roughly two seconds; guided business answers reported 0.9–1.5 seconds; `/compare` loaded in about 0.8 seconds. The live no-Qloo control took 14.4 seconds. Free-form model failures fell back almost immediately.

## Persona A walkthrough (what you did, what you saw, quotes of on-screen text)

I arrived to a Spanish-first full-island map. The opening question was **“¿Dónde abro un negocio en Puerto Rico?”** with six plain industry buttons and artist shortcuts. That is a strong first contact for a Puerto Rico owner: no prompt-writing knowledge is required, and English is one visible toggle away.

I chose **Panaderías**, then **San Juan**. The island view first explained its four groups—gap, competitive, quiet, saturated—and explicitly said **“No mide demanda, ingresos ni ganancias.”** The source notes named County Business Patterns 2023, a Qloo bakery heatmap collected 2026-10-11, and Puerto Rico Community Survey 2020–2024 population. They also explained Census suppression: an unpublished count means zero to two establishments, not zero.

For San Juan, the app called bakeries a gap: Qloo taste rank 5 of 76, 16 employee establishments, 0.5 per 10,000 residents versus a 1.3 group-splitting median, 37 Qloo catalog places, and 64 Overture places. It separated the incompatible counts rather than pretending they were equivalent. It showed population 336,160, median household income $27,992 ± $1,036, examples of named bakeries, and practical next steps: visit competitors, check rents and permits, and compare another town. The summary's **“Pista, no prueba”** framing was appropriate.

I changed the industry to **Restaurantes**. San Juan changed from gap to competitive: taste rank 4 of 78, 821 employee establishments, 24.4 per 10,000 versus a median of 9.6, 941 Qloo places, and 1,209 Overture places. The app again stated that it cannot infer demand, sales, rents, foot traffic, permits, or profit. It also admitted that Qloo classifies some bars as restaurants, which explains otherwise surprising results such as La Placita de Santurce.

At 390 px, the landing flow remained usable with no horizontal document overflow. Buttons, language controls, map controls, and the ask bar stayed reachable. The search placeholder was visibly clipped, and an expanded evidence panel became extremely dense, but the answer dock sensibly collapsed when the detail panel opened.

For the small-town test, I asked `¿Dónde abro una panadería en Maricao?`. The app returned **“Datos insuficientes”**, not a false zero: taste rank 37 of 76, zero to two employee establishments, one Qloo place, one Overture place, population 4,988, and a wide income margin. It recommended an in-person check and a municipal count. This was the most responsible answer in the session.

When I asked which town would make the most money, the app refused to guess and said none of its sources contain sales or profit. That protects a novice user, although the refusal occurred after a model HTTP 402 failure rather than through a healthy model turn.

Persona A verdict: this is an unusually approachable exploratory tool in Puerto Rican Spanish, with better caveats than most consumer recommendation demos. It can help an owner form questions and a visit list. It should not be read as a recommendation to invest, and terms such as affinity rank, PRCS, NAICS, Overture, and median split still ask too much of a nontechnical owner unless a short plain-language summary comes first.

## Persona B walkthrough

I followed the required sequence exactly, including changing San Juan to Restaurants and asking `Where do Bad Bunny fans eat in San Juan?`. The app returned eight mapped Qloo places with 85–88 affinity scores, ratings, hours, and directions. It clearly said these are places co-liked by people who like Bad Bunny, not places connected to Bad Bunny, and that the percentage is an affinity score rather than a share of fans who visit.

Opening Evidence exposed a serious live-demo problem: **“no model turn”** and **“the model did not answer: http-402.”** The rules router, not an LLM, answered the required judge question. The same failure appeared on the ambiguous `¿Dónde?` prompt and the profit prompt. The fallback was honest and functional, but a judge checking whether the agent is real could reasonably conclude that the agent was unavailable during the test.

The evidence on business-siting answers was much stronger. The Ponce bakery answer listed four sources: a saved Qloo catalog, Overture supply, Census PRCS, and the opportunity map combining a Qloo heatmap with County Business Patterns. It disclosed that the verdict sentence was rule-derived and the final wording was written by `deepseek/deepseek-v4.1-flash` through OpenRouter. That is a credible hybrid design: deterministic claims, model prose, explicit provenance.

I then pressed **Preguntar otra vez sin Qloo**. With Qloo, the app classified Ponce as a bakery gap and named three specific bakeries. Without Qloo, the same model said the opportunity tool was disabled and refused to invent competition, rent, or foot-traffic figures. The evidence showed one `map_town` call, two model rounds, no history, and 14.4 seconds. This is the clearest proof in the entry that Qloo materially changes the answer.

`/compare` strengthened that proof with seven frozen paired runs using the same model and prompt settings. Six remove Qloo tools; the seventh retains Qloo's place catalog but removes affinity tools, which isolates the taste signal rather than merely the catalog. The page names the model, tool sets, call counts, run date, per-pair changes, and the saved JSON. It is dense but unusually auditable.

I found no unlabeled replay or attempt to pass a deterministic path off as a live model. Rules, saved controls, source records, and live-model turns were labeled. The problem is reliability, not deception. One visible inconsistency does undermine trust: the Bad Bunny summary promised “about a dozen” places while the legend and list contained eight.

Persona B verdict: the architecture is real and Qloo's contribution is demonstrated better than in most hackathon projects. However, the exact free-form judge query hit a payment/quota error and never reached a model. In a ten-minute judging slot, that is a high-severity failure even though the rules fallback preserved an answer.

## Persona C walkthrough (expert critique of the method)

The strongest analytical choice is separation. The app distinguishes Qloo taste, Census employee establishments, Overture observed supply, PRCS demographics, and model wording. It dates sources, explains Census suppression, shows the income margin of error, warns that catalogs are incomplete, and tells the reader that the classifications are Zemi-Aku's interpretation. The conservative treatment of suppressed counts is particularly good.

The opportunity method is nevertheless a hypothesis generator, not defensible retail siting:

- Qloo heatmap cells are averaged inside municipal boundaries. The app does not show population weighting, sample size, stability, or confidence. A geographically large, sparsely populated part of a municipality may influence the mean as much as a dense commercial area.
- Rank and a median split hide effect size. A town just above the taste median becomes categorically different from one just below it, while “#5 of 76” says nothing about whether #5 materially differs from #25.
- The axes do not share an ontology. Bakery taste uses Qloo's bakery genre; Census supply uses NAICS 311811 employee retail bakeries; Qloo and Overture lists include cafés, restaurants, nonemployers, and differently tagged places. Restaurant results similarly include bars. Disclosure helps, but it does not repair comparability.
- The sources are temporally mismatched: 2023 employee establishments, 2020–2024 population, and 2026 Qloo/Overture observations. Closures, openings, migration, and inflation can move independently.
- Resident population is a weak denominator for San Juan and tourism-oriented towns. Daytime population, visitors, commuter flows, spending, delivery radius, and hotel demand are absent.
- Municipality-level evidence is too coarse for a lease. Rent, zoning, permits, frontage, parking, walk/drive catchments, traffic, competitors by concept and price, and cannibalization are absent. The app itself admits most of these omissions.
- The 85–88 affinity presentation is visually probability-like even with the footnote. It is neither visit probability nor market share and has no shown calibration against behavior.
- Artist co-affinity answers where fans' tastes lean, not where fans actually eat. The app says this correctly; the user-facing question still invites the stronger behavioral reading.
- There is no outcome validation: no held-out openings, closures, sales, traffic, owner interviews, or comparison against a simpler popularity/population baseline. Therefore “gap” has not been shown to predict an opportunity.

The geographic definitions also shift. Opportunity classification uses the municipality; nearby-place lists can use a 3 km circle around a selected place and may cross a municipal border. A client could mistake one geography for the other unless the boundary is repeated beside each number.

I would put this in front of a client only as an exploratory appendix titled “cultural-interest and catalog screen,” followed by a conventional site study. I would not allow the quadrant label or affinity rank into an investment recommendation without effect sizes, sensitivity analysis, comparable geography, current supply verification, and outcome validation.

## GitHub repository first impression

The [public repository](https://github.com/CDVolvik/zemi-aku-public) is understandable but not packaged like a likely first-place showcase. The logged-out first screen exposes a concise About description, live-demo link, public license, 14 commits, and a conventional project tree. The README's first two paragraphs explain artist-to-place discovery, 78 municipalities, separate evidence sources, and the key limitation that affinity is not a visit or demand forecast.

The next screenful becomes a long status paragraph dated October 17. It contains useful facts—18 read-only tools, model/provider, daily caps, evidence lines, the no-Qloo control, business research, voice, coastal/AIS work—but the density makes the core judging story harder to extract in 30 seconds. There is no README screenshot, GIF, demo video, or architecture diagram. The repository therefore fails the most basic visual-showcase test, especially beside rival Devpost entries with 7–11 media items.

Runability and verification are better than presentation. The README gives pinned Node/pnpm versions, `.env.example`, Docker Compose, required keys, test commands, a public check script, and a claimed 508 local automated tests with four documented skips. It explains which saved Qloo results cannot be published and how a user with their own key regenerates them. That is credible and unusually candid.

The agent design is partly understandable: 18 read-only tools, a validated tool-result boundary, a server-side provider layer, and a 13-tool optional MCP surface. The actual Qloo endpoint/workflow map is not visible on the first screen, and there is no diagram showing user → router/model → tools → Qloo/Census/Overture → evidence. A winning repository normally puts a hero visual, a 60-second judge path, an architecture graphic, the exact Qloo workflows, and a compact evidence matrix above installation details.

## Defects (severity High/Med/Low, reproducible steps)

| Severity | Defect | Reproducible steps and evidence |
|---|---|---|
| High | The required free-form agent flow was unavailable. | Open `/app`, choose Restaurants → San Juan, ask `Where do Bad Bunny fans eat in San Juan?`, then open Evidence. It reports the rules router, no model turn, and `http-402`. The same failure recurred on two off-script free-form prompts. |
| Med | The Bad Bunny answer contradicts its own result count. | Run the question above. The answer says approximately twelve places, while the legend says 8 and the visible list contains 8. |
| Med | An ambiguous query is answered without clarification. | After opening Maricao, ask `¿Dónde?`. The app silently assumes a request for existing Maricao places and names several, rather than asking what the user wants or confirming the inherited context. |
| Med | Affinity scores look like behavioral probabilities. | Ask the Bad Bunny question. Cards show 85–88% as strong matches; a footnote explains the meaning, but the percentage treatment can still be read as share of fans or visit likelihood. |
| Med | The public repository has no first-screen visual or architecture diagram. | Open the repository logged out. The README begins with prose and a dense dated status block; there is no screenshot, GIF, video, or system/Qloo diagram. |
| Low | Mobile copy and evidence are cramped. | Resize `/app` to 390 px. The search placeholder truncates, attribution competes for the bottom edge, and opening the full evidence panel creates a very dense reading experience, though controls remain usable and there is no horizontal overflow. |
| Low | Snapshot timing is easy to misread. | Place cards show labels such as `7 oct: 6:00 am–9:00 pm`; limitations say hours are a catalog snapshot, but the compact label does not explicitly say “as of” or show a year. |
| Low | A commercial-upgrade prompt is visible in the map attribution. | Open `/app` on desktop. Cesium displays `Upgrade for commercial use` beside attribution; probably harmless for a hackathon, but it looks unfinished to a judge. |

## Scores (two tables, official and legacy, four criteria each, 1-5, one sentence of evidence per score)

**Official criteria**

| Criterion | Score | Evidence |
|---|---:|---|
| Technological Implementation | 4/5 | The deployed app integrates Qloo, a tool-using model, a rules router, Cesium, Census, Overture, provenance traces, and a real no-Qloo control, but the required free-form model path failed with HTTP 402. |
| Design | 4/5 | The bilingual 3D island experience is distinctive, responsive, and well labeled, but dense overlays, tiny evidence text, a clipped mobile placeholder, and the result-count contradiction prevent a top score. |
| Potential Impact | 3/5 | It can help Puerto Rico owners generate hypotheses and field checks, but municipality-level affinity plus old employee counts cannot support a lease or predict demand, sales, or profit. |
| Quality of the Idea | 4/5 | Turning cross-domain taste into a Puerto Rico cultural map and an explicit small-business gap screen is coherent and memorable, though taste-based retail void analysis is not unique among the rivals. |

**Legacy criteria**

| Criterion | Score | Evidence |
|---|---:|---|
| Intelligent and thoughtful use of LLMs + the Qloo API | 4/5 | Rules derive factual verdicts, the model writes over bounded evidence, every engine is disclosed, and Qloo can be switched off live, but several questions never reached the model. |
| Technical implementation and execution | 4/5 | Public deployment, fast grounded paths, mobile behavior, evidence drawers, paired controls, reproducible setup, and a large stated test suite show strong execution despite the live quota/payment failure. |
| Originality and creativity | 4/5 | The Puerto Rico-first 3D map, Spanish-first flow, artist journeys, and business layer form a recognizable product, although Walk-in targets a similar taste-plus-siting problem more directly. |
| Real-world application and potential impact | 3/5 | The outputs are useful as a screening conversation and visit list, but no observed business outcome validates the opportunity ranking and the missing site economics are decisive. |

Overall: **15/20 on either rubric**. This is a credible finalist-level concept with unusually honest evidence, but in the field represented by the three assigned rivals it is not yet a first-place package. The fastest path upward is reliability, validation, and judge-facing presentation rather than adding more features.

## Path to first place (at most 8 changes, ranked by expected score gain, each naming the criterion it raises, by how much, and what it would take)

| Rank | Change | Expected score gain | What it would take |
|---:|---|---|---|
| 1 | Make every judge path survive provider/quota failure without losing the agent. | **Technological Implementation +0.7; Design +0.2** | Fund or reserve the model path through judging, add a tested secondary provider, run a preflight health check, and repeatedly verify the required script from fresh visitors; keep the rules fallback but make it exceptional. |
| 2 | Publish a pre-registered outcome or proxy validation instead of only a Qloo/no-Qloo contrast. | **Potential Impact +0.8; Technological Implementation +0.2** | Freeze towns/categories and a metric before results, compare against population/popularity/simple-density baselines, test against openings/closures, traffic, owner interviews, or another external outcome, and publish losses and uncertainty. |
| 3 | Replace the municipal median quadrant with a defensible catchment analysis. | **Potential Impact +0.6; Technological Implementation +0.4** | Use population-weighted cells or road-time catchments, report effect sizes and sensitivity around thresholds, align category definitions, and keep Census, catalog, and taste axes visibly separate. |
| 4 | Rebuild the repository/submission as a 60-second judge path. | **Design +0.7; Quality of the Idea +0.2** | Add a hero screenshot or short GIF, a 90-second video, one architecture/Qloo-workflow diagram, three exact prompts, the live no-Qloo proof, and a compact “what is measured / not measured” table before setup instructions. |
| 5 | Turn town screening into a concrete but still honest next-stage site shortlist. | **Potential Impact +0.5; Quality of the Idea +0.2** | Add neighborhood or corridor catchments, current competitor verification, rent/permit/traffic data or explicit handoff links, and a downloadable field-check sheet; do not call it a forecast. |
| 6 | Calibrate and relabel affinity. | **Technological Implementation +0.2; Potential Impact +0.3** | Replace probability-like percentages with an index/percentile, show the comparison population and effect magnitude, and test whether higher scores correlate with any external behavior. |
| 7 | Fix trust-breaking UX inconsistencies and mobile density. | **Design +0.4** | Make result counts derive from the rendered list, label snapshot dates as “as of,” simplify the answer/evidence hierarchy, shorten source jargon for Persona A, and add 390 px visual regression checks. |
| 8 | Make ambiguity an explicit agent behavior. | **Technological Implementation +0.2; Design +0.2** | Add clarification rules for underspecified prompts, show which context will be reused, and test Spanish/English elliptical follow-ups, town collisions, unsupported businesses, and stale context. |

## What a rival entry would need to beat this, with reference to the three rivals read

Zemi-Aku's defendable advantages are its Puerto Rico specificity, Spanish-first accessibility, memorable 3D geography, unusually explicit source boundaries, and an excellent live with/without-Qloo control. A rival needs to match that transparency and emotional/local coherence—not merely call more endpoints—while being more reliable and analytically defensible.

[CrowdSpawn](https://devpost.com/software/crowdspawn) already presents a stronger technical-evaluation story on paper: 11 media items, eight agent tools spanning seven kinds of Qloo calls, step-level citations, a kill switch, 146 API tests plus 35 web tests, and published results where its Qloo country ranking lost to an LLM. Its clearest path to beating Zemi-Aku is to prove that its city/partner recommendations create a better studio decision, not just a better trace. If its live product matches its page, it likely leads Zemi-Aku on Technological Implementation today.

[Walk-in](https://devpost.com/software/walk-in) is the most direct threat. It tackles the same owner-facing void-analysis problem but starts from a storefront and a real 5–60 minute walk/drive catchment, cross-checks missing places with OpenStreetMap, enforces owner constraints, and produces a concept, launch kit, report, and site-specific next actions. Its page claims 629 server and 306 frontend tests and includes seven media items. It would beat Zemi-Aku if the live experience is as usable and reliable as described, because its geography and outputs are closer to a lease decision. Zemi-Aku still has the stronger Puerto Rico identity and cleaner admission that taste is not demand.

[TasteCraft](https://devpost.com/software/tastecraft-ih58aw) sets the strongest evaluation-and-presentation bar: 10 media items, a 60-second judge path, 390 px evidence, a one-click Qloo switch, eight Qloo workflows, and a pre-registered 22-restaurant test whose +10% gain over the same model is explicitly reported as not proven. It also names where the method loses. Its narrower restaurant-operations use case is less geographically ambitious, but its measurable weekly outputs and intellectual honesty would likely outscore Zemi-Aku on impact evidence and judge readiness.

In practical terms, a rival beats the current entry by combining Walk-in's catchment rigor, TasteCraft's pre-registered validation and judge packaging, or CrowdSpawn's traceability with a stable live agent. If Zemi-Aku completes the first four changes above, a rival would need all three: a reliable live product, external outcome evidence, and a simpler first-minute story—not just a prettier map or a larger tool count.
