# Stranger test, October 14, 2026 (late night)

A Claude subagent with a Playwright browser visited https://zemi.r21digital.com as a first-time
visitor and skeptical judge: no instructions, fifteen minutes, five typed questions, desktop at
1366x800 then a phone viewport at 390x844. It was told the four judging criteria and nothing about
the site. Screenshots: `tmp/stranger-test/01–18` (untracked). This complements the
[judge dry run](JUDGE-DRYRUN-2026-10-14.md), which scored answers through the API; this pass scored
what a person sees.

## Verdicts

| Step | What happened | Verdict | Status |
|---|---|---|---|
| Landing page, first screen | Headline and primary button were about music; the business journey was only behind the small "Live map" link | Fail | **Fixed**, live as `zemi-aku:stranger-20261014` |
| `/app` first screen, Bakeries, Río Grande | Island colored in about three seconds; town numbers and verdict shown | OK | |
| "Where should I open a bakery?" | Opportunity map answer in the caption, "tap a town to look closer" | OK | |
| "What about Mayagüez?" | The map flew to Mayagüez and the business panel loaded, but the caption kept showing the visitor's own question; the answer line only existed in a hidden panel element | Fail | **Fixed**, same release |
| Evidence under the English answers | None: both questions take deterministic fast paths (opportunity map, business research), which show sources in the panel instead of an evidence drawer | Fail (as a stranger sees it) | **Fixed**, live as `zemi-aku:sources-20261014` (`43fc050`): "Evidence · business research · no model turn · 4 sources" |
| "¿Dónde comer mofongo en Ponce?" | Answered in Spanish in 5.7 s, voice switched to ES, map on Ponce food, evidence line with three calls, honest "no strict mofongo match" | Honest miss | |
| Vico C → places → Lunita's | Route shown with the "not a visit" caveat; the place card had no audience or taste data and no restated artist link | Honest miss | Open |
| "Best sushi in Tokyo?" | "I only cover Puerto Rico", then a general-knowledge Tokyo line, then San Juan's one sushi place | OK | The Tokyo line contradicts "only from those records"; prompt tweak candidate |
| Browser back | Leaves the app for the landing page; the URL never changes inside the journey | Fail | Not doing before freeze |
| Refresh mid-journey | Resets to the first screen | Honest miss | Same |
| Phone 390x844 | First screen clear; ask-bar placeholder clipped to "Ask about any tow"; two of four "Try one" chips off screen; island's east edge cropped in the bakery answer | OK with nits | Real-phone pass October 17 |
| Console errors | None on the live site | OK | |

Judge scores as given, skeptical: Qloo use 4, design 3, impact 3, idea 4. The single change it asked for
was a reliable, visible follow-up answer, which is the second fix above.

## What changed (`3af8fe3`, live as `zemi-aku:stranger-20261014`)

- `app/home.html`: the hero now asks "Where should I open a business in Puerto Rico?", the dek
  describes the industry map, the town numbers and the agent, and the primary button reads "Find a
  town to open in". "Discover through music" stays as the second button. The landing had kept the
  October 8 music story after the October 13 first-screen pivot.
- `app/index.html` (`runQuestion`): a typed question answered by business research or the rules
  router now puts its line in the caption, like model answers do, and hides the duplicate panel
  line. Before, only dictated questions narrated these answers. Verified locally and live: "What
  about Mayagüez?" after the bakery question now reads "Mayagüez has some options. About a dozen
  bakeries show up in Qloo…" in the caption.

347 tests pass; live journeys probe 0 failures; container hashes of `app/index.html`, `app/home.html`,
`server/lib.mjs`, `server/agent.mjs` and `scripts/serve-eagle.mjs` match `HEAD`. Rollback set
`/opt/zemi-aku/stranger-20261014-rollback` (previous image `review-20261014`).

## Decided and open

1. **English business questions never reach the model.** "Where should I open a bakery?" and "What
   about Mayagüez?" are answered by deterministic fast paths in under 200 ms. Carlos chose the evidence
   line (October 14): `server/business.mjs` attaches `evidence: { mode: "sources", kind, calls, at }` and
   `app/evidence.js` renders it as "Evidence · business research · no model turn · 4 sources", opening to
   the Qloo saved catalog count, Overture supply with its release, Census PRCS with its period, and the
   opportunity map with the town's group. Tests in `test/evidence-ui.test.mjs` and
   `test/business-research.test.mjs`. Verified live.
2. **Place cards with no Qloo audience data** end the artist journey flat. A one-line restatement of
   the artist link on the card ("Reached from Vico C's taste matches") would keep the thread.
3. **Deep links and back button**: state lives in memory only. The opportunity map already has a URL
   form; the rest does not. Larger change, not before the freeze.
