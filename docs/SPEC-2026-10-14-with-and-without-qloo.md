# Spec: the with-and-without-Qloo page (plan item 3)

October 14, 2026. From `FIRST-PLACE-PLAN-2026-10-13.md` row 3, approved by Carlos as written. The
front page already says "Take Qloo away and the island is blank." This page proves it with the same
model, the same prompt and the same settings, once with the Qloo tools and once without, and shows
where the answer changed and where Qloo added nothing. Routed, Advance and Hayy publish a control;
nobody in the gallery publishes one with the misses left in.

## The control

Six frozen prompts, no history, no open town, same model (`deepseek/deepseek-v4.1-flash`), same
system prompt, same `max_tokens`, `reasoning.effort` and tool budget:

| id | lang | question | why |
|---|---|---|---|
| bad-bunny | en | Where do Bad Bunny fans eat in Bayamón? | artist → place, the hero on-ramp |
| bayamon-cafe | en | Which cafés in Bayamón are good for a morning meeting? | the plan's Bayamón café |
| maricao | en | What is there to do in Maricao? | the sparsest town (4 Qloo places) |
| mofongo | es | ¿Dónde comer mofongo en Ponce? | Spanish, a dish Qloo's strict tag may miss |
| rincon-rain | en | Plan a rainy afternoon in Rincón. | weather tool stays in both runs |
| calle-13 | en | Which town should I visit if I like Calle 13? | cross-domain, no town given |

"Without Qloo" keeps only the tools that do not read Qloo: `map_town`, `town_weather`, `landmarks`,
`town_history`. Everything that reads Qloo (`town_catalog`, `find_places`, `place_details`,
`fans_also_love`, `artist_places`, `town_profile`, the five `qloo_*` calls, `opportunity_map`) is
removed from the registry for that run. The prompt is unchanged, so the model must fall back on
general knowledge and label it as such.

## How the runs are made

`scripts/compare-qloo.mjs <origin>` posts each prompt twice to `/api/chat` on a local server
started with `ZEMI_COMPARE=1`; the second post carries `tools: "no-qloo"`. The server honors that
field only under that variable, which `deploy/compose.safe.yaml` never sets, so the public site
had no such switch. **Superseded October 23:** the flag is public; every live model answer offers
"Ask again without Qloo", one visitor turn and one model reservation like any answer (`JUDGE-PANEL-2026-10-23.md`). The script writes `data/compare-qloo.json`: `ranAt`, `model`, `settings`, and
per prompt the two answers with their `evidence` (the item 2 drawer), the places each run put on
the map, and the comparison from `server/compare.mjs`:

- `named.with` / `named.without`: catalog places named in each answer (matched by folded name
  against the places the Qloo tools returned; the without run can only name places by
  general knowledge, which are listed as `unverified`).
- `onlyWith`: places named with Qloo that the without run did not name. `onlyWithout`: the
  reverse.
- `qlooAddedNothing`: true when the Qloo run named no catalog place or the two named lists are
  the same. Shown as a plain label, not hidden.

Twelve model turns cost under a dime of the local daily budget. The JSON is committed and served
from `/data/` like the catalog counts, so the page needs no model turn and is reproducible.

## The page

`/compare` → `app/compare.html`, static, the front page's type and tokens. For each prompt: the
question, two columns (With Qloo · Without Qloo) with the answer, the named places bold, the
drawer's tool lines under each, then one line: "Qloo changed: X, Y" or "Qloo added nothing here".
A head paragraph names the model, settings and `ranAt`. Linked from the front page nav ("With and
without Qloo"), the `#qloo` section and the README.

## What does not change

The public `/api/chat` behavior, the prompt, caps, keys. One env-gated branch in the route, one
exported filter in `agent-tools.mjs`, one pure module, one script, one page, one JSON file.

## Acceptance

- Tests: `withoutQloo` keeps exactly the four non-Qloo tools; `compareRuns` computes the named
  lists, the diff and the "added nothing" flag on fixtures; the page exists, fetches the JSON and
  the front page links it; the route ignores `tools` without the env.
- `data/compare-qloo.json` has six prompts with both runs and no key material.
- Live: `/compare` renders the six comparisons logged out.
