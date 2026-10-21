import test from 'node:test';
import assert from 'node:assert/strict';
import { createWeather, digestForecast, digestAlerts, nearbyStorms } from '../server/weather.mjs';
import { agentTools } from '../server/agent-tools.mjs';
import { PROMPT } from '../server/agent.mjs';

const periods = [
  { name: 'Tonight', startTime: '2026-10-12T18:00:00-04:00', isDaytime: false, temperature: 78, temperatureUnit: 'F',
    probabilityOfPrecipitation: { value: 10 }, windSpeed: '3 to 7 mph', windDirection: 'ENE', shortForecast: 'Isolated Rain Showers' },
  { name: 'Tuesday', startTime: '2026-10-13T06:00:00-04:00', isDaytime: true, temperature: 90, temperatureUnit: 'F',
    probabilityOfPrecipitation: { value: 60 }, windSpeed: '2 to 14 mph', windDirection: 'E', shortForecast: 'Chance Showers And Thunderstorms' },
  { name: 'Tuesday Night', startTime: '2026-10-13T18:00:00-04:00', isDaytime: false, temperature: 79, temperatureUnit: 'F',
    probabilityOfPrecipitation: { value: null }, windSpeed: '3 to 7 mph', windDirection: 'ENE', shortForecast: 'Mostly Clear' },
];

test('the forecast digest keeps NWS wording, both temperature units and a null rain chance as unknown', () => {
  const out = digestForecast({ properties: { updated: '2026-10-12T20:00:00+00:00', periods } }, { periods: 2 });
  assert.equal(out.source, 'National Weather Service');
  assert.equal(out.updated, '2026-10-12T20:00:00+00:00');
  assert.equal(out.periods.length, 2);
  assert.deepEqual(out.periods[1], { name: 'Tuesday', start: '2026-10-13T06:00:00-04:00', daytime: true, fahrenheit: 90, celsius: 32,
    rainChance: 60, wind: '2 to 14 mph E', forecast: 'Chance Showers And Thunderstorms' });
  const night = digestForecast({ properties: { periods } }, { periods: 3 }).periods[2];
  assert.equal(night.rainChance, null);
  assert.doesNotMatch(JSON.stringify(out), /undefined/);
});

test('alerts are reduced to what a traveller needs and never carry the raw instruction text as advice', () => {
  const out = digestAlerts({ features: [{ properties: { event: 'Flood Watch', severity: 'Moderate', areaDesc: 'Ponce; Juana Díaz',
    onset: '2026-10-13T12:00:00-04:00', ends: '2026-10-14T06:00:00-04:00', headline: 'Flood Watch until Wednesday morning', instruction: 'Turn around' } }] });
  assert.deepEqual(out, { source: 'National Weather Service', count: 1,
    alerts: [{ event: 'Flood Watch', severity: 'Moderate', areas: 'Ponce; Juana Díaz', onset: '2026-10-13T12:00:00-04:00', ends: '2026-10-14T06:00:00-04:00', headline: 'Flood Watch until Wednesday morning' }],
    authority: 'weather.gov' });
  assert.equal(digestAlerts({ features: [] }).count, 0);
});

test('only Atlantic storms within reach of Puerto Rico are kept, with distance and heading', () => {
  const storms = nearbyStorms({ activeStorms: [
    { id: 'al152026', name: 'Tammy', classification: 'HU', intensity: '90', latitudeNumeric: 16.5, longitudeNumeric: -61.0, movementDir: 300, movementSpeed: 12, lastUpdate: '2026-10-12T21:00:00.000Z' },
    { id: 'ep202026', name: 'Simon', classification: 'HU', intensity: '85', latitudeNumeric: 20.2, longitudeNumeric: -106.8, movementDir: 290, movementSpeed: 3 },
    { id: 'al162026', name: 'Far', classification: 'TS', intensity: '45', latitudeNumeric: 30, longitudeNumeric: -20, movementDir: 0, movementSpeed: 10 },
  ] });
  assert.equal(storms.source, 'National Hurricane Center');
  assert.deepEqual(storms.storms.map((s) => s.name), ['Tammy']);
  const tammy = storms.storms[0];
  assert.equal(tammy.kind, 'Hurricane');
  assert.equal(tammy.knots, 90);
  assert.ok(tammy.kmFromPuertoRico > 500 && tammy.kmFromPuertoRico < 700, String(tammy.kmFromPuertoRico));
  assert.equal(tammy.lat, 16.5);
  assert.equal(tammy.moving, 'WNW at 12 kt');
  assert.deepEqual(nearbyStorms({ activeStorms: [] }).storms, []);
});

test('the weather client sends a User-Agent, caches per town and reports an outage instead of throwing', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push([String(url), options?.headers?.['User-Agent']]);
    if (String(url).includes('/points/')) return { ok: true, json: async () => ({ properties: { forecast: 'https://api.weather.gov/gridpoints/SJU/1,1/forecast' } }) };
    if (String(url).includes('/forecast')) return { ok: true, json: async () => ({ properties: { updated: 'now', periods } }) };
    if (String(url).includes('/alerts/')) return { ok: true, json: async () => ({ features: [] }) };
    if (String(url).includes('CurrentStorms')) return { ok: false, status: 503, json: async () => ({}) };
    throw new Error('unexpected ' + url);
  };
  const weather = createWeather({ fetchImpl, centers: new Map([['ponce', { lat: 18.0, lon: -66.6 }]]) });
  const first = await weather.forecast('Ponce');
  const again = await weather.forecast('Ponce');
  assert.equal(first.periods[0].name, 'Tonight');
  assert.equal(again, first);
  assert.equal(calls.filter(([url]) => url.includes('weather.gov')).length, 2);
  assert.ok(calls.every(([, agent]) => agent && agent.includes('zemi')));
  assert.deepEqual(await weather.forecast('Atlantis'), { error: 'Unknown town.' });
  assert.deepEqual(await weather.storms(), { error: 'Storm data is unavailable right now.' });
  assert.equal((await weather.alerts()).count, 0);
});

test('town_weather gives the model a three-day digest with alerts and storms, and asks the map to show the rain layer', async () => {
  const weather = {
    forecast: async (town) => ({ town, source: 'National Weather Service', periods: [{ name: 'Tuesday', rainChance: 60 }] }),
    alerts: async () => ({ count: 0, alerts: [] }),
    storms: async () => ({ storms: [] }),
  };
  const tool = agentTools({ towns: ['Ponce'], categories: [], weather }).find((t) => t.name === 'town_weather');
  assert.ok(tool, 'town_weather is registered');
  assert.deepEqual(tool.parameters.required, ['town']);
  const out = await tool.run({ town: 'Ponce' });
  assert.equal(out.data.forecast.periods[0].rainChance, 60);
  assert.equal(out.data.alerts.count, 0);
  assert.match(out.data.note, /Qloo/);
  assert.match(out.data.note, /weather\.gov/);
  assert.deepEqual(out.action, { type: 'show_weather', town: 'Ponce' });
  const down = agentTools({ towns: ['Ponce'], categories: [], weather: { ...weather, forecast: async () => ({ error: 'Weather is unavailable right now.' }) } })
    .find((t) => t.name === 'town_weather');
  assert.equal((await down.run({ town: 'Ponce' })).error, 'Weather is unavailable right now.');
  assert.equal(agentTools({ towns: ['Ponce'], categories: [] }).find((t) => t.name === 'town_weather'), undefined, 'no weather client, no tool');
});

test('the model is told weather shapes a Qloo recommendation and is never emergency guidance', () => {
  assert.match(PROMPT, /town_weather/);
  assert.match(PROMPT, /National Weather Service/);
  assert.match(PROMPT, /not emergency guidance|never emergency guidance/i);
});
