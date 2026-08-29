import{get}from'node:http';
import{expect,test}from'@playwright/test';

const disclaimer=['本站为万敌厨创作的非官方网站。','游戏相关的图像和资产的版权和商标权归 HoYoverse 所有。'];
const footerIntroduction=['小敌小敌，我们喜欢你。','为万敌而设的非官方数字档案馆。收录其故事、轨迹与一切注脚。'];
const footerContacts=['万敌吧','同好 QQ 群：430106260','Designed & Maintained by 二十铢 (Bilibili)'];
const removedFooterCopy=['由玩家整理、以万敌为唯一主角的中文角色专题站。','快捷入口','维护者：tung','tung-favorli@outlook.com','Bilibili：YvetteTung','作者 B 站主页','返回顶部'];
const navLabels=['首页','角色档案','技能','星魂','馆藏'];
const pages=[['/',/万敌/,'黄金蜜饼'],['/profile/',/角色档案/,'角色档案'],['/skills/',/^技能$/,'技能'],['/eidolons/',/^星魂$/,'星魂'],['/library/',/歌耳巴尼帕耳图书馆藏/,'歌耳巴尼帕耳图书馆藏']]as const;
const rawGet=(origin:string,path:string)=>new Promise<{status:number;location?:string;body:string}>((resolve,reject)=>{get(`${origin}${path}`,response=>{let body='';response.setEncoding('utf8');response.on('data',chunk=>body+=chunk);response.on('end',()=>resolve({status:response.statusCode??0,location:response.headers.location,body}))}).on('error',reject)});

test('all public pages share navigation, footer, SEO, and responsive bounds',async({page})=>{
 const pageErrors:string[]=[];page.on('pageerror',error=>pageErrors.push(error.message));
 for(const[path,heading,title]of pages){
  await page.goto(path);
  await expect(page).toHaveTitle(title);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content',title);
  await expect(page.locator('h1')).toContainText(heading);
  await expect(page.locator('.site-header')).toBeVisible();
  await expect(page.locator('.site-footer')).toBeVisible();
  await expect(page.locator('.footer-intro>p>span')).toHaveText(footerIntroduction);
  await expect(page.locator('.site-footer>div')).toHaveCount(2);
  await expect(page.locator('.footer-contact h2')).toHaveText('联系');
  await expect(page.locator('.footer-contact li')).toHaveText(footerContacts);
  const contactLinks=page.locator('.footer-contact a');
  await expect(contactLinks).toHaveCount(2);
  await expect(contactLinks.nth(0)).toHaveAttribute('href','https://tieba.baidu.com/f?kw=%E4%B8%87%E6%95%8C&fr=personalize_page');
  await expect(contactLinks.nth(1)).toHaveAttribute('href','https://space.bilibili.com/499407441?spm_id_from=333.1007.0.0');
  await expect(contactLinks.nth(1).locator('strong')).toHaveText('二十铢');
  await expect(contactLinks.nth(1).locator('strong')).toHaveCount(1);
  for(const link of await contactLinks.all()){await expect(link).toHaveAttribute('target','_blank');await expect(link).toHaveAttribute('rel','noopener noreferrer')}
  const footerText=await page.locator('.site-footer').innerText();for(const text of removedFooterCopy)expect(footerText).not.toContain(text);
  expect(await page.locator('.nav-links a').allTextContents()).toEqual(navLabels);
  await expect(page.locator('.nav-links [aria-current="page"]')).toHaveCount(1);
  for(const text of disclaimer)await expect(page.locator('.footer-disclaimer')).toContainText(text);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',new RegExp(`^https://mydeimos\\.love${path.replaceAll('/','\\/')}$`));
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content',new RegExp(`^https://mydeimos\\.love${path.replaceAll('/','\\/')}$`));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow,`${path} has horizontal overflow`).toBeLessThanOrEqual(1);
 }
 await page.goto('/404.html');
 await expect(page).toHaveTitle('页面未找到');
 await expect(page.locator('.footer-intro>p>span')).toHaveText(footerIntroduction);
 await expect(page.locator('.footer-contact li')).toHaveText(footerContacts);
 expect(pageErrors).toEqual([]);
});

test('home is one Hero with the frozen copy and two page CTAs',async({page})=>{
 await page.goto('/');
 await expect(page.locator('main>.hero')).toHaveCount(1);
 await expect(page.locator('main>*')).toHaveCount(1);
 await expect(page.locator('.hero blockquote')).toHaveText('不死的迈德漠斯，离群的狮子，逐猎「纷争」火种的黄金裔。');
 await expect(page.getByRole('link',{name:'查看角色档案'})).toHaveAttribute('href','./profile/');
 await expect(page.getByRole('link',{name:'查看技能'})).toHaveAttribute('href','./skills/');
 const text=await page.locator('body').innerText();
 for(const blocked of ['查看玩法建议','内容审核中','授权待确认','核验后发布','待核验','待补充','勘误'])expect(text).not.toContain(blocked);
});

test('footer uses responsive columns and visible keyboard focus',async({page})=>{
 await page.goto('/');
 const columns=await page.locator('.site-footer').evaluate(element=>getComputedStyle(element).gridTemplateColumns.split(' ').length);
 expect(columns).toBe((page.viewportSize()?.width??1440)>560?2:1);
 const link=page.getByRole('link',{name:'万敌吧'});await link.focus();await expect(link).toBeFocused();
 const focusStyle=await link.evaluate(element=>{const style=getComputedStyle(element);return{style:style.outlineStyle,width:Number.parseFloat(style.outlineWidth)}});
 expect(focusStyle.style).not.toBe('none');expect(focusStyle.width).toBeGreaterThanOrEqual(2);
});

test('requested page headings omit descriptions without leaving placeholder space',async({page})=>{
 const compactPages=[
  ['/profile/','浏览万敌已确认的身份、属性、晋阶、行迹与角色介绍。','.profile-page-nav'],
  ['/skills/','按稳定锚点浏览普攻、战技形态、终结技、天赋、秘技和附加能力。','.local-nav'],
  ['/eidolons/','六阶星魂以本地图标与静态图片呈现，断网时仍可阅读完整说明。','.local-nav'],
 ]as const;
 for(const[path,removedCopy,nextSelector]of compactPages){
  await page.goto(path);
  await expect(page.locator('body')).not.toContainText(removedCopy);
  const heading=page.locator('.page-heading--compact');
  await expect(heading).toBeVisible();
  await expect(heading.locator(':scope>p:not(.eyebrow)')).toHaveCount(0);
  const gap=await heading.evaluate((element,selector)=>{const next=document.querySelector(selector);if(!next)throw new Error(`Missing ${selector}`);return next.getBoundingClientRect().top-element.getBoundingClientRect().bottom},nextSelector);
  expect(gap,`${path} heading gap`).toBeLessThanOrEqual(42);
 }
 await page.goto('/library/');
 await expect(page.locator('body')).not.toContainText('十七份站内馆藏以新版深色阅读界面重新编排。选择标题可展开全文，也可使用目录快速抵达篇章。');
 const hero=page.locator('.library-hero--compact');
 await expect(hero.locator(':scope>p:not(.eyebrow)')).toHaveCount(0);
 await expect(hero.getByRole('link',{name:'返回角色故事'})).toHaveCount(0);
 await expect(hero.locator('.button')).toHaveCount(0);
 const titleGap=await hero.evaluate(element=>{const title=element.querySelector('h1');if(!title)throw new Error('Missing library hero title');return element.getBoundingClientRect().bottom-title.getBoundingClientRect().bottom});
 expect(titleGap).toBeLessThanOrEqual(60);
});

test('profile, skills, and eidolons expose migrated content',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop-1440','content matrix only needs one browser project');
 await page.goto('/profile/#basic-info');await expect(page.locator('#basic-info')).toBeVisible();await expect(page.locator('#ascension')).toBeAttached();await expect(page.locator('#traces')).toBeAttached();await expect(page.locator('#introduction')).toBeAttached();await expect(page.locator('#stories')).toBeAttached();
 await page.goto('/skills/#skill-enhanced-king');await expect(page.locator('#skill-enhanced-king')).toContainText('弑王成王');await expect(page.locator('#skill-enhanced-god')).toContainText('弑神登神');await expect(page.locator('#bonus-abilities')).toContainText('水与泥土');
 await page.goto('/eidolons/#eidolon-06');await expect(page.locator('.eidolon-card')).toHaveCount(6);await expect(page.locator('#eidolon-06')).toContainText('往日攀陟沉积的血山');await expect(page.locator('.eidolon-card__poster')).toHaveCount(6);await expect(page.locator('.eidolon-card__icon')).toHaveCount(6);
});

test('profile introduction and four stories support links, disclosure, keyboard, and deep links',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop-1440','long-form behavior only needs one browser project');
 await page.goto('/profile/');
 await expect(page.locator('#introduction .prose>p')).toHaveCount(2);
 await expect(page.locator('#introduction')).toContainText('那沉入迷雾的悬锋');
 await expect(page.locator('#introduction')).not.toContainText('\\');
 const knowledgeLinks=page.locator('#introduction a,.character-story__excerpt a');
 await expect(knowledgeLinks).toHaveCount(6);
 for(const link of await knowledgeLinks.all()){await expect(link).toHaveAttribute('target','_blank');await expect(link).toHaveAttribute('rel','noopener noreferrer')}
 const stories=page.locator('.character-story');await expect(stories).toHaveCount(4);expect(await stories.evaluateAll(items=>items.every(item=>!(item as HTMLDetailsElement).open))).toBe(true);
 const firstSummary=stories.first().locator('summary');await firstSummary.focus();await page.keyboard.press('Enter');await expect(stories.first()).toHaveAttribute('open','');await page.keyboard.press('Enter');await expect(stories.first()).not.toHaveAttribute('open','');
 await page.goto('/profile/#character-story-3');await expect(page.locator('#character-story-3')).toHaveAttribute('open','');await expect(page.locator('#character-story-3 summary')).toBeFocused();
 await expect(page.locator('#character-story-3 .character-story__annotation')).toContainText('——男人的批示');
});

test('navigation supports desktop, touch layouts, keyboard close, and focus return',async({page})=>{
 await page.goto('/skills/');
 if((page.viewportSize()?.width??999)>900){await expect(page.locator('[data-nav-links]')).toBeVisible();return}
 const toggle=page.locator('[data-nav-toggle]');await expect(toggle).toBeVisible();await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');await expect(page.locator('[data-nav-links]')).toBeVisible();await page.keyboard.press('Escape');await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(toggle).toBeFocused();
});

test('library supports native disclosure, touch controls, and deep links',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop-1440','library behavior only needs one browser project');
 await page.goto('/library/');const entries=page.locator('.library-entry');await expect(entries).toHaveCount(17);const second=entries.nth(1);await second.locator('summary').focus();await page.keyboard.press('Enter');await expect(second).toHaveAttribute('open','');await page.locator('[data-library-open-all]').click();expect(await entries.evaluateAll(items=>items.every(item=>(item as HTMLDetailsElement).open))).toBe(true);await page.locator('[data-library-close-all]').click();expect(await entries.evaluateAll(items=>items.every(item=>!(item as HTMLDetailsElement).open))).toBe(true);await page.goto('/library/#archive-02');await expect(page.locator('#archive-02')).toHaveAttribute('open','');await expect(page.locator('#archive-02 summary')).toBeFocused();
});

test('core content remains readable without JavaScript',async({browser,viewport},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop-1440','no-JS matrix only needs one browser project');
 const context=await browser.newContext({javaScriptEnabled:false,viewport:viewport??{width:1440,height:900}});const page=await context.newPage();
 for(const[path]of pages){await page.goto(`http://127.0.0.1:4173${path}`);await expect(page.locator('h1')).toBeVisible();await expect(page.locator('[data-nav-links]')).toBeVisible()}
 await page.goto('http://127.0.0.1:4173/skills/');await expect(page.locator('#skill-enhanced-god')).toContainText('弑神登神');
 await context.close();
});

test('page media stays local and image failures preserve readable fallback content',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop-1440','network matrix only needs one browser project');
 const remoteMedia:string[]=[];page.on('request',request=>{if(['image','media'].includes(request.resourceType())&&new URL(request.url()).origin!=='http://127.0.0.1:4173')remoteMedia.push(request.url())});
 await page.goto('/profile/');await page.locator('#character-story-4').scrollIntoViewIfNeeded();await page.goto('/eidolons/');await page.locator('#eidolon-06').scrollIntoViewIfNeeded();expect(remoteMedia).toEqual([]);
 await page.route('**/eidolon-01.webp',route=>route.abort());await page.goto('/eidolons/');await expect(page.locator('#eidolon-01 h2')).toContainText('寒风雕琢不屈的脊梁');await expect(page.locator('#eidolon-01 .eidolon-card__icon')).toBeVisible();
});

test('reduced motion keeps the static-first presentation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/library/');
 const duration=await page.locator('.library-entry__indicator').first().evaluate(element=>getComputedStyle(element).transitionDuration);expect(Number.parseFloat(duration)).toBeLessThanOrEqual(.00001);
 await page.goto('/profile/');
 await expect(page.locator('video[autoplay],img[data-motion-src]')).toHaveCount(0);
 await expect(page.locator('.portrait-card img')).toBeVisible();
});

test('secondary text reaches WCAG AA contrast and landmarks have accessible names',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop-1440','accessibility audit only needs one browser project');await page.goto('/library/');
 const ratio=await page.locator('.library-entry[open] .library-entry__body p').first().evaluate(element=>{const rgb=(value:string)=>value.match(/[\d.]+/g)?.slice(0,3).map(Number)??[0,0,0];const luminance=(values:number[])=>{const channels=values.map(value=>{const normalized=value/255;return normalized<=.04045?normalized/12.92:((normalized+.055)/1.055)**2.4});return .2126*(channels[0]??0)+.7152*(channels[1]??0)+.0722*(channels[2]??0)};const style=getComputedStyle(element),background=getComputedStyle(element.closest('.library-entry__body')!);const foreground=luminance(rgb(style.color)),back=luminance(rgb(background.backgroundColor));return(Math.max(foreground,back)+.05)/(Math.min(foreground,back)+.05)});
 expect(ratio).toBeGreaterThanOrEqual(4.5);await expect(page.getByRole('navigation',{name:'主要导航'})).toBeVisible();await expect(page.getByRole('main')).toBeVisible();
});

test('legacy route matrix returns exact 301 and real 404 responses',async({baseURL},testInfo)=>{
 test.skip(testInfo.project.name!=='desktop-1440','route matrix only needs one browser project');const origin=baseURL??'http://127.0.0.1:4173';
 for(const[path,location]of [['/index.html','/'],['/HomePage/homepage.html','/'],['/About/about.html','/library/#golden-honeycake'],['/About/Library/library.html','/library/'],['/About/index.html','/profile/#site-info'],['/about/','/profile/#site-info']]as const){const response=await rawGet(origin,path);expect(response.status,path).toBe(301);expect(response.location,path).toBe(location)}
 for(const path of ['/About/Record/record.html','/ChangeLog/changelog.html','/changelog/','/sources/','/builds/','/guides/','/teams/','/rotation/','/gallery/','/gallery/index.html','/not-a-real-page','/404.html']){const response=await rawGet(origin,path);expect(response.status,path).toBe(404);expect(response.body).toContain('你访问的地址不存在')}
});
