import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Judge panel 10/26: the front page said 17 agent tools while the README said 18. Every public count follows the registry.
test('the front page and the README state the number of tools the agent registry defines', () => {
  const tools = fs.readFileSync(new URL('../server/agent-tools.mjs', import.meta.url), 'utf8');
  const count = new Set([...tools.matchAll(/\btool\("([a-z_]+)"/g)].map((m) => m[1])).size;
  const home = fs.readFileSync(new URL('../app/home.html', import.meta.url), 'utf8');
  assert.equal(Number(home.match(/<b>(\d+)<\/b><span>Agent tools<\/span>/)[1]), count, 'front page counter');
  const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  for (const [, n] of readme.matchAll(/\b(\d+) read-only tools\b/g)) assert.equal(Number(n), count, 'README');
  assert.match(readme, new RegExp(`of the app's ${count} read-only tools`));
});
