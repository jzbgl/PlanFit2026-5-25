import { getAllLogs, db } from '../db/database';
import { ACHIEVEMENTS } from '../data/achievements';
import type { Achievement } from '../types';
import { MUSCLE_GROUPS } from '../types';

export async function checkAchievements(userId: number): Promise<Achievement[]> {
  const logs = await getAllLogs(userId);
  const completed = logs.filter(l => l.completed);

  const dates = new Set(completed.map(l => l.date));

  const unlocked: Record<string, number> = {};
  const stored = localStorage.getItem(`achievements_${userId}`);
  if (stored) Object.assign(unlocked, JSON.parse(stored));

  const now = Date.now();

  if (dates.size >= 1 && !unlocked.first_workout) unlocked.first_workout = now;
  if (dates.size >= 7 && !unlocked.streak_7) unlocked.streak_7 = now;
  if (dates.size >= 30 && !unlocked.streak_30) unlocked.streak_30 = now;
  if (completed.length >= 100 && !unlocked.sets_100) unlocked.sets_100 = now;
  if (completed.length >= 500 && !unlocked.sets_500) unlocked.sets_500 = now;

  if (!unlocked.exercises_50 || !unlocked.all_muscles) {
    const exerciseIds = [...new Set(completed.map(l => l.exerciseId))];
    const exercises = await db.exercises.bulkGet(exerciseIds);
    const valid = exercises.filter(e => e !== undefined);

    if (!unlocked.exercises_50) {
      const uniqueNames = new Set(valid.map(e => e!.name)).size;
      if (uniqueNames >= 50) unlocked.exercises_50 = now;
    }

    if (!unlocked.all_muscles) {
      const trainedMuscles = new Set(valid.map(e => (e as any).muscleGroup));
      if (MUSCLE_GROUPS.every(mg => trainedMuscles.has(mg))) unlocked.all_muscles = now;
    }
  }

  if (!unlocked.early_bird) {
    const hasEarlyBird = completed.some(l => {
      if (!l.completedAt) return false;
      const d = new Date(l.completedAt);
      return d.getHours() < 6;
    });
    if (hasEarlyBird) unlocked.early_bird = now;
  }

  localStorage.setItem(`achievements_${userId}`, JSON.stringify(unlocked));

  return ACHIEVEMENTS.map(a => ({
    ...a,
    unlockedAt: unlocked[a.id] || undefined,
  }));
}
