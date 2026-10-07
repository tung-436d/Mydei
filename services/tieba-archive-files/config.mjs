import { isAbsolute, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export function configuration(env = process.env) {
  if (!env.ARCHIVE_DATA_DIR || !isAbsolute(env.ARCHIVE_DATA_DIR)) throw new Error('ARCHIVE_DATA_DIR 必须是持久磁盘上的绝对路径');
  if ((env.ARCHIVE_ADMIN_TOKEN ?? '').length < 32) throw new Error('ARCHIVE_ADMIN_TOKEN 至少需要 32 个字符');
  if (env.ARCHIVE_ADMIN_TOKEN.startsWith('replace-with-') || env.ARCHIVE_READ_TOKEN?.startsWith('replace-with-')) throw new Error('请用随机凭证替换示例环境变量中的占位文本');
  const access = env.ARCHIVE_ACCESS ?? 'private';
  if (!['private', 'public'].includes(access)) throw new Error('ARCHIVE_ACCESS 只能是 private 或 public');
  if (access === 'private' && env.ARCHIVE_READ_TOKEN && env.ARCHIVE_READ_TOKEN.length < 32) throw new Error('ARCHIVE_READ_TOKEN 至少需要 32 个字符');
  const dataDir = resolve(env.ARCHIVE_DATA_DIR);
  const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
  const rel = relative(projectRoot, dataDir);
  if (!rel || (!rel.startsWith('..') && !isAbsolute(rel))) throw new Error('归档数据不得放在源码、构建或依赖目录中');
  const positive = (key, fallback) => {
    const value = Number(env[key] ?? fallback);
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${key} 必须是正整数`);
    return value;
  };
  return {
    dataDir, access, adminToken: env.ARCHIVE_ADMIN_TOKEN, readToken: env.ARCHIVE_READ_TOKEN,
    host: env.ARCHIVE_HOST ?? '127.0.0.1', port: positive('ARCHIVE_PORT', 8787),
    origins: (env.ARCHIVE_ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:4173').split(',').map(v => v.trim()).filter(Boolean),
    cookieSecure: env.ARCHIVE_COOKIE_SECURE !== 'false',
    maxFileBytes: positive('ARCHIVE_MAX_FILE_BYTES', 1024 ** 3),
    maxArchiveBytes: positive('ARCHIVE_MAX_BYTES', 2 * 1024 ** 3),
    maxDatabaseBytes: positive('ARCHIVE_MAX_DATABASE_BYTES', 32 * 1024 ** 2),
    maxFiles: positive('ARCHIVE_MAX_FILES', 20000),
    maxStorageBytes: positive('ARCHIVE_MAX_STORAGE_BYTES', 20 * 1024 ** 3),
    maxImports: positive('ARCHIVE_MAX_IMPORTS', 2),
    chunkBytes: 4 * 1024 ** 2,
    stagingTtlMs: positive('ARCHIVE_STAGING_TTL_HOURS', 24) * 3600000,
  };
}
