# FlareDrive Rev 项目说明

一个基于 Cloudflare Workers 的云原生 S3-compatible 存储桶管理工具，支持多存储后端（R2、AWS S3、MinIO 等），提供用户注册/登录、桶配置与管理功能。

## 技术架构

正在完全重构中。

具体草案请参考 [重构架构设计草案](./docs/architecture-draft.md)

重构进度请参考 [迁移 TODO 列表](./docs/migration-todos.md)，每完成一项任务/发现新的问题就更新此文档，方便下一位 Agent 接手。

## 基本环境与相关文档

前后端分离设计，但通过 @cloudflare/vite 插件实现统一开发、构建、部署。

- Node.js 版本：24.x LTS
- 包管理器：bun
- 前端框架：Vue 3 + vue-auto-router
- 前端组件库：Naive UI
- 图标库：@tabler/icons-vue
- 样式解决方案：UnoCSS & SCSS
- 工具库：@vueuse/core, unplugin-auto-import, unplugin-vue-components
- 状态管理：Pinia
- 后端框架：Hono
- 部署平台：Cloudflare Workers
- 数据库：D1（SQLite 兼容）
- ORM：Drizzle
- 存储后端：S3-compatible（Cloudflare R2、AWS S3、MinIO 等）

### Vue SFC 风格示例

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

### 关于自动导入

- 前端文件夹下的 `utils/`, `stores/` 目录中导出的所有函数和常量会被自动导入到前端的各个模块中，无需手动导入。
- `components/` 目录下的 Vue 组件会被自动注册为全局组件，无需手动导入和注册。
  - 组件名：将根据文件名自动生成，遵循 PascalCase 命名规范。例如，`MyButton.vue` 会被注册为 `<MyButton />` 组件。
  - 文件夹：如果组件文件位于子文件夹中，组件名会包含文件夹名称。例如，`components/Foo/BarBaz.vue` 会被注册为 `<FooBarBaz />` 组件。
  - 名字空间：如果组件位于文件夹，但文件名开头与文件夹名相同，则会省略文件夹名称作为前缀。例如，`components/Foo/FooButton.vue` 会被注册为 `<FooButton />` 组件，而不是 `<FooFooButton />`。

## 目录结构

- `./backend/`：后端代码，基于 Hono 框架
- `./frontend/`：前端代码，基于 Vue 3
- `./drizzle.config.ts`：Drizzle ORM 配置文件
- `./db/`：数据库 schema

## 语言

UI 界面暂时全部使用英文，尚未实现多语言支持。

## Agent守则：八荣八耻

以暗猜接口为耻，以认真查阅为荣。
以模糊执行为耻，以寻求确认为荣。
以盲想业务为耻，以人类确认为荣。
以创造接口为耻，以复用现有为荣。
以跳过验证为耻，以主动测试为荣。
以破坏架构为耻，以遵循规范为荣。
以假装理解为耻，以诚实无知为荣。
以盲目修改为耻，以谨慎重构为荣。
