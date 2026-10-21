# Spec: natural voices (one default, a female and a male choice, English and Spanish)

Draft for Carlos's sign-off, 2026-10-11. Design approved in conversation the same day: engine
**Deepgram Aura-2, capped**; languages **English + Spanish only**; approach **a separate spoken
script plus a voice audition**. Nothing is built.

## Why

- Carlos: "We need to default to one voice. One male and one female, and they need to be 100%
  conversational and not AI how they currently feel."
- Judges use the live app ("something judges can actually use"). Today the public site speaks with
  whatever the visitor's browser offers: on Windows that is "Microsoft Zira", robotic; on a judge's
  iPhone it is something else. The menu lists every device voice.
- The wording also sounds like a machine. Spoken lines read data and disclaimers aloud, e.g. "Qloo
  has 6 recorded places of this type. Overture lists 24 places in its 2026-09-23.1 release. This
  gives us context to investigate, not a profitability forecast."

## Facts (checked 2026-10-11)

- Aura-2 is already wired: `/api/speak` (`scripts/serve-eagle.mjs`) with the id allow-list in
  `server/voices.mjs` (`DEFAULT_VOICE = "aura-2-thalia-en"`). The public overlay blanks
  `DEEPGRAM_API_KEY` and sets `ZEMI_SPEAK_CHARS_PER_DAY: "0"`.
- The current Spanish male voice `aura-2-nestor-es` has a **Peninsular (Spain)** accent. Deepgram lists
  no Caribbean Spanish voice; the closest are "Latin American" `aquila` (m) and `selena` (f)
  ([voice list](https://developers.deepgram.com/docs/tts-models)).
- Price: $0.030 per 1,000 characters pay-as-you-go (third-party sources; Deepgram's page did not load).
  New accounts get $200 credit. The project key's balance endpoint returned an empty list, so the
  remaining credit is unknown: Carlos checks the Deepgram console.
- Self-hosting a natural voice is not possible on the demo server: `VM.Standard.E2.1.Micro`
  (1 GB RAM, a fraction of one CPU). The local Piper fallback is a Windows binary and does not run
  in the Linux container.

## Success criteria

1. A first-time visitor hears the default Aura-2 voice in the app's language (English or Spanish) on
   any device, while the daily cap allows.
2. The voice menu is one choice: **Female / Male** (Spanish: **Voz femenina / Voz masculina**). It
   follows the app language and remembers the choice. French, Italian and German keep text answers
   and play no speech.
3. Every spoken line is 1–3 short sentences, at most 280 characters, with contractions, rounded
   numbers ("about a hundred places"), at most one follow-up question, and no source names, release
   codes, dates, margins of error or URLs. Those stay on screen. Spanish uses *usted* and natural
   Puerto Rican phrasing.
4. Spending is capped at 40,000 characters a day (about $1.20) plus the existing 12/min per-IP limit.
   At the cap, or if Deepgram fails, speech falls back to the browser voice without an error.
5. Carlos listens on a phone and approves the four voices and the wording before deploy.

## Design

### 1. Audition (first build task)

- `scripts/voice-audition.mjs` generates one MP3 per candidate into ignored `tmp/voice-audition/`,
  plus `index.html` with an audio player per voice and the line it reads. Uses the local `.env` key.
- Candidates (16), each reading the same two natural lines in its language:
  - English female: `andromeda`, `delia`, `phoebe`, `helena`
  - English male: `apollo`, `arcas`, `aries`, `orion`
  - Spanish female: `selena` (Latin American), `gloria` (Colombian), `olivia`, `estrella` (Mexican)
  - Spanish male: `aquila` (Latin American), `javier`, `luciano`, `sirio` (Mexican)
- About 16 × 250 characters ≈ 4,000 characters ≈ $0.12. Carlos picks one per slot and the default.

### 2. Voices

- `server/voices.mjs` holds exactly the four chosen voices, `{ id, lang: "en"|"es", gender }`, and the
  chosen default. `/api/speak` keeps rejecting any other id.
- `app/converse.js`: the menu becomes the Female / Male choice; the voice id comes from
  (app language, gender). Device voices are used only as the silent fallback (criterion 4), and the
  long device list leaves the menu. The stored preference is the gender.

### 3. Spoken script

- New `server/spoken.mjs`: `spoken(kind, data, lang) → string` for each answer kind: town catalog
  answer (`speechFor` today), business readout, opportunity map, artist journey, small talk
  (`server/chat.mjs`, already conversational: keep, trim), and errors/fallbacks.
- Answers keep their full sourced screen text; their `speech` field (what is played and captioned)
  comes from `spoken`. Numbers round in speech only ("Qloo knows about a hundred places here").
- Example of the change (English, business readout for Maunabo):
  - today: "Let's look at Maunabo. Qloo has 6 recorded places of this type. Overture lists 24 places in
    its 2026-09-23.1 release. This gives us context to investigate, not a profitability forecast."
  - target: "Maunabo's a small one. A handful of restaurants show up in Qloo, and the map has a couple
    dozen more. Want to see who's nearby?"
  The exact copy is written in the build and goes through Carlos's review with the voices.

### 4. Limits and deploy (part of Carlos's "ship")

- `deploy/compose.safe.yaml`: stop blanking `DEEPGRAM_API_KEY`; set `ZEMI_SPEAK_CHARS_PER_DAY: "40000"`.
  `OPENROUTER_API_KEY` stays blank; `ZEMI_LISTEN_MINUTES_PER_DAY`, `ZEMI_VOICE_MINUTES_PER_DAY`,
  `ZEMI_VOICE_CHAT_USD_PER_DAY` and `ZEMI_CHAT_USD_PER_DAY` stay `"0"` (no paid listening, voice agent
  or model). A test pins these overlay values.
- Carlos adds a Deepgram key to the server `.env` (never copied by an agent).

## Tests (written first)

- `spoken` rules for every kind, EN and ES: length ≤ 280; no `\d{4}-\d{2}-\d{2}`, release codes like
  `2026-09-23.1`, "Overture", "Census PRCS", "margin of error", "±" or URLs; at most one "?";
  Spanish contains no informal *tú* forms ("puedes", "quieres", "tienes").
- Voice selection: default on first visit; Female/Male per language; FR/IT/DE play nothing; a 429 or
  error from `/api/speak` falls back to the browser voice.
- `/api/speak` accepts only the four voice ids.
- The overlay test above. Then the live check: Carlos on a phone.

## Out of scope

The Deepgram voice agent (spoken back-and-forth), paid listening, model-rephrased speech (a later
upgrade once the in-app agent is on), and speech for French, Italian and German.

## Risks

- English voices may mispronounce Spanish place names (Mayagüez, Bayamón). The audition lines include
  two town names so Carlos hears it before choosing.
- Unknown Deepgram credit: the 40,000-character cap bounds a bad day at about $1.20.

## Effort

About one session after sign-off: audition, voices and menu, spoken script, overlay, tests.
