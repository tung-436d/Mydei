import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, mkdir, writeFile, stat, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { request as httpRequest } from 'node:http';
import { createArchiveServer } from '../services/tieba-archive-files/server.mjs';
import { configuration } from '../services/tieba-archive-files/config.mjs';
import { cleanup } from '../services/tieba-archive-files/storage.mjs';
import { fixture, filesUnder } from './fixtures/archive-fixture.mjs';

const secret = 'admin-secret-for-archive-tests-0123456789';
async function running(config) {
  const server = await createArchiveServer(config);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  const api = async (path = '', method = 'GET', body, extra = {}) => fetch(`${origin}/api/archives${path}`, { method,
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(method === 'GET' ? {} : { 'X-Archive-Request': '1', 'Content-Type': 'application/json' }), ...extra },
    body: body === undefined ? undefined : body instanceof Buffer ? body : JSON.stringify(body) });
  const login = async token => { const result = await api('/session', 'POST', { token }); cookie = result.headers.get('set-cookie')?.split(';')[0] ?? ''; assert.equal(result.status, 200); };
  return { api, login, server, origin, get cookie() { return cookie; }, close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
}
async function upload(service, files) {
  const created = await service.api('/imports', 'POST', { files: files.map(({ path, size }) => ({ path, size })) });
  assert.equal(created.status, 201, await created.clone().text());
  const { archive_id: id } = await created.json();
  for (const file of files) {
    for (let offset = 0; offset < file.size || (offset === 0 && !file.size); offset += 4 * 1024 ** 2) {
      const result = await service.api(`/imports/${id}/file?path=${encodeURIComponent(file.path)}&offset=${offset}`, 'PUT', file.data.subarray(offset, offset + 4 * 1024 ** 2), { 'Content-Type': 'application/octet-stream' });
      assert.equal(result.status, 200, await result.clone().text()); if (!file.size) break;
    }
  }
  const result = await service.api(`/imports/${id}/complete`, 'POST');
  assert.equal(result.status, 201, await result.clone().text()); return await result.json();
}
test('atomic import, raw-byte preservation, WAL, private access, ranges, restart, snapshots and deletion', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mydei-archive-test-'));
  const config = configuration({ ARCHIVE_DATA_DIR: join(root, 'persistent'), ARCHIVE_ADMIN_TOKEN: secret, ARCHIVE_READ_TOKEN: 'reader-secret-for-archive-tests-0123456789', ARCHIVE_COOKIE_SECURE: 'false' });
  const source = join(root, '中文文件夹'); const live = await fixture(source, { wal: true });
  let service;
  try {
    const files = await filesUnder(source); live.db.close(); live.db = undefined;
    service = await running(config);
    assert.equal((await service.api()).status, 401);
    assert.equal((await service.api('/imports', 'POST', { files: [] })).status, 401);
    await service.login(secret);
    assert.equal((await service.api('/imports', 'POST', { files: [{ path: 'threads/123/../../outside', size: 5 }] })).status, 400);
    for (const path of ['/absolute', 'threads/123/C:\\file', 'threads/123/a/../b', 'threads/123/%2e%2e/evil', 'tieba_auth.json', 'threads/123/CON', 'threads/123/a.']) {
      assert.equal((await service.api('/imports', 'POST', { files: [{ path, size: 1 }] })).status, 400, path);
    }
    assert.equal((await service.api('/imports', 'POST', { files: [null] })).status, 400);
    assert.equal((await service.api('/imports', 'POST', { files: [{ path: 'scrape_info.json', size: config.maxFileBytes + 1 }] })).status, 413);
    const partial = await (await service.api('/imports', 'POST', { files: [{ path: 'scrape_info.json', size: 10 }] })).json();
    assert.equal((await service.api(`/imports/${partial.archive_id}/complete`, 'POST')).status, 409);
    assert.equal((await (await service.api()).json()).archives.length, 0);
    await service.api(`/imports/${partial.archive_id}`, 'DELETE');
    const interrupted = await (await service.api('/imports', 'POST', { files: [{ path: 'scrape_info.json', size: 10000 }] })).json();
    await new Promise(resolve => {
      const transfer = httpRequest(`${service.origin}/api/archives/imports/${interrupted.archive_id}/file?path=scrape_info.json&offset=0`, { method: 'PUT', headers: { Cookie: service.cookie, 'X-Archive-Request': '1', 'Content-Type': 'application/octet-stream', 'Content-Length': '10000' } });
      transfer.on('error', resolve); transfer.write(Buffer.alloc(1000)); setTimeout(() => transfer.destroy(), 100);
    });
    assert.equal((await service.api(`/imports/${interrupted.archive_id}/complete`, 'POST')).status, 409);
    assert.equal((await (await service.api()).json()).archives.length, 0);
    await service.api(`/imports/${interrupted.archive_id}`, 'DELETE');
    const invalid = await (await service.api('/imports', 'POST', { files: [{ path: 'scrape_info.json', size: 2 }] })).json();
    await service.api(`/imports/${invalid.archive_id}/file?path=scrape_info.json&offset=0`, 'PUT', Buffer.from('{}'), { 'Content-Type': 'application/octet-stream' });
    assert.equal((await service.api(`/imports/${invalid.archive_id}/complete`, 'POST')).status, 422);
    assert.equal((await (await service.api()).json()).archives.length, 0);
    await service.api(`/imports/${invalid.archive_id}`, 'DELETE');
    const archive = await upload(service, files), duplicate = await upload(service, files);
    assert.notEqual(archive.archive_id, duplicate.archive_id);
    const result = await (await service.api(`/${archive.archive_id}/manifest`)).json();
    assert.equal(result.threads[0].post_count, 26); assert.equal(result.threads[0].reply_count, 13);
    assert.equal(result.files.filter(f => !f.generated).length, files.length);
    for (const file of files) assert.deepEqual(await readFile(join(config.dataDir, 'archives', archive.archive_id, file.path)), file.data);
    const db = new DatabaseSync(join(config.dataDir, 'archives', archive.archive_id, result.threads[0].database_path), { readOnly: true });
    assert.match(db.prepare('SELECT contents FROM post WHERE id=900').get().contents, /WAL/); db.close();
    const path = encodeURIComponent('threads/123/post_assets/images/中文图片.png');
    const range = await service.api(`/${archive.archive_id}/files?path=${path}`, 'GET', undefined, { Range: 'bytes=0-7' }); assert.equal(range.status, 206); assert.equal((await range.arrayBuffer()).byteLength, 8);
    assert.equal((await service.api(`/${archive.archive_id}/files?path=${path}`, 'GET', undefined, { Range: 'bytes=999999-' })).status, 416);
    const unsafeFile = await service.api(`/${archive.archive_id}/files?path=${encodeURIComponent('../index.json')}`); assert.equal(unsafeFile.status, 404);
    assert.equal((await service.api('/session', 'POST', { token: secret }, { Origin: 'https://evil.example' })).status, 403);
    await service.close();
    // Simulate a crash between publishing a complete directory and replacing index.json.
    await writeFile(join(config.dataDir, 'index.json'), '{"archives":[]}');
    service = await running(config);
    // A fresh device gets no access to any private artifact until it authenticates.
    assert.equal((await service.api(`/${archive.archive_id}/manifest`)).status, 401);
    assert.equal((await service.api(`/${archive.archive_id}/files?path=${path}`)).status, 401);
    await service.login(config.readToken);
    assert.equal((await service.api()).status, 200);
    assert.equal((await service.api(`/${archive.archive_id}/manifest`)).status, 200);
    assert.equal((await service.api(`/${archive.archive_id}`, 'DELETE')).status, 401);
    assert.equal((await service.api('/imports', 'POST', { files: [] })).status, 401);
    const index = await (await service.api()).json(); assert.equal(index.archives.length, 2);
    await service.login(secret);
    assert.equal((await service.api(`/${archive.archive_id}`, 'DELETE')).status, 200);
    assert.equal((await service.api(`/${archive.archive_id}/manifest`)).status, 404);
    await service.close(); service = await running({ ...config, access: 'public' });
    assert.equal((await service.api()).status, 200);
    assert.equal((await service.api(`/${duplicate.archive_id}`, 'DELETE')).status, 401);
    const abandoned = join(config.dataDir, 'staging', '11111111-1111-4111-8111-111111111111');
    await mkdir(abandoned); await writeFile(join(abandoned, 'partial'), 'x');
    await utimes(abandoned, new Date(0), new Date(0));
    await cleanup({ ...config, stagingTtlMs: 1 });
    await assert.rejects(stat(abandoned));
  } finally { await service?.close(); live.db?.close(); await rm(root, { recursive: true, force: true }); }
});
