import initSqlJs, { type Database } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { checkDatabase, postPage, replyPage } from './database';
import type { ReaderRequest } from './types';

let database: Database | undefined;
const sql = initSqlJs({ locateFile: () => wasmUrl });
self.onmessage = async (event: MessageEvent<ReaderRequest>) => {
  const message = event.data;
  try {
    let result: unknown;
    if (message.type === 'open') {
      database?.close(); database = undefined;
      const response = await fetch(message.url, { credentials: 'include' });
      if (!response.ok) throw new Error(response.status === 401 ? '归档访问凭证已过期，请重新验证' : '归档数据库读取失败或文件缺失');
      const size = Number(response.headers.get('Content-Length'));
      if (!size || size > message.maxBytes) throw new Error('数据库大小无效或超过浏览器读取上限');
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > message.maxBytes) throw new Error('数据库超过浏览器读取上限');
      const SQL = await sql;
      database = new SQL.Database(new Uint8Array(bytes));
      checkDatabase(database, message.threadId);
      result = true;
    } else {
      if (!database) throw new Error('数据库尚未打开');
      result = message.type === 'page' ? postPage(database, message.page, message.authorOnly) : replyPage(database, message.postId, message.page);
    }
    self.postMessage({ id: message.id, result });
  } catch (error) {
    self.postMessage({ id: message.id, error: `数据库异常：${error instanceof Error ? error.message : String(error)}` });
  }
};
