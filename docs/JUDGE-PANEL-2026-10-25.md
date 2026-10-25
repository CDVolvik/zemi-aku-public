# Blind judge panel, fifth round, October 25, 2026

The same three agents from three vendors, the same [brief](evidence/judge-panel-2026-10-25-brief.md) as the four
earlier rounds ([October 23](JUDGE-PANEL-2026-10-23.md), [October 24 morning](JUDGE-PANEL-2026-10-24.md),
[October 24 evening](JUDGE-PANEL-2026-10-24b.md), [October 24 night](JUDGE-PANEL-2026-10-24c.md)), against the live
site as it stood after the state release's second cut (`state-20261025`, source `83e164a`): no access to code or
docs, two personas, the Devpost testing steps, up to six questions of their own, a 390 px pass, scores on the four
official criteria. Reports: [GPT-5.6](evidence/judge-panel-2026-10-25-gpt.md) ·
[Claude Opus 5.5](evidence/judge-panel-2026-10-25-opus.md) · [Grok 4.7](evidence/judge-panel-2026-10-25-grok.md).
No crashes, no HTTP errors, no fabricated place; the profit and "ignore your instructions" asks were refused with the
reason stated; the deliberately vague question got a question back from all three.

**This is automated independent review, not user testing.** Devpost copy must not call these evaluators users or
testers.

## Scores

| Criterion | GPT | Opus | Grok | Mean | Oct 24 night | Oct 24 evening | Oct 24 morning | Oct 23 |
|---|---|---|---|---|---|---|---|---|
| LLM + Qloo use | 5 | 4 | 4 | 4.3 | 4.3 | 3.8 | 4.3 | 3.7 |
| Technical execution | 4 | 4 | 4 | 4.0 | 4.0 | 3.8 | 3.3 | 4.0 |
| Originality | 5 | 4 | 4 | 4.3 | 4.3 | 4.3 | 4.3 | 4.3 |
| Real-world impact | 4 | 4 | 3 | 3.7 | 3.3 | 3.3 | 3.3 | 3.3 |
| **Total / 20** | **18** | **16** | **15** | **16.3** | **16.0** | **15.3** | **15.3** | **15.3** |

The mean moved again, 16.0 to 16.3, and real-world impact moved for the first time in five rounds (Opus to a four:
"the Spanish-first UI, the honest 'Lo que no puede decir' block, the Census small-count caveat, and concrete next
steps make this something a real owner could act on without being misled"). GPT held 18 with criterion 1 at five
("materially changed under a no-Qloo ablation, and refused claims the data could not support"). Grok's 15 keeps
impact at three for the same reason as before: no rents, foot traffic or demand in the data.

## What the state cut fixed, as the panel saw it

- GPT: "the map followed named Puerto Rico towns"; no evaluator saw a town or panel left behind after an answer that
  named another town.
- All three: the vague ask ("¿Dónde está lo bueno?") got a clarifying question, not food in the open town.
- Opus: "the model writes only the closing prose while rule-based numbers set the verdict"; no figure defect reported.
- GPT quoted the Census-scope sentence on the card as the methodology an owner needs.

## Found this round and fixed the same day (the polish cut, `d4e239d`, live as `polish-20261025`)

- **High (Grok).** Bakeries, San Juan, Restaurants, then "San Juan no tiene panaderías, ¿verdad?": the sentence cited
  bakeries while the cards stayed the restaurant set. Fixed: a model answer about the open town that brings no place
  list of its own reloads the town's own catalog, so a previous industry's cards never sit under a new sentence.
- **Med (GPT).** After "Ask again without Qloo" the panel kept the "Bad Bunny fans in San Juan · Qloo places" heading
  over the town's own results. Fixed: the control restores the town's own title and lede before its catalog returns.
- **Med (GPT).** At 1455×639 the tour row sat under the suggestion chips. Fixed: on a short desktop window the chip
  row waits while the first screen is up (its own chips carry the same questions).
- **Med (Opus).** "…así que no se compara con Río Grande" at the end of a Maricao answer read as a non sequitur.
  Fixed: the comparison sentence introduces the other town as "the next gap-group town" and says whose count the
  Census withholds.
- **Med (Opus, Grok).** "Today 12:00 am–12:00 am" on La Placita's card. Fixed: a midnight-to-midnight window reads
  "Open 24 hours" / "Abierto 24 horas". The two sources still disagree on that place's hours (Qloo's card against the
  artist answer); the label stays "a snapshot of the catalog on its date".
- **Med (Opus).** The panel's "visit" list and the note's differed for the same question. Fixed: the decision card's
  first check names the places the note names, in the note's order, matched on whole names only.
- **Med (Opus).** "In the business path Qloo is one opaque number." The decision card now says what the rank rests
  on: "Qloo tags the town's taste as Puerto Rican, Resort Like, Casual" from the same locality read.
- **Med (Grok).** The gap list dropped Vieques (taste #1) without a word. Fixed: a note under the list names the
  high-taste towns whose Census count is withheld and says few or many cannot be told.

## Still open, by weight

- **Med (Grok).** Cards should be the industry in the sentence: the catalog reload removes the wrong cards but does
  not fetch bakery cards for a model answer; the rules verdict path already pairs them.
- **Med (Grok).** Switching industry on an open town took about 30 s in one run (the restaurant build and its note).
- **Med (Grok, GPT).** The phone ask field is 159 px wide at 390 px ("Pregunte por un pue"); the sheet's last legend
  row sits under the ask bar.
- **Med (GPT).** At 390 px the map-style button covers the panel collapse button. Not reproduced: measured at
  390×844 after an answer, the map-style button sits at y 14 and the collapse button at y 416 (folded) or 359.
- **Med (Opus).** Two stacked sheets after an answer on a phone cover the map. Not reproduced after the one-sheet
  fold; kept for a real-phone check.
- **Med (Opus).** A taste question ("¿Qué le gusta a la gente de Adjuntas? Quiero abrir un café allí.") gets the
  siting verdict; the card now carries the taste tags, the answer text does not.
- **Low.** Spanish chrome still partial (tours, "By category", "Sources:", "About this town", the English landing
  page); "1 lugares"; `/compare` mofongo answer in *tú*; one business counted from Qloo and from Overture under two
  spellings (Erik's Bakery / Panaderia Erik); camera motion made a first click miss under automation; bakery cards
  include pâtisseries and a cafetería the NAICS sentence explains but the cards do not; `/api/speak` fires on every
  answer; the units differ between the spoken verdict (per hundred thousand) and the card (per 10,000), the
  documented tradeoff.

## What each evaluator asked for first

- GPT: a state-clean, auditable with/without-Qloo experiment shown side by side; responsive layering (desktop short
  heights, a 44×44 collapse target); a decision worksheet with an exportable checklist for the missing inputs.
- Opus: make Qloo's contribution visible in every siting answer (tags beside the rank, affinity rank in comparisons,
  taste content for taste questions); one source of truth for hours; drop or explain the comparison-town sentence;
  merge duplicates; one visit list.
- Grok: bind cards and the catalog tool to the industry in the sentence; say on the gap list why the top taste town is
  missing; a full-width phone field, translated chrome, no speech call until play.

Five panels have now cost about the same as five coffees in model calls. The two items with the most agreement and
no build behind them, cost inputs and a real phone in hand, are the ones that stay with Carlos.
