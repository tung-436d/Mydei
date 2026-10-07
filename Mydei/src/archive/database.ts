import type { Database, SqlValue } from 'sql.js';
import { PAGE_SIZE, REPLY_SIZE, type PageData, type Post, type ReplyData } from './types';

const fields = `CAST(p.id AS TEXT) id,p.floor,CAST(p.user_id AS TEXT) user_id,CAST(p.parent_id AS TEXT) parent_id,
 CAST(p.reply_to_id AS TEXT) reply_to_id,p.contents,p.create_time,p.is_thread_author,
 coalesce(u.nickname,u.username,'未知用户') nickname,coalesce(u.username,'') username,u.avatar,coalesce(u.level,0) level,coalesce(u.ip,'') ip,
 coalesce(ru.nickname,ru.username) reply_author,(SELECT count(*) FROM post sub WHERE sub.parent_id=p.id) reply_count`;
const joins = 'FROM post p LEFT JOIN user u ON u.id=p.user_id LEFT JOIN post rp ON rp.id=p.reply_to_id LEFT JOIN user ru ON ru.id=rp.user_id';
function rows(db: Database, sql: string, params: SqlValue[] = []): Record<string, SqlValue>[] {
  const statement = db.prepare(sql);
  try {
    statement.bind(params); const results: Record<string, SqlValue>[] = [];
    while (statement.step()) results.push(statement.getAsObject());
    return results;
  } finally { statement.free(); }
}
const count = (db: Database, sql: string, params: SqlValue[] = []) => Number(rows(db, sql, params)[0]?.total ?? 0);
export function checkDatabase(db: Database, threadId: string): void {
  db.run('PRAGMA query_only=ON; PRAGMA trusted_schema=OFF;');
  if (String(rows(db, "SELECT v FROM db_info WHERE k='thread_id'")[0]?.v) !== threadId) throw new Error('数据库帖子 ID 与归档不匹配');
  rows(db, `SELECT ${fields} ${joins} LIMIT 1`);
}
export function replyPage(db: Database, postId: string, requested: number): ReplyData {
  const total = count(db, 'SELECT count(*) total FROM post WHERE parent_id=?', [postId]);
  const page = Math.max(1, Math.min(Math.floor(requested), Math.max(1, Math.ceil(total / REPLY_SIZE))));
  const replies = rows(db, `SELECT ${fields} ${joins} WHERE p.parent_id=? ORDER BY p.create_time,p.id LIMIT ? OFFSET ?`, [postId, REPLY_SIZE, (page - 1) * REPLY_SIZE]) as unknown as Post[];
  return { total, page, replies };
}
export function postPage(db: Database, requested: number, authorOnly: boolean): PageData {
  const where = `p.parent_id=0${authorOnly ? ' AND p.is_thread_author=1' : ''}`;
  const total = count(db, `SELECT count(*) total FROM post p WHERE ${where}`);
  const page = Math.max(1, Math.min(Math.floor(requested), Math.max(1, Math.ceil(total / PAGE_SIZE))));
  const posts = (rows(db, `SELECT ${fields} ${joins} WHERE ${where} ORDER BY p.floor,p.id LIMIT ? OFFSET ?`, [PAGE_SIZE, (page - 1) * PAGE_SIZE]) as unknown as Post[])
    .map(post => ({ ...post, replies: replyPage(db, post.id, 1).replies }));
  return { total, page, posts };
}
