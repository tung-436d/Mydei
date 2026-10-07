# 万敌角色专题站

《崩坏：星穹铁道》万敌中文角色专题站。站点采用 Vite、TypeScript 和语义化静态 HTML，提供角色档案、技能、星魂、馆藏与止戈遗录。

## 页面结构

- `/`：一屏专题首页
- `/profile/`：基础资料、完整角色介绍与角色故事一至四
- `/skills/`：技能、强化形态与附加能力
- `/eidolons/`：E1–E6 星魂与本地静态图片
- `/library/`：17 篇馆藏全文与目录
- `/archive/`：止戈遗录，TiebaScraper 归档的云端导入与阅读
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

页面组件与内容数据位于 `Mydei/src/`。完整角色介绍和四篇角色故事分别位于 `Mydei/src/content/mydei/profile.ts` 与 `stories.ts`，技能和星魂位于 `skills.ts` 与 `eidolons.ts`，馆藏正文位于 `library.ts`。星魂媒体位于 `Mydei/public/assets/mydei/eidolons/`，页面只使用项目内相对路径。结构校验会检查重复 ID、知识链接、故事顺序、Markdown 换行残留、图片引用、行迹依赖及必填文本。

## Cloudflare Pages

前端继续使用静态 Vite 多页面构建，可部署在 Cloudflare Pages。止戈遗录另外提供 Node.js 24.20+ 文件服务，需单独部署到有持久磁盘的服务器；Cloudflare Pages 本身不能保存上传的归档。配置与验证记录见 [止戈遗录部署说明](docs/architecture/zhige-archive.md)。

- 根目录：仓库根目录
- 构建命令：`pnpm build`
- 输出目录：`dist`
- 旧地址 301：`Mydei/public/_redirects`
- 真实 404：构建产物顶层 `404.html`；不存在的静态路由由 Pages 自动返回该页面和 404 状态，不配置 SPA fallback

正式域名为 `https://mydeimos.love`，canonical、Open Graph URL、`sitemap.xml` 和 `robots.txt` 均使用该 origin。本任务不执行部署或修改 Cloudflare 控制台。

## 止戈遗录

文件服务入口为 `services/tieba-archive-files/server.mjs`，通过 `ARCHIVE_DATA_DIR` 指定持久数据目录，并配置管理员凭证。开发与预览默认代理 `/api/archives` 到 `http://127.0.0.1:8787`。部署配置位于 `deploy/`；私人归档的列表、数据库与媒体均受访问控制。原始归档和 JSON 清单持久保存在文件目录中，不需要另建 MySQL 服务。

全套检查中的归档服务测试需要 Node.js 24.20+。`pnpm test:archive` 检查权限、上传中断、原文件与 WAL 保留、清单恢复和后端重启。真实数据仅在本机通过 `node scripts/verify-real-archives.mjs <归档父目录>` 验证，不进入仓库或 `dist`。

本站为万敌厨创作的非官方网站。游戏相关的图像和资产的版权和商标权归 HoYoverse 所有。
