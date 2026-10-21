# Spec: the evidence drawer on every agent answer (plan item 2)

October 14, 2026. From `FIRST-PLACE-PLAN-2026-10-13.md` row 2, approved by Carlos as written. The
leaders in the gallery (Taste Brief, Shelfwise, Headliner) show the judge what the agent did; we only
said it in the description. This puts the trace on screen, under the answer, folded.

## What the judge sees

Under a typed or dictated answer's caption, a folded line:

    Evidence · live model · 2 tool calls · 3.1 s

Open, it lists what happened, one line per tool call, in the current language:

    town_catalog Ponce, cafe → Qloo · 14 places · catalog measured 2026-10-12 · 0.2 s
    place_details Ponce, 7f3c…9a1e → Qloo + Overture · 1 place · 0.1 s
    Model deepseek/deepseek-v4.1-flash via OpenRouter · 2 rounds · answered 2026-10-14 03:12 UTC

A rules-router answer (budget spent, visitor cap, the model did not answer) says so instead:

    Evidence · rules router · no model turn (daily model budget spent)

The drawer carries a `mode` of `model` or `rules`; `replay` is reserved for plan item 10 (instant
samples), which will fill the same drawer with the saved run's retrieval timestamps.

## What the server adds

`/api/chat` answers from the model agent get `evidence`:

- `mode: "model"`, `model` (the OpenRouter model id only, never the key), `rounds`, `ms`, `at` (ISO).
- `calls[]`, one per tool call the model made, in order: `tool`, `args` (the validated arguments, which
  are towns, categories, short queries, Qloo IDs and dates; nothing else can pass `validArgs`), `ok`,
  `ms`, and what the result carried: `source`, `count` (places or rows), `ids` (resolved Qloo IDs,
  from the result's places and the arguments), `measured` (the catalog's day) when present, and
  `error` when the tool refused or the result was dropped for size.

Fallback answers get `evidence: { mode: "rules", reason, at }`, where `reason` is the same short code
`onFallback` already logs (`budget`, `visitor-cap`, `http-429`, `no-key`, `deadline`…). Codes are fixed
strings; provider text never enters the answer. Business-flow and opportunity answers are unchanged:
they already carry their own "Sources and limits".

`opportunity_map`'s tool result adds `retrievedAt` from the saved build's `sources.qloo` so the
drawer can show when the heatmap was read.

## What the page adds

- `app/evidence.js` → `window.ZemiEvidence.html(lang, evidence)`: the `<details class="evidence">`
  block above, EN/ES, escaped; empty string for no evidence. Pure, tested in a vm sandbox.
- `showCaption(who, text, evidence)` appends the block when given; `runQuestion` and `narrate` pass
  `data.evidence`. The caption's dismiss button and scroll stay as they are; the drawer is folded by
  default so a phone sees one extra line.
- Voice-agent turns (Deepgram) are not covered in this slice: their tool calls arrive mid-stream with
  no answer boundary. Noted as a follow-up; the typed and dictated paths are what the walkthrough and
  the video show.

## What does not change

The prompt, the tools' behavior, every cap and key, the business readout, the opportunity map, the
connector. No new route.

## Acceptance

- `pnpm test` green with new tests: the agent returns `evidence` with the calls it made and no key;
  a fallback carries `mode: "rules"` and the reason; `ZemiEvidence.html` renders both modes in both
  languages and escapes tool output; the page wires the drawer into the caption.
- Locally: "cafés in Ponce" shows the folded Evidence line; open shows town_catalog with the Qloo IDs.
- Live, logged out, after deploy: same, plus the rules line when the visitor cap is hit.
