# Spec: opportunity map (where taste is high and businesses are few)

Draft for Carlos's sign-off, 2026-10-10. The design was approved in conversation the same day:
hero audience **Puerto Rico entrepreneurs**, lead view **island map, then town**, scoring
**two honest axes, no single score**. Nothing is built.

> **Correction, 2026-10-11 (after the whole-branch review).** This spec said a municipio missing
> from County Business Patterns has zero establishments. That is wrong: CBP does not publish cells
> under 3 establishments (smallest published value across ~2,000 US counties is 3), so a missing
> municipio has 0–2. The build keeps a lower and upper bound per town; supply is compared with the
> median of towns with published counts; a town is "few" only if even its upper bound stays below
> that median, otherwise "not enough data". The honesty lines changed accordingly (EN/ES, pending
> Carlos's review), and "salon" uses beauty salons only (812112; nail salons are published in 3
> towns). See `docs/CENSUS.md`.

## Why

- **The judges.** Four equally weighted criteria. Technological Implementation asks "how
  thoroughly and skillfully does the project use Qloo"; Potential Impact asks for "a credible,
  specific case for solving a real problem for a real audience"; Quality of the Idea asks for "a
  creative, non-obvious use of Qloo". The rules add: "If your submission would work the same
  without Qloo, you're building the wrong thing" ([rules](https://qloo.devpost.com/rules)).
- **The idea.** Qloo says what a town's people lean toward; Census says how many people live
  there and how many businesses already serve that taste. Put together, a Puerto Rico
  entrepreneur can see where a taste is strong and the supply is thin, across all 78 towns,
  before reading one town closely. Qloo stays the spine: remove it and the map has no taste axis.
- **Today.** The business flow answers one town at a time from Qloo, Overture and four Census
  survey numbers (`server/business.mjs`, `docs/CENSUS.md`). It has no island view and no
  official business counts.

## What was verified on 2026-10-10 (live calls, project keys)

| Source | Call | Result |
|---|---|---|
| Qloo heatmap, island-wide | `/v2/insights` `filter.type=urn:heatmap`, `filter.location.query=Puerto Rico`, `signal.interests.tags=urn:tag:genre:place:restaurant:bakery`, `take=40` | 200, **2,382 cells**, each with `location.latitude/longitude` and `query.affinity` spread 0.000–1.000. `take=200` returns 400; `take=40` still returns every cell. |
| Qloo tags | `/v2/tags?filter.query=…` | bakery `urn:tag:genre:place:restaurant:bakery`; café `urn:tag:genre:place:restaurant:cafe`; restaurant `urn:tag:genre:place:restaurant`; bar `urn:tag:genre:place:restaurant:bar`; hotel `urn:tag:genre:place:hotel`; salon `urn:tag:genre:place:beauty_salon` |
| Census County Business Patterns 2023 | `/data/2023/cbp`, `for=county:*&in=state:72`, by `NAICS2017` | café 722515: 432 establishments in 43 municipios · bakery 311811: 246 in 44 · full-service restaurant 722511: 1,780 in 72 · limited-service 722513: 2,264 in 77 · bar 722410: 259 in 35 · hotel 721110: 191 in 23 · beauty salon 812112: 301 in 28 · nail salon 812113: 12 in 3 |
| Census nonemployer (self-employed) 2022 | `/data/2022/nonemp`, state 72 | 204, no data for Puerto Rico. Not used. |

Only the bakery heatmap was called island-wide. The build checks the other five and fails loudly
if any returns no cells.

## Success criteria

1. A logged-out visitor picks "Where should I open a… bakery" (English or Spanish) and the map
   colors all 78 towns into four groups, with a legend in plain words, in under 3 seconds from
   the saved build.
2. Tapping a town opens its business readout with the taste rank, Census businesses and
   employees, residents per business against the island, and the existing income and age.
3. "¿Dónde abro una panadería?" and "Where should I open a café?" open the map without the AI model.
4. The agent and the MCP connector can ask for the same data through one new tool.
5. Every number shows its source and period; no screen or tool claims demand, revenue or profit.
6. Tests cover the build, the grouping, the API, the tool and the question detection.

## Design

### Industries

| Industry | Qloo tag | Census NAICS (summed) |
|---|---|---|
| café | `urn:tag:genre:place:restaurant:cafe` | 722515 |
| bakery | `urn:tag:genre:place:restaurant:bakery` | 311811 |
| restaurant | `urn:tag:genre:place:restaurant` | 722511 + 722513 |
| bar | `urn:tag:genre:place:restaurant:bar` | 722410 |
| hotel | `urn:tag:genre:place:hotel` | 721110 |
| salon | `urn:tag:genre:place:beauty_salon` | 812112 + 812113 |

These match the subtypes `server/business.mjs` already understands, plus bars.

### Build (offline, `scripts/opportunity.mjs`)

- Per industry: one Qloo island heatmap call and one Census CBP call per NAICS code, 14 calls in
  all. Keys come from the project `.env` and never reach the cache.
- **Taste per town:** keep cells inside the island (`inIsland`), assign each to a municipio by
  point-in-polygon against `app/data/municipios.geojson`, and take the mean `query.affinity` of
  the town's cells. A town with fewer than 5 cells gets `taste: null` ("not enough taste data").
- **Supply per town:** sum establishments and employees across the industry's NAICS codes. A
  municipio missing from the CBP response has zero establishments in that industry (CBP lists
  only geographies with establishments). Divide by the existing Census population into
  businesses per 10,000 residents.
- **Group:** for each industry, the median taste and the median businesses-per-10,000 across towns
  with taste data. At or above the median is "high". Four groups: `gap` (taste high, businesses
  low), `competitive` (both high), `quiet` (both low), `crowded` (taste low, businesses high).
  Towns without taste data are `unknown`. Each town also gets its taste rank (1 = highest of the
  towns with data).
- Output: `cache/opportunity/<industry>.json` (ignored by Git, outside served folders, like
  `cache/census`), carrying source names, vintages (CBP 2023, PRCS 2020–2024, Qloo retrieval
  time), the two medians and the grouping rule. Derived per-town numbers only; no raw Qloo cells
  are stored.

### Server (`server/opportunity.mjs`, wired in `scripts/serve-eagle.mjs`)

- `GET /api/opportunity?industry=<id>` returns the saved file for that industry: per town
  `{ town, group, tasteRank, taste, establishments, employees, perTenThousand }`, plus the
  medians, the rule text and sources. Unknown industry → 400. Missing build → 503 with a plain
  message. Per-IP limit 30/min.
- The business readout for a town (existing flow) adds the industry's taste rank, CBP
  establishments and employees, residents per business, and the island figure for comparison.
- **Question detection:** "where should I open a <industry>" / "¿dónde abro / pongo / monto una
  <industry>?" with no town opens the map; with a town it keeps today's town readout. English and
  Spanish, deterministic, no model.

### Agent and connector

- One new read-only tool `opportunity_map` `{ industry }` in `server/agent-tools.mjs`. It returns
  the four groups as town lists (top 5 `gap` towns by taste rank first) and the sources, plus an
  `action` that colors the map in the app. The connector serves it as its 13th tool, with
  `map_url = /app?opportunity=<industry>`.

### Map (`app/index.html`)

- Entry: "Where should I open a…?" in the Places panel, with six industry buttons, and the
  `?opportunity=<industry>` link parameter.
- Towns color by group with one legend: **Gap: strong taste, few businesses** · **Competitive** ·
  **Quiet** · **Crowded** · **Not enough data**. Colors from the existing palette, with patterns
  or labels so the groups don't depend on color alone.
- Tapping a town opens its business readout for that industry.
- A line under the legend gives the rule and the sources. Spanish copy uses *usted* and natural
  Puerto Rican phrasing; final wording goes through review before release.

### Honesty labels (shown in the legend, the readout and the tool result)

- "Taste compared with existing businesses. Not a measure of demand, revenue or profit."
- "Businesses: U.S. Census Bureau, County Business Patterns 2023. Excludes the self-employed and
  government. A town not listed has no establishments in this industry."
- "Taste: Qloo heatmap affinity for <industry>, averaged over the town's map cells, retrieved
  <date>." "People: Puerto Rico Community Survey 2020–2024."
- "Groups split at the island median on each axis."

## Tests (written first)

- Point-in-polygon assignment, including a cell on another island (Vieques/Culebra) and a cell
  outside every town.
- CBP parsing: a missing municipio counts as zero; NAICS codes sum; a malformed response fails.
- Grouping: medians, ties at the median, the `unknown` group, taste rank order.
- `/api/opportunity`: valid, unknown industry, missing build.
- `opportunity_map` tool output and its `map_url`; the connector lists 13 tools.
- Question detection in English and Spanish, with and without a town, and no hijacking of
  today's place-name and business questions.
- Live: build once with the local keys, then a browser check of two industries.

## Out of scope

Neighborhood (census tract) maps, self-employed counts (no Puerto Rico data), profit or demand
prediction, and any change to the Qloo/Census call budget on the public demo (the map serves the
saved build and makes no live calls).

## Effort and order

About two sessions. Then deploy with the connector under one "ship", and re-shoot the business
story in the walkthrough around the map. The capped in-app agent remains a separate decision
that needs the replacement OpenRouter key.
