import { mkdtemp, rm, readFile, writeFile, copyFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { expect, test } from '@playwright/test';
// @ts-expect-error Fixture generator uses the standalone Node 24 SQLite API.
import { fixture } from '../fixtures/archive-fixture.mjs';

test('folder imports persist and the safe reader works on every viewport', async ({ page, browser }, info) => {
  const root = await mkdtemp(join(tmpdir(), 'mydei-folder-'));
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const title = `${info.project.name} 中文归档 <script>unsafe</script>`;
  try {
    for (const snapshot of ['中文快照', '重复快照']) {
      const directory = join(root, snapshot); await fixture(directory);
      const metadataPath = join(directory, 'threads', '123', 'thread.json');
      const metadata = JSON.parse(await readFile(metadataPath, 'utf8')); metadata.title = title;
      await writeFile(metadataPath, JSON.stringify(metadata));
    }
    await page.goto('/archive/');
    await expect(page.locator('[data-import]')).toBeDisabled();
    await page.locator('#archive-token').fill('browser-test-admin-01234567890123456789');
    await page.getByRole('button', { name: '验证身份' }).click();
    await expect(page.locator('[data-import]')).toBeEnabled();
    const uploadPattern = '**/api/archives/imports/*/file?**';
    if (info.project.name === 'desktop-1440') await page.route(uploadPattern, route => route.abort('connectionfailed'));
    await page.locator('[data-folder]').setInputFiles(root);
    if (info.project.name === 'desktop-1440') {
      await expect(page.locator('[data-import-status]')).toHaveText('导入失败');
      await expect(page.locator('[data-import-error]')).toContainText('上传连接中断');
      await expect(page.locator('[data-retry]')).toBeVisible();
      await expect(page.locator('.archive-catalog-item').filter({ has: page.getByText(title, { exact: true }) })).toHaveCount(0);
      await page.unroute(uploadPattern); await page.locator('[data-retry]').click();
      await expect(page.locator('[data-import-results] li').last()).toHaveText(`${title}：已留档`, { timeout: 60000 });
    }
    await expect(page.locator('[data-import-results] li').filter({ hasText: `${title}：已留档` })).toHaveCount(2, { timeout: 60000 });
    await expect(page.locator('[data-upload-progress]')).toHaveJSProperty('value', 100);
    const entries = page.locator('.archive-catalog-item').filter({ has: page.getByText(title, { exact: true }) });
    await expect(entries).toHaveCount(2);
    await entries.first().click();
    await expect(page.locator('[data-page-status]').first()).toContainText('25 层', { timeout: 30000 });
    await expect(page.locator('.archive-post')).toHaveCount(20);
    await expect(page.locator('.archive-post').first()).toContainText('第1层正文 <img src=x onerror=alert(1)>');
    await expect(page.locator('.archive-post-content script,.archive-post-content img[onerror]')).toHaveCount(0);
    await expect(page.locator('.archive-post').first()).toContainText('图片未留档或文件缺失：缺失.png');
    await page.locator('.archive-replies summary').first().click();
    await expect(page.locator('.archive-reply')).toHaveCount(10);
    await expect(page.locator('.archive-reply').nth(1)).toContainText('回复 读者');
    await page.getByRole('button', { name: '加载更多回复' }).click();
    await expect(page.locator('.archive-reply')).toHaveCount(13);
    await page.getByRole('button', { name: '放大图片' }).first().click();
    await expect(page.locator('[data-image-dialog]')).toBeVisible();
    await expect(page.locator('[data-large-image]')).toHaveJSProperty('naturalWidth', 1);
    await page.getByRole('button', { name: '关闭图片' }).click();
    await page.locator('[data-author-only]').check();
    await expect(page.locator('[data-page-status]').first()).toContainText('13 层');
    await expect(page.locator('.archive-post')).toHaveCount(13);
    await page.locator('[data-author-only]').uncheck();
    await expect(page.locator('[data-page-status]').first()).toContainText('25 层');
    await page.locator('[data-next]').first().click();
    await expect(page.locator('.archive-post')).toHaveCount(5);
    await expect(page.locator('.archive-post').first()).toContainText('21 楼');
    await page.locator('[data-reading-size]').fill('24');
    await expect(page.locator('[data-size-label]')).toHaveText('24px');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); expect(overflow).toBeLessThanOrEqual(1);
    const url = page.url(); await page.reload();
    await expect(page.locator('[data-page-status]').first()).toContainText('25 层', { timeout: 30000 });
    // Independent browser context represents another device; only cloud data is used.
    const context = await browser.newContext({ storageState: await page.context().storageState(), viewport: page.viewportSize() ?? undefined });
    const other = await context.newPage(); await other.goto(url);
    await expect(other.locator('.archive-post')).toHaveCount(20, { timeout: 30000 });
    await context.close();
    await page.locator('[data-delete]').click(); await page.getByRole('button', { name: '确认删除' }).click();
    await expect(entries).toHaveCount(1);
    await entries.first().click(); await expect(page.locator('[data-page-status]').first()).toContainText('25 层');
    await expect(page.locator('[data-delete]')).toBeVisible();
    expect(errors).toEqual([]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('a real TiebaScraper folder uploads and matches its original SQLite content', async ({ page }, info) => {
  test.skip(!process.env.TIEBA_REAL_ARCHIVE_DIR || info.project.name !== 'desktop-1440', 'set TIEBA_REAL_ARCHIVE_DIR for optional local-only real data verification');
  test.setTimeout(120000);
  const root = process.env.TIEBA_REAL_ARCHIVE_DIR!;
  const scrape = JSON.parse(await readFile(join(root, 'scrape_info.json'), 'utf8'));
  const threadId = String(scrape.main_thread);
  const metadata = JSON.parse(await readFile(join(root, 'threads', threadId, 'thread.json'), 'utf8'));
  const scratch = await mkdtemp(join(tmpdir(), 'mydei-real-query-'));
  const databasePath = join(root, 'threads', threadId, 'content.db');
  await copyFile(databasePath, join(scratch, 'content.db'));
  if (await stat(`${databasePath}-wal`).catch(() => false)) await copyFile(`${databasePath}-wal`, join(scratch, 'content.db-wal'));
  const db = new DatabaseSync(join(scratch, 'content.db'), { readOnly: true });
  const count = db.prepare('SELECT count(*) total FROM post WHERE parent_id=0').get()?.total;
  const first = db.prepare('SELECT p.floor,p.contents,u.nickname FROM post p LEFT JOIN user u ON u.id=p.user_id WHERE p.parent_id=0 ORDER BY p.floor,p.id LIMIT 1').get()!;
  db.close();
  await rm(scratch, { recursive: true, force: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/archive/'); await page.locator('#archive-token').fill('browser-test-admin-01234567890123456789'); await page.getByRole('button', { name: '验证身份' }).click();
  await expect(page.locator('[data-import]')).toBeEnabled();
  await page.locator('[data-folder]').setInputFiles(root);
  await expect(page.locator('[data-import-status]')).toHaveText('已留档', { timeout: 90000 });
  await page.locator('.archive-catalog-item').filter({ has: page.getByText(metadata.title, { exact: true }) }).click();
  await expect(page.locator('[data-page-status]').first()).toContainText(`${count} 层`, { timeout: 30000 });
  const firstArticle = page.locator('.archive-post').first();
  await expect(firstArticle).toContainText(String(first.nickname)); await expect(firstArticle).toContainText(`${first.floor} 楼`);
  const nodes = JSON.parse(String(first.contents)) as { type: number; text?: string }[];
  const text = nodes.find(node => node.type === 1)?.text;
  if (text) await expect(firstArticle).toContainText(text.slice(0, 80));
  const image = page.locator('.archive-image-button img').first();
  if (await image.count()) { await image.scrollIntoViewIfNeeded(); await expect.poll(() => image.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0); }
  await page.screenshot({ path: info.outputPath('real-archive-reader.png'), fullPage: false });
  await page.reload(); await expect(page.locator('[data-page-status]').first()).toContainText(`${count} 层`, { timeout: 30000 });
  expect(errors).toEqual([]);
});
