# Public release: in-app model agent on (2026-10-11, evening)

Carlos's instruction after the readiness plan ("then lets proceed right?"): item 1, turn the in-app model
agent on with a capped budget using the existing OpenRouter key, review before deploy. This release makes
every free-form typed or spoken question on https://zemi.r21digital.com an answer from the model agent, with
the rule-based router as the fallback.

## What changed (branch `zemi/model-agent-on`, `f4902eb` → `f791eb8`, 262 tests)

- `deploy/compose.safe.yaml`: the `OPENROUTER_API_KEY: ""` override is gone (the server `.env` key reaches the
  app) and `ZEMI_CHAT_USD_PER_DAY` is `"1"`. Every other paid cap is unchanged (voice agent 0, listening 0, MCP
  off, Qloo 600/day, speak 40,000 chars/day).
- Model: `deepseek/deepseek-v4.1-flash` is the pinned default; `ZEMI_MODEL` overrides it. Measured on the same
  twelve real questions: V4 Pro 23 s a turn ($0.0036), V4.1 Flash 3.2 s ($0.0023), no fallbacks on either,
  Flash's answers more careful about affinity vs. endorsement. Reservation per round lowered to $0.02.
- `server/agent.mjs`: `plainSpeech()` flattens Markdown (bold, lists, headings, links, quote markers, price
  tiers) to sentences; `spokenExcerpt()` gives the voice the opening sentences within the 280-character clamp,
  splitting only at a sentence end followed by whitespace so decimals, "a.m." and domains survive; `onFallback`
  reports a reason code (`no-key`, `budget`, `http-429`, `empty-answer`, `rounds-exhausted`, …).
- `scripts/serve-eagle.mjs`: forty model turns a day per visitor address (`CHAT_TURNS_PER_VISITOR`), then the
  router; fallback reasons are counted in the log, never content.
- Page: "Checking Qloo's records…" / "Revisando los registros de Qloo…" after 1.5 s, giving the question back if
  the answer has no caption; the voice reads `spoken`, the caption shows the whole answer and scrolls past 38vh.
- Prompt: under 90 words, at most three places unless asked, plain sentences.

## Review

Fresh Opus whole-branch review: nothing critical; spend caps hold (persisted ledger, reserve-before-call), no
new key exposure, Caddy proxy handling sound. Should-fix items all taken: decimal-safe excerpt, waiting caption
restore, Flash-sized reservation, stale docs, link/quote/price flattening, no-space hard cut, visitor-cap logging.

## Deploy

- Key: the OpenRouter line from the project `.env` appended to `/opt/zemi-aku/.env` over SSH stdin through a
  script that strips CR and BOM (backup `.env.before-agent-20261011`, mode 600). Nothing printed.
- Image `zemi-aku:agent-20261011` (`sha256:7e7c2911…b76f51`), `Dockerfile.agent` = `FROM zemi-aku:voices-20261011`
  plus `app`, `data`, `server`, two scripts, built on the VM from a `git archive` of `f791eb8` (62 entries, no
  env, no dependencies). Overlay replaced; app-only recreate on project `zemi-aku-demo`; Caddy untouched.
- Rollback: `/opt/zemi-aku/agent-rollback-20261011` (previous `compose.image.yaml`, overlay, `.env`, README).

## Verification

- 52/52 runtime file hashes match the archive; container env shows the key present, `ZEMI_CHAT_USD_PER_DAY=1`,
  every other cap unchanged; `/.env` 404, `POST /mcp` 404, `/app` 200.
- Twelve live questions (EN/ES, with and without an open town): 12/12 answered by the model with map actions,
  average 3.3 s, zero fallbacks. Examples: "I'm a Bad Bunny fan visiting Ponce this weekend" → "people who like
  Bad Bunny also tend to enjoy Melao Coffee Shop… Those are fan affinities, not Bad Bunny spots";
  "¿Dónde como mofongo en Luquillo?" → no verified mofongo dish, three criollo restaurants, "confirme por
  teléfono".
- `check-demo --journeys`: 0 failed probes (Bad Bunny 10, Vico C 10, Obie Bermúdez 9).
- Logged-out Chromium: Spanish typed question answered in the caption with map actions.

## Boundaries

Live: model agent, four Deepgram voices, opportunity map, business research, artist journeys, coastal. Off:
Deepgram full-duplex voice agent, hosted MCP connector (Qloo's written OK pending). Not done: real-phone check,
repository flip, Devpost. Keys stay as they are until the project ends (Carlos, October 11): the OpenRouter key
first placed expired November 6, before judging ends November 16. On October 12 it could not be extended, so
Carlos issued a new key ($10 limit, expires January 10 2027); it replaced the line on the VM (backup
`.env.before-agentkey-20261012`) with an app-only recreate, verified by two live model answers.
