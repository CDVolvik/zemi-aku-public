# Qloo kit installed and probed (2026-10-07)

Read this before calling Qloo by hand. It records what the official kit does with Puerto Rico data, so nobody has to probe it again.

## What is installed

| Piece | Where | Why |
|---|---|---|
| Node 22.23.2 | machine (winget `OpenJS.NodeJS.22`) | The harness needs 22.19 or newer. It was 22.14. |
| `@qloo/qloo-harness` 0.1.26 | `dependencies` | Qloo's official kit: nine workflows, `qloo exec`, `qloo mcp`. The server starts `qloo mcp` at run time, so it is a runtime dependency. |
| `@modelcontextprotocol/sdk` | `dependencies` | Our server talks to `qloo mcp` as an MCP client. |
| `ws` | `dependencies` | Relays live speech between the browser and Deepgram. The key cannot mint browser tokens (403 on `/v1/auth/grant`). |
| `@anthropic-ai/sdk` | `dependencies` | The agent brain. Waits for a dedicated key with a spend cap. Carlos creates it at the end. |
| `.mcp.json` | repo root | A Claude Code session opened in this repo gets the `qloo_*` tools directly. |

Commands:

- `npm run qloo -- <args>` runs the harness with the key from `.env`. It sets `QLOO_BASE_URL` and `QLOO_TRUSTED_BASE_URL` to the hackathon server; without both, the harness will not send the key.
- `npm run q -- <workflow> '<json>' [rows]` prints status and the first rows only.
- `npm run qloo -- doctor --network --json` checks the key and the endpoint.
- Exact input schemas: `docs/qloo-mcp-tools.json` (dumped from `qloo mcp` `tools/list`).

`npm audit` still reports undici and brace-expansion advisories. They sit inside the harness's pinned agent package (`@earendil-works/pi-coding-agent`), not in our code. `npm audit fix` cannot reach them.

## What the workflows return for Puerto Rico

| Workflow | Result | Use |
|---|---|---|
| `find_tags` | **Works.** "mofongo" gives `urn:tag:specialty_dish:place:mofongo` and others. "surf" gives `urn:tag:hobby:qloo:surfing`. "lechon" resolves. | Search that understands words, not only names. |
| `recommend` + `signal_tags` + `filter_location` | **Works for hobby tags.** Surfing in Rincón: El Ancla, La Cambija, Rincón Beach Cafe, Faro Punta Higüera, Coconut Palms Inn. | Taste search on the map. |
| `recommend` + dish tag as signal (Ponce mofongo) | **Loose.** OfficeMax came back. Every row had the same affinity. | Do not show it as "mofongo places". |
| `recommend` + `include_tags` only | **Fails.** `needs_input`: a signal is required. With a location signal plus the mofongo tag, Ponce returned 0. | Dish tags are a filter that is often empty. Say so. |
| `describe` by name | **Unsafe.** "Plaza Las Americas" matched the malls in Ecatepec and Cancún. | Never resolve a place by name. Pass the Qloo UUID. |
| `describe` by UUID | Returns only the name and type. | Not enough for a card. |
| `entity_tags` | Returns affinity tags for the audience, not the place's own tags. A Chinese restaurant got "Puerto Rican, Bakery, Department store". | Do not show as "this business's tags". |
| `audience_demographics` by UUID | **Works.** La Muralla China: ages 30–44 above average, 45+ below, gender near even. | "Who likes this place" on the business card. |
| `where_popular` by UUID, within Puerto Rico | **Works.** Geohash points with affinity and popularity. | A business's taste footprint on the map. |

## Fields on every place record that the map ignored until now

From `/v2/insights` (and `recommend`) `properties`:

- `description` / `short_description`: Qloo's own one-line summary of the business.
- `geocode.admin2_region`: **the municipality.** La Muralla China prints `city: Coto Laurel` but `admin2_region: Ponce`. The neighbor check must read `admin2_region` first, or barrios get called a different town.
- `price_level` (1–4) and `business_rating`.
- Also already used: `address`, `hours`, `phone`, `website`, `neighborhood`, `tags`, `external.google_place`.

## Voice

Deepgram TTS answered 200 on the current key for `aura-2-nestor-es`, `aura-2-hector-fr`, `aura-2-cesare-it`, `aura-2-julius-de`. Aura-2 languages: English, Spanish, German, French, Dutch, Italian, Japanese. French has one female (`agathe`) and one male (`hector`) voice.

## Found while building (2026-10-07, later)

- `qloo_where_popular` rejects `limit` above 20.
- The first harness call after start takes about 12 s. The server warms it at boot.
- `recommend` results from the harness have no `location`. Pins come from the direct `/v2/insights` call; the harness supplies the tag (`find_tags`), the audience, and the footprint.
- Qloo can hold two records for one business ("Mayagüez Mall" twice). Answers keep the first by name.
- Qloo misspells some cities ("Mayagueez", Plaza Las Américas printed as Cataño). `admin2_region` is right in both cases.
- Deepgram live: a stream ends a turn only after silence. A test clip needs trailing silence (`scripts/check-listen-relay.mjs` adds 1.5 s). Raw PCM must name `encoding` and `sample_rate`; the page sends WebM/Opus, which is detected.
- nova-3 with the 78 town names as `keyterm` spells Ponce, Mayagüez, Cataño, Rincón and Aguadilla right in Spanish, English, Italian and German. Without them, Italian heard "Poncia" and German "Pons".
