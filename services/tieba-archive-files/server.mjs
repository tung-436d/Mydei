import { createServer } from 'node:http';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, open, realpath, statfs, readdir } from 'node:fs/promises';
import { join, extname, relative, isAbsolute } from 'node:path';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { configuration } from './config.mjs';
import { HttpError, atomicJson, cleanup, initialize, rebuildIndex, safePath, summary, uuidPattern } from './storage.mjs';

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogv': 'video/ogg', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.json': 'application/json', '.db': 'application/vnd.sqlite3' };
const isEqual = (left, right) => {
  const a = Buffer.from(left ?? ''), b = Buffer.from(right ?? '');
  return a.length === b.length && timingSafeEqual(a, b);
};
async function bodyJson(request, limit = 3 * 1024 ** 2) {
  let length = 0; const chunks = [];
  for await (const chunk of request) {
    length += chunk.length;
    if (length > limit) throw new HttpError(413, '请求清单过大');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, '请求 JSON 无效'); }
}
function validateInWorker(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./validate-worker.mjs', import.meta.url), { workerData: data, resourceLimits: { maxOldGenerationSizeMb: 96 } });
    const timer = setTimeout(() => { void worker.terminate(); reject(new HttpError(422, '归档校验超时，请缩小归档后重试')); }, 120000);
    worker.once('message', result => { clearTimeout(timer); if (result.error) reject(new HttpError(422, result.error)); else resolve(result.manifest); });
    worker.once('error', error => { clearTimeout(timer); reject(error); });
    worker.once('exit', code => { clearTimeout(timer); if (code) reject(new Error('归档校验进程异常退出')); });
  });
}

export async function createArchiveServer(config) {
  let index = await initialize(config);
  const sessions = new Map(), reading = new Map(), loginAttempts = new Map();
  const active = new Set();
  let mutations = Promise.resolve();
  const exclusive = async action => {
    const previous = mutations;
    let release; mutations = new Promise(resolve => { release = resolve; });
    await previous;
    try { return await action(); } finally { release(); }
  };
  await cleanup(config);
  for (const id of await readdir(join(config.dataDir, 'staging'))) {
    if (!uuidPattern.test(id)) continue;
    try { sessions.set(id, JSON.parse(await readFile(join(config.dataDir, 'staging', id, 'session.json'), 'utf8'))); }
    catch { await rm(join(config.dataDir, 'staging', id), { recursive: true, force: true }); }
  }
  const housekeeping = setInterval(() => {
    for (const [id, session] of sessions) {
      if (!active.has(id) && Date.now() - session.updated_at > config.stagingTtlMs) sessions.delete(id);
    }
    for (const [key, attempt] of loginAttempts) if (Date.now() - attempt.start > 60000) loginAttempts.delete(key);
    void cleanup(config, active).catch(error => console.error('临时归档清理失败', error.message));
  }, 60000).unref();
  const sessionPath = id => join(config.dataDir, 'staging', id);
  const cookieName = config.cookieSecure ? '__Host-mydei_archive' : 'mydei_archive';
  const sign = value => createHmac('sha256', config.adminToken).update(value).digest('base64url');
  function role(request) {
    const raw = (request.headers.cookie ?? '').split(';').map(v => v.trim()).find(v => v.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (!raw) return null;
    const [value, signature] = raw.split('.');
    if (!value || !isEqual(sign(value), signature)) return null;
    try {
      const data = JSON.parse(Buffer.from(value, 'base64url').toString());
      return data.expires > Date.now() && ['admin', 'reader'].includes(data.role) ? data.role : null;
    } catch { return null; }
  }
  function requireRole(request, admin = false) {
    const current = role(request);
    if (admin ? current !== 'admin' : config.access === 'private' && !current) throw new HttpError(401, admin ? '需要管理员身份验证' : '这是私人归档，请输入访问凭证');
  }
  function send(response, status, data) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(data));
  }
  async function manifest(id) {
    if (!uuidPattern.test(id) || !index.archives.some(a => a.archive_id === id)) throw new HttpError(404, '归档不存在或尚未完成导入');
    if (!reading.has(id)) {
      const result = JSON.parse(await readFile(join(config.dataDir, 'archives', id, 'manifest.json'), 'utf8'));
      // Cache at most two inventories; avoid loading every archive's media metadata into RAM.
      if (reading.size >= 2) reading.delete(reading.keys().next().value);
      reading.set(id, result);
    }
    return reading.get(id);
  }
  async function importSession(id) {
    if (!uuidPattern.test(id)) throw new HttpError(404, '上传任务不存在');
    if (!sessions.has(id)) {
      try {
        const value = JSON.parse(await readFile(join(sessionPath(id), 'session.json'), 'utf8'));
        sessions.set(id, value);
      } catch { throw new HttpError(404, '上传任务不存在或已清理'); }
    }
    const session = sessions.get(id);
    if (Date.now() - session.updated_at > config.stagingTtlMs) throw new HttpError(410, '上传任务已过期，请重新导入');
    return session;
  }
  const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Vary', 'Origin, Cookie');
    try {
      const origin = request.headers.origin;
      if (origin && !config.origins.includes(origin)) throw new HttpError(403, '请求来源未获许可');
      if (origin) {
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Access-Control-Allow-Credentials', 'true');
        response.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
      }
      if (request.method === 'OPTIONS') {
        response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Archive-Request');
        response.writeHead(204); response.end(); return;
      }
      if (!['GET', 'HEAD'].includes(request.method) && request.headers['x-archive-request'] !== '1') throw new HttpError(403, '缺少归档请求标识');
      const url = new URL(request.url, 'http://archive.local');
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] !== 'api' || parts[1] !== 'archives') throw new HttpError(404, '接口不存在');
      const [, , resource, id, operation] = parts;
      if (resource === 'health' && request.method === 'GET') { send(response, 200, { ok: true }); return; }
      if (resource === 'session') {
        if (request.method === 'GET') {
          send(response, 200, { role: role(request), access: config.access, chunk_bytes: config.chunkBytes, max_database_bytes: config.maxDatabaseBytes }); return;
        }
        if (request.method === 'DELETE') {
          response.setHeader('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${config.cookieSecure ? '; Secure' : ''}`);
          send(response, 200, { ok: true }); return;
        }
        if (request.method === 'POST') {
          const key = request.socket.remoteAddress;
          let attempt = loginAttempts.get(key);
          if (!attempt || Date.now() - attempt.start > 60000) { attempt = { start: Date.now(), count: 0 }; loginAttempts.set(key, attempt); }
          if (++attempt.count > 10) throw new HttpError(429, '尝试过于频繁，请一分钟后重试');
          const { token } = await bodyJson(request, 4096);
          if (typeof token !== 'string') throw new HttpError(400, '请输入访问凭证');
          const granted = isEqual(token, config.adminToken) ? 'admin' : config.readToken && isEqual(token, config.readToken) ? 'reader' : null;
          if (!granted) throw new HttpError(401, '访问凭证不正确');
          const value = Buffer.from(JSON.stringify({ role: granted, expires: Date.now() + 12 * 3600000 })).toString('base64url');
          response.setHeader('Set-Cookie', `${cookieName}=${value}.${sign(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${config.cookieSecure ? '; Secure' : ''}`);
          send(response, 200, { role: granted }); return;
        }
      }
      if (resource === 'imports') {
        requireRole(request, true);
        if (!id && request.method === 'POST') {
          await exclusive(async () => {
            if ((await readdir(join(config.dataDir, 'staging'))).filter(v => uuidPattern.test(v)).length >= config.maxImports) throw new HttpError(409, '未完成的导入已达上限，请取消或等待临时任务清理');
            const { files } = await bodyJson(request);
            if (!Array.isArray(files) || !files.length || files.length > config.maxFiles) throw new HttpError(400, '文件清单为空或文件数量超出上限');
            const seen = new Set(), normalized = [];
            let total = 0;
            for (const file of files) {
              if (!file || typeof file !== 'object') throw new HttpError(400, '文件清单条目无效');
              const path = safePath(file.path), size = file.size;
              const key = path.toLocaleLowerCase('en-US');
              if (seen.has(key)) throw new HttpError(400, `重复文件路径：${path}`);
              seen.add(key);
              if (!Number.isSafeInteger(size) || size < 0 || size > config.maxFileBytes) throw new HttpError(413, `文件大小超出上限：${path}`);
              total += size; normalized.push({ path, size, received: 0 });
            }
            if (total > config.maxArchiveBytes) throw new HttpError(413, '归档大小超出上限');
            for (const path of seen) {
              const segments = path.split('/'); segments.pop();
              while (segments.length) { if (seen.has(segments.join('/'))) throw new HttpError(400, '上传清单中的文件路径与目录冲突'); segments.pop(); }
            }
            const committed = index.archives.reduce((sum, a) => sum + (a.stored_size ?? a.total_size), 0);
            const reserved = [...sessions.values()].reduce((sum, a) => sum + a.total_size * 2, 0);
            if (committed + reserved + total * 2 > config.maxStorageBytes) throw new HttpError(507, '归档存储配额不足');
            const disk = await statfs(config.dataDir);
            if (disk.bavail * disk.bsize < total * 2 + 64 * 1024 ** 2) throw new HttpError(507, '服务器磁盘空间不足');
            const archive_id = randomUUID();
            const session = { archive_id, files: normalized, total_size: total, updated_at: Date.now() };
            await mkdir(join(sessionPath(archive_id), 'payload'), { recursive: true });
            await atomicJson(join(sessionPath(archive_id), 'session.json'), session);
            sessions.set(archive_id, session);
            send(response, 201, { archive_id, chunk_bytes: config.chunkBytes });
          }); return;
        }
        const session = await importSession(id);
        if (active.has(id)) throw new HttpError(409, '上传任务正在处理，请稍后重试');
        if (request.method === 'DELETE' && !operation) {
          await rm(sessionPath(id), { recursive: true, force: true }); sessions.delete(id); send(response, 200, { ok: true }); return;
        }
        active.add(id);
        try {
          if (operation === 'file' && request.method === 'PUT') {
            const path = safePath(url.searchParams.get('path'));
            const file = session.files.find(f => f.path === path);
            if (!file) throw new HttpError(400, '文件未登记在上传清单中');
            const offset = Number(url.searchParams.get('offset'));
            const length = Number(request.headers['content-length']);
            if (!Number.isSafeInteger(offset) || offset !== file.received) throw new HttpError(409, '上传偏移不匹配，请重新导入');
            if (!Number.isSafeInteger(length) || length < 0 || length > config.chunkBytes || length + offset > file.size) throw new HttpError(413, '上传块大小无效或超过登记大小');
            if (request.headers['content-type'] !== 'application/octet-stream') throw new HttpError(415, '上传必须使用二进制数据');
            const target = join(sessionPath(id), 'payload', path);
            await mkdir(join(target, '..'), { recursive: true });
            const handle = await open(target, offset === 0 ? 'w' : 'r+', 0o600);
            let transferred = 0;
            try {
              // Truncate bytes left by an interrupted prior request before retrying.
              await handle.truncate(offset);
              const counter = new Transform({ transform(chunk, _encoding, callback) {
                transferred += chunk.length;
                callback(transferred > length ? new HttpError(413, '传输字节超出声明大小') : null, chunk);
              } });
              await pipeline(request, counter, createWriteStream(target, { fd: handle.fd, autoClose: false, start: offset }));
              if (transferred !== length) throw new HttpError(400, '上传中断，实际字节与声明不一致');
              await handle.sync();
              file.received += transferred; file.uploaded = file.received === file.size;
              session.updated_at = Date.now();
              await atomicJson(join(sessionPath(id), 'session.json'), session);
            } catch (error) { file.received = offset; file.uploaded = false; await handle.truncate(offset).catch(() => {}); throw error; }
            finally { await handle.close(); }
            send(response, 200, { received: file.received }); return;
          }
          if (operation === 'complete' && request.method === 'POST') {
            if (session.files.some(f => !f.uploaded || f.received !== f.size)) throw new HttpError(409, '仍有文件未完成上传，归档不会发布');
            const payload = join(sessionPath(id), 'payload');
            const result = await validateInWorker({ payload, scratch: join(sessionPath(id), 'validation'), session, maxDatabaseBytes: config.maxDatabaseBytes });
            await exclusive(async () => {
              const destination = join(config.dataDir, 'archives', id);
              await rename(payload, destination);
              try { index = await rebuildIndex(config); }
              catch (error) { await rename(destination, payload); throw error; }
            });
            sessions.delete(id);
            await rm(sessionPath(id), { recursive: true, force: true }).catch(error => console.error('已留档任务的临时目录待清理', error.message));
            send(response, 201, summary(result)); return;
          }
          throw new HttpError(404, '上传接口不存在');
        } finally { active.delete(id); }
      }
      requireRole(request);
      if (!resource && request.method === 'GET') { send(response, 200, index); return; }
      const item = await manifest(resource);
      if (id === 'manifest' && request.method === 'GET') { send(response, 200, item); return; }
      if (!id && request.method === 'DELETE') {
        requireRole(request, true);
        await exclusive(async () => {
          const directory = join(config.dataDir, 'archives', resource), trash = join(config.dataDir, 'trash', resource);
          await rename(directory, trash);
          try { index = await rebuildIndex(config); }
          catch (error) { await rename(trash, directory); throw error; }
          reading.delete(resource);
          await rm(trash, { recursive: true, force: true }).catch(error => console.error('已删除归档的文件待清理', error.message));
        });
        send(response, 200, { ok: true }); return;
      }
      if (id === 'files' && ['GET', 'HEAD'].includes(request.method)) {
        const path = url.searchParams.get('path');
        const file = item.files.find(f => f.path === path);
        if (!file) throw new HttpError(404, '文件未留档或媒体缺失');
        const base = await realpath(join(config.dataDir, 'archives', resource));
        let target;
        try { target = await realpath(join(base, path)); }
        catch { throw new HttpError(404, '归档文件缺失'); }
        const rel = relative(base, target);
        if (rel.startsWith('..') || isAbsolute(rel)) throw new HttpError(403, '文件路径越出归档目录');
        const size = (await stat(target)).size;
        let start = 0, end = size - 1, status = 200;
        if (request.headers.range) {
          const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
          if (!match || (!match[1] && !match[2])) throw new HttpError(416, '仅支持单段字节范围');
          if (match[1]) { start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), end) : end; }
          else start = Math.max(0, size - Number(match[2]));
          if (start > end || start >= size || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) { response.setHeader('Content-Range', `bytes */${size}`); throw new HttpError(416, '字节范围超出文件'); }
          status = 206; response.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
        }
        const mime = MIME[extname(path).toLowerCase()] ?? 'application/octet-stream';
        response.setHeader('Content-Type', mime);
        response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
        response.setHeader('Content-Disposition', `${mime === 'application/octet-stream' || url.searchParams.has('download') ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(path.split('/').at(-1))}`);
        response.setHeader('Accept-Ranges', 'bytes'); response.setHeader('Content-Length', Math.max(0, end - start + 1));
        response.writeHead(status);
        if (request.method === 'HEAD' || !size) { response.end(); return; }
        await pipeline(createReadStream(target, { start, end }), response); return;
      }
      throw new HttpError(404, '接口不存在');
    } catch (error) {
      if (response.headersSent || response.destroyed) { response.destroy(); return; }
      if (!(error instanceof HttpError)) console.error('归档服务请求失败', error.message);
      send(response, error.status ?? 500, { error: error.status ? error.message : '服务器保存或读取失败，请检查磁盘空间及服务日志后重试' });
    }
  });
  server.requestTimeout = 180000;
  server.headersTimeout = 30000;
  server.on('close', () => clearInterval(housekeeping));
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const config = configuration();
  const server = await createArchiveServer(config);
  server.listen(config.port, config.host, () => console.log(`止戈遗录文件服务：http://${config.host}:${config.port}（${config.access}）`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}
