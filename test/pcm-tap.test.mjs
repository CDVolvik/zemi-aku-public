import test from "node:test";
import assert from "node:assert/strict";
import { createDownsampler, OUT_RATE } from "../app/pcm-tap.js";

function run(inRate, seconds, value = 0.5) {
  const chunks = [];
  const push = createDownsampler(inRate, (buffer) => chunks.push(new Int16Array(buffer)));
  const block = new Float32Array(128).fill(value); // the size of one AudioWorklet render quantum
  for (let i = 0; i < (inRate * seconds) / 128; i += 1) push(block);
  return chunks;
}

test("one second of 48 kHz audio becomes ten 100 ms chunks at 16 kHz", () => {
  const chunks = run(48000, 1);
  assert.equal(chunks.length, 10);
  assert.ok(chunks.every((chunk) => chunk.length === 1600));
});

test("44.1 kHz audio, the other common rate, comes out at the same 16 kHz", () => {
  const samples = run(44100, 2).reduce((total, chunk) => total + chunk.length, 0);
  assert.ok(Math.abs(samples - 2 * OUT_RATE) <= 1600, `got ${samples} samples for 2 s`);
});

test("levels map to 16-bit and clip instead of wrapping", () => {
  assert.equal(run(48000, 0.1, 0.5)[0][0], Math.trunc(0.5 * 0x7fff));
  assert.equal(run(48000, 0.1, -1)[0][0], -0x8000);
  assert.equal(run(48000, 0.1, 3)[0][0], 0x7fff);
});

