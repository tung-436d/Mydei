# 万敌角色专题站

一个基于原有“黄金蜜饼”静态站渐进改造的《崩坏：星穹铁道》万敌中文粉丝专题站。本站并非官方网站；角色数据与图片素材在对外发布前仍需完成来源、版本和许可审核。

## 本地开发

需要 Node.js 20.19+（推荐当前 LTS）和 pnpm 11.19。仓库通过 `packageManager` 和锁文件固定安装口径。

```bash
pnpm install
pnpm dev
```

开发服务器默认地址为 `http://localhost:5173/`。

## 质量检查与构建

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

生产文件输出到 `dist/`。构建配置包含专题首页以及现有首页、关于、馆藏、纷争剧作和更新日志页面，保留旧路径可用性。

## 内容维护

- 内容模型位于 `Mydei/src/models/`，专题数据按领域拆分在 `Mydei/src/content/`。
- `pnpm check:content` 会检查重复 ID、引用、来源、作者、版本、复核日期、行迹依赖和素材状态。
- 未经可靠来源核验的角色事实必须保持“待核验”，不得填写推测数值或剧情。
- `vite.config.ts` 在开发和构建阶段把核心内容静态写入 HTML，增强脚本失效时正文仍可阅读。
- 现有长篇馆藏暂时保留在旧页面，迁移前需逐段校对来源与版权状态。
- 不提交 `node_modules/` 或 `dist/`，不在未授权情况下执行部署。

## 内容审核流程

1. 先在 `sources.ts`、`authors.ts` 和 `assets.ts` 登记来源、责任人和素材权利状态。
2. 只有人工对照完成的事实才能标记为 `official / verified`；玩法建议必须包含作者和适用版本。
3. `pending` 素材不会进入发布画廊。未经核验的数值不得写入待确认字段。
4. 提交前运行 `pnpm check`，并由内容负责人复核变更过的字段。

## 回滚

每个实施阶段使用独立提交。需要回退时优先对对应提交执行 `git revert <commit>`，再重新运行 `pnpm check`；不要使用会覆盖本地工作的强制重置。`dist/` 是可重复生成产物，不作为回滚源。
