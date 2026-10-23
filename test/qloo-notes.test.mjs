import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
let child, base, fixture;

before(async () => {
  const scratch = path.join(root, 'tmp');
  fs.mkdirSync(scratch, { recursive: true });
  fixture = fs.mkdtempSync(path.join(scratch, 'qloo-notes-test-'));
  for (const directory of ['app', 'data', 'server']) {
    fs.cpSync(path.join(root, directory), path.join(fixture, directory), { recursive: true });
  }
  fs.mkdirSync(path.join(fixture, 'scripts'));
  for (const file of ['serve-eagle.mjs', 'qloo.mjs']) {
    fs.copyFileSync(path.join(root, 'scripts', file), path.join(fixture, 'scripts', file));
  }
  fs.writeFileSync(path.join(fixture, '.env'), 'NOTES_TEST_PRIVATE=should-stay-private\n');
  const portProbe = http.createServer();
  await new Promise(resolve => portProbe.listen(0, '127.0.0.1', resolve));
  const port = portProbe.address().port;
  await new Promise(resolve => portProbe.close(resolve));
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['scripts/serve-eagle.mjs'], {
    cwd: fixture,
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port),
      QLOO_API_KEY: '', OPENROUTER_API_KEY: '', DEEPGRAM_API_KEY: '', AISSTREAM_API_KEY: '',
      ZEMI_AIS_ENABLED: '0', ZEMI_MCP_ENABLED: '0', ZEMI_QLOO_CALLS_PER_DAY: '0',
      ZEMI_CHAT_USD_PER_DAY: '0', ZEMI_SPEAK_CHARS_PER_DAY: '0', ZEMI_LISTEN_MINUTES_PER_DAY: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Notes test server did not start')), 10000);
    child.once('exit', () => { clearTimeout(timeout); reject(new Error('Notes test server exited before listening')); });
    child.stdout.on('data', data => {
      if (data.toString().includes('eagle http://')) { clearTimeout(timeout); resolve(); }
    });
    child.stderr.on('data', () => {});
  });
});

after(async () => {
  if (child && child.exitCode === null) {
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill();
    await exited;
  }
  const scratch = path.resolve(root, 'tmp') + path.sep;
  if (fixture && path.resolve(fixture).startsWith(scratch)) fs.rmSync(fixture, { recursive: true, force: true });
});

test('the courtesy notes are linked only from the landing footer', async () => {
  const response = await fetch(base);
  assert.equal(response.status, 200);
  const home = await response.text();
  const footerStart = home.indexOf('<footer');
  assert.ok(footerStart > 0);
  assert.doesNotMatch(home.slice(0, footerStart), /href="\/notes-for-qloo"/);
  assert.match(home.slice(footerStart), /<a[^>]*href="\/notes-for-qloo"[^>]*>Notes for Qloo<\/a>/);
});

test('the public notes route serves the approved personal review and a way back', async () => {
  const response = await fetch(`${base}/notes-for-qloo`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  const page = await response.text();
  assert.match(page, /Prepared by Carlos Jimenez/);
  assert.match(page, /Developer of Zemi-Aku/);
  assert.match(page, /No critical technical SEO blocker confirmed/);
  assert.match(page, /<a href="\/">[^<]*Back to Zemi-Aku<\/a>/);
  assert.match(page, /<meta name="robots" content="noindex,nofollow">/);
  assert.doesNotMatch(page, /Prepared by R21 Digital|_secrets|D:\/R21-Brain|Co-Authored-By/);
});

test('the extra public document does not expose private project files', async () => {
  for (const route of ['/.env', '/server/lib.mjs', '/docs/NEXT-SESSION.md']) {
    assert.equal((await fetch(base + route)).status, 404, route);
  }
});
