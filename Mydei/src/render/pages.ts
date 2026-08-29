import type{AssetRef,DisplayValue,Eidolon,GalleryItem,LoreEvent,ProfileField,Skill,SkillCategory,TraceGraph}from'../models/content';
import{eidolonsMarkup,escapeHtml,galleryMarkup,profileMarkup,skillsMarkup,storyMarkup,tracesMarkup}from'../render';

const heading=(index:string,kicker:string,title:string,description:string)=>
 `<header class="page-heading"><p class="eyebrow">${index} · ${kicker}</p><h1>${title}</h1><p>${description}</p></header>`;

export function homePage():string{
 return`<section class="hero" aria-labelledby="hero-title"><div class="hero-text"><p class="eyebrow">THE CROWN OF STRIFE · 角色专题</p><h1 id="hero-title"><span>万敌</span><small>MYDEIMOS</small></h1><blockquote>不死的迈德漠斯，离群的狮子，逐猎「纷争」火种的黄金裔。</blockquote><div class="hero-actions"><a class="button primary" href="./profile/">查看角色档案</a><a class="button ghost" href="./skills/">查看技能</a></div></div><div class="hero-art"><picture><source media="(max-width:768px)" srcset="./images/img_mydei-768.webp"><img src="./images/img_mydei-1280.webp" alt="万敌手持长枪立于战场，身后是红色战旗与士兵" width="1280" height="1280" fetchpriority="high"></picture><span class="hero-seal">纷争<br>不死</span></div></section>`;
}

export function profilePage(stats:ProfileField[],ascension:DisplayValue[],traces:TraceGraph,story:LoreEvent[]):string{
 return`<article class="content-page">${heading('01','CHARACTER FILE','角色档案','浏览万敌已确认的身份、属性、晋阶、行迹与角色介绍。')}<section class="profile-intro"><div class="portrait-card"><img src="../assets/mydei/character/mydei-poster.webp" alt="万敌角色立绘" width="2048" height="2048" loading="eager" fetchpriority="high"></div><div><p class="eyebrow">MYDEIMOS · THE CROWN OF STRIFE</p><blockquote>不死的迈德漠斯，离群的狮子，逐猎「纷争」火种的黄金裔。</blockquote></div></section><section class="page-section" id="stats"><h2>基础资料与属性</h2><dl class="stat-grid">${profileMarkup(stats)}</dl></section><section class="page-section" id="ascension"><h2>晋阶材料</h2><dl class="material-grid">${ascension.map(item=>`<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join('')}</dl></section><section class="page-section" id="traces"><h2>行迹总属性</h2><div class="archive-grid">${tracesMarkup(traces)}</div></section><section class="page-section story-copy" id="story"><h2>角色故事</h2>${storyMarkup(story)}</section></article>`;
}

const categoryMeta:Record<SkillCategory,[string,string]>={
 basic:['普攻','基础攻击'],skill:['战技','战技与强化形态'],ultimate:['终结技','终结技'],talent:['天赋','核心天赋'],technique:['秘技','秘技'],'bonus-ability':['附加能力','附加能力'],
};

export function skillsPage(entries:Skill[]):string{
 const order=Object.keys(categoryMeta)as SkillCategory[];
 const sections=order.map(category=>{
  const items=entries.filter(item=>item.category===category);
  if(category==='skill')return`<section class="page-section skill-group" aria-labelledby="skill-group-title"><h2 id="skill-group-title">${categoryMeta[category][1]}</h2><div class="archive-grid">${skillsMarkup(items)}</div></section>`;
  const anchor=category==='bonus-ability'?'bonus-abilities':category;
  const cards=items.map(item=>({...item,id:item.id===anchor?`${item.id}-card`:item.id}));
  return`<section class="page-section skill-group" id="${anchor}" aria-labelledby="${anchor}-title"><h2 id="${anchor}-title">${categoryMeta[category][1]}</h2><div class="archive-grid">${skillsMarkup(cards)}</div></section>`;
 }).join('');
 return`<article class="content-page">${heading('02','COMBAT ARCHIVE','技能','按稳定锚点浏览普攻、战技形态、终结技、天赋、秘技和附加能力。')}<nav class="local-nav" aria-label="技能页目录">${order.map(category=>`<a href="#${category==='bonus-ability'?'bonus-abilities':category}">${categoryMeta[category][0]}</a>`).join('')}</nav>${sections}</article>`;
}

export function eidolonsPage(entries:Eidolon[]):string{
 return`<article class="content-page">${heading('03','EIDOLON ARCHIVE','星魂','六阶星魂以本地图标与静态图片呈现，断网时仍可阅读完整说明。')}<nav class="local-nav" aria-label="星魂页目录">${entries.map(entry=>`<a href="#${entry.id}">E${entry.level}</a>`).join('')}</nav><div class="eidolon-list">${eidolonsMarkup(entries,'../')}</div></article>`;
}

export function galleryPage(entries:GalleryItem[],assets:AssetRef[]):string{
 return`<article class="content-page">${heading('05','GALLERY','图集','浏览站内已有的四项万敌视觉素材。')}<div class="gallery">${galleryMarkup(entries,assets,'../')}</div></article><dialog class="lightbox" data-lightbox aria-label="图集大图预览"><button type="button" data-lightbox-close aria-label="关闭预览">×</button><img data-lightbox-image alt=""><p data-lightbox-caption></p></dialog>`;
}

export function notFoundPage():string{
 return`<article class="content-page not-found"><header><p class="eyebrow">404 · LOST RECORD</p><h1>404</h1><p>你访问的地址不存在，或已随新版专题迁移。</p><p><a class="button primary" href="./">返回专题首页</a> <a class="button ghost" href="./library/">浏览馆藏</a></p></header></article>`;
}
