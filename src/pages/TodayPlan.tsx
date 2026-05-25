import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { getPlansByUser, getPlanDays, getExercisesByDay, getLogsForDate, upsertWorkoutLog, createExercise } from '../db/database';
import type { PlanDay, Exercise, MuscleGroup } from '../types';
import { MUSCLE_GROUPS } from '../types';
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>('胸');
  const [newSets, setNewSets] = useState(3);
  const [newReps, setNewReps] = useState(12);
  const [newRest, setNewRest] = useState(60);

  const todayStr = getTodayStr();
  const dayOfWeek = getTodayDayOfWeek();

  const loadDay = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    const plans = await getPlansByUser(user.id);
    const plan = plans[0];
    if (!plan) { setLoading(false); return; }

    const days = await getPlanDays(plan.id!);
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

  async function handleAddExercise() {
    if (!newName.trim() || !planDay) return;
    await createExercise({
      planDayId: planDay.id!,
      name: newName.trim(),
      muscleGroup: newMuscle,
      sets: newSets,
      reps: newReps,
      restSeconds: newRest,
      order: exercises.length + 1,
    });
    setNewName('');
    setNewMuscle('胸');
    setNewSets(3);
    setNewReps(12);
    setNewRest(60);
    setShowAddForm(false);
    loadDay();
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

      {planDay && !planDay.isRestDay && (
        <div className="mt-4">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ border: '1px dashed var(--color-primary)', color: 'var(--color-primary)' }}
            >
              + 添加动作
            </button>
          ) : (
            <div
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{ backgroundColor: 'var(--color-card)' }}
            >
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>动作名称</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  placeholder="例如：杠铃卧推"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>肌群</label>
                <select
                  value={newMuscle}
                  onChange={(e) => setNewMuscle(e.target.value as MuscleGroup)}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  {MUSCLE_GROUPS.map((mg) => (
                    <option key={mg} value={mg}>{mg}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>组数</label>
                  <input
                    type="number"
                    min={1}
                    value={newSets}
                    onChange={(e) => setNewSets(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>次数</label>
                  <input
                    type="number"
                    min={1}
                    value={newReps}
                    onChange={(e) => setNewReps(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>休息(秒)</label>
                  <input
                    type="number"
                    min={0}
                    value={newRest}
                    onChange={(e) => setNewRest(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 rounded-lg text-sm"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  取消
                </button>
                <button
                  onClick={handleAddExercise}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}
                >
                  保存
                </button>
              </div>
            </div>
          )}
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
