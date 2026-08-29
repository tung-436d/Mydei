import{readFileSync}from'node:fs';import{resolve}from'node:path';import{defineConfig,type Plugin}from'vite';
import{assets,builds,eidolons,gallery,libraryEntries,rotations,skills,stats,story,teams,traces}from'./Mydei/src/content';
import{validateContent}from'./Mydei/src/content/validate';
import{buildsMarkup,eidolonsMarkup,galleryMarkup,profileMarkup,rotationsMarkup,skillsMarkup,storyMarkup,teamsMarkup,tracesMarkup}from'./Mydei/src/render';
import{documentMarkup,siteFooter,siteHeader}from'./Mydei/src/render/layout';import{libraryPage}from'./Mydei/src/render/library-page';import{notFoundPage}from'./Mydei/src/render/pages';

const contentBundle={assets,stats,skills,traces,eidolons,builds,teams,rotations,gallery,library:libraryEntries};
function contentIntegrity():Plugin{return{name:'mydei-content-integrity',buildStart(){const issues=validateContent(contentBundle);if(issues.length)throw new Error(`Content validation failed:\n${issues.map(issue=>`${issue.code} ${issue.path}: ${issue.message}`).join('\n')}`)}}}

const libraryDocument=documentMarkup({title:'歌耳巴尼帕耳图书馆藏｜万敌',description:'以深色高对比阅读界面浏览万敌专题站馆藏全文。',body:libraryPage(libraryEntries),base:'../',active:'library',canonical:'./',script:'../src/library.ts'});
const notFoundDocument=documentMarkup({title:'页面未找到｜万敌',description:'请求的页面不存在。',body:notFoundPage(),base:'./',active:'home',canonical:'./404.html',script:'./src/app.ts'});
const redirects=new Map<string,string>([
 ['/index.html','/'],['/HomePage/homepage.html','/#overview'],['/About/about.html','/library/#golden-honeycake'],['/About/Library/library.html','/library/'],['/About/Record/record.html','/#rotation'],['/About/index.html','/#site-info'],['/about/','/#site-info'],
]);
const removed=new Set(['/ChangeLog/changelog.html','/ChangeLog/index.html','/changelog/','/sources/index.html','/sources/']);
const publicRoutes=new Set(['/','/library/','/library/index.html']);

function applyRouteRules(pathname:string,response:{statusCode:number;setHeader(name:string,value:string):void;end(body?:string):void},notFoundBody=()=>notFoundDocument):boolean{const target=redirects.get(pathname);if(target){response.statusCode=301;response.setHeader('Location',target);response.setHeader('Cache-Control','no-store');response.end();return true}if(removed.has(pathname)||pathname==='/404.html'){response.statusCode=404;response.setHeader('Content-Type','text/html; charset=utf-8');response.end(notFoundBody());return true}const looksLikePage=pathname.endsWith('.html')||(!pathname.includes('.')&&!pathname.startsWith('/@')&&!pathname.startsWith('/src/')&&!pathname.startsWith('/images/')&&!pathname.startsWith('/assets/'));if(looksLikePage&&!publicRoutes.has(pathname)){response.statusCode=404;response.setHeader('Content-Type','text/html; charset=utf-8');response.end(notFoundBody());return true}return false}

function staticContent():Plugin{return{name:'mydei-static-content',configureServer(server){server.middlewares.use(async(request,response,next)=>{const pathname=request.url?.split('?')[0]??'/';if(applyRouteRules(pathname,response))return;if(pathname==='/library/'){const html=await server.transformIndexHtml(pathname,libraryDocument);response.statusCode=200;response.setHeader('Content-Type','text/html; charset=utf-8');response.end(html);return}next()})},configurePreviewServer(server){server.middlewares.use((request,response,next)=>{const pathname=request.url?.split('?')[0]??'/';if(applyRouteRules(pathname,response,()=>readFileSync(resolve(root,'../dist/404.html'),'utf8')))return;next()})},transformIndexHtml:{order:'pre',handler(html,ctx){if(ctx.path==='/library/index.html')return libraryDocument;if(ctx.path==='/404.html')return notFoundDocument;if(ctx.path!=='/index.html')return html;return html.replace('<!--SITE_HEADER-->',siteHeader('./','home')).replace('<!--PROFILE-->',profileMarkup(stats)).replace('<!--SKILLS-->',skillsMarkup(skills)).replace('<!--TRACES-->',tracesMarkup(traces)).replace('<!--EIDOLONS-->',eidolonsMarkup(eidolons)).replace('<!--BUILDS-->',buildsMarkup(builds)).replace('<!--TEAMS-->',teamsMarkup(teams)).replace('<!--ROTATION-->',rotationsMarkup(rotations)).replace('<!--STORY-->',storyMarkup(story)).replace('<!--GALLERY-->',galleryMarkup(gallery,assets)).replace('<!--SITE_FOOTER-->',siteFooter('./'))}}}}

function canonicalMetadata():Plugin{return{name:'mydei-canonical-metadata',transformIndexHtml:{order:'post',handler(html,ctx){const href=ctx.path==='/404.html'?'./404.html':'./';return html.replace('__CANONICAL__','<link rel="canonical" href="'+href+'">')}}}}

const root=resolve(import.meta.dirname,'Mydei');const inputs=['index.html','library/index.html','404.html'].map(file=>resolve(root,file));
export default defineConfig({root,base:'./',plugins:[contentIntegrity(),staticContent(),canonicalMetadata()],build:{target:'es2022',outDir:'../dist',emptyOutDir:true,rollupOptions:{input:inputs}}});
