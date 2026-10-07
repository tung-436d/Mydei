import { fork } from 'node:child_process';
import { once } from 'node:events';
import { createHash, randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdtemp, mkdir, readdir, stat, open, rm, writeFile, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, relative } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';

const source = resolve(process.argv[2] ?? process.env.TIEBA_REAL_ARCHIVE_DIR ?? '');
if (!process.argv[2] && !process.env.TIEBA_REAL_ARCHIVE_DIR) throw new Error('请指定真实归档父目录：node scripts/verify-real-archives.mjs <path>');
const temporary = await mkdtemp(join(tmpdir(), 'mydei-real-archives-'));
const token = randomBytes(32).toString('hex');
let child, origin, cookie = '';
async function start() {
  child = fork(new URL('../tests/helpers/archive-server.mjs', import.meta.url), { env: { ...process.env,
    ARCHIVE_DATA_DIR: join(temporary, 'persistent'), ARCHIVE_ADMIN_TOKEN: token, ARCHIVE_TEST_PORT: '0', ARCHIVE_MAX_IMPORTS: '2' }, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  child.stderr.on('data', chunk => process.stderr.write(chunk));
  const ready = await new Promise((resolve, reject) => {
    child.on('message', message => { if (message.ready) resolve(message); }); child.once('error', reject); child.once('exit', code => reject(new Error(`验证服务器退出：${code}`)));
  });
  origin = `http://127.0.0.1:${ready.port}`; cookie = '';
}
async function stop() { if (child?.connected) { const exited = once(child, 'exit'); child.disconnect(); await exited; } }
async function api(path = '', method = 'GET', body, headers = {}) {
  return fetch(`${origin}/api/archives${path}`, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(method === 'GET' ? {} : { 'X-Archive-Request': '1', 'Content-Type': 'application/json' }), ...headers },
    body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body) });
}
async function login() { const response = await api('/session', 'POST', { token }); assert.equal(response.status, 200); cookie = response.headers.get('set-cookie').split(';')[0]; }
async function collect(root) {
  const files = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) files.push({ absolute: path, path: relative(root, path).replaceAll('\\', '/'), size: (await stat(path)).size });
    }
  }
  await walk(root); return files;
}
async function importFiles(files) {
  const response = await api('/imports', 'POST', { files: files.map(({ path, size }) => ({ path, size })) });
  assert.equal(response.status, 201, await response.clone().text()); const { archive_id: id, chunk_bytes: chunkBytes } = await response.json();
  for (const file of files) {
    const handle = await open(file.absolute, 'r');
    try {
      for (let offset = 0; offset < file.size || (!file.size && offset === 0); offset += chunkBytes) {
        const buffer = Buffer.alloc(Math.min(chunkBytes, file.size - offset)); await handle.read(buffer, 0, buffer.length, offset);
        const result = await api(`/imports/${id}/file?path=${encodeURIComponent(file.path)}&offset=${offset}`, 'PUT', buffer, { 'Content-Type': 'application/octet-stream' });
        assert.equal(result.status, 200, await result.clone().text()); if (!file.size) break;
      }
    } finally { await handle.close(); }
  }
  const completed = await api(`/imports/${id}/complete`, 'POST'); assert.equal(completed.status, 201, await completed.clone().text());
  return await completed.json();
}
async function hash(path) { const hash = createHash('sha256'); for await (const chunk of createReadStream(path)) hash.update(chunk); return hash.digest('hex'); }
const report = { archives: 0, files: 0, total_bytes: 0, posts: 0, replies: 0, thread_databases: 0, max_database_bytes: 0, backend_peak_rss_bytes: 0, duplicate_snapshot: false, restart_persistence: false };
try {
  let roots;
  if (await stat(join(source, 'scrape_info.json')).catch(() => false)) roots = [source];
  else roots = (await readdir(source, { withFileTypes: true })).filter(v => v.isDirectory()).map(v => join(source, v.name));
  roots = (await Promise.all(roots.map(async root => await stat(join(root, 'scrape_info.json')).catch(() => false) ? root : null))).filter(Boolean);
  assert.ok(roots.length, '没有找到真实归档');
  const SQL = await initSqlJs(); await start(); await login();
  let firstFiles, firstArchive;
  for (const root of roots) {
    const files = await collect(root); const archive = await importFiles(files);
    const manifest = await (await api(`/${archive.archive_id}/manifest`)).json();
    assert.equal(manifest.files.filter(f => !f.generated).length, files.length);
    for (const file of files) {
      const entry = manifest.files.find(f => f.path === file.path); assert.ok(entry, file.path); assert.equal(entry.sha256, await hash(file.absolute));
      assert.equal(await hash(join(temporary, 'persistent', 'archives', archive.archive_id, file.path)), entry.sha256);
    }
    for (const thread of manifest.threads) {
      // SQLite may create WAL/SHM even for a read-only handle. Query a scratch copy.
      const scratch = await mkdtemp(join(temporary, 'source-query-'));
      const sourceDatabase = join(root, 'threads', thread.thread_id, 'content.db');
      await copyFile(sourceDatabase, join(scratch, 'content.db'));
      if (files.some(f => f.path === `threads/${thread.thread_id}/content.db-wal`)) await copyFile(`${sourceDatabase}-wal`, join(scratch, 'content.db-wal'));
      const original = new DatabaseSync(join(scratch, 'content.db'), { readOnly: true });
      const counts = original.prepare('SELECT sum(parent_id=0) posts,sum(parent_id<>0) replies FROM post').get();
      const raw = await api(`/${archive.archive_id}/files?path=${encodeURIComponent(thread.database_path)}`); assert.equal(raw.status, 200);
      const bytes = new Uint8Array(await raw.arrayBuffer()); const browser = new SQL.Database(bytes);
      assert.equal(browser.exec('SELECT count(*) FROM post WHERE parent_id=0')[0].values[0][0], counts.posts);
      assert.equal(browser.exec('SELECT count(*) FROM post WHERE parent_id<>0')[0].values[0][0], counts.replies);
      const first = original.prepare('SELECT p.id,p.contents,u.nickname FROM post p LEFT JOIN user u ON p.user_id=u.id WHERE p.parent_id=0 ORDER BY p.floor,p.id LIMIT 1').get();
      if (first) {
        const statement = browser.prepare('SELECT p.contents,u.nickname FROM post p LEFT JOIN user u ON p.user_id=u.id WHERE p.id=?'); statement.bind([first.id]); assert.ok(statement.step());
        assert.deepEqual(statement.get(), [first.contents, first.nickname]); statement.free();
      }
      report.posts += counts.posts; report.replies += counts.replies; report.thread_databases++;
      report.max_database_bytes = Math.max(report.max_database_bytes, bytes.byteLength);
      browser.close(); original.close(); await rm(scratch, { recursive: true, force: true });
    }
    firstFiles ??= files; firstArchive ??= archive;
    report.archives++; report.files += files.length; report.total_bytes += archive.total_size;
    console.log(`Verified real archive ${report.archives}/${roots.length}: ${files.length} files`);
  }
  const duplicate = await importFiles(firstFiles); assert.notEqual(duplicate.archive_id, firstArchive.archive_id); report.duplicate_snapshot = true;
  const memory = await new Promise(resolve => { child.once('message', resolve); child.send('memory'); }); report.backend_peak_rss_bytes = memory.maxRss;
  await stop(); await start();
  assert.equal((await api(`/${firstArchive.archive_id}/manifest`)).status, 401); await login();
  assert.equal((await (await api()).json()).archives.length, report.archives + 1);
  assert.equal((await api(`/${firstArchive.archive_id}/files?path=${encodeURIComponent('threads/' + firstArchive.thread_id + '/content.db')}`)).status, 200);
  report.restart_persistence = true;
  await mkdir(resolve('verification-results'), { recursive: true }); await writeFile(resolve('verification-results/real-archives-verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await stop(); await rm(temporary, { recursive: true, force: true }); }
