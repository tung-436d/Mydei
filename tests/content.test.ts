import{existsSync}from'node:fs';import{resolve}from'node:path';import{describe,expect,it}from'vitest';import{assets,builds,eidolons,gallery,libraryEntries,rotations,skills,stats,teams,traces}from'../Mydei/src/content';import{validateContent}from'../Mydei/src/content/validate';import{galleryMarkup,profileMarkup}from'../Mydei/src/render';import{libraryEntryMarkup}from'../Mydei/src/render/library-page';

const bundle={assets,stats,skills,traces,eidolons,builds,teams,rotations,gallery,library:libraryEntries};

describe('content integrity',()=>{
 it('accepts the migrated content bundle',()=>expect(validateContent(bundle)).toEqual([]));
 it('detects duplicate skill and library IDs',()=>{const invalid={...bundle,skills:[skills[0]!,skills[0]!],library:[libraryEntries[0]!,libraryEntries[0]!]};const codes=validateContent(invalid).map(issue=>issue.code);expect(codes).toContain('DUPLICATE_SKILL');expect(codes).toContain('DUPLICATE_LIBRARY_ENTRY')});
 it('retains all 17 migrated entries and their complete paragraph set',()=>{expect(libraryEntries).toHaveLength(17);expect(libraryEntries.flatMap(entry=>entry.sections.flatMap(section=>section.paragraphs))).toHaveLength(338);expect(libraryEntries.every(entry=>entry.summary&&entry.sections.some(section=>section.paragraphs.length))).toBe(true)});
 it('renders gallery images and escapes authored values',()=>{expect(galleryMarkup(gallery,assets)).toContain('<img');const fields=[{...stats[0]!,value:'<script>alert(1)</script>'}];expect(profileMarkup(fields)).not.toContain('<script>')});
 it('keeps library summaries and bodies in semantic details markup',()=>{const markup=libraryEntryMarkup(libraryEntries[0]!);expect(markup).toContain('<details');expect(markup).toContain('<summary');expect(markup).toContain(libraryEntries[0]!.summary);expect(markup).toContain(libraryEntries[0]!.sections[0]!.paragraphs[0])});
});

describe('retired surface',()=>{it('removes obsolete standalone pages from the source tree',()=>{for(const path of ['Mydei/HomePage/homepage.html','Mydei/About/about.html','Mydei/About/Library/library.html','Mydei/About/Record/record.html','Mydei/ChangeLog/changelog.html','Mydei/sources/index.html'])expect(existsSync(resolve(path)),path).toBe(false)})});
