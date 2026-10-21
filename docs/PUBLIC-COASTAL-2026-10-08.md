# Public coastal demo — October 8, 2026

Carlos approved **Ship the coastal demo** on the existing free Oracle VM, retaining zero
paid model/speech caps. The coastal slice is deployed at **https://zemi.r21digital.com/app**.
The repository remains private; no Git push, repository publication or Devpost submission
was performed.

## Runtime and rollback

- Healthy image `zemi-aku:coastal-20261008`, image ID
  `sha256:157444d5a8c76cc2f55a2b2eed268989781e932da7c9354b268f4856ff80563c`.
  Source implementation through local commit `3dd82d2`; the layered build reused the
  deployed image and existing dependencies. Build context contained only the coastal files.
- Exactly the Zemi app container was replaced. Caddy kept its existing image, certificate
  and uptime; n8n, Oracle resources and DNS were untouched. No paid resource was added.
- Runtime UID 1000, writable existing cache, no published app port; HTTPS enters through
  Caddy. All seven changed runtime file SHA-256 hashes match local source.
- `AISSTREAM_API_KEY` was transferred privately through verified SSH to this isolated VM.
  Its `.env` remains mode 600. AIS is enabled; incoming temporary key files were removed.
  No paid key or unrelated credential was transferred.
- Actual container checks confirm blank OpenRouter/Deepgram keys, all five paid caps zero,
  photo flag zero, Qloo cap 600/day and AIS enabled. The Qloo counter is process-local;
  restarting resets it. It is not a persistent aggregate quota guarantee.
- The previous image, `.env.before-coastal-20261008`, `compose.image.before-coastal.yaml`
  and `compose.safe.before-coastal.yaml` remain on the same host for rollback.
  Restore those two Compose files and the private env, preserve env mode 600, then run
  Compose with the base/safe/image files using `up -d --no-build --no-deps app`.
  Keep the existing cache and Caddy volumes. Do not run a second app process.

## Public verification

- A **91-second public API observation received two recent vessels**, both with source
  timestamps. The feed remained connected after authentication. No declared-destination
  reports arrived in the sample; this verifies some reception, not full regional coverage.
- All five selected ports returned 12 actual saved Qloo places within 5 km; invalid port
  input returned 400. The Ships response contains no key and only the approved fields.
- Chrome: real vessel ITS AMAZING → geographically nearby Mayagüez port → Food → 12
  cached Qloo restaurant records. The UI distinguishes geographic proximity from the
  unknown declared destination and does not generate routes, arrivals or ETAs.
- Chrome: San Juan port + Bad Bunny → four actual Qloo taste affinities → Puerta de la
  Bandera place card → visibly rendered OSM 3D building geometry. Audience affinity and
  straight-line-distance limits remain visible.
- Public HTTPS validates normally with TLS 1.3 and the existing January 6, 2027 certificate.
  HTTP redirects 308; HSTS, nosniff, DENY framing and strict-origin referrer headers pass.
- `/.env`, `/.git/config`, `/cache/catalog/san-juan.json`, `/server/ships.mjs` and
  unauthenticated `/api/testers.csv` return 404.
- Speech 429, listening WebSocket 429, Voice Agent WebSocket 503/status disabled;
  seven invalid signup probes return six 400s then 429, without storing a signup.
- **136 local tests pass**. Independent Astra review closed the original coastal findings,
  terrain recovery and Docker credential-resolution changes. The T3 Claude coastal review
  failed at its provider rate limit, and is not represented as completed.

Evidence: [host assertions](evidence/coastal-public-host.json),
[public API observation](evidence/coastal-public-api.json),
[HTTPS and refused paid endpoints](evidence/coastal-public-https.json),
[live Ships](evidence/coastal-public-ships.png),
[food ashore](evidence/coastal-public-food.png),
[artist affinities](evidence/coastal-public-affinity.png),
[visible OSM 3D](evidence/coastal-public-3d.png).
These artifacts contain no provider credential values or signup records.

## Limits that remain

AIS is an event-driven free feed; reception can be incomplete. No static voyage report
arrived in either bounded sample, so live destination matching is still unverified.
Harbor points are a five-port geographic selection, not terminal entrances or a complete
port directory. Nearby places are ranked by distance unless an artist affinity is requested.
They are not walking directions or a forecast of demand.

The OpenRouter replacement, real full speech, real-phone check, hosted MCP, TestFlight
delivery/binary, Cesium judging-period validity/scope and final submission gates remain
as recorded in [the public artist demo](PUBLIC-DEMO-2026-10-08.md).
