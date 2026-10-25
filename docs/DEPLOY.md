# Run Zemi-Aku

Canonical hosting state and launch checks: [DEPLOYMENT.md](DEPLOYMENT.md).
Oracle is approved as an isolated Always Free demo exception. Carlos handles DNS.
The paid Lightsail plan is retired; do not create paid hosting resources.

## Local

Use Node 22.19+ and pnpm 10.14.0:

```sh
npm install --global pnpm@10.14.0
pnpm install --frozen-lockfile --ignore-scripts
cp .env.example .env
# Fill project keys privately, then:
pnpm eagle
```

Or populate .env and run `docker compose up --build`, then open http://localhost:8080/app.
The image uses the pnpm lock and security overrides. Use pnpm for installs: the Qloo
harness's npm shrinkwrap bypasses the needed npm root overrides.

A clean checkout builds with empty optional ground-data directories. Qloo catalogs populate
at runtime; source caches are not bundled in Git. To include ground data, install Python
DuckDB and run `python scripts/overture.py`, `node scripts/wikidata.mjs` and
`node scripts/census.mjs` (Census needs its free key). Generate before starting the process;
restart after adding previously missing cache files. Rebuilding all Qloo catalogs can
consume about 600 API calls; reuse the existing private cache for the demo.

Run `pnpm test`, `pnpm audit --prod` and `node scripts/check-demo.mjs URL` before release.
Add `--journeys` for three real Qloo artist checks; no paid model or microphone is invoked.

Optional: set `TESTFLIGHT_PUBLIC_URL` to an App Store Connect public link
(`https://testflight.apple.com/join/...`). When valid, `GET /api/config` returns it as
`betaUrl` and the front page `#iphone` section shows "Get the beta on TestFlight" instead of
the email request form. Public links usually cap around 10 testers; leave unset to keep the
form (and `TESTER_WEBHOOK_*` delivery) as the fallback.

## Natural voices (2026-10-11)

The public overlay `deploy/compose.safe.yaml` no longer blanks `DEEPGRAM_API_KEY` and caps speech at
`ZEMI_SPEAK_CHARS_PER_DAY: "40000"` (about $1.20 a day at most). The key itself lives only in the
VM's `/opt/zemi-aku/.env` (mode 600). **Added October 11, 2026 (evening) by the agent on Carlos's
explicit instruction** ("get it done"); backup `/opt/zemi-aku/.env.before-deepgram-20261011`.

```sh
# on the VM, as ubuntu: open the file in an editor (keeps the key out of shell history) and add
# one line, DEEPGRAM_API_KEY=..., on its own line at the end; the file stays mode 600.
nano /opt/zemi-aku/.env
# The live project is zemi-aku-demo on the deploy files. Never use the root compose.yaml (dev file).
cd /opt/zemi-aku && sudo docker compose -p zemi-aku-demo -f deploy/compose.yaml -f deploy/compose.safe.yaml -f compose.image.yaml --env-file /opt/zemi-aku/.env up -d --no-build --no-deps app
curl -s https://zemi.r21digital.com/api/voices   # "speechEnabled":true and four voices
```

Without the key `/api/voices` reports `speechEnabled:false`, the menu still shows Female / Male and
the page plays the device voice. Listening, the voice agent and the model stay off (caps `"0"`).

## Model agent (2026-10-11, evening)

`deploy/compose.safe.yaml` no longer blanks `OPENROUTER_API_KEY` and sets `ZEMI_CHAT_USD_PER_DAY: "1"`.
The key lives only in the VM's `/opt/zemi-aku/.env` (placed October 11 on Carlos's instruction; backup
`.env.before-agent-20261011`; replaced October 12 with a key valid to January 10 2027, backup
`.env.before-agentkey-20261012`). The server pins `deepseek/deepseek-v4.1-flash`; `ZEMI_MODEL` in the env
overrides it. One visitor gets forty model turns a day (`CHAT_TURNS_PER_VISITOR` in
`scripts/serve-eagle.mjs`); the daily dollar ledger is `cache/agent/spend.json` on the mounted volume.
Fallback reasons are counted in the app log: `sudo docker logs zemi-aku-demo-app-1 2>&1 | grep "agent fallback" | sort | uniq -c`.
Release pattern: a layered image (`FROM` the previous tag, `COPY app data server scripts/…`), built on the
VM from an archive of the committed tree, then an app-only recreate on the `zemi-aku-demo` project.
Rollback set: `/opt/zemi-aku/agent-rollback-20261011` (README has the restore command).

Lessons from the October 11 placement: a Windows PowerShell pipe prefixes its first line with a
UTF-8 byte-order mark, which Compose rejects ("unexpected character ﻿") and, worse, echoes the
whole line including the value into its error output. Send the line through a script that strips
`\r` and the BOM (`sed -i 's/^\xEF\xBB\xBF//'`), or type it in an editor on the VM. Quoted strings
inside an `ssh` command line lose their quotes under PowerShell; put remote steps in a script file.

## Wow release (2026-10-12)

Carlos asked for a fluent voice conversation, a landing view that is not "a blue island", and places
that tell restaurants from hotels from shops, and said to spend the Deepgram credit on it. Live as
`zemi-aku:wow-20261012` (layered `FROM zemi-aku:agent-20261011`, built on the VM from a `git archive`
of `e3118fc`: `app data server scripts/serve-eagle.mjs scripts/qloo.mjs deploy`). Rollback set
`/opt/zemi-aku/wow-rollback-20261012` (README has the restore command; previous overlay and image file kept there).

`deploy/compose.safe.yaml` now funds the paid voice paths, all with daily caps that persist on the volume:
`ZEMI_VOICE_MINUTES_PER_DAY: "240"` (Deepgram Voice Agent, about $0.08 a minute; ten minutes a session,
`maxSeconds: 600` in `scripts/serve-eagle.mjs`, so 24 conversations a day), `ZEMI_LISTEN_MINUTES_PER_DAY: "360"`,
`ZEMI_SPEAK_CHARS_PER_DAY: "300000"`, `ZEMI_CHAT_USD_PER_DAY: "2"` with `ZEMI_VOICE_CHAT_USD_PER_DAY: "1"`
as the voice model's share. The agent needs `ZEMI_PUBLIC_URL` (set from `ZEMI_HOST` in `deploy/compose.yaml`);
`/api/voice/status` reports `{"enabled":true}` when the caps and both keys allow a session.

Checks after the recreate: `/app` 200, `/app/marks.js` 200, `/api/voice/status` enabled, `/api/voices` four
voices, `/api/places?town=Ponce` rows carry `category`, and the caps read back inside the container. A
same-origin WebSocket probe (the server rejects upgrades without the page's Origin) got `SettingsApplied`,
the greeting as `ConversationText`, and 338 KB of Aura-2 audio within four seconds.

## Weather release (2026-10-12, evening)

Live as `zemi-aku:weather-20261012` (layered `FROM zemi-aku:wow-20261012`, same archive recipe, source `826f5a2`).
Rollback set `/opt/zemi-aku/weather-rollback-20261012`. No new keys and no new caps: the National Weather Service,
the National Hurricane Center and RainViewer are free, fetched server-side with a Zemi User-Agent and cached in memory
(`server/weather.mjs`). New routes `/api/weather?town=`, `/api/weather/radar`, `/api/weather/storms` (30 a minute per IP).
The agent tool `town_weather` only registers when the server has a weather client. Checks after the recreate: `/app` 200,
`/app/weather.js` 200, the three routes answer, `/api/voice/status` still enabled, and one EN and one ES model answer
used the forecast to pick covered Qloo places. Note for shells: a town name with an accent typed through Git Bash curl
arrives mangled and the route answers 400; the browser sends proper UTF-8.

## Missions release (2026-10-12, night)

Live as `zemi-aku:missions-20261012` (layered `FROM zemi-aku:weather-20261012`, same archive recipe; built twice the same
night, first from `f9a5837`, then rebuilt under the same tag from `3204adc` after a live check). Rollback set
`/opt/zemi-aku/missions-rollback-20261012` (previous image `weather-20261012`). No new keys, no new caps, overlay unchanged.
New file `app/missions.js`; `/app?embed=1` (front page figure 1, chrome hidden, one play button) and `/app?mission=<id>`
(shareable). Checks after the recreate: `/` and `/app?embed=1` 200, `/app/missions.js` 200, `/api/voice/status` still
enabled, container file hashes equal the commit's. Logged-out Chromium: the Bad Bunny tour flew to Vega Alta, opened
Club Cumpliendo Metas, spoke the place line, ended on the "ask me anything" line and released the page.

## Picks release (2026-10-12, late night)

Live as `zemi-aku:picks-20261012` (layered `FROM zemi-aku:missions-20261012`, same archive recipe; built three times the
same night under one tag, last from `1e85839`). Rollback set `/opt/zemi-aku/picks-rollback-20261012` (previous image
`missions-20261012`). No new keys, no new caps, overlay unchanged. Step 3 of the "be more wow" plan: the places an answer
names become three photo cards above the list (`ZemiMarks.picks`, `pickCards` in `app/marks.js`), those pins carry their
name on the map on three sides, and the answer shows once, in the caption. Two things the live checks caught: several
`show_places` actions in one answer now merge into one list (the named place was being dropped), and a town's late
loaders (stats, profile, directory, weather line) no longer draw over an answer panel (`townView` flag). Checks after
the recreate: `/app` 200, `/app/marks.js` 200, `/api/voice/status` enabled, container hashes equal the commit's;
logged-out Chromium, "Where do Bad Bunny fans eat in Ponce?": Melao Coffee Shop, Plaza Las Delicias and Teatro La Perla
as picks and as labeled pins, town blocks hidden, one caption.

## Alike release (2026-10-12, after midnight)

Live as `zemi-aku:alike-20261012` (layered `FROM zemi-aku:picks-20261012`, same archive recipe, from `6afaea0`; the
remote steps ran from a script, `deploy-alike.sh`, left in `/opt/zemi-aku`). Rollback set
`/opt/zemi-aku/alike-rollback-20261012` (previous image `picks-20261012`). No new keys, no new caps; one new route,
`/api/places/like` (20 a minute), which is Qloo-only plus three OpenStreetMap lookups. Three things shipped:

- Brand logos. A chain without a photo of its own shows its brand logo: OpenStreetMap's `brand:wikidata` names the
  brand, the brand's Wikidata record carries the logo (P154 on Commons), and it sits whole on a plain tile in the picks,
  the list and the dossier, credited "Brand logo · Wikimedia Commons". A real photo still wins; the aerial is last.
  Only enriched lists get it (`/api/places` without `fast=1`, and the first three of a "more like these" answer);
  catalog and artist answers are not enriched, so their chains keep the aerial. Seen live: Hilton Ponce, Romano's
  Macaroni Grill. Google Business Profile banners were ruled out (key, 403s, terms).
- "More like these" under the picks: the picked Qloo ids go to `/v2/insights` together as `signal.interests.entities`,
  the seeds drop out, the first three get photos, and the spoken line names seeds and picks in the page language.
  The button stops a running tour so the answer stays on screen (a live check caught the tour drawing over it).
- Fig. 8 redrawn: every source the server joins (Overture, Census PRCS and CBP, NWS, NHC, RainViewer, Esri, with
  OpenStreetMap, Wikidata, Wikipedia, Commons) and the loop drawn honestly. Qloo's hackathon API is read-only, so
  nothing is sent back to Qloo; open data shapes the signals we send, Qloo's ids and tags drive what we look up.

Checks after the recreate: `/`, `/app`, `/app/marks.js`, `/api/voice/status` 200; container hashes of the six changed
files equal the commit's; `/api/places/like` live in Spanish for two Ponce places ("Qloo conecta estos con … y …: …");
the new Fig. 8 markup is in the served front page. Logged-out Chromium on the live tour reached the picks with the
"More like these" button showing; the click itself was verified locally on the same commit (the preview tooling
dropped its connection on the live run), so a human should tap it once on the live site.

## Polish release (2026-10-13, early morning)

Live as `zemi-aku:polish-20261013` (layered `FROM zemi-aku:alike-20261012`, same archive recipe, from `8a3a68e`; remote
steps in `deploy-polish.sh`, left in `/opt/zemi-aku`). Rollback set `/opt/zemi-aku/polish-rollback-20261013` (previous
image `alike-20261012`). No new keys, no new caps, no new routes; one new outbound dependency for the app page, Google
Fonts (the front page already used it). Step 4 of the "be more wow" plan:

- One type system. The app loads the front page's Newsreader and IBM Plex Mono: serif for the headline, the town title,
  the spoken answer (`.say`) and the caption; mono for the small labels, kickers, the "watch a tour" label and the weather
  line. Buttons and lists stay in the system sans. The paper theme now uses the front page's paper, wash and teal link.
- The camera drifts at rest on the island view, not only over a town: `swayFor(eye)` in `app/flight.js` gives about 3°
  over fifty seconds up high and keeps the 7° over thirty seconds over a town; `flyHome` no longer passes `noOrbit`.
  Same halt on any touch, wheel or key; same motion switch; reduced motion still means no drift.
- The town profile's three taste rows fold: `profileRow` renders each as a `details` section with its count, the first
  ("The feel of its places") open, Music and On TV closed. Ponce went from a 22-chip wall to three headings.

Checks after the recreate: `/`, `/app`, `/app/flight.js`, `/api/voice/status` 200; container hashes of the five
copied files equal the commit's; the served page carries the font link, `profileRow` and `swayFor`. Logged-out Chromium
on the live site: Ponce shows "The feel of its places 8" open, "Music 8" and "On TV 6" closed, both faces report
loaded, and with motion on the camera heading changed over 2.5 seconds at the island view.

## First-screen release (2026-10-13, early morning)

Live as `zemi-aku:firstscreen-20261013` (layered `FROM zemi-aku:polish-20261013`, same archive recipe, from `a1d6323`; remote
steps in `deploy-firstscreen-20261013.sh`, left in `/opt/zemi-aku`). Rollback set `/opt/zemi-aku/firstscreen-20261013-rollback`
(previous image `polish-20261013`, previous `Caddyfile`; README has both restore commands). No new keys, no new caps, no new
routes; one new static file, `app/lang.js`. Three first-impression failures found by the October 13 full test:

- The edge sent `X-Frame-Options: DENY` for every URL, so the front page's Fig. 1 (the live map in an iframe, since the
  missions release) drew as a dead box in every browser. `deploy/Caddyfile` now sends `SAMEORIGIN` and
  `Content-Security-Policy: frame-ancestors 'self'`. The caddy container was recreated (`up -d --no-deps --force-recreate caddy`,
  a few seconds of downtime; certificates live on the `caddy_data` volume) because a bind-mounted file does not follow a
  replaced inode until the container restarts. `admin off` in the Caddyfile means `caddy reload` is not available.
- A Spanish question typed with the voice on English got an English answer. `app/lang.js` (`ZemiLang.guessLang`) tells
  English from Spanish by marks, accents and common words; `runQuestion` switches the voice to the guessed language before
  asking, so the answer, the voice and the menu follow the question. A bare name ("Ponce", "mofongo") decides nothing.
- A typed answer hid itself after 4 s + 45 ms a character (the panel copy stays hidden by design), so nobody could read it
  twice. It now stays until the next question, a reset, or its new × button. With the panel open on a desktop
  (≥ 1024 px) the ask bar and caption centre on the free map area beside the panel, clear of the camera-motion pill.

Checks after the recreate: `/`, `/app`, `/app?embed=1`, `/app/lang.js`, `/api/voice/status` 200; `check-demo` 13/13;
container hashes of `app/index.html`, `app/lang.js`, `app/home.html` and the host `deploy/Caddyfile` equal the commit's;
the live headers read `X-Frame-Options: SAMEORIGIN` + `frame-ancestors 'self'`. Logged-out Chromium on the live site: the
front page's iframe reports the globe canvas and the "Play with sound" button inside it; on `/app`,
"¿Dónde comer mofongo en Mayagüez?" switched the button to "ES · Selena" and answered in Spanish, and the caption with its
× was still on screen 40 s later with the ask bar at x 492–1108 beside the panel (100–460) at 1280 px.

## Design-pass release (2026-10-13, morning)

Live as `zemi-aku:design-20261013` (layered `FROM zemi-aku:firstscreen-20261013`, same archive recipe, from `b0c81a3`; remote
steps in `deploy-design-20261013.sh`, left in `/opt/zemi-aku`). Rollback set `/opt/zemi-aku/design-20261013-rollback`
(previous image `firstscreen-20261013`). No new keys, caps, routes or files. Carlos asked for a design/animation pass
("a lot of minor imperfections"); the motion code was read against the review-animations standards (findings in
`NEXT-SESSION.md`) and the visual notes from the October 13 full test were worked:

- Picks: `ZemiMarks.picks` folds accents, case, "&" and punctuation and lets a long name match on its first two words
  (three after an article), so "Campioni Pizza Birra and Tapas" in an answer finds "Campioni Pizza Birra & Tapas".
- A question's list folds the town directory to one line ("Browse all 216 places in Mayagüez ›"); a tap opens it; a town
  opened from the map keeps it open. The flag is set before `resetCategory()`, which already draws the directory.
- List titles take a capital ("Food in Mayagüez"); the typed agent is told to end with the answer rather than an offer or
  a yes/no question (the voice agent keeps its own prompt); a phone shows two "Try one" chips; crumb and search-hit
  hovers are gated to fine pointers; back on the island the hero and chips fade in over 220 ms.

Checks after the recreate: `/app`, `/app/marks.js`, `/api/voice/status` 200; `check-demo` 13/13; container hashes of
`app/index.html`, `app/marks.js`, `server/agent.mjs` equal the commit's; served `marks.js` hash equals origin's. Logged-out
Chromium on the live site at 1280 px: "¿Dónde comer mofongo en Mayagüez?" → title "Food in Mayagüez", directory folded to
"Browse all 216 places in Mayagüez ›", Spanish answer. Locally on the same commit: the Ponce Bad Bunny answer showed
Campioni as a pick from the shortened name, the unfold tap listed 11 categories, the island return raised no error, and
the iPhone 12 Pro viewport showed two chips.


## Definitions release (2026-10-13, night)

Live as `zemi-aku:definitions-20261013` (layered `FROM zemi-aku:design-20261013`, same archive recipe, from `8c98c50`; remote
steps in `deploy-definitions-20261013.sh`, left in `/opt/zemi-aku`). Rollback set `/opt/zemi-aku/definitions-20261013-rollback`
(previous image `design-20261013`). No new keys, caps, routes or files. Item 7 of `FIRST-PLACE-PLAN-2026-10-13.md`, the first
item Carlos approved for build (plan approved as written, October 13 night):

- A folded "Definitions" block under the opportunity map's legend and inside a town's "Sources and limits"
  (`ZemiOpportunity.definitionsHtml`, built client-side from the saved build's `sources`, so no rebuild and no new call):
  the industry as its Census NAICS code with the official title in plain words plus the Qloo tag; County Business Patterns as
  a March count from tax records with no margin of error that leaves out the self-employed; the Community Survey as a
  five-year estimate whose margin the per-10,000 figure does not show; the 0–2 suppression; municipio boundary versus the
  3 km straight-line peer circle; and "a screening, not demand". EN and ES.
- `server/business.mjs` adds the saved build's `sources` to the town's opportunity evidence so the readout can name the codes.

Checks after the recreate: container healthy; container hashes of `app/index.html`, `app/opportunity.js`, `app/opportunity.css`,
`server/business.mjs`, `scripts/serve-eagle.mjs` equal the commit's; served `opportunity.js` hash equals the commit's;
`check-demo --journeys` 19/19. Logged-out Chromium on the live site: `/app?opportunity=restaurant` shows the block with both
restaurant codes; tapping Maunabo opens the readout with the same six definitions under "Sources and limits". Locally on the
same commit at 390 px the block fits with no horizontal overflow (12 px body).

## Decision release (2026-10-13, late night)

Live as `zemi-aku:decision-20261013` (layered `FROM zemi-aku:definitions-20261013`, same archive recipe, from `f9b4760`; remote
steps in `deploy-decision-20261013.sh`, left in `/opt/zemi-aku`). Rollback set `/opt/zemi-aku/decision-20261013-rollback`
(previous image `definitions-20261013`). No new keys, caps, routes or files; markup, CSS and two client helpers. Item 1 of
`FIRST-PLACE-PLAN-2026-10-13.md`; spec `SPEC-2026-10-13-hero-decision-journey.md`:

- The island hero asks "Where should I open a business in Puerto Rico?" with six industry chips that open the opportunity
  map; the artists sit under "Or start with an artist", the tours under them; the copy follows the voice language
  (`renderHero`, re-run on the question's guessed language, a tour's language and the voice menu's pick).
- Ships and Ports moved from the left rail into the map menu under "Explore" (the pick closes the menu). The detail, coastal
  and opportunity panels now sit at the 16 px edge; the ask bar's free-map centring constants moved by the same 84 px.
- A town readout reached through the decision shows "Change the question": the six industries (current one pressed; a tap
  re-asks the same town through `ZemiOpportunity.townQuestion`) and "Compare towns on the map" (`goHome()` then
  `opportunityUI.show(industry)`); the older four-type row hides while that row shows. "Try one" leads with the two decision chips.

Checks after the recreate: container healthy; container hashes of `app/index.html`, `app/opportunity.js`, `app/opportunity.css`,
`app/coastal.css`, `server/business.mjs` equal the commit's; served `index.html` and `coastal.css` hashes equal the commit's;
`check-demo --journeys` 19/19. Logged-out Chromium on the live site at 1280 px, zero console entries: hero → Bakeries → Río Grande
(taste #2, Bakeries pressed, four-type row hidden) → Restaurants re-ask (taste #9) → "Compare towns on the map" opens
"Where should I open a restaurant?" with Restaurants pressed → Back to the island → map menu "Explore" → Ships opens the coastal
panel and the menu closes → Places restores the hero. Locally on the same commit: 390 px shows the headline, six chips in two
rows, the artists, the tours and two "Try one" chips with no overlap (hero bottom 518, chips at 721); the voice menu's
Español pick turns the hero Spanish ("¿Dónde abro un negocio en Puerto Rico?", "O empiece por un artista", Spanish chips).

## Evidence release (2026-10-14, morning)

Live as `zemi-aku:evidence-20261014` (layered `FROM zemi-aku:decision-20261013`, same archive recipe, from `948dac9`; remote
steps in `deploy-evidence-20261014.sh`, left in `/opt/zemi-aku`). Rollback set `/opt/zemi-aku/evidence-20261014-rollback`
(previous image `decision-20261013`). No new keys, caps or routes; one new client file (`app/evidence.js`). Item 2 of
`FIRST-PLACE-PLAN-2026-10-13.md`; spec `SPEC-2026-10-14-evidence-drawer.md`:

- `/api/chat` model answers carry `evidence`: mode, model id, rounds, elapsed, answered-at, and one row per tool call
  (validated arguments, ok, source, count, resolved Qloo IDs, catalog day, size drop or refusal). Fallbacks carry
  `{ mode: "rules", reason }` with the fixed code `onFallback` already logged; the visitor cap sets `visitor-cap`.
- `opportunity_map` adds the heatmap's `retrievedAt`.
- The caption appends a folded "Evidence · live model · N tool calls · N s" drawer (EN/ES; "rules router · no model turn
  (reason)" for fallbacks; `replay` mode reserved for item 10). IDs shortened, capped at eight, tool output escaped.

Checks after the recreate: container healthy; container hashes of `app/index.html`, `app/evidence.js`, `server/agent.mjs`,
`server/agent-tools.mjs`, `scripts/serve-eagle.mjs` equal the commit's; served `evidence.js` hash equals the commit's;
`check-demo --journeys` 0 failed. Logged-out incognito Chromium on the live site: "Where do Bad Bunny fans eat in Bayamón?"
→ drawer reads `artist_places Bayamón, Bad Bunny → Qloo · 8 places · 0.7 s`, `map_town Bayamón → done`, the model line and
eight shortened Qloo IDs. Locally on the same commit: "cafés in Ponce" at 1280 px (four calls incl. a 0-place strict taste
search shown honestly), "¿Dónde comer mofongo en Ponce?" at 390 px in Spanish ("Evidencia · modelo en vivo · 3 llamadas ·
4,3 s"), the drawer scrolling inside the caption's 38vh cap. Voice-agent (Deepgram) turns are not covered: noted in the spec.

## Compare release (2026-10-14, late morning)

Live as `zemi-aku:compare-20261014` (layered `FROM zemi-aku:evidence-20261014`, same recipe, from `acdea2c`; remote steps in
`deploy-compare-20261014.sh`). Rollback set `/opt/zemi-aku/compare-20261014-rollback` (previous image `evidence-20261014`).
Item 3 of `FIRST-PLACE-PLAN-2026-10-13.md`; spec `SPEC-2026-10-14-with-and-without-qloo.md`:

- `/compare` → `app/compare.html`: six frozen prompts asked twice of the same model and settings, once with the Qloo tools and
  once with only `map_town`, `town_weather`, `landmarks`, `town_history` (`withoutQloo` in `agent-tools.mjs`). The runs are
  committed in `data/compare-qloo.json` (made by `scripts/compare-qloo.mjs` against a local server under `ZEMI_COMPARE=1`,
  12 model turns, all first attempt) with both answers, their evidence and `server/compare.mjs`'s diff. Result: Qloo changed
  all six answers (named catalog places only the Qloo run gave); the without run says it will not invent places and labels
  general knowledge. Linked from the front page nav and `#qloo` section and the README. `check-demo` probes `/compare` and the JSON.
- The public `/api/chat` ignored `tools: "no-qloo"` until October 23; see the Verdict release below, which made the control
  run public under the same caps ("Ask again without Qloo").

Checks: container healthy; six file hashes equal the commit's; `check-demo --journeys` 0 failed (now 7 + 2 routes). Locally at
1280 px the page renders the six pairs with the catalog places bold and the verdict line; at 390 px one column, no overflow.

## Rounds fix (2026-10-14, late morning)

Live as `zemi-aku:rounds-20261014` (layered `FROM zemi-aku:compare-20261014`, from `e3520c9`; `deploy-rounds-20261014.sh`).
Rollback set `/opt/zemi-aku/rounds-20261014-rollback` (previous image `compare-20261014`). Found by the new drawer: "What is
there to do in Maricao?" made the model ask for six tools in one round and the text agent dropped the turn (`too-many-calls`),
twice in a row on the live site, so a judge would have read "rules router · no model turn". Now a round runs the first four
calls and returns "Too many tool calls in one round; ask for this one next." for the rest (twelve and up still fail); the
drawer records the refused calls. Verified live twice after the recreate: model answers with `town_history!`/`map_town!`
marked refused. The voice agent keeps its own four-call close (`voice-agent.mjs`), unchanged. 337 tests.

## Five voices release (2026-10-14, midday)

Live as `zemi-aku:voices5-20261014` (layered `FROM zemi-aku:rounds-20261014`, from `9115820`; `deploy-voices5-20261014.sh`).
Rollback set `/opt/zemi-aku/voices5-20261014-rollback` (previous image `rounds-20261014`). Item 6 of
`FIRST-PLACE-PLAN-2026-10-13.md`; spec `SPEC-2026-10-14-five-spoken-languages.md`. No new key, cap or route: the same Deepgram
key and the same 40,000-character daily cap now serve ten Aura-2 voices (Agathe/Hector fr, Melia/Elio it, Elara/Julius de added
to the four). `app/converse.js` speaks every menu language and carries the menu copy in each; the rules router's one-line
fr/it/de note was reworded. Audition set for Carlos: `node scripts/voice-audition.mjs fr it de` → `tmp/voice-audition/index.html`
(16 candidates, 3,168 characters, all accepted by Deepgram on 10/14).

Checks: container healthy; six file hashes equal the commit's; `/api/voices` lists ten voices with speech on; `/api/speak` with
`aura-2-agathe-fr` returned audio with the voice header; a French `/api/chat` question answered by the model in French;
`check-demo --journeys` 0 failed. Locally: French, Italian and German model answers read in the asked language (spec has the
three); the voice menu in Français shows "Voix féminine / Voix masculine" and the Deepgram note with Agathe selected.

## Samples release (2026-10-14, afternoon)

Live as `zemi-aku:samples-20261014` (layered `FROM zemi-aku:voices5-20261014`, from `c10052c`; `deploy-samples-20261014.sh`).
Rollback set `/opt/zemi-aku/samples-20261014-rollback` (previous image `voices5-20261014`). Item 10 of
`FIRST-PLACE-PLAN-2026-10-13.md`; spec `SPEC-2026-10-14-instant-samples.md`. No new key, cap or route. Three saved model runs in
`data/samples/` (Bad Bunny in Bayamón, Maricao, mofongo in Ponce in Spanish; `scripts/save-samples.mjs`, three local model turns)
are served by `/api/chat` only after the model agent fell back and before the rules router, with the map actions intact and the
evidence drawer labeled "saved replay" with the read time on every call.

Checks: container healthy; five file hashes equal the commit's; the three JSON files present in the container; the Bad Bunny
question on the live site still answers from the model (`mode: model`, no replay: the live budget is untouched);
`check-demo --journeys` 0 failed. The replay path was exercised locally on the same commit with `ZEMI_CHAT_USD_PER_DAY=0`: the
saved question returned the replay, the page flew to Bayamón and listed "Bad Bunny fans in Bayamón", the drawer read
"Evidence · saved replay · 2 tool calls" with "read 2026-10-14 17:29 UTC"; "cafés in Ponce" still went to the rules router. 341 tests.

## Phone release (2026-10-14, late afternoon)

Live as `zemi-aku:phone-20261014` (layered `FROM zemi-aku:samples-20261014`, from `07f10d4`; `deploy-phone-20261014.sh`).
Rollback set `/opt/zemi-aku/phone-20261014-rollback` (previous image `samples-20261014`). The emulated half of item 9 of
`FIRST-PLACE-PLAN-2026-10-13.md` (the real iPhone and Android pass stays on 10/17). No new key, cap or route; three files:
`app/opportunity.css`, `app/index.html`, `app/home.html`. At 390 px the opportunity panel took three quarters of the screen,
ran under the dock bar, and hid the island it asks you to tap. Now: the panel uses the town readout's geometry (clears the
dock, 48% cap); opening the opportunity view on a phone flies to a frame measured at 390 px that puts all 78 towns in the
upper half (`flyOpportunityFrame`, eye 340 km aimed south-west of the island), closing it flies home, switching industry keeps
the frame. Home masthead: the five links wrap as a row under the brand, one line each.

Checks: container healthy; three file hashes equal the commit's; on the live site at 390x844 the panel spans y 355–761 above
the dock at 769, the island's west and east tips project to x 41 and 383 at y 175–291, no terrain toast (the local one is
the ion token's origin restriction, not a live condition), the five nav links are 12 px tall each; `check-demo --journeys`
0 failed. 341 tests.

## Round-eight release (2026-10-25, overnight)

Live as `zemi-aku:round8-20261025`, source `c78a6d1` (five commits on `128fa83`), layered on `round7-20261025` with
`app/`, `server/` and `scripts/serve-eagle.mjs` (`tmp/deploy-round8-20261025.sh`, local only). Rollback set
`/opt/zemi-aku/round8-20261025-rollback` (previous image `round7-20261025`). The three open items from the seventh
panel, then three Codex review rounds on them (round 1: 7 Med, 2 Low; round 2: 4 Med, 3 Low; round 3: 3 Med, 1 Low;
every finding fixed). No key, cap, cache, Caddy, env or connector change.

What changed on the site:

- **One scroll surface on a phone.** Answer cards stack inside the answer instead of a sideways strip. The details
  panel, the opportunity list and the answer take turns: opening one folds the answer to a bar named "Show the
  answer", and a tap or Enter brings it back. A person asking for the list brings it forward; a list an answer opens
  stays behind it. Above 720 px nothing stays folded. The camera buttons stay off an open answer.
- **Cards named by their own kind.** The chip says Bar, Fast food restaurant or Coffee shop (Spanish on a Spanish
  page), and a food list holding bars says Qloo lists them under restaurants.
- **A Spanish session reads Spanish.** Only a language-menu pick is saved, so a reload after an English question
  comes back in Spanish; a language switch redraws the open town, weather, legend, place card, sources,
  comparison, coast view and journey line. Map menu, voice notes, tours, contact values, the record table and the
  coast endpoint follow the page language; Qloo's own English text is labelled "en inglés"; usted throughout.
- **No unasked conditions.** A sentence disclaiming vegan, diet, parking, budget or accessibility data is dropped
  when the question did not name that kind (round seven's prompt made the model volunteer one).
- **At 721–1440 px** the ask bar centres right of the 400 px panel and both side panels end above the answer (the
  old 212 px centre dated from a side-rail layout; at 1024 px the bar overlapped the panel).
- Spanish ask-mode suggestions are phrasings the rules fallback also routes.

Checks: container healthy; ten changed-file SHA-256 hashes in the container equal the commit's; on the live site
`scripts/check-ui-states.mjs` (new, Playwright) 27 checks 0 failed, `check-demo --journeys` 0 failed, the Spanish
session sweep flags only names and attributed source text, the reload stays Spanish after an English question;
469 tests. Real phones, a microphone turn and a screen reader not tested.

## Round-seven release (2026-10-25, late night)

Live as `zemi-aku:round7-20261025`, source `89ca990` (four commits on `766b4b9`), layered on `round6-20261025` with
`app/`, `server/` and `scripts/serve-eagle.mjs` (`tmp/deploy-round7-20261025.sh`, local only). Rollback set
`/opt/zemi-aku/round7-20261025-rollback` (previous image `round6-20261025`). The seventh blind panel on the round-six
release (`JUDGE-PANEL-2026-10-25c.md`: GPT 18, Opus 15, Grok 15, mean 16.0) and a Codex review of the diff. No key,
cap, cache, Caddy, env or connector change.

What changed on the site:

- **A `place_audience` tool.** Who goes to a place, what customers, which ages: the model reads the same Qloo
  audience demographics the card shows under "Who likes it" and never says Qloo lacks them (Opus's High). Absent
  from the no-Qloo control.
- **A refused tool "was off for this run"**, never "returned nothing" (Opus); a condition the tools cannot test
  (vegan, kosher, parking, a budget, rent as the priority) is named in one sentence before the covered part (GPT).
- **Between 721 and 1023 px the panel ends above the dock**, so "Sources and the record behind this answer" can be
  clicked (GPT; Opus the round before at 953 px).
- **"Qloo's taste town by town"** on the first screen; the front page gives the 76-to-78 range (GPT: "all 78 towns"
  against "76 of 78 with taste data").
- **A money question leaves the siting template** so the model says the data carries no income first (Grok: the gap
  verdict repeated for "¿cuánto ganaría…?"). "Median household income" stays a research topic.
- The opportunity evidence line says "not enough data", never a raw "unknown" (Opus).

Checks: container healthy; five changed-file SHA-256 hashes in the container equal the commit's; live browser runs
(the Don Nico customer question calls find_places then place_audience and answers with age bands; the Spanish income
question answers "no hay dato de ganancias" first; the sources summary clicks at 960×895; the town-state and polish
paths); `check-demo --journeys` 0 failed; 459 tests. Codex review of the first three commits (`tmp/codex-review-round7-20261025.md`):
two Mediums (the answer caption still over the panel at 721–1023 px; a strict taste-tag miss read as "no bakeries in Ponce")
and two Lows (the meta descriptions' "all 78"; the 16-tool inventory), all fixed in the fourth commit. Real phones not tested. Public snapshot re-exported from `741cd5c` as `fc4c6b5` (the seventh panel record and its four evidence files added; scanned; the record and the README's counts read logged out).

## Round-six release (2026-10-25, night)

Live as `zemi-aku:round6-20261025`, source `4235303`, layered on `polish-20261025` with `app/`, `server/` and
`scripts/serve-eagle.mjs` (`tmp/deploy-round6-20261025.sh`, local only). Rollback set
`/opt/zemi-aku/round6-20261025-rollback` (previous image `polish-20261025`). Carlos: "can we check again the evaluation
and see again our score now with all this changes? and see what else we keep optimizing". The sixth blind panel on the
polish release (`JUDGE-PANEL-2026-10-25b.md`: GPT 16, Opus 14, Grok 15, mean 15.0) and three Codex rounds on this
diff. No key, cap, cache, Caddy, env or connector change.

What changed on the site:

- **No hours or phone numbers in the model's text**: the cards carry them. The hybrid verdict note gets no hours in
  its payload; a clock time, a phone number or a quotation mark drops the note and the drawer says why (Opus: 5:30 am
  in the text against 5:00 am on the card).
- **An unranked town stays unranked**; the tool's reading says how many Census codes are withheld ("0 to 4" for two)
  and a partly published count reads "N published plus one withheld code" (Opus: "0 a 4", "puesto 70 de 70").
- **Cards of the kind asked**: a bakery, café, bar, hotel or salon question keeps cards of that kind; a list the
  answer names stays whole (Opus: BBQ and taco cards under a bakery question).
- **The control diff matches whole names** after canonicalizing punctuation (Opus: La Victoria lost inside "Villa
  Victoria"); the control is offered only after a Qloo call that answered.
- **The comparison town is the next row on the gap list** after the open town, said as "the next gap-group town by
  taste rank", or "the top gap-group town by taste rank" when there is none (Grok).
- **A directive after a town is not a place**: "…Vieques versus Culebra and give exact customer demand…" no longer
  refuses as "Give Exact" (GPT's High); a time or a question after the place still counts ("Miami next year").
- **The phone island frame** holds Aguadilla, Culebra and Vieques inside 390 px (Opus).
- **Front page**: "See how taste meets supply", the words the sheet uses (Grok's High).

Checks: container healthy; seven changed-file SHA-256 hashes in the container equal the commit's; live browser runs
(Culebra bakery question: one bakery card, no hours in the text; Las Marías salon: two withheld codes, no rank; San
Juan's comparison Loíza, Maricao's the top row; the control's title; the town-state and comparison paths; the 390 px
island frame); `check-demo --journeys` 0 failed; 456 tests. Real phones not tested. Public snapshot re-exported from
`766b4b9` as `a50eb2f` (the sixth panel record and its four evidence files added; scanned; the record reads logged out).

## Polish release (2026-10-25, later)

Live as `zemi-aku:polish-20261025`, source `d4e239d`, layered on `state-20261025` with `app/`, `server/` and
`scripts/serve-eagle.mjs` (`tmp/deploy-polish-20261025.sh`, local only). Rollback set
`/opt/zemi-aku/polish-20261025-rollback` (previous image `state-20261025`). The fifth blind panel on the state release
(`JUDGE-PANEL-2026-10-25.md`: GPT 18, Opus 16, Grok 15, mean 16.3) and the Codex review of this diff
(`tmp/codex-review-polish-20261025.md`: no High, six Mediums, three Lows; the exact-pick fallback, the reselect rule on
`open_place` and voice frames, the locality read on the verdict path, the withheld note's cap and tag trimming fixed
before deploy; open: a slow same-town load overwriting a newer answer, the comparison sentence rendered by the model,
the records' test count). No key, cap, cache, Caddy, env or connector change.

What changed on the site:

- **No stale cards under a new sentence.** A model answer about the open town that brings no place list of its own
  reloads the town's catalog (Grok's High: restaurant cards under a bakery correction). A voice turn, one frame at a
  time, keeps what its earlier frames showed; an answer with its own place or list keeps it.
- **The control restores the town's own heading** ("San Juan", its lede) before its catalog returns, not "Bad Bunny
  fans in San Juan · Qloo places" (GPT).
- **A short desktop window** (1455×639) hides the suggestion chips while the first screen is up (GPT).
- **The comparison sentence names the other town for what it is:** "Río Grande, the next gap-group town, has more
  businesses of this type per resident than San Juan"; a withheld count says whose (Opus).
- **"Today 12:00 am–12:00 am" reads "Open 24 hours"** / "Abierto 24 horas" (Opus, Grok).
- **The decision card** names the places the note names, in the note's order, matched on whole names only (Opus: two
  visit lists), and says what the rank rests on: "Qloo tags the town's taste as Puerto Rican, Resort Like, Casual"
  from the same locality read, which a verdict waits 1.5 s for and then goes on without (Opus: "one opaque number").
- **The gap list names the high-taste towns the Census withholds:** "Vieques (taste #1), Culebra (taste #8), Maunabo
  (taste #10) are not here: the Census withholds its count, so few or many cannot be told" (Grok).
- **On a phone the voice button shows the language code alone**; the ask field grows from 159 to 227 px at 390 px
  (Grok, GPT).

Checks: container healthy; six changed-file SHA-256 hashes in the container equal the commit's; live browser runs of
the San Juan verdict (tags, visit line, comparison wording), Maricao (withheld wording), the control's title, the
bakery correction after a restaurant verdict, the town-state path at 390 px, the gap-list note in both languages,
the phone field width; `check-demo --journeys` 0 failed; 453 tests. Real phones not tested. Public snapshot re-exported
from `0c59184` as `c5820b5` (the fifth panel record and its four evidence files added to the export list; scanned for the VM
address, local paths, `_secrets` and attribution; the README's test count and the panel record read logged out).

## State release (2026-10-25)

Superseded the same day by the polish release above. Live as `zemi-aku:state-20261025`, source `83e164a` (cuts `4a19565`, `83e164a`), layered on `trust-20261024` with `app/`,
`server/` and `scripts/serve-eagle.mjs` (`tmp/deploy-state-20261025.sh` and `-b.sh`, local only). Rollback set
`/opt/zemi-aku/state-20261025-rollback` (previous image `trust-20261024`). Carlos: "can you drive 1, 2, 3 and 4?" after
the fourth blind panel (`JUDGE-PANEL-2026-10-24c.md`): the next build items the panel agreed on. Codex adversarial
review of the diff (`tmp/codex-review-townstate-20261025.md`): no High, five Mediums (a shared `keepOpportunity` flag
that was not re-entrant; the selector hidden for island and comparison answers; a comparison or a passing mention
flown to; the Census sentence naming both catalogs on one count or a withheld lower bound; the clarification only in
the prompt), three Lows (voice and control answers leaving industry colors; history without the industry; the README
count). The Mediums and the count are fixed; the two Lows on colors and history are open. No key, cap, cache, Caddy,
env or connector change.

What changed on the site:

- **A model answer that names another town moves everything with it.** The `opportunity_map` action carries the
  town it was asked about (and the towns of a comparison); the client opens that town under the island colors, so
  the URL, the composer placeholder, the map and the panel follow San Juan after a Ponce answer (judge panel 10/24
  round 4, GPT's first ask). The industry selector gives way only to a target town; an island or comparison answer
  keeps it. A question naming exactly one other town still gets its flight; two towns do not.
- **An ambiguous ask gets a question back.** "¿Dónde está lo bueno?", "Where's the good stuff?" and their bounded
  kin are answered before the model and in the rules fallback with one question (food, nightlife, beaches and
  outdoors, culture, or a business to open), labeled "a question back, no record read". The prompt keeps the general
  rule for other phrasings.
- **The decision card names the Census scope.** "The Census counts only retail bakeries, with paid employees (NAICS
  311811); Qloo's and Overture's lists include places without employees and under other tags, so they run longer,
  and the group reads on the Census axis." Only a catalog longer than the published count, or a withheld count's
  upper bound, is named.
- **"Where should I open a bar in Puerto Rico?" asked from an open town is the island question**, not that town's
  verdict. The first cut's regex carried backspace bytes from a patch heredoc and did nothing; the second cut fixed it.

Checks: container healthy; eight changed-file SHA-256 hashes in the container equal the commit's after each cut; live
browser runs at 1366 and 390 px (Ponce answer, then the San Juan profit question: hash `#town=San Juan`, "Ask about
San Juan…", the San Juan panel, no Vico C text visible; the clarification; Maricao still answers); a Caguas/Cayey
comparison from Adjuntas repeats the tool's order in Spanish; `check-demo --journeys` 0 failed; 450 tests. Android
emulator (Chrome 128, 412 px) on the trust build: first screen, sheet, chips, legend, verdict caption, fold and
cards work; the 3D map stays black on the emulator's SwiftShader translator with no console error, recorded in
`tmp/shots-20261024/ANDROID-NOTES.md` as not a real-device result. Real phones not tested.

## Trust release (2026-10-24, night)

Live as `zemi-aku:trust-20261024`, source `898a3d7` (cuts `7c0be3b`, `46e8092`, `9346372`, `898a3d7`), layered on `decide-20261024` with `app/`,
`server/`, `scripts/serve-eagle.mjs` and `data/compare-qloo.json` (`tmp/deploy-trust-20261024.sh` and `-b.sh`, local only).
Rollback set `/opt/zemi-aku/trust-20261024-rollback` (previous image `decide-20261024`). Carlos: "proceed, do as much as we
can to max out based on the feedback" after the third blind panel (`JUDGE-PANEL-2026-10-24b.md`). Codex adversarial
review of the diff: two Highs (a withheld count treated as a point in the comparison; the no-town control fallback left
the places), three Mediums (control actions ignored, ranks and count nouns passing the figure check, tool text still
saying "strong taste"), one Low (five-town prompt against a four-town schema); all fixed before deploy. No key, cap,
cache, Caddy, env or connector change.

What changed on the site:

- **The model never says a number.** The closing note after the verdict gets no rate, count or rank; it gets the places,
  the group in both languages and a comparison with the first gap town written by the route in words ("Río Grande has
  fewer businesses of this type per resident than Adjuntas"; a withheld count says so). A note that restates a figure
  (a rate, a count noun, a rank, a percentage) is dropped and the drawer says why; clock times and the catalog names it
  was given (including "La Familia Bakery 2") pass.
- **Town comparisons come from the tool.** `opportunity_map` takes `towns` (two to four) and returns the order lowest
  first with each town's count, rate and group in English and Spanish, and a direction only when the ranges do not
  overlap (a withheld count is a range; equal rates are equal). The prompt tells the model to repeat it in the
  answer's language and never work out the direction itself.
- **The control replaces the with-Qloo places.** "Ask again without Qloo" applies the control answer's own actions,
  then reloads the open town's catalog in the list and on the map, or clears the answer places when no town is open,
  and says so under the diff line.
- **The decision card speaks to the owner:** the third check follows the group (gap: the next gap town; competitive:
  two competitors; quiet: where people buy today; crowded: the next town or a niche; unknown: the municipio's own
  count), and Overture-only names join the visit line, marked by source.
- **Taste wording says the split:** "taste above/below the median", "afinidad sobre/bajo la mediana" on the legend,
  the card and the spoken verdict.
- **Cards** say "hours not listed" when the catalog has none, and fan and taste lists sort by the affinity they display.
- **Front page** matches the evidence panel: "Take Qloo away and the places go with it", "Every place comes from a
  record", the model writes the note and never the numbers, a run without Qloo says it is general knowledge.
- `/compare` runs regenerated under the new prompt (seven pairs).

Checks: container healthy; nine changed-file SHA-256 hashes in the container equal the commit's after each cut; live
probes of San Juan, Adjuntas, Luquillo (suppressed), Río Grande, Ponce, Mayagüez and Vieques with notes in 0.3–0.7 s
and no figure; "¿Caguas o Cayey?" and "San Juan or Ponce?" repeat the tool's order in the question's language with the
right direction; a browser run of the Bad Bunny question, the control (list goes from five fan matches to the town's
eight best known, no affinity line left) and the Adjuntas card; `check-demo --journeys` 0 failed; 447 tests locally.
One defect found live and fixed in the second cut: the figure check read "La Familia Bakery 2, Panadería…" as a count
and dropped the Río Grande note twice; the names the note was given are masked before the check. Third cut (after
the fourth panel's second report): a directory loaded for one town is never offered under another town's name (Opus
saw "Ver los 323 lugares en Maricao" open Caguas's catalog after a model answer moved the map); browser-checked live
(Caguas then Maricao: the directory hides), journeys 0 failed. Fourth cut (after the fourth panel's third report,
`JUDGE-PANEL-2026-10-24c.md`): the control clears the picks row and the list heading before the town's own catalog
returns (Grok saw "Bad Bunny fans in San Juan" and three top picks survive the control); a withheld Census count
reaches the model with no rate, only its range (Grok saw "la tasa es 0 por cada 10,000"). Browser-checked live (after
the control: picks hidden, heading "Best known", eight catalog cards, no affinity line); journeys 0 failed; hashes
equal; 448 tests. Tried and reverted in the same cut: quoting the spoken verdict per 10,000 with one decimal to match
the card; the speech checker forbids decimals and large numbers in spoken lines, so the verdict keeps "about 5 per
hundred thousand" and the card "0.5 per 10,000", recorded as a tradeoff. Real phones not tested. Screenshots 02, 05
and 07 retaken from the second cut.

## Decide release (2026-10-24, evening)

Live as `zemi-aku:decide-20261024`, source `ce88f18` (cuts `c80af4e`, `250e93b`, `ce88f18`), layered on `lang-20261024` with `app/`, `server/`,
`scripts/serve-eagle.mjs` and `data/compare-qloo.json` (`tmp/deploy-decide-20261024.sh`, local only). Rollback set
`/opt/zemi-aku/decide-20261024-rollback` (previous image `lang-20261024`). Carlos: "max out on your suggestion", the five
items that move the criteria both panels score low (technical execution, real-world impact). Codex adversarial review of
the diff: eight findings, all fixed before deploy. No key, cap, cache, Caddy, env or connector change; the note shares
the model ledger and the forty-turn visitor cap.

What changed on the site:

- **The headline siting answer is a hybrid.** The rule-based verdict stays (it matches the map) and, when the visitor has a
  model turn and the budget allows, gets two model sentences from the same data (`createNote`, one plain completion, no
  hidden reasoning): which listed places to go see and what to check once, and one comparison with a gap town or a next
  step. The drawer reads "sources + live model", names the model and the time, and offers the same **Ask again without
  Qloo** control. A note is skipped, and the drawer says why, when the visitor cap or budget is spent, the model echoes the
  verdict, writes in the wrong language, makes a claim the data cannot carry (revenue, profit, guarantee), or returns
  nothing. Suppressed Census rows reach the model as ranges with a note, never as zeroes; the current town is never its own
  comparison; French, Italian and German get no note. The voice reads whole sentences up to the speak limit.
- **A decision card** opens the business panel: what the data says (group, rank, establishments with employees, rate
  against the median the groups split on, Qloo and Overture counts), what it cannot tell you (demand, sales, rents, foot
  traffic, permits, profit; hours are a dated snapshot), next three checks (visit the listed places at opening, ask rents
  and permits, compare with the gap towns). Deterministic, both languages.
- **One sheet at a time on phones:** an answer folds the open panel to its handle through the same setter the handle uses;
  dismissing the answer unfolds it; a manual toggle takes ownership back.
- **Counts agree:** the legend says "50 of 941 on the map" for the town the directory belongs to; the gap list says
  "ranks are among the 76 of 78 towns with Qloo taste data".
- **A seventh compare pair:** the Bad Bunny question with the place catalog but no affinity tool (`catalog-only`, compare
  build only). The catalog-only run says it has no tool mapping fans to restaurants and gives a general read; the Qloo run
  ranks places by measured affinity. The page labels the pair "Catalog without affinity". `data/compare-qloo.json`
  regenerated locally (14 model turns).

- Third cut (same evening, after the third blind panel's first two reports, record `JUDGE-PANEL-2026-10-24b.md`): the note receives the verdict's own unit
  (whole numbers per hundred thousand residents) and the Spanish group names, so one bubble no longer mixes "per
  10,000" with "por cada cien mil" and never says "grupo gap"; the decision card reads a suppressed count as "up to X
  per 10,000", never 0.0; the live control sends no history, like `/compare`, and shows a one-line "Qloo changed: …"
  diff against the catalog places the with-Qloo answer put on the map; the agent prompt forbids rents, foot traffic,
  menus and prices the tools do not carry, and bars towns from the places-to-visit slot; tool list titles ("food in
  Caguas", "all in Adjuntas") read in Spanish; the camera pill follows a language change; a new verdict scrolls its
  panel to the top.

Checks: container healthy; changed-file SHA-256 hashes in the container equal the commit's after each cut; live probes
of San Juan (both languages, one unit), Luquillo (suppressed), Loíza, Río Grande, Ponce, a French question and the
no-history control answer as designed with notes in 0.4–0.9 s; `check-demo --journeys` 0 failed; 445 tests locally.
Real phones not tested.

## Language release (2026-10-24)

Live as `zemi-aku:lang-20261024`, source `95970c6` (fifth cut; earlier cuts the same day `b8f40f7`, `2fb4cc3`, `9a7e1f9`,
`1a62260`), layered on `verdict-20261023` with `app/`, `server/` and `scripts/serve-eagle.mjs` (`tmp/deploy-lang-20261024.sh`,
`-b.sh`, `-c.sh`, local only). Rollback set `/opt/zemi-aku/lang-20261024-rollback` (previous image `verdict-20261023`). Carlos
asked to keep closing the panel's gaps; cuts one and two are the follow-ups to the verdict release, after a Codex adversarial
review of the diff (eight findings, all fixed before deploy); cuts three to five answer the second blind panel
(`JUDGE-PANEL-2026-10-24.md`), which scored cut two. No key, cap, cache, Caddy, env or connector change.

What changed on the site:

- The saved language and gender are read before the first render (they used to arrive only after `/api/voices` answered, so
  the first screen read English with Spanish saved), the language menu renders at once, and a browser set to Spanish starts
  in Spanish when nothing is saved. Blocked storage keeps the browser default.
- The gap list under the opportunity map says "taste #2 of 76" (it started at #2 with no denominator).
- The business verdict closes with a step the owner can take ("A lead, not proof: visit and check rents";
  "Compare what two local competitors sell"; "Ask where people buy today before you bet on demand"; "Look at the next town
  over, or a niche nobody serves"), in both languages, and the closing outranks the catalog counts under the 280-character
  clamp.
- A model call to `map_town` with no town takes the open town; an `opportunity_map` call with no industry takes the one
  industry the question names (none when it names two, or "salón" without beauty wording; never from the selected taste
  tag); an `opportunity_map` call without a town gets the town row when the question itself names the open town. Other
  town-less data calls still fail, since a town-less call may mean the whole island.
- A bakery or café that Qloo filed under the plain restaurant genre ("Erik's Bakery and Pastry Shop", Maricao) counts by
  its name in the business filter; other genres keep their own type whatever the name says.
- Cuts three to five (second panel): Spanish chips, legend, hours ("Hoy", "Cerrado hoy"), directory title and "All" button,
  About and Sources headings, copy-brief, journey return, "Qloo places" note and camera pill follow the picked language;
  "¿…y por qué?" no longer reads "Por" as a place off the island (a place after a conjunction needs a known town in the
  clause); the spoken verdict and the model's town reading quote the median the groups split on ("against a median of 13")
  and say "establishments with employees"; a model answer that moved nothing flies to the known town the question names;
  the language sheet closes on a pick; the source line names Wikipedia only when an extract was read; the site-icon
  caption is gone; employee counts carry separators.

Checks: container healthy; changed-file SHA-256 hashes in the container equal the commit's after each cut; live probes
(San Juan bakery, Loíza salon, Maricao, Arecibo, island-wide café, Ponce median, the Opus "y por qué" phrase, Culebra from
Adjuntas with `fly_town`) answer as designed; `check-demo --journeys` 0 failed; 439 tests locally. Devpost screenshots
01-04 and 06 retaken from cut two (headless Chromium, 1600×900 and 390×844; `tmp/shots-20261024/`); the bubble text in
02 predates the "with employees" wording of cut four. Real phones not tested.

## Verdict release (2026-10-23)

Live as `zemi-aku:verdict-20261023`, source `f3a28fe`, layered on `notes-20261021` with `app/`, `server/` and
`scripts/serve-eagle.mjs` (`tmp/deploy-verdict-20261023.sh`, local only). Rollback set `/opt/zemi-aku/verdict-20261023-rollback`
(previous image `notes-20261021`). Carlos reopened the freeze on October 23 for the blind judge panel's findings
(`JUDGE-PANEL-2026-10-23.md`, items A-F) after a Codex adversarial review of the diff (eight findings, all fixed before deploy;
record in the Brain session notes). No key, cap, cache, Caddy, env or connector change.

What changed on the site:

- The rule-based business answer leads with the saved opportunity verdict and exact counts ("San Juan is a gap for bakeries:
  strong taste, rank 5 of 76, and few businesses, 16 establishments or about 5 per hundred thousand residents against 8
  island-wide. Qloo lists 35 and other map data 64."); a suppressed Census count is spoken as a range; an "unknown" row says
  which data is missing. Counts are exact from three up (the bands "about fifty" and "a couple dozen" are gone).
- Two-town, which-is-better and comparison questions go to the model, which now gets `opportunity_map(industry, town)` with
  the town row, the island figure and a one-sentence reading; a business question naming a place off the island ("in Miami")
  gets a one-line "not on this map" reply instead of the open town's answer.
- "Where do fans eat": `artist_places` takes a category, the agent adds `food` for an eating question when the model omits it,
  the cards equal the evidence count (eight), and an empty food set shows no cards.
- An oversize model request drops its largest tool result (marked "dropped to fit the request" in the drawer, its map action
  removed) instead of failing the turn to the rules router. The Caguas/Río Grande comparison needed this.
- Public control: every live model answer's drawer offers **Ask again without Qloo**. It repeats the exact request snapshot
  (town, taste, language, prior history) with the Qloo tools removed, under the same visitor cap and spend ledger; JSON
  and same-origin only (415/403 otherwise); its drawer reads "live model · without Qloo tools". `/compare`, the spec and the
  earlier note in this file that said the public site had no such switch are updated.
- 390 px: the camera chrome hides under an open sheet (it sat on the sheet title once a tall caption pushed the sheet up).
  Spanish: tours, example chips, search placeholder, voice preview and the brand line follow the picked language; the
  legend says "mucha afinidad"; `<html lang>` follows too. Card hours and genres still come from the data in English.

Checks: container healthy; the nine changed-file SHA-256 hashes in the container equal the commit's; live probes of the
panel's own questions (San Juan bakery, Loíza salon, Maricao, Miami, Caguas vs Río Grande, Bad Bunny eat, and the no-Qloo
control) all answer as designed; `check-demo --journeys` 0 failed; cross-origin control 415 then 403; 432 tests locally;
gitleaks over 224 commits finds only the ignored `.env.example` placeholder. Real phones not tested.

## Courtesy notes release (2026-10-21)

Live as `zemi-aku:notes-20261021`, source `e4e85c8`, layered on `credits-20261021` with only three production files: `app/home.html`, `app/qloo-notes.html` and `scripts/serve-eagle.mjs`. Carlos approved the personal report and asked to leave it on the public website "super less intrusive." A12px muted footer link opens `/notes-for-qloo`; no hero/nav/app entry point. The new static page retains Carlos Jimenez's attribution, a back link and `noindex,nofollow`. This narrowly authorizes the document/footer change during the freeze.

App-only recreate; original image override retained at `/opt/zemi-aku/notes-20261021-rollback`. Caddy, production env, safe overlay, caps and caches untouched. Container SHA-256 hashes for all three files match committed source; external homepage and notes bodies match too. `/notes-for-qloo`200, existing demo smoke probes0 failed, private paths404. Full isolated suite417 pass/1 cache-dependent skip. Browser1440/390: no horizontal overflow, all four notes toggles work; live footer has exactly one link. Local composited contrast1440/768/390:0 failing, font-source check clear. Real phones not tested. Functional audit categories have a documented structure-probe exception. Details: [QLOO-NOTES-2026-10-21.md](QLOO-NOTES-2026-10-21.md).

## Credits release (2026-10-21, morning)

Live as `zemi-aku:credits-20261021` (layered `FROM zemi-aku:review2-20261017`, `COPY app` only, from `6f214e1`;
`deploy-credits-20261021.sh`). Rollback set `/opt/zemi-aku/credits-20261021-rollback`. Carlos approved it October 21
("yes proceed"). Release audit item 2: Cesium ion terms 2.2.3 require the ion logo on the main window, and the docked left
panels (`#panel`, `#opportunity-panel`, `#coastal-panel`) covered it on desktop while the ask bar covered it on phones.
Cesium sets the credit row's position inline, so `app/index.html` overrides it with `!important`: on desktop the row starts
right of an open panel (76 px from the edge when it is collapsed); on phones the ask bar rises 6 px and the row sits under it.
Also: Esri's credit now matches the service ("Esri, Vantor, Earthstar Geographics, and the GIS User Community"), RainViewer's
reads "Weather data by RainViewer" with a link (`app/weather.js`), and the front-page footer links OSM's copyright page
(`app/home.html`).

Checks: container up; the three served file hashes equal the commit's; `check-demo --journeys` 0 failed; `/`, `/app/`,
`/compare`, `/api/voices` 200, `/mcp` 404. Logged-out Chromium at 1600 × 900 and 390 × 844: `elementFromPoint` on the
ion logo and the "Data attribution" link returns the credit row with the opportunity panel, the details panel and the
phone first screen open. 415 tests. The live credit row now also shows Cesium's "Upgrade for commercial use." (audit item 4).

## Public snapshot repository (2026-10-17, late afternoon)

`github.com/CDVolvik/zemi-aku-public` is PUBLIC since October 17 (Carlos: "proceed"), as one commit `0f86f3b` holding the code of
`cd4fd44` (the review-2 release): README, LICENSE, `app/`, `server/`, `scripts/`, `test/`, `data/`, `deploy/`, `cache/*/.gitkeep`,
the Docker and compose files, and the judge-facing docs (walkthrough, tester kit, both Codex reviews, this file, the judge dry
run, the stranger test, the video script, the submission draft, the public release records, the specs, the Devpost
screenshots). Left in the private working repo on purpose: `HANDOFF.md`, `DEPLOYMENT.md`, `NEXT-SESSION.md`, `DECISIONS.md`,
the competitor analysis and first-place plan, `docs/evidence/`, `docs/plans/`, the human-test notes (they carry the VM address,
local paths, `_secrets` references or internal strategy). A fresh clone of the snapshot installs and passes 414 tests with the
Census-cache test skipped. Scanned before the push for the VM address, local paths, `_secrets`, key prefixes and the Gmail id.

Re-export after any code change that ships: `git archive HEAD <the list above> | tar -x -C <empty dir>`, copy over a clone of
the public repo, one commit, push. The front page's Code and GitHub links and the submission draft point at the public repo.

**Republished October 21 (Carlos: "yes proceed").** Qloo's hackathon developer guide says not to store Qloo response
data in a public repository, and `0f86f3b` carried `data/samples/*` (with business contact fields), `data/compare-qloo.json`
and each town's top Qloo record in `data/municipio-survey-2026-10-06.json` (release audit item 1). `main` now holds the two
placeholder commits, `61011dd` (the snapshot of `306dad8`, the code of the live `credits-20261021`) and `d1805aa` (its
`.gitleaksignore` fingerprint); force-pushed with a lease on `0f86f3b`, no forks existed. Built by
`tmp/public-snapshot-20261021.py` (local, ignored like the deploy scripts; args: private repo, public clone, commit): the same file set minus the three samples, the compare runs and the root
`SUBMISSION-DRAFT.md` duplicate; the survey keeps its counts and grades without `top`; `docs/SUBMISSION-DRAFT.md` keeps
its public version with only the test line corrected (the private draft links Devpost/video folders the public repo lacks).
Checks: gitleaks over the public history finds only the ignored empty `.env.example` placeholder; no VM address, local
path, `_secrets` or key prefix; a fresh clone installs and passes 411 tests with four skips (Census cache, the three
tests that read saved Qloo results), boots, and `/compare` reports that the runs could not be loaded. Logged out:
README, walkthrough and LICENSE 200 (MIT detected); `data/samples/maricao.json`, `data/compare-qloo.json` and the root
draft 404. ⚠️ GitHub still serves the old commit page by its full SHA until GitHub purges unreferenced commits.
**Re-exported October 23** from `f3a28fe` (the verdict release) as public `33c9992` with `tmp/public-snapshot-20261023.py` (same
script; the public draft is kept as is), plus the October 21 notes page and test, `docs/JUDGE-PANEL-2026-10-23.md` and its four
evidence reports. Scanned for the VM address, local paths, `_secrets`, key prefixes and the Gmail id (only the scan patterns in
tests and this file match); gitleaks on the tree finds only the ignored `.env.example` placeholder; a fresh clone installs and
passes 428 tests with four skips; README, notes page, panel record and LICENSE answer 200 logged out.

**Re-exported October 24** from `dbdd008` (the language release records) as public `770563d` with
`tmp/public-snapshot-20261024.py` (same script plus the second panel record and its four evidence reports). One mistake on
the way, recorded here: the first run crashed on a stale `node_modules` left in the clone by the October 23 fresh-clone test,
and the command chain still committed and pushed the half-emptied tree as `1fd6594` (83 deletions, nothing private). It was
replaced within minutes by a lease-guarded forced update to `770563d`; the script now skips `node_modules`. Scanned for the VM
address, local paths, `_secrets`, key prefixes (only the scan patterns in tests and this file match); a fresh clone installs
and passes 435 tests with four skips; README (439 tests), the panel record and LICENSE answer 200 logged out.

**Re-exported October 24, evening** from `fe97492` (the third panel records) as public `16420a3` with the same script plus
the third panel record and its four evidence reports. One correction in the public copies only: the two panel briefs told
the evaluators not to read a local directory by its path; the script now rewrites that sentence, since the earlier export
had published it. Scanned for the VM address, local paths, `_secrets`, key prefixes and the Gmail id (only the scan
patterns in tests and this file match); the clone installs and passes 445 tests with four skips; README (445 tests), the
panel record, the brief and LICENSE answer 200 logged out and `data/compare-qloo.json` 404.

**Re-exported October 24, night** from `ef63000` (the trust release records) as public `b549d9a` with the same script.
Scanned as before (only the scan patterns in tests and this file, and an evaluator's quoted question, match); the clone
passes 447 tests with four skips; README (447 tests) answers 200 logged out.

**Re-exported October 24, late night** from `97c5f1e` (the fourth panel records) as public `b291764`, with the fourth
panel record and its four evidence reports added to the script's `EXTRA` list. Scanned as before; the clone passes 448
tests with four skips; README, the panel record, its reports and `app/index.html` answer 200 logged out.

Re-exporting from now on: run the same script against a new private commit, then commit and push with `gh`'s credential
helper (`git -c credential.helper= -c "credential.helper=!gh auth git-credential" push`).

## Review-2 release (2026-10-17, afternoon)

Live as `zemi-aku:review2-20261017` (layered `FROM zemi-aku:integrate-20261017`, from `cd4fd44`; `deploy-review2-20261017.sh`).
Rollback set `/opt/zemi-aku/review2-20261017-rollback` (previous image `integrate-20261017`). Seven files: `server/listen-relay.mjs`
(same-origin only, session reserved before the upgrade and settled on close, one live session per visitor, eight overall),
`server/voice-agent.mjs` (`fitContent` shortens a long tool result instead of refusing it), `server/samples.mjs` (replays drop
day-specific hours), `server/tester-delivery.mjs` (batch of pending rows), `scripts/serve-eagle.mjs` (listen wiring),
`app/index.html` (island history primed at boot; fr/it/de voices keep their language), `data/samples/maricao.json` (timeless
sentence). The seven fixed findings of the Codex adversarial review round 2 (`CODEX-REVIEW-2026-10-17.md`).

Checks: container healthy; all seven served file hashes equal the commit's; `check-demo --journeys` 0 failed; live
`/api/listen` upgrade with a foreign Origin → 403, with no Origin → 403, with the page's origin → 101. 415 tests.

## Integration release (2026-10-17, midday)

Live as `zemi-aku:integrate-20261017` (layered `FROM zemi-aku:sources-20261014`, from `c6b19b0`; `deploy-integrate-20261017.sh`).
Rollback set `/opt/zemi-aku/integrate-20261017-rollback` (previous image `sources-20261014`). The whole 10/16 human-test stack
(PRs #2–#17, built by the Cursor lane overnight) merged as PR #18 with two fixes found in the integration check: on phones the
new camera controls (reset north, 2D, home, 3D) sat inside any open bottom sheet and now park as a row under the style
button (`app/index.html`), and a place whose website is a Facebook or Instagram page no longer gets the platform's logo as
its "site icon" (`server/lib.mjs`, `app/dossier.js`; letter tile instead). What the stack brings: Qloo-style palette
(Inter / periwinkle, shared grid), business-story hero by default (`?story=traveler` keeps the old one), docked left panel on
desktops and a bottom sheet on phones, map history and tilt helpers (`app/history.js`), logos and richer result cards,
`/api/config` with `TESTFLIGHT_PUBLIC_URL` (unset on the VM, so the request form stays), `server/limits.mjs` shared rate gate.

Checks: container healthy; nine file hashes equal the commit's (`app/index.html`, `app/home.html`, `app/dossier.js`,
`app/history.js`, `app/coastal.css`, `server/lib.mjs`, `server/beta.mjs`, `server/limits.mjs`, `scripts/serve-eagle.mjs`);
`check-demo --journeys` 0 failed; `/`, `/app`, `/compare`, `/api/config`, `/api/voices` 200; logged-out incognito at 1280 px
and 390 px (front page, app landing, café sheet with the controls clear of it). 406 tests. ⚠️ The front page's Code and
GitHub links now point at `github.com/CDVolvik/zemi-aku-public`, which exists but is still private (a 404 for judges until
Carlos flips it; the old link was the private `qloo-local-taste`, so nothing got worse).

## Sources release (2026-10-14, late night, after the stranger-test release)

Live as `zemi-aku:sources-20261014` (layered `FROM zemi-aku:stranger-20261014`, from `43fc050`; `deploy-sources-20261014.sh`).
Rollback set `/opt/zemi-aku/sources-20261014-rollback` (previous image `stranger-20261014`). Three files: `server/business.mjs`
(business and opportunity answers carry `evidence: { mode: "sources", kind, calls, at }`), `app/evidence.js` (the drawer reads
"Evidence · business research · no model turn · 4 sources" and lists Qloo catalog, Overture, Census PRCS and the opportunity map),
`app/index.html` (the opportunity caption passes its evidence). Carlos chose this option on October 14 from the stranger test.
349 tests. Hashes of five files verified against `HEAD`; live probe shows `mode: "sources"` on both answers.

## Stranger-test release (2026-10-14, late night, after the review release)

Live as `zemi-aku:stranger-20261014` (layered `FROM zemi-aku:review-20261014`, from `3af8fe3`; `deploy-stranger-20261014.sh`).
Rollback set `/opt/zemi-aku/stranger-20261014-rollback` (previous image `review-20261014`). Two files: `app/home.html` (hero
leads with the business decision) and `app/index.html` (typed business and rules answers show in the caption). From the
stranger test (`STRANGER-TEST-2026-10-14.md`). Hashes of five files verified against `HEAD`; journeys probe 0 failures.

## Review release (2026-10-14, late night)

Live as `zemi-aku:review-20261014` (layered `FROM zemi-aku:music-20261014`, from `2938a3c`; `deploy-review-20261014.sh`).
Rollback set `/opt/zemi-aku/review-20261014-rollback` (previous image `music-20261014`). Six files: `server/lib.mjs`,
`server/agent.mjs`, `server/agent-tools.mjs`, `server/qloo-mcp.mjs`, `scripts/serve-eagle.mjs`, `app/evidence.js`. The eight
findings of the Codex adversarial review (`CODEX-REVIEW-2026-10-14.md`): music routing tightened and its caveat spoken, Qloo
allowance charged per upstream call, harness error envelopes as error results, fallback evidence keeps the rounds it ran
("model did not finish"), `/api/ask` validates its body, docs match the deployed caps, workflow export scrubbed.

Checks: container healthy; all six file hashes equal the commit's; live `/api/ask`: `null` and a non-array history answer
400; "I listen to Bad Bunny" and "hear the ocean in Rincón" route as before, "hear live salsa" to 12 live music venues with
the caveat in the speech; a live model turn (Maricao) answered in 2 rounds, 4 calls; `check-demo --journeys` 0 failed.
347 tests.

## Music release (2026-10-14, night)

Live as `zemi-aku:music-20261014` (layered `FROM zemi-aku:caption-20261014`, from `83201a2`; `deploy-music-20261014.sh`).
Rollback set `/opt/zemi-aku/music-20261014-rollback` (previous image `caption-20261014`). Two files: `server/lib.mjs`,
`scripts/serve-eagle.mjs`. The rules router's last known weak answer: past the model cap, "Where can I hear live salsa?"
name-matched a restaurant called Salsa y Pique. `musicAsk` recognises hear/dance/live-music questions and the genre; the
router asks Qloo's live music venue tag first (strict, in the named town or across the island) and the note says the genre
itself is not on Qloo's place records.

Checks: container healthy; both file hashes equal the commit's; live `/api/ask` (the rules path, no model) answers the
English salsa question with 12 live music venues and the Spanish bomba-in-Loíza question with the island's 12 after saying
Loíza lists none; `check-demo --journeys` 0 failed. 344 tests.

## Caption release (2026-10-14, evening)

Live as `zemi-aku:caption-20261014` (layered `FROM zemi-aku:closing-20261014`, from `74a3a9d`; `deploy-caption-20261014.sh`).
Rollback set `/opt/zemi-aku/caption-20261014-rollback` (previous image `closing-20261014`). Two files: `app/index.html`,
`app/opportunity.css`. The phone nit left by the phone release: the spoken caption rose from the dock over the last lines of the
town readout and the opportunity panel. A ResizeObserver on `#caption` sets `--caption-h` (height plus the 8 px gap; 0 while
dismissed) and the phone rules add it to both panels' bottom, so the readout lifts above the caption and drops back on dismiss.

Checks: container healthy; both file hashes equal the commit's; on the live site at 390x844 the Río Grande readout spans y
237–643 above the 110 px caption at 651–761 and the dock at 769, and returns to 355–761 once the caption is dismissed; no
terrain toast; `check-demo --journeys` 0 failed. 342 tests.

## Closing-round release (2026-10-14, evening)

Live as `zemi-aku:closing-20261014` (layered `FROM zemi-aku:phone-20261014`, from `1f8d9da`; `deploy-closing-20261014.sh`).
Rollback set `/opt/zemi-aku/closing-20261014-rollback` (previous image `phone-20261014`). One file: `server/agent.mjs`. Found by
the judge dry run (`JUDGE-DRYRUN-2026-10-14.md`): "Where can I hear live salsa?" used all four tool rounds and fell to the rules
router, which named a Mexican restaurant. The model now gets a fifth round with no tools, told to answer from what it read; the
fallback stays for a fifth round with no text. No new key, cap or route; one more model call only on turns that used to fall back.

Checks: container healthy; `server/agent.mjs` hash equals the commit's; live, the English and Spanish salsa questions answered
from the model with real venues (rounds 4 and 3); `check-demo --journeys` 0 failed. 342 tests.
