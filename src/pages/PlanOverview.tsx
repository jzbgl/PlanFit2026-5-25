import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { getPlansByUser, getPlanDays, getAllLogs, deletePlan, db } from '../db/database';
import type { Plan, PlanDay, Exercise } from '../types';
import CalendarGrid, { DayEditor } from '../components/CalendarGrid';
import CreatePlanModal from '../components/CreatePlanModal';
import WeatherPanel from '../components/WeatherPanel';

export default function PlanOverview() {
  const { state } = useApp();
  const user = state.currentUser;
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [completedDayIds, setCompletedDayIds] = useState<Set<number>>(new Set());
  const [allDays, setAllDays] = useState<PlanDay[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<PlanDay | null>(null);
  const [editingExercises, setEditingExercises] = useState<Exercise[]>([]);

  const loadPlan = useCallback(async (planId?: number) => {
    if (!user?.id) return;
    const allPlans = await getPlansByUser(user.id!);
    setPlans(allPlans);
    if (allPlans.length === 0) { setPlan(null); setAllDays([]); return; }

    const p = planId ? allPlans.find((pl) => pl.id === planId) ?? allPlans[0] : allPlans[0];
    if (!p) { setPlan(null); setAllDays([]); return; }
    setPlan(p);
    const days = await getPlanDays(p.id!);
    setAllDays(days);

    const logs = await getAllLogs(user.id!);
    const completedSet = new Set<number>();
    const completedMap = new Map<string, boolean>();
    for (const log of logs) {
      if (log.completed) {
        const day = days.find((d) => d.id === log.planDayId);
        if (day) completedMap.set(`${day.week}-${day.dayOfWeek}`, true);
      }
    }
    for (const day of days) {
      if (completedMap.get(`${day.week}-${day.dayOfWeek}`)) {
        completedSet.add(day.id!);
      }
    }
    setCompletedDayIds(completedSet);
  }, [user?.id]);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  function switchPlan(planId: number) {
    loadPlan(planId);
  }

  async function handleDeletePlan(planId: number) {
    if (plans.length <= 1) return;
    await deletePlan(planId);
    setDropdownOpen(false);
    loadPlan();
  }

  async function handleEditDay(day: PlanDay) {
    const exs = await db.exercises.where('planDayId').equals(day.id!).sortBy('order');
    setEditingExercises(exs);
    setEditingDay(day);
  }

  async function handleSaveDay(updatedDay: PlanDay, updatedExs: Exercise[]) {
    if (!editingDay?.id) return;

    // Update the plan day
    await db.planDays.update(editingDay.id, {
      isRestDay: updatedDay.isRestDay,
      muscleGroups: updatedDay.muscleGroups,
    });

    // Sync exercises: delete all existing, then re-create
    const existingExs = await db.exercises.where('planDayId').equals(editingDay.id).toArray();
    for (const ex of existingExs) {
      await db.exercises.delete(ex.id!);
    }

    if (!updatedDay.isRestDay && updatedExs.length > 0) {
      const toCreate = updatedExs.map((ex, idx) => ({
        planDayId: editingDay.id!,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        sets: ex.sets,
        reps: ex.reps,
        restSeconds: ex.restSeconds,
        order: idx + 1,
      }));
      await db.exercises.bulkAdd(toCreate);
    }

    setEditingDay(null);
    setEditingExercises([]);
    loadPlan();
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p style={{ color: 'var(--color-text-muted)' }}>暂无训练计划</p>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}
        >
          创建自定义计划
        </button>
          {showCreate && (
            <CreatePlanModal
              onClose={() => setShowCreate(false)}
              onCreated={async (planId) => { setShowCreate(false); await loadPlan(planId); }}
            />
          )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
          计划概览
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}
          >
            + 新计划
          </button>
          {plans.length >= 1 && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-1.5 rounded-full text-sm font-semibold outline-none flex items-center gap-1"
                style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
              >
                {plan.name} · {plan.weeks}周
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>▾</span>
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <div
                    className="absolute right-0 top-full mt-1 rounded-xl py-1 min-w-[200px] z-20 shadow-lg"
                    style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                  >
                    {plans.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-4 py-2 group hover:opacity-90"
                        style={{ backgroundColor: p.id === plan.id ? 'var(--color-sidebar)' : 'transparent' }}
                      >
                        <button
                          onClick={() => { switchPlan(p.id!); setDropdownOpen(false); }}
                          className="text-sm text-left flex-1"
                          style={{ color: 'var(--color-text)' }}
                        >
                          {p.name} · {p.weeks}周
                        </button>
                        {plans.length > 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeletePlan(p.id!); }}
                            className="ml-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: 'var(--color-text-muted)' }}
                            title="删除"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <CalendarGrid
        days={allDays}
        completedDayIds={completedDayIds}
        onEditDay={handleEditDay}
      />

      <WeatherPanel />

      {editingDay && (
        <DayEditor
          day={editingDay}
          exercises={editingExercises}
          onClose={() => { setEditingDay(null); setEditingExercises([]); }}
          onSave={handleSaveDay}
        />
      )}

      {showCreate && (
        <CreatePlanModal
          onClose={() => setShowCreate(false)}
          onCreated={async (planId) => { setShowCreate(false); await loadPlan(planId); }}
        />
      )}
    </div>
  );
}
