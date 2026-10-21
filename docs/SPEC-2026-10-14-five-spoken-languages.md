# Spec: five spoken languages (plan item 6)

October 14, 2026. From `FIRST-PLACE-PLAN-2026-10-13.md` row 6, approved by Carlos as written. French,
Italian and German visitors already got text answers from the agent and were transcribed in their
language; the page kept them silent. Deepgram Aura-2 added those languages in December 2025 at the
same price, under the same daily character cap, so the only work is choosing voices and wiring them.

## What changes

- `server/voices.mjs`: ten voices, a female and a male pair per menu language. New: Agathe / Hector
  (fr), Melia / Elio (it), Elara / Julius (de), the adult pair of each language on Deepgram's list
  (developers.deepgram.com/docs/tts-models, read October 14). `SPOKEN_LANGS` exported. `/api/speak`
  accepts the ten ids and nothing else, as before.
- `server/audition.mjs` + `scripts/voice-audition.mjs fr it de`: sixteen candidates in the three
  languages (every French and German voice Deepgram lists, eight Italian), one line each in the
  language, 3,168 characters in one run. Output `tmp/voice-audition/index.html` for Carlos to listen
  to; swapping a voice is one line in `voices.mjs`.
- `app/converse.js`: `SPOKEN` covers the five menu languages; the voice menu copy (Female / Male,
  the Deepgram note, the device-voice note) exists in each. Past the daily cap the device voice in
  that language takes over, as for English and Spanish. A language outside the menu stays silent.
- `server/spoken.mjs`: the rules router still writes English and Spanish only; its one-sentence
  French, Italian and German line now says "I have no full answer in <language> right now; here are
  the cards in English" instead of promising an agent that already exists.
- Copy: front page (#how list), judge walkthrough step 7, submission draft, README works-where.

## Quality check (local, October 14)

One agent question per language on the local server, same model and prompt: French (Bad Bunny fans
in Bayamón: three catalog places, "affinités de goût, pas des lieux liés à l'artiste"), Italian
(morning-meeting cafés in Ponce: three places with hours, the weather folded in), German (rainy
afternoon in Rincón: 70 % showers, three indoor places, the lighthouse for clear skies, weather.gov
for storms). All model answers, all in the asked language, no Markdown. `/api/speak` returned audio
for each new voice through the server's own route.

## Not done

Portuguese (not on Aura-2). Dutch and Japanese voices exist but the agent has no menu entry for
them; adding a language is `checkChat`'s list, `LANG_TAGS`, `renderPicker`'s list and a voice pair.
The audition is generated, not listened to: Carlos's ear picks the final six.

## Acceptance

- Tests: ten voices with the five languages and two genders; the audition set has every language's
  line; converse chooses a Deepgram voice for `fr`, the device voice when speech is off, silent only
  outside the menu; the rules router's three lines match the new wording.
- Live, logged out: the voice menu in Français shows "Voix féminine / Voix masculine" and the
  Deepgram note; a French question is answered in French and read aloud by Agathe.
