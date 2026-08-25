import type { ArchiveEntry } from './content';
export const emptyStateMarkup=(message:string):string=>`<p class="empty-state" role="status">${message}</p>`;
export function archiveMarkup(entries:ArchiveEntry[]):string{
  if(entries.length===0)return emptyStateMarkup('暂无可展示的数据');
  return entries.map((entry,index)=>`<article class="archive-card"><span class="index">${String(index+1).padStart(2,'0')} / ARCHIVE</span><h3>${entry.title}</h3><p>${entry.summary}</p><p class="pending">${entry.status}</p></article>`).join('');
}
