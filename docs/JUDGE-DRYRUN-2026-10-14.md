# Judge dry run, October 14, 2026 (before the testers)

Fifteen stranger-style questions typed to the live site's `/api/chat` from one address (script `scripts/judge-dryrun.mjs`, raw
answers `tmp/judge-dryrun-20261014.json`). The point: find the disappointing answers before the five testers of item 4 do,
and fix only the top failures. Result: 14 of 15 answered by the model with real places; 1 fell back to the rules router and
gave a wrong-sounding answer. That one is fixed and live (`closing-20261014`).

| # | Lang | Question | Mode | Tools | Verdict |
|---|---|---|---|---|---|
| 1 | en | I'm visiting San Juan for a weekend, where should I eat? | model | town_catalog,town_weather | OK |
| 2 | en | Best beach near Rincón for surfing? | model | map_town,landmarks,town_weather,town_catalog | OK (names two beaches as general knowledge, labeled) |
| 3 | en | Is it a good idea to open a gym in Caguas? | model | town_profile | OK (honest: gyms are outside the six industries; gives Census context) |
| 4 | en | What do people in Mayagüez like? | model | town_profile,town_catalog,map_town | OK |
| 5 | en | Where can I hear live salsa? | rules · rounds-exhausted | - | FAIL, fixed (closing-20261014) |
| 6 | es | ¿Dónde comer en Aguadilla con niños? | model | town_catalog,map_town | OK |
| 7 | es | ¿Qué le gusta a la gente de Cabo Rojo? | model | town_profile,town_catalog | OK |
| 8 | es | ¿Vale la pena abrir una barbería en Carolina? | model | opportunity_map,town_profile | OK |
| 9 | es | Recomiéndame un café en el Viejo San Juan | model | town_catalog,find_places,map_town | OK |
| 10 | en | Restaurants that Daddy Yankee fans would like in Carolina | model | artist_places,town_catalog,map_town | OK |
| 11 | en | whats good in ponce | model | town_catalog,town_weather,landmarks,map_town,place_details | OK |
| 12 | es | Hotel en Vieques | model | town_catalog,town_weather | OK |
| 13 | en | Where is the cheapest place to open a restaurant? | model | - | OK (opens the restaurant opportunity map; 'cheapest' reframed as taste-strong, few businesses) |
| 14 | en | Tell me about Fajardo | model | town_profile,town_history,town_catalog,town_weather,landmarks,map_town | OK |
| 15 | es | Hay playa en Luquillo? | model | map_town,landmarks,town_catalog | OK |

## The failure

"Where can I hear live salsa?" (no town) spent all four tool rounds searching towns and tags and never wrote an answer; the server
reported `rounds-exhausted` and the rules router answered from the word *salsa*: "Top of the list is Salsa y Pique, a Mexican
restaurant." A judge would read that as the product not understanding Puerto Rico.

Fix (`server/agent.mjs`, `1f8d9da`): after four tool rounds the model gets a fifth round with no tools and a message that tools
are closed for the turn, so it answers from what it already read and says what it could not find. If even that round returns no
text, the fallback is unchanged. Test: four tool rounds then a tool-free fifth whose answer is used (342 tests).
Live after the release: the English question answered with Delavida, Club 77 and La Respuesta and said it cannot confirm which
nights are salsa; the Spanish one said Qloo does not tag the genre and named the same venues with hours.

## Still worth watching

- Fixed the same night (`music-20261014`): past the budget or the visitor cap, the rules router now reads hear/dance/live-music
  questions as a request for Qloo's live music venues (12 across the island, strict tag) and says the genre is not on the
  record, instead of name-matching a restaurant called Salsa.
- Answers for island-wide questions default to San Juan. Honest, but a tester from the west may notice.
- Terse Spanish ("Hotel en Vieques") works; terse English with a typo was not tried.
