import { parentPort, workerData } from 'node:worker_threads';
import { DatabaseSync, backup } from 'node:sqlite';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, open, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { atomicJson } from './storage.mjs';

async function json(path) {
  if ((await stat(path)).size > 2 * 1024 ** 2) throw new Error('元数据 JSON 超过 2 MiB');
  const value = JSON.parse(await readFile(path, 'utf8'));
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('元数据必须是 JSON 对象');
  return value;
}
const required = {
  post: ['id', 'contents', 'floor', 'user_id', 'create_time', 'is_thread_author', 'parent_id', 'reply_to_id'],
  user: ['id', 'nickname', 'username', 'avatar', 'level', 'ip'],
  db_info: ['k', 'v'],
};
async function validate() {
  const { payload, scratch, session, maxDatabaseBytes } = workerData;
  const inventory = new Map(session.files.map(file => [file.path, file]));
  if (!inventory.has('scrape_info.json')) throw new Error('缺少 scrape_info.json');
  const scrape = await json(join(payload, 'scrape_info.json'));
  const main = String(scrape.main_thread);
  if (!/^\d+$/.test(main)) throw new Error('scrape_info.json 的 main_thread 无效');
  const ids = [...new Set(session.files.map(f => /^threads\/(\d+)\//.exec(f.path)?.[1]).filter(Boolean))];
  if (!ids.includes(main)) throw new Error('缺少主帖目录');
  await rm(join(payload, '.reader'), { recursive: true, force: true });
  await mkdir(join(payload, '.reader'), { recursive: true });
  const threads = [];
  for (const id of ids) {
    const prefix = `threads/${id}`;
    for (const name of ['content.db', 'thread.json', 'forum.json']) if (!inventory.has(`${prefix}/${name}`)) throw new Error(`帖子 ${id} 缺少 ${name}`);
    const info = await json(join(payload, prefix, 'thread.json'));
    const forum = await json(join(payload, prefix, 'forum.json'));
    if (String(info.id) !== id || typeof info.title !== 'string' || !info.title.trim() || typeof forum.name !== 'string') throw new Error(`帖子 ${id} 元数据无效或 ID 不匹配`);
    const dbFile = join(payload, prefix, 'content.db');
    const size = (await stat(dbFile)).size;
    if (size > maxDatabaseBytes) throw new Error(`帖子 ${id} 数据库超过浏览器读取上限`);
    const header = await open(dbFile, 'r');
    const bytes = Buffer.alloc(16);
    try { await header.read(bytes, 0, 16, 0); } finally { await header.close(); }
    if (bytes.toString('binary') !== 'SQLite format 3\0') throw new Error(`帖子 ${id} content.db 不是 SQLite 数据库`);
    // Work on copies so SQLite never checkpoints or changes original DB/WAL/SHM bytes.
    const workspace = join(scratch, id);
    await mkdir(workspace, { recursive: true });
    await copyFile(dbFile, join(workspace, 'content.db'));
    if (inventory.has(`${prefix}/content.db-wal`)) await copyFile(`${dbFile}-wal`, join(workspace, 'content.db-wal'));
    const db = new DatabaseSync(join(workspace, 'content.db'), { readOnly: true, enableLoadExtension: false });
    let postCount, replyCount;
    try {
      db.exec('PRAGMA query_only=ON; PRAGMA trusted_schema=OFF; PRAGMA cache_size=-2048; PRAGMA mmap_size=0;');
      if (db.prepare('PRAGMA quick_check').get().quick_check !== 'ok') throw new Error(`帖子 ${id} 数据库完整性检查失败`);
      const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(v => v.name));
      for (const [table, fields] of Object.entries(required)) {
        if (!tables.has(table)) throw new Error(`帖子 ${id} 缺少 ${table} 表`);
        const columns = new Set(db.prepare(`PRAGMA table_info("${table}")`).all().map(v => v.name));
        if (fields.some(field => !columns.has(field))) throw new Error(`帖子 ${id} 的 ${table} 字段不兼容`);
      }
      if (db.prepare("SELECT v FROM db_info WHERE k='thread_id'").get()?.v !== id) throw new Error(`帖子 ${id} 数据库 ID 不匹配`);
      const counts = db.prepare('SELECT sum(parent_id=0) posts, sum(parent_id<>0) replies FROM post').get();
      postCount = counts.posts ?? 0; replyCount = counts.replies ?? 0;
      // Includes committed WAL pages. sql.js opens this derived snapshot; originals stay intact.
      await backup(db, join(payload, '.reader', `${id}.db`));
      if ((await stat(join(payload, '.reader', `${id}.db`))).size > maxDatabaseBytes) throw new Error(`帖子 ${id} 合并 WAL 后超过数据库大小上限`);
    } finally { db.close(); await rm(workspace, { recursive: true, force: true }); }
    threads.push({ thread_id: id, title: info.title, forum_name: forum.name, user_id: String(info.user_id), created_at: info.create_time,
      view_num: info.view_num, reply_num: info.reply_num, agree: info.agree, is_share: info.is_share, share_origin: String(info.share_origin ?? 0),
      forum_avatar: forum.small_avatar ? `${prefix}/forum_avatar/${forum.small_avatar}` : null,
      database_path: `.reader/${id}.db`, post_count: postCount, reply_count: replyCount });
  }
  const files = [];
  for (const file of session.files) {
    const filePath = join(payload, file.path);
    if ((await stat(filePath)).size !== file.size) throw new Error(`文件大小不匹配：${file.path}`);
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(filePath)) hash.update(chunk);
    files.push({ path: file.path, size: file.size, sha256: hash.digest('hex') });
  }
  for (const thread of threads) {
    const path = thread.database_path;
    files.push({ path, size: (await stat(join(payload, path))).size, generated: true });
  }
  const primary = threads.find(t => t.thread_id === main);
  const timestamp = Number(scrape.update_time ?? scrape.create_time);
  if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > 253402300799) throw new Error('抓取时间无效');
  const manifest = { format_version: 1, archive_id: session.archive_id, thread_id: main, title: primary.title, forum_name: primary.forum_name,
    scraped_at: new Date(timestamp * 1000).toISOString(), imported_at: new Date().toISOString(), scraper_version: String(scrape.scraper_version ?? ''),
    total_size: session.total_size, stored_size: files.reduce((total, file) => total + file.size, 0), threads, files };
  await atomicJson(join(payload, 'manifest.json'), manifest);
  return manifest;
}
try { parentPort.postMessage({ manifest: await validate() }); }
catch (error) { parentPort.postMessage({ error: `归档校验失败：${error.message}` }); }
