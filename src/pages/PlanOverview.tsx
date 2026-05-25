import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { getPlansByUser, getPlanDays, getAllLogs, db, getPlanDayByDate, createPlanDay } from '../db/database';
import type { Plan, PlanDay } from '../types';
import CalendarGrid, { DayEditor } from '../components/CalendarGrid';
import WeatherPanel from '../components/WeatherPanel';

const DAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export default function PlanOverview() {
  const { state } = useApp();
  const user = state.currentUser;
  const [plan, setPlan] = useState<Plan | null>(null);
  const [completedDayIds, setCompletedDayIds] = useState<Set<number>>(new Set());
  const [allDays, setAllDays] = useState<PlanDay[]>([]);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editingExisting, setEditingExisting] = useState<PlanDay | null>(null);

  const loadPlan = useCallback(async (planId?: number) => {
    if (!user?.id) return;
    const allPlans = await getPlansByUser(user.id!);
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

  async function handleEditDay(date: string, existingDay: PlanDay | null) {
    setEditingDate(date);
    setEditingExisting(existingDay);
  }

  async function handleSaveDay(updatedDay: PlanDay) {
    if (!plan?.id || !editingDate) return;

    if (updatedDay.id) {
      // Update existing
      await db.planDays.update(updatedDay.id, {
        isRestDay: updatedDay.isRestDay,
        muscleGroups: updatedDay.muscleGroups,
      });
    } else {
      // Create new plan day for this date
      const d = new Date(editingDate);
      const week = Math.ceil(d.getDate() / 7);
      const dow = d.getDay() === 0 ? 7 : d.getDay();
      await createPlanDay({
        planId: plan.id,
        week,
        dayOfWeek: dow,
        isRestDay: updatedDay.isRestDay,
        muscleGroups: updatedDay.muscleGroups,
        date: editingDate,
      });
    }

    setEditingDate(null);
    setEditingExisting(null);
    loadPlan();
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p style={{ color: 'var(--color-text-muted)' }}>暂无训练计划，请先创建用户并导入模板</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
          计划概览
        </h1>
        <span className="px-3 py-1.5 rounded-full text-sm font-semibold"
          style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
          {plan.name}
        </span>
      </div>

      <CalendarGrid
        days={allDays}
        planId={plan.id!}
        completedDayIds={completedDayIds}
        onEditDay={handleEditDay}
      />

      <WeatherPanel />

      {editingDate && (
        <DayEditor
          date={editingDate}
          weekLabel={editingDate ? DAY_LABELS[new Date(editingDate).getDay()] : ''}
          existingDay={editingExisting}
          planId={plan.id!}
          onClose={() => { setEditingDate(null); setEditingExisting(null); }}
          onSave={handleSaveDay}
        />
      )}
    </div>
  );
}
