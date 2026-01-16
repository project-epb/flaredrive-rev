# FlareDrive Rev 项目说明

一个基于 Cloudflare Workers 的云原生 S3-compatible 存储桶管理工具，支持多存储后端（R2、AWS S3、MinIO 等），提供用户注册/登录、桶配置与管理功能。

## 技术架构

正在完全重构中。

具体草案请参考 [重构架构设计草案](./docs/architecture-draft.md)

重构进度请参考 [迁移 TODO 列表](./docs/migration-todos.md)

## 基本环境与相关文档

- Node.js 版本：24.x LTS
- 包管理器：bun
- 前端框架：Nuxt 4.x https://nuxt.com/llms.txt
- 前端组件库：Nuxt UI https://ui.nuxt.com/llms.txt
- 样式解决方案：tailwind + SCSS
- 工具库：VueUse, unplugin-auto-import, unplugin-vue-components
- 状态管理：Pinia
- 后端框架：Nitro API （即随附于 Nuxt 的后端）
- 数据库：D1（SQLite 兼容）
- ORM：Drizzle
- 存储后端：S3-compatible（Cloudflare R2、AWS S3、MinIO 等）
- Vue SFC 风格示例：

```vue
<template lang="pug">
.text-center.custom-class
  h1.text-3xl.font-bold {{ data }}
</template>

<script setup lang="ts">
const data = ref('Hello, FlareDrive Rev!')
</script>

<style lang="scss" scoped>
.custom-class {
  padding: 2rem;
  background-color: #f9f9f9;
}
</style>
```

## 目录结构

标准的 Nuxt 4 项目结构：https://nuxt.com/raw/docs/4.x/directory-structure.md

## Agent守则：八荣八耻

以暗猜接口为耻，以认真查阅为荣。
以模糊执行为耻，以寻求确认为荣。
以盲想业务为耻，以人类确认为荣。
以创造接口为耻，以复用现有为荣。
以跳过验证为耻，以主动测试为荣。
以破坏架构为耻，以遵循规范为荣。
以假装理解为耻，以诚实无知为荣。
以盲目修改为耻，以谨慎重构为荣。

---

## 附录：残留文件夹说明

- `backend/`：旧的 Hono 后端代码，仅供参考，最终不再使用
- `frontend/`：旧的 Vue 3 SPA 代码，需迁移至 Nuxt 结构，可复用的组件可以搬运到 Nuxt 项目中，无用的删掉
