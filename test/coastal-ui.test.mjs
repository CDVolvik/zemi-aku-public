import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('switching browser tabs does not silently invalidate a pending port discovery', () => {
  const script = fs.readFileSync(new URL('../app/coastal.js', import.meta.url), 'utf8');
  const handler = script.match(/document.addEventListener\("visibilitychange", \(\) => \{[\s\S]*?\n    \}\);/)[0];
  let listener;
  const context = { mode: 'ports', generation: 4, timer: null, clearTimeout() {}, pollShips() {},
    document: { hidden: true, addEventListener: (event, callback) => { listener = callback; } } };
  vm.createContext(context); vm.runInContext(handler, context);
  listener();
  assert.equal(context.generation, 4);
  context.document.hidden = false; listener();
  assert.equal(context.generation, 4);
  context.mode = 'ships'; context.document.hidden = true; listener();
  assert.equal(context.generation, 5);
});

test('a rejected terrain token leaves a usable globe for coastal imagery', () => {
  const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  const block = html.match(/if \(window.ZEMI_ION_TOKEN\) \{\n  const terrainReady[\s\S]*?\n\} else \{/)[0].replace(/ else \{$/, '');
  let fail;
  const terrain = { errorEvent: { addEventListener: callback => { fail = callback; } } };
  const globe = { terrainProvider: undefined };
  const context = { window: { ZEMI_ION_TOKEN: 'test-only' }, toast() {}, viewer: { scene: { globe, setTerrain: () => terrain } },
    Cesium: { Terrain: { fromWorldTerrain: () => terrain }, EllipsoidTerrainProvider: class {} } };
  vm.runInNewContext(block, context);
  assert.equal(typeof fail, 'function', 'terrain errors must be observed through errorEvent');
  fail();
  assert.ok(globe.terrainProvider instanceof context.Cesium.EllipsoidTerrainProvider);
});

for (const navigation of ['goHome', 'select', 'showCatalog']) {
  test(`${navigation} clears a stale port return when leaving coastal results`, async () => {
    const html = fs.readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
    const nodes = new Map([['coast-return', { hidden: false, textContent: 'Back to Mayagüez port' }], ['directory', { dataset: {} }]]);
    const noop = () => {};
    const context = { $: id => { if (!nodes.has(id)) nodes.set(id, {}); return nodes.get(id); },
      byName: new Map([['Ponce', { record: { town: 'Ponce' } }]]), ZemiApp: {},
      focusToken: 0, placesToken: 0, leadNames: [], dirCat: 'food',
      placeSource: { entities: { removeAll: noop } }, heatSource: { entities: { removeAll: noop } },
      loadPlaces: async () => {}, opportunityUI: null,
      mapHistory: { beginUserNav: noop }, localFocus: (f) => f,
    };
    for (const name of ['clearJourney', 'drawFootprint', 'repaint', 'hideCaption', 'showHits', 'goStep',
      'flyHome', 'openTownView', 'loadHeat', 'loadProfile', 'loadDirectory', 'loadLandmarks', 'frameWholeTown',
      'drawHeat', 'orderByLead', 'resetCategory', 'showListTitle', 'showBusinessResearch', 'showSay',
      'showSources', 'renderList', 'drawPlaces', 'framePlaces', 'leaveOpportunity', 'showPicks',
      'syncHash', 'focusSanJuan']) context[name] = noop;
    const source = html.match(new RegExp(`function ${navigation}\\([^]*?\\n}\\n`));
    assert.ok(source);
    vm.createContext(context); vm.runInContext(source[0], context);
    if (navigation === 'select') await context.select('Ponce');
    else if (navigation === 'showCatalog') context.showCatalog({ journey: { artist: 'Bad Bunny' }, places: [] });
    else context.goHome();
    assert.equal(nodes.get('coast-return').hidden, true);
  });
}
