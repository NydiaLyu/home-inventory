这是一个用Codex编写的可以跨平台使用、本地部署、多端同步的可视化家庭物品管理系统。目前仅实现了“本地数据层 + 物品的最小 CRUD（新增与列表）”，通过 Tauri command 暴露 add_item 和 list_items，前端只做一个输入框+列表用于验证闭环。

# v1-0：本地数据层 + 物品新增/列表

## Summary
- 搭建 Tauri + Vite（原生 TS/JS）最小工程。
- Rust 侧引入 SQLite（rusqlite）实现 `items` 表。
- 暴露两个 Tauri command：`add_item(name)` 与 `list_items()`。
- 前端提供一个输入框 + 列表，验证完整闭环。

## Key Changes / Implementation Changes
- 项目骨架
  - 使用 Tauri 初始化项目，保留最小依赖。
  - 前端使用 Vite + 原生 TS/JS（不引 React/Svelte）。
- 数据层
  - Rust 中创建 SQLite 数据库文件到用户数据目录（如 `app_data/items.db`）。
  - 表结构：`items(id INTEGER PRIMARY KEY, name TEXT NOT NULL, created_at INTEGER)`.
  - 启动时进行 `CREATE TABLE IF NOT EXISTS`.
- Tauri Commands
  - `add_item(name: String) -> Item`
  - `list_items() -> Vec<Item>`
  - `Item` 结构体包含 `id`, `name`, `created_at`.
- 前端 UI
  - 输入框 + “新增”按钮。
  - 列表渲染 `list_items()` 返回结果。
  - 新增成功后刷新列表。

## Test Plan
- 启动应用，输入名称后新增成功。
- 重启应用，列表仍显示历史数据。
- 连续新增多条记录，列表顺序正确（按 `created_at` 倒序或 `id` 递增）。

## Assumptions
- 仅实现 `name` 字段，不含 location/tags。
- 不做校验，只拒绝空字符串。
- 不引入复杂状态管理或路由。
