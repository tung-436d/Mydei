import type{TeamComposition}from'../../models/content';import{recommendationMeta}from'./meta';
export const teams:TeamComposition[]=[{...recommendationMeta,id:'general-team',title:'万敌通用配队',useCase:'围绕万敌构建拉条、增益或减防与生存位。',slots:[
 {id:'main',role:'主输出',primaryCharacterId:'万敌',alternativeCharacterIds:[],rationale:['万敌']},
 {id:'advance',role:'行动提前辅助',alternativeCharacterIds:['星期日','开拓者·记忆','布洛妮娅','花火'],rationale:['星期日 / 开拓者·记忆 / 布洛妮娅 / 花火']},
 {id:'support',role:'光环或减益辅助',alternativeCharacterIds:['缇宝','阮·梅','椒丘','佩拉'],rationale:['缇宝 / 阮·梅 / 椒丘 / 佩拉']},
 {id:'sustain',role:'生存位',alternativeCharacterIds:['藿藿','罗刹','加拉赫'],rationale:['藿藿 / 罗刹 / 加拉赫']},
],notes:['阵容选项来自产品方提供的米游社词条。'] }];
