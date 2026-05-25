import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { getPlansByUser, getPlanDays, getAllLogs } from '../db/database';
import type { Plan, PlanDay } from '../types';
import CalendarGrid from '../components/CalendarGrid';
import CreatePlanModal from '../components/CreatePlanModal';

export default function PlanOverview() {
  const { state } = useApp();
  const user = state.currentUser;
  const [plan, setPlan] = useState<Plan | null>(null);
  const [week, setWeek] = useState(1);
  const [completedDayIds, setCompletedDayIds] = useState<Set<number>>(new Set());
  const [allDays, setAllDays] = useState<PlanDay[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const weeks = plan?.weeks || 4;

  const loadPlan = useCallback(async () => {
    if (!user?.id) return;
    const plans = await getPlansByUser(user.id!);
    if (plans.length === 0) { setPlan(null); return; }
    const p = plans[0];
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
            onCreated={() => { setShowCreate(false); loadPlan(); }}
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
          <span
            className="px-4 py-1.5 rounded-full text-sm font-semibold"
            style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}
          >
            {plan.name} · {plan.weeks}周
          </span>
        </div>
      </div>

      {/* Week tabs */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: weeks }, (_, i) => i + 1).map((w) => (
          <button
            key={w}
            onClick={() => setWeek(w)}
            className="px-4 py-1.5 rounded-md text-sm font-semibold transition-colors"
            style={{
              backgroundColor: week === w ? 'var(--color-primary)' : 'var(--color-card)',
              color: week === w ? '#000' : 'var(--color-text-muted)',
            }}
          >
            第{w}周
          </button>
        ))}
      </div>

      <CalendarGrid days={allDays} week={week} completedDayIds={completedDayIds} />

      {showCreate && (
        <CreatePlanModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadPlan(); }}
        />
      )}
    </div>
  );
}
