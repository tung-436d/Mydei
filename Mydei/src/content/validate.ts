import type{AssetRef,AuthorRef,BuildRecommendation,ContentMeta,Eidolon,GalleryItem,ProfileField,ReleaseInfo,SourceRef,TeamComposition,TraceGraph}from'../models/content';

export interface ContentBundle{release:ReleaseInfo;sources:SourceRef[];authors:AuthorRef[];assets:AssetRef[];stats:ProfileField[];traces:TraceGraph;eidolons:Eidolon[];builds:BuildRecommendation[];teams:TeamComposition[];gallery:GalleryItem[]}
export interface ValidationIssue{code:string;path:string;message:string}
const numericClaim=/\d+(?:[.,]\d+)?\s*(?:%|点|级|层|回合|秒|生命|攻击|防御|速度)/;

function duplicates(ids:string[]):string[]{return ids.filter((id,index)=>ids.indexOf(id)!==index)}
function validateMeta(meta:ContentMeta,path:string,sourceIds:Set<string>,authorIds:Set<string>,buildDate:string,issues:ValidationIssue[]){
 if(!meta.reviewedAt)issues.push({code:'META_REVIEW_DATE',path,message:'缺少复核日期'});
 if(meta.reviewedAt>buildDate)issues.push({code:'META_FUTURE_REVIEW',path,message:'复核日期晚于构建日期'});
 meta.sourceIds.filter(id=>!sourceIds.has(id)).forEach(id=>issues.push({code:'SOURCE_REF',path,message:`来源 ${id} 不存在`}));
 meta.authorIds.filter(id=>!authorIds.has(id)).forEach(id=>issues.push({code:'AUTHOR_REF',path,message:`作者 ${id} 不存在`}));
 if(meta.kind==='official'&&meta.sourceIds.length===0)issues.push({code:'OFFICIAL_SOURCE',path,message:'官方信息必须有来源'});
 if((meta.kind==='recommendation'||meta.kind==='original')&&meta.authorIds.length===0)issues.push({code:'CONTENT_AUTHOR',path,message:'建议或原创内容必须有作者'});
 if(meta.kind==='recommendation'&&meta.applicableVersions.length===0)issues.push({code:'CONTENT_VERSION',path,message:'玩法建议必须声明适用版本'});
}

export function validateContent(bundle:ContentBundle):ValidationIssue[]{
 const issues:ValidationIssue[]=[],sourceIds=new Set(bundle.sources.map(item=>item.id)),authorIds=new Set(bundle.authors.map(item=>item.id)),assetIds=new Set(bundle.assets.map(item=>item.id));
 duplicates(bundle.sources.map(item=>item.id)).forEach(id=>issues.push({code:'DUPLICATE_SOURCE',path:'sources',message:`重复 ID：${id}`}));
 duplicates(bundle.authors.map(item=>item.id)).forEach(id=>issues.push({code:'DUPLICATE_AUTHOR',path:'authors',message:`重复 ID：${id}`}));
 duplicates(bundle.assets.map(item=>item.id)).forEach(id=>issues.push({code:'DUPLICATE_ASSET',path:'assets',message:`重复 ID：${id}`}));
 bundle.sources.forEach((source,index)=>{if(!source.accessedAt)issues.push({code:'SOURCE_ACCESS_DATE',path:`sources.${index}`,message:'来源缺少访问日期'});if(source.coveredFieldPaths.length===0)issues.push({code:'SOURCE_COVERAGE',path:`sources.${index}`,message:'来源缺少覆盖字段'});});
 bundle.assets.forEach((asset,index)=>{const path=`assets.${index}`;if(!asset.alt.trim()&&asset.usage!=='decorative')issues.push({code:'ASSET_ALT',path,message:'非装饰图片必须有替代文本'});if(asset.width<=0||asset.height<=0)issues.push({code:'ASSET_SIZE',path,message:'图片尺寸必须大于零'});asset.sourceIds.filter(id=>!sourceIds.has(id)).forEach(id=>issues.push({code:'SOURCE_REF',path,message:`来源 ${id} 不存在`}));});
 bundle.stats.forEach((field,index)=>{validateMeta(field.meta,`stats.${index}`,sourceIds,authorIds,bundle.release.buildDate,issues);if(field.meta.kind==='unconfirmed'&&field.value&&numericClaim.test(field.value))issues.push({code:'UNCONFIRMED_VALUE',path:`stats.${index}`,message:'待确认字段不得包含确定数值'});});
 const traceIds=new Set(bundle.traces.nodes.map(node=>node.id));duplicates(bundle.traces.nodes.map(node=>node.id)).forEach(id=>issues.push({code:'DUPLICATE_TRACE',path:'traces',message:`重复 ID：${id}`}));
 bundle.traces.nodes.forEach((node,index)=>{validateMeta(node,`traces.${index}`,sourceIds,authorIds,bundle.release.buildDate,issues);node.prerequisiteIds.filter(id=>!traceIds.has(id)).forEach(id=>issues.push({code:'TRACE_REF',path:`traces.${index}`,message:`前置行迹 ${id} 不存在`}));});
 const visiting=new Set<string>(),visited=new Set<string>(),nodes=new Map(bundle.traces.nodes.map(node=>[node.id,node]));const visit=(id:string)=>{if(visiting.has(id)){issues.push({code:'TRACE_CYCLE',path:`traces.${id}`,message:'行迹依赖存在环'});return}if(visited.has(id))return;visiting.add(id);nodes.get(id)?.prerequisiteIds.forEach(visit);visiting.delete(id);visited.add(id)};nodes.forEach((_,id)=>visit(id));
 const levels=bundle.eidolons.map(item=>item.level);duplicates(levels.map(String)).forEach(level=>issues.push({code:'DUPLICATE_EIDOLON',path:'eidolons',message:`星魂等级重复：${level}`}));bundle.eidolons.forEach((item,index)=>validateMeta(item,`eidolons.${index}`,sourceIds,authorIds,bundle.release.buildDate,issues));
 bundle.builds.forEach((item,index)=>validateMeta(item,`builds.${index}`,sourceIds,authorIds,bundle.release.buildDate,issues));bundle.teams.forEach((item,index)=>validateMeta(item,`teams.${index}`,sourceIds,authorIds,bundle.release.buildDate,issues));
 bundle.gallery.forEach((item,index)=>{validateMeta(item.meta,`gallery.${index}`,sourceIds,authorIds,bundle.release.buildDate,issues);if(!assetIds.has(item.assetId))issues.push({code:'ASSET_REF',path:`gallery.${index}`,message:`素材 ${item.assetId} 不存在`});});
 return issues;
}
