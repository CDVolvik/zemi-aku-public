# Public artist and map demo — October 8, 2026

Carlos approved proceeding with the isolated Oracle demo. The artist journeys and map are
live at **https://zemi.r21digital.com**. This is a limited public preview: paid model and
Deepgram paths are off. The repository remains private; no Devpost submission was made.

Later October 8 update: Carlos approved and shipped the coastal slice. Read
[public coastal evidence](PUBLIC-COASTAL-2026-10-08.md) for the current image, live AIS,
port-to-Qloo checks and rollback. Paid paths remain off; the older artist deployment below
is historical evidence.

## Deployed and verified

- One app process, image `zemi-aku:public-20261008`, Node 22.23.3. Caddy terminates HTTPS;
  the app's 8080 port is not published. Previous staging containers are stopped and retained
  for rollback. n8n and other Oracle resources were not changed.
- Let's Encrypt certificate validates normally; TLS 1.3 observed, expiry January 6, 2027.
  HTTP redirects with 308. HSTS, nosniff, DENY framing and strict-origin referrer headers pass.
  Docker's published ports use forwarding, so no change to Ubuntu INPUT rules was needed.
- External `check-demo.mjs --journeys` passes: landing/map/manifest/data, private-path 404s,
  forged input rejection and real Bad Bunny/Vico C/Obie Bermúdez results (10/10/9 places).
- Chrome on the public hostname: Bad Bunny → La Placita card → visible OSM 3D buildings →
  original taste matches. Google photoreal is not offered or preloaded by the app. The
  browser token still includes the Google asset; this UI flag does not restrict that token.
- Actual hosted refusal checks: `/api/speak` 429; `/api/voice/status` disabled;
  WSS `/api/listen` 429 and `/api/voice` 503. This verifies upgrades reach the backend,
  not a successful audio conversation. Seven invalid signup attempts yield six 400s then
  429; no signup record or email was created by the probe.
- Container UID 1000, writable private cache, 78 JSON files in each catalog/Census/Overture/
  Wikidata directory. Served UI SHA-256 matches local source. Host `.env` mode 600.
  Only project Qloo and the restricted browser Cesium credentials were copied. No
  OpenRouter, Deepgram, OCI, n8n API, tester webhook or admin credentials were copied.
- App/Caddy RAM after initial checks: about 192/19 MiB of 954 MiB. This is an observation,
  not a load or latency benchmark.

Use the safe overlay for this preview:

```sh
docker compose --env-file .env -f deploy/compose.yaml -f deploy/compose.safe.yaml up -d --build
```

The deployed host also uses `-f compose.image.yaml --no-build` to select the already-built
image. That host-only file contains an image tag, no secrets. The committed safe overlay
blanks paid provider keys and sets paid caps to zero even if the env file later gains keys.
It caps Qloo at 600 calls/day and pins Caddy's verified image digest. Qloo's counter is
in memory and resets on restart; it is not a persistent quota guarantee. Runtime caches
and Caddy certificate volumes survive container replacement.

## Repair and independent review

The old `Number(env) || fallback` ignored explicit zero for speech, listening and Qloo.
Failing regressions reproduced it. `dailyCap` now preserves zero, defaults only missing/
blank values, and fails closed on invalid values. No Deepgram key was on staging, so
this bug did not enable paid Deepgram calls there. The earlier “zero caps” staging note
described intended configuration, not effective enforcement.

**121 tests pass.** Claude Sonnet 5.5 reviewed the risky slice independently (T3 task
`zemi-public-caps-review-r1-20261008`): no blocker for the stated production shape.
The review ran 120 tests before the final config regression was added.
Local implementation/evidence commit: `4b923e7`. Gitleaks 8.30.1 scanned all 55 commits
through that commit and found no detected secrets. No push or repository visibility change.

| Finding | Response |
|---|---|
| Paid safety depends on the env file | Added committed `compose.safe.yaml`; actual runtime confirms blank keys and zero caps |
| Google asset remains on the browser token | App UI/preload blocked; capability advertisement removed. Token scope tightening still needs Carlos |
| Bind mount may hide data or prevent writes | Actual UID, all four populated caches and write access verified |
| Mutable Caddy tag | Safe overlay pins the previously validated digest |
| No actual disabled endpoint tests | Outside HTTPS/WSS probes verify speech 429, listen 429 and Voice Agent 503/disabled |

Evidence: `docs/evidence/public-host-20261008.json`, `public-https-20261008.json` and
`public-music-3d-20261008.png`. These contain no provider credentials or signup records.

## Remaining work

- OpenRouter `.env` still holds the chat-exposed key ($10 total, expiry November 6).
  Replacement form is prepared in Chrome: $10 total, no reset, 90 days (January 6, 2027).
  Carlos must click Create and leave its generated dialog open under browser credential
  policy. Capture/save privately; never reuse the exposed value on the public host.
  Carlos reported creation, but Chrome's refreshed DOM and screenshot still show the
  creation form, not a generated-key dialog. No replacement was captured or saved;
  a follow-up asks for the actual button click. Do not treat a textual reply as UI evidence.
  Latest update: Carlos reports the generated key visible; Chrome page/clipboard control
  now times out even after foregrounding and an automation-only reset. No reload/close or
  credential save occurred. Await explicit PowerShell clipboard capture authorization or
  a private direct save in the project `.env`; current provider metadata remains November 6.
- Arrange Cesium validity through November 17 or later (current expiry November 7), and
  exclude the Google asset from the public token. Verify applicable third-party/free-tier
  terms; the current UI flag does not enforce asset scope or guarantee vendor quotas.
- Intentional paid-provider enablement needs a separate reviewed configuration and bounded
  real text follow-up/full speech checks. Adding a key alone cannot bypass the safe overlay.
  No real mic or phone check ran. Chrome browser speech fallback may use its vendor service.
- Public TestFlight requests are stored in the persistent private cache; its webhook/email
  delivery is not configured on this host. No TestFlight binary exists. Hosted MCP remains
  future work. These limitations must stay clear in the judge walkthrough.
- Final ownership review, repository publication and Devpost submission still need Carlos's
  explicit ship instruction. This public preview is not a claim of submission readiness.
