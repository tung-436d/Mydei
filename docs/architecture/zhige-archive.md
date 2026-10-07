# 止戈遗录：实现、部署与验证

页面为 `/archive/`，独立于馆藏。导航及主标题为“止戈遗录”，副标题为“情绪在此落锁，旧痕在此入册。”，说明为“仅供留档，不作二度争端。”。沿用原页头、页尾、字体和配色。

## 第一阶段实现

目录选择 → 识别单份归档或父目录中的多份归档 → 创建上传任务 → 按文件、每块最多 4 MiB 上传 → 服务端校验 → 发布正式目录 → 原子更新 index.json → 网页阅读。XHR 的上传事件记录实际传输字节；没有把整份归档压缩或读入浏览器内存。一个批次中已完成的归档会独立保存，失败后重试会跳过这个批次已经留档的目录；重新选择文件夹则建立新快照。

网页加载时从服务端读取清单。选择归档后，其 `archive_id` 写入 URL，刷新或在另一台已验证身份的设备打开相同地址即可继续阅读。服务端保存的文件不依赖原电脑。状态为准备导入、上传中、校验中、已留档、导入失败，并显示失败原因和重试入口。

原始 `scrape_info.json`、各帖 `content.db`、`thread.json`、`forum.json`、日志、头像、图片、视频、语音及 SQLite WAL/SHM 文件按原相对路径保存。每次导入生成 UUID，不用原文件夹名称作为保存位置。支持一份归档中的主帖与转发原帖目录；相同帖子 ID 的不同快照不覆盖。

服务端在校验线程里用 Node 内置 SQLite 只读检查表结构、帖子 ID 和数据库完整性，不建立元数据数据库。它在临时副本上合并 WAL，生成 `.reader/<帖子ID>.db`，用于浏览器读取；原始数据库及其侧文件保留字节原样。正文、用户、楼中楼和回复关系由浏览器 Web Worker 中的 [sql.js](https://github.com/sql-js/sql.js) 查询，仅加载当前帖子的数据库。SQLite WASM 与 Worker 由 Vite 构建到本地静态资源，不依赖外部 CDN。

正文每页 20 层；楼中楼初次展开 10 条，继续按需加载。提供只看楼主、归档及归档内帖子切换、14–24px 字号、图片放大与下载。视频和语音使用原生播放器与文件下载；缺失媒体只显示局部提示。数据库或服务异常显示明确提示。文字用 DOM 文本节点渲染，链接仅接受 HTTP/HTTPS，不插入归档 HTML，不执行脚本。

## 持久目录与清单

```text
/data/tieba-archives/
├── index.json
├── staging/<上传ID>/
│   ├── session.json
│   ├── validation/          # 临时数据库副本
│   └── payload/             # 尚未发布的文件
├── archives/<archive_id>/
│   ├── manifest.json
│   ├── scrape_info.json
│   ├── .reader/<帖子ID>.db  # 生成的只读快照
│   └── threads/<帖子ID>/    # 原始文件及媒体
└── trash/                  # 删除后等待清理的文件
```

`manifest.json` 格式版本 1：归档 ID、主帖子 ID、标题、吧名、抓取及导入时间、抓取器版本、原文件总大小、实际存储大小、各帖可用信息及阅读数据库路径、文件清单。原始文件清单含路径、大小及 SHA-256；生成的数据库标注 `generated`。`index.json` 只含正式归档的摘要，不加载所有媒体清单。

上传块落盘并同步后更新任务记录；未接收完的文件不能提交。校验全部通过后在同一磁盘内原子移动目录，并原子替换 JSON 清单。启动时从正式目录的 manifest 重建 index，恢复“目录已发布、列表更新中断”的情况。删除先移到 trash，避免重启时重新出现；过期 staging 和 trash 可自动清理。失败的网页任务会立即请求取消，断网任务默认在 24 小时后过期。服务端没有自动覆盖或合并快照。

## 接口与访问控制

| 接口（以 `/api/archives` 为前缀） | 用途 | 权限 |
| --- | --- | --- |
| `GET /session` | 访问模式、当前身份及读取上限 | 公开 |
| `POST /session` | `{token}` 验证凭证 | 公开，失败尝试限频 |
| `DELETE /session` | 退出验证 | 当前浏览器 |
| `GET /` | index 列表 | 按访问模式 |
| `POST /imports` | `{files:[{path,size}]}` 创建任务 | 管理员 |
| `PUT /imports/:id/file?path=…&offset=…` | 二进制块上传 | 管理员 |
| `POST /imports/:id/complete` | 校验及发布 | 管理员 |
| `DELETE /imports/:id` | 取消未完成任务 | 管理员 |
| `GET /:id/manifest` | 文件及帖子清单 | 按访问模式 |
| `GET/HEAD /:id/files?path=…` | 原文件及生成的数据库，支持单段 Range | 按访问模式 |
| `DELETE /:id` | 删除整个快照 | 管理员 |
| `GET /health` | 存活检查 | 公开，不含归档信息 |

管理员与可选私人阅读者使用服务端环境变量中的独立随机凭证。登录后签发 12 小时的 HttpOnly、SameSite=Strict cookie；生产要求 HTTPS 和 Secure cookie。不把凭证写入前端构建或 localStorage。凭证不需要完整用户系统；私人模式下所有清单、数据库、头像和媒体接口都验证权限。文件服务的数据目录不能配置成 Nginx 静态目录。

写接口要求 `X-Archive-Request: 1`，CORS 只接受显式配置的 origin。限制文件数、文件及数据库大小、归档总大小、存储配额与临时任务数量。拒绝绝对路径、`..`、反斜杠、编码穿越、控制字符、目录冲突、重名路径、保留名称和 Tieba 登录凭据；读取必须匹配已发布清单，并验证实际路径仍在归档目录内。可执行文件格式作为附件下载，带 nosniff 与 sandbox 响应头。

## 本地启动

前端保留现有 Vite 开发方式；文件服务和包含服务测试的检查使用 **Node.js 24.20+**，无需额外 npm 服务端依赖。先生成随机凭证：

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
$env:ARCHIVE_DATA_DIR = 'C:\Users\Tung\MydeiArchiveData'
$env:ARCHIVE_ADMIN_TOKEN = '<上一步生成的随机凭证>'
$env:ARCHIVE_COOKIE_SECURE = 'false'  # 仅用于本地 HTTP
pnpm archive:serve
```

另一终端运行 `pnpm dev`，打开 `http://127.0.0.1:5173/archive/`。验证管理员凭证后导入。数据目录放在项目外，服务关闭后保留。生产预览同样代理 API 到 8787，目标可用 `ARCHIVE_PROXY_TARGET` 修改；更换开发端口时，把新 origin 加入 `ARCHIVE_ALLOWED_ORIGINS`。

## 部署配置（本轮未执行）

1. 将 `deploy/archive.env.example` 复制为 `deploy/archive.env`，用不同随机值替换管理员与阅读凭证。示例占位凭证会被服务拒绝。设置 `ARCHIVE_ACCESS=private` 或 `public`。默认私人；公开模式允许读取，上传和删除仍仅限管理员。
2. 在有 Docker 的主机上执行 `docker compose -f deploy/archive.compose.yml up -d --build`。该配置只启动文件服务，监听主机回环地址 8787，保留现有网站部署。**固定命名卷 `mydei-tieba-archives`** 挂载到 `/data/tieba-archives`；容器替换、镜像重建、普通 down/up 不删除数据。不要执行 `down -v` 或删除该卷。
3. 配置 HTTPS 反向代理，使用 `deploy/archive.nginx.conf.example` 将 `/api/archives` 转到文件服务。限制每次请求 5 MiB，关闭代理请求缓冲，允许校验等待 180 秒。前端和 API 同源时不设置 `VITE_ARCHIVE_API_URL`。
4. 若继续在 Cloudflare Pages 托管前端，可把 API 放到同站点 HTTPS 子域，例如 `https://archives-api.mydeimos.love`，在前端**构建环境**设置 `VITE_ARCHIVE_API_URL` 为该 origin。服务端 `ARCHIVE_ALLOWED_ORIGINS` 设置为前端的准确 origin，例如 `https://mydeimos.love`。严格 cookie 要求同站点；不要使用无关域名作为私人归档 API。重新 `pnpm build` 后按现有流程发布 `dist`。私人文件没有静态公开副本。
5. 服务以单实例运行；不要让多个进程或副本同时写同一卷。非 Docker 部署用相同环境变量和受系统管理的 Node 服务，`ARCHIVE_DATA_DIR` 必须指向持久磁盘；不要使用仓库、dist、容器可丢弃层或临时目录。

Compose 限制服务内存 384 MiB、CPU 1 核、最多两个未完成导入，数据库默认限制 32 MiB，文件 1 GiB、归档 2 GiB、存储配额 20 GiB。额度可按磁盘调整。媒体按需流式传输；服务器不承担全文检索或抓取。基于既有方案约 1 GiB 主机预算，新增 MySQL 会增加常驻资源与维护成本，而第一阶段没有需要结构化索引的查询，故采用原文件＋JSON 清单。未读取或修改线上主机的资源配置；内存测量仅针对本地文件服务，不代表整台主机的总占用。

应定期备份整个命名卷或持久数据目录。做一致性备份前暂停导入并停文件服务，复制整个目录后启动服务；恢复目录并启动服务会重建 index。恢复和更新时使用同一个持久卷、访问配置和凭证。实际服务器上线后验收：上传一份 → 停原电脑 → 手机读取 → 重启后端 → 重建容器 → 再次读取与检查哈希。本轮不操作线上服务器。

## 本地验证记录

2026-10-08：

| 检查 | 结果 |
| --- | --- |
| ESLint、TypeScript、内容及阅读查询单元检查 | 通过 |
| 生产构建和精确产物清单 | 7 个 HTML 入口、本地 WASM 和 Worker，未包含真实归档 |
| 浏览器矩阵 | 360、390、768、1024、1280、1440px；49 项通过，35 项按原矩阵设计跳过，另 6 项真实数据测试需显式指定本地路径 |
| 浏览器导入与阅读 | 中文父目录、两份相同 ID 快照、实际字节进度、上传失败及重试、刷新、独立会话、作者、分页、楼中楼关系、图片放大、字号、删除通过 |
| 真实归档 API 导入 | F:\TiebaScraper 下 34 份，约 140 MiB；含可选 SQLite WAL/SHM 侧文件的复核为 1,054 文件、146,661,999 字节，SHA-256 与所选文件逐项一致 |
| 真实正文核对 | 34 个数据库，596 层正文，719 条楼中楼；首层正文及用户与 SQLite 原始查询一致 |
| 较大真实归档浏览器导入 | 约 160 个文件、29 MiB；正文、用户、楼层、图片及刷新读取通过 |
| 服务端异常及权限 | 中断上传与缺失关键数据不发布；原始 DB/WAL 保留、WAL 正文可读；越界路径、未授权上传/删除、私人清单和媒体访问被拒绝 |
| 持久恢复 | 重复快照独立；服务进程重启后列表与文件可读；模拟 index 更新中断后重建通过 |
| 本地文件服务内存 | 真实归档顺序导入峰值 RSS 约 128–130 MiB（包含校验 Worker）；单帖最大数据库 266,240 字节 |

可复现命令：`pnpm check`；`node scripts/verify-real-archives.mjs <归档父目录>`。后者使用项目外临时持久目录和独立服务进程，验证后清除临时归档，只在 gitignore 的 `verification-results/` 保存统计报告。可选浏览器真实归档测试设置 `TIEBA_REAL_ARCHIVE_DIR` 为单份目录，再运行 `pnpm exec playwright test tests/e2e/archive.spec.ts --project=desktop-1440 --grep "a real TiebaScraper"`。真实内容和截图不提交。

剩余边界：本机没有 Docker，命名卷在真实容器更新后的留存尚未实测；线上跨设备与原电脑关机验收尚未执行，独立浏览器会话及后端重启已在本地验证。移动端布局通过 Chromium 视口测试，手机系统文件夹选择器需实机验收；不支持目录选择的浏览器可先在电脑导入、手机阅读。本地真实样本没有视频或语音，第一阶段通过合成不支持格式验证局部提示与下载，具体编码的播放能力仍由目标浏览器决定。没有在线抓取、全文检索、多用户系统或断点续传；失败可重新上传，过期任务会清理。
