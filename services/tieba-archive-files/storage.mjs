import { open, mkdir, rename, readFile, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function safePath(path) {
  // eslint-disable-next-line no-control-regex -- Reject filesystem control characters, including NUL.
  if (typeof path !== 'string' || path.length > 1000 || /[\\\x00-\x1f\x7f:%?#]/.test(path)) throw new HttpError(400, '文件路径无效');
  const segments = path.split('/');
  if (segments.some(s => !s || s === '.' || s === '..' || s.endsWith('.') || s.endsWith(' ') || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(s))) throw new HttpError(400, '禁止越出归档目录的路径');
  if (path !== 'scrape_info.json' && !/^threads\/\d+\/.+/.test(path)) throw new HttpError(400, '只接受 scrape_info.json 与 threads 下的归档文件');
  if (segments.some(s => /^tieba_auth|^\.reader$|^manifest\.json$/i.test(s))) throw new HttpError(400, '归档包含保留名称或登录凭据');
  return path;
}
export async function atomicJson(path, value) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  const file = await open(temporary, 'wx', 0o600);
  try { await file.writeFile(JSON.stringify(value, null, 2)); await file.sync(); }
  finally { await file.close(); }
  try {
    await rename(temporary, path);
    // Persist the rename too on Linux (Windows does not support opening directories).
    if (process.platform !== 'win32') {
      const directory = await open(join(path, '..'), 'r');
      try { await directory.sync(); } finally { await directory.close(); }
    }
  } finally { await rm(temporary, { force: true }); }
}
export function summary(manifest) {
  const { archive_id, thread_id, title, forum_name, scraped_at, imported_at, total_size, stored_size, format_version, threads } = manifest;
  return { archive_id, thread_id, title, forum_name, scraped_at, imported_at, total_size, stored_size, format_version, thread_count: threads.length };
}
export async function rebuildIndex(config) {
  const root = join(config.dataDir, 'archives');
  const archives = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !uuidPattern.test(entry.name)) continue;
    // Invalid committed metadata must not silently replace a previously correct index.
    const manifest = JSON.parse(await readFile(join(root, entry.name, 'manifest.json'), 'utf8'));
    if (manifest.archive_id !== entry.name || manifest.format_version !== 1) throw new Error(`归档清单损坏：${entry.name}`);
    archives.push(summary(manifest));
  }
  archives.sort((a, b) => b.imported_at.localeCompare(a.imported_at));
  const index = { format_version: 1, archives };
  await atomicJson(join(config.dataDir, 'index.json'), index);
  return index;
}
export async function initialize(config) {
  await mkdir(join(config.dataDir, 'archives'), { recursive: true });
  await mkdir(join(config.dataDir, 'staging'), { recursive: true });
  await mkdir(join(config.dataDir, 'trash'), { recursive: true });
  const index = await rebuildIndex(config);
  return index;
}
export async function cleanup(config, active = new Set()) {
  for (const area of ['staging', 'trash']) {
    const root = join(config.dataDir, area);
    for (const entry of await readdir(root)) {
      if (!uuidPattern.test(entry) || active.has(entry)) continue;
      const path = join(root, entry);
      if (area === 'trash' || Date.now() - (await stat(path)).mtimeMs > config.stagingTtlMs) await rm(path, { recursive: true, force: true });
    }
  }
}
