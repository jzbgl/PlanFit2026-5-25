export type MuscleGroup = '胸' | '背' | '腿' | '肩' | '腹部' | '有氧' | '减脂' | '手臂';

export type Goal = '增肌' | '减脂' | '塑形' | '力量提升';

export const GOAL_OPTIONS: Goal[] = ['增肌', '减脂', '塑形', '力量提升'];

export const MUSCLE_GROUPS: MuscleGroup[] = ['胸', '背', '腿', '肩', '腹部', '有氧', '减脂', '手臂'];

export const MUSCLE_GROUP_COLORS: Record<MuscleGroup, string> = {
  '胸': '#00E676',
  '背': '#3b82f6',
  '腿': '#a855f7',
  '肩': '#f59e0b',
  '腹部': '#ef4444',
  '有氧': '#06b6d4',
  '减脂': '#ec4899',
  '手臂': '#f97316',
};

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
  date: string;
  completed: boolean;
  completedAt?: number;
}

export interface AppState {
  currentUser: User | null;
  plans: Plan[];
}

export type AppAction =
  | { type: 'SET_USER'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_PLANS'; plans: Plan[] };
