// A town's catalog: every place Qloo knows there, sorted into a few categories a visitor would
// browse by. Qloo's primary_genre is the input ("urn:tag:genre:place:restaurant:pizza"); its first
// segment after "place:" decides the category, and the genre's own name is the kind ("Pizza restaurant").

export const CATEGORIES = [
  { id: "food", label: "Food" },
  { id: "drinks", label: "Bars and nightlife" },
  { id: "stay", label: "Places to stay" },
  { id: "groceries", label: "Groceries and pharmacies" },
  { id: "shopping", label: "Shopping" },
  { id: "fun", label: "Things to do" },
  { id: "outdoors", label: "Beaches and outdoors" },
  { id: "culture", label: "History and culture" },
  { id: "health", label: "Health and fitness" },
  { id: "other", label: "Services and more" },
];

const EXACT = {
  food: ["restaurant", "bakery", "cafe", "coffee_shop", "ice_cream_shop", "food_court", "juice_shop", "dessert_shop", "donut_shop", "food_truck", "deli", "caterer"],
  drinks: ["bar", "pub", "bar_&_grill", "night_club", "brewery", "winery", "distillery", "lounge", "cocktail_bar", "sports_bar", "wine_bar", "liquor_store"],
  stay: ["hotel", "resort", "resort_hotel", "motel", "inn", "guest_house", "bed_&_breakfast", "retreat_center", "vacation_rental", "campground", "hostel", "lodge"],
  groceries: ["supermarket", "grocery_store", "drug_store", "pharmacy", "warehouse_club", "cash_and_carry_wholesaler", "convenience_store", "market", "farmers_market"],
  shopping: ["shopping_mall", "department_store", "outlet_mall", "plaza", "pawn_shop", "discount_store"],
  fun: ["tourist_attraction", "arena", "stadium", "movie_theater", "bowling_alley", "indoor_playground", "amusement_park", "casino", "zoo", "aquarium", "golf_course", "convention_center", "wedding_venue", "event_venue", "dive_shop", "water_sports_equipment_rental_service", "beach_entertainment_shop", "marina", "tour_operator"],
  outdoors: ["park", "beach", "national_park", "national_forest", "wildlife_refuge", "nature_preserve", "garden", "botanical_garden", "hiking_area", "lighthouse", "waterfall", "cave", "island"],
  culture: ["museum", "historical_landmark", "historical_place", "monument", "church", "catholic_church", "cathedral", "performing_arts_theater", "theater", "art_gallery", "library", "cultural_center"],
  health: ["gym", "fitness_center", "spa", "hospital", "medical_clinic", "health_and_beauty_shop", "beauty_salon", "beauty_supply_store", "vitamin_&_supplements_store", "animal_hospital", "dentist"],
};
const BY_GENRE = new Map(Object.entries(EXACT).flatMap(([category, genres]) => genres.map((genre) => [genre, category])));

// "urn:tag:genre:place:restaurant:pizza" → "restaurant". A missing id falls back to the name.
export function genreRoot(genreId, genreName = "") {
  const match = String(genreId || "").match(/^urn:tag:genre:place:([^:]+)/);
  if (match) return match[1];
  return String(genreName || "").toLowerCase().trim().replace(/\s+/g, "_");
}

// Families of genres, checked in order after the exact list. Taken from the 7,717 places Qloo
// returned for the 78 towns on 7 October 2026: these were the ones the exact list missed.
const PATTERNS = [
  ["drinks", /_bar$|night_club$|^dance_club$|_entertainment_club$|^wine_cellar$/],
  ["fun", /amusement|theme_park|water_park|golf|go_kart|paintball|skydiving|adventure_sports|riding|diving|kayak|tour_agency|^sports_|athletic|_field$|_court$|skate|race|racing|_venue$|theater$|^swimming_pool$|^observ|^festival$|^(beach|yacht|boat|country)_club$|rock_climbing|^playground$/],
  ["outdoors", /park$|beach|scenic|mountain|vista|wetland/],
  ["culture", /museum$|^historical_|^archaeological_|landmark$|church$|cathedral$|castle|fortress|shrine|heritage|sculpture|^art_center$|^town_square$|^visitor_center$/],
  ["health", /spa$|salon$|wellness|optometrist|piercing/],
  ["food", /bakery$|^food_and_drink$|^coffee_roasters$|^kiosk$/],
  ["groceries", /(?<!flea_)market$|grocer$/],
  ["shopping", /_store$|_shop$|_boutique$|^boutique$|^flea_market$/],
];

export function categoryOf(genreId, genreName = "") {
  const root = genreRoot(genreId, genreName);
  if (BY_GENRE.has(root)) return BY_GENRE.get(root);
  for (const [category, pattern] of PATTERNS) if (pattern.test(root)) return category;
  return "other";
}

// Counts per category and, inside each, per kind, both largest first. Empty categories are left out.
export function summarize(places) {
  const byCategory = new Map(CATEGORIES.map((category) => [category.id, { ...category, count: 0, kinds: new Map() }]));
  for (const place of places) {
    const bucket = byCategory.get(place.category || categoryOf(place.genreId, place.genre));
    bucket.count += 1;
    const kind = place.genre || "Other";
    bucket.kinds.set(kind, (bucket.kinds.get(kind) || 0) + 1);
  }
  const categories = [...byCategory.values()]
    .filter((category) => category.count)
    .map((category) => ({
      id: category.id,
      label: category.label,
      count: category.count,
      kinds: [...category.kinds].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => (a.id === "other") - (b.id === "other") || b.count - a.count);
  return { total: places.length, categories };
}

// How much Qloo knows about a town, by the size of its catalog. Replaces the five-place sample,
// which called Cabo Rojo thin; its catalog has 169 places.
export const BANDS = [
  { id: "deep", min: 200, label: "200 or more places" },
  { id: "broad", min: 100, label: "100 to 199" },
  { id: "some", min: 25, label: "25 to 99" },
  { id: "thin", min: 0, label: "under 25" },
];

export function bandOf(total) {
  return BANDS.find((band) => (total || 0) >= band.min).id;
}
