// Speech to text in the ask bar: press the mic, talk, and watch the words land in the box as you
// speak. When you stop, the text stays there to edit or send with Enter. Same relay and 16 kHz PCM
// tap as conversation mode (/api/listen → Deepgram nova-3); the browser's own recognition if the
// relay is down. The orb stays the hands-free conversation.
(function () {
  const $ = (id) => document.getElementById(id);
  const LANGS = { en: "en-US", es: "es-PR", fr: "fr-FR", it: "it-IT", de: "de-DE" };
  const lang = () => window.ZemiConverse?.voice().lang || "en";
  let session = null;

  function setListening(on) {
    const button = $("dictate");
    button.setAttribute("aria-pressed", String(on));
    button.setAttribute("aria-label", on ? "Stop dictating" : "Dictate your question");
    $("q").placeholder = on ? "Listening… speak now" : "Ask about any town, or search a place";
  }

  function stop() {
    const s = session;
    session = null;
    if (!s) return;
    try { s.ws?.send(JSON.stringify({ type: "CloseStream" })); } catch {}
    try { s.ws?.close(); } catch {}
    try { s.rec?.stop(); } catch {}
    s.tap?.disconnect();
    s.source?.disconnect();
    for (const track of s.stream?.getTracks?.() || []) track.stop();
    s.ctx?.close().catch(() => {});
    setListening(false);
    const input = $("q");
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  // Words already typed stay; what is heard is added after them, interim words shown as they come.
  function writer(s) {
    const input = $("q");
    const before = input.value.trim();
    let heard = "";
    return {
      interim(text) { if (session === s) input.value = [before, heard, text].filter(Boolean).join(" "); },
      final(text) {
        if (session !== s) return;
        if (text) heard = `${heard} ${text}`.trim();
        input.value = [before, heard].filter(Boolean).join(" ");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      },
      heard: () => heard,
    };
  }

  function browserFallback(s) {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec) {
      stop();
      return;
    }
    const out = writer(s);
    const rec = new Rec();
    s.rec = rec;
    rec.lang = LANGS[lang()] || "en-US";
    rec.interimResults = true;
    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) out.final(result[0].transcript.trim());
        else out.interim(result[0].transcript.trim());
      }
    };
    rec.onend = () => { if (session === s) stop(); };
    try { rec.start(); } catch { stop(); }
  }

  async function start() {
    if (session) return stop();
    const s = {};
    session = s;
    setListening(true);
    try {
      s.ctx = new (window.AudioContext || window.webkitAudioContext)();
      s.ctx.resume().catch(() => {});
      s.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      stop();
      $("q").placeholder = "The microphone is blocked. Allow it, or type the question.";
      return;
    }
    if (session !== s) return;
    const out = writer(s);
    try {
      await s.ctx.audioWorklet.addModule("/app/pcm-tap.js");
      s.source = s.ctx.createMediaStreamSource(s.stream);
      s.tap = new AudioWorkletNode(s.ctx, "pcm-tap", { numberOfOutputs: 0 });
      s.source.connect(s.tap);
    } catch {
      return browserFallback(s);
    }
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/api/listen?lang=${lang()}&encoding=linear16&sample_rate=16000`);
    s.ws = ws;
    let opened = false;
    s.tap.port.onmessage = (event) => { if (ws.readyState === WebSocket.OPEN) ws.send(event.data); };
    ws.onopen = () => { opened = true; };
    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      if (msg.type === "UtteranceEnd") return out.heard() && stop();
      if (msg.type !== "Results") return;
      const text = (msg.channel?.alternatives?.[0]?.transcript || "").trim();
      if (msg.is_final) out.final(text);
      else out.interim(text);
      // A finished sentence ends the dictation; the text waits in the box for Enter.
      if (msg.speech_final && out.heard()) stop();
    };
    ws.onclose = () => {
      if (session !== s) return;
      if (!opened) browserFallback(s);
      else stop();
    };
  }

  function init() {
    $("dictate").addEventListener("click", start);
    // Pressing Enter or typing Escape while dictating ends it first.
    $("q").addEventListener("keydown", (event) => { if (session && (event.key === "Enter" || event.key === "Escape")) stop(); });
  }

  window.ZemiDictate = { init, stop, active: () => Boolean(session) };
})();
