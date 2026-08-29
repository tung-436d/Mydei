import type{TraceGraph}from'../../models/content';
const node=(id:string,name:string,description:string)=>({id,name,nodeKind:'stat' as const,description:[description],prerequisiteIds:[]});
export const traces:TraceGraph={nodes:[node('crit-damage','暴击伤害加成','行迹累计提供暴击伤害 37.3%。'),node('hp','生命值上限加成','行迹累计提供生命值上限 18%。'),node('speed','速度加成','行迹累计提供速度 5。')]};
