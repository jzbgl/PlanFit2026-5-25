# PlanFit 设计文档

## 概述

PlanFit 是一款基于 Tauri + React 的桌面健身训练管理应用，支持多用户切换、自定义训练计划、训练记录追踪和进度可视化。

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| 桌面壳 | Tauri v2 |
| 前端框架 | React 18 + TypeScript |
| 样式 | TailwindCSS v4 |
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
│   │   ├── ExerciseCard.tsx      # 训练动作卡片
│   │   ├── CalendarGrid.tsx      # 4周日历网格
│   │   ├── WeeklyChart.tsx       # 周训练趋势折线图
│   │   ├── Celebration.tsx       # 完成庆祝覆盖层
│   │   └── UserSwitcher.tsx      # 用户切换列表
│   ├── db/
│   │   └── database.ts           # Dexie.js 数据库定义 + CRUD API
│   ├── context/
│   │   └── AppContext.tsx         # 全局状态
│   └── types/
│       └── index.ts              # TypeScript 类型定义
├── src-tauri/                    # Tauri 后端壳
└── package.json
```

## 路由设计

| 路径 | 页面 | 说明 |
|------|------|------|
| `/login` | Login | 用户选择/新建用户 |
| `/today` | TodayPlan | 今日计划（默认页） |
| `/overview` | PlanOverview | 4周训练日历 |
| `/records` | TrainingRecords | 周趋势图 + 历史记录 |
| `/profile` | MyProfile | 用户信息查看/编辑 |

未登录时所有路由重定向到 `/login`。

## 组件树

```
App
├── Login
│   └── UserSwitcher
├── Sidebar (仅已登录)
│   ├── 用户头像 + 姓名 + 进度
│   ├── 导航项: 今日计划 / 计划概览 / 训练记录 / 我的
│   └── 每日格言
└── <Outlet> (react-router)
    ├── TodayPlan
    │   ├── 日期 + 进度徽章 (n/m)
    │   ├── ExerciseCard[]
    │   └── Celebration (全部完成后覆盖)
    ├── PlanOverview
    │   ├── 周 Tab 切换 (第1-4周)
    │   └── CalendarGrid
    ├── TrainingRecords
    │   ├── 统计卡片
    │   ├── WeeklyChart
    │   └── 历史记录列表
    └── MyProfile
        ├── 浏览模式
        └── 编辑模式
```

## 数据模型

```typescript
interface User {
  id?: number;
  name: string;
  avatar?: string;
  height: number;
  weight: number;
  goal: string;         // 增肌 | 减脂 | 塑形 | 力量提升
  createdAt: number;
}

interface Plan {
  id?: number;
  userId: number;
  name: string;
  weeks: number;
  createdAt: number;
}

interface PlanDay {
  id?: number;
  planId: number;
  week: number;
  dayOfWeek: number;
  isRestDay: boolean;
  muscleGroups: string[];
}

interface Exercise {
  id?: number;
  planDayId: number;
  name: string;
  muscleGroup: string;  // 胸 | 背 | 腿 | 肩 | 腹部 | 有氧 | 减脂
  sets: number;
  reps: number;
  restSeconds: number;
  order: number;
}

interface WorkoutLog {
  id?: number;
  userId: number;
  planDayId: number;
  exerciseId: number;
  date: string;         // YYYY-MM-DD
  completed: boolean;
  completedAt?: number;
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
- 已有用户以卡片列表展示（头像 + 姓名）
- 点击用户卡片进入应用
- 底部「新建用户」按钮
- 无用户时自动显示新建用户表单

### 2. 今日计划 (`/today`)
- 顶部显示日期和进度徽章（已完成/总数）
- 动作卡片：复选框、动作名称、肌群标签、组数×次数、休息秒数
- 全部完成后触发 Celebration 组件

### 3. 计划概览 (`/overview`)
- 4个周 Tab（第1周~第4周）
- 日历表格：7列（周一~周日）

**肌群颜色映射：**
| 肌群 | 颜色 |
|------|------|
| 胸 | #00E676 |
| 背 | #3b82f6 |
| 腿 | #a855f7 |
| 肩 | #f59e0b |
| 腹部 | #ef4444 |
| 有氧 | #06b6d4 |
| 减脂 | #ec4899 |

### 4. 训练记录 (`/records`)
- 3个统计卡片 + 折线图（Recharts）+ 历史记录列表

### 5. 我的 (`/profile`)
- 浏览模式 + 编辑模式
- 头像选择、姓名、身高、体重、目标编辑

## 状态管理

```typescript
interface AppState {
  currentUser: User | null;
  plans: Plan[];
}

type AppAction =
  | { type: 'SET_USER'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_PLANS'; plans: Plan[] };
```

## 主题规范

| 属性 | 值 |
|------|-----|
| 主色调 | #00E676 |
| 背景色 | #1a1a2e |
| 侧边栏 | #16213e |
| 卡片背景 | #0f3460 |
| 边框色 | #1e3a5f |
| 文字色 | #e2e8f0 |
| 次要文字 | #94a3b8 |
| 圆角 | 12px |

## 补充说明

### 模板计划
内置 1~2 个训练计划模板（如"推拉腿 4周计划"），以静态 JSON 文件存放于 `src/data/templates/`。

### 每日格言
约 20 条健身励志语录，存放于 `src/data/motivations.ts`。

### .gitignore
`.superpowers/` 已加入 `.gitignore`。
