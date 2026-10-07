import './styles/archive.css';
import { initNavigation } from './controllers/navigation';
import { request, fileUrl } from './archive/api';
import { identifyArchives, importArchive, type ImportGroup } from './archive/importer';
import { dateText, renderPost, textElement } from './archive/render-post';
import { PAGE_SIZE, REPLY_SIZE, type ArchiveManifest, type ArchiveSummary, type PageData, type ReaderRequest, type ReplyData, type ThreadInfo } from './archive/types';

document.documentElement.classList.add('js'); initNavigation();
const find = <T extends Element = HTMLElement>(selector: string) => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`阅读器界面缺少 ${selector}`);
  return element;
};
const accessForm = find<HTMLFormElement>('[data-access-form]'), accessStatus = find('[data-access-status]'), logout = find<HTMLButtonElement>('[data-logout]');
const importButton = find<HTMLButtonElement>('[data-import]'), folder = find<HTMLInputElement>('[data-folder]'), retry = find<HTMLButtonElement>('[data-retry]');
const importStatus = find('[data-import-status]'), progress = find<HTMLProgressElement>('[data-upload-progress]'), bytesLabel = find('[data-upload-bytes]'), importError = find('[data-import-error]'), results = find('[data-import-results]');
const catalog = find('[data-archive-list]'), listStatus = find('[data-list-status]'), readerStatus = find('[data-reader-status]'), reader = find<HTMLElement>('[data-reader]');
const threadSelect = find<HTMLSelectElement>('[data-thread-select]'), authorOnly = find<HTMLInputElement>('[data-author-only]'), posts = find('[data-posts]');
const imageDialog = find<HTMLDialogElement>('[data-image-dialog]'), deleteDialog = find<HTMLDialogElement>('[data-delete-dialog]'), deleteButton = find<HTMLButtonElement>('[data-delete]');
let currentRole: string | null = null, maxDatabaseBytes = 32 * 1024 ** 2, groups: ImportGroup[] = [], importing = false;
let saved = new Set<string>(), archives: ArchiveSummary[] = [], manifest: ArchiveManifest | undefined, currentThread: ThreadInfo | undefined;
let worker: Worker | undefined, sequence = 0, currentPage = 1, totalPages = 1, selection = 0, paging = false;
const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);
const sizeText = (value: number) => value < 1024 ** 2 ? `${(value / 1024).toFixed(1)} KiB` : `${(value / 1024 ** 2).toFixed(2)} MiB`;
function stopWorker(): void {
  worker?.terminate(); worker = undefined;
  for (const promise of pending.values()) promise.reject(new Error('归档已切换'));
  pending.clear();
}
type WorkerCommand = ReaderRequest extends infer T ? T extends ReaderRequest ? Omit<T, 'id'> : never : never;
function query<T>(command: WorkerCommand): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!worker) { reject(new Error('阅读器未打开')); return; }
    const id = ++sequence;
    pending.set(id, { resolve: value => resolve(value as T), reject }); worker.postMessage({ ...command, id });
  });
}
function controls(): void {
  importButton.disabled = currentRole !== 'admin' || importing; retry.disabled = importButton.disabled;
  deleteButton.hidden = currentRole !== 'admin';
}
async function refreshSession(): Promise<void> {
  const session = await request<{ role: string | null; access: string; max_database_bytes: number }>('/session');
  currentRole = session.role; maxDatabaseBytes = session.max_database_bytes;
  accessStatus.textContent = session.role === 'admin' ? '管理员身份已验证，可导入和删除归档。' : session.role === 'reader' ? '私人阅读身份已验证。' : session.access === 'public' ? '公开归档可直接阅读；导入和删除需管理员身份。' : '私人归档需要验证身份后阅读。';
  logout.hidden = !session.role; accessForm.hidden = Boolean(session.role); controls();
}
function renderCatalog(): void {
  catalog.replaceChildren();
  for (const item of archives) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'archive-catalog-item';
    button.setAttribute('aria-pressed', String(manifest?.archive_id === item.archive_id));
    button.append(textElement('strong', item.title), textElement('span', `${item.forum_name}吧 · ${dateText(item.scraped_at)}`), textElement('small', `${sizeText(item.total_size)} · 导入 ${dateText(item.imported_at)}`));
    button.addEventListener('click', () => { void openArchive(item.archive_id); }); catalog.append(button);
  }
}
async function refreshList(): Promise<void> {
  listStatus.textContent = '正在获取云端归档…';
  try {
    archives = (await request<{ archives: ArchiveSummary[] }>('')).archives; renderCatalog();
    listStatus.textContent = archives.length ? `共 ${archives.length} 份归档` : '尚无已留档记录。';
  } catch (error) { catalog.replaceChildren(); listStatus.textContent = errorText(error); }
}
function enlarge(url: string): void {
  const image = find<HTMLImageElement>('[data-large-image]'); image.crossOrigin = 'use-credentials'; image.src = url;
  const download = find<HTMLAnchorElement>('[data-image-download]'); download.href = `${url}&download=1`;
  imageDialog.showModal();
}
find('[data-image-close]').addEventListener('click', () => imageDialog.close());
imageDialog.addEventListener('close', () => find<HTMLImageElement>('[data-large-image]').removeAttribute('src'));
async function displayPage(page: number, ticket = selection): Promise<void> {
  if (!manifest || !currentThread || paging) return;
  paging = true;
  authorOnly.disabled = true;
  document.querySelectorAll<HTMLButtonElement>('[data-prev],[data-next]').forEach(button => { button.disabled = true; });
  try {
    const data = await query<PageData>({ type: 'page', page, authorOnly: authorOnly.checked });
    if (ticket !== selection) return;
    posts.replaceChildren(); currentPage = data.page; totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
    for (const post of data.posts) {
      const article = renderPost(post, manifest, currentThread.thread_id, enlarge);
      if (post.reply_count) {
        const detail = document.createElement('details'); detail.className = 'archive-replies';
        const summary = textElement('summary', `楼中楼 · ${post.reply_count} 条回复`); detail.append(summary);
        const replies = document.createElement('div');
        const appendReplies = (items: typeof post.replies) => { for (const item of items) replies.append(renderPost(item, manifest!, currentThread!.thread_id, enlarge, true)); };
        // Only attach reply media when the reply section is actually expanded.
        let initialized = false;
        detail.addEventListener('toggle', () => { if (detail.open && !initialized) { appendReplies(post.replies); initialized = true; } });
        detail.append(replies);
        if (post.reply_count > REPLY_SIZE) {
          const more = textElement('button', '加载更多回复'); more.type = 'button'; let replyPage = 1;
          more.addEventListener('click', async () => {
            more.disabled = true;
            try {
              const data = await query<ReplyData>({ type: 'replies', postId: post.id, page: replyPage + 1 });
              if (ticket !== selection) return;
              replyPage = data.page; appendReplies(data.replies); more.hidden = replyPage * REPLY_SIZE >= data.total;
            } catch (error) { more.textContent = `${errorText(error)}；点击重试`; }
            finally { more.disabled = false; }
          }); detail.append(more);
        }
        article.append(detail);
      }
      posts.append(article);
    }
    if (!data.posts.length) posts.append(textElement('p', '此筛选下没有已抓取的楼层。'));
    readerStatus.textContent = '';
    document.querySelectorAll('[data-page-status]').forEach(element => { element.textContent = `${currentPage} / ${totalPages} 页 · ${data.total} 层`; });
  } catch (error) { if (ticket === selection) readerStatus.textContent = errorText(error); }
  finally {
    if (ticket === selection) {
      paging = false;
      authorOnly.disabled = false;
      document.querySelectorAll<HTMLButtonElement>('[data-prev]').forEach(button => { button.disabled = currentPage <= 1; });
      document.querySelectorAll<HTMLButtonElement>('[data-next]').forEach(button => { button.disabled = currentPage >= totalPages; });
    }
  }
}
async function openThread(thread: ThreadInfo, ticket: number): Promise<void> {
  if (!manifest) return;
  stopWorker(); paging = false; currentThread = thread; currentPage = 1; posts.replaceChildren();
  reader.hidden = false; readerStatus.textContent = '正在读取归档数据库…'; authorOnly.checked = false; authorOnly.disabled = true;
  document.querySelectorAll<HTMLButtonElement>('[data-prev],[data-next]').forEach(button => { button.disabled = true; });
  find('[data-thread-title]').replaceChildren(textElement('h2', thread.title));
  find('[data-thread-meta]').textContent = `${thread.forum_name}吧 · 抓取 ${dateText(manifest.scraped_at)} · 发布 ${dateText(thread.created_at)} · 帖子 ${thread.thread_id} · 浏览 ${thread.view_num ?? '未知'} · ${thread.post_count} 层 / ${thread.reply_count} 条楼中楼${thread.is_share ? ` · 转发原帖 ${thread.share_origin}` : ''}`;
  if (thread.forum_avatar && manifest.files.some(f => f.path === thread.forum_avatar)) {
    const avatar = document.createElement('img'); avatar.alt = `${thread.forum_name}吧头像`; avatar.crossOrigin = 'use-credentials'; avatar.src = fileUrl(manifest.archive_id, thread.forum_avatar); avatar.className = 'archive-forum-avatar';
    avatar.addEventListener('error', () => avatar.remove(), { once: true }); find('[data-thread-title]').prepend(avatar);
  }
  worker = new Worker(new URL('./archive/reader-worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = event => {
    const data = event.data as { id: number; result?: unknown; error?: string }; const promise = pending.get(data.id);
    pending.delete(data.id); if (data.error) promise?.reject(new Error(data.error)); else promise?.resolve(data.result);
  };
  worker.onerror = () => { for (const promise of pending.values()) promise.reject(new Error('数据库阅读引擎加载失败，请检查生产 WASM 和 Worker 资源')); pending.clear(); };
  try {
    await query({ type: 'open', url: fileUrl(manifest.archive_id, thread.database_path), threadId: thread.thread_id, maxBytes: maxDatabaseBytes });
    if (ticket === selection) await displayPage(1, ticket);
  } catch (error) { if (ticket === selection) readerStatus.textContent = errorText(error); }
}
async function openArchive(id: string): Promise<void> {
  const ticket = ++selection; stopWorker(); reader.hidden = true; posts.replaceChildren(); readerStatus.textContent = '正在读取归档清单…';
  try {
    const loaded = await request<ArchiveManifest>(`/${id}/manifest`);
    if (ticket !== selection) return;
    manifest = loaded; renderCatalog(); controls();
    const url = new URL(window.location.href); url.searchParams.set('id', id); window.history.replaceState(null, '', url);
    threadSelect.replaceChildren(...loaded.threads.map(thread => { const option = textElement('option', thread.title); option.value = thread.thread_id; return option; }));
    const thread = loaded.threads.find(t => t.thread_id === loaded.thread_id) ?? loaded.threads[0];
    if (!thread) throw new Error('归档没有可阅读的帖子');
    threadSelect.value = thread.thread_id; await openThread(thread, ticket);
  } catch (error) { if (ticket === selection) readerStatus.textContent = errorText(error); }
}
threadSelect.addEventListener('change', () => { const thread = manifest?.threads.find(t => t.thread_id === threadSelect.value); if (thread) void openThread(thread, ++selection); });
authorOnly.addEventListener('change', () => { void displayPage(1); });
document.querySelectorAll('[data-prev]').forEach(button => button.addEventListener('click', () => { void displayPage(currentPage - 1); }));
document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => { void displayPage(currentPage + 1); }));
find<HTMLInputElement>('[data-reading-size]').addEventListener('input', event => {
  const value = (event.target as HTMLInputElement).value; posts.style.setProperty('--reading-size', `${value}px`); find('[data-size-label]').textContent = `${value}px`;
});
async function runImport(): Promise<void> {
  if (importing || currentRole !== 'admin') return;
  importing = true; retry.hidden = true; importError.textContent = ''; controls();
  let activeResult: HTMLElement | undefined;
  try {
    for (const group of groups) {
      if (saved.has(group.root)) continue;
      importStatus.textContent = '上传中'; progress.value = 0;
      const item = textElement('li', `${group.root || '归档'}：上传中`); results.append(item);
      activeResult = item;
      const archive = await importArchive(group, (sent, total) => { progress.value = total ? sent / total * 100 : 100; bytesLabel.textContent = `${sizeText(sent)} / ${sizeText(total)}`; }, () => { importStatus.textContent = '校验中'; item.textContent = `${group.root}：校验中`; });
      saved.add(group.root); item.textContent = `${archive.title}：已留档`; importStatus.textContent = '已留档';
      await refreshList();
    }
  } catch (error) { importStatus.textContent = '导入失败'; importError.textContent = errorText(error); if (activeResult) activeResult.textContent = activeResult.textContent?.replace(/：(?:上传中|校验中)$/, '：导入失败') ?? '导入失败'; retry.hidden = false; }
  finally { importing = false; controls(); }
}
importButton.addEventListener('click', () => { folder.value = ''; folder.click(); });
folder.addEventListener('change', () => {
  if (!folder.files?.length) return;
  importStatus.textContent = '准备导入'; results.replaceChildren(); importError.textContent = ''; saved = new Set();
  try { groups = identifyArchives(folder.files); void runImport(); }
  catch (error) { groups = []; retry.hidden = true; importStatus.textContent = '导入失败'; importError.textContent = errorText(error); }
});
retry.addEventListener('click', () => { void runImport(); });
accessForm.addEventListener('submit', async event => {
  event.preventDefault(); const token = find<HTMLInputElement>('#archive-token');
  try { await request('/session', 'POST', { token: token.value }); token.value = ''; await refreshSession(); await refreshList(); const id = new URL(window.location.href).searchParams.get('id'); if (id) await openArchive(id); }
  catch (error) { accessStatus.textContent = errorText(error); }
});
logout.addEventListener('click', async () => {
  try { await request('/session', 'DELETE'); ++selection; stopWorker(); reader.hidden = true; posts.replaceChildren(); manifest = undefined; imageDialog.close(); await refreshSession(); await refreshList(); readerStatus.textContent = '选择一份已留档的记录，开始阅读。'; }
  catch (error) { accessStatus.textContent = errorText(error); }
});
find('[data-refresh]').addEventListener('click', () => { void refreshList(); });
deleteButton.addEventListener('click', () => { if (manifest) { find('[data-delete-title]').textContent = manifest.title; find('[data-delete-error]').textContent = ''; deleteDialog.showModal(); } });
find('[data-delete-cancel]').addEventListener('click', () => deleteDialog.close());
find<HTMLButtonElement>('[data-delete-confirm]').addEventListener('click', async event => {
  if (!manifest) return;
  const button = event.currentTarget as HTMLButtonElement; button.disabled = true;
  try {
    await request(`/${manifest.archive_id}`, 'DELETE'); ++selection; stopWorker(); manifest = undefined; currentThread = undefined; posts.replaceChildren(); reader.hidden = true; readerStatus.textContent = '归档已删除。';
    const url = new URL(window.location.href); url.searchParams.delete('id'); window.history.replaceState(null, '', url);
    deleteDialog.close(); await refreshList();
  } catch (error) { find('[data-delete-error]').textContent = errorText(error); }
  finally { button.disabled = false; }
});
window.addEventListener('beforeunload', event => { if (importing) event.preventDefault(); });
window.addEventListener('pagehide', stopWorker, { once: true });
void (async () => {
  try { await refreshSession(); await refreshList(); const id = new URL(window.location.href).searchParams.get('id'); if (id) await openArchive(id); }
  catch (error) { accessStatus.textContent = errorText(error); listStatus.textContent = '连接服务后将自动获取已保存的归档。'; }
})();
