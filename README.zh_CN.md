<div align="center">

<img src="./public/logos/flaredrive-logo-h.png" width="200" alt="FlareDrive Logo" />

# FlareDrive: REMASTERED

[<img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare">](https://deploy.workers.cloudflare.com/?url=https://github.com/project-epb/flaredrive-rev)

</div>

[English](README.md)

FlareDrive Rev 是一个基于 Cloudflare Workers 的云原生 S3-compatible 存储桶管理工具。

本仓库处于持续重构中，架构草案与迁移进度请参考：

- [docs/architecture-draft.md](docs/architecture-draft.md)
- [docs/migration-todos.md](docs/migration-todos.md)

## 项目概览

- **后端**：Cloudflare Workers + Hono（`/api/**`）
- **数据库**：Cloudflare D1（SQLite 兼容）+ Drizzle ORM
- **前端**：Vue 3 SPA（Naive UI），通过 Vite 构建并由 Workers assets 提供静态资源
- **存储后端**：S3-compatible（Cloudflare R2 / AWS S3 / MinIO / ...）

## 已实现功能（当前）

- 用户注册/登录（基于 Cookie 的会话）
- 存储桶配置管理与连接测试（配置存储在 D1）
- 对象浏览（列表/预览/删除）
- 预签名直传上传 + 上传历史记录
- `/api/raw/:bucketId/*` 原始文件访问（带权限校验）
- 站点设置存储在 D1（回退链：DB → env → default）

目前 UI 暂时仅提供英文版本。

## 运行环境

- Node.js 22+（推荐 24.x）
- Bun
- Cloudflare 账号（部署/生产 D1 需要）

## 本地开发

安装依赖：

```bash
bun install
```

可选：创建本地 env 文件（前端构建期配置项）：

```bash
cp .env.sample .env
```

将 Drizzle 迁移应用到本地 D1：

```bash
bun run drizzle:push
```

启动开发服务器：

```bash
bun dev
```

默认地址：`http://localhost:5880`

## 认证 / 创建第一个管理员

常见有两种方式：

1. **开启注册**：第一个注册的用户（ID=1）会自动成为管理员。

- 开关的解析顺序：**DB → env → default**
- 在 `wrangler.jsonc` 中，`ALLOW_REGISTER` 默认是 `false`
- 管理员可在 UI 的 `/@admin/settings` 中修改

2. **使用管理员创建接口**（无需开放注册）

- 先把 `ADMIN_CREATE_TOKEN` 配置为 Worker Secret
- 然后运行：

```bash
bun run user:create -- --url http://localhost:5880 --email admin@example.com --password "StrongPass123" --token "<ADMIN_CREATE_TOKEN>"
```

脚本说明见：[scripts/create-user.ts](scripts/create-user.ts)

## 常用脚本

- `bun dev`：启动开发服务器
- `bun run build`：构建前端 + Worker assets
- `bun run deploy`：部署到 Cloudflare Workers
- `bun run drizzle:push`：应用本地 D1 迁移
- `bun run drizzle:push-prod`：应用生产 D1 迁移（D1 HTTP）
- `bun run drizzle:studio`：打开 Drizzle Studio（本地）
- `bun run drizzle:studio-prod`：打开 Drizzle Studio（生产）

## 环境变量

前端（Vite）环境变量：

- `.env`（可选）
- `.env.development` / `.env.production`
- `.env.sample` 列出支持的键

后端（Worker）环境变量通常在 Cloudflare（Dashboard / Wrangler）中配置：

- `ALLOW_REGISTER`（字符串布尔值）
- `SITE_NAME`（站点显示名称）
- `ADMIN_CREATE_TOKEN`（启用 `/api/auth/admin-create`）

生产环境 Drizzle（D1 HTTP driver）需要：

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_DATABASE_ID`

## 目录结构

- `backend/`：Worker API（Hono）
- `frontend/`：Vue SPA
- `db/`：Drizzle schema
- `drizzle/`：SQL migrations
- `common/`：共享工具

## 截图

**存储桶管理**

![](https://github.com/user-attachments/assets/e36d3442-6b73-445a-b672-d1b8851d53ce)

![](https://github.com/user-attachments/assets/77ad92fe-f530-4485-9e59-f56d0b642572)

**画廊布局**

![](https://github.com/user-attachments/assets/a815f682-fac4-459b-b53a-9c219966be3d)

**阅读布局**

![](https://github.com/user-attachments/assets/27135561-6ab7-40fd-8bae-3cb833f74c4c)

**漫画模式！**

![](https://github.com/user-attachments/assets/bcb31353-7709-4152-b6a9-8297e300a387)

**文件信息**

![](https://github.com/user-attachments/assets/f8e5c6ab-7d16-48f3-972c-49ef109549b8)

## License

> MIT License
>
> - Copyright (c) 2022 Siyu Long (before f82ffdc)
> - Copyright (c) 2025 Dragon Fish (remastered version)

> FlareDrive Logos & mascots
>
> - CC BY-SA 4.0
> - See more: [README](public/logos/README.md)
