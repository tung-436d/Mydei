import type{BuildRecommendation}from'../../models/content';import{recommendationMeta}from'./meta';
export const builds:BuildRecommendation[]=[
 {...recommendationMeta,id:'light-cones',title:'光锥推荐',useCase:'来源词条给出的光锥选择与推荐度。',priorities:[],options:[
  {id:'lc-signature',category:'equipment',label:'血火啊，燃烧前路',rank:'preferred',rationale:['来源推荐度：★★★★★']},
  {id:'lc-unreachable',category:'equipment',label:'到不了的彼岸',rank:'alternative',rationale:['来源推荐度：★★★★']},
  {id:'lc-ninja',category:'equipment',label:'忍事录·音律狩猎',rank:'alternative',rationale:['来源推荐度：★★★★']},
  {id:'lc-flames-afar',category:'equipment',label:'在火的远处',rank:'alternative',rationale:['来源推荐度：★★★★']},
 ],caveats:['攻略署名：银河垃圾桶攻略组 / 紫喵Azunya。']},
 {...recommendationMeta,id:'relics',title:'遗器与词条',useCase:'两套来源推荐方案及主、副词条。',priorities:[{label:'副词条',value:'生命 > 暴击 = 暴伤 > 速度'}],options:[
  {id:'relic-a',category:'relic',label:'识海迷坠的学者 4 件套 + 谧宁拾骨地',rank:'preferred',rationale:['来源推荐度：★★★★★','躯干：生命值 / 暴击 / 暴伤；脚部：速度 / 生命值；位面球：虚数伤害提高；连结绳：生命值']},
  {id:'relic-b',category:'relic',label:'宝命长存的莳者 4 件套 + 繁星竞技场',rank:'alternative',rationale:['来源推荐度：★★★★','躯干：生命值 / 暴击 / 暴伤；脚部：速度 / 生命值；位面球：虚数伤害提高；连结绳：生命值']},
 ],caveats:['攻略署名：银河垃圾桶攻略组 / 紫喵Azunya。']},
];
