import type{TraceGraph}from'../../models/content';import{officialMeta}from'./meta';
const node=(id:string,name:string,description:string)=>({...officialMeta,id,name,nodeKind:'stat' as const,officialDescription:{id:`${id}-description`,paragraphs:[description],meta:officialMeta},prerequisiteIds:[]});
export const traces:TraceGraph={nodes:[node('crit-damage','暴击伤害加成','行迹累计提供暴击伤害 37.3%。'),node('hp','生命值上限加成','行迹累计提供生命值上限 18%。'),node('speed','速度加成','行迹累计提供速度 5。')]};
