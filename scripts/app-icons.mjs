// Draws the app icon from the real municipality outlines: the island in paper on the map's sea,
// with Ponce marked in the taste orange. Writes PNGs with Node's zlib, no image library.
//   node scripts/app-icons.mjs
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "app", "assets");
const SEA = [0x12, 0x37, 0x4d];
const LAND = [0xf3, 0xef, 0xe6];
const TASTE = [0xc9, 0x8a, 0x4f];
const PONCE = [-66.614, 18.011];
const WIDTH = 0.66; // of the icon; keeps the whole island inside the maskable safe circle
const SS = 4; // samples per pixel side

const geo = JSON.parse(fs.readFileSync(path.join(root, "app", "data", "municipios.geojson"), "utf8"));
const polygons = [];
for (const feature of geo.features) {
  const { type, coordinates } = feature.geometry;
  for (const polygon of type === "Polygon" ? [coordinates] : coordinates) {
    // Mona, Monito and Desecheo sit far west and would shrink the main island to a sliver.
    if (polygon[0].every(([lon]) => lon < -67.3)) continue;
    polygons.push(polygon);
  }
}
const rings = polygons.flat();

const k = Math.cos((18.2 * Math.PI) / 180);
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (const ring of rings) {
  for (const [lon, lat] of ring) {
    minX = Math.min(minX, lon * k); maxX = Math.max(maxX, lon * k);
    minY = Math.min(minY, -lat); maxY = Math.max(maxY, -lat);
  }
}

function render(size) {
  const n = size * SS;
  const scale = (n * WIDTH) / (maxX - minX);
  const ox = (n - (maxX - minX) * scale) / 2;
  const oy = (n - (maxY - minY) * scale) / 2;
  const project = ([lon, lat]) => [ox + (lon * k - minX) * scale, oy + (-lat - minY) * scale];
  // Each town is filled on its own (even-odd, so lakes stay holes) into one SS×SS-per-pixel mask.
  // Filling them as one shape draws a line wherever two neighbours overlap.
  const mask = new Uint8Array(n * n);
  for (const polygon of polygons) {
    const edges = [];
    for (const ring of polygon) {
      const pts = ring.map(project);
      for (let i = 0; i < pts.length - 1; i += 1) {
        const [a, b] = [pts[i], pts[i + 1]];
        if (a[1] !== b[1]) edges.push(a[1] < b[1] ? [a, b] : [b, a]);
      }
    }
    const top = Math.max(0, Math.floor(Math.min(...edges.map(([a]) => a[1]))));
    const bottom = Math.min(n, Math.ceil(Math.max(...edges.map(([, b]) => b[1]))));
    for (let sy = top; sy < bottom; sy += 1) {
      const y = sy + 0.5;
      const xs = [];
      for (const [a, b] of edges) {
        if (y >= a[1] && y < b[1]) xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        for (let sx = Math.ceil(xs[i] - 0.5); sx + 0.5 < xs[i + 1]; sx += 1) mask[sy * n + sx] = 1;
      }
    }
  }
  // The outlines are simplified one town at a time, so neighbours leave hairline gaps.
  // A small closing (grow, then shrink back) seals them without moving the coast.
  const r = Math.max(2, Math.round(n / 400));
  const closed = morph(morph(mask, n, r, 1), n, r, 0);
  const cover = new Float32Array(size * size);
  for (let sy = 0; sy < n; sy += 1) {
    const row = Math.floor(sy / SS) * size;
    for (let sx = 0; sx < n; sx += 1) if (closed[sy * n + sx]) cover[row + Math.floor(sx / SS)] += 1 / (SS * SS);
  }
  const [px, py] = project(PONCE).map((v) => v / SS);
  const dot = size * 0.035;
  const rgb = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = y * size + x;
      const land = Math.min(1, cover[i]);
      const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
      const mark = Math.max(0, Math.min(1, dot - d + 0.5));
      for (let c = 0; c < 3; c += 1) {
        const base = SEA[c] + (LAND[c] - SEA[c]) * land;
        rgb[i * 3 + c] = Math.round(base + (TASTE[c] - base) * mark);
      }
    }
  }
  return png(size, rgb);
}

// Square max (grow = 1) or min (grow = 0) filter of radius r, one axis at a time.
function morph(src, n, r, grow) {
  const pass = (from, horizontal) => {
    const to = new Uint8Array(n * n);
    for (let a = 0; a < n; a += 1) {
      for (let b = 0; b < n; b += 1) {
        let hit = !grow;
        for (let d = -r; d <= r && hit !== Boolean(grow); d += 1) {
          const c = Math.min(n - 1, Math.max(0, b + d));
          const v = horizontal ? from[a * n + c] : from[c * n + a];
          if (grow ? v : !v) hit = Boolean(grow);
        }
        to[horizontal ? a * n + b : b * n + a] = hit ? 1 : 0;
      }
    }
    return to;
  };
  return pass(pass(src, true), false);
}

function png(size, rgb) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y += 1) rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const [name, size] of [["icon-512.png", 512], ["icon-192.png", 192], ["apple-touch-icon.png", 180], ["favicon-32.png", 32]]) {
  fs.writeFileSync(path.join(out, name), render(size));
  console.log(`app/assets/${name}`);
}
