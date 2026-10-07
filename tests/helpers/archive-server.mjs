import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configuration } from '../../services/tieba-archive-files/config.mjs';
import { createArchiveServer } from '../../services/tieba-archive-files/server.mjs';

const temporary = !process.env.ARCHIVE_DATA_DIR;
const dir = process.env.ARCHIVE_DATA_DIR ?? await mkdtemp(join(tmpdir(), 'mydei-browser-archives-'));
const config = configuration({ ...process.env, ARCHIVE_DATA_DIR: dir,
  ARCHIVE_ADMIN_TOKEN: process.env.ARCHIVE_ADMIN_TOKEN ?? 'browser-test-admin-01234567890123456789',
  ARCHIVE_READ_TOKEN: 'browser-test-reader-01234567890123456789',
  ARCHIVE_COOKIE_SECURE: 'false', ARCHIVE_MAX_IMPORTS: process.env.ARCHIVE_MAX_IMPORTS ?? '12' });
const server = await createArchiveServer(config);
let maxRss = process.memoryUsage().rss;
const measure = setInterval(() => { maxRss = Math.max(maxRss, process.memoryUsage().rss); }, 20).unref();
server.listen(Number(process.env.ARCHIVE_TEST_PORT ?? 8787), '127.0.0.1', () => {
  const port = server.address().port;
  console.log(`Archive test server: ${port}`);
  process.send?.({ ready: true, port, dir });
});
process.on('message', message => { if (message === 'memory') process.send?.({ memory: true, maxRss, current: process.memoryUsage() }); });
let closing = false;
async function close() {
  if (closing) return; closing = true;
  clearInterval(measure);
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  if (temporary) await rm(dir, { recursive: true, force: true });
  process.exit(0);
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { void close(); });
process.on('disconnect', () => { void close(); });
