import test from "node:test";
import assert from "node:assert/strict";
import { bandOf, categoryOf, genreRoot, summarize } from "../server/catalog.mjs";

test("the genre's first segment decides the category", () => {
  assert.equal(genreRoot("urn:tag:genre:place:restaurant:pizza"), "restaurant");
  assert.equal(categoryOf("urn:tag:genre:place:restaurant:pizza"), "food");
  assert.equal(categoryOf("urn:tag:genre:place:bar_&_grill"), "drinks");
  assert.equal(categoryOf("urn:tag:genre:place:hotel:resort"), "stay");
  assert.equal(categoryOf("urn:tag:genre:place:drug_store"), "groceries");
  assert.equal(categoryOf("urn:tag:genre:place:wildlife_refuge"), "outdoors");
});

test("families of genres land together without listing each one", () => {
  assert.equal(categoryOf("urn:tag:genre:place:archaeological_museum"), "culture");
  assert.equal(categoryOf("urn:tag:genre:place:lingerie_store"), "shopping");
  assert.equal(categoryOf("urn:tag:genre:place:perfume_store"), "shopping");
  assert.equal(categoryOf("urn:tag:genre:place:department_of_motor_vehicles"), "other");
  assert.equal(categoryOf("urn:tag:genre:place:public_beach"), "outdoors");
  assert.equal(categoryOf("urn:tag:genre:place:city_park"), "outdoors");
  assert.equal(categoryOf("urn:tag:genre:place:water_park"), "fun", "a water park is a day out, not a nature spot");
  assert.equal(categoryOf("urn:tag:genre:place:beach_club"), "fun");
  assert.equal(categoryOf("urn:tag:genre:place:fortress"), "culture");
  assert.equal(categoryOf("urn:tag:genre:place:kiosk"), "food", "Puerto Rico's kioskos sell food");
  assert.equal(categoryOf("urn:tag:genre:place:farmers'_market"), "groceries");
  assert.equal(categoryOf("urn:tag:genre:place:flea_market"), "shopping");
  assert.equal(categoryOf("urn:tag:genre:place:hookah_bar"), "drinks");
});

test("without an id, the genre name is used", () => {
  assert.equal(categoryOf("", "Shopping mall"), "shopping");
  assert.equal(categoryOf(undefined, undefined), "other");
});

test("a summary counts categories and the kinds inside them, largest first", () => {
  const places = [
    { genreId: "urn:tag:genre:place:restaurant:pizza", genre: "Pizza restaurant" },
    { genreId: "urn:tag:genre:place:restaurant:pizza", genre: "Pizza restaurant" },
    { genreId: "urn:tag:genre:place:restaurant:puerto_rican", genre: "Puerto Rican restaurant" },
    { genreId: "urn:tag:genre:place:hotel", genre: "Hotel" },
    { genreId: "urn:tag:genre:place:building", genre: "Building" },
    { genreId: "urn:tag:genre:place:building", genre: "Building" },
  ];
  const summary = summarize(places);
  assert.equal(summary.total, 6);
  assert.deepEqual(summary.categories.map((c) => [c.id, c.count]), [["food", 3], ["stay", 1], ["other", 2]]);
  assert.deepEqual(summary.categories[0].kinds, [{ name: "Pizza restaurant", count: 2 }, { name: "Puerto Rican restaurant", count: 1 }]);
});

test("towns are banded by how many places Qloo knows there", () => {
  assert.equal(bandOf(1353), "deep");
  assert.equal(bandOf(200), "deep");
  assert.equal(bandOf(169), "broad");
  assert.equal(bandOf(25), "some");
  assert.equal(bandOf(4), "thin");
  assert.equal(bandOf(undefined), "thin");
});
