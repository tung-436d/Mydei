# 万敌专题站多页面重构执行方案

> 状态：可直接交付全栈实施
>
> 更新日期：2026-08-29
>
> 范围：本阶段只改架构与实施方案；业务代码、素材和外部服务由后续实施任务处理。

## 1. 已确定的产品基线

以下均为产品确定事项，不是评估项或候选方案：

1. 首页收敛为一屏沉浸式 Hero，不再承载角色档案、技能、星魂、馆藏、图集或任何推荐内容。
2. 角色档案、技能、星魂、馆藏拆为可由导航直达、具有稳定 URL 的独立页面。
3. 技能与星魂文案以指定的[万敌角色资料页](https://hsr.nanoka.cc/character/1404/)为已确认内容输入，结构化存入项目本地；不使用 iframe，不复刻第三方 UI。
4. 推荐配装、光锥推荐、遗器推荐、词条建议及相关玩法推荐完全删除，不得以“养成、攻略、队伍、循环”等名称换壳保留。
5. 角色立绘动效、星魂图标和星魂静态图片必须本地化，运行时不得请求第三方媒体 URL。星魂不使用动图。
6. 不显示来源、勘误、审核中、待确认、待核验或占位状态；不建设相应工作流。
7. 继续沿用本站黑曜石、深红、古金、暖白主题，保留非官方网站及权利归属声明。

本文覆盖旧 PRD 和旧架构中与下列内容相关的结论：单页长首页、首页锚点导航、养成/配队/战斗轴、来源审核、旧三项导航。旧文档可作为历史审计材料，但实施以本文为准。

### 1.1 已识别的产品表述冲突

此前验收曾要求旧“首页 / 关于 / 更新日志”导航不得继续出现，本次又明确要求站点地图覆盖首页并由统一导航进入独立页。实施解释为：

- 禁止恢复旧的三项导航组合、旧样式和旧布局。
- 新版六项导航可以包含“首页”，其余“关于 / 更新日志”仍删除。
- 这是新版多页面导航，不是旧导航的保留或迁移。

无需再次向产品确认。

## 2. 当前架构与影响摘要

### 2.1 当前技术栈

- Vite 7 多页面构建，项目根为 `Mydei/`。
- TypeScript 静态数据 + 构建期 HTML 字符串渲染。
- 原生控制器管理导航、Tabs、馆藏折叠、图片失败等增强交互。
- Vitest 执行内容校验，Playwright 执行桌面、移动、无 JavaScript、路由与可访问性测试。
- CSS 已有黑曜石、深红、古金、暖白 tokens，可继续复用。

### 2.2 与本次决策冲突的现状

- `Mydei/index.html` 仍是长首页，含概览、技能、行迹、星魂、培养、配队、循环、故事和图集区块。
- 首页“查看玩法建议”仍指向 `#builds`。
- 导航仍是“概览 / 技能 / 养成 / 配队 / 故事 / 馆藏”的首页锚点结构。
- `vite.config.ts` 仍导入、验证和渲染 `builds`、`teams`、`rotations`。
- `models/content.ts`、内容文件、渲染器和测试仍包含推荐配装、队伍和循环类型。
- 技能与星魂目前只有文本；星魂没有本地图标和静态图片字段。
- 正式构建入口目前只有首页、馆藏和 404，不满足独立档案、技能、星魂、图集页面要求。

## 3. 新版站点地图与导航

### 3.1 正式页面

| 顺序 | 导航名称 | 稳定 URL | 页面职责 |
|---:|---|---|---|
| 1 | 首页 | `/` | 一屏沉浸式角色封面与必要 CTA |
| 2 | 角色档案 | `/profile/` | 基础资料、属性、晋阶材料、行迹与已有故事介绍 |
| 3 | 技能 | `/skills/` | 普攻、战技及强化形态、终结技、天赋、秘技、附加能力 |
| 4 | 星魂 | `/eidolons/` | E1–E6 名称、说明、图标与静态图片 |
| 5 | 馆藏 | `/library/` | 现有 17 项馆藏长文与折叠阅读 |
| 6 | 图集 | `/gallery/` | 已存在的 4 项本地视觉素材 |
| — | 404 | `/404.html` | 真实无匹配页面，不进入主导航 |

不建立 `/builds/`、`/guides/`、`/teams/`、`/rotation/`、`/about/`、`/sources/` 或 `/changelog/`。

### 3.2 页面内稳定锚点

- `/profile/#stats`
- `/profile/#ascension`
- `/profile/#traces`
- `/profile/#story`
- `/skills/#basic`
- `/skills/#skill`
- `/skills/#skill-enhanced-king`
- `/skills/#skill-enhanced-god`
- `/skills/#ultimate`
- `/skills/#talent`
- `/skills/#technique`
- `/skills/#bonus-abilities`
- `/eidolons/#eidolon-01` 至 `/eidolons/#eidolon-06`
- `/library/#<entry-id>` 保持现有馆藏深链。

锚点 ID 为代码契约；技能名称变更时不随中文标题变化，避免外链失效。

## 4. 首页与其他页面的内容边界

### 4.1 首页 `/`

首页 DOM 只允许：

```text
HomePage
├─ SiteNavigation
├─ MydeiHero
│  ├─ ThemeBadge
│  ├─ 中文标题：万敌
│  ├─ 英文名：MYDEI
│  ├─ 固定角色介绍
│  ├─ 角色主视觉
│  └─ HeroActions
│     ├─ 查看角色档案 → /profile/
│     └─ 查看技能 → /skills/
└─ Footer（compact）
   └─ 非官方网站与相关权利归属声明
```

角色介绍必须逐字采用：

> 不死的迈德漠斯，离群的狮子，逐猎「纷争」火种的黄金裔。

“查看玩法建议”按钮直接改为“查看技能”，目标 `/skills/`；不得保留 `#builds` 或其他推荐入口。星魂通过常驻导航进入 `/eidolons/`。

首页布局容器使用 `min-height: 100svh`，由 Header、Hero 和 compact Footer 共同组成。短高度或放大文本场景允许自然纵向滚动，禁止用固定高度裁掉文本；“一屏”表示只有一个 Hero 内容区，Hero 后不再挂载其他业务模块。

首页不得渲染：

- `CharacterOverview`、`StatPanel`、`SkillTabs`、`TraceTree`、`EidolonGrid`。
- 馆藏预览、故事时间线、语录卡片和图集。
- 推荐配装、光锥、遗器、词条、配队、战斗循环。
- 来源、勘误、审核状态、空卡片、“即将上线”等占位。

### 4.2 角色档案 `/profile/`

只展示已有且确认的事实型内容：角色介绍、属性、晋阶材料、行迹总属性/附加能力、现有故事简介。晋阶材料属于角色资料，不是推荐配装，可保留。

不展示光锥、遗器、词条优先级、队伍、轮转建议或任何“最佳选择”结论。

### 4.3 技能 `/skills/`

- 技能文案与指定资料页一致，由本地 `skills.ts` 提供。
- 第一级分类：普攻、战技、终结技、天赋、秘技、附加能力。
- 战技内部单独呈现“万死无悔、弑王成王、弑神登神”等页面实际存在的形态，不把三者拼成一个不可深链的大段文本。
- 展示技能类别、名称、类型、说明、能量/回能、削韧、战技点等页面实际存在字段。
- 倍率表若录入，必须保存完整等级维度；没有被确认的等级值不插值、不推算。
- 不显示该资料页的推荐配装区，也不迁移其 UI。

### 4.4 星魂 `/eidolons/`

- E1–E6 固定顺序，每项包含等级、名称、说明、本地图标和静态图片。
- 文案与指定资料页一致；组件使用本站卡片、排版和交互。
- 星魂不加载或播放动图；图片失败时仍须保留名称和说明。
- 每项具有稳定锚点，可从导航或外链直接定位。

### 4.5 馆藏 `/library/`

沿用已确定的深色高对比馆藏方案：原生 `<details>/<summary>`、标题和摘要收起态可读、正文达到 WCAG AA、键盘/触屏可展开、390px 无页面横向滚动。

### 4.6 图集 `/gallery/`

迁移当前已有 4 项本地图片。图集独立页不从首页继续堆叠；大图按需加载，图片失败时保留 alt 与占位背景。

## 5. 页面与组件树

```text
SiteLayout
├─ SkipLink
├─ SiteNavigation
├─ PageMain
│  ├─ HomePage
│  │  └─ MydeiHero
│  ├─ ProfilePage
│  │  ├─ CharacterOverview
│  │  ├─ StatPanel
│  │  ├─ AscensionMaterials
│  │  ├─ TraceList
│  │  └─ LoreSummary
│  ├─ SkillsPage
│  │  ├─ SkillPageNavigation
│  │  └─ SkillSection
│  │     ├─ SkillCard
│  │     └─ SkillScalingTable（有数据时）
│  ├─ EidolonsPage
│  │  └─ EidolonList
│  │     └─ EidolonCard
│  │        └─ EidolonMedia
│  ├─ LibraryPage
│  │  ├─ LibraryTableOfContents
│  │  └─ LibraryEntryList
│  └─ GalleryPage
│     └─ Gallery
└─ Footer（compact | full）
```

`BuildRecommendations`、`TeamComposition`、`CombatRotation` 和 `SourceNotice` 不进入目标组件树。

## 6. 组件边界

### 6.1 `SiteLayout`

- 接收 `activePage`、`basePath`、SEO 元数据、`footerVariant` 和页面 body。
- 只负责全局骨架、SkipLink、导航、Main、Footer 和公共资源。
- 不读取技能、星魂或馆藏业务数据。
- 首页传 `footerVariant: 'compact'`；其他正式页传 `full`。

### 6.2 `SiteNavigation`

- 固定六项顺序：首页、角色档案、技能、星魂、馆藏、图集。
- 所有链接均为独立 URL，不依赖首页锚点。
- 使用 `aria-current="page"` 标识当前页。
- 移动菜单关闭后焦点返回触发按钮，Escape 可关闭，无 JavaScript 时链接仍显示或可访问。
- 不包含养成、攻略、配队、来源、关于和更新日志。

### 6.3 技能组件

- `SkillsPage` 负责标题、页内目录和技能列表。
- `SkillSection` 负责一个一级技能分类。
- `SkillCard` 只消费一个 `SkillData`，不读取全局数据或拼接长篇硬编码文案。
- 强化战技使用独立 `formId` 和锚点，但通过 `parentSkillId` 归属于战技。
- 大屏可使用粘性目录 + 单列技能正文；小屏使用横向可滚动的页内目录，但正文自身不横滚。

### 6.4 星魂组件

- `EidolonsPage` 保证 E1–E6 顺序并生成页面结构。
- `EidolonCard` 负责名称、等级、说明和媒体布局。
- `EidolonMedia` 负责图标、静态图片、宽高占位和失败回退。
- 媒体组件只接收本地 `MediaAsset`，禁止接收任意远程 URL。
- 媒体失败不能隐藏星魂名称和说明。

### 6.5 Footer

- compact：仅首页使用，保留非官方网站与权利归属声明。
- full：其他页面使用，可含站点简介、联系、返回顶部和正式页面快捷链接。
- 两种变体来自同一组件，不得复制两套声明。
- 不包含来源、勘误、审核、About 或 Changelog 入口。

## 7. 技能与星魂本地数据结构

### 7.1 通用类型

```ts
export type SkillCategory =
  | 'basic'
  | 'skill'
  | 'ultimate'
  | 'talent'
  | 'technique'
  | 'bonus-ability';

export interface DisplayValue {
  label: string;
  value: string;
  context?: string;
}

export interface SkillScalingRow {
  level: number;
  values: DisplayValue[];
}

export interface SkillData {
  id: string;
  category: SkillCategory;
  name: string;
  typeLabel?: string;
  parentSkillId?: string;
  formId?: string;
  isAutomatic?: boolean;
  description: string[];
  mechanics: DisplayValue[];
  scaling?: SkillScalingRow[];
  glossary?: Array<{ term: string; definition: string }>;
  gameVersion?: string;
}
```

推荐内容相关的 `rank`、`rationale`、`useCase`、`alternatives` 不进入技能模型。技能机制原文与站点解释也不混装；本期不增加站点玩法解释字段。

### 7.2 媒体类型

```ts
export interface LocalMediaAsset {
  path: string;             // 仅允许 assets/... 相对路径
  mimeType: 'image/webp' | 'image/gif' | 'image/apng' | 'video/webm' | 'video/mp4';
  width: number;
  height: number;
  byteSize: number;
  alt: string;
}

export interface EidolonMediaSet {
  icon: LocalMediaAsset;
  poster: LocalMediaAsset;
}

export interface CharacterMediaSet {
  poster: LocalMediaAsset;
  motion?: LocalMediaAsset;
}

export interface EidolonData {
  id: `eidolon-${'01'|'02'|'03'|'04'|'05'|'06'}`;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  name: string;
  description: string[];
  media: EidolonMediaSet;
}
```

`path` 的内容校验必须拒绝：`http://`、`https://`、协议相对 URL、`data:` 和域名。`width`、`height`、`byteSize` 用于布局占位和资源预算，不用于审核展示。

### 7.3 数据文件边界

```text
Mydei/src/content/mydei/
├─ profile.ts
├─ ascension.ts
├─ traces.ts
├─ skills.ts
├─ eidolons.ts
├─ story.ts
├─ library.ts
└─ gallery.ts
```

- `skills.ts` 只保存技能/附加能力内容。
- `eidolons.ts` 保存 E1–E6 文案及本地媒体清单。
- 页面展示组件不硬编码技能或星魂长文。
- 可在迁移脚本或开发注释中记录资料快照，但 UI、导航和 Footer 不生成来源或审核模块。

## 8. 角色与星魂素材本地化方案

### 8.1 最终目录与命名

Vite 根为 `Mydei/`，最终目录确定为：

```text
Mydei/public/assets/mydei/eidolons/
├─ eidolon-01-icon.webp
├─ eidolon-01.webp
├─ eidolon-02-icon.webp
├─ eidolon-02.webp
├─ eidolon-03-icon.webp
├─ eidolon-03.webp
├─ eidolon-04-icon.webp
├─ eidolon-04.webp
├─ eidolon-05-icon.webp
├─ eidolon-05.webp
├─ eidolon-06-icon.webp
└─ eidolon-06.webp

Mydei/public/assets/mydei/character/
├─ mydei-poster.webp
└─ mydei-animated.<真实扩展名>
```

规则：

- 小写英文、两位序号和连字符；不保留查询参数、哈希或远程原文件名。
- `*-icon.webp` 为星魂图标，`eidolon-*.webp` 为星魂静态图片；星魂不建立 GIF。
- 只有角色立绘使用动效。下载文件必须通过文件头和 MIME 校验，保留实际 GIF、animated WebP、APNG 或视频格式，不得只改扩展名。
- 角色动效是渐进增强；若确认页仅提供不能由浏览器原生播放的骨骼动画资源，则保留静态图片降级，不复制第三方运行时，也不伪造单文件动图。

### 8.2 相对路径引用

数据文件使用不带协议、不带域名、不带开头斜杠的逻辑路径：

```ts
const eidolon01: EidolonData = {
  id: 'eidolon-01',
  level: 1,
  name: '…',
  description: ['…'],
  media: {
    icon: { path: 'assets/mydei/eidolons/eidolon-01-icon.webp', /* ... */ },
    poster: { path: 'assets/mydei/eidolons/eidolon-01.webp', /* ... */ },
  },
};
```

渲染器通过当前页面的 `basePath` 生成 `../assets/...` 等最终相对 URL。不得在数据中写 `static.nanoka.cc` 或任何第三方主机。

### 8.3 下载与验收流程

1. 建立一次性素材清单，逐阶记录图标、静态图，并记录唯一角色立绘动效候选 URL；该清单仅用于下载，不进入页面 UI。
2. 下载到临时目录，校验 HTTP 成功、MIME、文件头、像素尺寸；角色动画还需校验帧数或视频时长。
3. 星魂保持静态真实格式；角色动画保持下载到的真实格式，不强制转换为 GIF。
4. 去除随机文件名和查询参数，按最终命名移动到 `public/assets/mydei/eidolons/`。
5. 生成/更新 `eidolons.ts` 的路径、尺寸和字节数。
6. 构建后断网运行 E2E，确认星魂静态媒体与可用的角色动效均从 `dist/assets/...` 加载。
7. 网络请求测试拦截并拒绝非本站 origin 的图片、视频和媒体请求。

本阶段文档不执行下载；后续素材任务执行下载时应遵循站点使用条款和权利归属声明，不新增来源或勘误页面。

## 9. 角色动图性能、懒加载与降级

### 9.1 加载策略

- 首次 HTML 只输出角色静态封面 `src`；动效路径放在 `data-motion-src`，不立即请求。
- 桌面端：角色媒体进入近视口后才允许加载唯一动效。
- 手机和平板：默认静态封面，用户点击“播放动图”后才加载角色动效。
- 离开视口或点击“停止动图”时恢复角色静态封面；再次播放可重新开始。
- 动图不参与 LCP，不使用 `preload`，不设置高优先级。

### 9.2 尺寸和布局稳定性

- 数据中记录准确 `width`/`height`。
- 媒体容器使用固定 `aspect-ratio`，图片 `width: 100%; height: 100%; object-fit: cover`。
- 封面和动图必须使用相同展示比例；若源比例不同，在构建素材阶段补安全裁切/留边，不在运行时改变容器尺寸。
- 加载状态显示主题色骨架，不用会改变高度的文本占位。
- 目标：移动端切换封面/动图时该卡片布局位移为 0，页面 CLS 不因动图增加。

### 9.3 压缩预算

- 图标：建议单个不超过 40 KB。
- 静态封面：按实际显示宽度生成，建议单个不超过 180 KB。
- 角色动效建议不超过 3 MB；超过预算时记录真实性能结果，不以静态首帧冒充动图。
- 预算是构建告警线，不允许为过线而自动取首帧。超线需出具文件大小、帧数、时长和移动网络测试结果再决策。

### 9.4 reduced-motion

在 `prefers-reduced-motion: reduce` 下：

- 不自动加载或播放 GIF，只显示静态封面。
- 隐藏自动播放行为；可保留明确的“播放动图”按钮供用户主动选择。
- 关闭媒体淡入、缩放、位移和平滑滚动。
- 页面内容、锚点、键盘顺序和媒体 alt 不受影响。

### 9.5 失败降级

1. 角色动效失败：保留角色静态封面，显示非阻塞文本“动图暂时无法加载”，提供重试按钮。
2. 星魂静态图片失败：退回星魂图标和深红占位背景。
3. 图标也失败：显示 `E1`–`E6` 文本徽章；名称和说明始终可读。
4. 错误状态不显示第三方 URL，不回退远程热链。

## 10. 桌面端与移动端结构

### 10.1 首页

| 视口 | 结构 |
|---|---|
| `>= 1024px` | 左侧标题/介绍/CTA，右侧主视觉；compact Footer 位于视口底部 |
| `640–1023px` | 文案与角色图适度重叠，CTA 保持可见，导航可折叠 |
| `< 640px` | 单列叠放，角色图作为受控背景/下半区；按钮可换行但不溢出 |

在 390px 宽度下不得横向滚动。缩放 200% 或短高度时允许向下滚动，以可读性优先，不固定裁切 Hero。

### 10.2 角色档案与技能

- 桌面端：最大宽度 76rem，左侧 14–16rem 粘性页内目录，右侧单列正文。
- 平板/手机：目录变为顶部可折叠/横向滚动导航；属性与材料卡片从多列降为单列。
- 技能说明正文最大宽度 72ch；倍率表在自身容器内横向滚动，不让页面横滚。
- Tabs 仅用于同一分类的形态切换；所有形态仍应存在稳定锚点并在无 JavaScript 时可读。

### 10.3 星魂

- 桌面端：两列卡片，媒体与说明可左右布局；单列阅读顺序始终为 E1→E6。
- 平板：单列卡片，媒体上、说明下。
- 手机：边距 14–16px，播放按钮最小 44×44px，媒体容器预留比例，GIF 不自动下载。
- 不使用会打乱语义顺序的 CSS masonry。

### 10.4 馆藏和图集

- 馆藏沿用桌面目录 + 正文、移动折叠目录方案。
- 图集桌面可 2–3 列，手机单列；缩略图本地懒加载，大图 dialog 支持 Escape 和焦点返回。

## 11. 目标目录结构

```text
Mydei/
├─ public/
│  └─ assets/mydei/eidolons/
├─ index.html
├─ profile/index.html
├─ skills/index.html
├─ eidolons/index.html
├─ library/index.html
├─ gallery/index.html
├─ 404.html
└─ src/
   ├─ entries/
   │  ├─ home.ts
   │  ├─ profile.ts
   │  ├─ skills.ts
   │  ├─ eidolons.ts
   │  ├─ library.ts
   │  └─ gallery.ts
   ├─ content/mydei/
   │  ├─ profile.ts
   │  ├─ ascension.ts
   │  ├─ traces.ts
   │  ├─ skills.ts
   │  ├─ eidolons.ts
   │  ├─ story.ts
   │  ├─ library.ts
   │  └─ gallery.ts
   ├─ models/content.ts
   ├─ render/
   │  ├─ layout.ts
   │  ├─ home-page.ts
   │  ├─ profile-page.ts
   │  ├─ skills-page.ts
   │  ├─ eidolons-page.ts
   │  ├─ library-page.ts
   │  ├─ gallery-page.ts
   │  └─ components/
   │     ├─ navigation.ts
   │     ├─ hero.ts
   │     ├─ profile.ts
   │     ├─ skill.ts
   │     ├─ eidolon.ts
   │     ├─ media.ts
   │     ├─ library.ts
   │     ├─ gallery.ts
   │     └─ footer.ts
   ├─ controllers/
   │  ├─ navigation.ts
   │  ├─ skill-navigation.ts
   │  ├─ eidolon-media.ts
   │  ├─ library.ts
   │  └─ gallery.ts
   └─ styles/
      ├─ tokens.css
      ├─ base.css
      ├─ layout.css
      └─ pages/
         ├─ home.css
         ├─ profile.css
         ├─ skills.css
         ├─ eidolons.css
         ├─ library.css
         └─ gallery.css
```

该结构是职责建议。现有小型字符串渲染函数可以合并，禁止为了目录形式引入框架重写。

## 12. 删除与迁移清单

### 12.1 必须删除的内容文件

- `Mydei/src/content/mydei/builds.ts`
- `Mydei/src/content/mydei/teams.ts`
- `Mydei/src/content/mydei/rotations.ts`

### 12.2 必须删除的类型

- `BuildOption`
- `BuildRecommendation`
- `TeamSlot`
- `TeamComposition`
- `RotationStep`
- `CombatRotation`

### 12.3 必须删除的渲染与页面对象

- `buildsMarkup`
- `teamsMarkup`
- `rotationsMarkup`
- 首页 `#builds`、`#teams`、`#rotation` 区块及插槽。
- “查看玩法建议”、培养建议、推荐光锥、遗器与词条、配队建议和操作循环文案。
- 与上述区块专用且不再复用的 `.build-*`、`.team-*`、`.rotation-*` CSS。

### 12.4 必须改造的代码

- `vite.config.ts`：删除 `builds/teams/rotations` 导入、内容 bundle 字段、验证与 HTML replacement；新增四个独立页面输入（profile、skills、eidolons、gallery）。
- `content/index.ts`：删除三类推荐导出。
- `content/validate.ts`：删除推荐、队伍和循环校验；新增本地媒体路径、E1–E6 完整性、顺序、尺寸、字节数和动图资源存在性校验。
- `render.ts`：删除推荐渲染器；技能和星魂渲染拆到页面/组件文件。
- `render/layout.ts`：扩展 `ActivePage`，重建六项多页导航。
- `Mydei/index.html`：缩减为 Hero 和 compact Footer 所需插槽。
- `README.md`：删除培养、配队、输出循环范围说明，增加独立页面与本地素材维护说明。
- `tests/content.test.ts`、`tests/e2e/site.spec.ts`：删除旧推荐断言，覆盖新路由和媒体策略。

### 12.5 保留并迁移

- 当前首页角色资料 → `/profile/`。
- 当前技能与附加能力 → `/skills/`，根据指定资料页重新逐项校对与拆形态。
- 当前星魂文本 → `/eidolons/`，补本地媒体字段。
- 当前行迹、属性、晋阶材料 → `/profile/`。
- 当前故事介绍 → `/profile/#story`。
- 当前馆藏 → `/library/`。
- 当前 4 项图集 → `/gallery/`。
- 全站权利声明 → 共享 Footer。

## 13. 路由迁移与 404

### 13.1 服务端可见路径

| 旧路径 | 处理 | 新位置/结果 |
|---|---|---|
| `/index.html` | 301 | `/` |
| `/HomePage/homepage.html` | 301 | `/` |
| `/About/about.html` | 301 | `/library/#golden-honeycake` |
| `/About/Library/library.html` | 301 | `/library/` |
| `/About/Record/record.html` | 404 | 战斗循环已删除，无替代功能 |
| `/About/index.html`、`/about/` | 301 | `/profile/#site-info` |
| `/ChangeLog/*`、`/changelog/` | 404 | 功能删除 |
| `/sources/*`、`/sources/` | 404 | 功能删除 |
| `/builds/`、`/guides/` | 404 | 推荐内容删除 |
| `/teams/`、`/rotation/` | 404 | 相关玩法推荐删除 |
| 其他未知页面 | 404 | `/404.html`，真实 HTTP 404 |

### 13.2 旧首页 hash

服务器收不到 URL fragment，不能用服务端 301 处理 `/#skills`。首页入口脚本只保留一次性 hash 兼容映射：

| 旧 hash | 客户端 `location.replace` 目标 |
|---|---|
| `#overview` | `/profile/` |
| `#skills` | `/skills/` |
| `#eidolons` | `/eidolons/` |
| `#story` | `/profile/#story` |
| `#gallery` | `/gallery/` |
| `#builds`、`#teams`、`#rotation` | `/404.html` |

兼容脚本不渲染旧页面、不显示过渡 UI。内部链接必须全部改为新 URL；hash 映射只用于已传播的外部旧链接。

## 14. SEO、性能与可访问性

### 14.1 SEO

- 六个正式页面使用唯一 title、description、canonical 和 Open Graph。
- 正式 origin 固定为 `https://mydeimos.love`；canonical、`og:url`、sitemap 和 robots sitemap 声明均使用该 origin。
- 每页一个 `h1`；技能与星魂正文静态存在于 HTML，不依赖点击后网络获取。
- sitemap 只包含 `/`、`/profile/`、`/skills/`、`/eidolons/`、`/library/`、`/gallery/`。
- 已删除推荐页不生成 sitemap，不返回 200 首页软 404。
- 当前产物是无 Functions/Worker 的静态 Vite 多页面站，使用 Cloudflare Pages；301 写入 `public/_redirects`，顶层 `404.html` 关闭 SPA fallback 并承担真实 404。

### 14.2 首页性能

- Hero 使用当前本地 768/1280 WebP 响应式资源和明确尺寸。
- 移动端不下载桌面超大背景；仅 Hero 主图可高优先级。
- 首页不加载技能、星魂、馆藏、图集 JS/CSS 和媒体。
- compact Footer 声明直接在 HTML 中，不依赖脚本。

### 14.3 可访问性

- 所有页面提供 SkipLink、语义化 landmark、可见焦点和正确标题层级。
- 导航键盘可用；移动菜单 Escape 关闭并恢复焦点。
- 技能页的 tabs 若使用 ARIA tabs，支持方向键、Home/End；无 JavaScript 时全部内容可读。
- 星魂播放/停止使用真实 button，按钮文案表达当前动作，不能只用图标。
- 媒体 alt 描述画面，不重复整段星魂说明。
- 暖白正文与黑曜石/深红背景达到 WCAG AA。

## 15. 实施顺序

### 阶段 0：内容与资源清单冻结

1. 以指定资料页建立技能、附加能力、E1–E6 文案对照表。
2. 列出每阶图标、静态图片和唯一角色立绘动效候选资源。
3. 记录当前本地页面和路由快照，准备内容 diff。

验收：技能形态和 E1–E6 各有唯一 ID；未引入推荐配装内容。

### 阶段 1：删除推荐领域

1. 删除 builds、teams、rotations 内容文件和导出。
2. 删除对应类型、验证、渲染、导航、CTA、CSS 和测试。
3. 先使类型检查和单测恢复通过，再开始页面拆分。

验收：全仓与 dist 静态扫描没有推荐配装及残留入口；无空插槽。

### 阶段 2：建立多页面骨架

1. 新增 profile、skills、eidolons、gallery HTML 和 entry。
2. 扩展 SiteLayout、ActivePage、六项导航和 SEO。
3. 将 Vite 输入扩展为首页、档案、技能、星魂、馆藏、图集、404。

验收：六页均 200，404 真实返回 404，导航任意页互通。

### 阶段 3：首页收敛

1. 删除首页 Hero 后的全部业务 section。
2. 固定介绍文案，保留主视觉、主题徽章和两个 CTA。
3. “查看玩法建议”改为“查看技能”并指向 `/skills/`。

验收：首页 Main 仅一个 Hero；Hero 后直接进入 compact Footer。

### 阶段 4：内容迁页与数据校对

1. 资料、属性、晋阶、行迹、故事迁到 profile。
2. 按资料页重整技能和强化形态。
3. 按 1–6 校对星魂文案并连接媒体字段。
4. 图集迁为独立页，馆藏保持高对比方案。

验收：文案逐段一致；页面不复刻第三方 UI；无推荐或审核状态。

### 阶段 5：素材本地化

1. 下载、校验并规范命名 12 个星魂静态文件，以及确认页实际可用的角色立绘媒体。
2. 写入尺寸、大小和相对路径。
3. 实现星魂静态媒体失败降级；角色动效才使用懒加载、静态优先和 reduced-motion 策略。

验收：断网可读且本地媒体正常；网络日志无第三方媒体请求；切换无布局跳动。

### 阶段 6：路由、测试与发布准备

1. 落实 301/404 和旧 hash 映射。
2. 跑完整测试矩阵与构建产物扫描。
3. 在预发布环境断网、限速、移动端和 reduced-motion 复验。

验收：所有执行矩阵项目通过，再进入现有发布流程；本任务不直接部署。

## 16. 测试矩阵

| 层级 | 场景 | 工具 | 验收标准 |
|---|---|---|---|
| 类型 | 删除推荐类型与新媒体类型 | TypeScript | 零类型错误，无 Build/Team/Rotation 引用 |
| 内容 | 技能分类与形态 | Vitest | 必含普攻、战技、终结技、天赋、秘技及实际强化形态 |
| 内容 | 星魂完整性 | Vitest | 恰好 6 项、1–6 无缺号、ID 与顺序稳定 |
| 内容 | 本地媒体路径 | Vitest | 12 个星魂静态文件存在；路径无协议、域名、查询参数 |
| 内容 | 角色动效格式 | 素材脚本/Vitest | 若存在单文件动效，文件头、MIME 与扩展名一致且确为多帧/有时长 |
| 构建 | 多页输出 | Vite + verify-dist | 六个正式页面和 404 存在，无推荐 bundle/HTML |
| E2E | 首页边界 | Playwright | Main 只有 Hero；后接 Footer；无其他内容模块 |
| E2E | 首页 CTA | Playwright | 角色档案→profile，查看技能→skills，无玩法建议 |
| E2E | 全局导航 | Playwright | 六项顺序正确，每项可直达且 aria-current 正确 |
| E2E | 技能文案 | Playwright + 快照 | 与确认数据一致，强化形态可深链 |
| E2E | 星魂顺序与文案 | Playwright | E1→E6，名称/说明/媒体均存在 |
| E2E | 星魂断网 | Playwright route | 禁止外网后图标和静态图片仍可加载 |
| E2E | 禁止热链 | Playwright request | 图片/视频/媒体请求 origin 仅为本站 |
| E2E | 角色动效懒加载 | Playwright | 进入视口/主动播放前不请求角色动效 |
| E2E | reduced-motion | Playwright | 默认只显示角色静态封面，不自动加载/播放动效 |
| E2E | 媒体失败 | Playwright | 角色动效→静态封面；星魂静态图→图标→E 级文本逐级降级 |
| E2E | 移动布局 | 390px Playwright | 无横向滚动，角色媒体切换无明显布局位移 |
| E2E | 馆藏 | Playwright | 高对比、键盘/触屏折叠、390px 可读 |
| E2E | 旧路由 | HTTP 测试 | 映射项返回正确 301/404，无软 404 |
| 无障碍 | 键盘、焦点、对比度 | axe + 人工 | 无严重问题，正文达到 WCAG AA |
| 静态扫描 | 删除内容 | `rg` | 源码与 dist 无推荐、审核、热链残留 |

建议新增静态门禁：

```powershell
rg -n "推荐配装|光锥推荐|遗器推荐|词条建议|玩法建议|培养建议|配队建议|即将上线" Mydei/src Mydei/*.html dist
rg -n "BuildRecommendation|BuildOption|TeamComposition|TeamSlot|CombatRotation|RotationStep" Mydei/src tests vite.config.ts
rg -n "https?://.*\.(gif|webp|png|jpe?g|avif|mp4)" Mydei/src Mydei/*.html dist
rg -n "来源|勘误|内容审核中|待确认|待核验|待补充" Mydei/src Mydei/*.html dist
```

产品页面和构建产物应为零结果。第一条若在架构文档中执行不适用；扫描范围限定业务源码与产物。

## 17. 风险与回滚

| 风险 | 控制措施 | 回滚策略 |
|---|---|---|
| 指定页面后续内容变化 | 实施时冻结一次数据快照并对照测试 | 回滚单个 `skills.ts`/`eidolons.ts` 提交 |
| 动画资源扩展名与实际格式不符 | 校验 MIME、文件头和帧数，不只看 URL 后缀 | 保留原始临时文件，重新规范化全帧动画 |
| GIF 总体积过大 | 点击加载、单项播放、预算告警、移动端静态优先 | 回退媒体提交；保留文字与静态封面，不恢复热链 |
| 首页固定一屏导致文字裁切 | 使用 `min-height` 而非固定 `height`，放大文本允许滚动 | 回退首页布局 CSS，不恢复长首页模块 |
| 多页相对路径错误 | 统一 `basePath` 与资源路径解析器，多页构建测试 | 回退单页入口提交并修复路径 |
| 删除推荐类型造成连锁错误 | 先按类型→数据→渲染→页面→测试顺序拆除 | 按阶段回滚，不上线空卡片 |
| 旧 hash 无法服务端重定向 | 首页入口执行小型明确映射 | 暂时保留映射脚本，不保留旧内容 |
| 媒体权利或站点条款问题 | 下载任务遵循使用条款并保留权利声明 | 移除有问题的媒体，本地占位降级；不改用热链 |
| 断网测试误用浏览器缓存 | 使用新 context、阻断外网并检查请求 URL | 修复资源打包后重建，不降级远程 URL |

回滚单位应按“推荐领域删除、多页骨架、首页收敛、内容迁移、媒体本地化、路由测试”分提交。旧长首页、推荐配装和第三方热链不得作为临时回滚页面重新上线。

## 18. 文件级任务清单

1. 删除 `builds.ts`、`teams.ts`、`rotations.ts`。
2. 清理 `content/index.ts` 和 `models/content.ts` 对应导出与类型。
3. 改造 `content/validate.ts`，新增本地媒体和星魂完整性规则。
4. 删除 `render.ts` 的 builds/teams/rotations 渲染器。
5. 重构 `render/layout.ts` 的 ActivePage、六项导航和 Footer 变体。
6. 缩减 `index.html`，新增 `profile/index.html`、`skills/index.html`、`eidolons/index.html`、`gallery/index.html`。
7. 新建各页面 renderer/entry，并让页面内容构建期静态输出。
8. 重整 `skills.ts`，拆开战技强化形态，逐项校对指定资料页。
9. 扩展 `eidolons.ts`，加入本地 icon/poster。
10. 建立 `public/assets/mydei/eidolons/` 和 `public/assets/mydei/character/`，本地化 12 个星魂静态资源及实际可用的角色媒体。
11. 新增角色媒体控制器，实现按需播放、静态优先与失败降级；星魂媒体仅处理静态失败回退。
12. 拆分页面 CSS，清除推荐相关选择器，沿用现有 tokens。
13. 修改 `vite.config.ts` 的数据 bundle、构建输入、route rules 和 canonical。
14. 更新 README 的页面、内容和素材维护方式。
15. 重写 Vitest、Playwright 和 dist 校验。
16. 完成预发布断网、限速、390px、键盘和 reduced-motion 验收。

## 19. 执行矩阵

| 现有对象 | 删除或迁移方式 | 新页面或目录 | 数据依赖 | 验收标准 |
|---|---|---|---|---|
| 首页长页面 | 删除 Hero 后全部业务区块 | `/` | 固定介绍、Hero 资源 | Main 仅一个 Hero，后接 compact Footer |
| 首页角色介绍 | 替换为确定文案 | `MydeiHero` | overview | 文案逐字一致 |
| “查看角色资料” | 改名/保留语义 | `/profile/` | 导航路由 | 点击进入角色档案 |
| “查看玩法建议” | 删除并替换 | `/skills/` | 无推荐数据 | 显示“查看技能”，无旧锚点 |
| 首页 `#overview` | 从首页删除并迁移 | `/profile/` | stats/profile | 首页无档案卡，独立页内容完整 |
| 首页 `#skills` | 从首页删除并迁移 | `/skills/` | skills | 稳定 URL 和技能深链可用 |
| 首页 `#eidolons` | 从首页删除并迁移 | `/eidolons/` | eidolons/media | E1–E6 顺序完整 |
| 首页 `#story` | 从首页删除并迁移 | `/profile/#story` | story | 已有介绍可读，无薄空页面 |
| 首页 `#gallery` | 从首页删除并迁移 | `/gallery/` | gallery/assets | 4 项本地图片完整 |
| 首页 `#builds` | 完全删除 | 404 | 无 | 无空白、按钮、锚点或占位 |
| 首页 `#teams` | 完全删除 | 404 | 无 | 不以配队/攻略换名保留 |
| 首页 `#rotation` | 完全删除 | 404 | 无 | 不以循环/技巧换名保留 |
| `content/mydei/builds.ts` | 删除文件 | 无 | 无 | 文件和导出不存在 |
| `content/mydei/teams.ts` | 删除文件 | 无 | 无 | 文件和导出不存在 |
| `content/mydei/rotations.ts` | 删除文件 | 无 | 无 | 文件和导出不存在 |
| Build 类型 | 删除 | 无 | models | TypeScript 零引用 |
| Team 类型 | 删除 | 无 | models | TypeScript 零引用 |
| Rotation 类型 | 删除 | 无 | models | TypeScript 零引用 |
| 推荐渲染器 | 删除 | 无 | render | bundle 中无对应函数 |
| 推荐 CSS | 删除专用规则 | 无 | styles | 构建 CSS 无遗留选择器 |
| 推荐测试 | 删除/改写 | 新页面测试 | Vitest/Playwright | 不再期待推荐内容存在 |
| 当前多页导航 | 重构 | SiteNavigation | ActivePage | 首页/档案/技能/星魂/馆藏/图集顺序正确 |
| `SiteLayout` | 扩展多页和 Footer 变体 | 所有正式页 | layout | 各页共享骨架且 aria-current 正确 |
| 当前首页 Hero | 收敛 | `/` | 本地主视觉 | 一屏沉浸式、390px 无横滚 |
| 当前属性 | 迁移 | `/profile/#stats` | stats.ts | 语义化 dl，窄屏可读 |
| 当前晋阶材料 | 迁移 | `/profile/#ascension` | ascension.ts | 仅事实材料，无推荐措辞 |
| 当前行迹 | 迁移 | `/profile/#traces` | traces.ts | 附加能力与总属性完整 |
| 当前故事介绍 | 迁移 | `/profile/#story` | story.ts | 不在首页重复 |
| 当前技能数据 | 重整并校对 | `content/mydei/skills.ts` | 指定资料页 | 分类/名称/说明一致，无推算 |
| 三种战技形态 | 从拼接文本拆分 | `/skills/#skill*` | skills.ts | 每形态独立锚点、仍归属战技 |
| 技能页组件 | 新建 | `/skills/` | SkillData | 无第三方 UI/iframe，本站主题 |
| 当前星魂文本 | 校对并扩展 | `content/mydei/eidolons.ts` | 指定资料页 | E1–E6 名称说明一致 |
| 星魂图标 | 下载并规范化 | `public/assets/mydei/eidolons/*-icon.webp` | media manifest | 6 个本地文件、断网可显示 |
| 星魂静态封面 | 下载/压缩 | `public/assets/mydei/eidolons/eidolon-*.webp` | media manifest | 6 个文件、尺寸占位准确 |
| 角色立绘动效 | 按真实格式本地化 | `public/assets/mydei/character/` | media manifest | 可用时为真实多帧/视频媒体，无热链 |
| `EidolonMedia` | 新建 | 星魂卡片 | LocalMediaAsset | 静态图片、图标与文本徽章失败降级 |
| reduced-motion | 新增静态降级 | 角色媒体/全局 CSS | media query | 默认角色静态图，不自动加载动效 |
| 当前馆藏 | 保留独立页 | `/library/` | library.ts | 高对比、键盘/触屏、390px 通过 |
| 当前图集 | 迁移独立页 | `/gallery/` | gallery.ts/assets.ts | 首页不加载图集，独立页 4 项 |
| `vite.config.ts` 内容 bundle | 删除推荐字段 | contentIntegrity | validate | 构建不导入 builds/teams/rotations |
| `vite.config.ts` inputs | 新增多页 | profile/skills/eidolons/gallery | HTML entries | 六正式页 + 404 均产出 |
| 旧首页 hash | 一次性映射 | 新独立页/404 | home entry | 不显示旧过渡 UI，无死链接 |
| `/About/Record/record.html` | 改为 404 | 404 | route rules | 不再跳转已删除 rotation |
| `/builds/`、`/teams/`、`/rotation/` | 明确删除 | 404 | route rules | 真实 HTTP 404 |
| Footer 声明 | 保留并组件化 | compact/full Footer | layout | 非官方及权利归属声明始终可读 |
| 来源/勘误/审核状态 | 继续完全删除 | 无 | 无 | 页面和模型均无入口/状态 |
| README | 更新 | 根 README | 新路由与媒体规范 | 不再宣称提供培养/配队/循环 |
| 内容测试 | 重写 | `tests/content.test.ts` | 新 bundle | 星魂、技能、本地媒体门禁通过 |
| E2E | 重写 | `tests/e2e/site.spec.ts` | 新路由 | 首页边界、导航、断网、动效全部通过 |
| dist 校验 | 扩展 | `scripts/verify-dist.mjs` | 构建产物 | 无推荐、热链、空页面和禁用文案 |

## 20. 最终验收门槛

以下全部满足才可交付：

- 首页一屏 Hero 结束后不再出现其他内容模块，Hero 后直接是 compact Footer。
- 首页显示确定介绍文案；“查看玩法建议”已替换为“查看技能”。
- 新版导航可直接进入首页、角色档案、技能、星魂、馆藏和图集。
- 技能和星魂文案与指定资料页一致，UI 完全使用本站设计，不含 iframe。
- 技能覆盖普攻、战技及实际强化形态、终结技、天赋、秘技和附加能力。
- 星魂按 E1–E6 展示，每项具有名称、说明、本地图标和静态图片，不包含星魂动图。
- 断网后星魂图标、静态图片及可用的角色立绘动效均从本地构建产物加载。
- 项目源码、HTML、CSS、数据、测试和 dist 中不存在第三方媒体热链。
- 项目中不存在推荐配装、光锥推荐、遗器推荐、词条建议、相关配队/循环推荐及残留入口。
- 删除模块没有空卡片、空白 section、死链接、“即将上线”或其他过渡占位。
- 390px 宽度无页面横向滚动，移动端角色媒体切换不产生明显布局跳动。
- `prefers-reduced-motion` 下默认显示角色静态封面，不自动加载或播放角色动效。
- 来源、勘误、审核中、待确认、待核验等入口和状态继续保持完全删除。
- 所有旧路径按矩阵返回正确 301 或真实 404，未擅自部署或修改外部服务。
