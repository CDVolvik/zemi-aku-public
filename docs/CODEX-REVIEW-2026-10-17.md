# Second-model review, round 2 (October 17, 2026)

A read-only adversarial review of `5478ddf` (the code of the integration release `c6b19b0`) by OpenAI
Codex (`gpt-6.1-sol`), delegated from the Claude session on the afternoon of October 17, the day
before the freeze. Brief: hostile judge and security reviewer; start from the twelve server modules
round 1 did not read (`audition`, `catalog`, `census`, `coastal`, `listen-relay`, `opportunity`, `ships`,
`spoken`, `tester-delivery`, `testers`, `voice-agent`, `voices`) and from `app/`, then the October 16
stack (history, home page, cards, beta link, limits). The reviewer ran `npm test` once (406 pass),
`gitleaks` over 185 commits (no leaks), reproduced every finding offline with its own script
(`tmp/codex-round2-repro.mjs`), started no server and called no paid API. Its raw report is
`tmp/codex-review-round2-2026-10-17.md` (scratch, not tracked); the reviewer read 41 files in full and
listed the 233 it did not.

Eight findings, all marked CONFIRMED by the reviewer and re-read here against the code. Seven are
fixed in `cd4fd44` and live as `zemi-aku:review2-20261017` (record in `DEPLOY.md`); one is deferred.

| # | Severity | Finding | Fix | Checked |
|---|---|---|---|---|
| 1 | critical | `/api/listen` (dictation) accepted upgrades from any Origin, bounded only completed seconds (time was charged on close against `Infinity`) and had no concurrent-session limit: 120 foreign sessions admitted with 0 seconds charged while active, 36,000 s recorded against a 21,600 s cap | `server/listen-relay.mjs`: same-origin only (the `/api/voice` check, `voiceOriginAllowed`), the whole `maxSeconds` reserved from the daily seconds **before** the upgrade and settled with the real length on close (unused part refunded), one live session per visitor, eight overall; `scripts/serve-eagle.mjs` wires `reserve`/`settle`/`visitorIp`/`trustProxy`. Four tests in `test/listen-relay.test.mjs` drive the production function with a fake socket server | Live: foreign origin → HTTP 403, no origin → 403, the page's origin → 101 (`tmp/probe-listen.mjs`). `scripts/check-listen-relay.mjs` now sends its own origin |
| 2 | should-fix | The voice agent replaced any tool result over 7,000 characters with an error stub; an ordinary eight-place `artist_places` answer is 9,073 characters, so Deepgram got "Result too large" while the map still moved | `fitContent` in `server/voice-agent.mjs`: the longest list in the result is shortened from the end until the JSON fits, with a note; only a result with no list to shorten is refused. Test with an over-limit eight-place fixture | Unit test; the live voice agent was not exercised (paid) |
| 3 | should-fix | Replays served the October 14 Maricao answer's weather sentence ("Today brings showers and thunderstorms…") and the places' "Today 8:00 am–4:30 pm" hours as if current | The Maricao sample's sentence is now timeless ("Plan the tower for clear weather…"); `replayOf` drops `hours` from every replayed place. Test over all three committed samples | Unit test |
| 4 | should-fix | On a plain `/app` start the first town navigation **replaced** the island history entry (nothing had primed `syncHash`), so Back left the app | Boot calls `syncHash({ replace: true })` after `flyHome`, which marks the island entry ready; the first town is then a push. Module test plus a source assertion in `test/history.test.mjs` | Unit test; Back on the live site returns to the island (checked once in the browser after the release) |
| 5 | should-fix | A deep link to a place beyond the first catalog page (`#town=Ponce&place=<id of the 51st place>`) cannot restore: the restore searches the loaded page only and then rewrites the hash without the place | **Deferred.** Shared links come from the app itself, which only produces hashes for places it has open; a hand-built link to an unloaded place shows the town instead of the place, with no error. Fixing it means resolving the id against the catalog API during restore | Not fixed; noted in `NEXT-SESSION.md` |
| 6 | should-fix | With a French or German voice chosen, a typed French or German question was switched to Spanish or English by the EN/ES guesser (`de la` → es, `in` → en) before asking | `runQuestion` applies the guess only when the current voice is English or Spanish; a chosen fr/it/de voice keeps its language. Test in `test/lang.test.mjs` | Unit test |
| 7 | should-fix | Tester delivery scanned only the first 300 rows **ever** before checking acknowledgements, so signup 301 and later were never forwarded while the server said `{ok:true}` | The batch is the first 300 **pending** rows. Test with 301 rows and 300 acknowledged | Unit test |
| 8 | nit | README said the Deepgram voice agent "stays off" while the deployed overlay funds it (round 1 had fixed the same claim elsewhere) | README: the voice agent runs under daily caps; only the hosted MCP connector is off | Docs |

What the reviewer also checked and found clean: static path containment, the Caddy/proxy header
handling, tester and admin token routes, the voice-agent origin and token boundary, MCP-off wiring,
the Facebook/Instagram icon exclusion. It did not run a browser; CSS, touch layout and the Cesium
camera were not covered (those were checked by hand in the integration release).

415 tests after the fixes. The craft-ownership gate (Carlos walking the code) still runs on the
frozen build; this round covered the adversarial-review half only.
