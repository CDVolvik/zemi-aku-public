# Voice Agent: private demo implementation

The orb uses Deepgram Voice Agent when `ZEMI_PUBLIC_URL` names the app's public HTTPS
origin and both project keys are present. Without that URL, it keeps the existing
listen → text chat → speech loop. **Public since October 12, 2026** on zemi.r21digital.com
(`deploy/compose.safe.yaml`: 240 agent minutes, 360 listening minutes, 300,000 spoken
characters and a $1 voice model share of a $2 chat day; raised the same evening so a judging
day cannot hit them), on Carlos's instruction to spend the
Deepgram credit on a fluent conversation.

## Data flow and the budget boundary

1. The browser sends 16 kHz mono PCM to the same-origin `/api/voice` WebSocket.
2. The server authenticates to Deepgram and sends the selected Nova-3 language,
   Aura-2 voice, greeting and the shared read-only tool definitions. Credentials and
   configuration never go to the browser.
3. Deepgram's think requests go to `/api/voice/think` on the configured public origin.
   Each connection has a random, short-lived bearer token. It expires with that
   connection. The OpenRouter key stays on the app server.
4. The proxy pins DeepSeek V4 Pro, 1,200 output tokens, a 48 KB request boundary and
   eight model requests per session. It shares text chat's persisted $1/day default
   ledger. Rejected generation refunds its reservation; ambiguous failures retain it.
   A separate persisted voice model sub-cap defaults to $0.50/day inside that shared
   allowance, so unknown voice charges cannot consume the entire default text budget.
   Tool follow-ups restore provider-owned reasoning metadata only for matching call IDs,
   function names and argument strings; formatting-only fields such as SSE `index` are ignored.
   incoming reasoning fields are stripped. See [OpenRouter's protocol guidance](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens#preserving-reasoning).
5. Function requests execute in the server registry. Only validated handlers emit
   map actions. Cancelled functions cannot send late results; deadlines return a
   safe error. Functions defer until the user's turn is confirmed.
6. Deepgram returns 24 kHz raw PCM and sanitized conversation events. The browser
   queues playback, clears it on interruption, and applies committed map actions in order.
   PCM split across frames retains its trailing byte. Playback is shortened at 90 seconds
   of queued audio; excess audio is dropped until the answer finishes, without ending the session.

This adds one server hop to the think stage. Sending the OpenRouter key directly to
Deepgram would bypass the application's daily ledger and token limit. A session token
lets Deepgram use the model through those controls without holding that provider key.
The HTTP proxy returns OpenAI-style JSON or SSE after the bounded provider request;
it buffers a completion before sending it, so live latency still needs measurement.

## Limits and controls

- One session per visitor IP, three total, four starts/minute per IP, ten minutes/session
  (`maxSeconds: 600` in `scripts/serve-eagle.mjs`; the module default is five).
- `ZEMI_VOICE_MINUTES_PER_DAY=120` by default; zero disables Voice Agent sessions.
  Reserve the full session duration before connecting; settle elapsed time on close.
  The duration ledger survives restarts. A crash keeps its conservative reservation.
- `ZEMI_CHAT_USD_PER_DAY=1` covers text and voice model calls together; zero disables
  both. The provider's dedicated $10 total key limit is an additional control.
- `ZEMI_VOICE_CHAT_USD_PER_DAY=0.5` additionally limits voice model calls; zero prevents
  those calls. Both ledgers reserve before a request and settle known costs/rejections.
  Aborted calls with unknown billing retain reservations in both. Keep `voice-spend.json`
  together with the shared `spend.json`; do not erase either to bypass a cap.
  Voice availability checks model and duration capacity before opening Deepgram. An exhausted,
  zero or invalid cap keeps the browser on standard listening; an upgrade rechecks capacity.
- Four function calls per batch, 32/session, 20-second tool/model deadlines. Slow
  sockets and audio queues are bounded. Browser Settings and arbitrary provider
  messages are never forwarded.
- Pause stops sending microphone audio and clears/discards playback. Committed map actions
  wait for Resume; interrupting speech does not discard them. Function batches travel together,
  and a later same-town flight preserves an open business card.
  It retains the provider conversation. An already-running turn may finish at the
  provider; elapsed session time still counts while paused. Stop closes the socket,
  microphone tracks and playback. A failure resumes the standard listener.
- Changing the selected voice waits for the old WebSocket to close before starting another
  session, with one bounded handshake retry. Stop cancels a pending retry. Abandoned think
  HTTP responses abort the model request. A valid new request supersedes an unfinished one;
  the old request returns an empty completion, preventing stale speech or a protocol error.
  Reaching a limit/failing the session retains a visible explanation and asks the visitor to
  repeat the question through the standard listener. Audio setup failure allows another tap.
  The explanation is displayed once, so later standard-listener reconnects do not repeat it.
- Exactly one app process; persistent `cache/agent` is required. Trust proxy headers
  only behind the prepared Caddy container, with no public app port.

## Verification and remaining checks

Offline tests exercise real local WebSockets with fake provider I/O: think-token
authentication/revocation, rejected browser configuration, bounded tools, cancellation,
timeouts, budget accounting, real HTTP-disconnect cancellation, frontend pause/resume/fallback,
voice-change connection/retry ordering, provider metadata restoration, persistent voice budget
isolation, superseding requests, audio setup recovery, map/card preservation and PCM boundaries.
The actual project Deepgram key accepted English and Spanish settings in a short
probe. That probe sent no audio and made no model requests.
Three independent review rounds completed. The final reviewer found no new proven defects;
its formatting/cache concern and two smaller UX/availability findings were then addressed
with regressions. **98 offline tests pass.** These final small responses have not had another
independent review round; do not treat offline verification as live readiness.

The full microphone → Deepgram → hosted think proxy → tool → speech path has **not**
run. It needs the isolated host, Carlos's DNS and Caddy HTTPS. Then check all ten
voices, natural barge-in, two visitor IPs, session/daily caps, tool calls, fallback,
latency and a real iPhone. Confirm Deepgram preserves model tool-call IDs and accepts an empty
superseded completion; validate the retry behind Caddy. Do not expose a local tunnel as a substitute for hosting.

Protocol references: [configuration](https://developers.deepgram.com/docs/configure-voice-agent),
[function requests](https://developers.deepgram.com/docs/voice-agent-function-call-request),
[function responses](https://developers.deepgram.com/docs/voice-agent-function-call-response),
[cancellation](https://developers.deepgram.com/docs/voice-agent-function-call-cancelled).
