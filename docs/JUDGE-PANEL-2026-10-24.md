# Blind judge panel, second round, October 24, 2026

The same three agents from three vendors, the same [brief](evidence/judge-panel-2026-10-24-brief.md) as on
[October 23](JUDGE-PANEL-2026-10-23.md), against the live site as it stood that morning (`lang-20261024`, second
cut, source `2fb4cc3`): no access to code or docs, two personas, the Devpost testing steps, up to six questions of
their own, a 390 px pass, scores on the four official criteria. Reports:
[GPT-5.6](evidence/judge-panel-2026-10-24-gpt.md) · [Claude Opus 5.5](evidence/judge-panel-2026-10-24-opus.md) ·
[Grok 4.7](evidence/judge-panel-2026-10-24-grok.md). No crashes, no HTTP errors, no fabrication; every "invent a
place" attempt was refused again.

**This is automated independent review, not user testing.** Devpost copy must not call these evaluators users or
testers.

## Scores

| Criterion | GPT | Opus | Grok | Mean | Oct 23 mean |
|---|---|---|---|---|---|
| LLM + Qloo use | 5 | 4 | 4 | 4.3 | 3.7 |
| Technical execution | 4 | 3 | 3 | 3.3 | 4.0 |
| Originality | 5 | 4 | 4 | 4.3 | 4.3 |
| Real-world impact | 4 | 3 | 3 | 3.3 | 3.3 |
| **Total / 20** | **18** | **14** | **14** | **15.3** | **15.3** |

The mean did not move. GPT went from 17 to 18 (criterion 1 to a five: "both frozen and on-demand without-Qloo
controls show that Qloo materially grounds the agent"). Opus stayed at 14 and Grok fell from 15 to 14, both on
technical execution, and both for defects that were not in the October 23 reports. The verdict release fixed what
that panel saw; this panel went further off-script and found the next layer.

## What all three still report

1. **Spanish leaves English on the decision surface.** Card chips ("Food"), the hours line ("Today …", "Closed
   today"), "Browse all N places", the About and Sources headings, the camera pill, the tour titles.
2. **The phone answer state is crowded.** At 390 px the sheet, the answer card and the ask bar compete for the map;
   the language sheet stayed open over an answer (Grok).
3. **The headline siting answer is a template, not a model turn** (criterion 1 for Opus and Grok). The verdict now
   agrees with the map, but Qloo's role in it is one averaged heatmap figure.

## Findings from one evaluator

- **High (Opus).** "¿En qué pueblo me conviene y por qué?" was answered "…y Por no está en este mapa": the
  off-island detection shipped on October 23 read "por" after "y" as a place.
- **High (Grok).** A model answer about Culebra left the map on Adjuntas; the model restated the island rate "por
  cada mil residentes" (unit off by ten).
- **Med (Opus, Grok).** The spoken baseline ("against 0.76 island-wide") is not the median the groups split on
  (1.30 for bakeries), so Ponce at 1.13 reads "few" against a smaller number on the same screen.
- Med (Opus). "Few businesses" beside 37 Qloo bakeries and 64 Overture places, with the Census 16 unexplained.
- Med (Grok). Catalog count vs chip count ("941 places" vs "Food 50"); rank "of 76" vs "78 towns"; a source line that
  names Wikipedia with no Wikipedia call; two closing times for one venue across views.
- Med (GPT). An ambiguous question ("¿Dónde está bueno?") is answered as food instead of clarified; the profit
  refusal stops without a next-step checklist.
- Low. "Site icon" caption as visible text; "16137 employees" without a separator; `/api/speak` on every answer;
  the gap list under the methodology text; chain restaurants as local signal.

## Shipped the same day (`lang-20261024`, cuts three to five, source `95970c6`)

- Spanish chips, legend, hours, directory title, About and Sources headings, copy-brief button, journey return, "Qloo
  places" note, camera pill and the directory "All" button follow the picked language (`app/marks.js`, `app/index.html`).
- "y por qué" stays on the map: a place after a conjunction needs a known town in the same clause, and the stoplist
  carries prepositions and pronouns (`server/business.mjs`).
- The spoken verdict and the model's town reading quote the median the groups split on, and establishments read
  "with employees" (`server/spoken.mjs`, `server/agent-tools.mjs`, `server/business.mjs`).
- A model answer that moved nothing flies to the known town the question names; the prompt asks for `map_town` and
  for rates quoted per 10,000 as given (`server/agent.mjs`, `scripts/serve-eagle.mjs`).
- The language sheet closes on a pick; the source line names Wikipedia only when an extract was read; the site-icon
  caption is gone; employee counts carry separators.

Not changed: the phone answer layout, the template-vs-model question for the headline siting answer, the
catalog-vs-chip counts, the two hours sources, clarification on ambiguous questions, the Cesium watermark (Carlos's
plan decision). A third panel would measure these cuts; the first two panels cost about the same as a coffee each
in model calls, so it is Carlos's call whether a third is worth it before the screenshots and video are final.
