import type{AssetRef,Eidolon,GalleryItem,LibraryEntryData,ProfileField,Skill,TraceGraph}from'../models/content';

export interface ContentBundle{assets:AssetRef[];stats:ProfileField[];skills:Skill[];traces:TraceGraph;eidolons:Eidolon[];gallery:GalleryItem[];library:LibraryEntryData[]}
export interface ValidationIssue{code:string;path:string;message:string}

const duplicates=(ids:string[]):string[]=>ids.filter((id,index)=>ids.indexOf(id)!==index);
const required=(value:string,path:string,issues:ValidationIssue[])=>{if(!value.trim())issues.push({code:'REQUIRED_TEXT',path,message:'必填文本不能为空'})};

export function validateContent(bundle:ContentBundle):ValidationIssue[]{
 const issues:ValidationIssue[]=[],assetIds=new Set(bundle.assets.map(item=>item.id));
 duplicates(bundle.assets.map(item=>item.id)).forEach(id=>issues.push({code:'DUPLICATE_ASSET',path:'assets',message:`重复 ID：${id}`}));
 bundle.assets.forEach((asset,index)=>{const path=`assets.${index}`;if(asset.usage!=='decorative')required(asset.alt,`${path}.alt`,issues);if(asset.width<=0||asset.height<=0)issues.push({code:'ASSET_SIZE',path,message:'图片尺寸必须大于零'})});
 bundle.stats.forEach((field,index)=>{required(field.label,`stats.${index}.label`,issues);required(field.value,`stats.${index}.value`,issues)});
 duplicates(bundle.skills.map(item=>item.id)).forEach(id=>issues.push({code:'DUPLICATE_SKILL',path:'skills',message:`重复 ID：${id}`}));
 bundle.skills.forEach((skill,index)=>{required(skill.name,`skills.${index}.name`,issues);if(!skill.description.length)issues.push({code:'SKILL_DESCRIPTION',path:`skills.${index}`,message:'技能描述不能为空'})});
 const traceIds=new Set(bundle.traces.nodes.map(node=>node.id));duplicates(bundle.traces.nodes.map(node=>node.id)).forEach(id=>issues.push({code:'DUPLICATE_TRACE',path:'traces',message:`重复 ID：${id}`}));
 bundle.traces.nodes.forEach((node,index)=>node.prerequisiteIds.filter(id=>!traceIds.has(id)).forEach(id=>issues.push({code:'TRACE_REF',path:`traces.${index}`,message:`前置行迹 ${id} 不存在`})));
 const visiting=new Set<string>(),visited=new Set<string>(),nodes=new Map(bundle.traces.nodes.map(node=>[node.id,node]));const visit=(id:string)=>{if(visiting.has(id)){issues.push({code:'TRACE_CYCLE',path:`traces.${id}`,message:'行迹依赖存在环'});return}if(visited.has(id))return;visiting.add(id);nodes.get(id)?.prerequisiteIds.forEach(visit);visiting.delete(id);visited.add(id)};nodes.forEach((_,id)=>visit(id));
 duplicates(bundle.eidolons.map(item=>String(item.level))).forEach(level=>issues.push({code:'DUPLICATE_EIDOLON',path:'eidolons',message:`星魂等级重复：${level}`}));
 if(bundle.eidolons.length!==6||bundle.eidolons.some((item,index)=>item.level!==index+1||item.id!==`eidolon-0${index+1}`))issues.push({code:'EIDOLON_SEQUENCE',path:'eidolons',message:'星魂必须按 E1–E6 完整排列'});
 bundle.eidolons.forEach((entry,index)=>{for(const[key,media]of Object.entries(entry.media)){required(media.alt,`eidolons.${index}.media.${key}.alt`,issues);if(!media.path.startsWith('assets/')||/^(?:https?:)?\/\/|data:|[?#]/i.test(media.path))issues.push({code:'LOCAL_MEDIA_PATH',path:`eidolons.${index}.media.${key}.path`,message:'媒体路径必须是无协议、域名和查询参数的 assets/ 相对路径'});if(media.width<=0||media.height<=0||media.byteSize<=0)issues.push({code:'LOCAL_MEDIA_SIZE',path:`eidolons.${index}.media.${key}`,message:'媒体尺寸和字节数必须大于零'})}});
 bundle.gallery.forEach((item,index)=>{if(!assetIds.has(item.assetId))issues.push({code:'ASSET_REF',path:`gallery.${index}`,message:`素材 ${item.assetId} 不存在`});required(item.caption,`gallery.${index}.caption`,issues)});
 duplicates(bundle.library.map(item=>item.id)).forEach(id=>issues.push({code:'DUPLICATE_LIBRARY_ENTRY',path:'library',message:`重复 ID：${id}`}));
 bundle.library.forEach((entry,index)=>{required(entry.title,`library.${index}.title`,issues);required(entry.summary,`library.${index}.summary`,issues);if(!entry.sections.length||entry.sections.every(section=>section.paragraphs.length===0))issues.push({code:'LIBRARY_BODY',path:`library.${index}`,message:'馆藏正文不能为空'})});
 return issues;
}
