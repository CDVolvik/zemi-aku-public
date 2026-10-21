# Spec: instant samples (plan item 10)

October 14, 2026. From `FIRST-PLACE-PLAN-2026-10-13.md` row 10, approved by Carlos as written. When
the model cannot answer (the daily dollar budget is spent, the provider is down, a round was refused),
a judge who types one of the three questions the walkthrough and the video use still gets the real
answer and the real map, labeled as a saved replay with the time its data was read. Everything else
still goes to the rule-based router as before.

## The three saved runs

| id | lang | question | where a judge meets it |
|---|---|---|---|
| bad-bunny-bayamon | en | Where do Bad Bunny fans eat in Bayamón? | walkthrough step 1, the video's first question |
| maricao | en | What is there to do in Maricao? | the sparse town, the question that tripped the four-calls guard |
| mofongo-ponce | es | ¿Dónde comer mofongo en Ponce? | the Spanish "Try one" chip's question, spoken by Selena |

`scripts/save-samples.mjs <local origin>` asks each of a local server, requires a model answer with map
actions (three attempts), and writes `data/samples/<id>.json`: the question, `savedAt`, the model, the
answer and its spoken excerpt, the map actions as the page received them, and the evidence drawer of
the original run. Three model turns, local budget. The files are committed and shipped in the image.

## How it is served

`server/samples.mjs` → `createSamples({ dir })` loads the folder once; `match({ question, lang })`
compares the question folded (no accents, case or punctuation) in the same language only, so "where
do bad bunny fans eat in bayamon" matches and "…drink in Bayamón" does not. The match returns
`replayOf(sample)`: `agent: true` so the page applies the map actions, `replay: true`, and
`evidence: { mode: "replay", model, at: savedAt, calls }` with `retrievedAt: savedAt` on every call.

`/api/chat` order: business flow → model agent → **sample** → rules router. A sample is never served
while the model answers; it only fills the fallback. The server logs `agent replay: <reason>`.

The drawer (item 2) already renders replay mode: "Evidence · saved replay · N tool calls", each call
with "read <time> UTC", and "A saved run, replayed; the times are when its data was read".

## What does not change

The business flow, the opportunity map, caps, keys, the prompt. One module, one script, three JSON
files, one branch in the route.

## Acceptance

- Tests: `replayOf` keeps the answer and actions and relabels the evidence; matching is folded and
  per language, broken files skipped; the three committed files are model runs with actions and no
  key material; the route serves a sample only after the agent fell back and before the rules router.
- Locally with `ZEMI_CHAT_USD_PER_DAY=0`: the Bad Bunny question returns the replay, the page flies
  to Bayamón, shows the places and the caption's drawer reads "saved replay".
- Live: the public site keeps its budget; the three files are in the image and `/api/chat` still
  answers from the model. The replay path is exercised locally, not by spending the live budget.
