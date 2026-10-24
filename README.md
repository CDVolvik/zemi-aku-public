# Zemi-Aku

Your music, a way into Puerto Rico. A Qloo Agentic Hackathon project: artist taste
connections become real place records, a 3D map and a conversation across 78 municipalities.

Choose Bad Bunny, Vico C or Obie Bermúdez, inspect Qloo's actual place affinities, open a
record and explore OSM building geometry. Ask the agent for places in a town, then follow
up to open a verified result. Qloo coverage, ground data and Census estimates are labeled
separately. An affinity is not evidence of an artist visit or a forecast of business demand.

**Status, October 17, 2026:** the [live demo](https://zemi.r21digital.com) runs on an
isolated Always Free Oracle VM with HTTPS and OSM 3D. Typed and spoken questions go to the
in-app model agent (DeepSeek V4.1 Flash via OpenRouter, 16 read-only tools, two dollars a day,
forty turns per visitor) with Deepgram Aura-2 voices in five languages under a daily cap; see the
[model agent release](docs/PUBLIC-AGENT-2026-10-11.md) and the
[voices release](docs/PUBLIC-VOICES-2026-10-11.md). Every model answer carries a folded evidence
line (tool calls, sources, counts, timing, model); three saved runs stand in, labeled replay, when
the model falls back ([judge dry run, October 14](docs/JUDGE-DRYRUN-2026-10-14.md)). Earlier evidence:
[public demo](docs/PUBLIC-DEMO-2026-10-08.md). The [with-and-without-Qloo control](https://zemi.r21digital.com/compare)
runs seven frozen questions through the same model twice, once with the Qloo tools removed (the seventh keeps the place catalog and removes only the taste tools)
(`node scripts/compare-qloo.mjs` writes `data/compare-qloo.json`; the site serves its saved run).
The [public coastal demo](docs/PUBLIC-COASTAL-2026-10-08.md) adds five ports,
received AIS positions and port-to-Qloo discovery. Bounded public reception and the
ship-to-port-to-place flow are verified; complete coverage and destinations are not promised.
The [public business research and free voice release](docs/PUBLIC-BUSINESS-2026-10-08.md)
handles opening a café, demographic follow-ups and nearby listed peers with separate Qloo,
Overture and Census evidence. Actual browser voice choices prefer Google US English when
available. All reviewed changes are deployed; the Deepgram voice agent runs under daily caps
and the hosted MCP connector stays off on the public demo.
The MIT snapshot is public at https://github.com/CDVolvik/zemi-aku-public; this working
repository stays private. Deadline October 30, 11:45 PM EDT. [Official rules](https://qloo.devpost.com/rules).

## Run locally

Node 22.19+ and pnpm 10.14.0 are required by the Qloo harness and reproducible install.

```sh
npm install --global pnpm@10.14.0
pnpm install --frozen-lockfile --ignore-scripts
cp .env.example .env
# Add your own keys privately.
pnpm eagle
```

Open the printed URL and /app. QLOO_API_KEY enables taste discovery. OPENROUTER_API_KEY
enables the model agent; DEEPGRAM_API_KEY enables speech. CESIUM_ION_TOKEN is an optional,
restricted read-only browser token for terrain and 3D. CENSUS_API_KEY builds the optional
demographic cache. Other provider credentials stay server-side. Never commit .env.
Optional AISSTREAM_API_KEY stays server-side; ZEMI_AIS_ENABLED defaults to 0 until
regional coverage is verified.
Optional TESTFLIGHT_PUBLIC_URL is a public TestFlight link from App Store Connect
(`https://testflight.apple.com/join/...`); when unset, the front page shows the request form.

Use pnpm, not npm install: pnpm overrides patch vulnerable transitive versions pinned in
the harness's npm shrinkwrap. The committed pnpm lock and Dockerfile use the same install.

Or populate .env and run `docker compose up --build`; open http://localhost:8080/app.
A clean checkout builds with empty optional ground caches. Town catalogs populate at
runtime; the 7,717-place count is an October 7 snapshot, not guaranteed live coverage.
Saved Qloo results are not in the public repository, as Qloo's
[hackathon guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide) asks: the
/compare runs and the three instant samples. With your own keys, `node scripts/compare-qloo.mjs`
and `node scripts/save-samples.mjs` rebuild them against a local server (see each script's header);
without them /compare says the runs could not be loaded and the samples are simply absent.
Ground-cache generation and safe hosting are explained in [deployment](docs/DEPLOY.md).

## Verify

```sh
pnpm test
pnpm audit --prod
node scripts/check-demo.mjs http://127.0.0.1:4174
# Optional real Qloo checks, no paid model/audio requests:
node scripts/check-demo.mjs http://127.0.0.1:4174 --journeys
```

There are 447 local automated tests. A fresh clone of the public repository skips four: the one
that needs the Census cache and the three that read the saved Qloo results.
Public HTTPS, Chrome journey/3D, private-path protection and capped WebSocket probes pass.
Live speech and a real iPhone still require separate verification.

## Use it from Claude Code or Codex (local)

The MCP connector serves 13 of the app's 16 read-only tools (all but map_town, town_weather and
qloo_trends), from your own machine with
your own Qloo key. It is off unless `ZEMI_MCP_ENABLED=1`; the public site keeps it off until
Qloo confirms in writing that a hosted endpoint is allowed.

```sh
# shell 1, project root, after `pnpm install` and a filled .env
ZEMI_MCP_ENABLED=1 ZEMI_PUBLIC_URL=http://127.0.0.1:4173 pnpm eagle
# shell 2: 13 tools, artist_places and town_profile answer, four refusal probes pass
node scripts/check-mcp.mjs http://127.0.0.1:4173 --probes
```

Then point a client at `http://127.0.0.1:4173/mcp` (streamable HTTP, no sign-in):

- **Claude Code:** `claude mcp add --transport http zemi-aku http://127.0.0.1:4173/mcp`, then ask
  "Where do Bad Bunny fans go in Ponce?" and the answer links back to the map.
- **Codex CLI:** in `~/.codex/config.toml`, add `[mcp_servers.zemi-aku]` with
  `url = "http://127.0.0.1:4173/mcp"`.

Each tool result includes a `map_url` that opens the matching view in the browser. The
connector never calls a model or a speech provider; its Qloo use counts against your own key.

## Structure

| Path | Responsibility |
|---|---|
| app/index.html, app/dossier.js | Island → town → place, artist journey and source cards |
| app/home.html | Field-atlas landing page |
| server/discovery.mjs, server/catalog.mjs | Validated artist entry and municipality catalogs |
| app/coastal.js, server/coastal.mjs, server/ships.mjs | Port discovery and optional bounded AIS feed |
| server/agent.mjs, server/agent-tools.mjs | Conversation and 16 read-only tools |
| server/business.mjs | Saved business context, demographic/taste research and listed-peer proximity |
| scripts/serve-eagle.mjs | Single-origin HTTP/WebSocket server and provider boundary |
| server/limits.mjs, server/agent.mjs | Visitor limits and persisted model reservations |
| server/voices.mjs, app/converse.js | Deepgram speech integration and browser conversation |
| cache/ | Private runtime catalogs, optional ground data, budgets and signup storage |
| Dockerfile, deploy/ | Pinned container, isolated Ubuntu bootstrap, Caddy/Compose |

Keep exactly one application process: spend and outbox files are not a distributed
database. The starter calls Qloo directly; the model cannot invent a map action without
a validated tool result. Pages, APIs and voice callbacks share one HTTPS origin.

## Project notes

- [Deploy history and release checks](docs/DEPLOY.md)
- Second-model reviews: [round 1](docs/CODEX-REVIEW-2026-10-14.md), [round 2](docs/CODEX-REVIEW-2026-10-17.md)
- [Judge walkthrough](docs/JUDGE-WALKTHROUGH.md)
- [Submission draft](docs/SUBMISSION-DRAFT.md) and [video script](docs/VIDEO-SCRIPT.md)
- [Original spec](docs/SPEC.md), [conversation agent](docs/SPEC-2026-10-07-conversation-agent.md)
- [Voice verification](docs/VOICE-AGENT.md), [Qloo toolkit findings](docs/2026-10-07-qloo-kit-findings.md)

## License

MIT for this project's code. See LICENSE. Third-party software, imagery and source data
retain their own licenses and attribution requirements.
