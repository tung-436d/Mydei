import{resolve}from'node:path';import{defineConfig,type Plugin}from'vite';
import{assets,authors,builds,eidolons,gallery,release,rotations,skills,sources,stats,teams,traces}from'./Mydei/src/content';
import{validateContent}from'./Mydei/src/content/validate';
import{buildsMarkup,eidolonsMarkup,galleryMarkup,profileMarkup,rotationsMarkup,skillsMarkup,sourceNoticeMarkup,tracesMarkup}from'./Mydei/src/render';
const contentBundle={release,sources,authors,assets,stats,traces,eidolons,builds,teams,gallery};
function contentGuard():Plugin{return{name:'mydei-content-guard',buildStart(){const issues=validateContent(contentBundle);if(issues.length)throw new Error(`Content validation failed:\n${issues.map(issue=>`${issue.code} ${issue.path}: ${issue.message}`).join('\n')}`)}}}
function staticContent():Plugin{return{name:'mydei-static-content',transformIndexHtml(html,ctx){if(ctx.path!=='/index.html')return html;return html.replace('<!--PROFILE-->',profileMarkup(stats)).replace('<!--SKILLS-->',skillsMarkup(skills)).replace('<!--TRACES-->',tracesMarkup(traces)).replace('<!--EIDOLONS-->',eidolonsMarkup(eidolons)).replace('<!--BUILDS-->',buildsMarkup(builds)).replace('<!--ROTATION-->',rotationsMarkup(rotations)).replace('<!--GALLERY-->',galleryMarkup(gallery,assets)).replace('<!--SOURCE_NOTICE-->',sourceNoticeMarkup(sources))}}}
const root=resolve(import.meta.dirname,'Mydei');
export default defineConfig({root,base:'./',plugins:[contentGuard(),staticContent()],build:{target:'es2022',rollupOptions:{input:[resolve(root,'index.html'),resolve(root,'HomePage/homepage.html'),resolve(root,'About/about.html'),resolve(root,'About/Library/library.html'),resolve(root,'About/Record/record.html'),resolve(root,'ChangeLog/changelog.html')]}}});
