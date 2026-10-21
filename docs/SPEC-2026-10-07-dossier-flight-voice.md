# Spec addendum — business dossier, god's-eye flight, conversation mode

**Approved by Carlos on 2026-10-07.** Adds to `docs/SPEC.md`. Built on the kit findings in
`docs/2026-10-07-qloo-kit-findings.md`.

Carlos's notes that this answers:

1. Clicking a business must show everything we have on it. The search does not show it well.
2. Moving between places should feel like a god's eye: rise, reorganize, descend.
3. A conversation mode: a breathing wisp in the corner, pause and stop, male and female voices,
   English, Spanish, and three more languages.

## 1. Business dossier

One panel, opened the same way from a pin, a place row, a search hit, or an answer card. It replaces
the fact list under the place rows (`#spot`).

Contents, each line labeled with its source:

| Line | Source |
|---|---|
| Photo | Wikimedia Commons or OpenStreetMap, as now. Never the Qloo Google photo URL. |
| Name, Qloo description | Qloo place record `properties.description` |
| Municipality, barrio | `geocode.admin2_region` (municipality), `geocode.city` / `neighborhood` (barrio) |
| Price, rating, today's hours | `price_level` (as $–$$$$), `business_rating`, `hours` |
| Address, phone, website, socials, Google listing | Qloo, OpenStreetMap, Wikidata, as now |
| Who likes it | `qloo_audience_demographics` by UUID: age bands and gender, shown as above or below average. Words: "above average", not "customers are". |
| Taste footprint | `qloo_where_popular` by UUID within Puerto Rico, drawn as a heat layer while the panel is open |
| Wikipedia | as now, when the place has a page |

Rules:

- The place record carries `id` (Qloo UUID). Demographics and footprint are requested by UUID only.
  Name lookups matched malls in Mexico.
- The municipality check reads `admin2_region` first, then the printed city. A barrio is not a
  neighbor town.
- Demographics and footprint load after the panel opens. If either comes back `empty`, the line says
  Qloo had no data for it. It is not hidden.

### Search

- Each place hit carries the UUID. Clicking a hit opens the town, flies to that business and opens
  its dossier. Today it opens the town's first place instead.
- A word that is not a town or a place name runs `qloo_find_tags`, then ranks places by that tag
  (`qloo_recommend`, tag as signal, town or island as the filter). The hit reads like
  "Surf · 5 places in Rincón".
- A dish tag can come back loose (Ponce mofongo returned OfficeMax). If the matched places do not
  carry the tag or a related genre, the hit says the taste is thin there.

## 2. God's-eye flight

One `travel(target)` function replaces the direct `flyTo` calls for town and place moves.

1. **Climb.** Height grows with distance, 6–60 km, and the camera pitches toward straight down.
2. **Glide and turn.** The camera crosses to the target and turns its heading. Town outlines drop
   flat while airborne and rise again on arrival.
3. **Descend** into an oblique view of the target, at the height the current map style uses now.
4. **Settle.** A slow orbit around the target, stopped by any pointer, wheel or key input.

Total 1.6–3.2 s. A new move cancels the one in flight. `prefers-reduced-motion` cuts to the
destination with no orbit. Short hops (under ~1.5 km) skip the climb.

## 3. Conversation mode

### The wisp

An orb in the bottom-right corner, drawn on a canvas.

| State | Look |
|---|---|
| Idle | Slow breathing, about a 4 s cycle |
| Listening | Swells with the microphone level |
| Thinking | Slow swirl |
| Speaking | Pulses with the output audio level |
| Paused | Dim, still |

Controls: press the wisp to start. **Pause** mutes the microphone and keeps the thread. **Stop**
ends the conversation. Speaking while the wisp talks stops its voice and listens (barge-in).

### Turn loop

Listen → end of speech → answer → speak → listen again, until Pause or Stop.

### Voices

A picker: language × female or male. Saved in `localStorage`.

| Language | Female | Male |
|---|---|---|
| English | `aura-2-thalia-en` | `aura-2-apollo-en` |
| Spanish | `aura-2-celeste-es` | `aura-2-nestor-es` |
| French | `aura-2-agathe-fr` | `aura-2-hector-fr` |
| Italian | `aura-2-livia-it` | `aura-2-cesare-it` |
| German | `aura-2-viktoria-de` | `aura-2-julius-de` |

The server accepts only these ids. Piper stays as the English fallback when Deepgram fails.

### Listening

Deepgram live speech-to-text, relayed through our server over a WebSocket (`ws`), model `nova-3`,
language from the picker, end of turn from Deepgram's endpointing. The key cannot mint browser
tokens, so the browser never talks to Deepgram directly. If the relay fails, the browser's own
speech recognition is used with the same language.

Cost: about $0.0077 per minute of audio, from the unused ~$200 free credit in the Deepgram account
(Carlos, 2026-10-07).

### The brain

One server function: `answer({ question, lang, town, taste, mapState })` returns
`{ speech, cards, actions, packet }`. `actions` are map moves the page performs: open a town, open a
place, set the taste.

- **Now (no model key):** the current grounded templates, written for English and Spanish. French,
  Italian and German voices can be chosen. Their answers say, in that language, that full answers
  arrive with the agent, then give the English cards.
- **At the end:** Claude Haiku 4.5 behind the same function, with the nine `qloo_*` tools from
  `qloo mcp` plus the map actions. It answers in the chosen language and cites only the records it
  fetched. Needs a dedicated Anthropic key with a spend cap. Carlos creates it last.

## Server changes

- `mapPlace` keeps `id`, `description`, `price_level`, `admin2_region`.
- A long-lived MCP client to `qloo mcp` (started once, restarted if it exits). New routes:
  `/api/place/:id/audience`, `/api/place/:id/footprint`, `/api/taste?q=&town=`. Results cached in
  memory by input.
- `/api/speak` takes `{ text, voice }` and checks `voice` against the table above.
- `/api/listen` WebSocket relay to Deepgram live.

## Out of scope

- The Anthropic key and the model brain (last step).
- Hosting. The harness needs a long-running Node 22.19+ process, so the hosted demo is a container,
  not serverless functions. Decided when the build is done.
- Japanese and Dutch voices.

## Testing

- `node --test`: municipality matching with `admin2_region`, voice id allow-list, taste-hit
  wording, the brain's English and Spanish templates.
- Harness bridge: one live call each to `audience_demographics`, `where_popular`, `find_tags`
  through the MCP client.
- In the browser: search hit opens the right dossier; a town-to-town move climbs and settles; a
  spoken Spanish question gets a Spanish voice back; Pause, Stop and barge-in work.
