import type{ContentBlock,SourcedValue}from'../../models/content';import{officialMeta,originalMeta}from'./meta';
export const displayName:SourcedValue<string>={value:'万敌',meta:officialMeta};
export const aliases:SourcedValue<string[]>={value:['迈德漠斯','Mydei','Mydeimos'],meta:officialMeta};
export const originalIntroduction:ContentBlock={id:'mydei-original-introduction',paragraphs:['这是一个由玩家整理、以万敌为唯一主角的中文专题站。'],meta:originalMeta};
export const officialSummary:ContentBlock={id:'mydei-official-summary',paragraphs:['不死的迈德漠斯，离群的狮子，逐猎「纷争」火种的黄金裔。你要忍受万死，浴血还乡，孤身背负疯狂的宿命——弑王成王，弑神登神。'],meta:officialMeta};
