import{existsSync}from'node:fs';
import{resolve}from'node:path';
import{describe,expect,it}from'vitest';
import{assets,eidolons,gallery,libraryEntries,skills,stats,traces}from'../Mydei/src/content';
import{validateContent}from'../Mydei/src/content/validate';
import{galleryMarkup,profileMarkup}from'../Mydei/src/render';
import{libraryEntryMarkup}from'../Mydei/src/render/library-page';

const bundle={assets,stats,skills,traces,eidolons,gallery,library:libraryEntries};

describe('content integrity',()=>{
 it('accepts the migrated content bundle',()=>expect(validateContent(bundle)).toEqual([]));
 it('detects duplicate skill and library IDs',()=>{const invalid={...bundle,skills:[skills[0]!,skills[0]!],library:[libraryEntries[0]!,libraryEntries[0]!]};const codes=validateContent(invalid).map(issue=>issue.code);expect(codes).toContain('DUPLICATE_SKILL');expect(codes).toContain('DUPLICATE_LIBRARY_ENTRY')});
 it('keeps all required skill categories and separate skill forms',()=>{expect(new Set(skills.map(skill=>skill.category))).toEqual(new Set(['basic','skill','ultimate','talent','technique','bonus-ability']));expect(skills.map(skill=>skill.id)).toEqual(expect.arrayContaining(['skill','skill-enhanced-king','skill-enhanced-god']));expect(skills.filter(skill=>skill.category==='bonus-ability')).toHaveLength(3)});
 it('keeps E1–E6 ordered with twelve real local static files',()=>{expect(eidolons.map(entry=>entry.id)).toEqual(['eidolon-01','eidolon-02','eidolon-03','eidolon-04','eidolon-05','eidolon-06']);const media=eidolons.flatMap(entry=>[entry.media.icon,entry.media.poster]);expect(media).toHaveLength(12);for(const item of media){expect(item.path).toMatch(/^assets\/mydei\/eidolons\/[a-z0-9-]+\.webp$/);expect(existsSync(resolve('Mydei/public',item.path)),item.path).toBe(true);expect(item.mimeType).toBe('image/webp')}});
 it('retains all 17 migrated entries and their complete paragraph set',()=>{expect(libraryEntries).toHaveLength(17);expect(libraryEntries.flatMap(entry=>entry.sections.flatMap(section=>section.paragraphs))).toHaveLength(338)});
 it('renders gallery images and escapes authored values',()=>{expect(galleryMarkup(gallery,assets,'../')).toContain('<img');const fields=[{...stats[0]!,value:'<script>alert(1)</script>'}];expect(profileMarkup(fields)).not.toContain('<script>')});
 it('keeps library summaries and bodies in semantic details markup',()=>{const markup=libraryEntryMarkup(libraryEntries[0]!);expect(markup).toContain('<details');expect(markup).toContain('<summary');expect(markup).toContain(libraryEntries[0]!.summary)});
});

describe('retired surface',()=>{
 it('removes obsolete pages and recommendation data files',()=>{for(const path of ['Mydei/HomePage/homepage.html','Mydei/About/about.html','Mydei/About/Library/library.html','Mydei/About/Record/record.html','Mydei/ChangeLog/changelog.html','Mydei/sources/index.html','Mydei/src/content/mydei/builds.ts','Mydei/src/content/mydei/teams.ts','Mydei/src/content/mydei/rotations.ts'])expect(existsSync(resolve(path)),path).toBe(false)});
});
