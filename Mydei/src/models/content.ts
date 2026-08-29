export type EidolonLevel=1|2|3|4|5|6;
export type SkillCategory='basic'|'skill'|'ultimate'|'talent'|'technique'|'bonus-ability';

export interface AssetRef{id:string;src:string;alt:string;width:number;height:number;usage:'hero'|'content'|'thumbnail'|'decorative'|'social';loading?:'eager'|'lazy';fetchPriority?:'high'|'low'|'auto'}
export interface DisplayValue{label:string;value:string;context?:string}
export interface Skill{id:string;category:SkillCategory;name:string;typeLabel?:string;parentSkillId?:string;formId?:string;isAutomatic?:boolean;description:string[];mechanics:DisplayValue[];gameVersion?:string}
export interface TraceNode{id:string;name:string;nodeKind:'major'|'minor'|'stat';description:string[];prerequisiteIds:string[];visualPosition?:{column:number;row:number}}
export interface TraceGraph{nodes:TraceNode[]}
export interface LocalMediaAsset{path:string;mimeType:'image/webp'|'image/gif'|'image/apng'|'video/webm'|'video/mp4';width:number;height:number;byteSize:number;alt:string}
export interface EidolonMediaSet{icon:LocalMediaAsset;poster:LocalMediaAsset}
export interface Eidolon{id:`eidolon-${'01'|'02'|'03'|'04'|'05'|'06'}`;level:EidolonLevel;name:string;description:string[];media:EidolonMediaSet}
export interface LoreEvent{id:string;label:string;dateText?:string;precision:'exact'|'approximate'|'relative'|'unknown';title:string;body:string[]}
export interface ProfileField{label:string;value:string}
export interface GalleryItem{id:string;assetId:string;caption:string}
export interface LibrarySection{heading?:string;paragraphs:string[]}
export interface LibraryEntryData{id:string;category:string;title:string;summary:string;sections:LibrarySection[];defaultOpen?:boolean;spoilerLevel?:'none'|'minor'|'major'}
export interface ReleaseInfo{siteVersion:string;buildDate:string;contentVersion:string}
