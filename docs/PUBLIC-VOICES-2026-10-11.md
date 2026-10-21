# Public release: natural voices, spoken script, opportunity map (2026-10-11)

Carlos's instruction: "max out and finish all in here, deploy and finish all pending stuff" after signing
the natural-voices spec. This release deploys the October 10–11 work that was merged but not yet live
(opportunity map, connector code with the connector OFF) plus the natural voices built today.

## Runtime and rollback

- Image `zemi-aku:voices-20261011`, ID `sha256:e1bda8bc…540e`, source `18598ec` (`main`). Built on the VM as a
  layer over `zemi-aku:business-nav-20261008` from the release archive (app, data, server, two runtime scripts).
  All 52 runtime files match the release by SHA-256.
- Tests: 252/252 locally; 251/252 inside the offline Oracle validator (the miss reads `../Dockerfile`, a
  build-file check). `pnpm audit --prod`: no known vulnerabilities.
- Only the app was recreated (`deploy/compose.yaml` + `deploy/compose.safe.yaml` + `compose.image.yaml`,
  `--env-file /opt/zemi-aku/.env`, `--no-build --no-deps`). Caddy's start time is unchanged (Oct 8).
- Runtime env: speak cap 40,000 chars/day; listen, voice agent, voice chat and chat caps 0; Qloo 600/day;
  MCP off (150/day, 200 reserve when on); photoreal off; AIS on; UID 1000; **Deepgram and OpenRouter keys
  absent**. `cache/opportunity` (six industries) copied to the host cache and owned by 1000:1000.
- Rollback: `/opt/zemi-aku/voices-rollback-20261011` holds the previous `compose.image.yaml`, overlay and
  `.env` (mode 600) with a README restore command. Older rollbacks are retained.

## Verification

- Public: `/api/voices` 200 (`speechEnabled:false`, default `aura-2-andromeda-en`), `/api/opportunity?industry=bakery`
  200 with 78 towns, `?industry=gym` 400, `POST /mcp` 404, private paths 404, HSTS and `DENY` present,
  `/api/speak` 502 without a key (the page never calls it in device-voice mode).
- `node scripts/check-demo.mjs https://zemi.r21digital.com --journeys`: 0 failed probes; Bad Bunny 10, Vico C 10,
  Obie Bermúdez 9.
- Spoken lines live: "Maunabo's a small one. A handful of restaurants show up in Qloo, and other map data counts a
  couple dozen across town. Want to see who's nearby?" · "Aquí el gusto por panadería es fuerte y hay pocos
  negocios. Toque un pueblo para ver más." · "Lajas es pequeño. En Qloo no aparecen tiendas, pero otros datos del
  mapa cuentan como cincuenta en todo el pueblo. ¿Quiere ver quién está cerca?"
- Browser (Playwright Chromium, logged out): menu Female / Male, button "EN · Zira", note "Your device's voice for
  now."; Spanish labels and note; zero console errors. Screenshot `evidence/natural-voices-public-menu.png`.
  Machine-readable: `evidence/natural-voices-public-20261011.json`.

## Incident during the swap

The release archive's root `compose.yaml` is the local-dev file. It was copied over the VM's root `compose.yaml`
and used once, which started a stray project `zemi-aku` with a second app container (no published port, not
routed by Caddy) for about a minute. It was removed, the network deleted, and the live project recreated from
`deploy/compose.yaml`. The root `compose.yaml` on the VM is unused; `DEPLOYMENT.md` now says so.

## Deepgram key added (October 11, evening)

Carlos instructed the agent to place the key already saved in the project `.env` ("get it done"), overriding the
"added by Carlos" note above. Steps: key shape and a real `/v1/projects` read and `/v1/speak` call verified
locally (HTTP 200, audio); `.env` backed up to `.env.before-deepgram-20261011` (600); one line appended over SSH
stdin via a script; only the app recreated with `-p zemi-aku-demo` on the three deploy files; the stray BOM the
PowerShell pipe added was stripped before the recreate succeeded. Caddy untouched.

Verified: `/api/voices` → `speechEnabled:true`, four voices (Andromeda, Arcas, Selena, Aquila),
`listeningEnabled:false`; container env has the key, speak cap 40,000, listen/chat/voice caps 0, MCP 0,
Qloo 600, photoreal 0, no OpenRouter key. Public `POST /api/speak` returns `audio/wav` (RIFF) for Selena (es)
and Andromeda (en); an unknown voice id falls back to the default by design. Logged-out Chromium: button reads
"EN · Andromeda", menu note "Voices by Deepgram. Past the daily limit, your device's voice takes over.", zero
console errors.

⚠️ Exposure: Compose's first, failed attempt echoed the env line including the key value into the agent's
terminal output. Carlos's instruction for this project is to delete all keys when it ends; rotating this one
in the Deepgram console earlier is his call.

## Boundaries

Deployed: natural voices (Deepgram live as of the evening of October 11), spoken script, Female / Male menu, opportunity
map, connector code (off). Not deployed or done: the OpenRouter key
swap and the in-app model agent, Cesium extension, a real-phone check, the hosted connector (needs Qloo's written
OK), repository flip and Devpost. Voices were chosen from Deepgram's descriptions, not by ear.
