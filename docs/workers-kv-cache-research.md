# 调研：在 FlareDrive Rev 引入 Workers KV 作为“类 Redis 缓存”可行性

日期：2026-01-20

## 结论摘要（TL;DR）

- **可以引入 Workers KV 作为缓存层**，用于降低 D1 的读放大与尾延迟，尤其适合：站点设置、桶配置、路径元数据、会话查找（短 TTL）等 **读多写少** 场景。
- **不建议把 KV 当成“Redis 的等价物”**：KV 的核心限制是 **最终一致性**、缺少事务/原子计数/强一致锁等能力；对“强一致 + 原子操作”的需求（限流、分布式锁、精确计数器、强一致会话撤销）更适合 **Durable Objects**。
- 推荐采用 **两级缓存**：
  1. Worker isolate 内存缓存（超热键、毫秒级、请求间复用但不跨隔离）
  2. Workers KV（跨隔离、跨 PoP 的全局缓存，最终一致）
  3. D1（source of truth）

> 目标不是“替代 D1”，而是对热点读进行 **cache-aside + TTL**，并在写路径上做 **best-effort 失效**。

## 现状与热点读路径（基于仓库代码）

当前后端为 Cloudflare Workers + Hono + Drizzle(D1)。

### 1) 会话鉴权（每个受保护接口都会触发）

- 位置：`backend/utils/session.ts` 的 `getSessionUser(ctx)`
- 行为：从 cookie 取 token，做 `sha256(token)` 得到 `tokenHash`，然后对 D1 做 join：`sessions` + `users`，并检查 `expiresAt > now`。
- **痛点**：几乎所有需要登录的请求都会命中该查询，属于典型“读非常热”的路径。

### 2) 站点设置（site_settings）

- 位置：`backend/utils/site-settings.ts` 的 `getSiteSettingsBatch` / `getPublicSiteSettings`
- 行为：按 key 批量读取 D1 `site_settings`，再回退 env/default。
- **痛点**：`/api/site/public-settings`、`/api/auth/*`、`/api/admin/settings` 等都会读；属于读多写少。

### 3) 桶配置（buckets）

- 位置：`backend/utils/bucket-resolver.ts` 的 `getBucketConfigById`
- 行为：按 bucketId 查询 `buckets` 取 endpoint、AK/SK、bucketName 等。
- **痛点**：对象浏览/上传/下载、raw 代理等路径都会读；属于读多写少，但包含敏感字段（SK）。

### 4) 路径元数据（path_metadata）

- 位置：`backend/utils/metadata.ts` 的 `getPathMetadata`
- 行为：按 `(bucketId, path)` 查 `path_metadata`。
- **痛点**：访问 raw 或浏览时可能频繁读；属于读相对热且写较少。

## Workers KV 能力画像（作为缓存层时需要关注的点）

### 优点（为什么能降延迟）

- **边缘分布式读取**：多数情况下 KV 读取延迟低于跨区域/冷连接数据库访问，且更平滑（尾延迟更好）。
- **天然 TTL**：适合缓存语义（`expirationTtl`）。
- **跨请求/跨隔离共享**：相比 isolate 内存缓存，KV 能覆盖更多实例。

### 限制（为什么它不是 Redis）

- **最终一致性**：写入后在全球范围传播需要时间，读可能得到旧值；不保证 read-after-write。
- **缺乏原子操作**：没有 Redis 那种原子自增、Lua、事务。
- **适合 KV，不适合复杂查询**：只能按 key 取值；不适合按条件扫描（list 也有限）。
- **不适合强一致安全敏感控制面**：例如“立刻撤销会话/封禁账号立即生效”的严格要求。

## 推荐的缓存策略（按场景给方案）

下面方案按“收益/风险比”排序。

### A. 站点 Public Settings 缓存（低风险、高收益）

- **缓存对象**：`getResolvedPublicSiteSettings(ctx)` 的结果（`siteName`, `allowRegister`）
- **key**：`v1:site:public-settings`
- **TTL**：30s ~ 5min（建议 60s 起步）
- **失效策略**：`admin.put('/settings')` 写入 D1 后，best-effort 删除该 key。
- **一致性要求**：低。设置最多延迟 1 分钟生效通常可接受。

可进一步：对 `/api/site/public-settings` 这种 GET，还可以用 `caches.default`（Cache API）缓存整段响应（注意 Vary/Cache-Control）。

### B. Bucket Config 缓存（中风险、高收益）

- **缓存对象**：`getBucketConfigById(ctx, bucketId)` 的结果
- **key**：`v1:bucket:${bucketId}`
- **TTL**：5min ~ 30min（建议 10min）
- **失效策略**：桶更新/删除后 best-effort 删除该 key。

**安全建议**：

- KV 里尽量避免保存 `secretAccessKey` 明文（即使 KV 有平台级别保护，也应当按最小暴露面设计）。
- 可选策略：
  - 只缓存非敏感字段（endpoint/region/bucketName/forcePathStyle/uploadMethod/cdnBaseUrl），并在需要 SK 时再查 D1；
  - 或对 SK 做 Worker 内部加密后再放入 KV（但密钥管理要清晰；MVP 可先不做）。

### C. Session User 缓存（收益大，但要控制安全风险）

- **缓存对象**：`getSessionUser` 的返回（`{id, email, authorizationLevel}`）或更小的 `{id, authorizationLevel}`
- **key**：`v1:sess-user:${tokenHash}`
- **TTL**：10s ~ 120s（建议 30s）并且不超过 session 剩余有效期
- **写/删**：
  - 登录成功后可写入（可选）
  - logout/revoke 后 best-effort 删除

**风险与对策**：

- 风险：KV 最终一致性导致“注销后短时间仍可通过缓存被识别为已登录”。
- 对策：
  - TTL 设很短（例如 30s）；
  - 关键写操作（修改桶配置、管理后台）可强制绕过缓存或做二次校验；
  - 如果要求“强一致注销/封禁”，推荐改用 **Durable Objects 会话存储** 或增加“会话版本号/撤销时间戳”并在缓存命中时校验（仍会回到 D1/DO）。

### D. Path Metadata 缓存（中收益、中风险）

- **缓存对象**：`getPathMetadata(ctx, bucketId, path)`
- **key**：`v1:pathmeta:${bucketId}:${hash(path)}`（避免 path 太长）
- **TTL**：1min ~ 10min（建议 2min）
- **失效策略**：`setPathMetadata` 后删除对应 key。

注意：metadata 与权限/公开性相关，TTL 不宜过长。

## 推荐的实现形态（不改变业务语义，最小侵入）

### 1) Cache-aside（旁路缓存）

伪流程：

1. 读缓存（内存 -> KV）
2. 命中则返回
3. 未命中则读 D1
4. 将结果写入 KV（带 TTL）
5. 返回

优点：逻辑清晰；失败降级简单（KV 不可用时仍可走 D1）。

### 2) 两级缓存：内存 + KV

- **内存缓存**：在模块级 `Map` 保存最近的热点键，TTL 极短（例如 1~5 秒）
- **KV 缓存**：作为跨隔离共享缓存，TTL 30s~30min

原因：KV 本身也有一定延迟与成本；对“同一实例内 burst 流量”的超热键，内存缓存性价比极高。

### 3) 过期策略：TTL + best-effort 失效

- KV 适合 **TTL 驱动** 的一致性：允许短时间陈旧。
- 对写路径（更新设置/更新桶/更新 metadata）做 best-effort `delete(key)`，降低陈旧窗口。

### 4) 防雪崩（可选增强）：stale-while-revalidate

在 Workers/Hono 中可以使用 `ctx.executionCtx.waitUntil()` 做后台刷新：

- 缓存即将过期时先返回旧值
- 同时后台刷新并更新 KV

这能降低并发 miss 导致的 D1 突刺（cache stampede）。

## 不推荐用 KV 来做的事（请用 Durable Objects）

如果目标是“像 Redis 一样”，以下能力 KV 并不合适：

- **限流（IP/账号维度）**：需要原子计数与窗口算法（固定窗/滑动窗/token bucket）
- **分布式锁**：需要强一致的 acquire/release
- **强一致会话撤销/封禁**：需要写后立刻全局生效
- **精确计数器/排行榜**：需要原子更新与范围查询

这些更适合：

- Durable Objects（强一致、可存内存态、可做原子逻辑）
- 或将限流下推到 Cloudflare WAF/Rate Limiting（如果可用）

## 对本项目的落地建议（分阶段）

### Phase 1（推荐立即做，低风险）

1. 缓存 `getResolvedPublicSiteSettings`
2. 缓存 `getSiteSettingsBatch` 的结果（可用 key 包含 dbKeys 的 hash）

### Phase 2（收益更大）

3. 缓存 `getBucketConfigById`（建议先不缓存 SK，或用较短 TTL）
4. 缓存 `getPathMetadata`

### Phase 3（谨慎）

5. Session User 缓存（短 TTL + 关键路径可绕过缓存）

## 需要的工程改动清单（便于下一步实现）

1. 在 `wrangler.jsonc` 增加 `kv_namespaces` 绑定（例如 `CACHE`）
2. 在 `backend/index.ts` 的 `HonoEnv.Bindings` 增加 `CACHE: KVNamespace`
3. 新增 `backend/utils/cache.ts`（封装 `getJson/setJson/delete`、TTL、错误降级）
4. 在以下函数中接入 cache-aside：
   - `backend/utils/site-settings.ts`：`getSiteSettingsBatch` / `getPublicSiteSettings`
   - `backend/utils/bucket-resolver.ts`：`getBucketConfigById`
   - `backend/utils/metadata.ts`：`getPathMetadata`
   - `backend/utils/session.ts`：`getSessionUser`（可选）

## 风险清单与验收指标

### 风险

- KV 陈旧导致的配置/权限延迟生效
- 会话缓存导致的注销延迟（安全风险）
- cache miss 并发导致 D1 突刺（雪崩）
- 缓存包含敏感信息导致泄露面扩大

### 建议的验收指标

- D1 查询次数：在登录态页面（对象浏览/列表）中明显下降
- P95/P99 延迟：受保护接口（需要 session）与 bucket 操作接口尾延迟下降
- 正确性：
  - 修改站点设置后 1 分钟内全局生效
  - 修改桶配置后 10 分钟内全局生效（或立即通过失效生效）
  - 退出登录后最多 30 秒内失效（如果启用 session cache）

---

## 附录：KV vs Redis vs Durable Objects 简表

| 能力        | Workers KV                      | Redis                      | Durable Objects        |
| ----------- | ------------------------------- | -------------------------- | ---------------------- |
| 一致性      | 最终一致                        | 强一致（单实例）/可配置    | 强一致（单对象）       |
| 原子计数/锁 | 不适合                          | 强                         | 强（在对象内）         |
| 读延迟      | 低（边缘）                      | 低（同区）                 | 取决于路由到对象       |
| 典型用途    | 配置缓存、读缓存、feature flags | 缓存、队列、限流、锁、会话 | 会话、限流、锁、协调者 |
