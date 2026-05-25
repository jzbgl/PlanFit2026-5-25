import { createPlan, createPlanDay, bulkCreateExercises } from './database';
import template from '../data/templates/push-pull-legs.json';

function getDateForWeekDay(week: number, dayOfWeek: number): string {
  const now = new Date();
  const todayDow = now.getDay();
  // Find Monday of current week
  const monday = new Date(now);
  monday.setDate(now.getDate() - (todayDow === 0 ? 6 : todayDow - 1));
  // Calculate target date
  const target = new Date(monday);
  target.setDate(monday.getDate() + (week - 1) * 7 + (dayOfWeek - 1));
  return `${target.getFullYear()}-${target.getMonth()}-${target.getDate()}`;
}

export async function seedPlanForUser(userId: number): Promise<void> {
  const planId = await createPlan({
    userId,
    name: template.name,
    weeks: template.weeks,
    createdAt: Date.now(),
  });

  const week1Days = (template as any).days.filter((d: any) => d.week === 1);

  for (const day of week1Days) {
    const dayId = await createPlanDay({
      planId,
      week: day.week,
      dayOfWeek: day.dayOfWeek,
      isRestDay: day.isRestDay,
      muscleGroups: day.muscleGroups,
      date: getDateForWeekDay(day.week, day.dayOfWeek),
    });

    if (!day.isRestDay && day.exercises.length > 0) {
      await bulkCreateExercises(
        day.exercises.map((ex: any) => ({
          planDayId: dayId,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          sets: ex.sets,
          reps: ex.reps,
          restSeconds: ex.restSeconds,
          order: ex.order,
        }))
      );
    }
  }
}
