// The wisp: a small orb that shows the conversation's state.
// idle breathes (4 s), listening swells with the microphone, thinking swirls, speaking pulses with
// its own voice, paused is dim and still. Reduced motion keeps the colors and drops the movement.
(function () {
  const HUE = { idle: 196, listening: 168, thinking: 262, speaking: 24, paused: 210 };

  function createWisp(canvas) {
    const g = canvas.getContext("2d");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let state = "idle";
    let level = 0;
    let shown = 0;
    let hue = HUE.idle;
    let frame = 0;
    const t0 = performance.now();

    function draw(now) {
      frame = 0;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const t = (now - t0) / 1000;
      // Fast attack, slow release, so a voice reads as a pulse and not a flicker.
      shown += (level - shown) * (level > shown ? 0.45 : 0.12);
      hue += (HUE[state] - hue) * 0.08;
      const voice = Math.min(1, shown * 6);
      const breath = reduced ? 0.5 : Math.sin((t * Math.PI * 2) / 4) * 0.5 + 0.5;
      let r = w * 0.21;
      if (state === "idle") r *= 0.93 + breath * 0.07;
      if (state === "listening" || state === "speaking") r *= reduced ? 1 : 0.96 + voice * 0.28;
      if (state === "paused") r *= 0.86;
      const alpha = state === "paused" ? 0.4 : 1;
      const glow = reduced ? 0.55 + voice * 0.3 : 0.45 + (state === "idle" ? breath * 0.15 : voice * 0.4);

      g.clearRect(0, 0, w, h);
      // The glow fades out inside the canvas, so its square edge never shows.
      const halo = g.createRadialGradient(cx, cy, r * 0.4, cx, cy, Math.min(r * 2.3, w * 0.49));
      halo.addColorStop(0, `hsla(${hue}, 90%, 66%, ${glow * alpha})`);
      halo.addColorStop(1, `hsla(${hue}, 90%, 60%, 0)`);
      g.fillStyle = halo;
      g.fillRect(0, 0, w, h);

      const core = g.createRadialGradient(cx - r * 0.32, cy - r * 0.36, r * 0.08, cx, cy, r);
      core.addColorStop(0, `hsla(${hue}, 100%, 94%, ${alpha})`);
      core.addColorStop(0.55, `hsla(${hue}, 82%, 64%, ${alpha})`);
      core.addColorStop(1, `hsla(${hue + 18}, 80%, 42%, ${0.85 * alpha})`);
      g.fillStyle = core;
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();

      if (state === "thinking" && !reduced) {
        g.lineCap = "round";
        g.lineWidth = w * 0.022;
        for (let i = 0; i < 2; i += 1) {
          const start = t * 2.4 + i * Math.PI;
          g.strokeStyle = `hsla(${hue}, 100%, 88%, ${0.75 - i * 0.25})`;
          g.beginPath();
          g.arc(cx, cy, r * 1.32, start, start + Math.PI * 0.62);
          g.stroke();
        }
      }
      // Paused is still: stop drawing until the state changes.
      if (state !== "paused") frame = requestAnimationFrame(draw);
    }

    function wake() {
      if (!frame) frame = requestAnimationFrame(draw);
    }
    wake();

    return {
      setState(next) {
        state = HUE[next] != null ? next : "idle";
        canvas.dataset.state = state;
        wake();
      },
      setLevel(value) {
        level = Number.isFinite(value) ? value : 0;
      },
    };
  }

  window.ZemiWisp = { createWisp };
})();
