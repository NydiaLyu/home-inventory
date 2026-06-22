# Home Inventory / 家庭物品管理

Home Inventory is a minimal local-first desktop app for managing household items.

`Home Inventory` 是一个最小化、本地优先的桌面家庭物品管理应用。

It is built with `Tauri + Rust + Vite + TypeScript`, with data stored in local `SQLite`.

项目使用 `Tauri + Rust + Vite + TypeScript` 构建，数据存储在本地 `SQLite` 中。

## Current Scope / 当前范围

This repository currently implements a single minimal item-management flow.

当前仓库实现的是一条最小可用的物品管理流程。

Implemented features / 已实现功能：

- Add an item by name / 按名称新增物品
- List all items from local database / 从本地数据库读取并展示物品列表
- Edit an item name inline / 在列表中内联编辑物品名称
- Delete an item / 删除物品
- Persist data locally between app restarts / 应用重启后本地数据仍会保留

Not implemented yet / 暂未实现：

- Rooms, boxes, and spatial hierarchy / 房间、收纳箱和空间层级
- Tags, photos, and metadata / 标签、图片和更多元数据
- Search and filtering / 搜索与筛选
- Multi-device sync / 多端同步
- User roles and permissions / 用户角色与权限

## Tech Stack / 技术栈

- Desktop shell: `Tauri`
- Backend: `Rust`
- Frontend: `Vite + TypeScript`
- Local database: `SQLite` via `rusqlite`

## Project Structure / 项目结构

- `src/`: frontend UI and interaction logic / 前端界面与交互逻辑
- `src-tauri/src/lib.rs`: Tauri commands and app bootstrap / Tauri 命令与应用启动入口
- `src-tauri/src/db.rs`: SQLite initialization and connection helpers / SQLite 初始化与连接辅助代码
- `src-tauri/tauri.conf.json`: Tauri app configuration / Tauri 应用配置

## Commands / 命令

From the project root / 在项目根目录执行：

```powershell
npm install
npm run tauri dev
```

Build frontend only / 仅构建前端：

```powershell
npm run build
```

Check Rust backend / 检查 Rust 后端：

```powershell
cd src-tauri
cargo check
```

## How It Works / 工作方式

On startup, the Rust backend creates the app data directory and initializes a local `items.db` file if it does not already exist.

应用启动时，Rust 后端会创建应用数据目录，并在本地初始化 `items.db` 数据库文件（如果该文件尚不存在）。

The frontend calls Tauri commands to read and mutate data:

前端通过 Tauri command 读取和修改数据：

- `add_item(name)`
- `list_items()`
- `update_item(id, name)`
- `delete_item(id)`

The current `items` table contains these fields:

当前 `items` 表包含以下字段：

- `id`
- `name`
- `created_at`

## Development Notes / 开发说明

The project is intentionally kept small. We implement one feature at a time and avoid expanding the data model too early.

项目目前刻意保持在最小规模。我们遵循“一次只实现一个功能”的方式，避免过早扩展数据模型。

Current assumptions / 当前假设：

- Only item `name` is editable / 目前只编辑物品 `name`
- Empty names are rejected / 空名称会被拒绝
- All data is local-only for now / 当前所有数据仅保存在本地

## Next Steps / 下一步方向

Likely next features:

后续较适合继续实现的功能：

- Search and filtering / 搜索与筛选
- Room and box hierarchy / 房间与收纳箱层级
- Photos and richer item fields / 图片与更丰富的物品字段
- Local network sync / 局域网同步

从宏观看，现在项目已经完成了“单机本地物品清单 + 可配置字段”的基础骨架。接下来不建议继续零散加按钮，而是按产品能力层级推进。

**阶段 1：打磨当前基础能力**
先把现有清单变成稳定可长期使用的小工具。
- 自定义字段重命名：避免字段写错只能删除，保护已有字段值。
- 字段排序：让常用字段排在前面，比如 `位置`、`品牌`、`购买日期`。
- 字段值展示优化：列表只展示有值字段，编辑区按固定顺序展示。
- 基础错误与空状态优化：重复字段、保存失败、空列表都更清楚。
- 清理遗留文件与配置：删除 `src/typescript.svg`，修改 Tauri 默认 `identifier`。

**阶段 2：物品管理能力**
让“物品”从简单记录变成可查、可维护的数据。
- 物品详情视图：列表点击进入详情，而不是所有编辑都挤在列表里。
- 图片/附件：给物品添加照片，这是家庭物品管理很关键的能力。
- 批量导入图片：先做本地选择图片，后续再关联物品。
- 物品复制/快速新增：适合录入多个类似物品。
- 软删除/回收站：避免误删。

**阶段 3：字段系统增强**
把自定义字段从“文本键值”升级成真正的结构化信息。
- 字段类型：`text`、`number`、`date`、`select`。
- 字段校验：数字、日期格式、必填。
- 字段分组：购买信息、保修信息、存放信息、规格参数。
- 字段模板：不同类别物品使用不同字段组合。

**阶段 4：分类与空间模型**
这里再引入房间、收纳箱会更合理，因为字段系统已经能承载过渡需求。
- 物品分类：电器、证件、工具、衣物等。
- 空间层级：房屋、房间、柜子/箱子。
- “位置”从自定义字段升级为空间引用。
- 可视化空间浏览：按房间或收纳箱查看物品。

**阶段 5：本地部署与多端同步**
等本地数据模型稳定后再做同步，否则同步协议会频繁变。
- 明确本地数据库 schema 版本。
- 增加更新时间 `updated_at` 和删除标记 `deleted_at`。
- 本地导入/导出备份。
- 局域网同步服务。
- 多设备冲突策略，先用 last-write-wins。