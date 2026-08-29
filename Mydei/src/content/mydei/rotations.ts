import type{CombatRotation}from'../../models/content';
export const rotations:CombatRotation[]=[{id:'blood-feud-cycle',title:'血仇循环',prerequisites:['通过损失生命值积攒天赋充能。'],steps:[
 {id:'consume-hp',action:'施放战技消耗生命值',result:'造成扩散伤害并积攒天赋充能。'},
 {id:'enter-feud',action:'充能达到 100 点进入「血仇」',result:'回复生命值、行动提前，并提高生命上限。'},
 {id:'auto-skill',action:'血仇回合自动施放「弑王成王」',result:'继续消耗生命并造成扩散伤害。'},
 {id:'enhanced-turn',action:'充能达到 150 点触发额外回合',result:'自动施放「弑神登神」；技能期间无法积攒充能。'},
],exceptions:['血仇期间受到致命攻击时不会陷入无法战斗状态，但会清空充能、退出血仇并回复生命值。']}];
