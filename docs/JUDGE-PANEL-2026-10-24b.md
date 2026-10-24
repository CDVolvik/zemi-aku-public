# Blind judge panel, third round, October 24, 2026 (evening)

The same three agents from three vendors, the same [brief](evidence/judge-panel-2026-10-24b-brief.md) as on
[October 23](JUDGE-PANEL-2026-10-23.md) and [this morning](JUDGE-PANEL-2026-10-24.md), against the live site as it
stood after the decide release's second cut (`decide-20261024`, source `250e93b`): no access to code or docs, two
personas, the Devpost testing steps, up to six questions of their own, a 390 px pass, scores on the four official
criteria. Reports: [GPT-5.6](evidence/judge-panel-2026-10-24b-gpt.md) ·
[Claude Opus 5.5](evidence/judge-panel-2026-10-24b-opus.md) · [Grok 4.7](evidence/judge-panel-2026-10-24b-grok.md).
No crashes, no HTTP errors, no fabricated place; the prompt-injection and off-island attempts were refused again.

**This is automated independent review, not user testing.** Devpost copy must not call these evaluators users or
testers.

## Scores

| Criterion | GPT | Opus | Grok | Mean | Oct 24 morning | Oct 23 |
|---|---|---|---|---|---|---|
| LLM + Qloo use | 4 | 3.5 | 4 | 3.8 | 4.3 | 3.7 |
| Technical execution | 4 | 3.5 | 4 | 3.8 | 3.3 | 4.0 |
| Originality | 5 | 4 | 4 | 4.3 | 4.3 | 4.3 |
| Real-world impact | 4 | 3 | 3 | 3.3 | 3.3 | 3.3 |
| **Total / 20** | **17** | **14** | **15** | **15.3** | **15.3** | **15.3** |

The mean is 15.3 for the third time. Technical execution rose for all three (the one-sheet phone layout, the decision
card and the agreeing counts were each named as improvements); criterion 1 fell for GPT and Opus because the new model
note gave the panel a second narrator to catch. Grok: "the LLM is not yet safe as the voice of the numbers." GPT's
originality stayed at five for the catalog-held-constant seventh compare pair.

## What the panel found in the model note

The hybrid answer was the release's point and its largest new defect surface. Every evaluator read the two model
sentences against the rule-based verdict beside them.

- **High (Grok, Opus).** The note quoted the verdict's rate in the wrong unit: "0.65 por cada cien mil residentes"
  where the map says 0.7 per 10,000; one bubble mixed "por cada cien mil" and "por cada diez mil". **Fixed in cut
  three** (`ce88f18`, live the same evening): the note receives the verdict's own whole-number unit per hundred thousand
  residents and the Spanish group names, so both sentences on screen carry one unit.
- **High (Opus).** "¿Caguas o Cayey?" was recommended for Cayey as "menos competencia por cada residente" while quoting
  Cayey 1.22 against Caguas 0.72 per 10,000: the model inverted its own comparison. **Not fixed.** The prompt already
  asks for the figures as given; the remaining options are a tool that returns the comparison direction itself, or a
  post-check that drops a note whose direction disagrees with the numbers. Opus's first change request.
- **Med (GPT).** A two-town answer asserted "more traffic and higher rents" for San Juan while the card said it cannot
  tell rents or foot traffic. **Fixed in cut three:** the agent prompt forbids rents, foot traffic, menus, prices and
  "more traffic" unless a tool result carries the figure.
- **Med (Opus).** A suppressed Census count reached the card as "0.0 / 0 por cada 10,000" and the model repeated the
  zero. **Fixed:** the card reads "up to X per 10,000" and the note receives the range.
- **Med (Opus).** The visit slot was filled with towns ("Visite Guánica, Luquillo y Adjuntas"). **Prompt rule added**
  in cut three; not re-measured by a panel.
- **Med (Opus).** "grupo gap" in Spanish answers. **Fixed** (Spanish group names reach the note).

## The control

- **Med (Opus).** The live **Ask again without Qloo** sent the full chat history, so Qloo-derived places from earlier
  turns could come back in the control answer (it named La Placita). **Fixed:** the control sends no history, like
  `/compare`, and shows a one-line "Qloo changed: …" diff against the places the with-Qloo answer put on the map.
- **Med (Grok).** The control does not replace the with-Qloo place cards; the stars and affinity percentages stay above
  the new caption. **Not fixed.** Grok's second change request: "a judge can press one control and watch the
  Qloo-specific places disappear, with no leftover cards."

## Language and phones

- **Med (GPT, Opus).** "Food in Caguas", "All in Adjuntas", "Camera motion on", category labels and tour titles stayed
  English on a Spanish page. **Fixed** for the list titles and the camera pill in cut three; category labels on the
  Qloo cards ("Bakery · Adjuntas", "Strong match for …", "Photo · Qloo") and the tour titles are still English.
- **Med (GPT).** The language control reads as a voice selector ("ES · Selena"), not an interface-language setting.
  Not changed.
- **Low (GPT).** Changing industries kept the panel's scroll offset so the new card opened above the fold. **Fixed:** a
  new verdict scrolls its panel to the top.
- **Low (Opus, Grok, GPT).** At 390 px the answer and the panel still cover most of the map; the placeholder truncates;
  the answer cards are a sideways scroller; the Competido and Tranquilo swatches are close in colour. GPT and Grok
  both reported no horizontal overflow. Not changed beyond the one-sheet fold.

## Findings from one evaluator, not changed

- **Med (Grok).** The decision card's third check says "Compare with the gap-group towns" even when the town is
  competitive or crowded. Cheap: vary the third check by group.
- **Med (Grok).** "Mucha afinidad" reads as a strong yes for a town just above the median (gusto #32 de 76). Wording.
- **Med (Grok).** Qloo's visit list for Adjuntas names two bakeries while the Overture examples on the same card add
  two more; the owner's "go here" list skips them.
- **Med (Grok).** A place that Yelp lists as closed is still a "strong match". The hours disclaimer does not cover it.
- **Med (Grok).** The front page says "The agent never answers from memory" and "Nothing is invented" while the
  without-Qloo answer labels itself general knowledge. Wording; the evidence panel and `/compare` already tell the
  exact truth.
- **Med (Opus).** La Placita de Santurce shows two closing times in one session (Overture hours against the Qloo
  card's hours). Known since the morning panel.
- Low. Bad Bunny cards are not sorted by the displayed match percentage; `/api/speak` fires after every answer; the
  DuckDuckGo favicon lookups 404 and send business domains to a third party; the Miami refusal has no evidence line;
  distances ("7.7 km") do not say from where; one Qloo photo was empty; the Cesium watermark (Carlos's plan decision).

## What each evaluator asked for first

- GPT: claim-level grounding, a source chip per factual sentence, and `/compare` as a reproducible live control a judge
  can run on one prompt.
- Opus: stop the model doing arithmetic or comparisons in prose; the tool should return the direction and one unit, and
  a post-check should reject a note that disagrees with its numbers.
- Grok: freeze the numbers (show the rule sentence in both languages, never let the model restate a rate); make the
  control replace the cards; put the owner's next step in one plain Spanish sentence that matches the caution.

The panel agrees on the direction: the model should narrate places and next steps, not numbers. Cut three removed the
unit mismatch that produced both Highs on the numbers; the comparison inversion needs either a direction field from the
tool or a note check, and that is the first build item if the freeze opens again. Three panels have cost about the
same as a coffee each in model calls; the mean has not moved across them, so the next one is worth running only after
the Devpost paste is final and the screenshots match live.
