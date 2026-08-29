# 万敌角色专题站

《崩坏：星穹铁道》万敌中文角色专题站。站点采用 Vite、TypeScript 和语义化静态 HTML，提供角色概览、技能、行迹、星魂、培养、配队、输出循环、故事与馆藏阅读。

## 页面结构

- `/`：专题首页
- `/library/`：17 篇馆藏全文与目录
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

页面组件与内容数据位于 `Mydei/src/`，馆藏正文位于 `Mydei/src/content/mydei/library.ts`。结构校验会检查重复 ID、图片引用、行迹依赖、必填文本及馆藏正文完整性。产品方未提供的可选字段直接省略，不填写推测数值或剧情。

本站为万敌厨创作的非官方网站。游戏相关的图像和资产的版权和商标权归 HoYoverse 所有。
