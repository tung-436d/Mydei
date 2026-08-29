import{readFile,readdir,stat}from'node:fs/promises';
import{resolve,relative}from'node:path';
import process from'node:process';

const root=process.cwd(),dist=resolve(root,'dist'),source=resolve(root,'Mydei','src');
const walk=async directory=>(await readdir(directory,{withFileTypes:true})).flatMap(entry=>entry.isDirectory()?[]:[resolve(directory,entry.name)]).concat(...await Promise.all((await readdir(directory,{withFileTypes:true})).filter(entry=>entry.isDirectory()).map(entry=>walk(resolve(directory,entry.name)))));
const files=await walk(dist),html=files.filter(file=>file.endsWith('.html')).map(file=>relative(dist,file).replaceAll('\\','/')).sort();
const expected=['404.html','eidolons/index.html','index.html','library/index.html','profile/index.html','skills/index.html'];
if(JSON.stringify(html)!==JSON.stringify(expected))throw new Error(`Unexpected HTML output: ${html.join(', ')}`);

for(const file of ['_redirects','robots.txt','sitemap.xml'])if(!files.includes(resolve(dist,file)))throw new Error(`Missing Cloudflare/SEO artifact: ${file}`);
const favicon=await stat(resolve(dist,'favicon.ico'));if(favicon.size<=0)throw new Error('Missing or empty favicon.ico');
const sitemap=await readFile(resolve(dist,'sitemap.xml'),'utf8');
for(const path of ['/','/profile/','/skills/','/eidolons/','/library/'])if(!sitemap.includes(`<loc>https://mydeimos.love${path}</loc>`))throw new Error(`Sitemap missing ${path}`);
if(sitemap.includes('/gallery/'))throw new Error('Sitemap still contains the retired gallery route');

const media=[];for(let level=1;level<=6;level++){const id=String(level).padStart(2,'0');media.push(`assets/mydei/eidolons/eidolon-${id}-icon.webp`,`assets/mydei/eidolons/eidolon-${id}.webp`)}
for(const path of media){const info=await stat(resolve(dist,path));if(info.size<=0)throw new Error(`Empty media file: ${path}`)}

const blocked=['内容审核中','授权待确认','核验后发布','待确认','待核验','待补充','审核中','勘误','推荐配装','光锥推荐','遗器推荐','词条建议','玩法建议','培养建议','配队建议','BuildRecommendation','TeamComposition','CombatRotation','sourceNoticeMarkup'];
const textFiles=(await Promise.all([walk(source),walk(dist)])).flat().filter(file=>/\.(?:ts|js|css|html)$/.test(file));
for(const file of textFiles){const content=await readFile(file,'utf8');for(const token of blocked)if(content.includes(token))throw new Error(`${relative(root,file)} contains retired token: ${token}`);if(/<(?:img|video|source)[^>]+(?:src|srcset)=["'](?:https?:)?\/\//i.test(content))throw new Error(`${relative(root,file)} contains remote media hotlink`)}
for(const file of html){const content=await readFile(resolve(dist,file),'utf8');if(!content.includes('<link rel="icon" href="/favicon.ico" type="image/x-icon">'))throw new Error(`${file} missing the shared favicon`);if(!content.includes('本站为万敌厨创作的非官方网站。'))throw new Error(`${file} missing disclaimer`);if(content.includes('>图集<')||content.includes('>画廊<'))throw new Error(`${file} still contains a gallery entry`)}
process.stdout.write(`Verified ${html.length} HTML entries, shared favicon, ${media.length} local eidolon assets, Cloudflare routes, SEO files, and ${textFiles.length} text artifacts.\n`);
