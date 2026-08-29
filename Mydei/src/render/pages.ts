import type{CharacterProfileContent,CharacterStory,DisplayValue,Eidolon,ProfileField,Skill,SkillCategory,TraceGraph}from'../models/content';
import{characterStoriesMarkup,eidolonsMarkup,escapeHtml,profileIntroductionMarkup,profileMarkup,skillsMarkup,tracesMarkup}from'../render';

const heading=(index:string,kicker:string,title:string,description?:string)=>
 `<header class="page-heading${description?'':' page-heading--compact'}"><p class="eyebrow">${index} · ${kicker}</p><h1>${title}</h1>${description?`<p>${description}</p>`:''}</header>`;

export function homePage():string{
 return`<section class="hero" aria-labelledby="hero-title"><div class="hero-text"><p class="eyebrow">THE CROWN OF STRIFE · 角色专题</p><h1 id="hero-title"><span>万敌</span><small>MYDEIMOS</small></h1><blockquote>不死的迈德漠斯，离群的狮子，逐猎「纷争」火种的黄金裔。</blockquote><div class="hero-actions"><a class="button primary" href="./profile/">查看角色档案</a><a class="button ghost" href="./skills/">查看技能</a></div></div><div class="hero-art"><picture><source media="(max-width:768px)" srcset="./images/img_mydei-768.webp"><img src="./images/img_mydei-1280.webp" alt="万敌手持长枪立于战场，身后是红色战旗与士兵" width="1280" height="1280" fetchpriority="high"></picture></div></section>`;
}

export function profilePage(stats:ProfileField[],ascension:DisplayValue[],traces:TraceGraph,introduction:CharacterProfileContent,stories:CharacterStory[]):string{
 const storyLinks=stories.map(story=>`<a href="#${story.id}"><span>${escapeHtml(story.title)}</span><small>${story.unlockLevel} 级解锁</small></a>`).join('');
 return`<article class="content-page profile-page">${heading('01','CHARACTER FILE','角色档案')}<nav class="local-nav profile-page-nav" aria-label="角色档案目录"><a href="#basic-info">基础资料</a><a href="#introduction">角色介绍</a><a href="#stories">角色故事</a></nav><section class="page-section profile-basics" id="basic-info"><h2>基础资料</h2><div class="profile-intro"><div class="portrait-card"><img src="../assets/mydei/character/mydei-poster.webp" alt="万敌角色立绘" width="2048" height="2048" loading="eager" fetchpriority="high"></div><dl class="stat-grid">${profileMarkup(stats)}</dl></div><div class="profile-subsection" id="ascension"><h3>晋阶材料</h3><dl class="material-grid">${ascension.map(item=>`<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join('')}</dl></div><div class="profile-subsection" id="traces"><h3>行迹总属性</h3><div class="archive-grid">${tracesMarkup(traces)}</div></div></section><section class="page-section profile-introduction" id="introduction"><h2>角色介绍</h2><div class="prose">${profileIntroductionMarkup(introduction)}</div></section><section class="page-section character-stories" id="stories"><h2>角色故事</h2><div class="story-reader"><aside class="story-toc"><nav aria-label="角色故事章节目录">${storyLinks}</nav></aside><div class="story-list">${characterStoriesMarkup(stories)}</div></div></section></article>`;
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
 return`<article class="content-page">${heading('02','COMBAT ARCHIVE','技能')}<nav class="local-nav" aria-label="技能页目录">${order.map(category=>`<a href="#${category==='bonus-ability'?'bonus-abilities':category}">${categoryMeta[category][0]}</a>`).join('')}</nav>${sections}</article>`;
}

export function eidolonsPage(entries:Eidolon[]):string{
 return`<article class="content-page">${heading('03','EIDOLON ARCHIVE','星魂')}<nav class="local-nav" aria-label="星魂页目录">${entries.map(entry=>`<a href="#${entry.id}">E${entry.level}</a>`).join('')}</nav><div class="eidolon-list">${eidolonsMarkup(entries,'../')}</div></article>`;
}

export function notFoundPage():string{
 return`<article class="content-page not-found"><header><p class="eyebrow">404 · LOST RECORD</p><h1>404</h1><p>你访问的地址不存在，或已随新版专题迁移。</p><p><a class="button primary" href="./">返回专题首页</a> <a class="button ghost" href="./library/">浏览馆藏</a></p></header></article>`;
}
