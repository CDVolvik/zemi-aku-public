import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// One server process owns this outbox. Acknowledgements persist beside the request log.
// Retry with a stable ID: the Google Sheet upserts on it after an ambiguous network failure.
export function createTesterDelivery({ url, secret, file, readRows, fetchImpl = fetch }) {
  let running = false;
  return async function flush() {
    if (running || !secret || secret.length < 32) return;
    try {
      const hook = new URL(url);
      if (hook.protocol !== 'https:' || hook.hostname !== 'n8n.r21digital.com' || !hook.pathname.startsWith('/webhook/')) return;
    } catch { return; }
    running = true;
    try {
      const sent = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
      if (!Array.isArray(sent)) return;
      const idOf = (row) => crypto.createHash('sha256').update(`${row.email}|${row.at}`).digest('hex');
      const pending = readRows().map((row) => ({ row, id: idOf(row) })).filter(({ id }) => !sent.includes(id)).slice(0, 300);
      for (const { row, id } of pending) {
        const response = await fetchImpl(url, { method: 'POST',
          headers: { 'content-type': 'application/json', 'X-Zemi-Webhook-Secret': secret },
          body: JSON.stringify({ ...row, id, source: 'zemi-aku testflight' }),
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok || (await response.json()).ok !== true) break;
        sent.push(id);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file + '.tmp', JSON.stringify(sent), { mode: 0o600 });
        fs.renameSync(file + '.tmp', file);
      }
    } catch { /* Leave pending rows for the next retry; never log names, email or headers. */ }
    finally { running = false; }
  };
}
