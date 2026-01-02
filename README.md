# 自助餐桌台计时系统

一个优雅完美的餐厅桌台管理系统，用于实时监控用餐时间和桌台状态，支持超时提醒、延时操作和排队预测。

## 功能特性

### 核心功能
- ✅ **桌台管理**：支持桌台配置（桌号、最大人数、默认用餐时长、缓冲期时长）
- ✅ **状态管理**：空闲/用餐中/即将超时/已超时/缓冲期/停用六种状态
- ✅ **开始用餐**：一键开始用餐，自动记录时间并更新状态
- ✅ **实时计时**：每分钟自动检查所有桌台，实时显示剩余时间
- ✅ **超时提醒**：
  - 剩余5分钟时显示警告提示
  - 超时后播放声音并弹窗提醒
  - 每3分钟重复提醒直到处理
  - 自动发送通知给管理员
- ✅ **延时操作**：支持+5分钟和+10分钟快速延时
- ✅ **结束用餐**：进入缓冲期，缓冲期结束后自动恢复空闲
- ✅ **排队预测**：根据所有桌台状态智能预测可用时间
- ✅ **数据持久化**：使用MySQL数据库存储所有数据

### 界面设计
- 🎨 **优雅完美风格**：暖色调配色，简洁大方
- 📱 **响应式设计**：完美支持桌面端和移动端
- 🎯 **状态颜色区分**：不同状态使用不同颜色，一目了然
- ⚡ **实时更新**：每分钟自动刷新数据
- 🔔 **声音提醒**：超时时自动播放提示音

## 快速开始

### 方式一：一键启动（推荐）

**Windows系统：**
1. 双击运行 `start-windows.bat`
2. 等待自动安装依赖并启动服务器
3. 浏览器访问 `http://localhost:3000`

**Linux/Mac系统：**
1. 在终端运行：`./start-linux.sh`
2. 等待自动安装依赖并启动服务器
3. 浏览器访问 `http://localhost:3000`

### 方式二：手动启动

```bash
# 1. 安装依赖
pnpm install

# 2. 初始化数据库
pnpm db:push

# 3. 创建示例桌台数据（可选）
npx tsx scripts/init-tables.mjs

# 4. 启动开发服务器
pnpm dev
```

### 安卓设备访问

详细说明请查看 [ANDROID_GUIDE.md](./ANDROID_GUIDE.md)

**快速步骤：**
1. 确保电脑和手机在同一WiFi
2. 启动服务器
3. 在手机浏览器访问 `http://电脑IP:3000`

## 技术栈

- **前端**：React 19 + TypeScript + Tailwind CSS 4
- **后端**：Node.js + Express + tRPC
- **数据库**：MySQL（兼容TiDB）
- **UI组件**：shadcn/ui
- **日期处理**：date-fns
- **实时通信**：tRPC + React Query

## 项目结构

```
buffet-table-timer/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── components/    # UI组件
│   │   │   └── TableCard.tsx  # 桌台卡片组件
│   │   ├── pages/         # 页面
│   │   │   └── Home.tsx   # 主页面
│   │   ├── lib/           # 工具库
│   │   └── index.css      # 全局样式
├── server/                 # 后端代码
│   ├── db.ts              # 数据库操作
│   ├── routers.ts         # API路由
│   ├── monitor.ts         # 全局监控系统
│   └── _core/             # 核心功能
├── drizzle/               # 数据库Schema
│   └── schema.ts          # 数据表定义
├── scripts/               # 工具脚本
│   └── init-tables.mjs    # 初始化桌台数据
├── start-windows.bat      # Windows启动脚本
├── start-linux.sh         # Linux/Mac启动脚本
└── README.md              # 项目说明
```

## 数据库设计

### tables（桌台配置表）
- `id`：主键
- `tableNumber`：桌号
- `maxCapacity`：最大人数
- `defaultDuration`：默认用餐时长（分钟）
- `bufferDuration`：缓冲期时长（分钟）
- `status`：当前状态
- `isActive`：是否启用

### dining_sessions（用餐记录表）
- `id`：主键
- `tableId`：关联桌台ID
- `startTime`：用餐开始时间（Unix时间戳）
- `endTime`：计划结束时间（Unix时间戳）
- `actualEndTime`：实际结束时间
- `bufferEndTime`：缓冲期结束时间
- `extensionCount`：延时次数
- `totalExtensionMinutes`：总延时分钟数
- `isCompleted`：是否已结束
- `lastAlertTime`：最后提醒时间

## 系统工作流程

### 1. 开始用餐
1. 点击"开始用餐"按钮
2. 系统记录当前时间为开始时间
3. 计算结束时间 = 当前时间 + 默认用餐时长
4. 桌台状态更新为"用餐中"
5. 创建用餐记录并保存到数据库

### 2. 实时监控
- 后台每分钟自动检查所有桌台
- 计算剩余时间并更新状态：
  - 剩余时间 > 15分钟：用餐中（蓝色）
  - 剩余时间 ≤ 15分钟：即将超时（黄色）
  - 剩余时间 ≤ 5分钟：显示警告提示
  - 剩余时间 ≤ 0：已超时（红色），播放声音+弹窗
- 超时后每3分钟重复提醒并发送通知

### 3. 延时操作
1. 点击"+5分钟"或"+10分钟"按钮
2. 结束时间增加相应分钟数
3. 延时次数+1，记录总延时时间
4. 更新数据库

### 4. 结束用餐
1. 点击"结束"按钮
2. 记录实际结束时间
3. 进入缓冲期状态（紫色）
4. 计算缓冲期结束时间
5. 缓冲期结束后自动恢复空闲状态

### 5. 排队预测
- 空闲桌台：立即可用
- 其他桌台：预计可用时间 = 结束时间 + 缓冲期
- 按时间排序，第N位顾客使用第N个最早可用的桌台

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 类型检查
pnpm check

# 代码格式化
pnpm format

# 运行测试
pnpm test

# 数据库操作
pnpm db:push          # 推送schema更改到数据库
```

## 环境变量

系统使用Manus平台自动注入的环境变量，无需手动配置：

- `DATABASE_URL`：数据库连接字符串
- `JWT_SECRET`：JWT密钥
- `VITE_APP_TITLE`：应用标题
- 其他Manus平台环境变量

## 部署

### 使用Manus平台部署（推荐）

1. 在Manus管理界面点击"Save Checkpoint"保存当前版本
2. 点击"Publish"按钮发布到生产环境
3. 系统会自动生成公网访问地址

### 自行部署

```bash
# 1. 构建项目
pnpm build

# 2. 启动生产服务器
pnpm start
```

## 常见问题

### Q: 如何修改桌台配置？
A: 可以通过数据库管理界面直接修改`tables`表，或者修改`scripts/init-tables.mjs`脚本重新初始化。

### Q: 如何清空所有数据？
A: 删除`dining_sessions`表中的所有记录，并将`tables`表中的`status`重置为`idle`。

### Q: 超时提醒没有声音？
A: 请检查浏览器是否允许播放声音，某些浏览器需要用户交互后才能播放音频。

### Q: 如何自定义用餐时长？
A: 在数据库中修改对应桌台的`defaultDuration`字段（单位：分钟）。

## 技术支持

如有问题或建议，请访问：https://help.manus.im

## 许可证

MIT License
