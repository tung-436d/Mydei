# 万敌角色专题站

《崩坏：星穹铁道》万敌中文角色专题站。站点采用 Vite、TypeScript 和语义化静态 HTML，提供角色档案、技能、星魂、馆藏与图集。

## 页面结构

- `/`：一屏专题首页
- `/profile/`：角色档案、属性、晋阶、行迹与故事
- `/skills/`：技能、强化形态与附加能力
- `/eidolons/`：E1–E6 星魂与本地静态图片
- `/library/`：17 篇馆藏全文与目录
- `/gallery/`：本地图集
- `/404.html`：统一的真实错误页

旧地址由开发与预览服务器按架构清单返回 301 或 404，不再产出旧版 HTML。

## 本地运行

```bash
pnpm install
pnpm dev
```

默认访问 `http://localhost:5173/`。生产构建和预览：

```bash
pnpm build
pnpm exec vite preview --config vite.config.ts
```

Windows 用户也可以直接双击项目根目录的 `start.bat`。脚本会检查 Node.js、npm 和项目配置，首次运行时自动安装依赖，随后启动开发服务器并打开 `http://127.0.0.1:5173/`；请保持脚本窗口开启。

## 验证

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:dist
pnpm test:e2e
```

也可以运行 `pnpm check` 顺序执行全部检查。Playwright 覆盖 360、390、768、1024、1280 和 1440 像素视口。

## 内容维护

页面组件与内容数据位于 `Mydei/src/`，技能和星魂分别位于 `Mydei/src/content/mydei/skills.ts` 与 `eidolons.ts`，馆藏正文位于 `library.ts`。星魂媒体位于 `Mydei/public/assets/mydei/eidolons/`，页面只使用项目内相对路径。结构校验会检查重复 ID、图片引用、行迹依赖、必填文本及馆藏正文完整性。

## Cloudflare Pages

当前项目是纯静态 Vite 多页面构建，不包含 Worker、Pages Functions 或服务端运行时，因此使用 Cloudflare Pages：

- 根目录：仓库根目录
- 构建命令：`pnpm build`
- 输出目录：`dist`
- 旧地址 301：`Mydei/public/_redirects`
- 真实 404：构建产物顶层 `404.html`；不存在的静态路由由 Pages 自动返回该页面和 404 状态，不配置 SPA fallback

正式域名为 `https://mydeimos.love`，canonical、Open Graph URL、`sitemap.xml` 和 `robots.txt` 均使用该 origin。本任务不执行部署或修改 Cloudflare 控制台。

本站为万敌厨创作的非官方网站。游戏相关的图像和资产的版权和商标权归 HoYoverse 所有。
