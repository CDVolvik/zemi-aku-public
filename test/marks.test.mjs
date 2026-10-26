import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../app/dossier.js', import.meta.url), 'utf8'), context);
vm.runInContext(fs.readFileSync(new URL('../app/marks.js', import.meta.url), 'utf8'), context);
const marks = context.window.ZemiMarks;

test('every catalog category has its own mark, and unknown kinds fall back to "other"', () => {
  for (const id of ['food', 'drinks', 'stay', 'groceries', 'shopping', 'fun', 'outdoors', 'culture', 'health', 'other']) {
    assert.match(marks.KINDS[id].color, /^#[0-9a-f]{6}$/i, id);
    assert.ok(marks.KINDS[id].label, id);
  }
  assert.equal(marks.kindOf({ category: 'stay' }), 'stay');
  assert.equal(marks.kindOf({ category: 'spaceport' }), 'other');
  assert.equal(marks.kindOf({}), 'other');
  assert.equal(marks.kindOf(null), 'other');
  const colors = new Set(Object.values(marks.KINDS).map((kind) => kind.color.toLowerCase()));
  assert.equal(colors.size, Object.keys(marks.KINDS).length, 'two categories share a color');
});

test('the legend lists only the kinds on the map, in catalog order, with counts', () => {
  const html = marks.legend([{ category: 'stay' }, { category: 'food' }, { category: 'food' }, { category: 'nope' }]);
  assert.ok(html.indexOf('Food') < html.indexOf('Places to stay'));
  assert.ok(html.indexOf('Places to stay') < html.indexOf('Services and more'));
  assert.match(html, /Food<b>2<\/b>/);
  assert.match(html, /Places to stay<b>1<\/b>/);
  assert.doesNotMatch(html, /Bars and nightlife|Shopping/);
  assert.equal(marks.legend([]), '');
});

test('the pin card shows the picture, name, kind, town and Qloo standing, and escapes text', () => {
  const html = marks.card({ name: 'La <Guancha>', category: 'food', genre: 'Seafood restaurant', municipality: 'Ponce',
    image: 'https://x/y.jpg', rating: 4.6, price: '$$', popularity: 0.93 });
  assert.match(html, /La &lt;Guancha&gt;/);
  assert.doesNotMatch(html, /<Guancha>/);
  assert.match(html, /src="https:\/\/x\/y\.jpg"/);
  assert.match(html, /Food/);
  assert.match(html, /Seafood restaurant · Ponce/);
  assert.match(html, /4\.6/);
  assert.match(html, /\$\$/);
  assert.match(html, /top 7% on Qloo/);
  assert.doesNotMatch(html, /undefined|null/);
});

test('the pin card copes with a bare record and tells a phone how to open the full record', () => {
  const html = marks.card({ name: 'Kiosko' }, { touch: true });
  assert.match(html, /Kiosko/);
  assert.match(html, /Services and more/);
  assert.doesNotMatch(html, /<img|undefined|null|on Qloo/);
  assert.match(html, /Tap again/);
  assert.doesNotMatch(marks.card({ name: 'Kiosko' }), /Tap again/);
  assert.match(marks.card({ name: 'Mirador', aerial: 'https://tiles/a.jpg' }), /pick-initial letter|class="letter"/);
});

test('a Spanish answer gets Spanish chips, legend and hours; English stays as the data came', () => {
  const place = { name: 'La Casita', category: 'food', hours: 'Today 5:00 pm–12:00 am', lat: 18, lon: -66 };
  const es = marks.resultCards([place, { name: 'Cerrada', category: 'other', hours: 'Closed today' }], { lang: 'es' });
  assert.match(es, /cat-chip[^>]*>Comida</);
  assert.match(es, /Hoy 5:00 pm–12:00 am/);
  assert.match(es, /Cerrado hoy/);
  assert.match(es, /Servicios y más/);
  const en = marks.resultCards([place], { lang: 'en' });
  assert.match(en, /cat-chip[^>]*>Food</);
  assert.match(en, /Today 5:00 pm–12:00 am/);
  assert.equal(marks.hoursText('Open 24 hours', 'es'), 'Abierto 24 horas');
  // Exact picks: only a whole name counts, so sister bakeries sharing a prefix are not pulled in (judge panel 10/25).
  const sisters = [{ name: 'Panadería y Repostería Sabrosón y Palermo' }, { name: 'El Horno de Pane' }, { name: 'Panadería y Repostería la Ceiba' }];
  const said = 'Visite El Horno de Pane y Panadería y Repostería la Ceiba; revise sus horarios.';
  assert.deepEqual(marks.picks(sisters, said, 3, { exact: true }).map((p) => p.name), ['El Horno de Pane', 'Panadería y Repostería la Ceiba']);
  assert.deepEqual(marks.picks(sisters, said).map((p) => p.name).length, 3, 'the loose match still pulls the sister in');
  assert.deepEqual(marks.picks(sisters, 'Visit somewhere else entirely.', 3, { exact: true }), [], 'exact mode never invents a match (Codex review 10/25)');
  assert.deepEqual(marks.picks([{ id: 'x', name: 'El Horno de Pane' }, { id: 'x', name: 'El Horno de Pane' }, { name: 'La Ceiba' }], 'El Horno de Pane and El Horno de Pane', 3, { exact: true }).length, 1, 'a duplicate record counts once');
  assert.equal(marks.hoursText('Today 12:00 am–12:00 am', 'en'), 'Open 24 hours', 'midnight to midnight is a day-long window (judge panel 10/25)');
  assert.equal(marks.hoursText('Today 12:00 am–12:00 am', 'es'), 'Abierto 24 horas');
  assert.equal(marks.hoursText('Today 12:00 am–3:00 am', 'en'), 'Today 12:00 am–3:00 am');
  assert.equal(marks.hoursText('', 'es'), '');
  // The legend and the pin card follow <html lang>.
  context.document = { documentElement: { lang: 'es' } };
  assert.match(marks.legend([{ category: 'stay' }]), /Hospedajes<b>1<\/b>/);
  assert.match(marks.card({ name: 'Kiosko' }), /Servicios y más/);
  context.document = { documentElement: { lang: 'en' } };
  assert.match(marks.legend([{ category: 'stay' }]), /Places to stay<b>1<\/b>/);
});

test('the server publishes each place with the catalog category the map colors by', async () => {
  const { categoryOf } = await import('../server/catalog.mjs');
  const { domainOf, affinityWhy } = await import('../server/lib.mjs');
  const source = fs.readFileSync(new URL('../scripts/serve-eagle.mjs', import.meta.url), 'utf8')
    .match(/function publishPlace\([^]*?\n}\n/)[0];
  const server = { categoryOf, domainOf, affinityWhy, fact() {}, telHref: () => '', hostOf: () => '', safeHttp: (s) => s, overtureMatch: () => null,
    priceLabel: () => '', wikiUrl: () => '', sourceLine: () => '' };
  vm.createContext(server); vm.runInContext(source, server);
  const base = { name: 'X', socials: [], details: {} };
  assert.equal(server.publishPlace({ ...base, genreId: 'urn:tag:genre:place:hotel', genre: 'Hotel' }).category, 'stay');
  assert.equal(server.publishPlace({ ...base, category: 'drinks', genreId: 'urn:tag:genre:place:hotel' }).category, 'drinks');
  assert.equal(server.publishPlace({ ...base, genre: 'Unheard-of thing' }).category, 'other');
  assert.equal(server.publishPlace({ ...base, affinity: 0.81, affinitySignal: 'Bad Bunny' }).why, 'Strong match for Bad Bunny fans (affinity 81/100)');
  assert.equal(server.publishPlace({ ...base, affinity: 0.45, affinitySignal: 'Bad Bunny' }).why, 'Good match for Bad Bunny fans (affinity 45/100)');
  assert.equal(server.publishPlace({ ...base, affinity: 0.12, affinitySignal: 'Bad Bunny' }).why, '');
  assert.equal(server.publishPlace({ ...base, affinity: 0.81, affinitySignal: 'Bad Bunny', whyLang: 'es' }).why, 'Fuerte afinidad para fans de Bad Bunny (81 de 100)');
  assert.equal(server.publishPlace({ ...base, affinity: 0.81 }).why, '');
});

test('the picks are the places the answer names, in the order spoken, else the first three', () => {
  const places = [{ name: 'Melao Coffee Shop' }, { name: 'La Placita' }, { name: 'Cayo Icacos' }, { name: 'Campioni' }, { name: 'El Mesón' }];
  const speech = 'Fans of Bad Bunny also love Campioni in Ponce and Melao Coffee Shop. Cayo Icacos is a fourth.';
  assert.deepEqual(marks.picks(places, speech).map((p) => p.name), ['Campioni', 'Melao Coffee Shop', 'Cayo Icacos']);
  assert.deepEqual(marks.picks(places, '').map((p) => p.name), ['Melao Coffee Shop', 'La Placita', 'Cayo Icacos']);
  assert.deepEqual(marks.picks(places, 'Nothing named here').map((p) => p.name), ['Melao Coffee Shop', 'La Placita', 'Cayo Icacos']);
  assert.deepEqual(marks.picks([], speech), []);
});

test('a pick is found when the answer folds the name or shortens a long one', () => {
  const places = [{ name: 'Melao Coffee Shop' }, { name: 'Campioni Pizza Birra & Tapas' }, { name: 'Plaza Las Delicias' }, { name: 'La Casita Blanca' }, { name: 'La Casita de Rosa' }];
  const text = 'Try Campioni Pizza Birra and Tapas, then Plaza las Delicias. Later, Campioni again.';
  assert.deepEqual(marks.picks(places, text).map((p) => p.name), ['Campioni Pizza Birra & Tapas', 'Plaza Las Delicias']);
  assert.deepEqual(marks.picks(places, 'Nothing beats MELAO coffee shop.').map((p) => p.name), ['Melao Coffee Shop']);
  // Two words are not enough after an article: "La Casita" alone names neither.
  assert.deepEqual(marks.picks(places, 'La Casita is nice').map((p) => p.name), ['Melao Coffee Shop', 'Campioni Pizza Birra & Tapas', 'Plaza Las Delicias']);
  assert.deepEqual(marks.picks(places, 'La Casita Blanca is nice').map((p) => p.name), ['La Casita Blanca']);
});

test('a pick card shows the photo, the name, the kind and town, and the rating; no photo falls back to a letter tile', () => {
  const html = marks.pickCards([
    { name: 'Campioni Pizza', category: 'food', genre: 'Pizza restaurant', municipality: 'Ponce', rating: 4.6, image: 'https://img/p.jpg', index: 3 },
    { name: 'Cayo Icacos', category: 'outdoors', municipality: 'Fajardo', index: 0 },
  ]);
  assert.match(html, /<button type="button" class="pick" data-index="3"/);
  assert.match(html, /<img alt="" src="https:\/\/img\/p\.jpg" referrerpolicy="no-referrer"/);
  assert.match(html, /Campioni Pizza/);
  assert.match(html, /Pizza restaurant · Ponce/);
  assert.match(html, /★ 4\.6/);
  assert.match(html, /pick-initial letter/);
  assert.match(html, /data-index="0"/);
  assert.doesNotMatch(html, /undefined/);
});

test('a chain with no photo of its own shows the brand logo on a plain tile; a Commons photo beats the logo', () => {
  const chain = { name: "Chili's", category: 'food', logo: 'https://commons/logo.png', aerial: 'https://img/a.jpg', index: 1 };
  assert.match(marks.card(chain), /<img class="logo" alt="" src="https:\/\/commons\/logo\.png"/);
  assert.doesNotMatch(marks.card(chain), /img\/a\.jpg/);
  assert.match(marks.card({ ...chain, image: 'https://commons/photo.jpg' }), /src="https:\/\/commons\/photo\.jpg"/);
  assert.doesNotMatch(marks.card({ ...chain, image: 'https://commons/photo.jpg' }), /commons\/logo\.png/);
  const picks = marks.pickCards([chain]);
  assert.match(picks, /<img class="logo" alt="" src="https:\/\/commons\/logo\.png"/);
  assert.doesNotMatch(picks, /img\/a\.jpg/);
});

test('result cards carry why-it-fits, distance, actions and a small location thumb when present', () => {
  const html = marks.resultCards([
    { name: 'TocaMadera', category: 'food', why: 'Strong match for Bad Bunny fans (affinity 81/100)', lat: 18.4, lon: -66.15,
      hours: 'Today 8–4', rating: 4.5, aerial: 'https://img/a.jpg', index: 2 },
  ], { from: { lat: 18.4, lon: -66.16 }, lang: 'en', focusedIndex: 2 });
  assert.match(html, /<ul class="answer-cards">/);
  assert.match(html, /<li><article class="result-card"/);
  assert.doesNotMatch(html, /role="button"|tabindex="0"/);
  assert.match(html, /data-tone="coral"/);
  assert.match(html, /class="result-name" data-open-place aria-current="true"/);
  assert.match(html, /aria-describedby="result-why-\d+-0 result-meta-\d+-0"/);
  assert.match(html, /Why it's here/);
  assert.match(html, /Strong match for Bad Bunny fans \(affinity 81\/100\)/);
  assert.doesNotMatch(html, />Open<|>Show on map</);
  assert.match(html, /aria-label="Ask more: TocaMadera"/);
  assert.match(html, /https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=18\.4,-66\.15/);
  assert.match(html, /Ask more/);
  assert.match(html, /result-location/);
  assert.match(html, /cat-chip/);
  assert.doesNotMatch(html, /undefined/);
  const noCoords = marks.resultCards([{ name: 'X', category: 'food', index: 1 }], { lang: 'en' });
  assert.match(noCoords, /class="result-name" data-open-place/);
  assert.match(noCoords, /hours not listed/, 'a place with no hours says so (judge panel 10/24 round 3)');
  assert.match(marks.resultCards([{ name: 'X', category: 'food' }], { lang: 'es' }), /sin horario publicado/);
  assert.doesNotMatch(noCoords, /maps\/dir/);
  assert.doesNotMatch(noCoords, /Why it's here/);
  assert.doesNotMatch(marks.resultCards([{ name: 'Y', category: 'food', affinity: null }]), /data-index=/);
});

test('result-why / result-meta ids stay unique across two renders and describedby stays in-list', () => {
  const place = { name: 'TocaMadera', category: 'food', why: 'Strong match', rating: 4.5, hours: 'Today 8–4' };
  const a = marks.resultCards([place]);
  const b = marks.resultCards([{ ...place, name: 'Campioni' }]);
  const ids = (html) => [...html.matchAll(/\bid="(result-(?:why|meta)-[^"]+)"/g)].map((m) => m[1]);
  const aIds = ids(a);
  const bIds = ids(b);
  assert.ok(aIds.length >= 2, 'first list has why and meta ids');
  assert.ok(bIds.length >= 2, 'second list has why and meta ids');
  const all = [...aIds, ...bIds];
  assert.equal(new Set(all).size, all.length, 'no duplicate ids across two result-card renders');
  for (const html of [a, b]) {
    const listIds = new Set(ids(html));
    for (const refs of [...html.matchAll(/aria-describedby="([^"]+)"/g)].map((m) => m[1].split(/\s+/))) {
      for (const ref of refs) assert.ok(listIds.has(ref), `${ref} must resolve inside its own list`);
    }
  }
});

test('a card names the place by its own kind, in Spanish on a Spanish page; an unknown genre shows its category, never English (judge panels 10/24-10/25)', () => {
  assert.equal(marks.genreName({ genre: 'Fast food restaurant', category: 'food' }, 'en'), 'Fast food restaurant');
  assert.equal(marks.genreName({ genre: 'Fast food restaurant', category: 'food' }, 'es'), 'Comida rápida');
  assert.equal(marks.genreName({ genre: 'Bakery', category: 'food' }, 'es'), 'Panadería');
  assert.equal(marks.genreName({ genre: 'Puerto Rican restaurant', category: 'food' }, 'es'), 'Restaurante puertorriqueño');
  assert.equal(marks.genreName({ genre: 'Gay bar', category: 'food' }, 'es'), 'Bar gay');
  assert.equal(marks.genreName({ genre: 'Department of motor vehicles', category: 'other' }, 'es'), 'Servicios y más');
  assert.equal(marks.genreName({ kind: 'Bar', category: 'food' }, 'es'), 'Bar', 'agent cards carry the genre as kind');
  assert.equal(marks.genreName({ category: 'food' }, 'es'), '');
});

test('a food answer that holds bars says so: Qloo lists these bars under restaurants (Opus 10/25, "where do fans eat")', () => {
  const bars = [
    { name: 'La Victoria', genre: 'Bar', category: 'food' },
    { name: 'Los Kings Lounge', genre: 'Fast food restaurant', category: 'food' },
  ];
  const en = marks.resultCards(bars, { lang: 'en' });
  assert.match(en, /<span class="cat-chip"[^>]*>Bar<\/span>/);
  assert.match(en, /<span class="cat-chip"[^>]*>Fast food restaurant<\/span>/);
  assert.match(en, /<p class="cards-note">Qloo lists this bar under restaurants, which is why it appears here\.<\/p>$/);
  const es = marks.resultCards(bars, { lang: 'es' });
  assert.match(es, /<span class="cat-chip"[^>]*>Bar<\/span>/);
  assert.match(es, /Qloo clasifica este bar como restaurante; por eso aparece aquí\./, 'one bar, singular');
  // Every bar kind found under restaurants in the 78 catalogs gets the note; drinks-free "bars" do not.
  for (const genre of ['Live music bar', 'Gastropub', 'Irish pub', 'Salsa bar', 'Piano bar', 'Karaoke bar', 'Beer hall', 'Sports bar', 'Bar & grill']) {
    assert.match(marks.resultCards([{ name: 'X', genre, category: 'food' }], { lang: 'en' }), /this bar under restaurants/, genre);
  }
  for (const genre of ['Snack bar', 'Juice bar', 'Salad bar', 'Oyster bar']) assert.doesNotMatch(marks.resultCards([{ name: 'X', genre, category: 'food' }], { lang: 'en' }), /cards-note/, genre);
  assert.match(marks.resultCards([{ name: 'A', genre: 'Bar', category: 'food' }, { name: 'B', genre: 'Pub', category: 'food' }], { lang: 'es' }), /estos bares como restaurantes/);
  // A café called an espresso bar, or a bar filed under drinks, is not a bar in a food list.
  assert.doesNotMatch(marks.resultCards([{ name: 'Cuatro Sombras', genre: 'Espresso bar', category: 'food' }], { lang: 'en' }), /cards-note/);
  assert.doesNotMatch(marks.resultCards([{ name: 'La Factoría', genre: 'Cocktail bar', category: 'drinks' }], { lang: 'en' }), /cards-note/);
});

test('the match line and the weather line follow the page language (probe 10/25, Opus 10/24)', () => {
  assert.equal(marks.whyLine('Strong match for Bad Bunny fans (affinity 88/100)', 'es'), 'Fuerte afinidad para fans de Bad Bunny (88 de 100)');
  assert.equal(marks.whyLine('Good match for Vico C fans (affinity 52/100)', 'es'), 'Buena afinidad para fans de Vico C (52 de 100)');
  assert.equal(marks.whyLine('Fuerte afinidad para fans de Bad Bunny (88 de 100)', 'en'), 'Strong match for Bad Bunny fans (affinity 88/100)');
  // Saved runs carry the older percentage form; it reads as a score out of 100 too (judge panel 10/26).
  assert.equal(marks.whyLine('Strong match for Bad Bunny fans (88%)', 'en'), 'Strong match for Bad Bunny fans (affinity 88/100)');
  assert.equal(marks.whyLine('Buena afinidad para fans de Vico C (52%)', 'es'), 'Buena afinidad para fans de Vico C (52 de 100)');
  assert.match(marks.resultCards([{ name: 'La Victoria', genre: 'Bar', category: 'food', why: 'Strong match for Bad Bunny fans (affinity 87/100)' }], { lang: 'es' }), /Fuerte afinidad para fans de Bad Bunny \(87 de 100\)/);
  const weatherContext = { window: {} };
  vm.createContext(weatherContext);
  vm.runInContext(fs.readFileSync(new URL('../app/weather.js', import.meta.url), 'utf8'), weatherContext);
  const data = { forecast: { periods: [{ daytime: true, name: 'This Afternoon', fahrenheit: 90, celsius: 32, rainChance: 20, forecast: 'Isolated Rain Showers' }] },
    alerts: { alerts: [{ event: 'Rip Current Statement' }] } };
  assert.equal(weatherContext.window.ZemiWeather.line(data, 'es'), 'Aviso vigente: Rip Current Statement (weather.gov, en inglés). Pronóstico de weather.gov: 90°F / 32°C, 20% de probabilidad de lluvia.');
  assert.equal(weatherContext.window.ZemiWeather.line(data), 'Rip Current Statement in effect (weather.gov). This Afternoon: 90°F / 32°C, 20% chance of rain, isolated rain showers.');
});

test('hours from a saved catalog carry their date in both languages, and live hours keep "Today" (judge panel 10/25 round 8)', () => {
  assert.equal(marks.hoursText('On Oct 7: 5:00 pm–3:00 am', 'en'), 'On Oct 7: 5:00 pm–3:00 am');
  assert.equal(marks.hoursText('On Oct 7: 5:00 pm–3:00 am', 'es'), 'El 7 oct: 5:00 pm–3:00 am');
  assert.equal(marks.hoursText('Closed on Oct 7', 'es'), 'Cerrado el 7 oct');
  assert.equal(marks.hoursText('Open 24 hours on Oct 7', 'es'), 'Abierto 24 horas el 7 oct');
  assert.equal(marks.hoursText('Today 12:00 am–12:00 am', 'es'), 'Abierto 24 horas');
  assert.equal(marks.hoursText('Today 8:00 am–4:00 pm', 'es'), 'Hoy 8:00 am–4:00 pm');
});

test('a card in another town shows no distance, and an affinity percentage is defined under the cards (judge panel 10/25 round 8)', () => {
  const caguas = { name: 'Panadería Caguas', municipality: 'Caguas', lat: 18.23, lon: -66.03, category: 'food', genre: 'Bakery', why: 'Strong match for Vico C fans (affinity 96/100)' };
  const home = { name: 'Panadería Mayagüez', municipality: 'Mayagüez', lat: 18.2, lon: -67.14, category: 'food', genre: 'Bakery' };
  const from = { lat: 18.2, lon: -67.13 };
  const html = marks.resultCards([caguas, home], { from, fromTown: 'Mayagüez', lang: 'en' });
  const metas = [...html.matchAll(/<p class="result-meta"[^>]*>([^<]*)<\/p>/g)].map((m) => m[1]);
  assert.doesNotMatch(metas[0], /km/, 'the Caguas card has no distance from Mayagüez');
  assert.match(metas[1], /km/, 'the Mayagüez card keeps its distance');
  assert.match(html, /not the share of fans who go/);
  assert.match(marks.resultCards([caguas], { lang: 'es' }), /No es qué parte de los fans va/);
  assert.doesNotMatch(marks.resultCards([home], { lang: 'en' }), /affinity score/, 'no percentage, no definition');
});

test('a distance with no origin of its own is hidden for a card in another town; a port distance stays (round-nine review)', () => {
  const far = { name: 'Caguas Bakery', municipality: 'Caguas', distanceKm: 111, lat: 18.23, lon: -66.03, category: 'food' };
  assert.doesNotMatch(marks.resultCards([far], { fromTown: 'Mayagüez', lang: 'en' }), /111\.0 km/);
  const port = { ...far, distanceFrom: 'Puerto de Mayagüez' };
  assert.match(marks.resultCards([port], { fromTown: 'Mayagüez', lang: 'en' }), /111\.0 km/);
});

test('second pass: an explicit distance on a card with no town is not shown against an open town (round-nine review)', () => {
  assert.doesNotMatch(marks.resultCards([{ name: 'Unknown Bakery', distanceKm: 111, category: 'food' }], { fromTown: 'Mayagüez', lang: 'en' }), /111\.0 km/);
  assert.match(marks.resultCards([{ name: 'Home Bakery', municipality: 'Mayagüez', distanceKm: 2, category: 'food' }], { fromTown: 'Mayagüez', lang: 'en' }), /2\.0 km/);
});

test('third pass: no distance without a proven origin (round-nine review)', () => {
  assert.doesNotMatch(marks.resultCards([{ name: 'Unknown', distanceKm: 111, category: 'food' }], {}), /111\.0 km/);
  const orphan = { name: 'Orphan', lat: 18.2, lon: -66.1, category: 'food' };
  assert.doesNotMatch(marks.resultCards([orphan], { from: { lat: 18.2, lon: -67.14 }, fromTown: 'Mayagüez' }), / km/);
  assert.match(marks.resultCards([{ ...orphan, municipality: 'Mayagüez', lon: -67.13 }], { from: { lat: 18.2, lon: -67.14 }, fromTown: 'Mayagüez' }), /\d\.\d km/);
});
