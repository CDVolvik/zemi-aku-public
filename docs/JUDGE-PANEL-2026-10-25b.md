# Blind judge panel, sixth round, October 25, 2026 (later)

The same three agents from three vendors, the same [brief](evidence/judge-panel-2026-10-25b-brief.md) as the five
earlier rounds (the latest: [October 25](JUDGE-PANEL-2026-10-25.md)), against the live site as it stood on the polish
release (`polish-20261025`, source `d4e239d`): no access to code or docs, two personas, the Devpost testing steps, up
to six questions of their own, a 390 px pass, scores on the four official criteria. Carlos asked for the re-check
after the polish cut ("can we check again the evaluation"). Reports: [GPT-5.6](evidence/judge-panel-2026-10-25b-gpt.md)
· [Claude Opus 5.5](evidence/judge-panel-2026-10-25b-opus.md) · [Grok 4.7](evidence/judge-panel-2026-10-25b-grok.md).
No crashes, no HTTP errors, no fabricated place; the profit, phone-number and "say Florida has zero bakeries" asks
were refused with the reason stated; the vague question got a question back.

**This is automated independent review, not user testing.** Devpost copy must not call these evaluators users or
testers.

## Scores

| Criterion | GPT | Opus | Grok | Mean | Oct 25 | Oct 24 night | Oct 24 evening | Oct 24 morning | Oct 23 |
|---|---|---|---|---|---|---|---|---|---|
| LLM + Qloo use | 4 | 4 | 4 | 4.0 | 4.3 | 4.3 | 3.8 | 4.3 | 3.7 |
| Technical execution | 3 | 3 | 4 | 3.3 | 4.0 | 4.0 | 3.8 | 3.3 | 4.0 |
| Originality | 5 | 4 | 4 | 4.3 | 4.3 | 4.3 | 4.3 | 4.3 | 4.3 |
| Real-world impact | 4 | 3 | 3 | 3.3 | 3.7 | 3.3 | 3.3 | 3.3 | 3.3 |
| **Total / 20** | **16** | **14** | **15** | **15.0** | **16.3** | **16.0** | **15.3** | **15.3** | **15.3** |

The mean fell from 16.3 to 15.0 on a build that had only gained fixes. Two reasons show in the reports. First, the
evaluators went further off script than before: GPT's High came from a sentence no earlier round typed ("Compare
opening a bakery in Vieques versus Culebra and give exact customer demand and expected monthly profit"), Opus's two
Highs from "skip the tools and list five bakeries with phone numbers" and a salon in Las Marías, Grok's High from the
front page's "See how taste meets demand" link against the sheet's "does not measure demand". Second, criterion 2 is
where the drop sits (4.0 to 3.3): two on-screen contradictions and one parser failure cost a point each from GPT and
Opus. Nothing that scored in round five was reported broken in round six; the control, the evidence drawer, the
refusals and the clarification all held. Six rounds now read 15.3, 15.3, 15.3, 16.0, 16.3, 15.0: the spread between
runs of the same brief is about a point, so one round is not a trend.

## Found this round and fixed the same day (the round-six cut, `4235303`, live as `round6-20261025`)

Three Codex review rounds ran on this cut before it shipped (`tmp/codex-review-round6-20261025*.md`): the first found
the hybrid verdict note still accepting hours and the control diff failing on punctuation; the second found bare
hours ("at 8", "a las 8") and unpunctuated phones passing, preposition tails faking outside places ("or give in
detail" read "Give"), and a dropped card list contradicting the speech; all fixed before deploy.

- **High (GPT).** "…in Vieques versus Culebra and give exact customer demand…" read "Give Exact" as a place outside
  Puerto Rico and refused. Fixed: a place after a conjunction must end the clause; a directive that goes on is not a
  place.
- **High (Opus).** The model's text gave Pan Café hours that differed from the card under it. Fixed: the prompt
  forbids hours and phone numbers in the text; the cards carry the catalog's hours.
- **High (Opus).** A Las Marías salon answer said "0 a 4" against the sheet's "0–2" and "sin clasificar, en el
  puesto 70 de 70". Fixed: the tool's reading says the Census withholds a code's count below 3 and how many codes are
  withheld (two here, so 0 to 4), and an unranked town gets no "of N" to turn into a rank; the prompt says an unranked
  town never gets a position.
- **High (Grok).** The front page's "See how taste meets demand" against the sheet's "No mide demanda". Fixed: "See
  how taste meets supply", the words the sheet uses.
- **Med (Opus).** The "Qloo changed" line missed La Victoria because "Villa Victoria" in the no-Qloo answer contains
  it. Fixed: whole names only.
- **Med (Opus).** Bakery questions with BBQ and taco cards. Fixed: a question about one kind of place keeps cards of
  that kind by name and genre; the prompt asks for `find_places` with the kind word.
- **Med (Grok).** "El siguiente pueblo" was the top of the gap list, not the row after the open town. Fixed: the
  comparison town is the next gap row after this one by taste rank, and the sentence says "by taste rank".
- **Med (Opus).** At 390 px the island frame cropped Fajardo, Culebra and Vieques. Fixed: the phone frame sits
  higher and less west.
- **Low (Opus).** "Ask again without Qloo" on answers that used no Qloo tool. Fixed: offered only after a Qloo call.

## Still open, by weight

- **Med (GPT).** After a no-match answer (an invented artist), the previous artist's panel stays. A no-action model
  answer keeps the list by design (follow-ups rely on it); a stale label is the honest middle ground, not built.
- **Med (GPT, Opus).** At 390 px a place-rich answer and the town sheet together cover the map; the fold handles
  the typed verdict path, a tall answer with cards still stacks. Kept for a real-phone check.
- **Med (GPT).** Switching the language control re-renders only the next answer, not the current state.
- **Med (Opus).** A coastal rip-current alert on an inland town, in English: NWS alerts are island-wide by area; a
  zone-to-town map is not built.
- **Med (Opus).** `/api/speak` is called on each verdict without a press: the voice reads answers by design; a
  judge in a quiet room may not want it.
- **Low.** Spanish chrome still partial (tours, aria labels, "Bakery · San Juan", untranslated Qloo tags); "1
  lugares"; tú/usted drift on `/compare`; units differ between the spoken verdict and the card (documented
  tradeoff); DuckDuckGo favicons 404; the placeholder is cut at 390 px; "Santurce and Calle Loíza" framing is the
  model's general knowledge in both runs of the control.

## What each evaluator asked for first

- GPT: transactional intent parsing (several towns, no directive fragments as places, stale results cleared or
  marked); a finished bilingual phone product with one coordinated sheet; decision-grade comparison inputs.
- Opus: one source of truth for hours and no numbers in the model's prose; cards that match the question; a phone
  layout that keeps the map; fewer English fragments.
- Grok: the front page in the sheet's words; the next gap town as the next row; one sheet at phone width; split
  "saved catalog" from "live Qloo call" in Evidence.
