# Home Inventory / 家庭物品管理

Home Inventory 是一个本地优先的桌面家庭物品管理应用，帮助您轻松管理和追踪家中所有物品。

项目使用 `Tauri 2 + Rust + Vite + TypeScript` 构建，数据存储在本地 `SQLite` 数据库中。

> **重要说明**：这是一个纯桌面应用，**没有独立的网页版本**。虽然前端代码可以通过 `npm run dev` 在浏览器中运行，但所有数据操作（增删改查）都依赖于 Tauri 的 IPC 桥接调用 Rust 后端。在普通浏览器中运行时，所有数据库操作都会失败，因为浏览器无法直接访问 SQLite 数据库或调用 Rust 命令。只有通过 `npm run tauri dev` 启动的桌面应用才能正常使用。

## ✨ 已实现功能

### 物品管理
- ✅ 按名称新增物品
- ✅ 从本地数据库读取并展示物品列表
- ✅ 在列表中内联编辑物品名称
- ✅ 删除物品（级联删除关联数据）
- ✅ 应用重启后本地数据持久化

### 自定义字段
- ✅ 创建自定义字段（如品牌、型号、购买日期等）
- ✅ 编辑和删除自定义字段
- ✅ 为物品设置自定义字段值
- ✅ 按使用频率/添加时间排序字段

### 搜索与筛选
- ✅ 按物品名称搜索
- ✅ 按自定义字段值搜索

### 详情面板
- ✅ 物品详情展示（名称、创建时间、自定义字段值）
- ✅ 自定义字段详情展示（名称、创建时间、使用次数）

### 附件管理
- ✅ 为物品上传图片和文件附件
- ✅ 在详情面板中预览图片
- ✅ 删除附件（同时删除本地文件）

### 用户体验
- ✅ 响应式设计，支持移动端
- ✅ 状态消息提示（成功/错误）
- ✅ 键盘快捷键支持（Enter 确认、Escape 取消）

## 🛠️ 技术栈

| 层次 | 技术 | 版本 |
|------|------|------|
| 桌面框架 | Tauri | 2.10 |
| 后端语言 | Rust | 1.77 |
| 前端构建 | Vite | 7.3 |
| 前端语言 | TypeScript | 5.9 |
| 数据库 | SQLite | rusqlite 0.32 |
| 样式 | CSS3 | - |

## 📁 项目结构

```
home-inventory/
├── src/                          # 前端代码
│   ├── main.ts                   # 主入口，应用逻辑和状态管理
│   ├── api.ts                    # Tauri API 调用封装
│   ├── types.ts                  # TypeScript 类型定义
│   ├── render.ts                 # DOM 渲染函数
│   ├── custom-fields.ts          # 自定义字段管理模块
│   ├── status.ts                 # 状态消息处理
│   └── style.css                 # 响应式样式
├── src-tauri/                    # Tauri/Rust 后端
│   ├── src/
│   │   ├── lib.rs                # Tauri 命令定义和应用启动
│   │   ├── db.rs                 # 数据库初始化和连接
│   │   ├── custom_fields.rs      # 自定义字段 CRUD
│   │   ├── item_custom_field_values.rs  # 字段值管理
│   │   ├── attachments.rs        # 附件上传与管理
│   │   ├── time.rs               # 时间工具（Unix 时间戳）
│   │   └── main.rs               # 应用入口
│   ├── capabilities/
│   │   └── default.json          # Tauri 权限配置
│   ├── icons/                    # 应用图标
│   ├── Cargo.toml                # Rust 依赖配置
│   ├── Cargo.lock                # Rust 依赖锁定
│   └── tauri.conf.json           # Tauri 应用配置
├── public/                       # 静态资源
│   └── vite.svg                  # Vite 默认图标
├── index.html                    # HTML 入口
├── package.json                  # 前端依赖配置
├── package-lock.json             # 前端依赖锁定
├── tsconfig.json                 # TypeScript 配置
└── readme.md                     # 项目说明文档
```

## 🚀 运行命令

在项目根目录执行：

### 开发模式
```powershell
npm install
npm run tauri dev
```

### 仅构建前端
```powershell
npm run build
```

### 检查 Rust 后端
```powershell
cd src-tauri
cargo check
```

### 构建生产版本
```powershell
npm run tauri build
```

## 🔌 API 接口

前端通过 Tauri command 调用后端 API：

### 物品接口
| 命令 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `add_item` | `name: string` | `Item` | 添加物品 |
| `list_items` | 无 | `Item[]` | 获取物品列表 |
| `update_item` | `id: number, name: string` | `void` | 更新物品名称 |
| `delete_item` | `id: number` | `void` | 删除物品 |

### 自定义字段接口
| 命令 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `add_custom_field` | `name: string` | `CustomField` | 添加自定义字段 |
| `list_custom_fields` | 无 | `CustomField[]` | 获取自定义字段列表 |
| `update_custom_field` | `id: number, name: string` | `void` | 更新自定义字段名称 |
| `delete_custom_field` | `id: number` | `void` | 删除自定义字段 |

### 字段值接口
| 命令 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `list_item_custom_field_values` | 无 | `ItemCustomFieldValue[]` | 获取所有字段值 |
| `set_item_custom_field_values` | `itemId: number, values: CustomFieldValueInput[]` | `void` | 设置物品字段值 |

### 附件接口
| 命令 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `add_attachment` | `itemId: number, fileName: string, mimeType: string, fileData: number[]` | `Attachment` | 上传附件 |
| `list_attachments` | `itemId: number` | `Attachment[]` | 获取物品附件列表 |
| `delete_attachment` | `id: number` | `void` | 删除附件 |
| `get_attachment_data_url` | `id: number` | `string` | 获取附件 Data URL |

## 📊 数据库结构

### items 表
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER | 主键 |
| `name` | TEXT | 物品名称 |
| `created_at` | INTEGER | 创建时间（Unix 时间戳） |

### custom_fields 表
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER | 主键 |
| `name` | TEXT | 字段名称（唯一） |
| `created_at` | INTEGER | 创建时间（Unix 时间戳） |

### item_custom_field_values 表
| 字段 | 类型 | 说明 |
|------|------|------|
| `item_id` | INTEGER | 物品 ID（外键） |
| `field_id` | INTEGER | 字段 ID（外键） |
| `value` | TEXT | 字段值 |

### item_attachments 表
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER | 主键 |
| `item_id` | INTEGER | 物品 ID（外键） |
| `file_name` | TEXT | 原始文件名 |
| `mime_type` | TEXT | MIME 类型 |
| `file_path` | TEXT | 本地文件路径 |
| `created_at` | INTEGER | 创建时间（Unix 时间戳） |

## 💾 数据存储位置

数据文件存储在系统的应用数据目录中：

- **Windows**: `%APPDATA%\Home Inventory\items.db`
- **macOS**: `~/Library/Application Support/Home Inventory/items.db`
- **Linux**: `~/.local/share/Home Inventory/items.db`

附件文件存储在同一目录下的 `attachments/` 文件夹中。

## 📝 开发说明

### 设计原则
- **本地优先**: 所有数据存储在本地，不依赖网络
- **最小化**: 一次只实现一个功能，避免过早扩展
- **类型安全**: 前后端都使用强类型语言

### 当前限制
- 数据仅存储在本地，不支持多端同步
- 空间管理模块（房间、收纳箱）暂未实现
- 仅支持文本类型的自定义字段

## 🎯 下一步方向

### 阶段 1：基础能力优化
- [ ] 自定义字段重命名功能
- [ ] 字段排序优化（常用字段优先）
- [ ] 删除确认对话框
- [ ] 基础错误与空状态优化

### 阶段 2：空间管理
- [ ] 房间与收纳箱层级结构
- [ ] 物品分配到空间
- [ ] 按空间浏览物品

### 阶段 3：字段系统增强
- [ ] 字段类型扩展（数字、日期、选项）
- [ ] 字段校验
- [ ] 字段分组与模板

### 阶段 4：数据同步
- [ ] 本地导入/导出备份
- [ ] 局域网同步服务
- [ ] 多设备冲突解决策略

## 📄 许可证

MIT License