const BASE = "https://api.census.gov/data/2024/acs/acs5";
const METRICS = [
  ["population", "B01003_001", "people"],
  ["medianHouseholdIncome", "B19013_001", "USD (2024 inflation-adjusted)"],
  ["medianOwnerOccupiedHomeValue", "B25077_001", "USD"],
  ["medianAge", "B01002_001", "years"],
];
export const CENSUS_VARIABLES = METRICS.flatMap(([, code]) => [code + "E", code + "M", code + "EA"]);
const numeric = value => value == null || String(value).trim() === "" || !Number.isFinite(Number(value))
  || Number(value) < 0 ? null : Number(value); // Negative Census sentinel codes are not estimates.

export function parseCensus(rows) {
  if (!Array.isArray(rows) || rows.length < 2 || !Array.isArray(rows[0])) throw new Error("Invalid Census data");
  const [headers, ...values] = rows;
  if (["NAME", "state", "county", ...CENSUS_VARIABLES].some(name => !headers.includes(name))) throw new Error("Incomplete Census schema");
  const seen = new Set();
  return values.map(values => {
    if (!Array.isArray(values) || values.length !== headers.length) throw new Error("Invalid Census row");
    const row = Object.fromEntries(headers.map((name, i) => [name, values[i]]));
    if (row.state !== "72" || !/^\d{3}$/.test(row.county) || !/ Municipio, Puerto Rico$/i.test(row.NAME)) throw new Error("Unexpected Census geography");
    const fips = row.state + row.county;
    if (seen.has(fips)) throw new Error("Duplicate Census municipality");
    seen.add(fips);
    return {
      town: row.NAME.replace(/ Municipio, Puerto Rico$/i, ""), fips,
      source: "U.S. Census Bureau · Puerto Rico Community Survey (ACS five-year release)",
      sourceUrl: BASE, vintage: 2024, period: "2020–2024",
      marginOfErrorConfidenceLevel: 0.9,
      note: "Survey estimates; available margins use 90% confidence. See metric notes for controlled estimates. Not current asking prices, business revenue or proof of demand.",
      ...Object.fromEntries(METRICS.map(([name, code, unit]) => [name, {
        estimate: numeric(row[code + "E"]), marginOfError: numeric(row[code + "M"]),
        marginOfErrorNote: Number(row[code + "M"]) === -555555555
          ? "Controlled to an independent population or housing estimate; effectively no sampling error. A sampling margin is not appropriate." : null,
        annotation: row[code + "EA"] || null, unit,
      }])),
    };
  });
}

export async function fetchCensus({ key, fetchImpl = fetch }) {
  if (!key) throw new Error("CENSUS_API_KEY is required");
  let rows;
  try {
    const url = new URL(BASE);
    url.search = new URLSearchParams({ get: ["NAME", ...CENSUS_VARIABLES].join(","), for: "county:*", in: "state:72", key }).toString();
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(20000), redirect: "error" });
    if (!response.ok) throw new Error("Upstream rejected request");
    rows = await response.json();
  } catch { throw new Error("Census data could not be retrieved; check the key and connection."); }
  return parseCensus(rows);
}
