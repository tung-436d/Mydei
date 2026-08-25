# 万敌角色专题站：全栈修改执行方案

> 交付对象：全栈工程师、内容编辑、测试工程师  
> 方案日期：2026-08-25  
> 方案性质：可直接排期实施；不授权自动抓取、复制第三方源码/素材或生产部署  
> 上位文档：`docs/product/mydei-redesign-prd.md`、`docs/architecture/mydei-redesign-architecture.md`

## 1. 任务目标

将当前新版首页和所有旧页面统一为一套“黑曜石 / 深红 / 古金 / 暖白”的万敌专题视觉，并完成以下内容结构：

1. 角色设定区参考“黄金裔 WIKI”万敌页的信息组织方式；
2. 技能、养成、配队区参考米游社“开拓者笔记”万敌词条的信息组织方式；
3. 保留本站自己的导航、品牌、组件和视觉语言，不复制参考站源码、装饰图形、交互教程或页面像素布局；
4. 所有事实、数值和攻略建议必须带来源、适用版本、核验状态和责任人；
5. 统一迁移现有首页、关于、馆藏、更新日志和占位页，不保留两套样式系统；
6. 核心内容构建为静态 HTML，禁用 JavaScript 时仍可阅读。

## 2. 参考页面结论

### 2.1 角色设定参考页

参考：<https://act.mihoyo.com/sr/event/gt-aio/chrysos-heirs/index.html?mhy_presentation_style=fullscreen&mhy_landscape=true&mhy_hide_status_bar=true&utm_source=bbs&utm_medium=mys&utm_campaign=wiki#/character?content_id=4609>

可借鉴的信息架构：

- 大幅角色主视觉与结构化档案卡并列；
- 顶部在“基本信息 / 画廊 / 角色关系 / 故事 / 解析”间切换；
- 基本信息先给城邦、神权、定位等可扫描字段，再给官方介绍；
- 画廊按视频、图片分类；
- 角色关系与长篇故事作为下一级深读内容；
- 内容支持按游戏版本切换，并显示有更新的版本；
- 故事按章节和解锁条件组织，解析内容独立标明作者来源。

本站不照搬：

- 不复制其纸张边框、图标、教程弹层、版本滑轨、角色插画或音效；
- 不把横屏活动页的固定比例直接套到移动端；
- 不复制长篇角色故事或解析文本，只记录来源并由内容负责人撰写摘要；
- 不使用其“官方活动页”视觉标识，避免本站被误认作官方站。

### 2.2 技能、养成与配队参考页

参考：<https://bbs.mihoyo.com/sr/wiki/content/4609/detail?bbs_presentation_style=no_header>

可借鉴的信息架构：

- 单页目录覆盖角色信息、晋阶、技能/行迹、星魂、光锥、遗器、配队、攻略、故事、语音、关系、解析与画廊；
- 晋阶数据按等级阶段切换，材料和属性使用表格；
- 技能通过图标/类别进入详情；行迹提供树形查看；
- 星魂按 1–6 顺序展示；
- 光锥、遗器、配队分别成章，并明确攻略提供者；
- 推荐项同时展示基础信息、推荐层级、效果与说明；
- 页面有长页目录，适合从分享链接直达具体章节。

本站不照搬：

- 不复制词条的完整文字、图片、推荐星级、表格样式或评论/社区功能；
- 不自动抓取并同步页面数据；来源页自身可能包含不同版本内容，必须人工选择适用版本；
- 不把第三方攻略写成“官方信息”；攻略作者、适用版本和复核日期必须保留；
- 不转载页面注明禁止转载的原创词条内容，只提炼信息结构、撰写本站原创摘要并提供来源链接。

## 3. 已确认的技术决策

### 3.1 保留现有技术栈

- 使用当前 Vite 7、TypeScript、原生 HTML/CSS/DOM API；
- 使用 pnpm 和已有 lockfile；
- 使用 Vitest 做数据与纯逻辑测试；
- 不引入 React、Vue、客户端路由、全局状态管理或 CSS-in-JS；
- 建议增加 `@playwright/test` 作为唯一首批新增开发依赖；
- 可选增加 `@axe-core/playwright`，不作为业务运行时依赖。

### 3.2 渲染方式

当前并发实现已经加入 Vite `transformIndexHtml`，会把资料、技能、养成、循环和画廊写入首页静态 HTML；这是正确方向。但 `Mydei/src/app.ts` 仍会在浏览器中再次用 `innerHTML` 覆盖同一批内容，存在双重渲染、语义漂移和潜在注入风险。必须收敛为：

```text
content/*.ts
  → check-content
  → Vite build plugin / transformIndexHtml
  → 完整静态 HTML
  → enhancement controllers 只绑定 tabs、菜单、灯箱、章节状态
```

验收：禁用 JavaScript后，角色设定、技能摘要、养成建议、配队、循环、来源和声明仍完整可见。

`app.ts` 删除 `renderProfile/renderArchive/renderBuilds/renderRotation/renderGallery` 等重复渲染职责，只保留渐进增强 controllers。构建插件和客户端不能各维护一套模板字符串。

### 3.3 路由方式

采用静态多页 + 首页章节锚点，不使用 SPA history fallback：

| 目标 URL | 内容 |
| --- | --- |
| `/` | 专题主页面 |
| `/#overview` | 角色概览与设定 |
| `/#skills` | 技能、行迹与星魂 |
| `/#build` | 晋阶、光锥、遗器、词条 |
| `/#teams` | 配队与替代位 |
| `/#rotation` | 机制与战斗循环 |
| `/#story` | 故事入口与摘要 |
| `/sources/` | 来源、内容状态、版本与勘误 |
| `/library/` | 经审计后的馆藏 |
| `/about/` | 关于本站、版权与联系 |
| `/changelog/` | 内容版本记录 |

当前 Vite 已显式包含新版首页和五个旧页面 inputs。下一步要新增 `/sources/`、`/library/`、`/about/`、`/changelog/` 的干净路由 inputs，并将旧路径降为兼容入口。正式部署根路径确认前继续使用相对 URL 和 `base: './'`。

## 4. 目标页面结构

```text
SiteLayout
├── SkipLink
├── SiteHeader
│   ├── Brand
│   ├── PrimaryNavigation
│   │   ├── 概览
│   │   ├── 技能
│   │   ├── 养成
│   │   ├── 配队
│   │   └── 故事
│   └── MoreMenu（来源 / 馆藏 / 更新日志 / 关于）
├── CharacterPage
│   ├── MydeiHero
│   ├── CharacterDossier
│   │   ├── CharacterKeyVisual
│   │   ├── CharacterOverview
│   │   ├── StatPanel
│   │   ├── ContentBadge
│   │   └── VersionNotice
│   ├── CombatArchive
│   │   ├── SkillTabs
│   │   ├── SkillDetail
│   │   ├── TraceTree
│   │   └── EidolonGrid
│   ├── BuildRecommendations
│   │   ├── AscensionPanel
│   │   ├── LightConeRecommendations
│   │   ├── RelicRecommendations
│   │   └── StatPriority
│   ├── TeamComposition
│   ├── CombatRotation
│   ├── StoryArchiveEntry
│   ├── SourceNotice
│   └── Gallery（P1 / 授权后）
└── SiteFooter
```

## 5. 视觉与交互规格

### 5.1 全站统一样式

当前 `Mydei/css/index.css` 的暗色史诗方向作为视觉基线，但需要拆分和修正：

```text
Mydei/src/styles/
├── tokens.css
├── reset.css
├── global.css
├── layout.css
├── utilities.css
└── components/
    ├── navigation.css
    ├── hero.css
    ├── dossier.css
    ├── tabs.css
    ├── cards.css
    ├── archive.css
    ├── gallery.css
    └── footer.css
```

候选 token：

```css
:root {
  --color-obsidian: #12100f;
  --color-crimson: #5a1717;
  --color-antique-gold: #c6a15b;
  --color-warm-white: #f4ebdd;
  --color-surface-dark: #191515;
  --color-surface-light: #fffaf1;
  --color-text-dark: #241c18;
  --color-text-light: #f4ebdd;
  --color-muted-dark: #6b5f58;
  --color-muted-light: #aaa298;
  --color-focus: #74b7ff;
  --content-max: 76rem;
  --prose-max: 72ch;
  --header-height: 4.75rem;
}
```

要求：

- 深色沉浸区用于 Hero、导航、章节分隔；长文和高密度表格使用暖白阅读面；
- 古金只用于边框、标题、高亮和少量图标，不作为小字号正文色；
- 不继续使用通用白色 SaaS 卡片；卡片用细边线、层级底色和克制阴影；
- 所有 focus 必须有独立高对比颜色，不能只靠金色；
- 删除 Google Fonts 远程 `@import`。默认用系统字体；若使用展示字体，必须确认授权、自托管 WOFF2、子集化并提供回退；
- 禁止将参考站的装饰边框、背景纹理和图标直接截图或复制。

### 5.2 角色设定区

桌面端：

- 采用 5:7 或 1:1.2 的“主视觉 / 档案面板”双栏；
- 左侧角色视觉只使用授权通过的本地资源；
- 右侧先显示角色名、别名和身份标签，再显示城邦、神权、定位等字段；
- 官方介绍、本站原创导语分为两个明确标记的内容块；
- 版本不做占满页面的滑轨，使用紧凑 `VersionNotice` 或下拉选择；
- “画廊 / 关系 / 故事 / 解析”作为档案区二级入口，不取代全站主导航。

移动端：

- 主视觉在上、档案卡在下；角色必须清晰可识别；
- 档案字段使用两列定义列表，在 360 px 下自动转单列；
- 版本选择、二级入口允许横向滚动，但页面本身不得横向溢出；
- 不实现参考活动页的强制横屏和教程遮罩。

### 5.3 技能与行迹

- 一级类别固定为普攻、战技、终结技、天赋、秘技；额外形态由数据模型扩展；
- 每个技能默认显示名称、类型、机制关键词、一句话摘要和内容状态；
- 展开后显示官方效果、本站解读、资源变化、适用版本、核验日期和来源；
- 倍率按技能等级/形态单独表格展示，未核验时整块隐藏并标“倍率待核验”，不显示 0 或 `--`；
- 桌面可用 ARIA tabs；移动端使用纵向摘要 + `details/summary`，避免横向 tabs 塞入长内容；
- 每个技能有稳定锚点，如 `#skill-basic`；刷新和前进/后退保持状态；
- `TraceTree` 桌面显示依赖图，移动端显示按解锁顺序分组的列表，并提供等价文本。

### 5.4 星魂

- 按 1–6 顺序显示；
- 卡片首屏只显示序号、名称、关键影响摘要；
- 展开后分别显示官方描述和本站解读；
- 官方内容与玩法解读不能共用同一语气/样式；
- 不使用只有颜色含义的“推荐/不推荐”状态。

### 5.5 养成

按以下顺序组织：

1. 一眼结论；
2. 晋阶属性与材料；
3. 光锥：优先 / 可选 / 过渡；
4. 遗器与位面饰品；
5. 主词条 / 副词条；
6. 条件与常见误区；
7. 来源、作者、适用版本、最后复核日期。

要求：

- 参考页面的五星制改为中性文字层级，避免制造虚假精度；
- 推荐项显示“为什么适用”和“什么时候不适用”；
- 精确倍率和收益差距只有在公式、口径和版本都核验后才显示；
- 晋阶材料表在移动端转为卡片/定义列表，不压缩成不可读宽表；
- 玩法建议必须绑定攻略作者，不得用官方标签。

### 5.6 配队与循环

每套配队包含：

- 队伍名称、适用场景和版本；
- 4 个职责槽位，而不是只有四张头像；
- 每个槽位的首选、替代位与替代条件；
- 队伍优势、限制和操作门槛；
- 3–6 步基本循环；
- 何时偏离循环及常见误区；
- 攻略作者、最后复核日期和来源。

移动端按“队伍摘要 → 槽位 → 循环 → 优缺点”纵向排列，不要求横向拖动。

## 6. 内容与来源实施规则

### 6.1 来源登记

至少登记两条来源：

```ts
export const sources = {
  'mihoyo-chrysos-heirs-4609': {
    title: '黄金裔 WIKI：万敌',
    sourceType: 'official-web',
    url: 'https://act.mihoyo.com/...content_id=4609',
    coveredAreas: ['overview', 'story', 'gallery-index', 'relationships'],
  },
  'miyoushe-wiki-4609': {
    title: '开拓者笔记：万敌',
    sourceType: 'official-community-wiki',
    url: 'https://bbs.mihoyo.com/sr/wiki/content/4609/detail',
    coveredAreas: ['stats', 'ascension', 'skills', 'traces', 'eidolons', 'builds', 'teams'],
  },
} as const;
```

实际记录还必须补 `accessedAt`、`applicableVersions`、`coveredFieldPaths`、`publisher` 和链接状态。

### 6.2 内容分类

| 内容 | 分类 | 发布要求 |
| --- | --- | --- |
| 城邦、神权、角色定位、技能文本、星魂文本 | 官方信息 | 人工对照页面/游戏内文本，字段级来源 |
| 光锥、遗器、词条、配队和循环 | 玩法建议 | 攻略作者、理由、版本、复核日期 |
| 首页氛围文案、摘要与导览 | 站点原创 | 明确标记，不仿官方口吻 |
| 版本冲突、无法确认的字段 | 待确认 | 不显示猜测值 |

### 6.3 禁止事项

- 禁止自动抓取后直接发布；
- 禁止复制参考页面长篇故事、攻略解析和完整技能词条；
- 禁止复制参考页图片、图标、背景、音频、视频和 CSS；
- 禁止把米游社社区攻略标为官方结论；
- 禁止只凭当前页面默认版本写入数值，必须记录选中的版本；
- 禁止将当前未审计的 `Mydei/images/*` 直接认定为可发布素材。

## 7. TypeScript 数据文件拆分

替换当前单一 `Mydei/src/content.ts`：

```text
Mydei/src/content/
├── release.ts
├── sources.ts
├── authors.ts
├── mydei/
│   ├── overview.ts
│   ├── stats.ts
│   ├── skills.ts
│   ├── traces.ts
│   ├── eidolons.ts
│   ├── ascension.ts
│   ├── builds.ts
│   ├── teams.ts
│   ├── rotations.ts
│   ├── story.ts
│   └── gallery.ts
├── library/
└── changelog.ts
```

现有架构文档中的 `ContentMeta`、`SourceRef`、`AssetRef`、`Skill`、`TraceGraph`、`Eidolon`、`BuildRecommendation`、`TeamComposition` 和 `CombatRotation` 作为类型基线。

必须补充的构建校验：

- ID 唯一、引用存在；
- 行迹前置节点存在且无环；
- 星魂 1–6 不重复；
- 官方字段有一手来源；
- 建议/原创有作者；
- 版本敏感内容有版本；
- 所有内容有核验日期；
- 图片有 alt、尺寸、来源、权利方和授权状态；
- 未获授权图片不得进入 `dist`；
- 待确认字段不得包含确定数值；
- 构建日期不能早于内容复核日期。

## 8. 组件和文件改造任务

| ID | 修改范围 | 实施内容 | 验收方式 |
| --- | --- | --- | --- |
| FS-01 | `vite.config.ts` | 扩展现有 root/base/旧页 inputs，加入干净路由；让静态渲染覆盖所有目标页 | `dist` 包含首页、sources、library、about、changelog |
| FS-02 | `package.json` / README | 审阅现有 README，补 pnpm 锁定方式、内容流程、测试、预览和回滚说明 | 全新 clone 可按 README 完成 install/build/test |
| FS-03 | `models/*` | 落地 ContentMeta、来源、版本、作者、素材授权模型 | 类型检查通过；非法 fixture 编译/校验失败 |
| FS-04 | `content/*` | 拆分当前 `content.ts`，登记两条参考来源 | 每条发布字段可追溯到来源和版本 |
| FS-05 | build plugin | 重构现有 `transformIndexHtml`，复用安全 renderer 并覆盖全部目标页 | JS 禁用时核心正文可见；无重复模板 |
| FS-06 | `app.ts` | 删除运行时内容重绘，拆为 navigation/tabs/gallery/section-spy controllers | 每个 controller 可单测/销毁；无内置文案和 `innerHTML` 内容覆盖 |
| FS-07 | SiteLayout | 新建共享页头、导航、Footer、skip link、SourceNotice | 所有页面使用同一结构，没有复制漂移 |
| FS-08 | styles | 拆 token/base/layout/components，删除远程字体 import | 无 Google Fonts 请求；旧页视觉统一 |
| FS-09 | MydeiHero | 审阅现有 768/1280 WebP `<picture>`，补准确尺寸、可选 AVIF、预加载和回退策略 | 移动端命中约 76 KB WebP，不请求 4 MB 原图；LCP/CLS 达标 |
| FS-10 | CharacterDossier | 实现主视觉 + 档案卡 + 内容标签 + 版本提示 | 360–1440 px 均可读；字段级待确认正确 |
| FS-11 | SkillTabs | 技能摘要、详情、倍率表、深链接、无 JS 降级 | 键盘 tabs、刷新、返回、移动 details 全通过 |
| FS-12 | TraceTree | 桌面依赖图、移动顺序列表 | 图与文本关系一致；无横向页面溢出 |
| FS-13 | EidolonGrid | 1–6 网格/列表、摘要和展开 | 1/2/3 列响应式；官方/解读分层 |
| FS-14 | BuildRecommendations | 晋阶、光锥、遗器、词条、理由和版本 | 无虚构精确收益；每项有作者/来源 |
| FS-15 | TeamComposition | 职责槽、替代位、优缺点和适用场景 | 不依赖头像识别；移动顺序正确 |
| FS-16 | CombatRotation | 3–6 步循环、异常分支和误区 | 使用 `ol`；无动画也可理解 |
| FS-17 | legacy pages | 迁移关于、馆藏、日志；处理 record 占位 | 所有旧 URL 有内容或兼容跳转，无“制作中”核心入口 |
| FS-18 | sources | 建来源/勘误/非官网完整页面 | 内容类型、版本、作者、核验日期可检索 |
| FS-19 | assets | 生成 AVIF/WebP/JPEG 多尺寸并建素材台账 | 未授权素材不进 dist；首屏选中源约 ≤200 KB |
| FS-20 | tests | 补 Vitest、Playwright、链接、无障碍和预算检查 | 第 11 节测试矩阵通过 |

## 9. 原有页面统一迁移

| 现有文件 | 目标处理 |
| --- | --- |
| `Mydei/index.html` | 保留为专题首页入口，结构改为构建期渲染 |
| `Mydei/HomePage/homepage.html` | 兼容跳转到 `/#overview`；其有效文案并入专题首页 |
| `Mydei/About/about.html` | 迁移到 `/about/`，使用统一 SiteLayout；黄金蜜饼降为彩蛋/轶事 |
| `Mydei/About/Library/library.html` | 迁移到 `/library/`，统一长文样式并先做来源/版权审计 |
| `Mydei/About/Record/record.html` | 不保留“制作中”；兼容跳转到 `/#rotation` 或 `/#story` |
| `Mydei/ChangeLog/changelog.html` | 迁移到 `/changelog/`，使用统一内容版本卡 |
| `homepage/about/library/changelog.css` | 内容迁移完成后删除，改用共享样式 |
| `common.js` | 功能迁入 controllers 后删除 |

旧路径文件删除必须晚于真实托管环境的重定向验证；不确定时保留轻量兼容页。

## 10. 实施顺序

### Phase A：先修基础，不改内容

1. 固化当前工作树和回滚 commit；
2. 审阅并补全 README、Node/pnpm 版本和 CI；
3. 扩展现有 Vite MPA 和静态渲染插件；
4. 建内容 schema、来源表、作者表、素材台账和校验器；
5. 删除客户端重复渲染，把内容唯一收敛到构建期静态 HTML。

退出条件：lint、typecheck、unit、build 全通过；禁用 JS 可见 P0 骨架和已有内容。

### Phase B：统一视觉外壳

1. 拆分 token/global/components CSS；
2. 实现共享 SiteLayout、Navigation、Footer；
3. 删除远程字体请求；
4. 迁移 about/changelog 外壳；
5. 完成六个指定宽度的导航与布局测试。

退出条件：所有页面看起来属于同一站点；360 px 无横向溢出；键盘主导航可用。

### Phase C：角色设定

1. 完成 CharacterDossier；
2. 人工登记参考页中的可发布字段及版本；
3. 实现官方信息、原创导语、待确认标签；
4. 接入角色故事入口、关系入口和来源；
5. 优化 hero 图片。

退出条件：字段级来源和状态可见；未核验内容不写成事实；首屏性能达标。

### Phase D：技能、养成和配队

1. 按版本录入技能、行迹、星魂；
2. 录入晋阶与材料；
3. 由玩法负责人编写光锥、遗器、词条、配队和循环；
4. 明确攻略作者和版本；
5. 完成所有组件和深链接测试。

退出条件：P0 每个模块至少包含经核验的有效内容，不以整屏“待确认”代替功能。

### Phase E：馆藏与增强内容

1. 逐项审计馆藏版权和来源；
2. 迁移可发布摘要，长原文根据许可保留、改写或外链；
3. 授权素材满足门槛后再开放画廊；
4. 完成故事剧透控制、关系图等 P1 功能。

### Phase F：验收与切换

1. 执行完整测试矩阵；
2. 在预览环境验证 MPA、旧 URL、缓存和 404；
3. 产品、内容、设计、工程共同签字；
4. 由获授权负责人部署；
5. 演练回滚到上一份静态产物。

## 11. 测试矩阵

| 范围 | 自动化 | 人工验收 |
| --- | --- | --- |
| 构建 | lint、typecheck、unit、MPA build | 全新环境按 README 构建 |
| 内容 | 来源、版本、作者、授权、引用、待确认校验 | 内容负责人字段级复核 |
| 路由 | 内部链接、hash、旧 URL、404 | 直接访问/刷新/前进/后退 |
| 响应式 | Playwright 360/390/768/1024/1280/1440 | 手机、平板、桌面实机抽检 |
| 无 JavaScript | Playwright JS-disabled | 核心内容和链接完整可用 |
| 键盘 | tabs、菜单、details、dialog | 完整键盘流程、焦点回收 |
| 读屏 | axe 基础扫描 | 至少一次 NVDA/VoiceOver 抽检 |
| reduced-motion | 模拟 media query | 无持续动画、内容不延迟出现 |
| 性能 | Lighthouse 3 次、资源预算 | 慢速移动网络瀑布检查 |
| SEO | title/description/canonical/OG/JSON-LD | 搜索摘要和分享预览检查 |

性能门槛：LCP ≤ 2.5 s、INP ≤ 200 ms、CLS ≤ 0.1；固定环境 Lighthouse Mobile Performance ≥ 90、Accessibility ≥ 95、SEO ≥ 95。

## 12. Definition of Done

- [ ] 所有页面使用统一 SiteLayout 和主题变量；
- [ ] 没有旧版页面样式孤岛；
- [ ] 角色设定采用主视觉 + 档案卡的信息组织，但没有复制参考站视觉资产；
- [ ] 技能、养成、配队采用清晰长页目录和结构化详情；
- [ ] 所有发布事实有来源、版本和核验日期；
- [ ] 所有攻略建议有作者、理由、版本和复核日期；
- [ ] 未核验数据没有确定值；
- [ ] 未授权素材没有进入 `dist`；
- [ ] 禁用 JavaScript时核心内容完整；
- [ ] 360、390、768、1024、1280、1440 px 全部通过；
- [ ] 键盘、读屏、reduced-motion 和缩放验收通过；
- [ ] 首屏不再发送 4.07 MB 原图；
- [ ] lint、typecheck、unit、E2E、链接、内容和构建检查通过；
- [ ] 旧 URL 有兼容方案；
- [ ] 有可执行的静态产物回滚方案；
- [ ] 未擅自部署或修改任何外部服务。

## 13. 给全栈的开工指令

从 Phase A 开始，不要先填角色数值，也不要继续扩写当前 `content.ts` 的占位数组。第一批 PR 应只完成：

1. 扩展现有 Vite MPA 与构建期静态渲染，消除客户端重复渲染；
2. 完整内容 schema、来源/作者/素材授权模型；
3. `app.ts` controller 拆分；
4. 共享 SiteLayout 和 CSS token；
5. 无 JavaScript与六个 viewport 的测试骨架；
6. 补全现有 README、CI 和回滚基线。

第一批 PR 通过后，再由内容负责人基于两个参考页逐字段人工核验，工程只接入已签字的数据。任何页面视觉或内容需求若需要复制参考站资源、长文本或源码，应停止实施并改为本站原创表达。
