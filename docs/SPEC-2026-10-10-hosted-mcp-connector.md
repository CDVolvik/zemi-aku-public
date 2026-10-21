# Spec: hosted MCP connector (Zemi-Aku inside Claude and ChatGPT)

Draft for Carlos's approval, 2026-10-10. Nothing is built or deployed. Building needs a yes on
this spec; deploying needs its own "ship", because the October 8 approval covers that slice only.

## Why

- **The rules.** The project must "(a) function as an agentic tool, (b) be built using an agent
  framework, or (c) integrate the Qloo API into an existing agent" ([rules](https://qloo.devpost.com/rules)).
  Stage One is pass/fail on whether the project "reasonably fits the theme".
- **What a judge sees today.** The model agent is in the repo and tested, but it is off on the
  public demo, so typed questions go to the rule-based router. Asked on October 10, the live
  `/api/chat` answered "I want a romantic dinner near the beach in Rincon" with a template
  ("Qloo knows 106 places in Rincón. Already naming Rincón: …") and "What do people in Mayagüez
  love?" with "Mayagüez Mall, Mayagüez Mall, … Walmart".
- **Already decided.** Carlos, 2026-10-07 ([conversation-agent spec](SPEC-2026-10-07-conversation-agent.md)):
  "Connectors: yes, after the brain. The same tools exposed as an MCP server on the hosted URL,
  so ChatGPT and Claude users add Zemi-Aku and their own subscription pays for the model."
- **Cost.** A judge's own Claude or ChatGPT does the reasoning. We pay no model cost; Qloo calls
  stay inside our existing free budget.

## Success criteria

1. `https://zemi.r21digital.com/mcp` serves read-only tools over Streamable HTTP, no sign-in.
2. Claude ("No sign in" custom connector; the Free plan allows one, per Anthropic's help page)
   and ChatGPT developer mode ("No authentication"; which ChatGPT plans include developer mode
   is inconsistent across sources, so confirm on Carlos's account) can add it. Asked "Where do Bad Bunny fans go in Ponce?", the model
   calls our tool and replies with Qloo places and a link that opens them on our map.
3. Connector traffic cannot use up the Qloo budget the web demo needs.
4. No model spend for us and no new paid service.
5. Unit and integration tests pass before deploy; Carlos verifies one real Claude session and
   one real ChatGPT session after deploy (account sign-ins are his).

## Approaches

| | Approach | Verdict |
|---|---|---|
| **A** | A `/mcp` route in the existing Node server that reuses the `agentTools(api)` registry | **Recommended.** No new container. It shares the catalog, caches and limits, deploys like the October 8 releases, and adds roughly 150 lines plus tests. |
| B | A separate MCP container that calls our public `/api/*` routes | More isolated, but adds a second service, duplicates the tool schemas and takes memory on the free VM. Not worth it for a judging window. |
| C | Expose Qloo's own `qloo mcp` harness publicly | Rejected. It offers our key's whole tool surface with no Puerto Rico grounding, and name lookups resolve to Mexico ([kit findings](2026-10-07-qloo-kit-findings.md)). |

## Design (approach A)

### Endpoint

- `POST /mcp`, Streamable HTTP, **stateless**: a new server and transport per request,
  `sessionIdGenerator: undefined`, JSON responses (no SSE, since every tool is a quick read).
  `GET` and `DELETE` return 405.
- Built on `@modelcontextprotocol/sdk` (already a dependency). The low-level `Server` takes the
  registry's JSON Schemas as they are, so nothing is converted to zod.
- Server info `zemi-aku` and the package version. `instructions` carry the agent's ground rules:
  Qloo is taste, not demand; never invent a place; name each source; give Census periods and
  margins of error; an affinity is not a visit.
- An `Origin` header, when present, must be `https://zemi.r21digital.com`, otherwise 403.
  This stops other web pages from using visitors' browsers to spend our budget. Claude connects
  from Anthropic's cloud, server to server; whether Claude or ChatGPT sends an `Origin` header
  is not verified. If either does, allowlist that exact value after the first real session.
- Caddy needs no change: `reverse_proxy app:8080` already covers `/mcp`.

### Tools: 12 of the 14

From `server/agent-tools.mjs`, unchanged: `town_catalog`, `find_places`, `place_details`,
`fans_also_love`, `artist_places`, `town_profile`, `landmarks`, `town_history`, `qloo_describe`,
`qloo_recommend`, `qloo_compare_audiences`, `qloo_entity_tags`.

- Left out: `map_town`, which only moves our map and means nothing outside the app, and
  `qloo_trends`, which its own description says may be unavailable on the hackathon API.
- Every tool is annotated `readOnlyHint: true`. Arguments go through the existing `validArgs`;
  invalid arguments return `isError` with a plain message.
- Each result returns the tool's `data` (what the model agent sees today) as JSON text plus
  `structuredContent`, capped at the agent's 7,000 characters. The map `action` is dropped and
  replaced by a `map_url` built only from parameters the app already reads (`/app?town=`,
  `&artist=`, `&category=`, `&ask=`). Each link shape is checked in Chrome before deploy.

### Budget and abuse limits

- Per IP: `/mcp` joins `ROUTE_LIMITS` at 20 requests a minute.
- Connector cap: `ZEMI_MCP_CALLS_PER_DAY`, default **150** tool calls a day.
- Web reserve: a connector call is refused once the shared `qloo-calls` counter reaches the cap
  minus `ZEMI_MCP_QLOO_RESERVE` (default **200**), so the web demo always keeps at least 200 of
  its 600 daily Qloo calls. Every Qloo call the connector makes still counts against the
  shared 600.
- Over either limit, the tool returns `isError`: "Zemi-Aku's connector has reached today's limit.
  The map at https://zemi.r21digital.com/app still works." The judge's agent can say that to
  them, and a protocol-level 429 would not.
- Counters are in memory like the existing caps, so a restart resets them (already accepted).
- The connector never calls OpenRouter or Deepgram. Paid caps stay at zero.
- Logs record counts only, never questions or arguments.

### Security

- Read-only, no sign-in, and no credentials in any response; the Qloo key stays on the server.
- Tool results include third-party text (Qloo descriptions, Wikipedia). Every result names its
  source, and nothing a client sends can change state on our side.
- New deploy probes: `GET /mcp` → 405; malformed JSON → 400; foreign `Origin` → 403; burst →
  429; over the cap → `isError`. The existing private-path 404 probes still pass.
- 🔴 Before deploy, read the Qloo hackathon developer guide's API terms on passing results to
  third-party agents. The event invites "wire Qloo into an agent that already exists", so this
  is expected to be fine, but it has not been checked yet.

### Tests (written first)

`test/mcp.test.mjs` uses a fake API, like the existing agent tool tests:

1. `tools/list` returns the 12 tools, all read-only, without `map_town` or `qloo_trends`.
2. `tools/call` rejects an unknown key, an unknown town or a malformed ID with `isError`.
3. `map_url` is correct for each tool that produces a map action.
4. Over either cap returns `isError` without running the tool.
5. An oversized result is replaced by the "narrow your question" error.
6. Origin policy: no Origin passes, our Origin passes, a foreign Origin gets 403.
7. `GET /mcp` returns 405.
8. Integration: an in-process HTTP server plus the SDK `Client` over
   `StreamableHTTPClientTransport` lists the tools and calls `artist_places`.

Then `scripts/check-mcp.mjs` against a local server with real Qloo: list the tools, then
`artist_places` (Bad Bunny, Ponce) and `town_profile` (Ponce). Run MCP Inspector locally, then
against production after deploy.

### Deploy

New image `zemi-aku:mcp-<date>`, the same rollback layout under `/opt/zemi-aku/`, and only the
app container recreated. `compose.safe.yaml` gains `ZEMI_MCP_ENABLED: "1"`,
`ZEMI_MCP_CALLS_PER_DAY: "150"` and `ZEMI_MCP_QLOO_RESERVE: "200"`. Setting `ZEMI_MCP_ENABLED`
to `"0"` and recreating the container turns the connector off without a new image.

### Once it is live

- The submission gets a "Use Zemi-Aku in your own agent" section: the URL, three steps each for
  Claude and ChatGPT, and three example prompts. Its "Hosted MCP connector" row changes to Live.
- The checklist's agentic item can close once Carlos's real Claude and ChatGPT sessions pass.
- Optional video beat: Claude answering from our tools, then the map link opening.

## What this does not fix

- **Most judges will open the web app, not add a connector.** Calacanis, Boehly, Cedric the
  Entertainer, Abrams and Seligman are not developer judges; Qloo's CTO is. In the app, typed
  questions still get the rule-based router. The biggest upgrade for them is turning the in-app
  model agent on with a capped daily budget. That code exists and is tested, but it waits on the
  replacement OpenRouter key and Carlos's OK on the cap. Measure the real cost per turn on the
  new key before picking the cap; the key's $10 limit is the hard ceiling. That is a separate
  decision from this spec.
- **The map inside the judge's chat (MCP Apps).** MCP Apps became an official extension in
  January 2026, and Claude and ChatGPT both support it (secondary sources, unverified). It could
  render our map inside the conversation. It is out of scope for v1; revisit only if v1 is live
  by October 20.

## Effort and timing

Build and tests: about one session. Deploy and public probes: the session after Carlos says ship.
Carlos's connector checks: about 15 minutes. Target live by **October 20**, a week before the
October 28 submission target (deadline October 30, 8:45 PM Arizona).

## Decisions for Carlos

1. Build v1 as specified: approach A, 12 tools, no sign-in?
2. Caps: 150 connector calls a day, with 200 Qloo calls held back for the web demo?
3. Deploy after the tests pass. This is a separate "ship".
4. Separate from this spec: turn the in-app model agent on, capped, after the key swap?
   Recommended for first place.
