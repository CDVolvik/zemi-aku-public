# Blind judge panel, fourth round, October 24, 2026 (night)

The same three agents from three vendors, the same [brief](evidence/judge-panel-2026-10-24c-brief.md) as the three
earlier rounds ([October 23](JUDGE-PANEL-2026-10-23.md), [October 24 morning](JUDGE-PANEL-2026-10-24.md),
[October 24 evening](JUDGE-PANEL-2026-10-24b.md)), against the live site as it stood after the trust release's second
cut (`trust-20261024`, source `46e8092`): no access to code or docs, two personas, the Devpost testing steps, up to six
questions of their own, a 390 px pass, scores on the four official criteria. Reports:
[GPT-5.6](evidence/judge-panel-2026-10-24c-gpt.md) · [Claude Opus 5.5](evidence/judge-panel-2026-10-24c-opus.md) ·
[Grok 4.7](evidence/judge-panel-2026-10-24c-grok.md). No crashes, no HTTP errors, no fabricated place; the profit and
API-key questions were refused with the reason stated.

**This is automated independent review, not user testing.** Devpost copy must not call these evaluators users or
testers.

## Scores

| Criterion | GPT | Opus | Grok | Mean | Oct 24 evening | Oct 24 morning | Oct 23 |
|---|---|---|---|---|---|---|---|
| LLM + Qloo use | 5 | 4 | 4 | 4.3 | 3.8 | 4.3 | 3.7 |
| Technical execution | 4 | 4 | 4 | 4.0 | 3.8 | 3.3 | 4.0 |
| Originality | 5 | 4 | 4 | 4.3 | 4.3 | 4.3 | 4.3 |
| Real-world impact | 4 | 3 | 3 | 3.3 | 3.3 | 3.3 | 3.3 |
| **Total / 20** | **18** | **15** | **15** | **16.0** | **15.3** | **15.3** | **15.3** |

The mean moved for the first time in four rounds, from 15.3 to 16.0. GPT went back to 18 (criterion 1 to a five:
"distinguishes model wording from rule-based numbers, and the catalog-only control demonstrates that affinity data
changes the substance of answers"). Opus went from 14 to 15 and Grok from 15 to 15 with criterion 1 and 2 both at four
and no figure defect reported by anyone. Real-world impact stayed at 3.3 for the fourth time: every evaluator says the
same thing, the data cannot carry rents, foot traffic, permits or demand, so the answer is a scouting lead, not a
decision.

## What the trust cut fixed, as the panel saw it

- No evaluator found a wrong unit, a restated rate or an inverted comparison. Opus asked "¿Ponce o Caguas?" and got
  the tool's order with the right direction. GPT read the note as "model wording" beside "rule-based numbers".
- The control run was judged real by all three ("a real live ablation", Opus; "persuasive evidence that the agent is
  executing a bounded tool call", GPT).
- "Taste above the median" was not flagged; the decision card's checks were quoted by GPT as "much more useful than a
  generic recommendation".
- The profit question was refused with a reason by all three.

## Found this round and fixed the same night

- **High (Opus).** After a Caguas comparison, a Maricao question offered "Ver los 323 lugares en Maricao" and opened
  Caguas's catalog. **Fixed in cut three** (`9346372`): a directory loaded for one town is never offered under
  another town's name; browser-checked live (the directory hides after the Maricao answer).
- **High (Grok).** After "Ask again without Qloo", the caption said the places were removed but the panel still showed
  the "Bad Bunny fans in San Juan" heading and the three top picks. **Fixed in cut four** (`898a3d7`): the control
  clears the picks row, the heading and the answer places before the town's own catalog returns; browser-checked live.
- **Med (Grok).** A withheld Census count reached the model as "la tasa es 0 por cada 10,000". **Fixed in cut four:**
  the tool sends no rate for a withheld count, only the range.

## Still open, by weight

- **Med (GPT, Opus).** Town and panel state can diverge after a model answer names another town: the URL and the
  composer followed Ponce while the answer discussed San Juan (GPT); at 390 px the old sheet, the new answer and the
  composer layered (GPT, Grok). The one-sheet fold handles the typed verdict path; the model-answer path still stacks.
- **Med (GPT, Grok).** An ambiguous question ("¿Dónde está lo bueno?", "¿Dónde abro algo rico cerca de lo bueno?") is
  answered as food in the open town instead of clarified. Known since the morning panel.
- **Med (Opus, GPT).** "Gap" beside 37 Qloo and 64 Overture bakeries for San Juan's 16 Census employers reads as a
  contradiction to an owner; Opus asks for the NAICS code on screen and a downgrade when the catalogs far exceed the
  Census count.
- **Med (Opus).** The model adds adjectives not in the record ("both good for small plates"); the same phrase appears in
  three `/compare` answers.
- **Med (Opus, Grok).** La Placita de Santurce shows two or three closing times across views (Overture, Qloo card,
  the saved compare run). Known since the morning panel.
- **Med (Opus).** `/compare`'s name matching overcounts: Rincón's lighthouse is "changed by Qloo" though the no-Qloo
  run named it as Punta Higüero.
- **Med (Grok).** The composer keeps one answer; an owner cannot read two town notes side by side.
- **Low.** Spanish is still partial (homepage has no language control, tour chips, "Dismiss", category tags, aria
  names, `/compare` English only); the spoken verdict says "about 5 per hundred thousand" while the card says "0.5
  per 10,000" (the speech checker forbids decimals and large numbers, so this is a documented tradeoff, not an
  oversight); cards sort 87% under 86% in one list (fixed at the source in the trust cut; Opus saw the morning order
  in a cached journey); DuckDuckGo favicon lookups 404 and send business domains to a third party; the Cesium
  watermark covers the phone ask field (Carlos's plan decision); distances have no origin; Maricao's population
  differs between Wikidata and the Census panels; "cuatro lugares" listed three.

## What each evaluator asked for first

- GPT: atomic town/query state across the URL, composer, map and panels, with a 390 px regression test; then real
  decision inputs (rents, permits, foot traffic) with provenance; then a clarification policy and complete Spanish.
- Opus: fix the town-state carryover and drop model adjectives not in the record; make "Brecha" defensible (NAICS on
  screen, downgrade when catalogs exceed the Census, rank within the bucket, answer budget questions); make the Qloo
  lift visible (fix the compare matching, show picks from affinity versus catalog, raw affinity values).
- Grok: make the control true on the map and list (done in cut four); one hours string per place labeled with the
  catalog date, withheld counts as "not published, 0–2" (done for the model); finish the Spanish phone path and keep a
  transcript.

Four panels have now cost about the same as four coffees in model calls. The next build item with the most agreement
is the model-answer town state (URL, composer, panels together); the next item with the most weight for the impact
criterion is the one no build can supply, cost inputs, which stays outside the data by design and is said so on every
card.
