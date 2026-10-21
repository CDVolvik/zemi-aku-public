# Spec: the decision journey as the default path (plan item 1)

October 13, 2026, night. From `FIRST-PLACE-PLAN-2026-10-13.md` row 1, approved by Carlos as written.
Built the same night; this records what "default path" means in the page so the walkthrough, the video
and the submission can describe one thing.

## What changes

1. **The island hero asks the decision question.** The headline becomes "Where should I open a business
   in Puerto Rico?" (ES: "¿Dónde abro un negocio en Puerto Rico?") with six industry chips under it
   (Cafés, Bakeries, Restaurants, Bars, Hotels, Salons); one tap opens the opportunity map. The artist
   chips stay under a smaller "Or start with an artist" line, and the missions stay under them. Music is
   the on-ramp, not the headline. Hero copy follows the voice language and re-renders when it changes.
2. **Ships and Ports move behind the layers button.** The left rail (`#explore-nav`) becomes an
   "Explore" section of the map menu (Places / Ships / Ports); picking one closes the menu. With the rail
   gone, the detail, coastal and opportunity panels sit at the page's 16 px edge on desktops and the
   ask bar's free-map centring shifts by the same 84 px.
3. **A town readout reached through the decision shows the second turn.** Under the Qloo-and-Census
   section the readout gets a "Change the question" row: the six industries (the current one pressed;
   a tap re-asks "Should I open a <industry> in <town>?" in the current language, so the judge sees
   the tools re-run) and "Compare towns on the map" (reopens the colored island for that industry).
   "Nearby competitors" (the 3 km peers) stays in the existing Research details row.
4. **The "Try one" chips lead with the decision**: "Where to open a bakery" first, "Open a restaurant in
   Ponce" second, so a phone's two visible chips are both decision chips.

## What does not change

Missions, the artist journey, the front page (`home.html` and its Fig. 1 embed), the connector, the agent
prompt, every cap and key. No new call, route or file beyond markup, CSS and the helpers below.

## Helpers (tested)

- `ZemiOpportunity.industryChips(lang, { attr, current })` → six `<button>`s with `attr="<id>"`, plural
  labels in the language, `aria-pressed` on the current one.
- `ZemiOpportunity.townQuestion(lang, industry, town)` → the exact town question the map already asks,
  shared by the map's gap list and the readout's re-ask row.

## Acceptance

- Logged out on the live site: the first screen reads the decision headline; tapping Bakeries colors
  the island; tapping a gap town opens the readout with Qloo, Overture and Census sections; tapping
  Restaurants in the readout re-asks for the same town; "Compare towns on the map" brings the map back;
  the map menu lists Places / Ships / Ports and Ships still opens the coastal panel.
- A phone (390 px) shows the headline, six chips and two "Try one" chips without overlap.
- Spanish: the hero reads in Spanish when the voice is Spanish; the re-ask uses "¿Debo abrir…?".
