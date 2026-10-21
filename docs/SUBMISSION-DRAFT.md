# Zemi-Aku — submission draft

Prepared locally; not submitted. Carlos reviews the wording, demonstrates ownership of
the implementation and authorizes public release. Demo: https://zemi.r21digital.com (live).
Code: https://github.com/CDVolvik/zemi-aku-public (the public snapshot of the working repo).
Project code is MIT; third-party software, maps, photos and data retain their own terms.

## Tagline

Your music, a way into Puerto Rico.

## Inspiration

Start with an artist you like. Where might that lead you in Puerto Rico? The idea was to
let people try that question across all 78 municipalities and inspect Qloo's answers.

## What it does

The first screen asks the question a Puerto Rico entrepreneur actually has: where should I open a
business? Pick one of six industries and the island colors every town by Qloo's taste for it against
the businesses the Census already counts there. Tap a town and three separately attributed sources
answer side by side; change the industry and watch the same town re-answer; go back to the colored
island and pick another town. Music is the on-ramp underneath: choose an artist and follow Qloo's
taste connections to real places. Open a place record,
inspect its source and explore its surroundings with OSM 3D buildings. Return to the
matches, or ask anything about a town or kind of place, typed or spoken. A model agent
reads the question, calls Qloo and the open-data tools it needs, answers in plain
sentences and moves the map to what it found. If the model is unavailable or the day's
budget is spent, a rule-based router answers from the same Qloo records (see the table
below).

Town profiles put taste signals beside separately labeled Overture, Wikidata and Census
data. The interface distinguishes affinities, catalog coverage and demographic estimates.
An artist affinity never becomes a claim that the artist visited that place.

Ask a business question ("Should I open a cafe in Bayamón?") and the app answers with
three separately attributed sources: Qloo's recorded places of that type, Overture's
observed supply with its release date, and Census PRCS household income with its survey
period and margin of error. Pick a place and ask for nearby competitors to get listed
peers within three kilometres, sorted by straight-line distance. Ships and Ports add
received AIS vessel positions and five harbour points that lead to nearby Qloo places.

Ask where instead of whether ("Where should I open a bakery?") and the whole island
answers. For six industries (cafés, bakeries, restaurants, bars, hotels, salons) the
opportunity map sets Qloo's taste for that industry against the Census count of such
businesses per 10,000 residents in each of the 78 towns, and sorts them into gap,
competitive, quiet, crowded or not enough data. Tapping a town shows the numbers and their
sources. It compares taste with existing supply; it does not measure demand or profit.

Answers are read aloud in English, Spanish, French, Italian and German through a Female / Male voice menu. The
spoken line is a short caption of the on-screen answer with rounded counts; the full
sourced text stays on screen.

## How it was built

Plain browser JavaScript and Cesium provide the map and landing page. A long-running Node
server serves pages, APIs and WebSocket relays from one origin. Qloo provides artist
search, place affinities, catalogs and records. The server is an MCP client of Qloo's
official harness (`qloo mcp`). On the public demo it uses the harness for tag search, a
place's audience and where that place is popular.

Typed and spoken questions go to a model agent: DeepSeek V4.1 Flash, through OpenRouter,
reasons across 16 read-only tools, and only validated tool results move the map. The
server flattens the answer to plain sentences, the caption shows all of it and the voice
reads the opening sentences. Under every model answer a folded Evidence line opens to the tool
calls the model made, their arguments, sources, counts and timing, the Qloo IDs it
resolved, the model and the time; a fallback answer says "rules router · no model turn".
The /compare page is the control: six frozen questions asked twice of the same model and
settings, once with every Qloo tool removed, both answers published with their tool lines
and a verdict per pair (Qloo changed all six; the without run refuses to invent places). Three
questions (Bad Bunny in Bayamón, Maricao, mofongo in Ponce in Spanish) are also kept as saved
model runs: when the budget is spent or the model fails they are served with their map actions
intact, labeled "saved replay" with the time their data was read. Deepgram Aura-2 provides the
ten voices, two per language, capped per day (300,000 characters). The
server validates browser history and tool arguments, limits traffic, keeps a persisted
daily dollar budget and a per-visitor turn allowance; if the model fails or the budget is
spent, a rule-based router answers from the same Qloo records instead. A Deepgram voice
agent for live conversation runs on the public demo under its own daily minute and dollar
caps; the demo runs on a separate Oracle Always Free VM. Everything else a judge sees there runs on Qloo and open data.
Caddy serves HTTPS.

## What runs where

Checked against the code and the live site on October 14. Nothing on the public demo is
mocked: places come from Qloo responses (town catalogs are an October 7 snapshot), and an
empty result is shown as empty.

| Feature | Public demo | Notes |
|---|---|---|
| Artist → places (Qloo cross-domain affinities) | Live | An affinity is not a visit |
| Place record, source notes, OSM 3D buildings | Live | 3D uses a restricted Cesium token |
| Town profile: Qloo, Overture, Wikidata, Census PRCS | Live | Each source labeled; Census with survey period and margin of error |
| Business research and nearby peers within 3 km | Live | Straight-line distance, not walking distance |
| Typed and spoken questions in English, Spanish, French, Italian and German | Live, model agent | DeepSeek V4.1 Flash via OpenRouter with 16 read-only tools; validated tool results move the map; two dollars a day and forty turns per visitor, then the rule-based router answers from the same records |
| Ships and Ports: AIS positions, five harbours to nearby Qloo places | Live | Vessel coverage and destinations vary |
| Speech playback (Female / Male menu, five languages) | Live | Ten Deepgram Aura-2 voices (Andromeda, Arcas, Selena, Aquila, Agathe, Hector, Melia, Elio, Elara, Julius) behind a 300,000-character daily cap; past the cap the device voice speaks and the menu says so. Verified October 11 evening (EN/ES) and October 14 (FR/IT/DE) |
| Dictation (browser speech recognition) | Live | Device-dependent; real-phone check pending |
| Opportunity map: where a taste is strong and businesses are few (six industries) | Live | Saved build: Qloo heatmap affinity against Census County Business Patterns 2023 per 10,000 residents, four groups split at the island median; Census counts below 3 are unpublished and shown as 0–2 |
| Model agent with 16 read-only tools and map actions | Live | Measured October 11 on twelve real questions: 3.3 s a turn, about a quarter of a cent each. October 14 dry run: 15 stranger questions, EN and ES, 14 answered by the model with real places; the one fallback was fixed the same day (a fifth, tool-free closing round) |
| Evidence drawer under every answer | Live | Tool calls with arguments, source, count and time; resolved Qloo IDs; model and timestamp. Fallbacks read "rules router · no model turn", "model did not finish" with the calls it made, or "saved replay". Business research and opportunity-map answers, which never use the model, read "no model turn" and list the Qloo catalog, Overture, Census PRCS and opportunity-map sources they were read from |
| /compare: with and without Qloo | Live | Six frozen questions asked twice of the same model, the second time with every Qloo tool removed; committed runs, both answers and a verdict per pair |
| Instant samples (three saved model runs) | Live | Served only when the model fell back; map actions intact; labeled replay with the read time |
| Deepgram live voice agent (full-duplex conversation) | Live, capped, stays on through judging | 240 minutes and one dollar of model spend a day, ten minutes a session; past the caps the orb uses browser listening plus the same model agent and Aura-2 playback |
| MCP connector (Claude, ChatGPT, Codex) | Built; off on the public demo | Runs locally with your own Qloo key; the hosted version waits for Qloo's written OK |
| iPhone app | Not built | A TestFlight request form exists; no binary |

## Challenges

Qloo's location names can refer to a barrio rather than its municipality. Boundary and
source checks avoid labeling island results as town-local. Affinities don't establish a
visit, current opening hours or future revenue. The interface makes those limits explicit.

Older asynchronous responses must not replace a newer artist choice. Cancellation and
response ownership prevent that, with regression tests. Speech has additional playback
and session lifecycle checks; the hosted audio path was verified in all five languages on
October 11 and 14.

## What we're proud of / what we learned

You can follow a music connection to a place, open its record and see the surrounding
buildings. You can also check how much the sources know. The October 7 snapshot has
7,717 Qloo places across 78 towns; it measures Qloo's coverage. Source notes and Census
margins of error help people decide how much to take from an answer.

## Next

Real-phone usability checks and the planned hosted MCP connector. A TestFlight request
form exists; no iPhone binary has been released.

## Work during the hackathon

Research, decisions and the first spec were committed October 2–5, after the September 30
start. The locality map, Qloo catalog/record integrations, agent tools, artist journey,
source-labeled town profiles, business research, coastal discovery and the public
deployment were built October 6–8. The MCP connector, the opportunity map, the spoken
script and the natural-voice menu followed October 10–11. The decision journey as first
screen, the evidence drawer, the /compare control, French, Italian and German voices, the
instant samples, a phone pass and the judge dry run followed October 13–14. Git history and the handoff
provide the implementation record. Carlos should confirm the scope and his original
contribution before submitting.

## Evidence and release status

- 415 automated tests pass in the working checkout (October 21); a fresh clone of this
  repository passes 411 and skips four (the Census cache, and three tests that read saved
  Qloo results, which Qloo's guide keeps out of public repositories). The offline Oracle
  validator passed; `pnpm audit --prod` reports no known vulnerabilities (October 10). The Docker
  image builds and real Qloo journey/harness checks pass.
- Chrome verified real artist matches, a card, OSM geometry, Bayamón café research with
  income and nearby peers, the Ponce town profile and a Spanish answer on the live site
  (October 9, logged out). On October 11 the same check covered the opportunity map by
  URL and by typed question, a town readout and the voice menu, with zero console errors.
  Controls were checked at 390/320 px; these desktop emulations do not replace a real
  iPhone test.
- The separate free Oracle VM serves https://zemi.r21digital.com with HTTPS. The model
  agent and Deepgram voices run under daily caps (October 11). Key validity through the end
  of judging is a launch item.
- The TestFlight request form delivers to a private sheet. Public MCP and a TestFlight
  binary are not claimed. Update this status before submission.

Official requirements: [Qloo rules](https://qloo.devpost.com/rules). The app and public
repository must be available for judging. Submission materials should be in English.
Use the [walkthrough](JUDGE-WALKTHROUGH.md), [video script](VIDEO-SCRIPT.md) and
[checklist](SUBMISSION-CHECKLIST.md). Inspect the actual Devpost form before finalizing.
