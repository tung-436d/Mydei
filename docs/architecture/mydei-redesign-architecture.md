# 万敌角色专题网站改版：实施架构方案

> **决策更新（2026-08-29）：** 本文记录的初始架构评估中，凡涉及旧站结构、单页长首页、推荐配装/养成/配队/战斗循环、来源/勘误/内容审核、远程星魂媒体或旧导航的设计，均已被后续确定的产品决策覆盖，不得继续实施。当前唯一可执行基线为 [mydei-redesign-fullstack-change-plan.md](./mydei-redesign-fullstack-change-plan.md)：首页收敛为沉浸式首屏，角色档案、技能、星魂、馆藏和图集拆为独立页面，推荐及相关玩法内容完全删除，星魂图标与静态图片本地化。星魂不使用动图；只有角色立绘动效需要静态优先、懒加载与 `prefers-reduced-motion` 处理。正式 origin 为 `https://mydeimos.love`，托管平台按当前静态构建采用 Cloudflare Pages。这些均为确定决策，不是评估项。

> 文档状态：Draft / 已对齐 PRD Draft v1.0，待产品、内容与部署评审  
> 审计日期：2026-08-25  
> 审计范围：仓库当前工作树（含尚未提交的用户改动）  
> 本阶段变更：仅新增本文档，不修改站点源码、配置或外部服务

## 1. 结论与决策摘要

推荐采用“**静态多页站点（MPA）+ 原生 TypeScript 渐进增强 + 结构化本地内容数据**”的目标架构：继续使用浏览器原生 HTML、CSS 和 DOM API，不引入 React/Vue 等运行时框架；增加轻量构建、类型检查、Lint 和自动化测试工具。专题主页面保留服务端/静态可读的完整语义 HTML，标签页、画廊、移动导航等只做渐进增强，即使 JavaScript 加载失败，核心内容仍可阅读和导航。

选择这一方案的原因：

- 当前项目本质是无后端的静态 HTML/CSS/JS，沿用该形态的迁移成本最低。
- 页面以内容展示为主，交互复杂度不足以证明引入运行时组件框架的收益。
- TypeScript 数据契约和纯渲染/增强模块足以实现内容与 UI 解耦。
- MPA 使用真实 URL 和静态 HTML，部署要求低，SEO、首屏和故障降级都更直接。
- 所有角色事实内容保持静态、可审阅、可溯源；不需要为了本次改版建设 API 或数据库。

以下事项是进入实现前的阻断性决策门：

1. 评审并批准 `docs/product/mydei-redesign-prd.md`；当前是 Draft v1.0，不应当作最终内容签字。
2. 确认权威角色数据和素材来源、许可、版本号与校对负责人；禁止由工程人员补猜技能、星魂、配队或数值。
3. 确认正式站点 URL、部署根路径和是否要求保留现有大小写路径。仓库只有 GitHub remote，没有可确认的部署配置，探测到的 GitHub Pages 路径也未证明站点已发布。
4. 评审当前工作树中新出现的 Node 工具链配置并建立 lockfile。它已声明 Vite/TypeScript/ESLint/Vitest，但尚无安装产物、应用 TS 源码、测试或可复现构建证据。

## 2. 审计依据与输入缺口

### 2.1 已审阅内容

- 全部 6 个 HTML 文件；
- 全部 5 个 CSS 文件；
- `Mydei/js/common.js`；
- `Mydei/images/` 下全部 10 个静态资源的文件体积与像素尺寸；
- Git 当前树、提交树、分支、远端、工作树差异和本地链接目标；
- 构建、测试、Lint、类型检查、CI/CD、托管配置的存在性。

### 2.2 输入状态与并发工作树说明

- `docs/product/mydei-redesign-prd.md` 在本次审计开始时不存在，审计期间由外部并发工作新增；本文随后已完整阅读并对齐其 Draft v1.0。PRD 自身仍待产品、内容和架构评审。
- `package.json`、`vite.config.ts`、`tsconfig.json`、`eslint.config.js` 同样在审计期间由外部并发工作新增，均为未跟踪文件；本文已按最新内容审阅，但没有擅自安装依赖或修改这些配置。
- `README` 或任意常见 README 变体仍不存在，故开发、部署、内容更新和维护责任没有仓库级说明。
- 审计期间 `Mydei/css/index.css` 也发生过外部删除/恢复变化，证明工作树并非静止快照。实施前必须先划分变更所有权并固化基线。

因此本文已能验证 PRD 的信息架构与质量目标，但仍不会声称角色事实、素材授权、正式部署平台或最终视觉稿已获确认。

## 3. 当前架构摘要

### 3.1 技术栈和构建

| 领域 | 已证实现状 | 影响 |
| --- | --- | --- |
| 框架 | 无；原生 HTML/CSS + TypeScript/DOM API | 运行时简单，符合推荐方向 |
| 构建工具 | Vite 7 + pnpm lockfile；已有 `dist/index.html` | 单页构建已存在，但尚未配置 MPA inputs |
| 路由 | 物理 HTML 文件 + 相对链接；目录和文件名大小写混用 | 可静态托管，但 URL 冗长、重构易断链 |
| JavaScript | 旧页使用 `common.js`；新版首页使用 `src/app.ts`，包含渲染、tabs、导航和 lightbox | 功能已集中落地，但单文件职责过多且正文依赖 JS 注入 |
| 依赖清单 | 未跟踪的 `package.json` + `pnpm-lock.yaml` + node_modules | 可复现基础已形成，但尚未纳入 Git 基线/README/CI |

当前页面：

- `Mydei/index.html`：审计期间已被外部实现改为专题长页骨架，具有 H1、main、章节导航、tabs、配装/配队/故事/画廊容器和非官网声明。
- `Mydei/HomePage/homepage.html`：角色引言和三个入口卡片。
- `Mydei/About/about.html`：站点介绍。
- `Mydei/About/Library/library.html`：约 59 KB 的长篇内联馆藏内容。
- `Mydei/About/Record/record.html`：仅“制作中”占位。
- `Mydei/ChangeLog/changelog.html`：更新日志。

### 3.2 组件与样式组织

- 新首页出现函数级组件雏形：`renderProfile/renderArchive/renderBuilds/renderRotation/renderGallery` 与 `setupTabs/setupNavigation/setupLightbox`，但全部集中在压缩风格的 `app.ts`，没有独立文件、输入契约或清理边界。
- 旧页仍没有组件层。导航、页脚、容器、卡片和页面头部在 HTML/CSS 中逐页复制。
- 新 `index.css` 已采用新的暗红/古金设计与响应式断点；另外四份旧页 CSS 仍大量复制，设计系统尚未共享。
- 新旧页面并存 `.list/.navlist` 和 `.nav-shell/.nav-links` 两套导航体系；共享外壳尚未完成。
- 页面专属样式与全局样式混杂；新首页 CSS 单文件约 13 KB（构建产物），仍未拆 token/base/components。
- 新首页已在 900/560 px 将 hero、导航和 grids 转为窄屏结构；旧页断点仍针对不匹配的类名。PRD 指定的 360/390/768/1024/1280/1440 尚无自动化或人工证据。
- 新首页已有 reduced-motion 全局降级；旧页装饰形状仍存在无限浮动且未降级。时长/缓动也尚未抽成共享 token。

### 3.3 数据来源

- 旧页文案、馆藏条目和更新日志仍直接写入 HTML。
- 新 `Mydei/src/content.ts` 已把概览、技能、行迹、星魂、培养框架、循环和画廊抽成静态数组，这是正确迁移起点。
- 当前模型只有简单的“已收录/待核验”，没有来源实体、内容性质、适用版本、作者、核验日期、剧透、字段覆盖或素材授权状态；尚不足以满足 PRD 治理门槛。
- `app.ts` 用 `innerHTML` 在浏览器运行时插入绝大多数 P0 数据，禁用 JavaScript 时概览、技能、行迹、星魂、培养、循环和画廊容器为空，不符合 PRD 的无 JS 可读要求。
- 培养和循环目前是通用决策框架/待核验说明，不是已经核验的角色攻略；这符合“不编造”的底线，但不能据此宣告 P0 内容完成。
- 展示结构与内容强耦合；长文修改可能破坏标签结构，内容无法独立校验或复用。

### 3.4 图片、字体和其他静态资源

| 资源 | 尺寸 | 体积 | 当前用途/风险 |
| --- | ---: | ---: | --- |
| `img_mydei.jpg` | 2048×2048 | 约 4.07 MB | 新首页首屏 `<img>`；无响应式候选，是最大性能风险 |
| `golden honeycake.png` | 600×878 | 约 1.08 MB | 新首页故事/画廊及关于页；新版声明尺寸并 lazy-load |
| `mydei.png` | 600×878 | 约 1.10 MB | 新首页角色档案/画廊；新版声明尺寸并 lazy-load |
| `favicon.png` | 858×858 | 约 666 KB | 卡片背景；作为 favicon 来源体积过大 |
| `playtogether.jpg` | 1284×2280 | 约 499 KB | 从联系链接直接打开 |
| 其余图片 | 32×32 至 744×744 | 约 2.5–107 KB | 需补清晰用途、alt 和许可记录 |

新首页已为图片声明宽高、首屏优先级和非首屏 lazy-load，但仍没有 `srcset`/`sizes`/`<picture>`；现有构建产物继续包含约 4.07 MB hero JPG 和两张约 1.1 MB PNG。画廊直接发布当前素材，却没有授权状态门禁。新 CSS 还通过 Google Fonts `@import` 请求 Noto Serif SC/Inter，带来渲染阻塞、可用性、隐私/CSP 和字体授权/子集化管理问题；与“系统字体优先、自托管需授权”的目标策略不一致。

### 3.5 测试、Lint 与类型检查

- `package.json` 声明 `dev/lint/typecheck/test/build`，开发依赖为 Vite、TypeScript、ESLint、typescript-eslint 和 Vitest；已有 pnpm lockfile。
- `tsconfig.json` 开启 strict 和 `noUncheckedIndexedAccess`；在 Codex 工作区 Node 运行时下 `typecheck` 通过。
- `eslint.config.js` 只匹配 `Mydei/src/**/*.ts`，尚未覆盖现有 `common.js`、构建脚本或测试；当前匹配范围内 `lint` 通过。
- `tests/content.test.ts` 有 2 条 Vitest 测试，检查待核验状态、星魂数量和图片 alt；当前测试通过，但没有组件、浏览器、无 JS、链接、授权、来源或可访问性覆盖。
- Vite 当前命令以 `Mydei` 为 root，但 `vite.config.ts` 未显式配置多页面 inputs，需验证嵌套 HTML 是否进入生产产物；
- 尚无 Stylelint、HTML validator、链接/内容/图片预算检查；
- 没有 CI 工作流；
- 本地相对 `href/src` 目标检查未发现当前断链，但这不能覆盖语义、交互和部署根路径问题。

注意：系统默认 PATH 无 Node，直接执行 pnpm 命令失败；使用 Codex 工作区提供的 Node 后三项质量命令均通过。README/CI 应明确 Node 版本和启动方式，避免环境偶然性。

### 3.6 部署方式

- Git remote 为 GitHub 仓库 `tung-436d/Mydei`；只有 `main` 分支。
- 未发现 GitHub Actions、Pages 配置、`CNAME`、容器、服务器、云平台或 `.openai/hosting.json`。
- 常见 GitHub Pages 地址未能证明存在可用部署。因此只能认定“代码托管于 GitHub”，**不能认定当前生产部署方式**。
- 在部署方式确认前，不应更改 URL 基础路径、删除旧 HTML 或生成绝对 canonical URL。

### 3.7 当前技术债与潜在风险

| 优先级 | 问题 | 后果 |
| --- | --- | --- |
| P0 | PRD 尚未批准；权威内容、素材授权和部署信息缺失 | 无法完成需求一致性、事实准确性和上线验收 |
| P0 | 4.07 MB 首屏背景 | 慢网 LCP 显著恶化，移动端浪费流量 |
| P0 | P0 内容由运行时 JS 注入 | 无 JS 时核心模块为空，SEO/降级不符合 PRD |
| P0 | 当前画廊/首屏未做素材授权门禁 | 可能发布来源和使用权限未确认的素材 |
| P1 | 内容模型仅有“已收录/待核验” | 无法执行来源、版本、作者、剧透和字段级治理 |
| P1 | 导航/页脚/CSS 大量复制 | 修改易漂移，重复缺陷难统一修复 |
| P1 | 工具命令已通过但测试仅 2 条、无 CI/E2E | 交互模块增多后回归风险仍高 |
| P1 | 新首页响应式未按六个指定宽度验收；旧页仍失配 | 手机和平板布局不可整体保证 |
| P1 | 新首页有 description，其他 SEO 产物仍缺 | 缺 canonical、OG、结构化数据、sitemap，旧页 metadata 也不完整 |
| P1 | 新首页语义与 tabs 有改善，但动态正文/菜单/lightbox 未做读屏验收 | 可访问性仍不能宣告达标 |
| P1 | Google Fonts 阻塞式远程 `@import` | 字体加载、隐私/CSP、网络可用性和授权治理风险 |
| P1 | Vite 产物当前只有新版首页 | 旧页面未进入明确的可发布 MPA 产物 |
| P2 | 大小写目录、深层相对路径和占位页 | Linux 托管重构易断链；信息架构混乱 |
| P2 | 新旧 CSS/脚本形成两套系统 | 行为、动效和无障碍降级不一致 |
| P2 | Git 工作树已有大量用户未提交修改 | 实施时有覆盖/冲突风险，必须先建立干净基线 |

上表第一项应细分理解：PRD Draft 已存在但尚未批准；真正缺失的是权威内容、素材授权和部署决策。工具命令当前可执行并通过，但覆盖范围离发布门禁仍有明显距离。

## 4. 目标架构

### 4.1 架构原则

1. **HTML-first**：主要文本和模块标题随静态 HTML 输出；JavaScript 只增强交互。
2. **内容与展示分离**：展示模块只接收类型化数据，不包含大段角色文案或数值。
3. **来源优先**：任何事实型数据必须带来源引用和校对状态；未验证内容不发布。
4. **局部状态**：状态靠近组件；只有可分享状态进入 URL；不引入全局状态库。
5. **渐进迁移**：先建立质量基线，再逐模块替换；旧页面在切换验证前可继续服务。
6. **静态优先**：除非后续 PRD 明确要求实时账户/社区功能，否则不建设后端。

### 4.2 页面和路由结构

待部署根路径确认后，目标公开路由建议为：

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/` | 万敌角色专题页 | 单一长页，以下列 section anchors 导航 |
| `/#overview` | 概览与基础属性 | URL 可分享、无 JS 也能跳转 |
| `/#skills` | 技能与行迹 | 标签页增强；无 JS 时全部内容顺序展示 |
| `/#eidolons` | 星魂 | 网格/列表响应式展示 |
| `/#build` | 养成建议 | 明确版本、条件和来源；作为一级导航锚点 |
| `/#teams` | 配队与战斗轴 | 配队、替代位和循环步骤 |
| `/#rotation` | 机制与操作循环 | 可由技能和配队上下文链接到达 |
| `/#story` | 故事/档案入口 | 一级导航锚点；P1 正文上线前的 P0 形态见下文冲突说明 |
| `/#gallery` | 图库 | 缩略图优先，原图按需加载 |
| `/#sources` | 来源与免责声明 | 集中展示来源、版本和内容状态 |
| `/sources/` | 来源与勘误 | 内容增长后可独立的完整来源索引；MVP 可先锚点实现 |
| `/library/` | 馆藏 | 保留现有长文资产，数据化后独立页面 |
| `/changelog/` | 更新日志 | 发布记录与内容版本 |
| `/about/` | 关于本站 | 站点说明、联系和版权/非官方声明 |

PRD 已确定“纷争剧作”不作为 MVP 独立页面，可被故事时间线或战斗记录吸收，因此 `/record/` 只需保留旧 URL 兼容，不建设第二套内容。迁移期间保留旧路径文件作为兼容入口或静态重定向，但实现前必须先确认托管是否支持重写。文件路由仍优先于 SPA history fallback，不增加路由库。

### 4.3 Layout 与响应式策略

`SiteLayout` 由 skip link、`SiteHeader`、主内容和 `Footer` 组成。正文使用统一 `PageContainer`，专题页模块使用 `Section` 外壳。布局采用 CSS Grid/Flexbox、逻辑属性和 `clamp()`，避免依赖脚本测量。

- 手机优先；最低以 PRD 要求的 360 CSS px 做正式验收，并额外在 320 px 做韧性检查，不出现页面级横向滚动。
- 内容最大宽度约 `72rem`，长文行宽控制在 `65–75ch`。
- 建议断点：`48rem`（平板）、`64rem`（小桌面）、`80rem`（宽桌面）。断点由内容折行验证后微调，而非适配具体设备型号。
- Hero：手机单列（文案先、图片后），平板以上双列；关键 CTA 不依赖 hover。
- 导航：宽屏横向；窄屏使用原生 button 控制折叠菜单，保留键盘/焦点/`aria-expanded` 行为。
- `TraceTree`：桌面关系图，手机降级为按依赖顺序分组的语义列表，不缩小成不可读图。
- `EidolonGrid`：手机 1 列、平板 2 列、桌面最多 3 列。
- 配队和战斗轴在窄屏转为纵向卡片/步骤列表，不依赖横向拖动才能读取。
- 正式手工验收覆盖 PRD 指定的 360、390、768、1024、1280、1440 CSS px；横竖屏切换不丢失 tab、折叠或当前会话剧透状态。

### 4.4 页面与组件树

```text
SiteLayout
├── SkipLink
├── SiteHeader
│   └── SiteNavigation
├── main#main-content
│   └── CharacterPage
│       ├── MydeiHero
│       ├── CharacterOverview
│       │   └── StatPanel
│       ├── SkillSection
│       │   └── SkillTabs
│       ├── TraceSection
│       │   └── TraceTree
│       ├── EidolonSection
│       │   └── EidolonGrid
│       ├── BuildRecommendations
│       ├── TeamSection
│       │   ├── TeamComposition
│       │   └── CombatRotation
│       ├── LoreTimeline [P1]
│       │   └── SpoilerDisclosure
│       ├── QuoteSection [P1]
│       ├── Gallery [P1 / 授权门禁]
│       └── SourceNotice
└── Footer
```

`ContentBadge`（官方信息/玩法建议/站点原创/待确认）与 `VersionNotice` 是跨领域原语，应由所有 P0 内容模块复用。非首页复用 `SiteLayout`、`Section`、`SourceNotice`、`SiteNavigation` 和 `Footer`；馆藏页另用 `LibraryIndex`/`LibraryEntry`，更新日志使用 `ChangelogList`。

### 4.5 组件职责与建议命名

任务要求列出的名称与当前仓库没有命名规范冲突，可保留大部分名称。为了避免 `StatPanel` 脱离上下文，建议将其放在 `CharacterOverview` 内；`BuildRecommendations`、`TeamComposition` 等保持领域命名。

| 组件 | 职责与边界 | 关键状态/降级 | 验收重点 |
| --- | --- | --- | --- |
| `MydeiHero` | 名称、定位短句、经审核引语、优化后的主视觉、目录入口 | 无必需状态；图片失败保留可读文案和背景色 | LCP、alt、单一 h1 |
| `CharacterOverview` | 基础资料与概览文字的 section 容器 | 缺字段只隐藏对应项，不输出“undefined” | 语义 dl/段落、来源链接 |
| `StatPanel` | 展示带单位/等级语境的属性项 | 无数据时整组不发布；不可填 0 占位 | 数值语境、屏幕阅读顺序 |
| `SkillTabs` | 在普攻/战技/终结技等经确认分类间切换 | JS 失败展示全部；JS 成功遵守 ARIA tabs pattern | 键盘方向键、焦点、深链 |
| `TraceTree` | 展示节点、前置关系和描述 | 手机/无 CSS 使用排序列表；不强制 ARIA tree | 关系可理解、缩放不丢内容 |
| `EidolonGrid` | 展示已验证星魂层级 | 缺某级时显示“内容待核验”，不得补猜 | 1/2/3 列适配、标题层级 |
| `BuildRecommendations` | 按版本/目标/条件展示装备、属性和替代项 | 过期或来源不足标记状态，不静默混用版本 | 版本戳、非绝对化措辞、来源 |
| `TeamComposition` | 队伍槽位、角色职责、替代位和适用场景 | 无完整队伍时不渲染空槽模板 | 图片 alt、角色名文本、窄屏顺序 |
| `CombatRotation` | 以有序步骤展示战斗循环及条件分支 | 不做必须拖动的动画时间轴 | `ol` 语义、条件清晰、可复制 |
| `LoreTimeline` | 时间点/阶段、事件和来源 | 日期不确定时使用明确的文本精度字段 | 不伪造日期、长文行宽 |
| `QuoteSection` | 经授权/可引用的短引语、说话者和出处 | 引语缺出处则不发布 | `blockquote/cite`、版权限制 |
| `Gallery` | 缩略图、说明、来源、按需大图 dialog | JS 失败链接到原图；低网速不预取大图 | lazy-load、焦点锁定、Escape |
| `SourceNotice` | 站点性质、数据版本、来源清单、争议/缺失状态 | 始终为文本，不依赖 tooltip | 可见、可链接、更新时间 |
| `SiteNavigation` | 一级固定为概览/技能/养成/配队/故事，并提供更多辅助入口和当前章节 | 无 JS 仍是可用链接列表 | 当前页/章节、移动菜单焦点、history 不刷屏 |
| `Footer` | 关于、版权/非官方声明、联系方式和辅助链接 | 静态内容 | 链接安全、标题层级、对比度 |

组件应使用“数据输入 + 纯模板/渲染函数 + 可选增强控制器”三层结构。例如 `renderSkillSection(data)` 负责输出静态结构，`enhanceSkillTabs(root)` 只绑定 tabs 行为；控制器不得内置技能文案。

### 4.6 静态渲染与构建流水线

仅把内容放入 TypeScript 后在浏览器运行时 `innerHTML` 渲染，会违反 PRD 的无 JavaScript 可读要求。目标流水线应为：

```text
类型化内容数据
  → check-content（引用、版本、授权、剧透、字段级状态）
  → 本地 Vite transformIndexHtml/build plugin 调用纯 render* 函数
  → 生成包含完整正文的 MPA HTML
  → Vite 打包 CSS/渐进增强 controller/已批准媒体
  → check-output（HTML、链接、SEO、资源预算）
```

构建插件为仓库内代码，不新增运行时依赖；HTML 模板保留明确插槽，如 `<!-- character-content -->`。所有文本经过统一 escape，只有受控的 `ContentBlock` 标记可生成链接/强调，不接受任意未净化 HTML。开发服务器和生产构建使用同一渲染路径，避免开发/发布差异。构建产物必须在禁用 JavaScript时包含概览、P0 技能/建议摘要、来源和非官网声明。若团队不愿维护自定义构建插件，备选是引入支持静态输出的 SSG，但那是更大依赖和迁移成本，需单独 ADR，不作为首选。

## 5. 目录结构建议

当前新工具链已把 `Mydei/` 声明为 Vite root。为减少无必要移动，建议沿用这一应用目录；仓库根只放工程配置与文档。目标结构：

```text
/
├── Mydei/                       # Vite root / 站点源码
│   ├── index.html
│   ├── sources/index.html
│   ├── library/index.html
│   ├── about/index.html
│   ├── changelog/index.html
│   ├── public/
│   │   ├── icons/
│   │   └── media/mydei/
│   └── src/
│       ├── main.ts
│       ├── pages/
│       │   ├── character-page.ts
│       │   ├── library-page.ts
│       │   └── changelog-page.ts
│       ├── components/
│       │   ├── layout/
│       │   ├── character/
│       │   ├── build/
│       │   ├── lore/
│       │   └── media/
│       ├── content/
│       │   ├── mydei/
│       │   │   ├── profile.ts
│       │   │   ├── combat.ts
│       │   │   ├── builds.ts
│       │   │   ├── lore.ts
│       │   │   └── sources.ts
│       │   ├── library/
│       │   └── changelog.ts
│       ├── models/
│       │   ├── character.ts
│       │   ├── content.ts
│       │   └── media.ts
│       ├── styles/
│       │   ├── tokens.css
│       │   ├── reset.css
│       │   ├── global.css
│       │   ├── utilities.css
│       │   └── components/
│       └── utils/
│           ├── dom.ts
│           └── content-validation.ts
├── tests/
│   ├── unit/
│   ├── e2e/
│   ├── accessibility/
│   └── visual/
├── scripts/
│   ├── check-links.mjs
│   └── check-content.mjs
├── docs/
│   ├── product/
│   └── architecture/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
└── playwright.config.ts
```

`vite.config.ts` 应显式声明 root、base 和所有 MPA HTML inputs，不能只依赖 `vite build Mydei` 的默认单入口行为。旧的 `Mydei/HomePage/...`、`Mydei/About/...` 等文件在 URL 迁移验收前保留为兼容入口；待托管方式确认后再决定使用静态跳转页还是平台重定向。若最终部署要求不同 root/base，只改构建配置和链接生成策略，不为目录美观再次搬迁源码。

## 6. 内容数据模型

### 6.1 建模规则

- 内容数据采用 TypeScript 模块并用 `satisfies` 校验；无需运行时 schema 依赖即可获得编译期保护。
- 不把富文本作为任意 HTML 字符串注入。段落使用字符串数组，强调、链接等有限结构用 discriminated union 表示，以避免 XSS 和结构漂移。
- 所有内容模块带统一 `ContentMeta`，通过 `sourceIds`、`status`、`reviewedAt` 和适用版本形成可追溯链。
- PRD 规定的内容性质、适用版本、作者/编辑、核验日期、语言和剧透级别进入统一 `ContentMeta`；UI 不能从配色猜内容性质。
- 数值保留显示字符串与上下文，避免无意把百分比、等级缩放或区间转成错误数字；技能倍率另按等级/形态结构化，未核验时整块省略。
- 配装和配队是版本敏感内容，必须带 `applicableVersions` 和适用条件；过期数据可保留但必须可见标记。
- `id` 稳定且只用小写 ASCII/kebab-case，用于 DOM id、hash 深链和测试定位。
- P0 内容先由工程/内容负责人维护类型化 `.ts` 数据；P1 长篇馆藏在非工程编辑需求明确后再决定是否引入 Markdown 编译。不要为了尚未确认的 CMS 需求预先建设后台。

### 6.2 TypeScript 类型建议

以下是契约草案，不包含任何角色事实或虚构数值：

```ts
type ContentKind = 'official' | 'recommendation' | 'original' | 'unconfirmed';
type ContentStatus = 'draft' | 'verified' | 'needs-review' | 'archived';
type SpoilerLevel = 'none' | 'minor' | 'major';
type Locale = 'zh-CN';
type EidolonLevel = 1 | 2 | 3 | 4 | 5 | 6;
type SkillKind =
  | 'basic'
  | 'skill'
  | 'ultimate'
  | 'talent'
  | 'technique'
  | 'enhanced'
  | 'other';

interface SourceRef {
  id: string;
  title: string;
  url?: string;
  inGameLocation?: string;
  publisher?: string;
  sourceType: 'in-game' | 'official-web' | 'official-video' | 'guide' | 'community';
  publishedAt?: string;
  accessedAt: string;        // YYYY-MM-DD；真实核验后填写
  applicableVersions: string[];
  coveredFieldPaths: string[];
  linkStatus?: 'active' | 'broken' | 'replaced';
  note?: string;
}

interface AuthorRef {
  id: string;
  displayName: string;
  role: 'editor' | 'reviewer' | 'guide-author' | 'site-author';
}

interface ContentMeta {
  kind: ContentKind;
  status: ContentStatus;
  applicableVersions: string[];
  sourceIds: string[];
  authorIds: string[];
  reviewedAt: string;
  locale: Locale;
  spoilerLevel?: SpoilerLevel;
  reviewNote?: string;
}

interface AssetRef {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  sourceIds: string[];
  creatorOrRightsHolder?: string;
  authorizationStatus: 'approved' | 'pending' | 'rejected';
  usage: 'hero' | 'content' | 'thumbnail' | 'decorative' | 'social';
  focalPoint?: { x: number; y: number };
  safeCrop?: { top: number; right: number; bottom: number; left: number };
}

interface DisplayValue {
  label: string;
  value: string;
  context?: string;          // 等级、单位、条件或版本语境
}

interface ContentBlock {
  id: string;
  paragraphs: string[];
  meta: ContentMeta;
}

interface SourcedValue<T> {
  value?: T;                 // 待确认且无可信值时省略
  meta: ContentMeta;         // 支持字段级“待确认”，不被模块标签掩盖
}

interface CharacterProfile extends ContentMeta {
  id: 'mydei';
  displayName: SourcedValue<string>;
  aliases: SourcedValue<string[]>;
  originalIntroduction: ContentBlock;
  officialSummary?: ContentBlock;
  portrait: AssetRef;
  stats: SourcedValue<DisplayValue>[];
  skills: Skill[];
  traces: TraceGraph;
  eidolons: Eidolon[];
}

interface Skill extends ContentMeta {
  id: string;
  kind: SkillKind;
  name: string;
  officialEffect: ContentBlock;
  interpretation?: ContentBlock;
  mechanics: DisplayValue[];
  scaling?: SkillScaling[];  // 未核验时省略整个数组，不填占位数字
  tags: string[];
}

interface SkillScaling {
  level: string;
  form?: string;
  values: DisplayValue[];
}

interface TraceNode extends ContentMeta {
  id: string;
  name: string;
  kind: 'major' | 'minor' | 'stat';
  officialDescription: ContentBlock;
  interpretation?: ContentBlock;
  prerequisiteIds: string[];
  visualPosition?: { column: number; row: number };
}

interface TraceGraph {
  nodes: TraceNode[];
}

interface Eidolon extends ContentMeta {
  id: string;
  level: EidolonLevel;
  name: string;
  officialDescription: ContentBlock;
  interpretation?: ContentBlock;
  image?: AssetRef;
}

interface BuildRecommendation extends ContentMeta {
  id: string;
  title: string;
  useCase: string;
  priorities: DisplayValue[];
  options: BuildOption[];
  caveats: string[];
}

interface BuildOption {
  id: string;
  category: 'equipment' | 'relic' | 'ornament' | 'stat' | 'other';
  label: string;
  rank?: 'preferred' | 'alternative' | 'situational';
  rationale: string[];
}

interface TeamComposition extends ContentMeta {
  id: string;
  title: string;
  useCase: string;
  slots: TeamSlot[];
  notes: string[];
  rotationId?: string;
}

interface TeamSlot {
  id: string;
  role: string;
  primaryCharacterId?: string;
  alternativeCharacterIds: string[];
  rationale: string[];
}

interface CombatRotation extends ContentMeta {
  id: string;
  title: string;
  prerequisites: string[];
  steps: RotationStep[];
  exceptions: string[];
}

interface RotationStep {
  id: string;
  actorId?: string;
  action: string;
  condition?: string;
  result?: string;
}

interface LoreEvent extends ContentMeta {
  id: string;
  label: string;
  dateText?: string;         // 不确定时保留原始精度，不猜具体日期
  precision: 'exact' | 'approximate' | 'relative' | 'unknown';
  title: string;
  body: string[];
}

interface Quote extends ContentMeta {
  id: string;
  text: string;
  speaker?: string;
  citation: string;
}

interface GalleryItem extends ContentMeta {
  id: string;
  thumbnail: AssetRef;
  full?: AssetRef;
  caption: string;
  credit?: string;
}

interface CharacterPageContent {
  profile: CharacterProfile;
  builds: BuildRecommendation[];
  teams: TeamComposition[];
  rotations: CombatRotation[];
  lore: LoreEvent[];
  quotes: Quote[];
  gallery: GalleryItem[];
  sources: SourceRef[];
}
```

构建期 `check-content` 至少校验：ID 唯一；所有 `sourceIds/authorIds` 可解析；行迹前置节点存在且无环；星魂等级不重复；配队引用角色存在；rotation 引用存在；图片尺寸和 alt 非空；只有 `authorizationStatus: 'approved'` 的图片可进入发布包；`official + verified` 内容必须有一手来源与覆盖字段；`recommendation/original` 必须有作者；版本敏感内容有适用版本；故事/语录有剧透级别；核验日期格式有效且不晚于构建日。

### 6.3 静态数据与动态数据边界

**静态、构建期内联或生成：**角色资料、技能/行迹/星魂、配装/配队/战斗轴、剧情、引语、图片清单、来源、SEO 元数据、导航和更新日志。它们应在 Git 中可审阅，并随构建形成 HTML。

**仅客户端状态：**当前技能 tab、移动导航开关、画廊 dialog、用户主动选择的配装/队伍过滤条件。本地状态默认不持久化；有分享价值的 tab/filter 使用 hash 或 query 参数。

**不在本期建设：**用户账户、收藏同步、远程 CMS、实时游戏数据、评论系统、分析平台和自建 API。若未来引入动态来源，需要独立 ADR 说明缓存、失败策略、数据许可和隐私，不应让首屏依赖远程 API。

### 6.4 版本、来源与素材治理

- 当前版本由一个仓库级 `content-release.ts` 声明；构建比较每条内容的 `applicableVersions`。不覆盖当前版本的建议自动显示“尚未适配当前版本”，并使发布检查失败或要求显式豁免。
- 游戏版本更新时，脚本按 `SourceRef.coveredFieldPaths` 和版本筛出受影响内容，生成复核清单；复核只更新数据与日期，不改组件。
- 来源是多对多实体。URL 失效时标 `broken` 并保留标题、发布者、游戏内位置和历史核验信息，不删除溯源链。
- `official` 只能引用 PRD 允许的一手来源；攻略/社区来源只能支撑 `recommendation` 或交叉核对说明。
- 素材台账与 `AssetRef` 同源。`pending/rejected` 资源在构建期不可被复制到发布目录；首屏无已批准素材时使用纯 CSS/排版版本，授权缺失不阻塞内容 MVP。
- 每次发布生成只读的内容清单（版本、核验日期、来源数量、待确认项、素材授权状态），供内容负责人签字并随构建报告保存。

## 7. 状态管理方案

- 不新增 Redux、Zustand、Pinia 等全局状态库。
- 每个交互组件用小型 controller 和 DOM 状态管理；控制器暴露 `init/destroy` 或返回清理函数，便于测试。
- 页面级只维护不可避免的共享状态，例如当前目录 section；优先用 `IntersectionObserver` + URL，而非全局 event bus。
- tabs 初始值读取 hash/query，交互后使用 `history.replaceState`，避免每次点击污染返回栈。
- 所有控件以原生元素状态为真源（`hidden`、`aria-selected`、`aria-expanded`），不维护重复的不可见内存状态。
- 剧透状态默认关闭，只保存在当前页面会话内存；如产品后来要求 `sessionStorage/localStorage`，须补隐私说明和重置入口。屏幕方向变化不得重建组件或丢失当前状态。
- 图片/内容加载失败不进入全局 store，由对应组件显示局部 fallback。

## 8. 样式与主题变量

将重复 CSS 合并为 token、基础层、布局工具和组件样式。沿用当前暖色基础，并按 PRD 升级为黑曜石/深红/古金/暖白的层级；以下只是与 PRD 方向一致的候选值，最终仍须通过设计评审和 WCAG 对比度测试。

```css
:root {
  --color-obsidian: #12100f;
  --color-crimson: #5a1717;
  --color-antique-gold: #c6a15b;
  --color-warm-white: #f4ebdd;
  --color-bg: var(--color-warm-white);
  --color-surface: #fffaf1;
  --color-text: #241c18;
  --color-brand: var(--color-crimson);
  --color-muted: #6b5f58;
  --color-border: #b9a58c;
  --color-focus: #145fcc;

  --font-sans: system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-body: 1rem;
  --font-size-h1: clamp(2rem, 5vw, 4.5rem);

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  --radius-sm: 0.5rem;
  --radius-md: 1rem;
  --shadow-card: 0 0.625rem 1.875rem rgb(0 0 0 / 8%);
  --content-max: 72rem;
  --prose-max: 72ch;
  --header-height: 4rem;

  --duration-fast: 120ms;
  --duration-normal: 240ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
}
```

规则：

- 不使用 `transition: all`；只声明实际变化的属性。
- focus 色不与品牌色绑定，确保浅色/深色表面都清晰。
- 组件 CSS 用领域类名或 `data-component` 限定，不依赖深层 DOM 选择器。
- 通过 `scroll-margin-top: var(--header-height)` 处理 sticky header，而不是 JS 写死 `80px`。
- 如果采用 CSS cascade layers，可使用 `reset, tokens, base, components, utilities, overrides`；不需要 CSS-in-JS。

## 9. 图片与字体加载策略

1. 将首屏 4.07 MB JPG 离线裁切并生成 AVIF/WebP/JPEG 多档（例如 480/768/1280/1920 宽），使用 `<picture>` 或 image-set；移动端不得下载桌面大图。
2. 首屏只 preload 实际匹配的轻量主视觉候选；目标为选中 hero source 不超过约 200 KB，实际阈值以视觉验收为准。
3. Hero 使用 `<img>` 而非纯 CSS 背景（装饰图除外），提供准确 `alt`、`width/height`、`fetchpriority="high"` 和 `decoding="async"`，避免 CLS。
4. 首屏以下图片使用 `loading="lazy"`；图库只加载缩略图，大图在用户打开时请求。
5. 卡片重要图片改用 `<img>`；纯装饰图保持 CSS 背景并从可访问树排除。
6. 保留系统字体栈。只有品牌设计明确要求且许可清晰时，才自托管 WOFF2；最多预加载首屏需要的一个字重，并使用 `font-display: swap`。
7. 在内容数据中记录素材来源/许可；未经确认的图片不能进入发布构建。

初始性能预算（CI/上线前 Lighthouse 与真实设备抽检）：LCP ≤ 2.5 s、CLS ≤ 0.1、INP ≤ 200 ms（如有足够真实数据按第 75 百分位）；固定环境下 Lighthouse Mobile Performance ≥ 90、Accessibility ≥ 95、SEO ≥ 95，记录环境并至少重复 3 次；首屏总传输目标 ≤ 500 KB；主页面 JS gzip 目标 ≤ 70 KB、CSS gzip 目标 ≤ 50 KB。预算是质量门，不代表当前站点已达标。

## 10. SEO 元数据

每个公开页面静态输出：

- 唯一 `<title>` 和 `meta[name=description]`；
- 正式域名确认后的 canonical；
- Open Graph/Twitter card 标题、描述、优化后的分享图和图片尺寸；
- `lang="zh-CN"`、主题色、favicon 清单；
- 单一可见 h1、正确标题层级和语义 landmarks；
- `robots.txt` 与 `sitemap.xml`（正式 URL 确认后生成）；
- 合理的 `WebSite`、`WebPage`/`Article` JSON-LD。万敌是虚构角色，不使用现实人物 `Person`；只有 schema 语义和关系经验证后才考虑 `VideoGame` 关联。不要为了富结果虚构作者、发布日期、评分或游戏属性。

内容模块不应该全靠客户端插入，否则爬虫和无 JS 用户得到空壳。技能 tab 的非当前 panel 可以静态存在并由增强脚本折叠。来源和“非官方专题站”等声明应为可见正文，不只放 meta。

## 11. 动效系统与 reduced-motion

- 动效只用于状态反馈、层级切换和轻量进入效果，不承载唯一信息，不阻塞点击/滚动。
- CSS token 统一 duration/easing；位移尽量使用 transform/opacity，避免 layout thrashing。
- IntersectionObserver 进入动画只运行一次；内容初始必须可见，脚本成功后再加增强类，防止 JS 失败导致内容隐藏。
- modal/gallery 的打开动画不得延迟焦点落位或关闭操作。
- 全局降级：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- 原有无限 `float` 动画必须在 reduced-motion 下停止；锚点滚动改由 CSS `scroll-margin` 与条件 smooth behavior 完成。

## 12. 错误状态与内容缺失状态

| 场景 | 处理 |
| --- | --- |
| 构建期引用/类型错误 | 构建失败，不发布带悬空来源或引用的数据 |
| 必填模块无权威数据 | 不渲染该模块，并在 `SourceNotice` 列为“待核验”；不得使用虚构占位数据 |
| 单个可选字段缺失 | 省略字段；仅在用户需要知道缺失时显示统一“内容待核验” |
| 图片加载失败 | 保留固定尺寸容器、alt/标题和中性背景，不破坏布局 |
| JavaScript 失败 | 所有正文可读；tabs 全部展开；gallery 链接可直接打开；导航仍可跳转 |
| 外链不可达 | 不阻塞页面；链接检查报告告警，来源保留访问日期 |
| 空过滤结果 | 显示明确空状态和“清除筛选”按钮，不显示空白区域 |
| 未知路由 | 若托管支持则提供静态 404；包含返回首页和站点导航 |

不在生产界面显示异常堆栈或内部路径。由于本期不依赖 API，不设计全局网络 error boundary。

## 13. 可访问性方案

目标为 WCAG 2.2 AA：

- 提供 skip link、`header/nav/main/footer` landmarks 和唯一主标题。
- 所有可操作项使用 `a/button/summary` 等原生元素，不用可点击 `div`。
- 键盘可完成移动导航、tabs、画廊打开/关闭和所有链接操作；focus 不丢失且始终可见。
- `SkillTabs` 遵循 WAI-ARIA tabs：`tablist/tab/tabpanel`、方向键、Home/End、`aria-controls`；无 JS 时移除 tab 角色并显示全部。
- `TraceTree` 若只是信息图，不误用交互式 `tree` role；用标题、列表和前置关系文本提供等价信息。
- 图片 alt 描述其在语境中的功能；装饰图空 alt；角色名不能只存在于图片。
- 颜色不作为唯一状态表达；正文/控件对比度、200% zoom、400% zoom/reflow 均测试。
- dialog 打开后聚焦标题/首个控件，Tab 限制在 dialog，Escape 关闭并归还触发点。
- 引语使用 `blockquote`，战斗轴用 `ol`，属性对用 `dl` 或正确表头表格。
- 触控目标至少约 44×44 CSS px；动效与自动滚动尊重 reduced-motion。

## 14. 测试策略与矩阵

### 14.1 自动化层次

1. 编译/静态校验：TypeScript、ESLint、内容引用、HTML 输出、内部链接、图片元数据。
2. 单元测试：纯数据校验器、URL 状态解析、tabs/rotation 等无 DOM 逻辑。
3. 浏览器集成/E2E：真实静态构建上验证导航、tabs、gallery、降级、404。
4. 可访问性：自动 axe（若采用）+ 键盘和读屏人工抽检；自动化不能替代人工。
5. 视觉/响应式：关键页面在三类 viewport 做稳定截图和人工审查。
6. 性能/SEO：Lighthouse CI 或发布前固定环境审计，核对预算与 metadata。

### 14.2 测试矩阵

| 范围 | 桌面 1280/1440 | 平板 768/1024 | 手机 360/390 | 键盘/读屏 | reduced-motion | JS 禁用 |
| --- | --- | --- | --- | --- | --- | --- |
| SiteNavigation | 当前页、锚点、sticky | 折叠临界点 | 菜单开关/回焦 | 必测 | 无阻塞动画 | 链接可用 |
| MydeiHero/Overview | 双列、LCP | 排版切换 | 单列、无横滚 | h1/alt/dl | 静态展示 | 完整可读 |
| SkillTabs | tab 切换/深链 | 同桌面 | 横向不溢出 | ARIA/方向键 | 即时切换 | 全部展开 |
| TraceTree | 关系图 | 简化图/列表 | 依赖列表 | 顺序与关系文本 | 无路径动画 | 列表可读 |
| EidolonGrid | 3 列 | 2 列 | 1 列 | 标题顺序 | 静态 | 完整可读 |
| Build/Team/Rotation | 卡片/步骤 | 自动换行 | 纵向顺序 | 控件/ol | 无自动播放 | 内容可读 |
| Lore/Quote | 行宽、时间线 | 行宽 | reflow | 语义和引用 | 静态 | 完整可读 |
| Gallery | dialog/大图 | dialog | 缩略图/触控 | focus trap/Escape | 即时开关 | 原图链接 |
| SourceNotice/Footer | 外链/版本 | 换行 | 无溢出 | landmark/链接名 | 不适用 | 完整可读 |
| SEO/404/links | metadata、canonical、状态码 | 同左 | 同左 | 标题可辨 | 不适用 | 内容存在 |

浏览器基线待 PRD/流量确定；默认覆盖当前 Chrome、Edge、Firefox、Safari 的最新两个稳定大版本，以及 iOS Safari/Android Chrome 实机或可靠模拟。不要承诺未测试的旧浏览器。

## 15. 依赖建议、替代方案与成本

没有运行时依赖是目标。当前未跟踪的 `package.json` 已声明前四组开发工具；建议评审后沿用、锁定版本并验证，而不是再换工具。Playwright 是为满足 PRD 浏览器/viewport 验收建议补充的开发依赖：

| 依赖 | 用途 | 不新增时的替代 | 成本/注意事项 |
| --- | --- | --- | --- |
| `vite`（已声明） | MPA 开发服务器、TS 转译、资源指纹和生产构建 | 保持手写静态文件 + 自建脚本 | 需补明确 MPA inputs、root/base 验证和 lockfile |
| `typescript`（已声明） | 内容契约、组件输入与引用的编译期检查 | JSDoc + `checkJs` | 需要迁移 JS 和学习类型；无浏览器运行时成本 |
| `eslint`, `@eslint/js`, `typescript-eslint`（已声明） | JS/TS 质量门禁 | 仅依赖 code review | 当前匹配范围过窄，需覆盖脚本和测试；规则保持克制 |
| `vitest`（已声明） | 快速测试纯逻辑和内容校验 | Node 内置 test + 先编译 | 需定义无测试时的失败策略与 coverage 边界 |
| `@playwright/test`（建议新增） | 六个指定 viewport、交互、截图、JS 禁用 E2E | 人工浏览器回归 | 首次下载浏览器体积较大，CI 时间增加 |

可选而非首批必需：

- `@axe-core/playwright`：自动可访问性扫描；替代为浏览器 axe 工具 + 人工审计。成本是额外依赖和可能的误报处理。
- `sharp`：自动生成 AVIF/WebP/srcset；替代为一次性离线导出并提交产物。若素材经常更新再引入，避免首期增加原生二进制维护。
- Prettier/Stylelint：团队已有统一偏好时再加；当前不是实现目标的必要条件。

不建议首期加入 React/Vue、客户端 router、全局 state manager、动画库、CSS-in-JS 或远程 CMS。它们都能实现需求，但会增加运行时、迁移和测试成本，当前没有足够收益证据。

## 16. 分阶段实施计划

### Phase 0：需求和基线门禁

- 批准 PRD，补齐 README、正式 URL/部署说明、权威数据源和素材许可。
- 备份/提交或明确隔离当前未提交用户改动，记录可回退 commit。
- 建立现有页面截图、链接、基础性能和无障碍基线。
- 决定应用根目录、URL 兼容和 Node 版本。

退出条件：输入材料和上线边界被负责人书面确认；否则不得开始内容填充或路由切换。

### Phase 1：工具链与数据契约

- 评审并完善现有 Vite/TypeScript 实现，保留现有 lockfile，补显式 MPA inputs 和静态内容渲染插件；把 `app.ts` 拆为渲染/增强模块并逐步收口旧 `common.js`，先不改变已实现视觉。
- 扩大现有 `typecheck/lint/test/build` 覆盖范围并建立最小 CI。
- 建立类型、来源表、内容校验脚本；只录入已验证数据。
- 为旧站构建 smoke test，确保行为基线不退化。

### Phase 2：共享外壳和设计系统

- 合并 token/reset/global CSS；实现 `SiteLayout`、`SiteNavigation`、`Footer`、skip link。
- 修复移动导航、focus、sticky anchor offset 和 reduced-motion。
- 保持旧页面内容，先消除共享结构复制。

### Phase 3：专题首屏和核心角色模块

- 实现 `MydeiHero`、`CharacterOverview`、`StatPanel`。
- 完成首屏图片多格式/多尺寸优化和性能预算。
- 实现 `SkillTabs`、`TraceTree`、`EidolonGrid`，先测试无 JS 降级和键盘行为。

### Phase 4：攻略型内容

- 接入经审校的 build/team/rotation 数据。
- 实现版本标签、替代项、条件与来源展示。
- 加内容一致性、版本、引用和响应式测试。

### Phase 5：叙事、图库和附属页面

- 实现 `LoreTimeline`、`QuoteSection`、`Gallery`、`SourceNotice`。
- 将馆藏和更新日志从内联 HTML 迁出；保留内容逐段校对结果。
- 完成 SEO、sitemap、404 和旧路径兼容。

### Phase 6：验收与切换

- 执行测试矩阵、实机/键盘/读屏/性能审核。
- 在预览环境验证根路径和缓存；不在本任务中擅自部署。
- 产品、内容、设计、工程共同签字后再切换；保留旧构建产物用于回滚。

## 17. 风险与回滚策略

| 风险 | 缓解 | 回滚 |
| --- | --- | --- |
| PRD 后补导致信息架构变化 | Phase 0 差异评审；组件与数据解耦 | 暂停后续模块，保留已稳定的外壳/工具链 |
| 角色内容不准确或版本过期 | 来源、版本、ContentMeta、构建校验、内容负责人签字 | 回退单个内容模块/数据 commit，不回退 UI |
| 资源许可不清 | 素材清单和 credit/许可门禁 | 替换为已许可资源或隐藏 gallery 项 |
| 目录/URL 迁移导致 404 | 先确认托管；兼容旧路径；链接爬取 | 恢复旧目录构建或旧入口文件 |
| 新构建链破坏简单部署 | 锁 Node/依赖版本；保存静态 `dist` 验收产物 | 继续发布现有纯静态目录 |
| 首屏视觉质量与体积冲突 | 多尺寸格式、艺术裁切、真实设备对比 | 回退到较高质量候选，但仍不得恢复 4 MB 首屏 |
| 交互无障碍回归 | HTML-first、Playwright、键盘/读屏门禁 | 禁用增强脚本，回退到全部展开的静态内容 |
| 当前脏工作树发生冲突 | 实施前提交/备份；每 phase 小提交 | 按 phase revert，禁止 hard reset 用户改动 |

每个 Phase 独立提交、可独立预览。路由切换与旧文件删除必须是最后的单独变更；回滚优先 `git revert` 对应提交或重新发布上一份已验收静态产物，不使用破坏工作树的强制重置。

## 18. 给全栈工程师的任务清单与验收方式

| ID | 任务 | 交付物 | 验收方式 |
| --- | --- | --- | --- |
| ARCH-01 | 补齐输入与决策记录 | PRD、README、部署/URL ADR、内容源清单 | 四类负责人确认；本文的待确认项关闭 |
| ARCH-02 | 固化旧站基线 | 截图、性能报告、链接报告、回退 commit | 6 个当前页面可打开；基线报告可复现 |
| TOOL-01 | 建立 Vite MPA/TS | package scripts、Vite/TS 配置 | 全新 clone 后单命令 install/build；产物可静态打开 |
| TOOL-02 | 建立质量门禁 | lint/typecheck/unit/e2e CI | 故意引入类型错、断链、失败测试时 CI 能拦截 |
| DATA-01 | 实现类型和内容校验 | `models/`、`check-content` | 重复 ID、悬空来源、行迹环、缺 alt 均导致失败 |
| DATA-02 | 录入权威专题内容 | `content/mydei/*` 与来源表 | 内容负责人逐项签字；零未授权虚构数据 |
| UI-01 | 共享 Layout/Nav/Footer | 可复用静态结构和样式 | 所有页面无复制漂移；360px 无横向滚动；键盘可用；320px 韧性抽检 |
| UI-02 | 设计 token 和响应式基础 | tokens/global/component CSS | 色彩对比 AA；200%/400% zoom 不丢内容 |
| PERF-01 | 优化图片资产 | 多格式/尺寸图片和引用 | 移动端不请求 4 MB 原图；尺寸、alt、lazy 策略正确 |
| PAGE-01 | Hero/Overview/Stats | 三个组件和数据接入 | 单一 h1；LCP 候选合理；缺字段不会显示坏值 |
| PAGE-02 | Skills/Traces/Eidolons | 组件、controller、测试 | ARIA tabs 键盘通过；无 JS 全可读；手机 tree 为可读列表 |
| PAGE-03 | Builds/Teams/Rotation | 数据化攻略模块 | 每项显示版本、条件、来源；窄屏顺序正确 |
| PAGE-04 | Lore/Quotes/Gallery | 叙事和媒体模块 | 引语有出处；dialog 焦点正确；大图按需加载 |
| PAGE-05 | SourceNotice/缺失态 | 来源、版本、空态 | 缺数据不伪造；争议/待核验状态用户可见 |
| MIG-01 | 馆藏与日志数据迁移 | 独立内容文件和页面 | 与当前已审核文本逐段 diff；HTML 结构有效 |
| SEO-01 | SEO 和错误页 | metadata、JSON-LD、sitemap、404 | title/description 唯一；canonical 使用确认域名；无虚构 schema |
| A11Y-01 | 无障碍验收 | 自动报告 + 人工记录 | axe 无严重问题；全键盘流程和至少一次读屏抽检通过 |
| QA-01 | 跨浏览器/响应式测试 | Playwright 报告、实机记录 | 测试矩阵全部通过或有获批豁免 |
| PERF-02 | 性能验收 | Lighthouse/网络瀑布报告 | 达到第 9 节预算或记录经批准的例外与整改期限 |
| RELEASE-01 | 预览与回滚演练 | 预览地址、旧路径表、回滚记录 | 旧链接无意外 404；可恢复上一份静态产物；未擅自生产部署 |

## 19. 技术矛盾与待产品确认记录

1. **PRD 审计基线与当前工作树不一致**：PRD 记录“无 package.json”，但审计期间工作树新增了未跟踪的 Node 工具链配置。本文以最新工作树为准，同时要求先评审变更所有权和建立 lockfile。
2. **“优先沿用现有依赖”与实际可执行性**：当前 `package.json` 已声明 Vite/TypeScript/ESLint/Vitest，但没有安装、lockfile、TS 源码或测试。建议沿用这组开发依赖，修正配置后再补浏览器 E2E；不新增运行时依赖。
3. **“禁止编造角色数据”与目标模块数据缺失**：当前没有技能、星魂、配队等数据源。工程可以建空类型和缺失态，但在权威内容到位前不能完成这些模块的产品验收。
4. **首屏要求与现有实现冲突**：当前封面直接加载约 4.07 MB 背景，不能原样沿用；素材必须优化或替换，但视觉裁切需设计确认。
5. **内容/UI 解耦要求与现状冲突**：馆藏约 59 KB 长文直接内联 HTML，必须逐步迁移；迁移过程需内容 diff，不能机械复制后默认正确。
6. **目标清晰路由与部署未知冲突**：干净 URL 是否可用取决于托管根路径/重写能力；在确认前不应自行改变线上 URL。
7. **故事导航 P0 与故事内容 P1 存在范围张力**：PRD 要求 P0 一级导航包含“故事/档案入口”且 P0 不得有无效占位，但故事、时间线和馆藏审计属于 P1。建议产品明确以下二选一：P0 提供一段已核验的最小故事摘要并链接来源，或 MVP 一级导航暂不显示“故事”；不能用“制作中”满足验收。
8. **内容治理字段与“待确认”发布边界需统一**：PRD 一方面要求 P0 基础资料/技能模块上线，另一方面确认全部具体数据尚待核验。架构允许字段级“待确认”，但如果整个模块都无已核验信息，应暂缓该模块而不是发布一屏占位；产品需定义 MVP 的最低有效内容量。
9. **工具链配置存在当前小型基础错误风险**：Vite 尚未显式配置 MPA inputs，`lint` 只覆盖 `Mydei/src`，测试只有两条内容断言且无 CI。这些应在 Phase 1 修正，但依照本阶段约束只记录，不直接修改。

## 20. 完成定义

本改版架构实施完成，不仅意味着“页面看起来完成”，还必须同时满足：

- PRD、内容、素材、来源和版本已审校；
- 目标路由和旧路径在已确认的静态托管上可用；
- 无运行时框架和非必要全局状态依赖；
- 核心正文无 JavaScript 仍可阅读；
- 三类 viewport、键盘、reduced-motion 和关键浏览器通过测试矩阵；
- 类型、Lint、内容校验、链接、E2E 和构建全部通过；
- 首屏资源和 Core Web Vitals 达到预算或存在明确批准的例外；
- 有可执行、已演练的静态产物回滚方案；
- 生产部署仍由获授权负责人执行，不属于本文档阶段的自动动作。
