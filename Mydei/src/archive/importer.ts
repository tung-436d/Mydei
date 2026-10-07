import { request, uploadChunk } from './api';
import type { ArchiveSummary } from './types';

export interface ImportGroup { root: string; files: { path: string; file: File }[] }
export function identifyArchives(files: Iterable<File>): ImportGroup[] {
  const entries = [...files].map(file => ({ file, path: file.webkitRelativePath || file.name }));
  const roots = entries.filter(v => v.path.endsWith('/scrape_info.json') || v.path === 'scrape_info.json')
    .map(v => v.path.slice(0, -'scrape_info.json'.length));
  if (!roots.length) throw new Error('未找到 scrape_info.json，请选择归档文件夹或包含多份归档的父目录');
  return roots.map(root => ({ root, files: entries.filter(v => v.path.startsWith(root) && !roots.some(other => other !== root && other.startsWith(root) && v.path.startsWith(other)))
    .map(v => ({ path: v.path.slice(root.length), file: v.file })) }));
}
export async function importArchive(group: ImportGroup, progress: (bytes: number, total: number) => void, validating: () => void): Promise<ArchiveSummary> {
  let id: string | undefined;
  try {
    const created = await request<{ archive_id: string; chunk_bytes: number }>('/imports', 'POST', { files: group.files.map(v => ({ path: v.path, size: v.file.size })) });
    id = created.archive_id;
    const total = group.files.reduce((sum, v) => sum + v.file.size, 0);
    let sent = 0;
    for (const { file, path } of group.files) {
      for (let offset = 0; offset < file.size || (file.size === 0 && offset === 0); offset += created.chunk_bytes) {
        const chunk = file.slice(offset, offset + created.chunk_bytes);
        await uploadChunk(id, path, offset, chunk, loaded => progress(sent + Math.min(loaded, chunk.size), total));
        sent += chunk.size; progress(sent, total);
        if (!file.size) break;
      }
    }
    validating();
    return await request<ArchiveSummary>(`/imports/${id}/complete`, 'POST');
  } catch (error) {
    if (id) await request(`/imports/${id}`, 'DELETE').catch(() => {});
    throw error;
  }
}
