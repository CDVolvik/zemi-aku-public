# Judge walkthrough

Live at https://zemi.r21digital.com. No visitor account, payment or installation is
needed. Keep the demo available through November 16, 2026, the end of judging. Dry run
completed October 9 in a logged-out Chromium: every step below returned real records and
the console stayed clean. Steps 5 and 7 were added and verified the same way on October 11
after the `voices-20261011` release.

0. **The default path (since October 13 night).** Open /app. The first screen asks "Where should I
   open a business in Puerto Rico?" with six industry chips; tap Bakeries and the island colors
   (step 5 below has the legend details). Tap a town in the "Strongest taste with few businesses"
   list: the readout shows Qloo, Overture and Census side by side, then a "Change the question" row
   with the six industries (the current one pressed) and "Compare towns on the map". Tap Restaurants:
   the same town re-answers from the restaurant build (taste rank, Census count, Overture supply and
   the spoken caption all change). Tap "Compare towns on the map" to return to the colored island.
   "Nearby competitors" in the Research details row lists peers within 3 km. Ships and Ports now sit
   in the map menu (the layers button, top right) under "Explore". The artist chips follow under
   "Or start with an artist"; the tours stay under them.
1. Choose Bad Bunny under "Or start with an artist", or /app?artist=Bad%20Bunny. Wait for actual
   Qloo matches and pins. The note identifies affinities, not visits or performances by the artist.
2. Open a returned place and inspect the Qloo record and source labels. Puerta de la Bandera
   has nearby building geometry. Don't invent a result if records change.
3. Choose See in 3D. Inspect the building geometry, then Back to taste matches. The same
   list returns without a new artist request.
4. Type “Should I open a cafe in Bayamon?”. The panel shows Qloo's recorded cafés, Overture's
   observed supply with its release, and the Census PRCS income with period and margin.
   Open Coffee from 2 and type “Competitors near this place”: listed peers within 3 km,
   sorted by straight-line distance, with the reference place excluded. Under any typed
   answer, open the folded “Evidence” line: each tool the model called with its arguments,
   source, count and time, the resolved Qloo IDs, the model and when it answered. When the
   daily budget or your turn allowance is spent it reads “rules router · no model turn”, or
   “saved replay” for the three questions kept as instant samples (the Bad Bunny, Maricao
   and mofongo questions), with the time their data was read.
   Open /compare for the control: six questions asked twice of the same model, once
   without the Qloo tools, with what Qloo changed under each pair.
5. Reload /app and type “Where should I open a cafe?” with no town, or open
   /app?opportunity=bakery. The island colors by industry into four groups (gap,
   competitive, quiet, crowded) plus “not enough data”, with the legend and source notes
   on screen. Switch industries with the buttons (cafés, bakeries, restaurants, bars,
   hotels, salons). Tap a town on the map or in the “Strongest taste with few businesses”
   list: the readout shows Qloo's taste rank, the Census County Business Patterns 2023
   count and employees, and businesses per 10,000 residents beside the island figure.
   Census does not publish counts below 3, so some towns read “up to … per 10,000”. On
   October 11, bakeries put Río Grande at taste #2 with 3 establishments. Back to the
   island closes the panel.
6. Reload /app and type “Ponce”. The town profile shows Wikidata population, Overture
   ground count, Qloo's catalog count, landmarks and What Ponce loves with island
   stand-outs. A bare town name typed right after business research continues that
   research instead; reload first.
7. Open the voice button next to the ask bar (it reads “EN · ” plus the current voice).
   The menu offers Language (English, Español, Français, Italiano, Deutsch) and Voice
   (Female / Male). Answers are read aloud in all five menu languages (English, Spanish,
   French, Italian, German), two Deepgram voices each. With the Deepgram key on the server the note reads
   “Voices by Deepgram” and ten Aura-2 voices speak; without it the note reads “Your
   device's voice for now.” and the browser voice speaks. Spoken lines are short captions
   of the on-screen answer, never a different claim.
8. Inspect source notes and real empty results when encountered. Other starters:
   /app?artist=Vico%20C and /app?artist=Obie%20Berm%C3%BAdez. Spanish works for the same
   flows (“¿Debo abrir una panadería en Ponce?”, “¿Dónde abro una panadería?”).

Artist discovery, business research and the opportunity map need Qloo, but no LLM credits
(the map is a saved build refreshed by an operator script). Any other typed or spoken
question goes to the model agent (since October 11): it calls the read-only tools, answers
in plain sentences and moves the map; a "Checking Qloo's records…" line appears if it takes
more than a moment. Past one dollar a day or forty turns from one visitor, the rule-based
router answers instead and the answer carries no map actions. Try "What should I visit in
Old San Juan?" or "¿Qué hay para hacer en Rincón con niños?". OSM 3D requires the
restricted Cesium token. Device voices are free and vary by device;
Deepgram voices depend on a server key and a daily character cap. Microphone access is
optional and is not part of this walkthrough until the complete hosted speech path has
been verified.

## Operator checks

```sh
node scripts/check-demo.mjs https://zemi.r21digital.com --journeys
```

This probes pages, real artist matches, invalid inputs and private-path denial. It does
not verify browser rendering, speech or every proxy header. Complete those separately:
[deployment](DEPLOYMENT.md), [voice checks](VOICE-AGENT.md).
