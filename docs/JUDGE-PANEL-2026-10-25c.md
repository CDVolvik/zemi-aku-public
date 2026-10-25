# Blind judge panel, seventh round, October 25, 2026 (night)

The same three agents from three vendors, the same [brief](evidence/judge-panel-2026-10-25c-brief.md) as the six
earlier rounds (the latest: [sixth round](JUDGE-PANEL-2026-10-25b.md)), against the live site as it stood on the
round-six release (`round6-20261025`, source `4235303`): no access to code or docs, two personas, the Devpost testing
steps, up to six questions of their own, a 390 px pass, scores on the four official criteria. Reports:
[GPT-5.6](evidence/judge-panel-2026-10-25c-gpt.md) · [Claude Opus 5.5](evidence/judge-panel-2026-10-25c-opus.md) ·
[Grok 4.7](evidence/judge-panel-2026-10-25c-grok.md). No crashes, no HTTP errors, no fabricated place; GPT: "High,
none reproduced".

**This is automated independent review, not user testing.** Devpost copy must not call these evaluators users or
testers.

## Scores

| Criterion | GPT | Opus | Grok | Mean | 6th | 5th | 4th | 3rd | 2nd | 1st |
|---|---|---|---|---|---|---|---|---|---|---|
| LLM + Qloo use | 5 | 4 | 4 | 4.3 | 4.0 | 4.3 | 4.3 | 3.8 | 4.3 | 3.7 |
| Technical execution | 4 | 4 | 4 | 4.0 | 3.3 | 4.0 | 4.0 | 3.8 | 3.3 | 4.0 |
| Originality | 5 | 4 | 4 | 4.3 | 4.3 | 4.3 | 4.3 | 4.3 | 4.3 | 4.3 |
| Real-world impact | 4 | 3 | 3 | 3.3 | 3.3 | 3.7 | 3.3 | 3.3 | 3.3 | 3.3 |
| **Total / 20** | **18** | **15** | **15** | **16.0** | **15.0** | **16.3** | **16.0** | **15.3** | **15.3** | **15.3** |

Back to 16.0 after the round-six cut. Criterion 2 recovered its point (3.3 to 4.0): no evaluator found a contradiction
between the text and a card, and the directive-tail refusal was gone. Seven rounds read 15.3, 15.3, 15.3, 16.0, 16.3,
15.0, 16.0.

## What the round-six cut fixed, as the panel saw it

- GPT: "the agent declined to guess when tools lacked support"; Opus: "I found no made-up places"; Grok: the control
  "removes the Bad Bunny place list" and "refuses an instruction to say Florida has zero bakeries".
- No hours in the text, no "70 de 70", no "Give Exact", no taco cards under a bakery question were reported.

## Found this round and fixed the same night (the round-seven cut, `89ca990`, live as `round7-20261025`)

- **High (Opus).** Asked who goes to Panadería Don Nico, the model said Qloo keeps no ages or profiles, while the
  card under it shows Qloo's age and gender bands. Fixed: a `place_audience` tool reads the same Qloo audience
  demographics the card does, and the prompt routes customer questions to it; checked live in Spanish.
- **Med (Opus).** The no-Qloo control said the Qloo lookup "didn't return anything" when Evidence showed it refused as
  unavailable. Fixed: the prompt says a refused tool was off for the run.
- **Med (GPT).** Between 721 and 1023 px the dock covered "Sources and the record behind this answer". Fixed: the
  panel ends above the dock there (clicked at 960×895).
- **Med (GPT).** A vegan bakery question was answered as a generic bakery. Fixed: a condition the tools cannot test
  is named in one sentence before the covered part.
- **Med (GPT).** "Qloo's taste for all 78 towns" against "76 of 78 with Qloo taste data". Fixed: taste town by town;
  the front page gives the 76-to-78 range.
- **Med (Grok).** "¿Cuánto ganaría una panadería en San Juan al mes?" repeated the gap verdict. Fixed: a money
  question leaves the siting template; the model says the data carries no income first.
- **Low (Opus).** A raw "unknown" in an Evidence line. Fixed: "not enough data".

## Still open, by weight

- **Med (Opus, GPT).** A place-rich answer on a phone: cards scroll sideways, the sheet scrolls, the panel scrolls;
  kept for a real-phone check.
- **Med (Opus).** "Where do Bad Bunny fans eat" returns bars labelled Food; La Placita counted as a restaurant
  competitor (a plaza). The eating filter keeps bars on purpose, the labels do not say so.
- **Med (Opus, GPT).** Spanish chrome still partial; the language sticks to the last question.
- **Low.** The spoken verdict's unit against the card's (documented tradeoff); `/compare` is a saved run of October
  24 and its catalog-only pair moved one place of three; the answer bubble overlaps the panel's last lines at about
  960 px before the sources fold (now above the dock).

## What each evaluator asked for first

- GPT: a checklist of what was asked with each condition marked answered or unsupported, and every fact expandable
  to its source field; one scroll surface on phones; decision-grade inputs (rents, permits, foot traffic).
- Opus: never deny data the UI shows; one source of truth for hours; cards that match the question; Spanish all the
  way down.
- Grok: say what the app cannot estimate before the script; one sheet on a phone; a fresher heatmap date in the
  sentence.
