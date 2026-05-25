import { createPlan, createPlanDay, bulkCreateExercises } from './database';
import template from '../data/templates/push-pull-legs.json';

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
