# Overture Maps places for Puerto Rico, one file per municipality.
# Overture (Meta, Microsoft, Foursquare, AllThePlaces; CDLA-Permissive-2.0 / Apache-2.0 / CC0) lists
# what is on the ground: 99,318 places on the island, 3,034 confident ones in Ponce, where Qloo knows
# 357 by taste. Qloo stays the taste layer; this adds phones, websites and the businesses Qloo lacks.
#
#   python -m pip install duckdb      (build time only; the server reads the JSON this writes)
#   python scripts/overture.py [release]
#
# Writes cache/overture/<town>.json (gitignored, copied into the image) and data/overture-counts.json.
import json, os, sys, time, unicodedata
import duckdb

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RELEASE = sys.argv[1] if len(sys.argv) > 1 else "2026-09-23.1"
MIN_CONFIDENCE = 0.7  # Overture's own score; below it a third of rows are duplicates or closed

def slug(town):
    text = unicodedata.normalize("NFD", town).encode("ascii", "ignore").decode().lower()
    return "-".join(text.split())

t0 = time.time()
con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; SET s3_region='us-west-2';")
con.execute(f"""
  CREATE TABLE pr AS SELECT * FROM read_parquet(
    's3://overturemaps-us-west-2/release/{RELEASE}/theme=places/type=place/*', hive_partitioning=1)
  WHERE bbox.xmin > -67.35 AND bbox.xmax < -65.2 AND bbox.ymin > 17.85 AND bbox.ymax < 18.55
    AND confidence >= {MIN_CONFIDENCE}
""")
con.execute(f"""
  CREATE TABLE towns AS SELECT replace(NAME, ' Municipio', '') AS town, ST_SetCRS(geom, 'OGC:CRS84') AS geom
  FROM ST_Read('{os.path.join(ROOT, "app", "data", "municipios.geojson").replace(os.sep, "/")}')
""")
rows = con.execute("""
  SELECT t.town, p.id, p.names.primary, p.basic_category, p.taxonomy.hierarchy,
         ST_Y(p.geometry), ST_X(p.geometry), p.confidence,
         p.phones, p.websites, p.socials, p.emails, p.addresses[1].freeform,
         list_distinct([s.dataset FOR s IN p.sources])
  FROM pr p JOIN towns t ON ST_Contains(t.geom, p.geometry)
  WHERE p.names.primary IS NOT NULL
""").fetchall()

by_town = {}
for town, oid, name, category, hierarchy, lat, lon, conf, phones, webs, socials, emails, address, datasets in rows:
    by_town.setdefault(town, []).append({
        "id": oid, "name": name, "category": category or "", "hierarchy": hierarchy or [],
        "lat": round(lat, 6), "lon": round(lon, 6), "confidence": round(conf, 2),
        "phone": (phones or [None])[0], "website": (webs or [None])[0],
        "socials": (socials or [])[:3], "email": (emails or [None])[0], "address": address,
        "sources": [d for d in (datasets or []) if d != "Overture"],
    })

out_dir = os.path.join(ROOT, "cache", "overture")
os.makedirs(out_dir, exist_ok=True)
counts = []
for town, places in by_town.items():
    with open(os.path.join(out_dir, f"{slug(town)}.json"), "w", encoding="utf-8") as fh:
        json.dump({"town": town, "release": RELEASE, "places": places}, fh, ensure_ascii=False)
    tally = {}
    for place in places:
        tally[place["category"] or "other"] = tally.get(place["category"] or "other", 0) + 1
    top = sorted(tally.items(), key=lambda kv: -kv[1])[:12]
    counts.append({"town": town, "total": len(places), "top": [{"category": k, "count": v} for k, v in top]})
counts.sort(key=lambda row: -row["total"])
with open(os.path.join(ROOT, "data", "overture-counts.json"), "w", encoding="utf-8") as fh:
    json.dump({
        "release": RELEASE, "min_confidence": MIN_CONFIDENCE,
        "source": "Overture Maps places (Meta, Microsoft, Foursquare, AllThePlaces). CDLA-Permissive-2.0, Apache-2.0, CC0.",
        "total": sum(row["total"] for row in counts), "towns": counts,
    }, fh, ensure_ascii=False, indent=2)
    fh.write("\n")
print(f"{sum(len(p) for p in by_town.values())} places in {len(by_town)} towns, release {RELEASE}, {round(time.time() - t0)} s")
