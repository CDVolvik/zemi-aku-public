# Second-model review, round 1 (October 14, 2026)

A read-only adversarial review of `027340e` by OpenAI Codex (`gpt-6.1-sol`), delegated from the
Claude session with a brief to act as a hostile judge and a security reviewer: what a stranger
can break or make say something false through the public endpoints, what leaks when the repo
goes public, the newest change (the live-music routing), and claims in the README and the
submission draft that the code does not support. The reviewer ran `npm test` once (344 pass),
reproduced every finding offline, started no server and called no paid API.

Eight findings, all marked CONFIRMED by the reviewer and re-checked here. All eight are fixed in
`2938a3c` and live as `zemi-aku:review-20261014` (record in `DEPLOY.md`).

| # | Finding | Fix | Checked live |
|---|---|---|---|
| 1 | Cached Qloo harness responses still charged the 600-call daily allowance, and an HTTP retry burst charged once for three attempts, so repeats of one request could exhaust the allowance for everyone | `qlooTools` takes a `charge` callback and calls it after the cache lookup; `qlooFetch` charges every attempt | Code path; no public probe (it would spend the allowance) |
| 2 | `musicAsk` sent "I listen to Bad Bunny" and "hear the ocean in Rincón" to live music venues, and any question with "bar" in it was vetoed | Requires a live-performance phrase or a genre with a listening/dancing verb; only business intent vetoes. Five new cases in `test/lib.test.mjs` | Both false positives now route as before; "which bar has live salsa" routes to venues |
| 3 | The genre caveat was in the note but not in the spoken caption | One short sentence appended to `speech` in EN and ES | "…Qloo marks live music, not salsa itself." |
| 4 | A fallback after a round had run (budget refused mid-turn, timeout, later HTTP error) showed "rules router · no model turn" although tools had executed | `fail()` keeps `rounds`, `calls` and `model`; the server passes them into the rules evidence; the drawer says "model did not finish" and lists the calls (EN/ES). Tests in `agent.test.mjs` and `evidence-ui.test.mjs` | Unit tests; the live case needs a mid-turn budget refusal |
| 5 | A Qloo harness error envelope (`status: "error"`) came back as a successful `source: "Qloo"` tool result with `ok: true` in the drawer | `kit` returns a fixed error result for any status other than `ok` or `empty`; no provider text passes through. Test in `agent-tools.test.mjs` | Unit test |
| 6 | `POST /api/ask` with `null`, an array, or a non-array `history` threw inside the handler and answered 502 | Body shape validated first; 400 with a fixed message | `null` → 400, `{"history":{}}` → 400 live |
| 7 | README and submission draft said 14 tools, one dollar a day, 40,000 speech characters, voice agent off, evidence under every answer, 247 tests; the deployed container has 16 tools, two dollars, 300,000 characters, the voice agent on under caps, evidence under model answers, and 347 tests | Prose corrected to the deployed configuration (checked against the container's environment and `/api/voice/status`) | Docs |
| 8 | The tracked n8n workflow export and `DEPLOYMENT.md` carried the private sheet ID, the webhook path, credential record IDs and internal addresses | Placeholders in the public export and the docs. The values stay in git history; the sheet is private to the Google account and the webhook requires the header secret, so this is metadata exposure, not access | `git grep` for the three identifiers: none outside history |

The reviewer listed what it did not read in full: `data/**`, most of `app/**`, most of `scripts/**`,
most of `test/**`, most of `docs/**`, and twelve server modules (`audition`, `catalog`, `census`,
`coastal`, `listen-relay`, `opportunity`, `ships`, `spoken`, `tester-delivery`, `testers`,
`voice-agent`, `voices`). Round 2, on the frozen code on October 18, should start from those
modules and from `app/`.

The craft-ownership gate (defendability checklist, Carlos walking the code) still runs on the
frozen code; this round covered the adversarial-review half only.
