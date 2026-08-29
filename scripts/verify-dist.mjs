import{readFile,readdir}from'node:fs/promises';import{resolve,relative}from'node:path';import process from'node:process';

const root=process.cwd(),dist=resolve(root,'dist'),source=resolve(root,'Mydei','src');
const walk=async directory=>(await readdir(directory,{withFileTypes:true})).flatMap(entry=>entry.isDirectory()?[]:[resolve(directory,entry.name)]).concat(...await Promise.all((await readdir(directory,{withFileTypes:true})).filter(entry=>entry.isDirectory()).map(entry=>walk(resolve(directory,entry.name)))));
const files=await walk(dist),html=files.filter(file=>file.endsWith('.html')).map(file=>relative(dist,file).replaceAll('\\','/')).sort();
const expected=['404.html','index.html','library/index.html'];if(JSON.stringify(html)!==JSON.stringify(expected))throw new Error(`Unexpected HTML output: ${html.join(', ')}`);
const blocked=['内容审核中','授权待确认','核验后发布','待确认','待核验','待补充','审核中','勘误','SourceRef','AuthorRef','ContentMeta','sourceIds','authorIds','reviewedAt','authorizationStatus','contentReviewState','sourceNoticeMarkup'];
const textFiles=(await Promise.all([walk(source),walk(dist)])).flat().filter(file=>/\.(?:ts|js|css|html)$/.test(file));for(const file of textFiles){const content=await readFile(file,'utf8');for(const token of blocked)if(content.includes(token))throw new Error(`${relative(root,file)} contains retired token: ${token}`)}
process.stdout.write(`Verified ${html.length} HTML entries and ${textFiles.length} text artifacts.\n`);
