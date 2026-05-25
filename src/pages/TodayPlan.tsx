import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { getPlansByUser, getPlanDays, getExercisesByDay, getLogsForDate, upsertWorkoutLog } from '../db/database';
import type { PlanDay, Exercise } from '../types';
import ExerciseCard from '../components/ExerciseCard';
import Celebration from '../components/Celebration';

const DAY_NAMES = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function getTodayDayOfWeek(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDateText(): string {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${DAY_NAMES[getTodayDayOfWeek()]}`;
}

export default function TodayPlan() {
  const { state } = useApp();
  const user = state.currentUser;
  const [exercises, setExercises] = useState<(Exercise & { completed: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [planDay, setPlanDay] = useState<PlanDay | null>(null);
  const [allCompleted, setAllCompleted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const todayStr = getTodayStr();
  const dayOfWeek = getTodayDayOfWeek();

  const loadDay = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    const plans = await getPlansByUser(user.id);
    const plan = plans[0];
    if (!plan) { setLoading(false); return; }

    const days = await getPlanDays(plan.id);
    const today = days.find((d) => d.week === 1 && d.dayOfWeek === dayOfWeek);

    if (!today || today.isRestDay) {
      setPlanDay(today || null);
      setExercises([]);
      setLoading(false);
      return;
    }

    setPlanDay(today);

    const exs = await getExercisesByDay(today.id!);
    const logs = await getLogsForDate(user.id, todayStr);
    const logMap = new Map(logs.map((l) => [l.exerciseId, l.completed]));

    const withStatus = exs.map((e) => ({ ...e, completed: logMap.get(e.id!) || false }));
    setExercises(withStatus);

    setLoading(false);
  }, [user?.id, todayStr, dayOfWeek]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  async function handleToggle(exerciseId: number, index: number) {
    const newExercises = [...exercises];
    const newCompleted = !newExercises[index].completed;
    newExercises[index] = { ...newExercises[index], completed: newCompleted };
    setExercises(newExercises);

    await upsertWorkoutLog({
      userId: user!.id!,
      planDayId: planDay!.id!,
      exerciseId,
      date: todayStr,
      completed: newCompleted,
      completedAt: newCompleted ? Date.now() : undefined,
    });

    const allDone = newExercises.every((e) => e.completed);
    if (allDone && !allCompleted) {
      setAllCompleted(true);
      setShowCelebration(true);
    }
  }

  function dismissCelebration() {
    setShowCelebration(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: 'var(--color-text-muted)' }}>加载中...</p>
      </div>
    );
  }

  const total = exercises.length;
  const done = exercises.filter((e) => e.completed).length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            {getDateText()}
          </h1>
          {planDay && !planDay.isRestDay && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {planDay.muscleGroups.join(' + ')} · 共{total}个动作
            </p>
          )}
        </div>
        {total > 0 && (
          <span
            className="px-4 py-1.5 rounded-full text-sm font-semibold"
            style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}
          >
            {done}/{total}
          </span>
        )}
      </div>

      {!planDay || planDay.isRestDay ? (
        <div
          className="rounded-xl p-10 text-center"
          style={{ backgroundColor: 'var(--color-card)' }}
        >
          <p className="text-lg" style={{ color: 'var(--color-text-muted)' }}>
            {planDay?.isRestDay ? '今天是休息日，好好放松吧 🎉' : '今天没有安排训练，去计划概览设置吧'}
          </p>
        </div>
      ) : exercises.length === 0 ? (
        <div
          className="rounded-xl p-10 text-center"
          style={{ backgroundColor: 'var(--color-card)' }}
        >
          <p style={{ color: 'var(--color-text-muted)' }}>
            该训练日还没有添加动作
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {exercises.map((ex, i) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              completed={ex.completed}
              onToggle={() => handleToggle(ex.id!, i)}
            />
          ))}
        </div>
      )}

      {showCelebration && (
        <Celebration
          exerciseCount={total}
          streakDays={3}
          totalSets={exercises.reduce((sum, e) => sum + e.sets, 0)}
          onClose={dismissCelebration}
        />
      )}
    </div>
  );
}
