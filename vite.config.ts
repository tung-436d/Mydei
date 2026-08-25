import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { builds, eidolons, gallery, profile, rotation, skills, traces } from './Mydei/src/content';
import { archiveMarkup, emptyStateMarkup } from './Mydei/src/render';

const profileMarkup=()=>profile.length?profile.map(field=>`<div><dt>${field.label}</dt><dd>${field.value}<span class="status">${field.status}</span></dd></div>`).join(''):emptyStateMarkup('暂无角色资料');
const buildMarkup=()=>builds.length?builds.map(group=>`<article class="build-card"><span class="icon" aria-hidden="true">${group.marker}</span><h3>${group.title}</h3><ul>${group.items.map(item=>`<li>${item}</li>`).join('')}</ul></article>`).join(''):emptyStateMarkup('暂无培养建议');
const rotationMarkup=()=>rotation.length?rotation.map(step=>`<li><div><strong>${step.title}</strong><span>${step.detail}</span></div></li>`).join(''):emptyStateMarkup('暂无输出循环');
const galleryMarkup=()=>gallery.length?gallery.map(item=>`<figure class="gallery-item"><a href="${item.src}" aria-label="打开原图：${item.caption}"><img src="${item.thumbnail??item.src}" alt="${item.alt}" width="600" height="878" loading="lazy" style="object-position:${item.position??'center'}"><figcaption>${item.caption}</figcaption></a></figure>`).join(''):emptyStateMarkup('暂无画廊图片');

function staticContent():Plugin{return{name:'mydei-static-content',transformIndexHtml(html,ctx){if(ctx.path!=='/index.html')return html;return html.replace('<!--PROFILE-->',profileMarkup()).replace('<!--SKILLS-->',archiveMarkup(skills)).replace('<!--TRACES-->',archiveMarkup(traces)).replace('<!--EIDOLONS-->',archiveMarkup(eidolons)).replace('<!--BUILDS-->',buildMarkup()).replace('<!--ROTATION-->',rotationMarkup()).replace('<!--GALLERY-->',galleryMarkup())}}}

const root=resolve(import.meta.dirname,'Mydei');
export default defineConfig({root,base:'./',plugins:[staticContent()],build:{target:'es2022',rollupOptions:{input:[resolve(root,'index.html'),resolve(root,'HomePage/homepage.html'),resolve(root,'About/about.html'),resolve(root,'About/Library/library.html'),resolve(root,'About/Record/record.html'),resolve(root,'ChangeLog/changelog.html')]}}});
