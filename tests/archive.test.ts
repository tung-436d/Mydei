import { describe, expect, it } from 'vitest';
import initSqlJs from 'sql.js';
import { postPage, replyPage, checkDatabase } from '../Mydei/src/archive/database';
import { contentNodes, safeLink } from '../Mydei/src/archive/render-post';
import { identifyArchives } from '../Mydei/src/archive/importer';

describe('archive reader', () => {
  it('reads floors, authors, reply relations and paginates without conflating replies with floors', async () => {
    const SQL = await initSqlJs(); const db = new SQL.Database();
    db.run(`CREATE TABLE db_info(k TEXT,v TEXT); INSERT INTO db_info VALUES('thread_id','123');
      CREATE TABLE user(id INTEGER,nickname TEXT,username TEXT,avatar TEXT,level INTEGER,ip TEXT);
      INSERT INTO user VALUES(1,'楼主','op',NULL,12,'上海'),(2,'读者','user',NULL,3,'浙江');
      CREATE TABLE post(id INTEGER,contents TEXT,floor INTEGER,user_id INTEGER,create_time INTEGER,is_thread_author INTEGER,parent_id INTEGER,reply_to_id INTEGER);`);
    for (let id = 1; id <= 25; id++) db.run('INSERT INTO post VALUES(?,?,?,?,?,?,?,?)', [id, '[{"type":1,"text":"正文"}]', id, id % 2 ? 1 : 2, 1750000000 + id, id % 2, 0, 0]);
    db.run(`INSERT INTO post VALUES(100,'[]',1,2,1750000200,0,1,0),(101,'[]',1,1,1750000201,1,1,100)`);
    checkDatabase(db, '123');
    const first = postPage(db, 1, false); expect(first.total).toBe(25); expect(first.posts).toHaveLength(20);
    expect(first.posts[0]?.nickname).toBe('楼主'); expect(first.posts[0]?.replies).toHaveLength(2);
    expect(first.posts[0]?.replies[1]?.reply_author).toBe('读者'); expect(first.posts[0]?.replies[1]?.reply_to_id).toBe('100');
    expect(postPage(db, 2, false).posts[0]?.floor).toBe(21); expect(postPage(db, 1, true).total).toBe(13);
    expect(replyPage(db, '1', 1).total).toBe(2); expect(() => checkDatabase(db, 'other')).toThrow(/ID/); db.close();
  });
  it('identifies multiple Chinese roots and independent snapshots while ignoring files outside archives', () => {
    const paths = ['父目录/中文快照/scrape_info.json', '父目录/中文快照/threads/123/content.db', '父目录/中文快照2/scrape_info.json', '父目录/中文快照2/threads/123/content.db', '父目录/tieba_auth.json'];
    const groups = identifyArchives(paths.map(webkitRelativePath => ({ webkitRelativePath, name: 'file' }) as File));
    expect(groups).toHaveLength(2); expect(groups[0]?.files.map(v => v.path)).toEqual(['scrape_info.json', 'threads/123/content.db']);
  });
  it('keeps malicious HTML as text and rejects executable URLs', () => {
    expect(contentNodes('not JSON <script>run()</script>')[0]?.text).toContain('<script>');
    expect(safeLink('javascript:alert(1)')).toBeUndefined(); expect(safeLink('data:text/html,a')).toBeUndefined();
    expect(safeLink('https://tieba.baidu.com/p/123')).toBe('https://tieba.baidu.com/p/123');
  });
});
