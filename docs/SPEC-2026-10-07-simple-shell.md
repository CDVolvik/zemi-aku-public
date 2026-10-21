# Spec addendum — the simple shell (three steps, one ask bar, calm map)

**Approved by Carlos on 2026-10-07 (option A)** after a design critique: the page felt clumsy because
six floating boxes, three voice buttons, two chats and one long scrolling panel all competed, and the
copy read like a debug log. No feature is removed; each one moves to where it is needed.

## Layout

| Surface | What it holds |
|---|---|
| Top left | The name only. |
| Top right | One map button: the four map styles and the three themes in a small menu. |
| Island (no town open) | A centered line, "Ask about any town in Puerto Rico", and three suggestions above the ask bar. No panel. |
| Panel, left (bottom sheet on phones) | Exactly one step at a time, with a breadcrumb: **Puerto Rico › Town › Business**. |
| Bottom center | The ask bar: one input for search and questions, the orb on its right, a voice button (language and voice, Pause and End while talking). The orb's words show as a caption above the bar. |

## Steps

1. **Island.** Hovering a town lights it and names it. Clicking opens step 2.
2. **Town (or a list such as "Mofongo in Puerto Rico").** A plain line about how well Qloo knows the
   town, the answer's sentence when there is one, then one list of places with the answer's places
   first. Taste buttons (All places / Restaurants), Compare, and a folded "Sources" (the record, the
   brief, Wikipedia) sit under the list.
3. **Business.** The dossier, alone. Its taste footprint is the only extra map layer.

The panel slides between steps (about 220 ms, ease-out; reduced motion keeps only the fade). Loading
shows placeholder cards, not "Loading…".

## Map

- The town shapes are flat, quiet fills (no extruded blocks). Well-known and thin towns keep their two
  colors, softer. The open town is outlined in white.
- Restaurant heat shows only with the Restaurants taste. The footprint shows only on a business.
- No coordinate readout and no legend bar; the panel says what a color means when it matters.

## Words

Plain sentences in place of engineer labels. "Strong. 5 of 5 places mention this town" becomes
"Qloo knows Ponce well." "Watching Ponce. 80 Qloo restaurant-heat cells…" is gone. Popularity scores
and "Hide" buttons leave the cards; the numbers stay in Sources.
