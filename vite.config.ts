import{readFileSync}from'node:fs';
import{resolve}from'node:path';
import{defineConfig,type Plugin}from'vite';
import{ascension,assets,characterStories,eidolons,libraryEntries,profileIntroduction,skills,stats,traces}from'./Mydei/src/content';
import{validateContent}from'./Mydei/src/content/validate';
import{documentMarkup}from'./Mydei/src/render/layout';
import{libraryPage}from'./Mydei/src/render/library-page';
import{eidolonsPage,homePage,notFoundPage,profilePage,skillsPage}from'./Mydei/src/render/pages';

const root=resolve(import.meta.dirname,'Mydei');
const contentBundle={assets,stats,skills,traces,eidolons,profileIntroduction,characterStories,library:libraryEntries};
function contentIntegrity():Plugin{return{name:'mydei-content-integrity',buildStart(){const issues=validateContent(contentBundle);if(issues.length)throw new Error(`Content validation failed:\n${issues.map(issue=>`${issue.code} ${issue.path}: ${issue.message}`).join('\n')}`)}}}

const documents=new Map<string,string>([
 ['/index.html',documentMarkup({title:'万敌｜崩坏：星穹铁道角色专题',description:'以万敌为唯一主角的中文玩家专题首页。',body:homePage(),base:'./',active:'home',path:'/',script:'./src/app.ts'})],
 ['/profile/index.html',documentMarkup({title:'角色档案｜万敌',description:'万敌的基础资料、完整角色介绍与角色故事一至四。',body:profilePage(stats,ascension,traces,profileIntroduction,characterStories),base:'../',active:'profile',path:'/profile/',script:'../src/app.ts'})],
 ['/skills/index.html',documentMarkup({title:'技能｜万敌',description:'万敌的普攻、战技形态、终结技、天赋、秘技与附加能力。',body:skillsPage(skills),base:'../',active:'skills',path:'/skills/',script:'../src/app.ts'})],
 ['/eidolons/index.html',documentMarkup({title:'星魂｜万敌',description:'万敌一至六阶星魂的名称、说明与本地静态图片。',body:eidolonsPage(eidolons),base:'../',active:'eidolons',path:'/eidolons/',script:'../src/app.ts'})],
 ['/library/index.html',documentMarkup({title:'歌耳巴尼帕耳图书馆藏｜万敌',description:'以深色高对比阅读界面浏览万敌专题站馆藏全文。',body:libraryPage(libraryEntries),base:'../',active:'library',path:'/library/',script:'../src/library.ts'})],
 ['/404.html',documentMarkup({title:'页面未找到｜万敌',description:'请求的页面不存在。',body:notFoundPage(),base:'./',path:'/404.html',script:'./src/app.ts'})],
]);

const redirects=new Map<string,string>([
 ['/index.html','/'],['/HomePage/homepage.html','/'],['/About/about.html','/library/#golden-honeycake'],['/About/Library/library.html','/library/'],['/About/index.html','/profile/#site-info'],['/about/','/profile/#site-info'],
]);
const removed=new Set(['/About/Record/record.html','/ChangeLog/changelog.html','/ChangeLog/index.html','/changelog/','/sources/index.html','/sources/','/builds/','/guides/','/teams/','/rotation/','/gallery/','/gallery/index.html']);
const cleanRoutes=new Map<string,string>([['/','/index.html'],['/profile/','/profile/index.html'],['/skills/','/skills/index.html'],['/eidolons/','/eidolons/index.html'],['/library/','/library/index.html']]);
const publicRoutes=new Set([...cleanRoutes.keys(),...documents.keys()]);

type RouteResponse={statusCode:number;setHeader(name:string,value:string):void;end(body?:string):void};
function applyRouteRules(pathname:string,response:RouteResponse,notFoundBody=()=>documents.get('/404.html')??''):boolean{
 const target=redirects.get(pathname);
 if(target){response.statusCode=301;response.setHeader('Location',target);response.setHeader('Cache-Control','no-store');response.end();return true}
 if(removed.has(pathname)||pathname==='/404.html'){response.statusCode=404;response.setHeader('Content-Type','text/html; charset=utf-8');response.end(notFoundBody());return true}
 const looksLikePage=pathname.endsWith('.html')||(!pathname.includes('.')&&!pathname.startsWith('/@')&&!pathname.startsWith('/src/')&&!pathname.startsWith('/images/')&&!pathname.startsWith('/assets/'));
 if(looksLikePage&&!publicRoutes.has(pathname)){response.statusCode=404;response.setHeader('Content-Type','text/html; charset=utf-8');response.end(notFoundBody());return true}
 return false;
}

function staticContent():Plugin{return{
 name:'mydei-static-content',
 configureServer(server){server.middlewares.use(async(request,response,next)=>{const pathname=request.url?.split('?')[0]??'/';if(applyRouteRules(pathname,response))return;const documentPath=cleanRoutes.get(pathname);if(documentPath){const html=documents.get(documentPath);if(html){const transformed=await server.transformIndexHtml(pathname,html);response.statusCode=200;response.setHeader('Content-Type','text/html; charset=utf-8');response.end(transformed);return}}next()})},
 configurePreviewServer(server){server.middlewares.use((request,response,next)=>{const pathname=request.url?.split('?')[0]??'/';if(applyRouteRules(pathname,response,()=>readFileSync(resolve(root,'../dist/404.html'),'utf8')))return;next()})},
 transformIndexHtml:{order:'pre',handler(html,ctx){return documents.get(ctx.path)??html}},
}}

const inputs=['index.html','profile/index.html','skills/index.html','eidolons/index.html','library/index.html','404.html'].map(file=>resolve(root,file));
export default defineConfig({root,base:'./',plugins:[contentIntegrity(),staticContent()],build:{target:'es2022',outDir:'../dist',emptyOutDir:true,rollupOptions:{input:inputs}}});
