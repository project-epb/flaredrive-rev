# 重构架构设计草案（D1 + S3-compatible + Nuxt + Drizzle）

## 1. 目标与范围

- 目标：将当前 R2 绑定式存储管理器改造为“通用 S3-compatible 存储桶管理工具”，并支持简单的用户注册/登录、桶配置与管理。
- 关键要求：
  - D1 作为元数据存储（用户、桶配置、会话等）
  - S3-compatible 后端（R2、AWS S3、MinIO、Wasabi 等）
  - 前端改为 Nuxt（3.x）
  - ORM 使用 Drizzle

## 2. 现状与耦合点

- 当前后端强耦合 R2 绑定（R2Bucket API）。
- 无用户系统、无桶配置管理，桶信息来自环境绑定。
- 前端直接依赖 `/api/bucket` 与 R2 语义。

结论：需要重新抽象存储层、引入用户/桶配置数据模型、调整前端路由与接口。

## 3. 高层架构

```
Nuxt (Web UI)
  ├── Auth UI
  ├── Bucket Config UI
  └── Object Browser / Upload

API (Workers + Hono)
  ├── Auth
  ├── Bucket Config
  ├── S3 Adapter (List/Put/Get/Delete)
  └── Presign Service

D1 (Drizzle)
  ├── users
  ├── buckets
  ├── sessions
  └── audit_logs (可选)

S3-compatible Providers
  ├── R2 / AWS S3 / MinIO / ...
```

## 4. 关键设计决策

### 4.1 存储访问方式

- 主路径：预签名 URL + 前端直传
- 备选：小文件可通过 Worker 代理直传

### 4.2 认证

- JWT + D1 sessions 表（或基于 httpOnly Cookie 的会话）
- 密码存储：`scrypt`/`pbkdf2`（Web Crypto）

### 4.3 Drizzle 与 D1

- 采用 Drizzle ORM 定义 schema 与迁移
- 通过 `drizzle-orm/d1` 适配器访问 D1

## 5. 数据模型草案（D1 / Drizzle）

### users

- id (text, pk)
- email (text, unique)
- password_hash (text)
- created_at (integer)
- status (text)

### buckets

- id (text, pk)
- owner_user_id (text, fk users)
- name (text)
- cdn_base_url (text, 可选，用于前端渲染与下载加速)
- endpoint_url (text)
- region (text)
- access_key_id (text)
- secret_access_key (text, 建议加密存储)
- bucket_name (text)
- force_path_style (integer: 0/1)
- created_at (integer)

### sessions

- id (text, pk)
- user_id (text, fk users)
- token_hash (text)
- expires_at (integer)

### audit_logs（可选）

- id (text, pk)
- user_id (text)
- action (text)
- target (text)
- created_at (integer)

### upload_history（建议）

- id (text, pk)
- user_id (text, fk users)
- bucket_id (text, fk buckets)
- object_key (text)
- object_size (integer)
- content_type (text)
- created_at (integer)

### path_metadata（建议）

- id (text, pk)
- user_id (text, fk users)
- bucket_id (text, fk buckets)
- path (text, 目录或对象前缀)
- is_public (integer: 0/1)
- access_password_hash (text, 可选)
- extra_metadata (text/json, 可选)
- created_at (integer)
- updated_at (integer)

## 6. API 设计草案

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Bucket 配置

- `GET /api/buckets`
- `POST /api/buckets`
- `PUT /api/buckets/:id`
- `DELETE /api/buckets/:id`

### 对象操作

- `GET /api/objects/:bucketId/*`（list/metadata）
- `DELETE /api/objects/:bucketId/*`
- `POST /api/objects/:bucketId/presign`（上传/下载预签名）

### 原始文件访问

- `GET /api/raw/:bucketId/*`（重定向或代理）

## 7. Nuxt 改造要点

- 移除 Vue SPA 入口，改为 Nuxt 页面结构
- 新增认证页面与路由守卫
- 桶列表与桶配置页面
- 将上传流程改为预签名 URL

## 8. 风险与对策

- S3 API 差异：分页/错误码/metadata 兼容性需适配
- Worker 资源限制：避免代理大文件，优先预签名
- 凭据安全：D1 中敏感字段需加密/脱敏

## 9. 分阶段实施建议

1. **基础架构迁移**：Nuxt 结构与 Hono API 骨架 + D1 接入
2. **认证系统**：注册/登录 + sessions
3. **桶配置管理**：CRUD + 连接测试
4. **S3 访问层**：list/get/put/delete + presign
5. **前端功能恢复**：列表/预览/上传/删除
6. **高级功能**：审计、权限、共享等

---

如需我继续输出：

- Drizzle schema 具体代码
- Nuxt 页面与 API 目录结构
- S3 adapter 的接口与实现建议
  请直接告诉我。
