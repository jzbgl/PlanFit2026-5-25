import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getAllLogs } from '../db/database';
import WeeklyChart from '../components/WeeklyChart';

interface WeekData {
  week: string;
  count: number;
}

interface HistoryItem {
  date: string;
  dayLabel: string;
  muscleGroups: string;
  exercises: number;
  completed: boolean;
}

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `W${weekNum}`;
}

export default function TrainingRecords() {
  const { state } = useApp();
  const user = state.currentUser;
  const [weeklyData, setWeeklyData] = useState<WeekData[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState({ thisWeek: 0, total: 0, streak: 0 });

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const logs = await getAllLogs(user.id);
      const completedLogs = logs.filter((l) => l.completed);

      const dateMap = new Map<string, Set<string>>();
      for (const log of completedLogs) {
        if (!dateMap.has(log.date)) dateMap.set(log.date, new Set());
        dateMap.get(log.date)!.add(log.exerciseId.toString());
      }

      const weekSessionMap = new Map<string, number>();
      for (const [date] of dateMap) {
        const w = getWeekLabel(date);
        weekSessionMap.set(w, (weekSessionMap.get(w) || 0) + 1);
      }

      const sortedWeeks = Array.from(weekSessionMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-10)
        .map(([week, count]) => ({ week, count }));

      setWeeklyData(sortedWeeks);

      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
      const thisWeekStart = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
      let thisWeekCount = 0;
      for (const [date] of dateMap) {
        if (date >= thisWeekStart) thisWeekCount++;
      }

      setStats({
        thisWeek: thisWeekCount,
        total: dateMap.size,
        streak: sortedWeeks.filter((w) => w.count > 0).length,
      });

      const historyItems: HistoryItem[] = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dayLabel = `周${DAY_LABELS[d.getDay()]}`;
        const dayCompleted = dateMap.has(dateStr);
        historyItems.push({
          date: dateStr,
          dayLabel,
          muscleGroups: dayCompleted ? '训练日' : '休息日',
          exercises: dayCompleted ? dateMap.get(dateStr)?.size || 0 : 0,
          completed: dayCompleted,
        });
      }
      setHistory(historyItems);
    })();
  }, [user?.id]);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-5" style={{ color: 'var(--color-text)' }}>
        训练记录
      </h1>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--color-card)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>本周训练</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{stats.thisWeek}次</div>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--color-card)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>总训练次数</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{stats.total}次</div>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--color-card)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>连续周数</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{stats.streak}周</div>
        </div>
      </div>

      <div className="mb-6">
        <WeeklyChart data={weeklyData} />
      </div>

      <div>
        <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--color-text)' }}>历史记录</h2>
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {history.map((item) => (
            <div
              key={item.date}
              className="flex items-center justify-between p-3 rounded-xl"
              style={{ backgroundColor: 'var(--color-card)' }}
            >
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {item.date} · {item.dayLabel}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {item.muscleGroups}{item.exercises > 0 ? ` · ${item.exercises}动作` : ''}
                </div>
              </div>
              <span className="text-2xl" style={{ color: item.completed ? 'var(--color-primary)' : 'var(--color-rest)' }}>
                {item.completed ? '✓' : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
