import { DatabaseSync } from 'node:sqlite';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

// Generated in a temporary directory. No real posts, avatars, or DB files enter Git.
export async function fixture(root, { wal = false } = {}) {
  const dir = join(root, 'threads', '123');
  await mkdir(join(dir, 'post_assets', 'images'), { recursive: true });
  await mkdir(join(dir, 'user_avatar'), { recursive: true });
  await mkdir(join(dir, 'forum_avatar'), { recursive: true });
  const json = (path, value) => writeFile(path, JSON.stringify(value));
  await json(join(root, 'scrape_info.json'), { main_thread: 123, update_time: 1757309177, scraper_version: '1.3.1' });
  await json(join(dir, 'thread.json'), { id: 123, title: '中文归档 <script>unsafe</script>', forum_name: '万敌', user_id: 1, create_time: 1755197318, view_num: 100, reply_num: 24 });
  await json(join(dir, 'forum.json'), { id: 10, name: '万敌', small_avatar: '吧头像.png' });
  const db = new DatabaseSync(join(dir, 'content.db'));
  db.exec(`CREATE TABLE db_info(k TEXT,v TEXT); INSERT INTO db_info VALUES('thread_id','123');
    CREATE TABLE user(id INTEGER PRIMARY KEY,nickname TEXT,username TEXT,avatar TEXT,level INTEGER,ip TEXT);
    INSERT INTO user VALUES(1,'楼主','author','头像.png',12,'上海'),(2,'读者','reader',NULL,5,'浙江');
    CREATE TABLE post(id INTEGER PRIMARY KEY,contents TEXT,floor INTEGER,user_id INTEGER,create_time INTEGER,is_thread_author INTEGER,parent_id INTEGER,reply_to_id INTEGER);`);
  const insert = db.prepare('INSERT INTO post VALUES(?,?,?,?,?,?,?,?)');
  for (let floor = 1; floor <= 25; floor++) {
    const nodes = [{ type: 1, text: `第${floor}层正文 <img src=x onerror=alert(1)>` }];
    if (floor === 1) nodes.push({ type: 3, filename: '中文图片.png' }, { type: 3, filename: '缺失.png' }, { type: 5, text: '不可执行', raw_url: 'javascript:alert(1)' }, { type: 7, filename: 'video.unsupported' }, { type: 8, filename: 'voice.amr' });
    insert.run(floor, JSON.stringify(nodes), floor, floor % 2 ? 1 : 2, 1755197318 + floor, floor % 2, 0, 0);
  }
  for (let reply = 1; reply <= 13; reply++) insert.run(100 + reply, JSON.stringify([{ type: 1, text: `回复${reply}` }]), 1, 2, 1755197418 + reply, 0, 1, reply === 1 ? 0 : 100 + reply - 1);
  // Optional committed WAL page must appear in the derived browser DB while originals stay byte-identical.
  if (wal) { db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0;'); insert.run(900, '[{"type":1,"text":"WAL里的已提交正文"}]', 26, 1, 1755198000, 1, 0, 0); }
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP7sAAAAASUVORK5CYII=', 'base64');
  await writeFile(join(dir, 'post_assets', 'images', '中文图片.png'), png);
  await writeFile(join(dir, 'user_avatar', '头像.png'), png);
  await writeFile(join(dir, 'forum_avatar', '吧头像.png'), png);
  for (const [folder, name] of [['videos', 'video.unsupported'], ['voices', 'voice.amr']]) {
    await mkdir(join(dir, 'post_assets', folder), { recursive: true });
    await writeFile(join(dir, 'post_assets', folder, name), Buffer.from('unsupported-media'));
  }
  if (!wal) db.close();
  return { db: wal ? db : undefined };
}
export async function filesUnder(root) {
  const files = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) { const data = await readFile(path); files.push({ path: relative(root, path).replaceAll('\\', '/'), data, size: data.byteLength }); }
    }
  }
  await walk(root); return files;
}
