# Public business research and free voice release

Carlos approved deployment with “yeah deploy and lets make sure all we work is fully deploy and max out.” This followed the concrete review of business research and the earlier free voice improvements, with paid model/speech caps retained at zero. The complete reviewed runtime is now live at **https://zemi.r21digital.com/app**.

## Runtime and rollback

- Final image `zemi-aku:business-nav-20261008`, ID `sha256:0a626ecc218b032410a132b4aadd311aad5d2995c87f8100c5317dc6582331f5`, implementation source through `6fcafc4`. The initial business release was `f993396`, image `zemi-aku:business-20261008`; its evidence is preserved below.
- All **46 tracked runtime files** under app/data/server and the two runtime scripts match the release manifest. The image includes the whole approved source, including earlier business buying, conversation copy, voice picker and Google US English preference changes. Dependencies are unchanged from the reviewed coastal base.
- All **169 tests pass inside an offline validator container on Oracle**, as well as locally. The validator runs tests only; it is not a second app server.
- Only the app service was recreated. Caddy's container identity/start time, certificates, runtime environment and persistent mounts are unchanged. No DNS, Oracle resource, n8n, paid service or unrelated application change.
- Actual runtime checks confirm UID 1000, writable cache, no project `.env` baked into the image, blank OpenRouter/Deepgram keys, all five paid caps zero, photo flag zero, Qloo 600/day and server-only AIS enabled. The app has no published port; Caddy owns HTTPS. The host `.env` remains mode 600.
- Final rollback lives at `/opt/zemi-aku/navigation-rollback-20261008`: prior business runtime archive, image/safe Compose files and private env. The earlier `/opt/zemi-aku/business-rollback-20261008` and coastal image are also retained. Restore those files, retain caches/certificate volumes, and recreate only the app with `--no-build --no-deps app`. Do not launch a second app server.

The independent read-only Astra helper review identified a verification/rollback gap before deployment: a generic healthy container could be accepted before source/security checks. Effective Compose settings are now preflighted, and source hashes, paid-zero/blank keys, private ports, UID, env absence/mode and preserved mounts are checked inside the rollback-protected deployment. The reviewer closed the issue and reported no remaining actionable blocker in scope.

## Final navigation correction and verification

Final Chrome verification reproduced a stale "Back to Mayagüez port" action after leaving coastal results for an artist journey. Three failing regressions covered home, town and catalog navigation before adding the three context-clearing lines. All 169 tests passed locally and in the offline Oracle validator, and independent read-only review found no remaining actionable blocker in this correction.

Chrome on final source `6fcafc4` verifies Mayagüez → Food → 12 Qloo places with the legitimate return button, then Puerto Rico → Bad Bunny → 10 actual artist results with the stale port action hidden. Puerta de la Bandera opens with visibly rendered OSM 3D geometry over satellite imagery. A fresh 41-second AIS observation moved from connecting/waiting to connected and received one recent timestamped vessel; no declared destination arrived.

The standard public `check-demo.mjs --journeys` command was rerun on this final release: zero failed probes, including private-path protection and all three artist journeys (10/10/9 actual results).

Final evidence: [46 runtime hashes and safeguards](evidence/business-navigation-host.json), [Chrome navigation result](evidence/business-navigation-browser.json), [AIS after final restart](evidence/business-navigation-ais.json), [final live 3D view](evidence/business-public-final.png).

## Initial business release API and Chrome verification (`f993396`)

- Café opening in Bayamón returns **15 Qloo records** and separately attributed **62 Overture café-family records**, release `2026-09-23.1`.
- Income follow-up retains café/town context and returns Census PRCS `2020–2024`, $31,354 ± $910 at 90% confidence in 2024-adjusted dollars. Bakery and town follow-ups work; Ponce has 23 Qloo bakery records. Missing town asks a clarification; malformed/unknown reference IDs are rejected or return no fabricated distances.
- Selected Coffee from 2 → nearby competitors returns **seven listed peers within 3 km**, sorted by straight-line distance. Records remain candidates to investigate, not verified currently operating competitors.
- Qloo demand/taste requests return actual music, vibe and TV affinities, with no claim of measured commercial demand. Public purchase intent retains the separate outbound sale-directory flow; 467 Bayamón records are context, not confirmed sale listings.
- Actual Chrome verified café opening → income → selected place → nearby peers, all three taste groups, Spanish Ponce bakery/income, and the Google US English selected voice/audition button. Browser voice remains device-dependent; no new human audio-quality or microphone claim.
- **OSM 3D building geometry visibly renders over satellite imagery** in the deployed place view. Google photoreal mode remains disabled.
- Chrome 390/320 px layouts have no measured horizontal overflow and approximately 44 px business button height. English and the default viewport were restored.
- All three artist API journeys still pass: Bad Bunny 10, Vico C 10, Obie Bermúdez 9 actual Qloo results. All five ports return 12 nearby Qloo places. Chrome verified **ORION → geographically nearby Mayagüez → Food → 12 saved records** after the release.
- A separate **40-second public AIS observation** remained connected with one recent, timestamped vessel and approved normalized fields. No declared destination arrived. The earlier API snapshot captured initial connecting state with zero positions; the later observation verifies reception after startup. This is not a full-coverage or destination/arrival guarantee.

Public HTTPS validates with TLS 1.3 and the existing January 6, 2027 certificate; HTTP redirects 308. HSTS, nosniff, DENY framing and strict-origin referrer policy pass. Private env/git/cache/server paths and unauthenticated tester CSV return 404. Paid speech/listen upgrades are 429, Voice Agent upgrade 503/status disabled. Invalid signup rate limiting is six 400s then 429, without storing a signup or sending mail. The standard public check-demo/journey command reports zero failed probes.

Evidence: [runtime manifest and assertions](evidence/business-public-host.json), [public API/security](evidence/business-public-api.json), [later AIS observation](evidence/business-public-ais.json), [visible 3D](evidence/business-public-3d.png), [voice selection](evidence/business-public-voice.png), [Spanish mobile](evidence/business-public-mobile.png), [live vessel](evidence/business-public-ships.png). These artifacts contain no server credential values or signup records.

## Boundaries and remaining work

This release deploys all reviewed business/free-voice/research changes and preserves the approved artist/coastal features. It does not enable paid model or Deepgram paths, publish the private repo, submit to Devpost or add a new provider. Supported business intents use the deterministic research flow and saved evidence before optional model generation.

The separately gated OpenRouter replacement, Cesium validity through judging and token-scope tightening, real microphone/phone checks, full hosted model/audio conversation, external hosted MCP, TestFlight delivery/binary and final repository/submission checks remain open. Census/Overture/Qloo evidence is source-separated; demand, profitability, asking prices and sale availability are unmeasured. Do not advertise those as completed merely because their code or fallback is deployed.
