const configured = (import.meta.env.VITE_ARCHIVE_API_URL ?? '').replace(/\/$/, '');
export const apiBase = `${configured}/api/archives`;
export async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, { method, credentials: 'include',
      headers: method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-Archive-Request': '1' },
      body: body === undefined ? undefined : JSON.stringify(body) });
  } catch { throw new Error('无法连接云端归档服务，请检查网络或服务配置'); }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error ?? `云端归档服务不可用（${response.status}）`);
  return data as T;
}
export function fileUrl(archiveId: string, path: string, download = false): string {
  return `${apiBase}/${encodeURIComponent(archiveId)}/files?path=${encodeURIComponent(path)}${download ? '&download=1' : ''}`;
}
export function uploadChunk(id: string, path: string, offset: number, chunk: Blob, progress: (bytes: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `${apiBase}/imports/${id}/file?path=${encodeURIComponent(path)}&offset=${offset}`);
    xhr.withCredentials = true; xhr.timeout = 180000;
    xhr.setRequestHeader('Content-Type', 'application/octet-stream'); xhr.setRequestHeader('X-Archive-Request', '1');
    xhr.upload.onprogress = event => progress(event.loaded);
    xhr.onerror = () => reject(new Error('上传连接中断，请重试'));
    xhr.ontimeout = () => reject(new Error('上传超时，请重试'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else { let reason = `上传失败（${xhr.status}）`; try { reason = JSON.parse(xhr.responseText).error ?? reason; } catch { /* Proxy may return HTML. */ } reject(new Error(reason)); }
    };
    xhr.send(chunk);
  });
}
