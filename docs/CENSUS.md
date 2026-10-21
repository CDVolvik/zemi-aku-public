# Municipality demographics

Run `node scripts/census.mjs` with an active `CENSUS_API_KEY` in this project's `.env`.
The script requests Puerto Rico's 78 county-equivalent municipios (`state:72`) in one call,
checks that every app town is covered, and writes only public data to ignored `cache/census/`.
The Docker image includes that cache. Preserve it when mounting the host's cache directory.

Source: [2024 ACS five-year detailed tables](https://www.census.gov/data/developers/data-sets/acs-5year.html),
including Puerto Rico Community Survey estimates for **2020–2024**. Each cached record has a
municipality FIPS, source URL, vintage, retrieval time, units, estimate annotation and margin
of error. Negative special values are missing, not numbers that can enter an answer.
The `marginOfErrorConfidenceLevel` is `0.9`, following the Census Bureau's
[90% convention](https://www.census.gov/programs-surveys/acs/methodology/sample-size-and-data-quality/sample-size-definitions.html).
The `-555555555` margin sentinel remains null with a `marginOfErrorNote`: the estimate
is controlled to an independent population or housing estimate and effectively has no
sampling error. It differs from an unavailable margin; see the Bureau's
[annotation meanings](https://www.census.gov/data/developers/data-sets/acs-1year/notes-on-acs-estimate-and-annotation-values.html).

| Metric | Census table | Interpretation |
|---|---|---|
| Population | B01003 | Survey population estimate |
| Household income | [B19013](https://api.census.gov/data/2024/acs/acs5/groups/B19013.html) | Median household income in 2024 inflation-adjusted dollars |
| Housing value | [B25077](https://api.census.gov/data/2024/acs/acs5/groups/B25077.html) | Median value of owner-occupied housing units, dollars |
| Age | [B01002](https://api.census.gov/data/2024/acs/acs5/groups/B01002.html) | Median age, years |

`/api/town/profile` and the agent's `town_profile` tool expose these under `demographics`.
Existing Wikidata population and Qloo/Overture fields retain their own provenance. Census
is preferred for municipality population answers when available; label the survey period.
Do not combine its population with Wikidata's potentially differently dated figure. Census
estimates are not current property asking prices, business valuations, revenue or evidence of
commercial demand. When answering, use the survey period and margins of error; never imply
that a municipality average is a measured characteristic of an individual business or person.

## Business counts (County Business Patterns)

`node scripts/opportunity.mjs` reads [County Business Patterns 2023](https://www.census.gov/programs-surveys/cbp.html)
(`/data/2023/cbp`, `for=county:*&in=state:72`, by `NAICS2017`) with the same key and writes
derived per-town counts to ignored `cache/opportunity/`, beside one Qloo island heatmap per
industry. Checked live on 2026-10-10:

| Industry | NAICS | Establishments | Municipios with any |
|---|---|---|---|
| Café (snack and nonalcoholic beverage bars) | 722515 | 432 | 43 |
| Bakery (retail bakeries) | 311811 | 246 | 44 |
| Restaurant (full-service + limited-service) | 722511 + 722513 | 1,780 + 2,264 | 72 / 77 |
| Bar (drinking places) | 722410 | 259 | 35 |
| Hotel (hotels and motels) | 721110 | 191 | 23 |
| Salon (beauty salons; the map leaves out nail salons, 812113: 12 in 3 municipios) | 812112 | 301 | 28 |

CBP does not publish a county cell with fewer than 3 establishments: across about 2,000 US
counties per industry the smallest published value is 3 (checked 2026-10-11). A municipio
missing from the response therefore has **0–2** employer establishments, not zero. The map
keeps that as a range: such a town counts as "few" only when even 2 businesses would stay
below the median of towns with published counts; otherwise it shows as not enough data.
It counts employer establishments only: the self-employed and government are excluded, and
Nonemployer Statistics return no Puerto Rico data (checked the same day). Counts are divided
by the PRCS population above into businesses per 10,000 residents. They show existing supply,
not demand, revenue or whether a new business would succeed.
