import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fold } from '../server/lib.mjs';
import { comparisonTown, createPlan } from '../server/plan.mjs';

// Three gap towns on a line about 11 km apart per 0.1 degree of latitude, and one competitive town nearest of all.
const centers = new Map([['alfa', { lat: 18.0, lon: -66 }], ['beta', { lat: 18.1, lon: -66 }], ['gama', { lat: 18.3, lon: -66 }],
  ['delta', { lat: 18.01, lon: -66 }]].map(([k, v]) => [fold(k), v]));
const row = (town, group, tasteRank, extra = {}) => ({ town, group, tasteRank, establishments: 3, establishmentsMax: 3, employees: 9,
  suppressed: false, perTenThousand: 0.7, perTenThousandMax: 0.7, ...extra });
const file = { towns: [row('Alfa', 'gap', 2), row('Beta', 'gap', 29), row('Gama', 'gap', 5), row('Delta', 'competitive', 1), row('Epsilon', 'unknown', null)] };

test('the comparison town follows the verdict note: the next gap town by taste rank, else the top one, never itself', () => {
  const next = comparisonTown(file, 'Alfa', centers);
  assert.equal(next.town, 'Gama', 'Gama (#5) is the gap town after Alfa (#2), though Beta is nearer');
  assert.equal(next.basis, 'next');
  assert.equal(next.ranked, 4, 'ranked counts the towns with a taste rank');
  assert.ok(Math.abs(next.distanceKm - 33.4) < 0.3, String(next.distanceKm));
  // The last gap town by rank, and any other group, compare with the top gap town.
  assert.deepEqual([comparisonTown(file, 'Beta', centers).town, comparisonTown(file, 'Beta', centers).basis], ['Alfa', 'top']);
  assert.deepEqual([comparisonTown(file, 'Delta', centers).town, comparisonTown(file, 'Delta', centers).basis], ['Alfa', 'top']);
  assert.equal(comparisonTown(file, 'Epsilon', new Map()).distanceKm, null, 'no centers: no distance, still a comparison');
  assert.equal(comparisonTown(file, 'Nowhere', centers), null);
  assert.equal(comparisonTown({ towns: [row('Alfa', 'gap', 2)] }, 'Alfa', centers), null, 'no other gap town: nothing to compare');
  // The note's rule in the server, which this mirrors, is pinned in test/agent.test.mjs.
  const server = fs.readFileSync(new URL('../scripts/serve-eagle.mjs', import.meta.url), 'utf8');
  assert.match(server, /const gapRows = \(file\?\.towns \|\| \[\]\)\.filter\(\(r\) => r\.group === "gap" && r\.town !== business\.town\)\.sort\(\(a, b\) => \(a\.tasteRank \?\? 99\) - \(b\.tasteRank \?\? 99\)\);/);
});

test('the plan reads the map verdict with no model turn and refuses unknown towns and industries', async () => {
  const asked = [];
  const businessAnswer = async (body, options) => { asked.push({ body, options });
    return { speech: 'Alfa is a gap.', places: [{ name: 'Panadería Uno' }], business: { town: body.town, available: body.town !== 'Missing', evidence: { opportunity: { group: 'gap' } } } }; };
  const plan = createPlan({ businessAnswer, opportunity: { get: (id) => (id === 'bakery' ? file : null) }, centers,
    knownTown: (name) => ({ alfa: 'Alfa', missing: 'Missing' })[fold(name)] || '', now: () => new Date('2026-10-26T12:00:00Z') });
  const ok = await plan({ industry: 'bakery', town: 'alfa', lang: 'es' });
  assert.equal(ok.status, 200);
  assert.deepEqual(asked[0], { body: { question: 'Should I open a bakery in Alfa?', town: 'Alfa', lang: 'es' }, options: { force: true } });
  assert.equal(ok.body.town, 'Alfa');
  assert.equal(ok.body.lang, 'es');
  assert.deepEqual(ok.body.label, { en: 'bakery', es: 'panadería' });
  assert.equal(ok.body.compare.town, 'Gama');
  assert.equal(ok.body.at, '2026-10-26T12:00:00.000Z');
  assert.equal((await plan({ industry: 'bakery', town: 'Miami' })).status, 400);
  assert.equal((await plan({ industry: 'florist', town: 'Alfa' })).status, 400);
  assert.equal((await plan({ industry: 'cafe', town: 'Alfa' })).status, 503, 'an unbuilt industry is not a crash');
  assert.equal(asked.length, 1, 'no verdict call for a refused request');
  // A town whose saved catalog cannot be read gets no plan, never a printed "0 places" (Codex review 10/26).
  assert.deepEqual(await plan({ industry: 'bakery', town: 'Missing' }), { status: 503, body: { error: 'The town catalog is unavailable' } });
});

test('the plan page is served at /plan, rate limited, and reads the shared verdict sentences', () => {
  const server = fs.readFileSync(new URL('../scripts/serve-eagle.mjs', import.meta.url), 'utf8');
  assert.match(server, /"\/plan": "\/app\/plan\.html"/);
  assert.match(server, /url\.pathname === "\/api\/plan" && req\.method === "GET"/);
  assert.match(server, /const privateRoute = \[[^\]]*"\/api\/plan"/, 'an unexpected plan error gets the fixed public message');
  assert.match(fs.readFileSync(new URL('../server/limits.mjs', import.meta.url), 'utf8'), /"\/api\/plan": 20/);
  const html = fs.readFileSync(new URL('../app/plan.html', import.meta.url), 'utf8');
  for (const src of ['/app/vendor/qrcode.js', '/app/opportunity.js', '/app/marks.js', '/app/decision.js', '/app/plan.js']) assert.ok(html.includes(`<script src="${src}"></script>`), src);
  assert.match(html, /@page \{ size: letter;/);
  const page = fs.readFileSync(new URL('../app/plan.js', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /innerHTML = [^;]*\$\{plan\.town\}/, 'API strings go through esc');
  // Codex review 10/26 r2: one slot per place, clipped names in the checklist too, and "neither source" only when both were read.
  assert.match(page, /const linked = \[\.\.\.new Set\(\(params\.get\("visit"\) \|\| ""\)\.split\(","\)\)\]/);
  assert.match(page, /ZemiDecision\.parts\(business, o, places, lang, \{ shown: \(name\) => clip\(name, 60\) \}\)/);
  assert.match(page, /esc\(supply \? T\.noPlaces : T\.noPlacesQloo\)/);
});

test('the shared verdict sentences link the plan in the session language', () => {
  const context = { URLSearchParams, ZemiOpportunity: { LABELS: { en: { gap: 'Gap' }, es: { gap: 'Brecha' } }, censusScope: () => '' } };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(new URL('../app/decision.js', import.meta.url), 'utf8'), context);
  assert.equal(context.ZemiDecision.planHref('bakery', 'Río Grande', 'es'), '/plan?industry=bakery&town=R%C3%ADo+Grande&lang=es');
  assert.equal(context.ZemiDecision.planHref('cafe', 'Ponce', 'en'), '/plan?industry=cafe&town=Ponce');
  // The card's first three places with a plain id ride in the link; anything else stays out.
  assert.equal(context.ZemiDecision.planHref('cafe', 'Ponce', 'en', [{ id: 'a-1' }, { id: 'b<2' }, { name: 'no id' }, { id: 'd4' }]),
    '/plan?industry=cafe&town=Ponce&visit=a-1%2Cd4');
  assert.equal(context.ZemiDecision.planHref('cafe', 'Ponce', 'en', [{ id: 'a-1' }, { id: 'a-1' }, { id: 'c3' }]), '/plan?industry=cafe&town=Ponce&visit=a-1%2Cc3',
    'a repeated id is one visit');
  assert.equal(context.ZemiDecision.planHref('cafe', 'Ponce', 'en', [{ id: 'a' }, { id: 'a' }, { id: 'b' }, { id: 'c' }]), '/plan?industry=cafe&town=Ponce&visit=a%2Cb%2Cc',
    'three unique ids, deduplicated before the limit');
  // Display clipping runs after the Qloo/Overture match: two long names that clip alike are still two places (Codex review 10/26 r3).
  const long = 'x'.repeat(59);
  const clipped = context.ZemiDecision.parts({ total: 1, evidence: { supply: { count: 1, places: [{ name: `${long} South` }] } } },
    { group: 'gap', tasteRank: 2, ranked: 76, establishments: 3, perTenThousand: 0.7, medianPerTenThousand: 1.3 }, [{ name: `${long} North` }], 'en',
    { shown: (n) => n.slice(0, 60) });
  assert.match(clipped.checks[0], new RegExp(`^Visit ${long}  and, from Overture's map, ${long}  at opening time`));
  const { says, checks } = context.ZemiDecision.parts({ total: 4, evidence: { supply: { count: 7 } } },
    { group: 'gap', tasteRank: 2, ranked: 76, establishments: 3, perTenThousand: 0.7, medianPerTenThousand: 1.3 }, [{ name: 'Panadería <Uno>' }], 'en');
  assert.match(says, /^Gap · taste #2 of 76\. 3 establishments with employees, 0\.7 per 10,000 residents against the median of 1\.3/);
  assert.match(checks[0], /^Visit Panadería &lt;Uno&gt; at opening time/, 'place names are escaped');
});

test('the vendored QR library is the unmodified qrcode-generator 2.0.4 build', async () => {
  const { createHash } = await import('node:crypto');
  const bytes = fs.readFileSync(new URL('../app/vendor/qrcode.js', import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '79ec86f82856005b1c887905cfccfcfbec3821ca61c7fd5a952faa5f778f791c');
  assert.match(bytes.toString('utf8'), /Licensed under the MIT license/);
});
