// Draws the 78 municipalities as an SVG, coloured by how many places Qloo knows in each
// (data/catalog-counts.json, from scripts/build-catalog.mjs).
// Output: app/assets/island.svg (the front page's map). Run: node scripts/island-svg.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fold } from "../server/lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const geo = JSON.parse(fs.readFileSync(path.join(root, "app/data/municipios.geojson"), "utf8"));
const counts = JSON.parse(fs.readFileSync(path.join(root, "data/catalog-counts.json"), "utf8"));
const byCount = new Map(counts.towns.map((row) => [fold(row.town), row]));

// Equirectangular, scaled by cos(latitude) so the island keeps its shape.
const lat0 = 18.2;
const kx = Math.cos((lat0 * Math.PI) / 180);
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
const rings = [];
for (const feature of geo.features) {
  const g = feature.geometry;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  const name = String(feature.properties.NAME).replace(/ municipio$/i, "");
  for (const poly of polys) {
    const ring = poly[0].map(([lon, lat]) => [lon * kx, -lat]);
    for (const [x, y] of ring) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    rings.push({ name, ring });
  }
}
const width = 1200;
const scale = width / (maxX - minX);
const height = Math.round((maxY - minY) * scale);
const pt = ([x, y]) => `${((x - minX) * scale).toFixed(1)},${((y - minY) * scale).toFixed(1)}`;

const byTown = new Map();
for (const { name, ring } of rings) {
  if (!byTown.has(name)) byTown.set(name, []);
  byTown.get(name).push(`M${ring.map(pt).join("L")}Z`);
}
const heat = { thin: "#fabe50", some: "#f8903e", broad: "#f46a36", deep: "#f04632" };
const paths = [...byTown].map(([name, parts]) => {
  const row = byCount.get(fold(name));
  const cls = row?.band || "thin";
  const fill = heat[cls] || heat.thin;
  const title = row ? `${row.town}: ${row.total.toLocaleString("en-US")} places on Qloo` : name;
  return `<path class="${cls}" fill="${fill}" d="${parts.join("")}"><title>${title}</title></path>`;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Puerto Rico's 78 municipalities, coloured by how many places Qloo knows in each">
${paths.join("\n")}
</svg>
`;
fs.mkdirSync(path.join(root, "app/assets"), { recursive: true });
fs.writeFileSync(path.join(root, "app/assets/island.svg"), svg);
console.log(`app/assets/island.svg · ${byTown.size} towns · ${width}x${height} · ${(svg.length / 1024).toFixed(0)} KB`);
