import type{LibraryEntryData}from'../models/content';
import{escapeHtml}from'../render';

export function libraryEntryMarkup(entry:LibraryEntryData):string{
 return`<details class="library-entry" id="${escapeHtml(entry.id)}"${entry.defaultOpen?' open':''}><summary class="library-entry__summary" id="${escapeHtml(entry.id)}-summary"><span class="library-entry__category">${escapeHtml(entry.category)}</span><span class="library-entry__title">${escapeHtml(entry.title)}</span><span class="library-entry__excerpt">${escapeHtml(entry.summary)}</span><span class="library-entry__indicator" aria-hidden="true"></span></summary><div class="library-entry__body">${entry.sections.map(section=>`${section.heading?`<h3>${escapeHtml(section.heading)}</h3>`:''}${section.paragraphs.map(paragraph=>`<p>${escapeHtml(paragraph)}</p>`).join('')}`).join('')}</div></details>`;
}

export function libraryPage(entries:LibraryEntryData[]):string{
 const categories=[...new Set(entries.map(entry=>entry.category))];
 const desktopToc=categories.map(category=>`<section><h3>${escapeHtml(category)}</h3><ol>${entries.filter(entry=>entry.category===category).map(entry=>`<li><a href="#${escapeHtml(entry.id)}">${escapeHtml(entry.title)}</a></li>`).join('')}</ol></section>`).join('');
 const mobileToc=entries.map(entry=>`<li><a href="#${escapeHtml(entry.id)}">${escapeHtml(entry.title)}</a></li>`).join('');
 return`<article class="library-page"><header class="library-hero library-hero--compact"><p class="eyebrow">04 · REMEMBRANCE ARCHIVE</p><h1>歌耳巴尼帕耳图书馆藏</h1></header><div class="library-shell"><aside class="library-sidebar" aria-label="馆藏目录"><div class="library-sidebar__inner"><h2>篇章目录</h2>${desktopToc}</div></aside><div class="library-main"><details class="library-mobile-toc"><summary>查看篇章目录</summary><nav aria-label="移动端馆藏目录"><ol>${mobileToc}</ol></nav></details><div class="library-toolbar" aria-label="馆藏展开控制"><button type="button" data-library-open-all>全部展开</button><button type="button" data-library-close-all>全部收起</button><span aria-live="polite" data-library-status></span></div><div class="library-entry-list">${entries.map(libraryEntryMarkup).join('')}</div></div></div></article>`;
}
