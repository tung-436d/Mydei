import{escapeHtml}from'../render';

export type ActivePage='home'|'profile'|'skills'|'eidolons'|'library'|'gallery';
export type FooterVariant='compact'|'full';
const origin='https://mydeimos.love';
const navigation:[ActivePage,string,string][]=[
 ['home','首页',''],['profile','角色档案','profile/'],['skills','技能','skills/'],['eidolons','星魂','eidolons/'],['library','馆藏','library/'],['gallery','图集','gallery/'],
];

export function siteHeader(base:string,active?:ActivePage):string{
 const links=navigation.map(([id,label,path])=>`<a href="${base}${path}"${active===id?' aria-current="page"':''}>${label}</a>`).join('');
 return`<header class="site-header" data-header><nav class="nav-shell" aria-label="主要导航"><a class="brand" href="${base}" aria-label="万敌专题站首页"><span class="brand-mark" aria-hidden="true">M</span><span><strong>万敌</strong><small>MYDEI ARCHIVE</small></span></a><button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-nav-toggle><span class="sr-only">打开导航</span><span></span><span></span></button><div class="nav-links" id="site-nav" data-nav-links>${links}</div></nav></header>`;
}

const disclaimer='<p class="footer-disclaimer"><span>本站为万敌厨创作的非官方网站。</span><span>游戏相关的图像和资产的版权和商标权归 HoYoverse 所有。</span></p>';
export function siteFooter(base:string,variant:FooterVariant='full'):string{
 if(variant==='compact')return`<footer class="site-footer site-footer--compact">${disclaimer}</footer>`;
 const links=navigation.map(([,label,path])=>`<a href="${base}${path}">${label}</a>`).join(' · ');
 return`<footer class="site-footer" id="site-info"><div><a class="brand footer-brand" href="${base}"><span class="brand-mark" aria-hidden="true">M</span><span><strong>万敌</strong><small>MYDEI ARCHIVE</small></span></a><p>由玩家整理、以万敌为唯一主角的中文角色专题站。</p></div><div><h2>站点与联系</h2><p>维护者：tung<br><a href="mailto:tung-favorli@outlook.com">tung-favorli@outlook.com</a><br><a href="https://space.bilibili.com/499407441" target="_blank" rel="noopener noreferrer">Bilibili：YvetteTung</a></p></div><div><h2>快捷入口</h2><p>${links} · <a href="#top">返回顶部</a></p></div>${disclaimer}</footer>`;
}

export function documentMarkup(options:{title:string;description:string;body:string;base:string;active?:ActivePage;path:string;script:string;footerVariant?:FooterVariant;image?:string}):string{
 const canonical=`${origin}${options.path}`,image=options.image??`${origin}/images/img_mydei-1280.webp`;
 return`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0f0d0d"><meta name="description" content="${escapeHtml(options.description)}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(options.title)}"><meta property="og:description" content="${escapeHtml(options.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${escapeHtml(image)}"><meta name="twitter:card" content="summary_large_image"><title>${escapeHtml(options.title)}</title><link rel="stylesheet" href="${options.base}src/styles/site.css"><script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"万敌角色专题站","url":"${origin}/","inLanguage":"zh-CN"}</script></head><body id="top"><a class="skip-link" href="#main-content">跳至主要内容</a>${siteHeader(options.base,options.active)}<main id="main-content">${options.body}</main>${siteFooter(options.base,options.footerVariant)}<script type="module" src="${options.script}"></script></body></html>`;
}
