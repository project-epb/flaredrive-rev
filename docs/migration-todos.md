# 迁移 TODO（按 docs/architecture-draft.md）

更新时间：2026-01-17

> 说明：本清单按 [docs/architecture-draft.md](architecture-draft.md) 的“分阶段实施建议”拆解，并基于当前仓库代码现状标记完成度。
>
> 标记规则：
> - `[x]` 已完成（代码/配置已落地）
> - `[ ]` 未完成
> - `[ ]（进行中）` 已有雏形但尚未打通或存在明显缺口

## 0. 基础架构迁移（Nuxt + Nitro + D1 + Drizzle）

- [x] Nuxt 4 项目结构落地（pages/layouts/middleware/server 目录已存在）
- [x] Nitro 目标为 Cloudflare Workers（nuxt.config.ts 使用 `preset: 'cloudflare_module'`）
- [x] D1 + Drizzle 基础接入（server/db/index.ts 使用 `drizzle-orm/d1`）
- [x] D1 绑定声明存在（wrangler.jsonc 中 `d1_databases.binding = DB`）
- [x] 基础迁移文件存在（drizzle/0000_*.sql 已包含 users/buckets/sessions）
- [x] 补齐迁移：`upload_history` / `path_metadata`（drizzle/0001_*.sql 已生成并可被 wrangler 本地应用）
- [ ] 对齐 `compatibility_date`（wrangler.jsonc）与 Nuxt `compatibilityDate`（nuxt.config.ts）
- [ ] 处理遗留目录：backend/ 与 frontend/（迁移可复用部分后，明确只读参考或清理）

## 1. 认证系统（注册/登录/会话）

- [x] 注册 API：`POST /api/auth/register`（server/api/auth/register.post.ts）
- [x] 登录 API：`POST /api/auth/login`（写入 sessions + httpOnly Cookie）
- [x] 当前用户 API：`GET /api/auth/me`
- [x] 密码哈希：PBKDF2（SHA-256）+ salt（server/utils/crypto.ts）
- [x] 会话 token 存储：仅保存 token 的 SHA-256（server/utils/auth.ts）
- [ ] 增加登出 API（删除 cookie + 使 session 失效）
- [x] 前端路由守卫联调：middleware/auth.ts 与 `/api/auth/me` 的返回结构对齐
- [ ] 会话清理策略（过期 sessions 的清理：懒清理/后台任务/定期维护）
- [ ] 授权等级（authorization_level）在 API 层的细粒度权限控制（目前仅 `requireAuth`）

## 2. 桶配置管理（CRUD）

- [x] buckets 表结构已定义（server/db/schema.ts）
- [x] 桶列表：`GET /api/buckets`
- [x] 新建桶：`POST /api/buckets`
- [x] 更新桶：`PUT /api/buckets/:id`
- [x] 删除桶：`DELETE /api/buckets/:id`
- [x] 前端桶管理页：pages/buckets/index.vue（含 BucketForm 组件）
- [ ] 凭据安全：`secret_access_key` 加密存储/脱敏展示（草案建议）
- [ ] 桶连接测试（创建/编辑时校验 endpoint/credentials/bucketName 可用）

## 3. S3 访问层（List/Get/Put/Delete + Presign）

- [x] S3 适配层：S3Adapter（server/utils/s3-adapter.ts）
- [x] 列表 API：`GET /api/objects/:bucketId/*`（基于 ListObjectsV2）
- [x] 删除对象 API：`DELETE /api/objects/:bucketId/*`
- [x] 预签名 API：`POST /api/objects/:bucketId/presign`（上传/下载）
- [x] 前端与 presign 参数协议对齐（统一使用 `operation`，后端兼容 `action`）
- [ ] 支持分页（continuation token）与大目录场景（目前仅 maxKeys，无 continuationToken 入参）
- [x] 原始文件访问：`GET /api/raw/:bucketId/*`（重定向到 CDN 或预签名下载 URL）
- [ ] CDN Base URL 策略：配置 `cdn_base_url` 时前端优先直链，否则走 presign
- [ ] 备选方案：小文件 Worker 代理上传/下载（避免大文件代理）

## 4. 前端功能恢复（列表/预览/上传/删除）

- [x] 登录/注册页面：pages/auth/login.vue、pages/auth/register.vue
- [x] 存储桶列表与新增/编辑/删除交互：pages/buckets/index.vue + components/BucketForm.vue
- [x] 对象浏览页面骨架：pages/browse/[id]/[[...path]].vue（列表/面包屑/刷新）
- [x] 删除对象 UI 已接入（调用 DELETE objects API）
- [ ]（进行中）上传端到端打通：components/UploadForm.vue（目前 presign 字段不匹配，且未写入 upload_history）
- [ ]（进行中）下载端到端打通：browse 页下载按钮（presign 字段不匹配）
- [ ] 文件预览（图片/视频/音频/文本/PDF 等）
- [ ] Bucket 名称/信息展示完善（browse 页 bucketName 目前未加载）
- [ ] 上传历史（upload_history）：表迁移 + API 写入点 + 前端展示
- [ ] README 更新为“新架构：S3-compatible + 用户/桶配置 + Nuxt/Nitro/D1/Drizzle”（当前 README 仍偏旧 R2 描述）

## 5. 高级功能（可选）

- [ ] audit_logs：表结构 + 写入点（登录/桶增删改/对象删除等）
- [ ] path_metadata：公开目录/密码/标签/自定义元数据（表迁移 + API + 前端）
- [ ] KV 缓存（可选）：热门列表/metadata 缓存与失效策略
- [ ] 分享/权限细化（匿名访问、目录级权限等）

---

## 当前完成度（粗略）

- 基础架构：已完成（核心骨架已落地），但迁移文件需要补齐（upload_history/path_metadata）
- 认证系统：核心已完成（注册/登录/会话/me），缺少登出与前端守卫联调
- 桶管理：CRUD 已完成，缺少凭据安全与连接测试
- S3 访问层：list/delete/presign 已完成，raw 与分页未完成
- 前端：桶管理/浏览列表/删除已完成；上传/下载/预览仍在打通阶段
