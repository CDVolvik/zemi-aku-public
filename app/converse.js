// Conversation mode: the wisp listens, answers from the map's records, speaks, and listens again.
// Listening goes through the server relay (/api/listen → Deepgram nova-3). If the relay cannot
// open, the browser's own speech recognition takes over in the same language.
// Needs window.ZemiApp (index.html): ask, say, speak, stopSpeaking, unlockAudio, outputLevel.
(function () {
  const GENDER_STORE = "zemi-voice-gender";
  const LANG_STORE = "zemi-voice-lang";
  const SPOKEN = new Set(["en", "es", "fr", "it", "de"]); // every menu language is spoken since 2026-10-14
  const MENU = {
    en: { female: "Female", male: "Male", note: "Voices by Deepgram. Past the daily limit, your device’s voice takes over.", device: "Your device’s voice for now." },
    es: { female: "Voz femenina", male: "Voz masculina", note: "Voces de Deepgram. Pasado el límite diario, habla la voz de su dispositivo.", device: "Por ahora, la voz de su dispositivo." },
    fr: { female: "Voix féminine", male: "Voix masculine", note: "Voix par Deepgram. Au-delà de la limite quotidienne, la voix de votre appareil prend le relais.", device: "La voix de votre appareil pour l’instant." },
    it: { female: "Voce femminile", male: "Voce maschile", note: "Voci di Deepgram. Oltre il limite giornaliero, parla la voce del suo dispositivo.", device: "Per ora, la voce del suo dispositivo." },
    de: { female: "Weibliche Stimme", male: "Männliche Stimme", note: "Stimmen von Deepgram. Nach dem Tageslimit übernimmt die Stimme Ihres Geräts.", device: "Vorerst die Stimme Ihres Geräts." },
  };
  const LANG_TAGS = { en: "en-US", es: "es-PR", fr: "fr-FR", it: "it-IT", de: "de-DE" };
  const IDLE_NOTE = "Choose a voice, then tap the orb to talk.";
  const STATE_LABELS = { off: "", listening: "Listening", thinking: "Thinking", speaking: "Speaking", paused: "Paused" };
  const $ = (id) => document.getElementById(id);
  const app = () => window.ZemiApp;
  const fold = (s) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  let voices = []; // Deepgram voices the server offers; empty when speech is off or capped
  let listeningEnabled = false; // server relay listening; the browser's own recognition otherwise
  let lang = "en";
  let gender = "female";
  let wisp = null;
  let mode = "off"; // off | listening | thinking | speaking | paused
  let stream = null;
  let micCtx = null;
  let micAnalyser = null;
  let socket = null;
  let micSource = null;
  let tap = null;
  let tapReady = null;
  let sending = false;
  let rec = null;
  let meterTimer = 0;
  let drops = 0;
  let heard = "";
  let spokenText = "";
  let turnToken = 0;
  let agentMode = false;
  let player = null;
  let outputAnalyser = null;
  let mapQueue = Promise.resolve();
  let pausedMapActions = [];
  let starting = false;
  let startToken = 0;
  let fallbackNote = "";
  let waveBars = [];

  // The voice for (language, gender): Deepgram when the server offers it, the device voice as the
  // silent fallback, and nothing at all for a language outside the menu.
  function voice() {
    if (!SPOKEN.has(lang)) return { id: `silent-${lang}`, lang, gender, silent: true, name: "" };
    const hit = voices.find((v) => v.lang === lang && v.gender === gender) || voices.find((v) => v.lang === lang);
    if (hit) return hit;
    const device = browserVoice({ lang, gender });
    return { id: `browser-${lang}`, lang, gender, browser: true, voiceURI: device?.voiceURI || "", name: device?.name || "" };
  }

  function browserVoice(selected) {
    const list = window.speechSynthesis?.getVoices() || [];
    const matches = list.filter(v => v.lang.split(/[-_]/)[0] === selected.lang);
    // Carlos auditioned and chose Google US English. Web Speech has no gender field;
    // show actual voice names and retain explicit selections over the preferred default.
    const preferred = matches.find(v => v.lang === "en-US" && v.name === "Google US English") ||
      matches.find(v => /\bfemale\b/i.test(v.name)) ||
      matches.find(v => /\b(zira|hazel|samantha|victoria|karen|moira|tessa|monica|paulina|helena|sabina)\b/i.test(v.name));
    // Device voices carry no gender field; a Male choice looks for a name that says so.
    const male = selected.gender === "male" ? (matches.find(v => /\bmale\b/i.test(v.name) && !/female/i.test(v.name)) ||
      matches.find(v => /\b(david|mark|george|daniel|alex|diego|jorge|juan|pablo|raul|carlos|fred|aaron|guy|ryan|james|thomas|enrique|alvaro|andres)\b/i.test(v.name))) : null;
    return matches.find(v => v.voiceURI === selected.voiceURI) || male || preferred || matches.find(v => v.default) || matches[0] || null;
  }

  function status(text) {
    const el = $("talk-status");
    el.textContent = text || "";
    el.hidden = !text;
  }

  function listenNote() {
    return "Listening. Speak, and I answer when you pause.";
  }

  function setMode(next, note) {
    mode = next;
    wisp?.setState(next === "off" ? "idle" : next);
    $("talk").dataset.mode = next;
    $("talk-pause").textContent = next === "paused" ? "Resume" : "Pause";
    $("talk-pause").hidden = next === "off";
    $("talk-stop").hidden = next === "off";
    $("talk-preview").disabled = next !== "off";
    const label = note === "Connecting the microphone…" ? "Connecting" : STATE_LABELS[next];
    $("voice-state").textContent = label;
    $("voice-state").hidden = next === "off";
    $("voice-wave").hidden = next !== "listening" && next !== "speaking";
    $("wisp-button").dataset.mode = next;
    $("wisp-button").setAttribute("aria-label", next === "off" ? "Talk with Zemi-Aku" : `${label}. ${next === "paused" ? "Resume talking" : "Talk with Zemi-Aku"}`);
    if (note !== undefined) status(note);
  }

  async function loadVoices() {
    try {
      const config = await (await fetch("/api/voices")).json();
      voices = config.speechEnabled === false ? [] : (config.voices || []);
      listeningEnabled = config.listeningEnabled === true;
    } catch {
      voices = []; listeningEnabled = false;
    }
    restoreChoice();
    renderPicker();
  }

  // The saved language and gender, read before anything renders (judge panel 10/23: the first screen
  // read the default "en" because the saved value arrived only after /api/voices answered). With
  // nothing saved, a browser set to Spanish starts in Spanish.
  function restoreChoice() {
    if (/^es\b/i.test(navigator.language || "")) lang = "es";
    try {
      const saved = localStorage.getItem(GENDER_STORE);
      if (saved === "female" || saved === "male") gender = saved;
      const savedLang = localStorage.getItem(LANG_STORE);
      if (Object.hasOwn(LANG_TAGS, savedLang)) lang = savedLang;
    } catch {}
  }

  function renderPicker() {
    const langs = Object.entries({ en: "English", es: "Español", fr: "Français", it: "Italiano", de: "Deutsch" });
    $("talk-lang").innerHTML = langs
      .map(([code, name]) => `<option value="${code}"${code === lang ? " selected" : ""}>${name}</option>`)
      .join("");
    const copy = MENU[lang] || MENU.en;
    $("talk-voice").innerHTML = ["female", "male"]
      .map((g) => `<option value="${g}"${g === gender ? " selected" : ""}>${copy[g]}</option>`).join("");
    $("talk-voice").disabled = !SPOKEN.has(lang);
    $("talk-voice-name").textContent = !SPOKEN.has(lang) ? "" : voices.some((v) => v.lang === lang) ? copy.note : copy.device;
  }

  // Changing the language or the voice while talking reconnects once the old connection has closed.
  function choose(nextLang, nextGender) {
    const langChanged = nextLang !== lang;
    lang = nextLang;
    gender = nextGender === "male" ? "male" : "female";
    try { localStorage.setItem(GENDER_STORE, gender); localStorage.setItem(LANG_STORE, lang); } catch {}
    renderPicker();
    if ((langChanged || agentMode) && mode !== "off") return restartListening();
  }

  function rms(analyser) {
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const value of buf) sum += value * value;
    return Math.sqrt(sum / buf.length);
  }

  function meter() {
    if (!wisp) return;
    const level = mode === "listening" ? (micAnalyser ? rms(micAnalyser) : 0)
      : mode === "speaking" ? (agentMode && outputAnalyser ? rms(outputAnalyser) : app().outputLevel()) : 0;
    wisp.setLevel(level);
    waveBars.forEach((bar, index) => { bar.style.transform = `scaleY(${0.18 + Math.min(1, level * 12) * [0.55, 1, 0.75, 0.45][index]})`; });
  }

  // The mic goes out as 16 kHz PCM from an AudioWorklet (pcm-tap.js), the same in every browser.
  async function openTap() {
    if (!tapReady) tapReady = micCtx.audioWorklet.addModule("/app/pcm-tap.js");
    await tapReady;
    if (!micSource) return;
    tap = new AudioWorkletNode(micCtx, "pcm-tap", { numberOfOutputs: 0 });
    tap.port.onmessage = (event) => {
      if (sending && socket?.readyState === WebSocket.OPEN) {
        if (socket.bufferedAmount > 1 << 20) { if (agentMode) fallbackAgent(); else closeSocket(); return; }
        socket.send(event.data);
      }
    };
    micSource.connect(tap);
  }

  function closeSocket() {
    sending = false;
    pausedMapActions = [];
    if (socket) {
      socket.onclose = null;
      socket.onmessage = null;
      socket.onerror = null;
      try { socket.close(); } catch {}
    }
    socket = null;
  }

  function connect() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    let opened = false;
    const ws = new WebSocket(`${proto}://${location.host}/api/listen?lang=${voice().lang}&encoding=linear16&sample_rate=16000`);
    socket = ws;
    ws.onopen = () => {
      opened = true;
      sending = mode !== "paused";
      if (sending) { setMode("listening", fallbackNote || listenNote()); fallbackNote = ""; }
    };
    ws.onmessage = (event) => {
      drops = 0;
      try { onTranscript(JSON.parse(event.data)); } catch {}
    };
    ws.onclose = () => {
      if (socket !== ws) return;
      socket = null;
      sending = false;
      if (mode === "off") return;
      drops += opened ? 1 : 3;
      if (drops >= 3) startBrowserRecognition();
      else connect();
    };
  }

  function fallbackAgent() {
    if (!agentMode || mode === "off") return;
    closeSocket(); player?.clear(); turnToken += 1; agentMode = false;
    fallbackNote = "The voice agent session ended. Repeat your question to continue with standard listening.";
    status(fallbackNote);
    connect();
  }

  function connectAgent(retries = 0) {
    agentMode = true;
    let applied = false;
    const my = startToken;
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const params = new URLSearchParams({ voice: voice().id, ...app().context() });
    const ws = new WebSocket(`${proto}://${location.host}/api/voice?${params}`);
    socket = ws; ws.binaryType = "arraybuffer";
    ws.onmessage = async event => {
      if (socket !== ws || mode === "off") return;
      try {
        if (mode === "paused" && event.data instanceof ArrayBuffer) return;
        if (event.data instanceof ArrayBuffer) {
          const complete = player.push(event.data);
          setMode("speaking", complete === false ? "The answer was shortened. Ask for more detail after it finishes." : ""); return;
        }
        const msg = JSON.parse(event.data);
        if (msg.type === "SettingsApplied") applied = true;
        if (msg.type === "MapActions") { queueMapActions(ws, msg.actions); return; }
        if (msg.type === "VoiceError") { fallbackAgent(); return; }
        if (mode === "paused") {
          if (msg.type === "SettingsApplied") ws.send(JSON.stringify({ type: "Pause" }));
          return;
        }
        if (msg.type === "SettingsApplied") { sending = true; setMode("listening", listenNote()); }
        else if (msg.type === "VoiceError") fallbackAgent();
        else if (msg.type === "UserStartedSpeaking") {
          turnToken += 1; player.clear(); app().stopSpeaking(); setMode("listening", listenNote());
        } else if (msg.type === "AgentThinking") setMode("thinking", "Thinking…");
        else if (msg.type === "AgentStartedSpeaking") setMode("speaking", "");
        else if (msg.type === "ConversationText") app().voiceText(msg.role, msg.content);
        else if (msg.type === "AgentAudioDone") {
          const token = turnToken;
          await player.done();
          if (socket === ws && token === turnToken && mode !== "paused") setMode("listening", listenNote());
        }
      } catch { fallbackAgent(); }
    };
    ws.onclose = () => {
      if (socket !== ws) return;
      if (retries > 0 && !applied && mode !== "off") {
        closeSocket();
        status("Reconnecting with the selected voice…");
        setTimeout(() => {
          if (my === startToken && agentMode && mode !== "off" && !socket) connectAgent(retries - 1);
        }, 300);
      } else fallbackAgent();
    };
    ws.onerror = () => {}; // The close event performs the bounded retry or fallback.
  }

  function queueMapActions(ws, actions) {
    mapQueue = mapQueue.catch(() => {}).then(() => {
      if (socket !== ws || mode === "off") return;
      if (mode === "paused") { pausedMapActions.push(...actions); return; }
      // applyMapActions updates the map and syncs answer cards once when the caption is Zemi's.
      return Promise.resolve(app().applyMapActions(actions, "", { reload: false })); // frames of one turn keep each other's cards
    }).catch(() => status("I couldn't update the map. Try opening the town again."));
  }

  function startBrowserRecognition() {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec) {
      stop();
      status("Live listening is down and this browser has no speech recognition. Type the question.");
      return;
    }
    rec = new Rec();
    rec.lang = LANG_TAGS[voice().lang] || "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        onTranscript({
          type: "Results",
          is_final: result.isFinal,
          speech_final: result.isFinal,
          channel: { alternatives: [{ transcript: result[0].transcript }] },
        });
      }
    };
    rec.onend = () => {
      if (rec && mode !== "off" && mode !== "paused") {
        try { rec.start(); } catch {}
      }
    };
    try {
      rec.start();
      setMode(mode === "paused" ? "paused" : "listening", "Listening with this browser's own recognition.");
    } catch {
      stop();
    }
  }

  function stopBrowserRecognition() {
    if (!rec) return;
    const old = rec;
    rec = null;
    try { old.abort(); } catch {}
  }

  async function restartListening() {
    heard = "";
    drops = 0;
    const old = socket;
    const my = ++startToken;
    const closed = old && old.readyState !== WebSocket.CLOSED
      ? new Promise(resolve => old.addEventListener("close", resolve, { once: true })) : Promise.resolve();
    closeSocket();
    stopBrowserRecognition();
    player?.clear(); turnToken += 1;
    await closed;
    if (my !== startToken || mode === "off") return;
    if (agentMode) connectAgent(1); else if (!listeningEnabled) startBrowserRecognition(); else connect();
  }

  function onTranscript(msg) {
    if (msg.type === "UtteranceEnd") {
      finishTurn();
      return;
    }
    if (msg.type !== "Results") return;
    const text = (msg.channel?.alternatives?.[0]?.transcript || "").trim();
    if (mode === "speaking") {
      // A whole sentence spoken over the wisp is a new question: answer it once it ends.
      if (text && msg.is_final && bargeIn(text) && msg.speech_final) finishTurn();
      return;
    }
    if (mode !== "listening") return;
    if (text && msg.is_final) heard = `${heard} ${text}`.trim();
    const live = (msg.is_final ? heard : `${heard} ${text}`).trim();
    if (live) status(`“${live}”`);
    if (msg.speech_final) finishTurn();
  }

  // Speaking over the wisp stops its voice. Its own voice coming back through the speakers
  // (an echo of the answer) does not count.
  function bargeIn(text) {
    const words = fold(text).split(" ").filter(Boolean);
    if (words.length < 2) return false;
    const said = fold(spokenText);
    const echoed = words.filter((word) => said.includes(word)).length / words.length;
    if (echoed > 0.6) return false;
    turnToken += 1;
    app().stopSpeaking();
    heard = text;
    setMode("listening", `“${text}”`);
    return true;
  }

  function finishTurn() {
    const question = heard.trim();
    if (mode !== "listening" || !question) return;
    turn(question);
  }

  async function turn(question) {
    heard = "";
    const my = ++turnToken;
    setMode("thinking", `“${question}”`);
    const data = await app().ask(question);
    if (my !== turnToken || mode !== "thinking") return;
    const text = data?.speech || data?.error || "";
    if (!text) {
      setMode("listening", listenNote());
      return;
    }
    app().say(text);
    spokenText = text;
    setMode("speaking", "");
    await app().speak(data?.spoken || text, voice());
    if (my !== turnToken || mode !== "speaking") return;
    setMode("listening", listenNote());
  }

  // The first time the orb opens, it says hello and asks what the visitor is after, in the chosen
  // language. Speaking over it interrupts it like any answer.
  let greeted = false;
  async function greet() {
    if (greeted) return;
    greeted = true;
    const my = ++turnToken;
    let text = "";
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ greet: true, lang: voice().lang }),
      });
      text = (await res.json()).speech || "";
    } catch {}
    if (!text || my !== turnToken || mode !== "listening") return;
    app().say(text);
    spokenText = text;
    setMode("speaking", "");
    await app().speak(text, voice());
    if (my !== turnToken || mode !== "speaking") return;
    setMode("listening", listenNote());
  }

  async function start() {
    if (mode !== "off") {
      if (mode === "paused") resume();
      return;
    }
    if (starting) return;
    starting = true;
    const my = ++startToken;
    try {
    // Made inside the tap, before any await: iOS only lets audio start from a user gesture.
    micCtx = micCtx || new (window.AudioContext || window.webkitAudioContext)();
    micCtx.resume().catch(() => {});
    await app().unlockAudio();
    if (my !== startToken) return;
    try {
      const incoming = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (my !== startToken) { for (const track of incoming.getTracks()) track.stop(); return; }
      stream = incoming;
    } catch {
      if (my !== startToken) return;
      starting = false;
      setMode("off", "The microphone is blocked. Allow it, or type the question.");
      return;
    }
    await micCtx.resume();
    if (my !== startToken) return;
    micAnalyser = micCtx.createAnalyser();
    micAnalyser.fftSize = 512;
    micSource = micCtx.createMediaStreamSource(stream);
    micSource.connect(micAnalyser);
    clearInterval(meterTimer);
    meterTimer = setInterval(meter, 50);
    setMode("listening", "Connecting the microphone…");
    drops = 0;
    if (!listeningEnabled) {
      starting = false;
      startBrowserRecognition();
      greet();
      return;
    }
    try {
      await openTap();
    } catch {
      if (my !== startToken) return;
      starting = false;
      startBrowserRecognition();
      return;
    }
    if (mode !== "off" && my === startToken) {
      let enabled = false;
      try { enabled = (await (await fetch("/api/voice/status", { signal: AbortSignal.timeout(3000) })).json()).enabled; } catch {}
      if (mode === "off" || my !== startToken) return;
      starting = false;
      if (enabled) {
        outputAnalyser = micCtx.createAnalyser(); outputAnalyser.fftSize = 512; outputAnalyser.connect(micCtx.destination);
        player = ZemiVoicePlayer.create(micCtx, outputAnalyser);
        connectAgent();
      } else { connect(); greet(); }
    }
    } catch {
      if (my === startToken) { stop(); status("Audio could not start. Press the orb to try again, or type your question."); }
    } finally {
      if (my === startToken) starting = false;
    }
  }

  function pause() {
    if (mode === "off" || mode === "paused") return;
    turnToken += 1;
    app().stopSpeaking();
    heard = "";
    sending = false;
    player?.clear();
    if (agentMode && socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "Pause" }));
    if (rec) {
      try { rec.stop(); } catch {}
    }
    setMode("paused", agentMode ? "Paused. Session time still counts; Stop ends it." : "Paused. The conversation is kept.");
  }

  function resume() {
    if (mode !== "paused") return;
    sending = socket?.readyState === WebSocket.OPEN;
    if (agentMode && sending) socket.send(JSON.stringify({ type: "Resume" }));
    if (rec) {
      try { rec.start(); } catch {}
    }
    setMode("listening", listenNote());
    if (pausedMapActions.length) {
      const actions = pausedMapActions;
      pausedMapActions = [];
      queueMapActions(socket, actions);
    }
  }

  function stop() {
    startToken += 1;
    starting = false;
    turnToken += 1;
    app()?.stopSpeaking();
    mode = "off";
    closeSocket();
    agentMode = false; player?.clear(); player = null;
    fallbackNote = "";
    outputAnalyser?.disconnect(); outputAnalyser = null;
    stopBrowserRecognition();
    tap?.disconnect();
    tap = null;
    micSource?.disconnect();
    micSource = null;
    clearInterval(meterTimer);
    for (const track of stream?.getTracks?.() || []) track.stop();
    stream = null;
    micAnalyser = null;
    heard = "";
    setMode("off", IDLE_NOTE);
  }

  function init() {
    const canvas = $("wisp");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    wisp = ZemiWisp.createWisp(canvas);
    waveBars = [...document.querySelectorAll("#voice-wave i")];
    $("wisp-button").addEventListener("click", start);
    $("talk-pause").addEventListener("click", () => (mode === "paused" ? resume() : pause()));
    $("talk-stop").addEventListener("click", stop);
    $("talk-lang").addEventListener("change", (event) => choose(event.target.value, gender));
    $("talk-voice").addEventListener("change", (event) => choose(lang, event.target.value));
    $("talk-preview").addEventListener("click", () => {
      if (mode !== "off") return;
      return app().speak({
      en: "Hi, I’m Zemi-Aku. What would you like to explore today?",
      es: "Hola, soy Zemi-Aku. ¿Qué le gustaría explorar hoy?",
      fr: "Bonjour, je suis Zemi-Aku. Que voulez-vous explorer aujourd’hui ?",
      it: "Ciao, sono Zemi-Aku. Cosa vuole esplorare oggi?",
      de: "Hallo, ich bin Zemi-Aku. Was möchten Sie heute erkunden?",
      }[voice().lang], voice());
    });
    window.speechSynthesis?.addEventListener?.("voiceschanged", renderPicker);
    setMode("off", IDLE_NOTE);
    restoreChoice();
    renderPicker(); // the menu and the EN/ES label show the saved pick before /api/voices answers
    loadVoices();
  }

  window.ZemiConverse = { init, start, stop, voice, browserVoice, LANG_TAGS, loadVoices, renderPicker, choose };
})();
