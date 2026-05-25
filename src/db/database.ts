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

// --- User helpers ---

export async function getAllUsers(): Promise<User[]> {
  return db.users.orderBy('createdAt').toArray();
}

export async function createUser(user: Omit<User, 'id'>): Promise<number> {
  return db.users.add(user as User);
}

export async function updateUser(id: number, changes: Partial<User>): Promise<number> {
  return db.users.update(id, changes);
}

export async function getUserById(id: number): Promise<User | undefined> {
  return db.users.get(id);
}

// --- Plan helpers ---

export async function getPlansByUser(userId: number): Promise<Plan[]> {
  return db.plans.where('userId').equals(userId).toArray();
}

export async function createPlan(plan: Omit<Plan, 'id'>): Promise<number> {
  return db.plans.add(plan as Plan);
}

export async function deletePlan(id: number): Promise<void> {
  const days = await db.planDays.where('planId').equals(id).toArray();
  const dayIds = days.map(d => d.id!);
  await db.exercises.where('planDayId').anyOf(dayIds).delete();
  await db.planDays.where('planId').equals(id).delete();
  await db.plans.delete(id);
}

// --- PlanDay helpers ---

export async function getPlanDays(planId: number): Promise<PlanDay[]> {
  return db.planDays.where('planId').equals(planId).toArray();
}

export async function getPlanDay(planId: number, week: number, dayOfWeek: number): Promise<PlanDay | undefined> {
  return db.planDays.where({ planId, week, dayOfWeek }).first();
}

export async function createPlanDay(day: Omit<PlanDay, 'id'>): Promise<number> {
  return db.planDays.add(day as PlanDay);
}

export async function bulkCreatePlanDays(days: Omit<PlanDay, 'id'>[]): Promise<number> {
  return db.planDays.bulkAdd(days as PlanDay[]);
}

// --- Exercise helpers ---

export async function getExercisesByDay(planDayId: number): Promise<Exercise[]> {
  return db.exercises.where('planDayId').equals(planDayId).sortBy('order');
}

export async function createExercise(ex: Omit<Exercise, 'id'>): Promise<number> {
  return db.exercises.add(ex as Exercise);
}

export async function bulkCreateExercises(exercises: Omit<Exercise, 'id'>[]): Promise<number> {
  return db.exercises.bulkAdd(exercises as Exercise[]);
}

export async function updateExercise(id: number, changes: Partial<Exercise>): Promise<number> {
  return db.exercises.update(id, changes);
}

export async function deleteExercise(id: number): Promise<void> {
  await db.exercises.delete(id);
}

// --- WorkoutLog helpers ---

export async function getLogForExercise(userId: number, exerciseId: number, date: string): Promise<WorkoutLog | undefined> {
  return db.workoutLogs.where({ userId, exerciseId, date }).first();
}

export async function getLogsForDate(userId: number, date: string): Promise<WorkoutLog[]> {
  return db.workoutLogs.where({ userId, date }).toArray();
}

export async function getAllLogs(userId: number): Promise<WorkoutLog[]> {
  return db.workoutLogs.where('userId').equals(userId).toArray();
}

export async function upsertWorkoutLog(log: Omit<WorkoutLog, 'id'>): Promise<number> {
  const existing = await db.workoutLogs
    .where({ userId: log.userId, exerciseId: log.exerciseId, date: log.date })
    .first();
  if (existing) {
    await db.workoutLogs.update(existing.id!, { completed: log.completed, completedAt: log.completedAt });
    return existing.id!;
  }
  return db.workoutLogs.add(log as WorkoutLog);
}
