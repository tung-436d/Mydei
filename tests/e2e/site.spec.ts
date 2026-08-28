import{expect,test}from'@playwright/test';

const cleanRoutes=[
  ['/',/万敌/],
  ['/sources/',/来源、版本与勘误/],
  ['/library/',/故事与馆藏/],
  ['/about/',/关于本站/],
  ['/changelog/',/更新日志/],
]as const;

test('clean routes render shared, overflow-free pages',async({page})=>{
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  for(const[path,heading]of cleanRoutes){
    await page.goto(path);
    await expect(page.locator('h1')).toContainText(heading);
    await expect(page.locator('.site-header')).toBeVisible();
    await expect(page.locator('.site-footer')).toBeVisible();
    const disclaimer=page.locator('.footer-disclaimer');
    await expect(disclaimer).toContainText('本站为万敌厨创作的非官方网站。');
    await expect(disclaimer).toContainText('游戏相关的图像和资产的版权和商标权归 HoYoverse 所有。');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow,`${path} has horizontal overflow`).toBeLessThanOrEqual(1);
  }
  expect(pageErrors).toEqual([]);
});

test('provided content is visible without review blockers',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'踏破征途的誓言'})).toBeVisible();
  await expect(page.locator('#panel-eidolons h3',{hasText:'寒风雕琢不屈的脊梁'})).toBeAttached();
  await expect(page.locator('[data-gallery] img')).toHaveCount(4);
  const text=await page.locator('body').innerText();
  for(const blocked of ['内容审核中','授权待确认','核验后发布','素材授权审核中','馆藏审计'])expect(text).not.toContain(blocked);
});

test('footer disclaimer meets WCAG AA contrast',async({page})=>{
  await page.goto('/');
  const contrast=await page.locator('.footer-disclaimer').evaluate(element=>{
    const parse=(value:string)=>value.match(/[\d.]+/g)?.slice(0,3).map(Number)??[0,0,0];
    const luminance=(rgb:number[])=>{
      const channels=rgb.map(value=>{const normalized=value/255;return normalized<=.04045?normalized/12.92:((normalized+.055)/1.055)**2.4});
      return .2126*(channels[0]??0)+.7152*(channels[1]??0)+.0722*(channels[2]??0);
    };
    const style=getComputedStyle(element),foreground=luminance(parse(style.color)),background=luminance(parse(getComputedStyle(document.body).backgroundColor));
    return(Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});

test('mobile navigation and keyboard tabs are operable',async({page})=>{
  await page.goto('/');
  if((page.viewportSize()?.width??999)>900){
    await expect(page.locator('[data-nav-links]')).toBeVisible();
  }else{
    const toggle=page.locator('[data-nav-toggle]');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded','true');
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded','false');
    await expect(toggle).toBeFocused();
  }
  const first=page.locator('[data-tab]').first();
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-tab]').nth(1)).toHaveAttribute('aria-selected','true');
});

test('core content remains readable without JavaScript',async({browser,viewport})=>{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:viewport??{width:1280,height:800}});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('h1')).toContainText('万敌');
  await expect(page.locator('#skills')).toBeVisible();
  await expect(page.locator('[data-nav-links]')).toBeVisible();
  await expect(page.locator('[data-tab]').first()).toBeHidden();
  await context.close();
});

test('reduced motion disables long transitions',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  const duration=await page.locator('.button').first().evaluate(element=>getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.00001);
});

test('legacy URLs redirect and 404 page is available',async({page})=>{
  await page.goto('/HomePage/homepage.html');
  await expect(page).toHaveURL(/\/#overview$/);
  const response=await page.goto('/404.html');
  expect(response?.ok()).toBeTruthy();
  await expect(page.getByRole('heading',{name:'这一页不在馆藏中'})).toBeVisible();
});

test('broken images expose a readable fallback',async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>{
    const image=document.createElement('img');
    image.alt='测试素材';
    document.querySelector('#gallery')?.append(image);
    image.src='/definitely-missing-image.webp';
  });
  await expect(page.locator('.image-fallback')).toContainText('测试素材');
});
