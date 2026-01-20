# 迁移 TODO（按 docs/architecture-draft.md）

> 目标：把“R2 绑定式存储管理器”重构为“通用 S3-compatible 存储桶管理工具”，并引入用户注册/登录、桶配置与管理、对象浏览/上传/删除等能力。
>
> 本清单以 docs/architecture-draft.md 为准，并结合当前仓库现状（Vue SPA + Hono + Drizzle 已落地部分文件）。

## 0. 当前进度速览（以仓库文件为准）

- [x] D1/Drizzle schema 已建立（`db/schema.ts`）
- [x] Drizzle 初始迁移已生成（`drizzle/*.sql`）
- [x] Drizzle 相关脚本已加入（`package.json`：`drizzle:generate|migrate|push|studio`）
- [x] Worker API 已移除 R2 binding 语义，改为 D1 buckets 配置 + S3-compatible 访问

## 1. 迁移原则与约束

- 路由约束：所有以 `@` 开头的路由为保留管理路由，禁止桶 ID 以 `@` 开头。
- 大文件优先预签名直传/直下：Worker 仅做“生成预签名 / 轻量代理（可选）”。
- 凭据安全：`secret_access_key` 等敏感字段需要加密存储/脱敏展示（至少做到“不可直接明文导出/日志泄露”）。
- 不考虑向前兼容旧数据与配置（允许破坏性迁移）。

## 2. P0：项目结构与旧代码隔离（优先级最高）

- [ ] 明确前后端边界：
  - `/api/**`：Hono API
  - 静态资源：Vite 构建产物 / 静态 assets

验收：`wrangler dev`/`vite dev` 时不再依赖 R2 binding 语义即可启动。

## 3. P1：D1/Drizzle 模型校准与迁移（高优先级）

> 草案中的 users.id 为 integer autoincrement；当前仓库实现已是 integer autoincrement（见 `db/schema.ts`）。
> 仍需决策的是 buckets.id 的策略（自定义 3-30 vs 生成 nanoid），以及“首个用户为管理员”的具体实现方式。

- [ ] 决策并固化主键策略：
  - users：integer autoincrement vs text
  - buckets：3-30 自定义 or nanoid（草案要求后续不可更改）
- [ ] 加入外键/索引（如 D1 支持范围内）：
  - sessions.user_id、buckets.owner_user_id、upload_history(bucket_id,user_id)
- [ ] `audit_logs` 表（可选）是否落地（或用 upload_history 覆盖最小需求）
- [ ] 增加“首个注册用户为管理员（ID=1）”规则的实现方式：
  - 若 users.id 不是 integer，需要定义等效规则（例如“首个创建的用户”）

已确认（2026-01-18）：

- buckets.id：使用随机 nanoid 自动生成（长度 12，URL-safe）
- buckets.secret_access_key：MVP 阶段先明文存入 D1（后续再补加密/脱敏）

验收：本地 D1 迁移可应用（`bun run drizzle:push`）且 schema 与代码一致。

## 4. P2：认证与会话（Auth）

- [x] 选型：纯 httpOnly Cookie 会话 + sessions 表（token 仅保存 hash）
- [x] 密码哈希：Web Crypto `pbkdf2`（含 salt、迭代次数/参数版本化）
- [ ] API：
  - [x] `POST /api/auth/register`
  - [x] `POST /api/auth/login`
  - [x] `POST /api/auth/logout`
  - [x] `GET /api/auth/me`
- [ ] 安全：
  - [ ] 登录限流（IP/账号维度，最简可用内存/短期 KV 可选）
  - [x] session token 存储为 hash（不落明文 token）
  - [x] 记录 `login_xff`、`login_ua` 并做基础校验（可选但建议）

验收：未登录访问受保护接口返回 401；注册/登录后可通过 `/api/auth/me` 获取用户信息。

## 5. P3：桶配置管理（Bucket CRUD + 连接测试）

- [ ] API：
  - [x] `GET /api/buckets`
  - [x] `POST /api/buckets`
  - [x] `PUT /api/buckets/:id`
  - [x] `DELETE /api/buckets/:id`
- [x] Input Validation：bucket_id 规则、endpoint_url、force_path_style、region 等
- [ ] 凭据处理：
  - [ ] `secret_access_key` 加密存储（至少：Worker 内部加密 + 不在返回体中回显）
  - [ ] 输出 DTO 脱敏（只回显末尾若干位或直接不回显）
- [x] 增加“连接测试”动作（可作为创建/更新时的可选校验或独立接口）

验收：管理员/拥有者可 CRUD；非拥有者不可读写（除非授权）。

## 6. P4：S3 访问层抽象（Adapter）

- [x] 定义统一接口（list/get/put/delete/copy/test/presign）
- [ ] Provider 适配：
  - [x] R2（S3 API 方式，不再依赖 R2 binding）
  - [x] AWS S3
  - [x] MinIO（force_path_style 常见）
- [x] 兼容差异处理：分页、错误码映射、metadata/header

验收：同一套前端/接口可切换不同 provider，仅依赖 buckets 表配置。

## 7. P5：对象 API 与 Raw 访问

- [x] 对象操作：
  - [x] `GET /api/bucket/:bucketId/*`（list/metadata，原计划为 /objects）
  - [x] `DELETE /api/bucket/:bucketId/*`（原计划为 /objects）
  - [x] `PUT /api/bucket/:bucketId/*`（rename/metadata，含 upload_history 记录）
  - [x] `POST /api/objects/:bucketId/presign`（上传/下载预签名）
  - [x] `POST /api/objects/:bucketId/record`（上传完成后补录 history）
  - [x] `PATCH /api/bucket/:bucketId/*`（修改元数据，如 isPublic）
- [x] 原始文件访问：
  - [x] `GET /api/raw/:bucketId/*`（代理下载，已增加 Session/Owner/Public 校验）
  - [ ] 可选：小文件代理（明确 size 限制）
- [x] 支持 `cdn_base_url`：前端渲染/下载可直链（public-read 场景，getCDNUrl 已实现）

验收：

- 预签名上传可成功 PUT；浏览器侧可列目录、预览文本/图片、删除对象。

## 8. P6：前端改造（UI/路由/接口对接）

- [x] 新增认证页面：`/@auth/login`、`/@auth/register`
- [x] 新增桶管理页面：`/@admin/buckets`
- [x] 路由守卫：未登录/无权限重定向到登录页
- [x] 上传流程改为“先 presign -> 再直传”，并将 upload_history 写入（后端）
- [x] Object Browser 路由：`/:bucketId/:path(.*)*`（并处理 `@` 前缀保留）

验收：从 UI 完成“登录 -> 新建桶 -> 浏览/上传/删除 -> 退出登录”的闭环。

## 9. P7：高级能力（可选/增量）

- [ ] `audit_logs`（已在 upload_history 覆盖基础上传记录）
- [x] `path_metadata`：目录公开/标签/目录密码 (isPublic 字段及切换功能已完成)
- [x] 站点基础设置（D1 `site_settings`）：站点名称、是否开放注册（DB -> env -> 默认值）
- [ ] 分享链接/只读访问（如后续需要）
- [ ] 管理后台其它站点配置（草案中的 `/@admin/xxx`）

## 10. P8：运维与质量（最后收口）

- [ ] 最小化 secrets 泄露面：日志、响应体、前端缓存
- [ ] 引入缓存层以降低 D1 读延迟与读放大：
  - 方案：Workers KV（最终一致）做 cache-aside；强一致需求（限流/锁/强制注销）用 Durable Objects
  - 优先缓存：site_settings / bucket config / path_metadata；session user 仅短 TTL 可选
  - 调研报告：见 docs/workers-kv-cache-research.md
- [ ] 错误处理与统一响应格式（至少做到可定位问题）
- [ ] 文档：更新 README（部署/本地开发/D1 初始化/迁移）
- [ ] 清理：删除不再使用的旧接口与旧前端耦合代码

---

## 变更记录

- 2026-01-17：根据 docs/architecture-draft.md 初始化迁移 TODO 清单，并标记当前仓库已存在的 Drizzle/D1 基础文件。
- 2026-01-17：后端已移除 R2 binding 语义；新增 buckets CRUD+连接测试、对象 presign；引入 StorageAdapter/S3Adapter 并完成后端路由接线。
- 2026-01-17：整理 backend 目录结构为 routes/lib/storage，并用根目录 shim 再导出保持旧 import 路径兼容。
- 2026-01-18：完成前端桶管理 (/admin/buckets)、上传流程重构（Presign+Record）、Raw 访问权限校验、元数据公开性切换 (Toggle Public)。
- 2026-01-20：新增 D1 `site_settings`，将站点名称/开放注册等设置收束到数据库管理，并提供 public/admin API。
- 2026-01-20：将随机上传目录/上传并发/上传历史上限/文本预览大小上限从前端 `VITE_*` 编译期配置迁移为 public-settings 运行时下发（D1 -> env -> default），并扩展后台设置编辑能力。
