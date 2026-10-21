// Streams a spoken Spanish question (raw 24 kHz PCM from Deepgram TTS) through /api/listen
// and prints what Deepgram heard.
// Needs the server running: `npm run eagle`. Usage: node scripts/check-listen-relay.mjs [port]
import WebSocket from "ws";

const port = process.argv[2] || process.env.PORT || 4173;
const base = `http://127.0.0.1:${port}`;
const wav = Buffer.from(await (await fetch(`${base}/api/speak`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ text: "Quiero abrir un restaurante en Mayagüez, cerca de Cabo Rojo.", voice: "aura-2-selena-es" }),
})).arrayBuffer());
// /api/speak returns a 24 kHz linear16 WAV. Drop the 44-byte header and say the format.
// Deepgram ends a turn on silence, so 1.5 s of it follows, as a live microphone would send.
const audio = Buffer.concat([wav.subarray(44), Buffer.alloc(24000 * 2 * 1.5)]);
// Same-origin only: the relay refuses upgrades whose Origin is not the page itself.
const socket = new WebSocket(`ws://127.0.0.1:${port}/api/listen?lang=es&encoding=linear16&sample_rate=24000`, { headers: { origin: `http://127.0.0.1:${port}` } });
const finals = [];
const done = setTimeout(() => socket.close(), 12000);
socket.on("open", async () => {
  for (let at = 0; at < audio.length; at += 8000) {
    socket.send(audio.subarray(at, at + 8000));
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
});
socket.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  const text = msg.channel?.alternatives?.[0]?.transcript;
  if (msg.type === "Results" && msg.is_final && text) finals.push(text);
  if (finals.length && (msg.type === "UtteranceEnd" || msg.speech_final)) {
    clearTimeout(done);
    socket.close();
  }
});
socket.on("close", (code) => {
  console.log(`closed ${code} · heard: ${finals.join(" ") || "(nothing)"}`);
  process.exit(finals.length ? 0 : 1);
});
