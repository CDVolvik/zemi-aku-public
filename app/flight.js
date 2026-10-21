// God's-eye travel: climb, turn toward the target, glide down onto it, then sway slowly
// until the person touches the map. The island view at rest drifts too, smaller and slower. target = { lon, lat, eye, ground }: eye is the camera height,
// ground the horizontal offset (0 looks straight down). Default pitch is top-down (-89°);
// tilted views require allowTilt; ground is capped to eye so pitch never goes shallower than -45°.
(function () {
  const D = Math.PI / 180;
  let token = 0;
  let stopOrbit = null;
  let allowTilt = false;

  function bearing(aLon, aLat, bLon, bLat) {
    const y = Math.sin((bLon - aLon) * D) * Math.cos(bLat * D);
    const x = Math.cos(aLat * D) * Math.sin(bLat * D) - Math.sin(aLat * D) * Math.cos(bLat * D) * Math.cos((bLon - aLon) * D);
    return Math.atan2(y, x);
  }

  function setAllowTilt(on) {
    allowTilt = !!on;
  }

  function poseFor({ lon, lat, eye, ground }) {
    const topDown = { heading: 0, pitch: Cesium.Math.toRadians(-89), roll: 0 };
    if (!ground || !allowTilt) {
      return {
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, eye),
        orientation: topDown,
      };
    }
    // Cap tilt at -45°: shorten the look offset so the place stays centered under the pitch floor.
    ground = Math.min(ground, eye);
    const south = ground * 0.92;
    const west = ground * 0.18;
    const pitch = -Math.atan(eye / ground);
    return {
      destination: Cesium.Cartesian3.fromDegrees(lon - west / (111320 * Math.cos(lat * D)), lat - south / 110540, eye),
      orientation: { heading: Math.atan2(west, south), pitch, roll: 0 },
    };
  }

  function halt() {
    if (stopOrbit) stopOrbit();
    stopOrbit = null;
  }

  // The eagle's hover: a slow sway of about 7° either way around the target, not a full circle, so
  // a town framed beside the panel stays beside it. From the island view (190 km up) the same sway
  // would swing the whole island, so up there it is about 3° over a longer breath. Off when the
  // visitor turns motion off.
  function swayFor(eye) {
    return eye < 100000 ? { amplitude: 0.12, period: 30000 } : { amplitude: 0.05, period: 50000 };
  }
  let motion = true;
  try { motion = localStorage.getItem("zemi-motion") !== "off"; } catch {}
  function setMotion(on) {
    motion = on;
    try { localStorage.setItem("zemi-motion", on ? "on" : "off"); } catch {}
    if (!on) halt();
  }

  function orbit(viewer, target) {
    if (!allowTilt || !target.ground) return;
    const camera = viewer.camera;
    camera.lookAtTransform(Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(target.lon, target.lat, 0)));
    const started = performance.now();
    const { amplitude, period } = swayFor(target.eye);
    const sway = (t) => amplitude * Math.sin((2 * Math.PI * (t - started)) / period);
    let last = started;
    const removeTick = viewer.scene.preRender.addEventListener(() => {
      const now = performance.now();
      camera.rotateRight(sway(now) - sway(last));
      last = now;
      if (now - started > 180000) halt();
    });
    const events = ["pointerdown", "wheel", "touchstart"];
    const onInput = () => halt();
    for (const name of events) viewer.container.addEventListener(name, onInput, { capture: true, passive: true });
    window.addEventListener("keydown", onInput, true);
    stopOrbit = () => {
      removeTick();
      for (const name of events) viewer.container.removeEventListener(name, onInput, { capture: true });
      window.removeEventListener("keydown", onInput, true);
      camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    };
  }

  // opts.duration: a quick direct move (style switches). opts.noOrbit: skip the settle.
  // opts.onDepart(climbing) and opts.onArrive() let the page reorganize the map around the move.
  function travel(viewer, target, opts = {}) {
    const camera = viewer.camera;
    const my = ++token;
    halt();
    camera.cancelFlight();
    const pose = poseFor(target);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const arrive = () => {
      if (my !== token) return;
      opts.onArrive?.();
      if (motion && !reduced && !opts.noOrbit && target.ground > 0 && allowTilt) orbit(viewer, target);
    };
    if (reduced || opts.duration === 0) {
      camera.setView(pose);
      arrive();
      return;
    }
    if (opts.duration != null) {
      camera.flyTo({ ...pose, duration: opts.duration, easingFunction: Cesium.EasingFunction.CUBIC_OUT, complete: arrive });
      return;
    }
    const here = camera.positionCartographic;
    const fromLon = here.longitude / D;
    const fromLat = here.latitude / D;
    const meters = Cesium.Cartesian3.distance(Cesium.Cartesian3.fromDegrees(fromLon, fromLat, 0), Cesium.Cartesian3.fromDegrees(target.lon, target.lat, 0));
    const total = Math.min(3.2, Math.max(1.6, 1.4 + meters / 30000));
    const climb = Math.min(80000, Math.max(6000, meters * 0.9) + here.height * 0.6);
    const climbs = meters > 1500 && here.height < climb * 0.85;
    opts.onDepart?.(climbs);
    const land = (seconds) => camera.flyTo({
      ...pose,
      duration: seconds,
      easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      complete: arrive,
    });
    if (!climbs) {
      land(total * 0.7);
      return;
    }
    // Up and a quarter of the way over, turned to face the destination: the god's-eye beat.
    camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(fromLon + (target.lon - fromLon) * 0.25, fromLat + (target.lat - fromLat) * 0.25, climb),
      orientation: { heading: bearing(fromLon, fromLat, target.lon, target.lat), pitch: Cesium.Math.toRadians(-89), roll: 0 },
      duration: total * 0.4,
      // Out, not in-out: the climb answers the click at once and slows into the pause at the top.
      easingFunction: Cesium.EasingFunction.QUADRATIC_OUT,
      complete: () => { if (my === token) land(total * 0.6); },
    });
  }

  window.ZemiFlight = { travel, halt, setMotion, setAllowTilt, swayFor, motion: () => motion, allowTilt: () => allowTilt };
})();
