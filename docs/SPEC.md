# Spec — Puerto Rico locality map

**Approved by Carlos on 2026-10-06.** This is the Qloo Agentic Hackathon entry. The on-screen name is **Zemi-Aku**, the eagle-eye program. The repo name stays `qloo-local-taste`. CivicaPR's charter still keeps that name off civicapr.com. The Devpost public title can change later.

Deadline: **Oct 30, 2026, 11:45 PM ET** (8:45 PM Arizona). Target submit date: **Oct 28**.

## What this is

A 3D map of Puerto Rico. At eagle-eye height it shows 78 municipality checkpoints and nothing else. Zoom into a checkpoint and the Qloo places for that town appear. Two taste chips re-rank the town. A heat layer shows where a taste concentrates. A resource card shows the enriched place. An agent answers only from the pins on screen and cites them.

Qloo's own site calls this interaction Geo Explorer: a place, up to two taste signals, heat, and the ranked list. Their demo cities are Manhattan, Los Angeles, Miami Beach, and Chicago. This entry is that tool for the island.

## Out of this entry

- **Registro Memorial.** No cemetery records, no names of the dead, no family roles, no taste profiles of people. That product stays on its own server. It is not a Qloo layer.
- **Influencers Puerto Rico,** until this map's four zoom missions fly. Then it can be a second submission, and only as niches plus regional taste. The private roster stays private. See `docs/FOLLOW-ON-INFLUENCERS.md`.
- **CivicaPR as the host.** The Devpost text may say the same team ships CivicaPR's public map. No promo video under the CivicaPR name while the CIVICA trademark hold stands. No FEMA dollars in this repo.
- **Arizona.** Measured, then dropped. This entry is the island.
- **On-device Qloo.** Not in the hackathon kit.
- **People, movies, books, and video games** as map layers. Video games are rejected by the hackathon API. The other lists do not change enough from town to town to carry the demo.
- **A monthly content planner.** That was the 10/2 draft. It is retired for this entry.

## The demo

One hosted page. English in the submission. The map labels use the municipality names as printed.

1. **Eagle eye.** The island, 78 outlines, one checkpoint each. Color is the legend: strong or thin, from `data/municipio-survey-2026-10-06.json`. No place pins at this height.
2. **Zoom.** The camera flies to the municipality. Places load for that town only. Pin height is popularity. A second legend names the kind: restaurant, stay, outdoors, shop.
3. **Resource card.** Name, the city printed on the Qloo record, address, hours, price, neighborhood, and the useful tags. Source line: Qloo hackathon API. If the record's city is the neighbor, the card says that city. It does not move the pin into the wrong town.
4. **Two taste chips.** Same control as Qloo's Geo Explorer. Changing them re-ranks the places and redraws the heat.
5. **Agent.** One line, for example "I run a cafe in Ponce." It writes three short cards. Each card names the pins it used and the affinity it read. It does not speak about a town that is not on screen. A person can dismiss a card.

Video path, in this order: fly the island, then drop into **San Juan, Ponce, Mayagüez, and Vieques**.

## Qloo, and only these five capabilities

Use the hackathon server `https://hackathon.api.qloo.com` and the key in the gitignored `.env`. The key stays on the server. Calls follow the shapes in `@qloo/qloo-harness` (`qloo exec` / the same parameters), version 0.1.26 or newer.

| Capability | Call |
|---|---|
| Locality | Eagle eye is the island. A checkpoint is a municipality. Zoom is the town. Heat is `filter.type=urn:heatmap` with `signal.interests.tags=urn:tag:genre:place:restaurant` (the genre tag, not the category tag). Each point has latitude, longitude, affinity, affinity rank, and popularity. |
| Enrichment | The resource card uses the Qloo place record: address, today's hours, phone, website, rating, and the Google place id Qloo already stores. OpenStreetMap confirms the name at the pin. Wikidata adds a social account, and a Wikimedia Commons photo when that record has one. The Google photo URL on the Qloo record is not shown: it does not load. Do not generate a picture of the building. Each fact is labeled with its source. |
| Taste intelligence | Two interest chips. The combination re-reads the town. |
| Recommendations | Places inside the open municipality, ranked from those chips. |
| Agent grounding | One structured Qloo call. The reply cites entity names and scores. No account, no personal profile, no identity. |

The heat legend uses Qloo's words. Affinity is where this taste belongs. Popularity is where it is already common.

## Data we already measured

On 2026-10-06, one insights call per municipality (`take=5`, `filter.location.query="{town}, Puerto Rico"`):

- **70 strong.** At least 3 of 5 records mention the town.
- **8 thin.** Camuy, Gurabo, Ceiba, Cataño, Yabucoa, Cidra, Toa Alta, Cabo Rojo.
- **None empty.**

Some strong towns still surface a neighbor's landmark. Hormigueros's first hit was Mayagüez Mall. Cidra's was a Guavate lechonera. The card shows the city on the record.

Place pins include `lat`, `lon`, and popularity. Plaza Las Américas is at 18.4212, -66.0733.

The 78 outlines already exist as Census-style polygons in the brain archive `docs/archive/2026-09-10-civicapr-3d-spike/municipios-simple.geojson` (`NAME`, `GEOID`). Copy the outlines into this repo when the map is built. Do not copy the FEMA file that sits next to them.

## Stack

- Cesium for the island. Four views on one page: eagle, Esri satellite, OpenStreetMap buildings, and Google's photorealistic mesh. The mesh uses Cesium's demo token until a free ion account replaces it.
- A small web app with a hosted demo URL. Qloo calls go through a server route.
- No database for the demo. The survey file is static. Live places are fetched when a checkpoint opens.
- Shareable URL for the open municipality and the two chips.

## Build order

1. Eagle eye: 78 checkpoints, strong or thin, no pins.
2. San Juan zoom: live places and the resource card.
3. Two taste chips and the restaurant heat layer.
4. The agent, citing the pins on screen.
5. Ponce, Mayagüez, and Vieques.
6. Hosted URL, three-minute video, then flip the repo public with the MIT license.

Steps 5 and 6 wait until 1–4 work. The influencer follow-on waits until step 5 works.

## How this is scored

Checked against https://qloo.devpost.com/rules on 2026-10-06. Devpost rates each criterion 1–5. The four criteria are equal. There is no published bonus category.

Stage one is pass or fail: the project fits “agents, but with taste,” and it actually calls Qloo. A map with no agent, or an agent that does not need Qloo, fails here.

Stage two, equal weight:

| Criterion | What a 5 looks like for this entry | What loses the points |
|---|---|---|
| Technological implementation | Live hackathon Qloo calls for places, a taste filter, and an answer that cites only those records. | A globe that could run with the key removed. |
| Design | One page a stranger can use: search, one town card, a photo from the record, a job they can click. | A panel that explains the build instead of doing the job. |
| Potential impact | The audience is someone choosing a Puerto Rico town for a business. The page shows who is already there, whether the town is strong or thin, and says this is not a census. | A pretty island with no decision on it. Judges may score the video and the text without clicking. |
| Quality of the idea | Puerto Rico’s 78 towns are the gap in Qloo’s city demos. The grade stops a neighbor’s landmark from being treated as the town. | Another world map of the same five demo cities, or a copy of a live-camera globe. |

Required to be judged at all: a hosted demo anyone can open, a public repo, an open-source license visible in the repo About section, an English description, and a project that runs as shown. Checked again on 2026-10-06. The hackathon page says a demo video is not required, and a project that only runs on a laptop does not qualify. The official rules still say judges may score from the text, images, and video without clicking.

This contest has no past winners yet. The presentation pattern below is from Devpost's own judge and winner write-ups, applied only where it matches these rules.

- The live page has to do the job. Devpost's demo guide (Brandon Kessler) says: name the problem, show the working product, name the technology in one breath, then say who it helps.
- A first-place write-up Devpost published (Param, AWS PartyRock) says use the sponsor's real capabilities and skip the feature pile.
- Judges quoted by Devpost look at whether the result does the job, then whether the submission pieces agree.

On this page that means the three jobs stay on the first card, the answer cites Qloo places and a Wikipedia page, and "The record this answer used" is the actual packet behind that answer. The chat takes a typed question or a spoken one. There is no login. A video is optional and comes after the hosted URL.

## Submission

Devpost rules checked 2026-10-06. One person may submit more than one project. Each must be substantially different. Each project can win only one prize. This map is submission one. The influencer board is not started in this repo.

Required: working app, Qloo used by an agent, hosted demo, public repo, MIT license visible in the About section, text description, and an explanation of what was built after Sep 30. The code in this repo before that date is research and the coverage script. The map is new.

## Addenda

- 2026-10-07: business dossier, god's-eye flight, conversation mode. `docs/SPEC-2026-10-07-dossier-flight-voice.md`
