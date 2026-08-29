import type{Eidolon,EidolonLevel,LocalMediaAsset}from'../../models/content';

const rows:[EidolonLevel,string,string,number,number][]=[
 [1,'寒风雕琢不屈的脊梁','【弑神登神】对主目标造成的伤害倍率提高30%，且变成对敌方全体造成等同于主目标伤害倍率的虚数属性伤害。',10462,209034],
 [2,'纷争见证尸骸的喉鸣','【血仇】状态期间，万敌造成的伤害无视敌方目标15%的防御力，且受到治疗时会将40%的治疗数值转化为充能，累计转化的充能不超过40点。任意单位行动后重置可累计的充能。',9182,170260],
 [3,'荣耀辉映不渝的筵宴','战技等级+2，最多不超过15级；普攻等级+1，最多不超过10级。',9514,290754],
 [4,'号角惊觉缄默的狂狮','【血仇】状态期间暴击伤害提高30%，且受到来自敌方目标的攻击后回复等同于自身10%生命上限的生命值。',8564,325468],
 [5,'兵戈雕刻躯身的烈焰','终结技等级+2，最多不超过15级；天赋等级+2，最多不超过15级。',10048,276128],
 [6,'往日攀陟沉积的血山','进入战斗时立刻进入【血仇】状态且【弑神登神】所需的充能值降低至100点。',10616,208482],
];

const media=(level:EidolonLevel,name:string,iconBytes:number,posterBytes:number)=>{
 const id=String(level).padStart(2,'0');
 const icon:LocalMediaAsset={path:`assets/mydei/eidolons/eidolon-${id}-icon.webp`,mimeType:'image/webp',width:128,height:128,byteSize:iconBytes,alt:`万敌第${level}星魂「${name}」图标`};
 const poster:LocalMediaAsset={path:`assets/mydei/eidolons/eidolon-${id}.webp`,mimeType:'image/webp',width:2048,height:2048,byteSize:posterBytes,alt:`万敌第${level}星魂「${name}」静态图片`};
 return{icon,poster};
};

export const eidolons:Eidolon[]=rows.map(([level,name,description,iconBytes,posterBytes])=>({id:`eidolon-${String(level).padStart(2,'0')}`as Eidolon['id'],level,name,description:[description],media:media(level,name,iconBytes,posterBytes)}));
