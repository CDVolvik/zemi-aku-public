import test from "node:test";
import assert from "node:assert/strict";
import { inTown, priceLabel, splitTown, pickTasteTag, tasteLabel, audienceLines, musicAsk } from "../server/lib.mjs";

const TOWNS = ["Ponce", "Rincón", "Cayey", "San Juan", "Juana Díaz", "Vieques", "Mayagüez"];

test("a barrio printed as the city is still the municipality", () => {
  assert.equal(inTown({ city: "Coto Laurel", municipality: "Ponce" }, "Ponce"), true);
  assert.equal(inTown({ city: "Coto Laurel", municipality: "Ponce" }, "Juana Díaz"), false);
});

test("without a municipality the printed city decides, barrios included", () => {
  assert.equal(inTown({ city: "Esperanza" }, "Vieques"), true);
  assert.equal(inTown({ city: "Mayaguez" }, "Mayagüez"), true);
  assert.equal(inTown({ city: "Mayagüez" }, "Hormigueros"), false);
  assert.equal(inTown({}, "Ponce"), false);
});

test("price level prints as dollar signs, only 1 to 4", () => {
  assert.equal(priceLabel(1), "$");
  assert.equal(priceLabel(2), "$$");
  assert.equal(priceLabel(4), "$$$$");
  assert.equal(priceLabel(7), "");
  assert.equal(priceLabel(null), "");
});

test("splitTown pulls the town out of a taste query", () => {
  assert.deepEqual(splitTown("surf rincon", TOWNS), { query: "surf", town: "Rincón" });
  assert.deepEqual(splitTown("lechon en Cayey", TOWNS), { query: "lechon", town: "Cayey" });
  assert.deepEqual(splitTown("mofongo in San Juan", TOWNS), { query: "mofongo", town: "San Juan" });
  assert.deepEqual(splitTown("Juana Díaz bakery", TOWNS), { query: "bakery", town: "Juana Díaz" });
  assert.deepEqual(splitTown("surf", TOWNS), { query: "surf", town: "" });
  assert.deepEqual(splitTown("Ponce", TOWNS), { query: "", town: "Ponce" });
});

test("pickTasteTag prefers place tags over media tags", () => {
  const surf = [
    { id: "urn:tag:keyword:qloo:surf", name: "Surf" },
    { id: "urn:tag:genre:qloo:surf", name: "Surf" },
    { id: "urn:tag:hobby:qloo:surfing", name: "Surfing" },
    { id: "urn:tag:keyword:media:surf", name: "surf" },
  ];
  assert.deepEqual(pickTasteTag(surf), { id: "urn:tag:hobby:qloo:surfing", name: "Surfing" });
  const mofongo = [
    { id: "urn:tag:popular_food_item:qloo:mofongo", name: "Mofongo" },
    { id: "urn:tag:specialty_dish:place:mofongo", name: "Mofongo" },
  ];
  assert.equal(pickTasteTag(mofongo).id, "urn:tag:specialty_dish:place:mofongo");
  assert.equal(pickTasteTag([{ id: "urn:tag:keyword:media:x", name: "x" }]), null);
  assert.equal(pickTasteTag(undefined), null);
});

test("tasteLabel says none, thin, or how many places carry the taste", () => {
  assert.match(tasteLabel("Surfing", [], "Rincón").hit, /no Qloo places in Rincón/);
  const loose = [{ name: "OfficeMax", genre: "Office supply store", description: "Office supplies", tags: [] }];
  assert.match(tasteLabel("Mofongo", loose, "Ponce").hit, /thin in Ponce/);
  const surf = [
    { name: "El Ancla", description: "Casual seaside spot", tags: ["Surf"] },
    { name: "Rincón Beach Cafe", description: "Beachfront cafe", tags: [] },
  ];
  const label = tasteLabel("Surfing", surf, "Rincón");
  assert.equal(label.hit, "Surfing · 2 places in Rincón");
  assert.match(label.note, /1 of them lists it/);
});

test("tasteLabel with the strict filter says the places list the taste", () => {
  const listed = [{ name: "Cayo Caribe" }, { name: "Tayzan" }];
  const label = tasteLabel("Mofongo", listed, "Puerto Rico", true);
  assert.equal(label.hit, "Mofongo · 2 places in Puerto Rico list it");
  assert.match(label.note, /Qloo lists Mofongo on 2 places in Puerto Rico/);
});

test("audienceLines keeps known age bands and gender, rounded", () => {
  const lines = audienceLines({
    age: { "24_and_younger": -0.02, "35_to_44": 0.16099999, odd_band: 0.5 },
    gender: { male: -0.030000000000000047, female: 0.030000000000000047 },
  });
  assert.deepEqual(lines.age, [{ label: "24 and under", value: -0.02 }, { label: "35–44", value: 0.16 }]);
  assert.deepEqual(lines.gender, [{ label: "Women", value: 0.03 }, { label: "Men", value: -0.03 }]);
  assert.deepEqual(audienceLines(undefined), { age: [], gender: [] });
});

test("a question about hearing or dancing live music names the genre and asks for live music venues", () => {
  assert.deepEqual(musicAsk("Where can I hear live salsa?"), { query: "live music venue", genre: "salsa" });
  assert.deepEqual(musicAsk("¿Dónde escucho bomba y plena en vivo?"), { query: "live music venue", genre: "bomba" });
  assert.deepEqual(musicAsk("dance salsa in Ponce"), { query: "live music venue", genre: "salsa" });
  assert.deepEqual(musicAsk("live music tonight"), { query: "live music venue", genre: "" });
  assert.deepEqual(musicAsk("música en vivo en Rincón"), { query: "live music venue", genre: "" });
});

test("a dish, a business plan or a bare genre word is not a live music question", () => {
  assert.equal(musicAsk("salsa restaurant in Bayamón"), null);
  assert.equal(musicAsk("Should I open a salsa bar in Ponce?"), null);
  assert.equal(musicAsk("salsa"), null);
  assert.equal(musicAsk("Where do Bad Bunny fans eat?"), null);
  assert.equal(musicAsk("I listen to Bad Bunny"), null);
  assert.equal(musicAsk("Where can I hear the ocean in Rincón?"), null);
  assert.equal(musicAsk("Where do people live in Ponce?"), null);
  assert.deepEqual(musicAsk("Which bar has live salsa in Ponce?"), { query: "live music venue", genre: "salsa" });
});
