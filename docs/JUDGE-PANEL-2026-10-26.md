# Blind judge panel, ninth round, October 26, 2026

The same three agents from three vendors, plus GPT-6.1 Sol as a fourth seat kept out of the mean, against the live
site on the round-nine release (`round9-20261026`). The [brief](evidence/judge-panel-2026-10-26-brief.md) changed this
round: an expert location-intelligence persona, the public repository's first screen, three rival Devpost pages for
context, and scores on the official criteria (Technological Implementation, Design, Potential Impact, Quality of the
Idea) beside the legacy ones used in the eight earlier rounds. Reports:
[GPT-5.6](evidence/judge-panel-2026-10-26-gpt.md) · [Claude Opus 5.5](evidence/judge-panel-2026-10-26-opus.md) ·
[Grok 4.7](evidence/judge-panel-2026-10-26-grok.md) · [GPT-6.1 (fourth seat)](evidence/judge-panel-2026-10-26-gpt61.md).

**This is automated independent review, not user testing.** Devpost copy must not call these evaluators users or
testers.

## Scores

Official criteria:

| Criterion | GPT | Opus | Grok | Mean | GPT-6.1 |
|---|---|---|---|---|---|
| Technological Implementation | 4 | 3 | 3 | 3.3 | 2.5 |
| Design | 4 | 4 | 3 | 3.7 | 3.5 |
| Potential Impact | 3 | 3 | 3 | 3.0 | 3 |
| Quality of the Idea | 4 | 3 | 4 | 3.7 | 4 |
| **Total / 20** | **15** | **13** | **13** | **13.7** | **13** |

Legacy criteria, comparable with the earlier rounds:

| Criterion | GPT | Opus | Grok | Mean | 8th | GPT-6.1 |
|---|---|---|---|---|---|---|
| LLM + Qloo use | 4 | 4 | 3 | 3.7 | 4.3 | 2.5 |
| Technical execution | 4 | 3 | 4 | 3.7 | 4.0 | 2.5 |
| Originality | 4 | 4 | 4 | 4.0 | 4.3 | 3.5 |
| Real-world impact | 3 | 3 | 3 | 3.0 | 3.7 | 3 |
| **Total / 20** | **15** | **14** | **14** | **14.3** | **16.3** | **11.5** |

**The drop has one cause the evaluators all name first: the model provider was out of credit.** Every free-form
question, including the one the entry tells judges to ask ("Where do Bad Bunny fans eat in San Juan?"), returned
"rules router · no model turn (the model did not answer: http-402)". Two early business answers did reach the model.
Each evaluator credits the Evidence line for saying so honestly, and each scores Technological Implementation down for
it. Opus expects both implementation scores to rise a point with the model funded. The provider failures also spent
the forty-turn visitor allowance, so Opus got the cap message after its fifth question (the four evaluators shared one
address); fixed below.

## Found this round, by how many evaluators hit it

- **High (all four).** HTTP 402 on every free-form question; no live agent loop, no "Ask again without Qloo".
- **High (Grok, GPT-6.1; Opus Med).** With the model down, the rules router read sentences as place names ("Recomienda
  Aqui", "Pongo Veterinaria") and answered a method question ("¿Cómo calculas 0.5 por 10,000?") with a food list.
- **High (Grok; Opus Med).** The live Bad Bunny list and the saved `/compare` pair disagree; the spoken line said
  "about a dozen" for eight places; a 88% card sat below an 87% one.
- **High (Grok; Opus Med).** "Few businesses" for San Juan beside 16 Census bakeries, 37 Qloo and 64 Overture listings.
- **High (Opus).** The visitor cap hit after five questions: refused model turns were charged.
- **Med.** A refusal left the previous answer's list in the panel; restaurant research led with a bar; hours mixed
  "Today", "Hoy" and "7 oct"; the affinity percentage read as a probability; the phone sheet hid the town list under
  the notes; a bare "¿Dónde?" got a guessed list; the evidence for a rules answer gave no reason the control was
  missing; the front page said 17 tools and the README 18; the README had no visual, diagram or Qloo endpoint table.
- **Method (all four, Persona C).** Municipality-level, median split, temporal mismatch (CBP 2023, PRCS 2020–2024, Qloo
  2026), resident denominator, tourism-leaning taste ranks, no outcome validation. Each would show it to a client only
  as a screening appendix.
- **Low.** "el Census"; "Why it fits you" on a logged-out card; speech after "More like these" without a press; a
  clipped phone placeholder; the walkthrough's "six questions"; Cesium's commercial-use line.

## What each evaluator asked for first

- GPT-5.6: keep the judge path alive through a provider failure; then a preregistered validation.
- Opus: fund the model and fix the cap; a judge path that does not need a live model.
- Grok: the hero question as a model turn, and a fallback that declines instead of searching.
- GPT-6.1: a dependable live session, then a fair measure of Qloo's incremental value.

## Response

Shipped in round ten (`DEPLOY.md` → Round-ten release): exact spoken counts; affinity as a score out of 100; dated
hours read "On Oct 7"; groups say "per resident"; restaurant research names places that serve meals before bars; the
rules router declines a sentence it cannot read, gives method questions the verdict card and money questions the plain
limit; bare and "what do you recommend" asks get a question back; a refusal returns the panel to the open town; the
Evidence line says why the control is missing and links `/compare`; refused model turns give the visitor turn back; the
phone sheet shows the towns first; "el Censo"; 18 tools everywhere, guarded by a test. The repository README now leads
with the business question, a recorded flow, screenshots, an architecture diagram and a table of the Qloo calls.

The validation the panel asked for: a [preregistered Census backtest](BACKTEST-GAP-2026-10-26.md) of the gap signal,
written and committed before the 2019 data was read. Gap towns gained more establishments than equally sparse,
lower-taste towns in 5 of 6 industries, p = 0.07 one-sided: suggestive, not proven, with bakeries the one loss.

Not fixed, and why: the model credit is an account top-up for Carlos; the saved `/compare` runs need the model to
regenerate; a street-level catchment, population-weighted cells and sensitivity bands are larger than the time left.
