// Deepgram's raw 24 kHz mono PCM, queued on the existing audio context.
(function () {
  function create(context, destination) {
    const sources = new Set(), waiters = [];
    let next = 0, trailing = null, dropping = false;
    function finished() {
      if (!sources.size) for (const resolve of waiters.splice(0)) resolve();
    }
    function push(bytes) {
      if (dropping) return false;
      const incoming = new Uint8Array(bytes);
      const pcm = new Uint8Array(incoming.length + (trailing === null ? 0 : 1));
      if (trailing !== null) pcm[0] = trailing;
      pcm.set(incoming, trailing === null ? 0 : 1);
      trailing = pcm.length % 2 ? pcm[pcm.length - 1] : null;
      let length = Math.floor(pcm.length / 2);
      if (!length) return true;
      const at = Math.max(context.currentTime + 0.025, next);
      const room = Math.max(0, Math.floor((90 - (at - context.currentTime)) * 24000));
      if (length > room) { length = room; dropping = true; trailing = null; }
      if (!length) return false;
      const buffer = context.createBuffer(1, length, 24000);
      const channel = buffer.getChannelData(0);
      const samples = new DataView(pcm.buffer);
      for (let i = 0; i < length; i++) channel[i] = samples.getInt16(i * 2, true) / 32768;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(destination);
      sources.add(source);
      source.onended = () => { sources.delete(source); source.disconnect?.(); finished(); };
      source.start(at);
      next = at + buffer.duration;
      return !dropping;
    }
    function clear() {
      for (const source of sources) { source.onended = null; try { source.stop(); } catch {} source.disconnect?.(); }
      sources.clear(); next = 0; trailing = null; dropping = false; finished();
    }
    return { push, clear, done: async () => {
      if (sources.size) await new Promise(resolve => waiters.push(resolve));
      if (!sources.size) { next = 0; trailing = null; dropping = false; }
    } };
  }
  window.ZemiVoicePlayer = { create };
})();
