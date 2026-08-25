export type ContentKind='official'|'recommendation'|'original'|'unconfirmed';
export type ContentStatus='draft'|'verified'|'needs-review'|'archived';
export type SpoilerLevel='none'|'minor'|'major';
export type Locale='zh-CN';
export type EidolonLevel=1|2|3|4|5|6;
export type SkillKind='basic'|'skill'|'ultimate'|'talent'|'technique'|'enhanced'|'other';

export interface SourceRef{id:string;title:string;url?:string;inGameLocation?:string;publisher?:string;sourceType:'in-game'|'official-web'|'official-video'|'guide'|'community';publishedAt?:string;accessedAt:string;applicableVersions:string[];coveredFieldPaths:string[];linkStatus?:'active'|'broken'|'replaced';note?:string}
export interface AuthorRef{id:string;displayName:string;role:'editor'|'reviewer'|'guide-author'|'site-author'}
export interface ContentMeta{kind:ContentKind;status:ContentStatus;applicableVersions:string[];sourceIds:string[];authorIds:string[];reviewedAt:string;locale:Locale;spoilerLevel?:SpoilerLevel;reviewNote?:string}
export interface AssetRef{id:string;src:string;alt:string;width:number;height:number;sourceIds:string[];creatorOrRightsHolder?:string;authorizationStatus:'approved'|'pending'|'rejected';usage:'hero'|'content'|'thumbnail'|'decorative'|'social';focalPoint?:{x:number;y:number};safeCrop?:{top:number;right:number;bottom:number;left:number}}
export interface DisplayValue{label:string;value:string;context?:string}
export interface ContentBlock{id:string;paragraphs:string[];meta:ContentMeta}
export interface SourcedValue<T>{value?:T;meta:ContentMeta}
export interface Skill extends ContentMeta{id:string;skillKind:SkillKind;name:string;officialEffect:ContentBlock;interpretation?:ContentBlock;mechanics:DisplayValue[];scaling?:SkillScaling[];tags:string[]}
export interface SkillScaling{level:string;form?:string;values:DisplayValue[]}
export interface TraceNode extends ContentMeta{id:string;name:string;nodeKind:'major'|'minor'|'stat';officialDescription:ContentBlock;interpretation?:ContentBlock;prerequisiteIds:string[];visualPosition?:{column:number;row:number}}
export interface TraceGraph{nodes:TraceNode[]}
export interface Eidolon extends ContentMeta{id:string;level:EidolonLevel;name:string;officialDescription:ContentBlock;interpretation?:ContentBlock;image?:AssetRef}
export interface BuildOption{id:string;category:'equipment'|'relic'|'ornament'|'stat'|'other';label:string;rank?:'preferred'|'alternative'|'situational';rationale:string[]}
export interface BuildRecommendation extends ContentMeta{id:string;title:string;useCase:string;priorities:DisplayValue[];options:BuildOption[];caveats:string[]}
export interface TeamSlot{id:string;role:string;primaryCharacterId?:string;alternativeCharacterIds:string[];rationale:string[]}
export interface TeamComposition extends ContentMeta{id:string;title:string;useCase:string;slots:TeamSlot[];notes:string[];rotationId?:string}
export interface RotationStep{id:string;actorId?:string;action:string;condition?:string;result?:string}
export interface CombatRotation extends ContentMeta{id:string;title:string;prerequisites:string[];steps:RotationStep[];exceptions:string[]}
export interface LoreEvent extends ContentMeta{id:string;label:string;dateText?:string;precision:'exact'|'approximate'|'relative'|'unknown';title:string;body:string[]}
export interface ProfileField{label:string;value?:string;meta:ContentMeta}
export interface GalleryItem{id:string;assetId:string;caption:string;meta:ContentMeta}
export interface ReleaseInfo{siteVersion:string;buildDate:string;contentVersion:string;contentReviewState:'baseline'|'partial'|'verified'}
