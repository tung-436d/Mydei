import { fileUrl } from './api';
import type { ArchiveManifest, ContentNode, Post } from './types';

export function dateText(value: string | number): string {
  const date = new Date(typeof value === 'number' ? value * 1000 : value);
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
}
export function textElement<K extends keyof HTMLElementTagNameMap>(tag: K, text: string, className?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag); element.textContent = text;
  if (className) element.className = className;
  return element;
}
function mediaPath(manifest: ArchiveManifest, threadId: string, filename: string, directory: string): string | undefined {
  if (/[\\/]/.test(filename) || filename.includes(String.fromCharCode(0)) || filename === '..') return undefined;
  const path = `threads/${threadId}/${directory}/${filename}`;
  return manifest.files.some(file => file.path === path) ? path : undefined;
}
export function contentNodes(contents: string): ContentNode[] {
  try {
    const value: unknown = JSON.parse(contents);
    if (Array.isArray(value)) return value.filter(node => node && typeof node === 'object') as ContentNode[];
  } catch { /* Preserve readable text even if a single post has malformed fragments. */ }
  return [{ type: 1, text: contents }];
}
export function safeLink(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined; }
  catch { return undefined; }
}
export function renderContents(contents: string, manifest: ArchiveManifest, threadId: string, enlarge: (url: string) => void): HTMLElement {
  const body = textElement('div', '', 'archive-post-content');
  for (const node of contentNodes(contents)) {
    const value = typeof node.text === 'string' ? node.text : '';
    if ([1, 4, 6].includes(node.type)) { body.append(textElement('span', value)); continue; }
    if (node.type === 2) { body.append(textElement('span', `[${typeof node.desc === 'string' ? node.desc : '表情'}]`, 'archive-emoji')); continue; }
    if (node.type === 5) {
      const href = safeLink(node.raw_url) ?? safeLink(value);
      const label = typeof node.title === 'string' ? node.title : value;
      if (href) { const link = textElement('a', label || href); link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; body.append(link); }
      else body.append(textElement('span', label));
      continue;
    }
    if ([3, 7, 8].includes(node.type)) {
      const directory = node.type === 3 ? 'images' : node.type === 7 ? 'videos' : 'voices';
      const filename = typeof node.filename === 'string' ? node.filename : '';
      const path = mediaPath(manifest, threadId, filename, `post_assets/${directory}`);
      const label = node.type === 3 ? '图片' : node.type === 7 ? '视频' : '语音';
      if (!path) { body.append(textElement('p', `${label}未留档或文件缺失${filename ? `：${filename}` : ''}`, 'archive-media-note')); continue; }
      const url = fileUrl(manifest.archive_id, path);
      const figure = document.createElement('figure'); figure.className = 'archive-media';
      const download = textElement('a', `下载原${label}`); download.href = fileUrl(manifest.archive_id, path, true); download.download = filename;
      if (node.type === 3) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'archive-image-button'; button.setAttribute('aria-label', '放大图片');
        const image = document.createElement('img'); image.alt = '归档正文图片'; image.loading = 'lazy'; image.decoding = 'async'; image.crossOrigin = 'use-credentials'; image.src = url;
        image.addEventListener('error', () => { button.replaceWith(textElement('p', '图片读取失败，文字仍可继续阅读。', 'archive-media-note')); }, { once: true });
        button.append(image); button.addEventListener('click', () => enlarge(url)); figure.append(button);
      } else {
        const media = document.createElement(node.type === 7 ? 'video' : 'audio'); media.controls = true; media.preload = 'none'; media.crossOrigin = 'use-credentials';
        if (media instanceof HTMLVideoElement) media.playsInline = true;
        media.src = url;
        const note = textElement('p', '若浏览器不支持此格式，可下载原文件播放。', 'archive-media-note');
        media.addEventListener('error', () => { note.textContent = '此媒体缺失或浏览器无法播放此格式，请下载原文件。'; });
        figure.append(media, note);
      }
      figure.append(download); body.append(figure); continue;
    }
    body.append(textElement('span', value || (typeof node.desc === 'string' ? node.desc : '[未支持的内容片段]'), 'archive-media-note'));
  }
  return body;
}
export function renderPost(post: Post, manifest: ArchiveManifest, threadId: string, enlarge: (url: string) => void, reply = false): HTMLElement {
  const article = document.createElement('article'); article.className = reply ? 'archive-reply' : 'archive-post'; article.id = `post-${post.id}`;
  const header = document.createElement('header'); header.className = 'archive-post-header';
  if (post.avatar) {
    const path = mediaPath(manifest, threadId, post.avatar, 'user_avatar');
    if (path) {
      const avatar = document.createElement('img'); avatar.alt = ''; avatar.loading = 'lazy'; avatar.width = 40; avatar.height = 40; avatar.crossOrigin = 'use-credentials'; avatar.src = fileUrl(manifest.archive_id, path);
      avatar.addEventListener('error', () => avatar.remove(), { once: true }); header.append(avatar);
    }
  }
  const info = document.createElement('div');
  const name = textElement('strong', post.nickname || post.username || `用户 ${post.user_id}`);
  info.append(name);
  if (post.is_thread_author) info.append(textElement('span', '楼主', 'archive-author-badge'));
  const meta = textElement('p', `${reply ? '楼中楼' : `${post.floor} 楼`} · ${dateText(post.create_time)}${post.level ? ` · Lv.${post.level}` : ''}${post.ip ? ` · ${post.ip}` : ''}`);
  info.append(meta); header.append(info); article.append(header);
  if (reply && post.reply_to_id !== '0') {
    const relation = textElement('p', `回复 ${post.reply_author ?? `帖子 ${post.reply_to_id}`}`, 'archive-reply-relation');
    const target = textElement('a', '查看回复对象'); target.href = `#post-${post.reply_to_id}`;
    target.addEventListener('click', event => {
      if (!document.getElementById(`post-${post.reply_to_id}`)) {
        event.preventDefault(); relation.textContent = `回复 ${post.reply_author ?? post.reply_to_id}（对象不在当前页，帖子 ID：${post.reply_to_id}）`;
      }
    });
    relation.append(' · ', target); article.append(relation);
  }
  article.append(renderContents(post.contents, manifest, threadId, enlarge));
  return article;
}
