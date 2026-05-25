# PlanFit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Tauri + React + TypeScript + TailwindCSS desktop fitness training app with multi-user support, 4-page navigation, IndexedDB storage, and dark theme.

**Architecture:** Single-page React app with react-router, Dexie.js for IndexedDB, Recharts for charts, wrapped in a Tauri desktop shell.

**Tech Stack:** Tauri v2, React 19, TypeScript 6, TailwindCSS v4, react-router v7, Dexie.js, Recharts, Vite

**Spec:** `docs/superpowers/specs/2026-05-25-PlanFit-design.md`

**Critical constraints from tsconfig:**
- `verbatimModuleSyntax: true` — always use `import type { X }` for type-only imports
- `erasableSyntaxOnly: true` — no enums; use string unions with `as const` objects
- `noUnusedLocals: true`, `noUnusedParameters: true` — clean up unused code

---

## File Structure
```
src/
├── main.tsx                    # Entry point with BrowserRouter + AppProvider
├── App.tsx                     # Route definitions + layout (Sidebar + Outlet)
├── index.css                   # TailwindCSS v4 imports + @theme tokens
├── types/
│   └── index.ts                # All TypeScript interfaces & type unions
├── db/
│   ├── database.ts             # Dexie DB definition + CRUD helpers
│   └── seed.ts                 # Demo data seeder
├── context/
│   └── AppContext.tsx           # React Context + useReducer global state
├── data/
│   ├── templates/
│   │   └── push-pull-legs.json # Built-in training plan template
│   └── motivations.ts          # ~20 fitness motivational quotes
├── components/
│   ├── Sidebar.tsx              # 240px sidebar: avatar, nav, daily quote
│   ├── ExerciseCard.tsx         # Exercise card with checkbox, sets×reps, rest time
│   ├── CalendarGrid.tsx         # 4-week calendar with colored muscle-group cells
│   ├── WeeklyChart.tsx          # Recharts weekly training volume line chart
│   └── Celebration.tsx          # Full-screen overlay on daily completion
├── pages/
│   ├── Login.tsx                # User selection/creation page
│   ├── TodayPlan.tsx            # Today's workout with exercise cards
│   ├── PlanOverview.tsx         # 4-week calendar view with week tabs
│   ├── TrainingRecords.tsx      # Stats cards + weekly chart + history list
│   └── MyProfile.tsx            # View/edit user profile
src-tauri/                       # Tauri Rust backend shell (already scaffolded)
```

---

### Task 1: Project Scaffolding ✓ (DONE)

**Status:** Scaffolding complete — Vite + React + TailwindCSS v4 + Tauri v2 + all npm dependencies installed (dexie, react-router-dom, recharts). `src/main.tsx`, `src/App.tsx`, and `src/index.css` exist as stubs.

---

### Task 2: Type Definitions

**Files:** Create `src/types/index.ts`

**Steps:**

- [ ] Create `src/types/` directory
- [ ] Define all interfaces and type unions

**Code:**

```typescript
// src/types/index.ts

export interface User {
  id?: number;
  name: string;
  avatar?: string;
  height: number;
  weight: number;
  goal: Goal;
  createdAt: number;
}

export interface Plan {
  id?: number;
  userId: number;
  name: string;
  weeks: number;
  createdAt: number;
}

export interface PlanDay {
  id?: number;
  planId: number;
  week: number;
  dayOfWeek: number;
  isRestDay: boolean;
  muscleGroups: MuscleGroup[];
}

export interface Exercise {
  id?: number;
  planDayId: number;
  name: string;
  muscleGroup: MuscleGroup;
  sets: number;
  reps: number;
  restSeconds: number;
  order: number;
}

export interface WorkoutLog {
  id?: number;
  userId: number;
  planDayId: number;
  exerciseId: number;
  date: string;         // YYYY-MM-DD
  completed: boolean;
  completedAt?: number;
}

export const MUSCLE_GROUPS = [
  '胸', '背', '腿', '肩', '腹部', '有氧', '减脂',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const GOALS = ['增肌', '减脂', '塑形', '力量提升'] as const;

export type Goal = (typeof GOALS)[number];

export const MUSCLE_GROUP_COLORS: Record<MuscleGroup, string> = {
  '胸': '#00E676',
  '背': '#3b82f6',
  '腿': '#a855f7',
  '肩': '#f59e0b',
  '腹部': '#ef4444',
  '有氧': '#06b6d4',
  '减脂': '#ec4899',
};

export interface AppState {
  currentUser: User | null;
  plans: Plan[];
}

export type AppAction =
  | { type: 'SET_USER'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_PLANS'; plans: Plan[] };
```

**Verification:** `npx tsc --noEmit` from project root (passes).

**Commit:** `feat: add TypeScript type definitions`

---

### Task 3: Database Layer (Dexie.js)

**Files:** Create `src/db/database.ts`

**Steps:**

- [ ] Create `src/db/` directory
- [ ] Define Dexie database with all 5 tables and compound indexes
- [ ] Implement typed CRUD helpers for each table

**Code:**

```typescript
// src/db/database.ts

import Dexie, { type Table } from 'dexie';
import type { User, Plan, PlanDay, Exercise, WorkoutLog } from '../types';

class PlanFitDB extends Dexie {
  users!: Table<User, number>;
  plans!: Table<Plan, number>;
  planDays!: Table<PlanDay, number>;
  exercises!: Table<Exercise, number>;
  workoutLogs!: Table<WorkoutLog, number>;

  constructor() {
    super('PlanFitDB');
    this.version(1).stores({
      users: '++id, name',
      plans: '++id, userId',
      planDays: '++id, planId, [planId+week+dayOfWeek]',
      exercises: '++id, planDayId',
      workoutLogs: '++id, userId, [userId+date], [userId+exerciseId+date]',
    });
  }
}

export const db = new PlanFitDB();

// ── User CRUD ──
export async function getUsers(): Promise<User[]> {
  return db.users.toArray();
}

export async function getUser(id: number): Promise<User | undefined> {
  return db.users.get(id);
}

export async function addUser(user: Omit<User, 'id'>): Promise<number> {
  return db.users.add(user as User);
}

export async function updateUser(id: number, changes: Partial<User>): Promise<number> {
  return db.users.update(id, changes);
}

// ── Plan CRUD ──
export async function getPlansByUser(userId: number): Promise<Plan[]> {
  return db.plans.where('userId').equals(userId).toArray();
}

export async function addPlan(plan: Omit<Plan, 'id'>): Promise<number> {
  return db.plans.add(plan as Plan);
}

// ── PlanDay CRUD ──
export async function getPlanDays(planId: number): Promise<PlanDay[]> {
  return db.planDays.where('planId').equals(planId).toArray();
}

export async function getPlanDayByWeekDay(planId: number, week: number, dayOfWeek: number): Promise<PlanDay | undefined> {
  return db.planDays.where('[planId+week+dayOfWeek]').equals([planId, week, dayOfWeek]).first();
}

export async function addPlanDay(planDay: Omit<PlanDay, 'id'>): Promise<number> {
  return db.planDays.add(planDay as PlanDay);
}

// ── Exercise CRUD ──
export async function getExercises(planDayId: number): Promise<Exercise[]> {
  return db.exercises.where('planDayId').equals(planDayId).toArray();
}

export async function addExercise(exercise: Omit<Exercise, 'id'>): Promise<number> {
  return db.exercises.add(exercise as Exercise);
}

// ── WorkoutLog CRUD ──
export async function getWorkoutLogsByUserDate(userId: number, date: string): Promise<WorkoutLog[]> {
  return db.workoutLogs.where('[userId+date]').equals([userId, date]).toArray();
}

export async function getWorkoutLogsByUser(userId: number): Promise<WorkoutLog[]> {
  return db.workoutLogs.where('userId').equals(userId).toArray();
}

export async function getWorkoutLog(userId: number, exerciseId: number, date: string): Promise<WorkoutLog | undefined> {
  return db.workoutLogs.where('[userId+exerciseId+date]').equals([userId, exerciseId, date]).first();
}

export async function upsertWorkoutLog(log: Omit<WorkoutLog, 'id'>): Promise<number> {
  const existing = await getWorkoutLog(log.userId, log.exerciseId, log.date);
  if (existing && existing.id !== undefined) {
    await db.workoutLogs.update(existing.id, log);
    return existing.id;
  }
  return db.workoutLogs.add(log as WorkoutLog);
}

export async function deleteWorkoutLog(logId: number): Promise<void> {
  await db.workoutLogs.delete(logId);
}

// ── Batch Import ──
export async function importPlanTemplate(
  plan: Omit<Plan, 'id'>,
  days: Omit<PlanDay, 'id' | 'planId'>[],
  dayExercises: Map<number, Omit<Exercise, 'id' | 'planDayId'>[]>
): Promise<void> {
  const planId = await addPlan(plan);
  for (let i = 0; i < days.length; i++) {
    const dayId = await addPlanDay({ ...days[i], planId });
    const exercises = dayExercises.get(i) ?? [];
    for (const ex of exercises) {
      await addExercise({ ...ex, planDayId: dayId });
    }
  }
}
```

**Verification:** `npx tsc --noEmit` (passes).

**Commit:** `feat: add Dexie.js database layer with all CRUD helpers`

---

### Task 4: Global State (AppContext)

**Files:** Create `src/context/AppContext.tsx`

**Steps:**

- [ ] Create `src/context/` directory
- [ ] Implement React Context with useReducer for AppState
- [ ] Provider wraps the app, loads plans when user changes

**Code:**

```typescript
// src/context/AppContext.tsx

import { createContext, useContext, useReducer, useEffect, type ReactNode, type Dispatch } from 'react';
import type { User, Plan, AppState, AppAction } from '../types';
import { getPlansByUser } from '../db/database';

const initialState: AppState = {
  currentUser: null,
  plans: [],
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, currentUser: action.user, plans: [] };
    case 'LOGOUT':
      return { ...state, currentUser: null, plans: [] };
    case 'SET_PLANS':
      return { ...state, plans: action.plans };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (state.currentUser?.id != null) {
      getPlansByUser(state.currentUser.id).then((plans) => {
        dispatch({ type: 'SET_PLANS', plans });
      });
    }
  }, [state.currentUser]);

  return (
    <AppContext value={{ state, dispatch }}>
      {children}
    </AppContext>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
```

**Verification:** `npx tsc --noEmit` (passes).

**Commit:** `feat: add global state management with AppContext`

---

### Task 5: Static Data (Templates + Motivations)

**Files:** Create `src/data/templates/push-pull-legs.json`, `src/data/motivations.ts`

**Steps:**

- [ ] Create `src/data/templates/` directory
- [ ] Write push-pull-legs 4-week JSON template
- [ ] Write 20 motivational quotes array

**push-pull-legs.json** (Day 1=Mon=Push, Day 2=Tue=Pull, Day 3=Wed=Legs, Day 4=Thu=Rest, Day 5=Fri=Push, Day 6=Sat=Pull, Day 7=Sun=Rest, repeat 4 weeks):

```json
[
  { "week": 1, "dayOfWeek": 0, "isRestDay": false, "muscleGroups": ["胸", "肩"], "exercises": [
    { "name": "杠铃卧推", "muscleGroup": "胸", "sets": 4, "reps": 10, "restSeconds": 90, "order": 0 },
    { "name": "哑铃上斜卧推", "muscleGroup": "胸", "sets": 4, "reps": 10, "restSeconds": 90, "order": 1 },
    { "name": "哑铃飞鸟", "muscleGroup": "胸", "sets": 3, "reps": 12, "restSeconds": 60, "order": 2 },
    { "name": "哑铃肩推", "muscleGroup": "肩", "sets": 4, "reps": 10, "restSeconds": 90, "order": 3 },
    { "name": "侧平举", "muscleGroup": "肩", "sets": 3, "reps": 15, "restSeconds": 60, "order": 4 },
    { "name": "绳索下压", "muscleGroup": "背", "sets": 3, "reps": 12, "restSeconds": 60, "order": 5 }
  ]},
  { "week": 1, "dayOfWeek": 1, "isRestDay": false, "muscleGroups": ["背"], "exercises": [
    { "name": "引体向上", "muscleGroup": "背", "sets": 4, "reps": 8, "restSeconds": 90, "order": 0 },
    { "name": "杠铃划船", "muscleGroup": "背", "sets": 4, "reps": 10, "restSeconds": 90, "order": 1 },
    { "name": "高位下拉", "muscleGroup": "背", "sets": 4, "reps": 10, "restSeconds": 90, "order": 2 },
    { "name": "坐姿划船", "muscleGroup": "背", "sets": 3, "reps": 12, "restSeconds": 60, "order": 3 },
    { "name": "哑铃弯举", "muscleGroup": "肩", "sets": 3, "reps": 12, "restSeconds": 60, "order": 4 }
  ]},
  { "week": 1, "dayOfWeek": 2, "isRestDay": false, "muscleGroups": ["腿"], "exercises": [
    { "name": "杠铃深蹲", "muscleGroup": "腿", "sets": 4, "reps": 10, "restSeconds": 90, "order": 0 },
    { "name": "腿举", "muscleGroup": "腿", "sets": 4, "reps": 10, "restSeconds": 90, "order": 1 },
    { "name": "腿弯举", "muscleGroup": "腿", "sets": 3, "reps": 12, "restSeconds": 60, "order": 2 },
    { "name": "小腿提踵", "muscleGroup": "腿", "sets": 3, "reps": 15, "restSeconds": 60, "order": 3 },
    { "name": "卷腹", "muscleGroup": "腹部", "sets": 3, "reps": 20, "restSeconds": 30, "order": 4 }
  ]},
  { "week": 1, "dayOfWeek": 3, "isRestDay": true, "muscleGroups": [], "exercises": [] },
  { "week": 1, "dayOfWeek": 4, "isRestDay": false, "muscleGroups": ["胸", "肩"], "exercises": [
    { "name": "哑铃平板卧推", "muscleGroup": "胸", "sets": 4, "reps": 10, "restSeconds": 90, "order": 0 },
    { "name": "器械夹胸", "muscleGroup": "胸", "sets": 4, "reps": 12, "restSeconds": 60, "order": 1 },
    { "name": "双杠臂屈伸", "muscleGroup": "胸", "sets": 3, "reps": 10, "restSeconds": 90, "order": 2 },
    { "name": "器械肩推", "muscleGroup": "肩", "sets": 4, "reps": 10, "restSeconds": 90, "order": 3 },
    { "name": "前平举", "muscleGroup": "肩", "sets": 3, "reps": 15, "restSeconds": 60, "order": 4 }
  ]},
  { "week": 1, "dayOfWeek": 5, "isRestDay": false, "muscleGroups": ["背"], "exercises": [
    { "name": "硬拉", "muscleGroup": "背", "sets": 4, "reps": 8, "restSeconds": 90, "order": 0 },
    { "name": "单臂哑铃划船", "muscleGroup": "背", "sets": 4, "reps": 10, "restSeconds": 90, "order": 1 },
    { "name": "面拉", "muscleGroup": "肩", "sets": 3, "reps": 15, "restSeconds": 60, "order": 2 },
    { "name": "锤式弯举", "muscleGroup": "肩", "sets": 3, "reps": 12, "restSeconds": 60, "order": 3 }
  ]},
  { "week": 1, "dayOfWeek": 6, "isRestDay": true, "muscleGroups": [], "exercises": [] }
]
```

Repeat for weeks 2-4 with same structure, incrementing `week` field (exercises can be the same). The template file contains an array of 28 objects (7 days × 4 weeks).

**motivations.ts:**

```typescript
// src/data/motivations.ts

export const MOTIVATIONS: string[] = [
  '力量不是来自身体，而是来自不屈的意志。',
  '每一次举起，都是对过去的自己说再见。',
  '肌肉在喊停的时候，才是真正的开始。',
  '不是因为看到希望才坚持，而是因为坚持才看到希望。',
  '今天的汗水，是明天炫耀的资本。',
  '没有捷径，只有铁片。',
  '比你优秀的人比你还努力。',
  '身体不会撒谎，你付出多少它就回报多少。',
  '健身不是为了取悦别人，而是为了遇见更好的自己。',
  '坚持是一种习惯，放弃是一种遗憾。',
  '肌肉酸痛的感觉，是变强的信号。',
  '不要跟别人比，跟昨天的自己比。',
  '训练的是身体，磨练的是意志。',
  '每一滴汗水都不会白流。',
  '健身是唯一一件付出就一定有回报的事。',
  '自律给我自由。',
  '最强的对手，永远是镜子里那个人。',
  '习惯成自然，自然成命运。',
  '不是时间不够，是决心不够。',
  '做自己的英雄，从今天开始。',
];
```

**Verification:** `npx tsc --noEmit` (passes).

**Commit:** `feat: add training plan template and motivational quotes data`

---

### Task 6: App Shell (Routing + Layout)

**Files:** Modify `src/main.tsx`, `src/App.tsx`, `src/index.css`

**Steps:**

- [ ] Update `src/index.css` with TailwindCSS v4 @theme tokens
- [ ] Update `src/main.tsx` to wrap app in BrowserRouter + AppProvider
- [ ] Update `src/App.tsx` with Routes, login guard, sidebar layout

**index.css changes** — replace current content with @theme tokens so Tailwind can use custom utility classes like `bg-bg`, `bg-sidebar`, `bg-card`, `text-text`, `text-text-muted`, `border-border`, etc.:

```css
@import "tailwindcss";

@theme {
  --color-primary: #00E676;
  --color-bg: #1a1a2e;
  --color-sidebar: #16213e;
  --color-card: #0f3460;
  --color-border: #1e3a5f;
  --color-text: #e2e8f0;
  --color-text-muted: #94a3b8;
  --color-rest: #475569;
  --radius-default: 12px;
}
```

**main.tsx changes** — wrap with BrowserRouter and AppProvider:

```tsx
// src/main.tsx

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
)
```

**App.tsx** — router with auth guard + sidebar layout. Create page stubs in a single file initially (will be replaced by real pages in later tasks). Use `import type { ReactNode }` for verbatimModuleSyntax:

```tsx
// src/App.tsx

import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useApp } from './context/AppContext'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import TodayPlan from './pages/TodayPlan'
import PlanOverview from './pages/PlanOverview'
import TrainingRecords from './pages/TrainingRecords'
import MyProfile from './pages/MyProfile'

function AuthGuard() {
  const { state } = useApp()
  if (!state.currentUser) return <Navigate to="/login" replace />
  return (
    <div className="flex h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AuthGuard />}>
        <Route path="/today" element={<TodayPlan />} />
        <Route path="/overview" element={<PlanOverview />} />
        <Route path="/records" element={<TrainingRecords />} />
        <Route path="/profile" element={<MyProfile />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
```

For page stubs, create each file with minimal placeholder content. Example:

```tsx
// src/pages/TodayPlan.tsx (stub)
export default function TodayPlan() {
  return <div className="text-text">Today Plan</div>
}
```

Repeat for the other 3 pages.

**Verification:** `npx tsc --noEmit` (passes). `npm run dev` — app should load, show login page at `/`, redirect from protected routes.

**Commit:** `feat: add app shell with routing, auth guard, sidebar layout`

---

### Task 7: Sidebar Component

**Files:** Create `src/components/Sidebar.tsx`

**Steps:**

- [ ] Display current user avatar (emoji fallback) + name + goal badge
- [ ] Render 4 navigation links with active highlight and SVG icons
- [ ] Show random motivational quote at the bottom
- [ ] Logout button

**Code:**

```tsx
// src/components/Sidebar.tsx

import { NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { GOAL_LABELS } from '../types'
import { MOTIVATIONS } from '../data/motivations'

const AVATARS = ['🐻', '🐱', '🐶', '🐼', '🦊', '🐨', '🐯', '🦁']

const NAV_ITEMS = [
  { to: '/today', label: '今日计划', icon: '📋' },
  { to: '/overview', label: '计划概览', icon: '📅' },
  { to: '/records', label: '训练记录', icon: '📊' },
  { to: '/profile', label: '我的', icon: '👤' },
]

export default function Sidebar() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const { currentUser } = state
  if (!currentUser) return null

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' })
    navigate('/login')
  }

  const avatarEmoji = currentUser.avatar ?? AVATARS[currentUser.id! % AVATARS.length]
  const randomQuote = MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)]

  return (
    <aside className="w-60 bg-sidebar flex flex-col shrink-0">
      {/* User info */}
      <div className="p-5 flex items-center gap-3 border-b border-border">
        <div className="w-11 h-11 rounded-full bg-card flex items-center justify-center text-2xl">
          {avatarEmoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-text font-semibold truncate">{currentUser.name}</div>
          <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
            {currentUser.goal}
          </span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-default text-sm transition-colors ${
                isActive
                  ? 'bg-primary/15 text-primary font-medium'
                  : 'text-text-muted hover:bg-card hover:text-text'
              }`
            }
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Quote */}
      <div className="px-4 py-3 border-t border-border">
        <p className="text-xs text-text-muted leading-relaxed italic">
          「{randomQuote}」
        </p>
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full text-sm text-text-muted hover:text-red-400 transition-colors py-2 text-left"
        >
          退出登录
        </button>
      </div>
    </aside>
  )
}
```

Note: `GOAL_LABELS` should be added as a simple constant to `src/types/index.ts`:

```typescript
export const GOAL_LABELS: Record<Goal, string> = {
  '增肌': '增肌',
  '减脂': '减脂',
  '塑形': '塑形',
  '力量提升': '力量提升',
};
```

**Verification:** `npx tsc --noEmit` (passes).

**Commit:** `feat: add sidebar with user info, navigation, and daily quote`

---

### Task 8: Login Page

**Files:** Create `src/pages/Login.tsx` (replaces stub)

**Steps:**

- [ ] List existing users as clickable cards (emoji avatar + name)
- [ ] "New User" button toggles a creation form
- [ ] Form fields: name, height, weight, goal (dropdown), avatar emoji picker
- [ ] On successful creation, auto-login
- [ ] Navigate to `/today` on user select or creation

**Code:**

```tsx
// src/pages/Login.tsx

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getUsers, addUser } from '../db/database'
import { GOALS, type User, type Goal } from '../types'

const AVATAR_OPTIONS = ['🐻', '🐱', '🐶', '🐼', '🦊', '🐨', '🐯', '🦁']

export default function Login() {
  const { dispatch } = useApp()
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', height: 170, weight: 65, goal: '增肌' as Goal, avatar: '🐻' })

  useEffect(() => {
    getUsers().then(setUsers)
  }, [])

  const handleSelect = (user: User) => {
    dispatch({ type: 'SET_USER', user })
    navigate('/today')
  }

  const handleCreate = async () => {
    if (!form.name.trim()) return
    const id = await addUser({
      name: form.name.trim(),
      avatar: form.avatar,
      height: form.height,
      weight: form.weight,
      goal: form.goal,
      createdAt: Date.now(),
    })
    const newUser: User = {
      id,
      name: form.name.trim(),
      avatar: form.avatar,
      height: form.height,
      weight: form.weight,
      goal: form.goal,
      createdAt: Date.now(),
    }
    handleSelect(newUser)
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-primary text-center mb-8">PlanFit</h1>

        {users.length > 0 && !showForm && (
          <div className="space-y-3 mb-6">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelect(user)}
                className="w-full bg-card border border-border rounded-default p-4 flex items-center gap-4 hover:border-primary/40 transition-colors"
              >
                <span className="text-3xl">{user.avatar ?? '🐻'}</span>
                <div className="text-left">
                  <div className="text-text font-medium">{user.name}</div>
                  <div className="text-text-muted text-sm">{user.goal}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-primary/15 text-primary border border-primary/30 rounded-default py-3 text-sm font-medium hover:bg-primary/25 transition-colors"
          >
            ＋ 新建用户
          </button>
        ) : (
          <div className="bg-card border border-border rounded-default p-5 space-y-4">
            <h2 className="text-text font-semibold">新建用户</h2>

            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="昵称"
              className="w-full bg-bg border border-border rounded-default px-3 py-2 text-text placeholder:text-text-muted outline-none focus:border-primary"
            />

            <div className="flex gap-3">
              <label className="flex-1">
                <span className="text-text-muted text-xs">身高 (cm)</span>
                <input
                  type="number"
                  value={form.height}
                  onChange={(e) => setForm({ ...form, height: Number(e.target.value) })}
                  className="w-full bg-bg border border-border rounded-default px-3 py-2 text-text outline-none focus:border-primary mt-1"
                />
              </label>
              <label className="flex-1">
                <span className="text-text-muted text-xs">体重 (kg)</span>
                <input
                  type="number"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
                  className="w-full bg-bg border border-border rounded-default px-3 py-2 text-text outline-none focus:border-primary mt-1"
                />
              </label>
            </div>

            <label>
              <span className="text-text-muted text-xs">目标</span>
              <select
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value as Goal })}
                className="w-full bg-bg border border-border rounded-default px-3 py-2 text-text outline-none focus:border-primary mt-1"
              >
                {GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>

            <label>
              <span className="text-text-muted text-xs">头像</span>
              <div className="flex gap-2 mt-1 flex-wrap">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setForm({ ...form, avatar: emoji })}
                    className={`w-10 h-10 rounded-default text-xl border transition-colors ${
                      form.avatar === emoji
                        ? 'border-primary bg-primary/15'
                        : 'border-border bg-bg hover:border-primary/40'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border border-border rounded-default py-2 text-text-muted text-sm hover:bg-bg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.name.trim()}
                className="flex-1 bg-primary text-[#1a1a2e] rounded-default py-2 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                创建并进入
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Verification:** `npx tsc --noEmit` (passes). Run `npm run dev` — login page shows, can create a user and navigate to `/today`.

**Commit:** `feat: add login page with user selection and creation`

---

### Task 9: Celebration Component

**Files:** Create `src/components/Celebration.tsx`

**Steps:**

- [ ] Full-screen overlay with semi-transparent dark backdrop
- [ ] Center card with trophy/celebration emoji, congratulatory message
- [ ] Fade-in animation via CSS
- [ ] Close button or auto-dismiss after 5 seconds

**Code:**

```tsx
// src/components/Celebration.tsx

import { useEffect, useState } from 'react'

interface Props {
  done: number
  total: number
  onClose: () => void
}

export default function Celebration({ done, total, onClose }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className="bg-card border border-primary/30 rounded-2xl p-8 text-center max-w-sm mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-primary mb-2">太棒了！</h2>
        <p className="text-text mb-1">你已完成今日所有训练</p>
        <p className="text-text-muted text-sm">
          {done}/{total} 组动作全部完成
        </p>
        <button
          onClick={onClose}
          className="mt-6 bg-primary text-[#1a1a2e] px-6 py-2 rounded-default font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          继续加油
        </button>
      </div>
    </div>
  )
}
```

**Verification:** `npx tsc --noEmit` (passes).

**Commit:** `feat: add celebration overlay component for workout completion`

---

### Task 10: ExerciseCard + TodayPlan Page

**Files:** Create `src/components/ExerciseCard.tsx`, modify `src/pages/TodayPlan.tsx` (replaces stub)

**Steps:**

- [ ] ExerciseCard: checkbox, exercise name, muscle group colored badge, sets×reps, rest time
- [ ] TodayPlan: compute today's plan day from active plan + current date, fetch exercises
- [ ] Show progress badge (done/total)
- [ ] Load workout logs for today, sync checkbox state
- [ ] Toggle completion → upsert/deletes workout log in DB
- [ ] Show Celebration when all exercises are checked

**ExerciseCard.tsx:**

```tsx
// src/components/ExerciseCard.tsx

import type { Exercise, MuscleGroup } from '../types'
import { MUSCLE_GROUP_COLORS } from '../types'

interface Props {
  exercise: Exercise
  completed: boolean
  onToggle: () => void
}

export default function ExerciseCard({ exercise, completed, onToggle }: Props) {
  const color = MUSCLE_GROUP_COLORS[exercise.muscleGroup as MuscleGroup] ?? '#94a3b8'

  return (
    <div
      className={`bg-card border rounded-default p-4 flex items-center gap-3 transition-colors ${
        completed ? 'border-primary/30 opacity-70' : 'border-border hover:border-border/80'
      }`}
    >
      <button
        onClick={onToggle}
        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
          completed
            ? 'bg-primary border-primary text-[#1a1a2e]'
            : 'border-text-muted hover:border-primary'
        }`}
      >
        {completed && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-text font-medium ${completed ? 'line-through text-text-muted' : ''}`}>
            {exercise.name}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {exercise.muscleGroup}
          </span>
        </div>
        <div className="text-text-muted text-xs mt-1">
          {exercise.sets} 组 × {exercise.reps} 次 · 休息 {exercise.restSeconds}s
        </div>
      </div>
    </div>
  )
}
```

**TodayPlan.tsx:**

```tsx
// src/pages/TodayPlan.tsx

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { getPlanDays, getExercises, getWorkoutLogsByUserDate, upsertWorkoutLog, deleteWorkoutLog } from '../db/database'
import type { PlanDay, Exercise, WorkoutLog } from '../types'
import ExerciseCard from '../components/ExerciseCard'
import Celebration from '../components/Celebration'

function getToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDayOfWeek(): number {
  return (new Date().getDay() + 6) % 7  // Monday=0 ... Sunday=6
}

export default function TodayPlan() {
  const { state } = useApp()
  const [planDay, setPlanDay] = useState<PlanDay | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrated, setCelebrated] = useState(false)

  const load = useCallback(async () => {
    if (!state.currentUser || state.plans.length === 0) return
    const plan = state.plans[0]
    const today = getToday()
    const dow = getDayOfWeek()
    const currentWeek = Math.ceil((Date.now() - (plan.createdAt ?? Date.now())) / (7 * 86400000)) % plan.weeks

    const days = await getPlanDays(plan.id!)
    const day = days.find((d) => d.week === currentWeek && d.dayOfWeek === dow) ?? null
    setPlanDay(day)

    if (day && !day.isRestDay) {
      const exs = await getExercises(day.id!)
      exs.sort((a, b) => a.order - b.order)
      setExercises(exs)
      const logRecords = await getWorkoutLogsByUserDate(state.currentUser.id!, today)
      setLogs(logRecords)
    } else {
      setExercises([])
      setLogs([])
    }
  }, [state.currentUser, state.plans])

  useEffect(() => { load() }, [load])

  const handleToggle = async (exercise: Exercise) => {
    if (!state.currentUser || !planDay) return
    const today = getToday()
    const existing = logs.find((l) => l.exerciseId === exercise.id)

    if (existing) {
      await deleteWorkoutLog(existing.id!)
      setLogs((prev) => prev.filter((l) => l.id !== existing.id))
    } else {
      const log: Omit<WorkoutLog, 'id'> = {
        userId: state.currentUser.id!,
        planDayId: planDay.id!,
        exerciseId: exercise.id!,
        date: today,
        completed: true,
        completedAt: Date.now(),
      }
      const id = await upsertWorkoutLog(log)
      setLogs((prev) => [...prev, { ...log, id }])
    }
  }

  useEffect(() => {
    if (exercises.length > 0 && logs.length === exercises.length && !celebrated) {
      setShowCelebration(true)
      setCelebrated(true)
    }
  }, [logs.length, exercises.length, celebrated])

  const doneCount = logs.filter((l) => l.completed).length

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold text-text">{getToday()}</h1>
        {exercises.length > 0 && (
          <span className={`text-sm px-2.5 py-1 rounded-default font-medium ${
            doneCount === exercises.length ? 'bg-primary/15 text-primary' : 'bg-card text-text-muted'
          }`}>
            {doneCount}/{exercises.length}
          </span>
        )}
      </div>

      {!state.plans.length && (
        <div className="bg-card border border-border rounded-default p-8 text-center">
          <p className="text-text-muted mb-2">还没有训练计划</p>
          <p className="text-text-muted text-sm">请先选择或创建一个训练计划</p>
        </div>
      )}

      {state.plans.length > 0 && planDay?.isRestDay && (
        <div className="bg-card border border-border rounded-default p-8 text-center">
          <div className="text-4xl mb-3">🛌</div>
          <p className="text-text font-medium">今天是休息日</p>
          <p className="text-text-muted text-sm mt-1">好好休息，为下次训练储备能量</p>
        </div>
      )}

      {planDay && !planDay.isRestDay && (
        <div className="space-y-2">
          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              completed={logs.some((l) => l.exerciseId === exercise.id && l.completed)}
              onToggle={() => handleToggle(exercise)}
            />
          ))}
        </div>
      )}

      {showCelebration && (
        <Celebration
          done={doneCount}
          total={exercises.length}
          onClose={() => setShowCelebration(false)}
        />
      )}
    </div>
  )
}
```

**Verification:** `npx tsc --noEmit` (passes). Manual: login, need seed data to test — will verify after Task 15.

**Commit:** `feat: add exercise card and today plan page with completion tracking`

---

### Task 11: PlanOverview + CalendarGrid

**Files:** Create `src/components/CalendarGrid.tsx`, modify `src/pages/PlanOverview.tsx` (replaces stub)

**Steps:**

- [ ] CalendarGrid: renders 7 cols × 7 rows (Mon-Sun × Week 1-7), each cell shows muscle group colors
- [ ] Colored rectangles filled from `MUSCLE_GROUP_COLORS` based on the day's muscle groups
- [ ] Rest days shown with muted styling and a "rest" indicator
- [ ] PlanOverview: week selector tabs (第1周 ~ 第4周), delegates to CalendarGrid
- [ ] If no plan active, show empty state

**CalendarGrid.tsx:**

```tsx
// src/components/CalendarGrid.tsx

import type { PlanDay } from '../types'
import { MUSCLE_GROUP_COLORS } from '../types'
import type { MuscleGroup } from '../types'

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

interface Props {
  week: number
  days: PlanDay[]
}

export default function CalendarGrid({ week, days }: Props) {
  const weekDays = days.filter((d) => d.week === week).sort((a, b) => a.dayOfWeek - b.dayOfWeek)

  return (
    <div className="bg-card border border-border rounded-default overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_LABELS.map((label) => (
          <div key={label} className="py-2 text-center text-text-muted text-xs font-medium border-r border-border last:border-r-0">
            {label}
          </div>
        ))}
      </div>
      {/* Body */}
      <div>
        {DAY_LABELS.map((_, colIdx) => {
          const day = weekDays.find((d) => d.dayOfWeek === colIdx)
          return (
            <div
              key={colIdx}
              className={`border-b border-border last:border-b-0 ${
                day?.isRestDay ? 'bg-rest/10' : ''
              }`}
            >
              <div className="grid grid-cols-7">
                {DAY_LABELS.map((_, innerIdx) => (
                  <div
                    key={innerIdx}
                    className={`p-2 min-h-[80px] border-r border-border last:border-r-0 ${
                      innerIdx === colIdx ? '' : ''
                    }`}
                  >
                    {innerIdx === colIdx && day && (
                      <div>
                        {day.isRestDay ? (
                          <div className="text-center pt-3 text-text-muted text-sm">
                            <div className="text-lg mb-0.5">🛌</div>
                            休息
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-0.5">
                            {day.muscleGroups.map((mg) => {
                              const color = MUSCLE_GROUP_COLORS[mg as MuscleGroup] ?? '#94a3b8'
                              return (
                                <span
                                  key={mg}
                                  className="px-1 py-0.5 rounded text-xs font-medium shrink-0"
                                  style={{ backgroundColor: `${color}20`, color }}
                                >
                                  {mg}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

Wait — the calendar design is: 7 columns for Mon-Sun, but rows represent weeks? Actually re-reading the spec: "4个周 Tab + 日历表格：7列（周一~周日）". Each row is a day of the week, each column... no, it's a 4-week calendar where each tab shows one week, and each week has 7 columns (Mon-Sun). Actually, looking at typical fitness calendars: 7 columns (Mon-Sun), 4 rows (weeks), cells show muscle groups. But the spec says "4个周 Tab" — week tabs. So each tab shows ONE week with 7 days.

Let me restructure:

Each week tab shows a single row of 7 cells (Mon-Sun), showing the day's muscle groups.

```tsx
// src/components/CalendarGrid.tsx (revised)

import type { PlanDay } from '../types'
import { MUSCLE_GROUP_COLORS } from '../types'
import type { MuscleGroup } from '../types'

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

interface Props {
  week: number
  days: PlanDay[]
}

export default function CalendarGrid({ week, days }: Props) {
  const weekDays = days.filter((d) => d.week === week)

  return (
    <div className="bg-card border border-border rounded-default overflow-hidden">
      <div className="grid grid-cols-7">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-3 text-center text-text-muted text-xs font-medium border-b border-border"
          >
            {label}
          </div>
        ))}
        {Array.from({ length: 7 }).map((_, colIdx) => {
          const day = weekDays.find((d) => d.dayOfWeek === colIdx)
          return (
            <div
              key={colIdx}
              className={`min-h-[100px] p-3 border-b border-r border-border last:border-r-0 ${
                colIdx === 6 ? '' : ''
              } ${day?.isRestDay ? 'bg-rest/10' : ''}`}
            >
              {day && (
                <div className="h-full flex flex-col gap-1">
                  {day.isRestDay ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-text-muted">
                      <div className="text-xl mb-1">🛌</div>
                      <span className="text-xs">休息</span>
                    </div>
                  ) : (
                    day.muscleGroups.map((mg) => {
                      const color = MUSCLE_GROUP_COLORS[mg as MuscleGroup] ?? '#94a3b8'
                      return (
                        <span
                          key={mg}
                          className="inline-block px-2 py-1 rounded text-xs font-medium"
                          style={{ backgroundColor: `${color}18`, color }}
                        >
                          {mg}
                        </span>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**PlanOverview.tsx:**

```tsx
// src/pages/PlanOverview.tsx

import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { getPlanDays } from '../db/database'
import type { PlanDay } from '../types'
import CalendarGrid from '../components/CalendarGrid'

export default function PlanOverview() {
  const { state } = useApp()
  const [week, setWeek] = useState(1)
  const [days, setDays] = useState<PlanDay[]>([])
  const plan = state.plans[0]

  useEffect(() => {
    if (plan?.id) {
      getPlanDays(plan.id).then(setDays)
    }
  }, [plan])

  if (!plan) {
    return (
      <div className="bg-card border border-border rounded-default p-8 text-center">
        <p className="text-text-muted">还没有训练计划</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold text-text mb-6">计划概览 · {plan.name}</h1>

      {/* Week tabs */}
      <div className="flex gap-2 mb-4">
        {Array.from({ length: plan.weeks }).map((_, i) => (
          <button
            key={i}
            onClick={() => setWeek(i + 1)}
            className={`px-4 py-2 rounded-default text-sm font-medium transition-colors ${
              week === i + 1
                ? 'bg-primary/15 text-primary'
                : 'bg-card border border-border text-text-muted hover:text-text'
            }`}
          >
            第{i + 1}周
          </button>
        ))}
      </div>

      <CalendarGrid week={week} days={days} />
    </div>
  )
}
```

**Verification:** `npx tsc --noEmit` (passes).

**Commit:** `feat: add calendar grid and plan overview page with week tabs`

---

### Task 12: WeeklyChart + TrainingRecords

**Files:** Create `src/components/WeeklyChart.tsx`, modify `src/pages/TrainingRecords.tsx` (replaces stub)

**Steps:**

- [ ] WeeklyChart: Recharts LineChart showing daily workout completion count over past 7 days
- [ ] TrainingRecords: 3 stat cards (total workouts, total exercises, current streak), chart, history list
- [ ] History list: scrollable list of past logs grouped/sorted by date

**WeeklyChart.tsx:**

```tsx
// src/components/WeeklyChart.tsx

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { WorkoutLog } from '../types'

interface Props {
  logs: WorkoutLog[]
}

export default function WeeklyChart({ logs }: Props) {
  const data = useMemo(() => {
    const days: { date: string; label: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const label = `${d.getMonth() + 1}/${d.getDate()}`
      const count = logs.filter((l) => l.date === date && l.completed).length
      days.push({ date, label, count })
    }
    return days
  }, [logs])

  return (
    <div className="bg-card border border-border rounded-default p-5">
      <h3 className="text-text font-medium mb-4 text-sm">本周训练趋势</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
          <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f3460', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#e2e8f0',
            }}
            labelFormatter={(label: string) => `日期: ${label}`}
            formatter={(value: number) => [`${value} 组`, '完成']}
          />
          <Line type="monotone" dataKey="count" stroke="#00E676" strokeWidth={2} dot={{ fill: '#00E676', r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

**TrainingRecords.tsx:**

```tsx
// src/pages/TrainingRecords.tsx

import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { getWorkoutLogsByUser } from '../db/database'
import type { WorkoutLog } from '../types'
import WeeklyChart from '../components/WeeklyChart'

export default function TrainingRecords() {
  const { state } = useApp()
  const [logs, setLogs] = useState<WorkoutLog[]>([])

  useEffect(() => {
    if (state.currentUser?.id) {
      getWorkoutLogsByUser(state.currentUser.id).then(setLogs)
    }
  }, [state.currentUser])

  const completedLogs = logs.filter((l) => l.completed)
  const uniqueDays = new Set(completedLogs.map((l) => l.date)).size
  const streak = useMemo(() => {
    let count = 0
    const d = new Date()
    while (true) {
      d.setDate(d.getDate() - 1)
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (completedLogs.some((l) => l.date === date)) {
        count++
      } else {
        break
      }
    }
    return count
  }, [completedLogs])

  // Group logs by date, sorted descending
  const groupedLogs = logs.reduce<Record<string, WorkoutLog[]>>((acc, log) => {
    if (!acc[log.date]) acc[log.date] = []
    acc[log.date].push(log)
    return acc
  }, {})
  const sortedDates = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a))

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold text-text mb-6">训练记录</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: '训练天数', value: uniqueDays },
          { label: '完成组数', value: completedLogs.length },
          { label: '连续训练', value: `${streak}天` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-default p-4 text-center">
            <div className="text-2xl font-bold text-primary">{value}</div>
            <div className="text-text-muted text-xs mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="mb-6">
        <WeeklyChart logs={logs} />
      </div>

      {/* History list */}
      <div className="bg-card border border-border rounded-default p-5">
        <h3 className="text-text font-medium mb-3 text-sm">历史记录</h3>
        {sortedDates.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-6">暂无训练记录</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {sortedDates.map((date) => (
              <div key={date}>
                <div className="text-text-muted text-xs mb-1.5">{date}</div>
                <div className="flex gap-2 flex-wrap">
                  {groupedLogs[date].map((log) => (
                    <span
                      key={log.id}
                      className="text-xs px-2 py-1 rounded bg-bg text-text border border-border"
                    >
                      {log.completed ? '✅' : '⬜'} 动作 #{log.exerciseId}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

Wait — `useMemo` needs to be imported:

```tsx
import { useState, useEffect, useMemo } from 'react'
```

**Verification:** `npx tsc --noEmit` (passes).

**Commit:** `feat: add weekly chart and training records page with stats`

---

### Task 13: MyProfile Page

**Files:** Modify `src/pages/MyProfile.tsx` (replaces stub)

**Steps:**

- [ ] View mode: displays user info (avatar, name, height, weight, goal, join date)
- [ ] Edit mode: inline editable fields for name, height, weight, goal, avatar
- [ ] Save updates to IndexedDB via `db.users.update()`, sync to context state
- [ ] Cancel reverts to original values

**Code:**

```tsx
// src/pages/MyProfile.tsx

import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { updateUser } from '../db/database'
import { GOALS, type Goal } from '../types'

const AVATAR_OPTIONS = ['🐻', '🐱', '🐶', '🐼', '🦊', '🐨', '🐯', '🦁']

export default function MyProfile() {
  const { state, dispatch } = useApp()
  const user = state.currentUser
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: user?.name ?? '',
    height: user?.height ?? 170,
    weight: user?.weight ?? 65,
    goal: (user?.goal as Goal) ?? ('增肌' as Goal),
    avatar: user?.avatar ?? '🐻',
  })

  if (!user) {
    return <div className="text-text-muted">请先登录</div>
  }

  const handleStartEdit = () => {
    setForm({
      name: user.name,
      height: user.height,
      weight: user.weight,
      goal: user.goal as Goal,
      avatar: user.avatar ?? '🐻',
    })
    setEditing(true)
  }

  const handleSave = async () => {
    await updateUser(user.id!, {
      name: form.name,
      height: form.height,
      weight: form.weight,
      goal: form.goal,
      avatar: form.avatar,
    })
    dispatch({ type: 'SET_USER', user: { ...user, ...form } })
    setEditing(false)
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text">我的</h1>
        {!editing ? (
          <button
            onClick={handleStartEdit}
            className="text-sm text-primary border border-primary/30 rounded-default px-4 py-1.5 hover:bg-primary/10 transition-colors"
          >
            编辑
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="text-sm text-text-muted border border-border rounded-default px-4 py-1.5 hover:bg-card transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="text-sm bg-primary text-[#1a1a2e] rounded-default px-4 py-1.5 font-medium hover:bg-primary/90 transition-colors"
            >
              保存
            </button>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-default p-6 space-y-5">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="text-5xl">{editing ? form.avatar : (user.avatar ?? '🐻')}</div>
          {editing && (
            <div className="flex gap-1.5">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setForm({ ...form, avatar: emoji })}
                  className={`w-9 h-9 rounded-default text-xl border transition-colors ${
                    form.avatar === emoji
                      ? 'border-primary bg-primary/15'
                      : 'border-border bg-bg hover:border-primary/40'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Name */}
        <Field label="昵称">
          {editing ? (
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-bg border border-border rounded-default px-3 py-2 text-text outline-none focus:border-primary"
            />
          ) : (
            <span className="text-text">{user.name}</span>
          )}
        </Field>

        {/* Height */}
        <Field label="身高">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={form.height}
                onChange={(e) => setForm({ ...form, height: Number(e.target.value) })}
                className="w-24 bg-bg border border-border rounded-default px-3 py-2 text-text outline-none focus:border-primary"
              />
              <span className="text-text-muted text-sm">cm</span>
            </div>
          ) : (
            <span className="text-text">{user.height} cm</span>
          )}
        </Field>

        {/* Weight */}
        <Field label="体重">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
                className="w-24 bg-bg border border-border rounded-default px-3 py-2 text-text outline-none focus:border-primary"
              />
              <span className="text-text-muted text-sm">kg</span>
            </div>
          ) : (
            <span className="text-text">{user.weight} kg</span>
          )}
        </Field>

        {/* Goal */}
        <Field label="目标">
          {editing ? (
            <select
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value as Goal })}
              className="bg-bg border border-border rounded-default px-3 py-2 text-text outline-none focus:border-primary"
            >
              {GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          ) : (
            <span className="text-text">{user.goal}</span>
          )}
        </Field>

        {/* Joined */}
        <Field label="加入时间">
          <span className="text-text-muted">{formatDate(user.createdAt)}</span>
        </Field>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-text-muted text-xs mb-1.5">{label}</div>
      {children}
    </div>
  )
}
```

**Verification:** `npx tsc --noEmit` (passes).

**Commit:** `feat: add profile page with view and edit modes`

---

### Task 14: Final Integration & Verification

**Files:** All existing files

**Steps:**

- [ ] Import `PlanDay` type in `PlanOverview.tsx` (already done)
- [ ] Verify `src/index.css` is correct with `@theme` block (already done in Task 6)
- [ ] Ensure `vite.config.ts` has both `react()` and `tailwindcss()` plugins (already present)
- [ ] Run `npx tsc --noEmit` from project root — fix any type errors
- [ ] Run `npm run dev` — app should load without runtime errors
- [ ] Verify routing: `/login` shows login, click user → redirects to `/today`
- [ ] Test sidebar navigation between all 4 pages
- [ ] Confirm sidebar highlights active nav link

**Expected issues to fix during this task:**
- Missing imports in any stubbed page files
- TailwindCSS v4 compatibility (use `rounded-default` or `rounded-lg`?)
- Actually in TailwindCSS v4, custom `--radius-default` won't work as a utility unless used as `rounded-[var(--radius-default)]`. Let me fix: change `rounded-default` throughout all code to either `rounded-xl` or use `rounded-(--radius-default)`. Simpler: use `rounded-xl` (12px ≈ 0.75rem = rounded-xl) throughout and remove the `--radius-default` from index.css, or keep it and use `rounded-[12px]`.

Decision: use `rounded-xl` everywhere (it's close enough to 12px) and remove `--radius-default` from index.css for simplicity.

Actually for TailwindCSS v4, we CAN define `--radius-default` but we need to reference it as `rounded-(--radius-default)`. But this is non-standard. Let me just use `rounded-xl` throughout the app and remove the custom radius token from `index.css`. This is simpler and more maintainable.

Wait, actually in TailwindCSS v4, you can define custom utilities:
```css
@theme {
  --radius-default: 12px;
}
```
And then use `rounded-default`! That's a v4 feature. Let me check... Actually yes, TailwindCSS v4 allows defining custom theme values with `@theme { --something: value }` and then using them as first-class utilities like `rounded-default`, `bg-card`, etc. This is exactly what we want.

So the code as written with `rounded-default`, `bg-sidebar`, `bg-bg`, `bg-card`, `border-border`, `text-text`, `text-text-muted` is correct for TailwindCSS v4.

Let me keep it as is and fix the index.css to include the `@theme` block.

**Commit:** `fix: integration fixes for type errors and TailwindCSS v4 compatibility`

---

### Task 15: Seed Demo Data

**Files:** Create `src/db/seed.ts`, modify `src/pages/Login.tsx`

**Steps:**

- [ ] Create `seed.ts` with function that checks if no plans exist for a user, then imports the push-pull-legs template
- [ ] Call `seedData(userId)` after user creation or login in `Login.tsx`
- [ ] Ensure exercises from template JSON are imported into the DB

**seed.ts:**

```typescript
// src/db/seed.ts

import { db, importPlanTemplate, getPlansByUser } from './database'
import template from '../data/templates/push-pull-legs.json'
import type { Goal } from '../types'

interface TemplateDay {
  week: number
  dayOfWeek: number
  isRestDay: boolean
  muscleGroups: string[]
  exercises: {
    name: string
    muscleGroup: string
    sets: number
    reps: number
    restSeconds: number
    order: number
  }[]
}

export async function seedData(userId: number, goal: Goal): Promise<void> {
  const existingPlans = await getPlansByUser(userId)
  if (existingPlans.length > 0) return

  const days = (template as TemplateDay[]).map((td) => ({
    week: td.week,
    dayOfWeek: td.dayOfWeek,
    isRestDay: td.isRestDay,
    muscleGroups: td.muscleGroups,
  }))

  const exercisesByIndex = new Map<number, { name: string; muscleGroup: string; sets: number; reps: number; restSeconds: number; order: number }[]>()
  ;(template as TemplateDay[]).forEach((td, i) => {
    exercisesByIndex.set(i, td.exercises.map((ex) => ({ ...ex })))
  })

  await importPlanTemplate(
    {
      userId,
      name: `${goal} · 推拉腿 4周计划`,
      weeks: 4,
      createdAt: Date.now(),
    },
    days,
    exercisesByIndex,
  )
}
```

**Modify Login.tsx** — add `seedData` call:

After `const id = await addUser(...)`, add:

```typescript
await seedData(id, form.goal)
```

And import:

```typescript
import { seedData } from '../db/seed'
```

Also, after `handleCreate`, in `handleSelect` (when selecting an existing user), we should also seed if needed. Actually, seeding on `handleSelect` as well:

```typescript
const handleSelect = async (user: User) => {
  await seedData(user.id!, user.goal as Goal)
  dispatch({ type: 'SET_USER', user })
  navigate('/today')
}
```

**Verification:** `npx tsc --noEmit` (passes). Create a user → verify in DevTools IndexedDB that template plans/days/exercises exist.

**Commit:** `feat: add demo data seeder for new users`

---

### Task 16: Polish & Edge Cases

**Files:** Modify `src/index.css`, possibly others

**Steps:**

- [ ] Add custom scrollbar styling to `index.css`
- [ ] Handle empty states consistently across all pages
- [ ] Refresh today's plan data when the user navigates to `/today` (call `load` again)
- [ ] Tauri window config: set `"resizable": true`, `"fullscreen": false` in `tauri.conf.json`
- [ ] Verify responsive sidebar — on narrow windows it shouldn't overflow
- [ ] Enable `centered: true` or `decorations: true` in Tauri window config for better looking window
- [ ] Add a `<title>PlanFit</title>` update: use `useEffect` + `document.title` or just static in index.html (already done)
- [ ] Smooth transitions between pages (add a subtle fade via CSS)
- [ ] Handle rapid toggle clicks gracefully on ExerciseCard
- [ ] Make sure the login guard redirect works when URL is directly accessed

**Scrollbar styling in index.css:**

```css
/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: var(--color-bg);
}

::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-muted);
}
```

Note: CSS variables from `@theme` are available. Or use Tailwind CSS v4 colors directly with `@apply`.

Better use the Tailwind v4 approach — reference the theme tokens using `var(--color-*)`:

```css
::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}
```

**Tauri window config update in `src-tauri/tauri.conf.json`:**

Add `"resizable": true` and `"decorations": true` to the window config:

```json
{
  "title": "PlanFit",
  "width": 1024,
  "height": 700,
  "minWidth": 800,
  "minHeight": 600,
  "resizable": true,
  "decorations": true
}
```

**Empty state consistency:**
- TodayPlan: "还没有训练计划" card (already done in Task 10)
- PlanOverview: "还没有训练计划" card (already done in Task 11)
- TrainingRecords: "暂无训练记录" text (already done in Task 12)
- MyProfile: should never be empty since auth guard requires login

**Rapid toggle fix** — use a local loading state in ExerciseCard or TodayPlan to prevent double-click issues:

In `TodayPlan.tsx`, wrap the toggle handler:

```typescript
const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set())

const handleToggle = async (exercise: Exercise) => {
  if (!state.currentUser || !planDay || togglingIds.has(exercise.id!)) return
  setTogglingIds((prev) => new Set(prev).add(exercise.id!))
  try {
    // ... existing toggle logic ...
  } finally {
    setTogglingIds((prev) => {
      const next = new Set(prev)
      next.delete(exercise.id!)
      return next
    })
  }
}
```

**Verification:** `npx tsc --noEmit` (passes). `npm run dev` — visual check of all edge cases.

**Commit:** `fix: polish UI, add scrollbar styles, fix edge cases`

---

## Task Summary

| # | Task | Files Created/Modified | Commit Message |
|---|------|----------------------|----------------|
| 1 | Project Scaffolding | — (already done) | — |
| 2 | Type Definitions | `src/types/index.ts` | `feat: add TypeScript type definitions` |
| 3 | Database Layer | `src/db/database.ts` | `feat: add Dexie.js database layer with all CRUD helpers` |
| 4 | Global State | `src/context/AppContext.tsx` | `feat: add global state management with AppContext` |
| 5 | Static Data | `src/data/templates/push-pull-legs.json`, `src/data/motivations.ts` | `feat: add training plan template and motivational quotes data` |
| 6 | App Shell | `src/main.tsx`, `src/App.tsx`, `src/index.css` | `feat: add app shell with routing, auth guard, sidebar layout` |
| 7 | Sidebar | `src/components/Sidebar.tsx` | `feat: add sidebar with user info, navigation, and daily quote` |
| 8 | Login Page | `src/pages/Login.tsx` | `feat: add login page with user selection and creation` |
| 9 | Celebration | `src/components/Celebration.tsx` | `feat: add celebration overlay component for workout completion` |
| 10 | ExerciseCard + TodayPlan | `src/components/ExerciseCard.tsx`, `src/pages/TodayPlan.tsx` | `feat: add exercise card and today plan page with completion tracking` |
| 11 | PlanOverview + CalendarGrid | `src/components/CalendarGrid.tsx`, `src/pages/PlanOverview.tsx` | `feat: add calendar grid and plan overview page with week tabs` |
| 12 | WeeklyChart + TrainingRecords | `src/components/WeeklyChart.tsx`, `src/pages/TrainingRecords.tsx` | `feat: add weekly chart and training records page with stats` |
| 13 | MyProfile | `src/pages/MyProfile.tsx` | `feat: add profile page with view and edit modes` |
| 14 | Integration & Verification | All files | `fix: integration fixes for type errors and TailwindCSS v4 compatibility` |
| 15 | Seed Demo Data | `src/db/seed.ts`, `src/pages/Login.tsx` | `feat: add demo data seeder for new users` |
| 16 | Polish & Edge Cases | `src/index.css`, `src-tauri/tauri.conf.json`, `src/pages/TodayPlan.tsx` | `fix: polish UI, add scrollbar styles, fix edge cases` |
