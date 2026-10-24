# Blind judge panel, October 23, 2026

Three agents from three vendors tested the live site (`notes-20261021`) with the same
[brief](evidence/judge-panel-2026-10-23-brief.md): no access to code or docs, two personas (a
Spanish-first Puerto Rico bakery owner, then a ten-minute judge), the Devpost testing steps,
then up to six questions of their own, a 390 px pass, and scores on the four official criteria.
Reports: [GPT-5.6](evidence/judge-panel-2026-10-23-gpt.md) ·
[Claude Opus 5.5](evidence/judge-panel-2026-10-23-opus.md) ·
[Grok 4.7](evidence/judge-panel-2026-10-23-grok.md). All three used a real headless Chromium.
No crashes, no HTTP errors, no fabrication; every "invent a place" attempt was refused.

**This is automated independent review, not user testing.** Devpost copy must not call these
evaluators users or testers.

## Scores

| Criterion | GPT | Opus | Grok | Mean |
|---|---|---|---|---|
| LLM + Qloo use | 4 | 3 | 4 | 3.7 |
| Technical execution | 4 | 4 | 4 | 4.0 |
| Originality | 5 | 4 | 4 | 4.3 |
| Real-world impact | 4 | 3 | 3 | 3.3 |
| **Total / 20** | **17** | **14** | **15** | **15.3** |

The October 13 simulation also scored 15/20 against leaders at 17–18. The build items shipped
since then held the engineering score; what the panel took points from is the owner's first two
answers, not the feature set.

## Findings every evaluator reported

1. **High. The rule-based business answer contradicts the map.** Bakeries → San Juan: the panel
   says "Gap: strong taste, few businesses" while the bubble says "San Juan's busy. A couple dozen
   bakeries show up in Qloo, and other map data counts about fifty." Cause: `server/spoken.mjs`
   picks the size clause from the Qloo catalog count (35 > 30 ⇒ "busy"), not from the opportunity
   verdict. Same family: Adjuntas "muchos negocios" for 5 establishments.
2. **High. "Where do fans eat" cards ignore the category.** A boys' school, a monument, a hotel
   and the entity "San Juan, Puerto Rico" appear as 88% "strong match" cards under the Bad Bunny
   and Taylor Swift answers. The prose picks food places; the cards do not. Evidence says 8
   places, the chips sum to 14, the panel offers 47.
3. **High/Med. Rounded counts read as wrong numbers.** The spoken bands turn 64 into "about
   fifty", 70 into "about fifty", 35 into "a couple dozen" (`BANDS` and `QUANTITY` in
   `server/spoken.mjs`). All three judged it an error, not a style.
4. **Med. Spanish is partial.** Tours, suggestion chips, search placeholder, card genres and
   hours stay English; "mucho gusto" reads as "nice to meet you"; language is not persisted and
   an English question flips the chrome back; `lang` attribute stays `en`.
5. **Med. 390 px: camera controls cover the panel title; sheets hide the map; the ask field is a stub.**

## Findings from one or two evaluators

- **High (Opus, Grok). Comparison, multi-part and out-of-island questions hit the template.**
  "Caguas o Río Grande?" answers Caguas only in 171 ms; "Compare Ponce and Mayagüez" answers
  Ponce; "bakery in Miami" answers the previously open town with no mention of Miami.
- **High (Grok). The model contradicts the ratio it was given.** Adjuntas 2.8 per 10,000 vs
  island 0.8, then "hay pocos negocios por habitante" and "tráfico peatonal observable" with no
  foot-traffic tool.
- Med (Opus). Model tool calls with empty arguments (`opportunity_map {}`, `map_town {}`) fail
  silently and the answer still sounds confident.
- Med (Opus, Grok). Bakery type filter misses "Erik's Bakery and Pastry Shop" in Maricao, so the
  template says none and the model says one.
- Med (all). `/compare` is a recording from 10/14, not a live switch; it says so.
- Low. Stray "Boxing fans..." clause; "Site icon" alt text; "Why it fits you" justified spacing;
  truncated Qloo IDs; distance origin unstated; taste rank list starts at #2; "uno"/"una",
  "ingreso medio" vs median; `/api/speak` fires on town open without a play press; Cesium
  "Upgrade for commercial use" watermark; DuckDuckGo favicon 404s.

## What the panel says a winner needs

The same verifiability we already have (tool traces, named sources, caveats, the ablation),
plus: a siting sentence that matches the census ratio on the same screen; food results that stay
food; Spanish that covers the chips and hours; a phone layout with one sheet at a time; and a
next step an owner can act on.

## Outcome (same day)

Carlos said go. A-F shipped as `zemi-aku:verdict-20261023` after a Codex adversarial review of the diff (eight findings,
all fixed: the control now repeats the original request snapshot instead of the grown history; the control endpoint is
JSON and same-origin only; lowercase and mixed-pair places; standalone "best/mejor" no longer routes one-town questions
to the model; eating questions set the tool category so evidence and cards agree, and an empty food set shows no cards;
"unknown" rows say which data is missing; a dropped oversize result is marked in the drawer). Record: `DEPLOY.md` →
Verdict release. The scores above are for the build the panel saw.

**October 24:** the remaining consensus items shipped as `lang-20261024` (`DEPLOY.md` → Language release): the saved
language now survives a reload and a Spanish browser starts in Spanish; the gap list says "taste #n of N"; the verdict
closes with a next step; empty model tool calls are repaired from the question and the open town; a bakery filed by Qloo
as a plain restaurant counts by its name. A second blind panel on that build: [JUDGE-PANEL-2026-10-24.md](JUDGE-PANEL-2026-10-24.md).

## Recommendation (for Carlos's decision under the freeze)

Reopen the freeze for one tight release, then re-review, redeploy, re-export the snapshot:

| # | Change | Where | Effort |
|---|---|---|---|
| A | Business template leads with the opportunity verdict and exact counts ("Gap: 16 establishments, 0.5 per 10,000 vs island 0.8; 35 in Qloo, 64 in Overture"), no "busy"/"small" clause when a verdict exists | `server/spoken.mjs` | 2 h + tests |
| B | Food-only cards when the question says eat/comer/drink; card count equals the tool's place count | agent card rendering | 2 h + tests |
| C | Two-town, "which is better", and out-of-island questions go to the model (or a "not covered" line for non-PR places) instead of the template | `server/business.mjs` routing | 2 h + tests |
| D | 390 px: move camera controls off the panel header; one sheet at a time | CSS | 1–2 h |
| E | Spanish strings for tours, chips, placeholder, hours; "mucha afinidad" | `app/lang.js` | 1–2 h |

A–C move criteria 1 and 4, where we lost the points. D–E are polish. Leave the rest and disclose
the `/compare` recording as the page already does. Skipped if time is short: D, E.
