# PlanFit 设计文档

## 概述

PlanFit 是一款基于 Tauri + React 的桌面健身训练管理应用，支持多用户切换、自定义训练计划、训练记录追踪和进度可视化。

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| 桌面壳 | Tauri v2 |
| 前端框架 | React 18 + TypeScript |
| 样式 | TailwindCSS |
| 路由 | react-router v6 |
| 数据存储 | IndexedDB via Dexie.js |
| 图表 | Recharts |
| 状态管理 | React Context + useReducer |

## 架构概览

```
PlanFit/
├── src/
│   ├── main.tsx                  # 入口，挂载 App
│   ├── App.tsx                   # 路由配置 + 全局布局（Sidebar + Content）
│   ├── pages/
│   │   ├── Login.tsx             # 登录 / 用户选择
│   │   ├── TodayPlan.tsx         # 今日计划
│   │   ├── PlanOverview.tsx      # 计划概览（4周日历）
│   │   ├── TrainingRecords.tsx   # 训练记录（图表 + 历史列表）
│   │   └── MyProfile.tsx         # 我的（用户信息查看/编辑）
│   ├── components/
│   │   ├── Sidebar.tsx           # 侧边栏导航（240px，头像 + 导航 + 格言）
│   │   ├── ExerciseCard.tsx      # 训练动作卡片（名称、肌群、组数、次数、休息、复选框）
│   │   ├── CalendarGrid.tsx      # 4周日历网格
│   │   ├── WeeklyChart.tsx       # 周训练趋势折线图
│   │   ├── Celebration.tsx       # 完成庆祝覆盖层（进度环 + 统计）
│   │   └── UserSwitcher.tsx      # 用户切换列表
│   ├── db/
│   │   └── database.ts           # Dexie.js 数据库定义 + CRUD API
│   ├── context/
│   │   └── AppContext.tsx         # 全局状态（当前用户、计划数据等）
│   └── types/
│       └── index.ts              # 所有 TypeScript 类型定义
├── src-tauri/                    # Tauri 后端壳
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

## 路由设计

| 路径 | 页面 | 说明 |
|------|------|------|
| `/login` | Login | 用户选择/新建用户，首次启动默认进入 |
| `/today` | TodayPlan | 今日计划（默认页） |
| `/overview` | PlanOverview | 4周训练日历 |
| `/records` | TrainingRecords | 周趋势图 + 历史记录 |
| `/profile` | MyProfile | 用户信息查看/编辑 |

未登录时所有路由重定向到 `/login`。

## 组件树

```
App
├── Login
│   └── UserSwitcher (用户列表 + 新建用户)
├── Sidebar (仅已登录)
│   ├── 用户头像 + 姓名 + 进度
│   ├── 导航项: 今日计划 / 计划概览 / 训练记录 / 我的
│   └── 每日格言
└── <Outlet> (react-router)
    ├── TodayPlan
    │   ├── 日期 + 进度徽章 (n/m)
    │   ├── ExerciseCard[] (按肌群排序)
    │   └── Celebration (全部完成后覆盖)
    ├── PlanOverview
    │   ├── 周 Tab 切换 (第1-4周)
    │   └── CalendarGrid (7列 × 1行，每格显示肌群 + 完成状态)
    ├── TrainingRecords
    │   ├── 统计卡片 (本周次数 / 总次数 / 连续周数)
    │   ├── WeeklyChart (Recharts 折线图)
    │   └── 历史记录列表 (可滚动)
    └── MyProfile
        ├── 浏览模式: 头像 + 信息卡片 + 切换用户
        └── 编辑模式: 表单 (姓名/身高/体重/目标)
```

## 数据模型

```typescript
// 用户
interface User {
  id: string;           // 自增主键
  name: string;         // 用户姓名
  avatar?: string;      // 头像（emoji 或 base64）
  height: number;       // 身高 (cm)
  weight: number;       // 体重 (kg)
  goal: string;         // 健身目标: 增肌 | 减脂 | 塑形 | 力量提升
  createdAt: number;    // 创建时间戳
}

// 训练计划
interface Plan {
  id: string;
  userId: string;       // 关联用户
  name: string;         // 计划名称，如 "推拉腿 4周计划"
  weeks: number;        // 周数，固定 4
  createdAt: number;
}

// 训练日（计划中的一天）
interface PlanDay {
  id: string;
  planId: string;       // 关联计划
  week: number;         // 第几周 (1-4)
  dayOfWeek: number;    // 周几 (1=周一, 7=周日)
  isRestDay: boolean;   // 是否休息日
  muscleGroups: string[]; // 当天训练肌群
}

// 训练动作
interface Exercise {
  id: string;
  planDayId: string;    // 关联训练日
  name: string;         // 动作名称
  muscleGroup: string;  // 肌群: 胸 | 背 | 腿 | 肩 | 腹部 | 有氧 | 减脂
  sets: number;         // 组数
  reps: number;         // 次数
  restSeconds: number;  // 组间休息秒数
  order: number;        // 排序序号
}

// 训练记录（日志）
interface WorkoutLog {
  id: string;
  userId: string;
  planDayId: string;
  exerciseId: string;
  date: string;         // YYYY-MM-DD
  completed: boolean;   // 是否完成
  completedAt?: number; // 完成时间戳
}
```

### IndexedDB 表设计 (Dexie.js)

```typescript
const db = new Dexie('PlanFitDB');

db.version(1).stores({
  users: '++id, name',
  plans: '++id, userId',
  planDays: '++id, planId, [planId+week+dayOfWeek]',
  exercises: '++id, planDayId',
  workoutLogs: '++id, userId, [userId+date], [userId+exerciseId+date]',
});
```

## 页面详细设计

### 1. 登录页 (`/login`)

- 已有用户以卡片列表展示（头像 + 姓名 + 上次训练日期）
- 点击用户卡片进入应用
- 底部「新建用户」按钮，弹出表单（姓名、身高、体重、目标）
- 无用户时自动显示新建用户表单

### 2. 今日计划 (`/today`)

- 顶部显示日期（如 "2026年5月25日 周一"）和进度徽章（已完成/总数）
- 动作卡片按 `order` 排序，每张卡片展示：
  - 复选框（未完成=灰色边框 ，已完成=绿色填充 + 删除线）
  - 动作名称、肌群标签（绿色小字）、组数 × 次数、休息秒数
- 全部完成后触发 `Celebration` 组件：
  - 覆盖层：🎉 emoji + "训练完成!" 标题
  - 3 个进度环：动作完成数 / 连续训练天数 / 总完成组数
  - "返回"按钮关闭庆祝层
- 勾选/取消勾选时实时写入 WorkoutLog

### 3. 计划概览 (`/overview`)

- 顶部显示计划名称 + 标签（如 "推拉腿 · 4周"）
- 4 个周 Tab（第1周 ~ 第4周），当前周高亮
- 日历表格：7 列（周一~周日），每格显示：
  - 休息日：灰色背景，显示"休息日"
  - 训练日已完：成肌群颜色实心块 + ✓
  - 训练日未完成：深色底色 + 虚线边框 + 肌群名
- 底部图例：各肌群对应颜色 + 休息日 + 待完成

**肌群颜色映射：**

| 肌群 | 颜色 |
|------|------|
| 胸 | #00E676 (绿) |
| 背 | #3b82f6 (蓝) |
| 腿 | #a855f7 (紫) |
| 肩 | #f59e0b (橙) |
| 腹部 | #ef4444 (红) |
| 有氧 | #06b6d4 (青) |
| 减脂 | #ec4899 (粉) |

### 4. 训练记录 (`/records`)

- 3 个统计卡片：本周训练次数（绿色高亮）/ 总训练次数 / 连续训练周数
- 折线图（Recharts）：X 轴 = 周数（最近 10 周），Y 轴 = 训练次数，带渐变填充
- 下方可滚动历史列表：每条记录显示日期、肌群、动作数、组数、完成状态（✓ / —）

### 5. 我的 (`/profile`)

- 浏览模式：
  - 头像 + 姓名 + 当前计划进度
  - 信息卡片（身高 / 体重 / 健身目标）
  - 「编辑」按钮切换到编辑模式
  - 「切换用户」入口（→ 回到登录页）
- 编辑模式：
  - 头像可点击更换（emoji 选择器）
  - 表单字段：姓名、身高、体重、目标（下拉选择）
  - 「保存」按钮写回 IndexedDB
  - 目标选项：增肌 / 减脂 / 塑形 / 力量提升

## 状态管理

使用 React Context + useReducer 管理全局状态：

```typescript
interface AppState {
  currentUser: User | null;
  plans: Plan[];
  currentPlan: Plan | null;
}

type AppAction =
  | { type: 'SET_USER'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_PLANS'; plans: Plan[] }
  | { type: 'SET_CURRENT_PLAN'; plan: Plan };
```

- `currentUser`: 登录后保存，用于数据过滤和侧边栏展示
- 页面级数据（今日动作列表、日历数据等）由各页面自行从 Dexie 读取

## 数据流

1. **应用启动** → 检查 IndexedDB 是否有用户 → 有则到 `/login`，无则直接显示新建用户表单
2. **用户登录** → dispatch `SET_USER` → 加载该用户的计划数据 → 跳转 `/today`
3. **今日计划加载** → 查找当前日期对应的 PlanDay → 加载其 Exercises → 查找当日 WorkoutLog 标记完成状态
4. **勾选完成** → 写入/更新 WorkoutLog → 本地 state 更新 → 全部完成时显示 Celebration
5. **计划概览** → 加载 Plan + 所有 PlanDays → 按周分组 → 交叉查询 WorkoutLog 确定完成状态
6. **训练记录** → 按 userId 聚合 WorkoutLog → 按周统计 → 渲染图表 + 列表
7. **编辑用户** → 更新 User 表 → dispatch 更新 context

## 边界情况与错误处理

- **当日无训练计划**：今日计划页显示空状态提示 "今天没有安排训练，去计划概览设置吧"
- **休息日**：日历中休息日格子显示灰色，不可交互
- **无训练数据**：图表显示空状态 "暂无训练数据，开始你的第一次训练吧"
- **IndexedDB 读取失败**：显示错误提示 toast，允许重试
- **多用户数据一致**：所有查询必须带 userId 过滤条件

## 测试策略

- **单元测试**：Dexie CRUD 操作、状态管理 reducer、数据聚合逻辑
- **组件测试**：ExerciseCard 勾选交互、CalendarGrid 渲染、Celebration 触发条件
- **E2E 测试**（可选）：用户创建 → 制定计划 → 完成训练 → 查看记录 完整流程

## 主题规范

| 属性 | 值 |
|------|-----|
| 主色调 | #00E676 |
| 背景色 | #1a1a2e (页面), #16213e (侧边栏) |
| 卡片背景 | #0f3460 |
| 卡片圆角 | 12px |
| 文字色 | #e2e8f0 (主要), #94a3b8 (次要) |
| 边框色 | #1e3a5f |
| 已完成色 | #00E676 |
| 休息日色 | #475569 |

## 补充说明

### 模板计划

应用内置 1~2 个训练计划模板（如"推拉腿 4周计划"），以静态 JSON 文件形式存放于 `src/data/templates/`，首次创建用户时可选择从模板开始或完全自定义。模板数据在应用构建时随代码打包。

### 每日格言

侧边栏底部格言从预置的静态列表中随机选取，存放于 `src/data/motivations.ts`，包含约 20 条健身励志语录。

### .gitignore

建议将 `.superpowers/` 加入 `.gitignore`，避免 AI 辅助设计生成的临时文件被提交到版本库。
