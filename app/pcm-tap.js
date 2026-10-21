// Microphone → 16 kHz 16-bit PCM for the listen relay. One path for every browser: Safari's
// MediaRecorder only writes MP4, which Deepgram's live stream cannot read, so we send raw audio.

export const OUT_RATE = 16000;
const CHUNK = 1600; // 100 ms at 16 kHz

// Averages the input down to OUT_RATE and hands over full chunks as Int16Array buffers.
export function createDownsampler(inRate, emit, chunk = CHUNK) {
  const step = inRate / OUT_RATE;
  let pos = 0;
  let sum = 0;
  let count = 0;
  let out = new Int16Array(chunk);
  let n = 0;
  return function push(samples) {
    for (let i = 0; i < samples.length; i += 1) {
      sum += samples[i];
      count += 1;
      pos += 1;
      if (pos < step) continue;
      pos -= step;
      const v = Math.max(-1, Math.min(1, sum / count));
      out[n++] = v < 0 ? v * 0x8000 : v * 0x7fff;
      sum = 0;
      count = 0;
      if (n === chunk) {
        emit(out.buffer);
        out = new Int16Array(chunk);
        n = 0;
      }
    }
  };
}

if (typeof AudioWorkletProcessor === "function") {
  class PcmTap extends AudioWorkletProcessor {
    constructor() {
      super();
      this.push = createDownsampler(sampleRate, (buffer) => this.port.postMessage(buffer, [buffer]));
    }

    process(inputs) {
      const channel = inputs[0]?.[0];
      if (channel) this.push(channel);
      return true;
    }
  }
  registerProcessor("pcm-tap", PcmTap);
}
