import { useState } from 'react';
import type { PlanDay, MuscleGroup } from '../types';
import { MUSCLE_GROUP_COLORS, MUSCLE_GROUPS } from '../types';

// --- DayEditor ---
interface DayEditorProps {
  date: string;
  weekLabel: string;
  existingDay: PlanDay | null;
  planId: number;
  onClose: () => void;
  onSave: (day: PlanDay) => void;
}

function DayEditor({ date, weekLabel, existingDay, planId, onClose, onSave }: DayEditorProps) {
  const [isRest, setIsRest] = useState(existingDay?.isRestDay ?? false);
  const [muscles, setMuscles] = useState<MuscleGroup[]>([...(existingDay?.muscleGroups || [])]);

  function toggleMuscle(mg: MuscleGroup) {
    setMuscles((prev) => (prev.includes(mg) ? prev.filter((m) => m !== mg) : [...prev, mg]));
  }

  function handleSave() {
    onSave({
      planId,
      week: 1,
      dayOfWeek: 1,
      isRestDay: isRest,
      muscleGroups: isRest ? [] : muscles,
      date,
      ...(existingDay ? { id: existingDay.id } : {}),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(10,22,40,0.95)' }}>
      <div className="w-full max-w-sm mx-4 rounded-2xl p-6" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            {date} {weekLabel}
          </h2>
          <button onClick={onClose} className="text-xl" style={{ color: 'var(--color-text-muted)' }}>✕</button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setIsRest(!isRest)} className="px-4 py-2 rounded-lg text-sm font-semibold flex-1"
            style={{ backgroundColor: isRest ? 'var(--color-rest)' : 'var(--color-primary)', color: isRest ? '#fff' : '#000' }}>
            {isRest ? '休息日' : '训练日'}
          </button>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>点击切换</span>
        </div>

        {!isRest && (
          <>
            <label className="text-xs mb-2 block" style={{ color: 'var(--color-text-muted)' }}>今日训练肌群</label>
            <div className="flex flex-wrap gap-2 mb-5">
              {MUSCLE_GROUPS.map((mg) => (
                <button key={mg} onClick={() => toggleMuscle(mg)} className="px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: muscles.includes(mg) ? MUSCLE_GROUP_COLORS[mg] : 'transparent',
                    color: muscles.includes(mg) ? '#000' : 'var(--color-text-muted)',
                    border: muscles.includes(mg) ? 'none' : '1px solid var(--color-border)',
                  }}>
                  {mg}
                </button>
              ))}
            </div>
          </>
        )}

        <button onClick={handleSave} className="w-full py-2.5 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}>保存</button>
      </div>
    </div>
  );
}

// --- Calendar Grid ---

interface CalendarGridProps {
  days: PlanDay[];
  planId: number;
  completedDayIds: Set<number>;
  onEditDay: (date: string, existingDay: PlanDay | null) => void;
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export default function CalendarGrid({ days, completedDayIds, onEditDay }: CalendarGridProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const year = viewYear;
  const month = viewMonth;

  // Build date → planDay map
  const dateMap = new Map<string, PlanDay>();
  for (const day of days) {
    if (day.date) dateMap.set(day.date, day);
  }

  // Calculate calendar grid
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const startDay = firstOfMonth.getDay();
  const startOffset = startDay === 0 ? 6 : startDay - 1;

  const cells: { date: Date; inMonth: boolean }[] = [];
  // Leading empty cells
  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, 1 - startOffset + i);
    cells.push({ date: d, inMonth: false });
  }
  // Month cells
  for (let d = 1; d <= lastOfMonth.getDate(); d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  // Fill remaining row
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }

  const todayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  function fmt(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-card)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <button onClick={prevMonth} className="px-2 py-1 rounded text-sm hover:bg-[var(--color-sidebar)]" style={{ color: 'var(--color-text-muted)' }}>←</button>
        <span className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
          {year}年 {MONTHS[month]}
        </span>
        <button onClick={nextMonth} className="px-2 py-1 rounded text-sm hover:bg-[var(--color-sidebar)]" style={{ color: 'var(--color-text-muted)' }}>→</button>
      </div>

      <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {WEEKDAYS.map((w) => (
          <div key={w} className="p-2 text-center text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>{w}</div>
        ))}
      </div>

      {rows.map((row, ri) => (
        <div key={ri} className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--color-border)' }}>
          {row.map((cell, ci) => {
            const key = fmt(cell.date);
            const day = dateMap.get(key);
            const isToday = key === todayStr;

            if (!cell.inMonth) {
              return <div key={ci} className="p-1 min-h-[64px]" style={{ opacity: 0.15, backgroundColor: 'var(--color-sidebar)' }}>
                <div className="text-[10px] p-0.5" style={{ color: 'var(--color-text-muted)' }}>{cell.date.getDate()}</div>
              </div>;
            }

            if (!day) {
              // Date in month but no plan — clickable to create
              return (
                <button key={ci} onClick={() => onEditDay(key, null)}
                  className="p-1 text-left min-h-[64px] hover:bg-[var(--color-sidebar)] transition-colors"
                  style={{ border: isToday ? '1px solid var(--color-primary)' : 'none' }}>
                  <div className="text-[10px] p-0.5" style={{ color: isToday ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                    {cell.date.getDate()}
                  </div>
                  <div className="text-[10px] px-1" style={{ color: 'var(--color-rest)' }}>未设置</div>
                </button>
              );
            }

            const completed = completedDayIds.has(day.id!);
            const mainMuscle = day.muscleGroups[0];
            const bgColor = mainMuscle ? MUSCLE_GROUP_COLORS[mainMuscle] : undefined;

            return (
              <button key={ci} onClick={() => onEditDay(key, day)}
                className="p-1 text-left min-h-[64px] transition-colors hover:brightness-110 relative"
                style={{
                  backgroundColor: day.isRestDay ? 'var(--color-sidebar)'
                    : completed && bgColor ? bgColor : 'transparent',
                  opacity: day.isRestDay ? 0.4 : 1,
                  border: isToday ? '1px solid var(--color-primary)' : 'none',
                }}>
                <div className="text-[10px] p-0.5 font-semibold"
                  style={{ color: isToday ? 'var(--color-primary)' : completed ? '#000' : 'var(--color-text-muted)' }}>
                  {cell.date.getDate()}
                </div>
                {day.isRestDay ? (
                  <div className="text-xs px-1" style={{ color: 'var(--color-rest)' }}>休息</div>
                ) : (
                  <div className="flex flex-wrap gap-0.5 px-0.5">
                    {day.muscleGroups.map((mg) => (
                      <span key={mg} className="px-1 py-0.5 rounded text-[10px] font-semibold"
                        style={{ backgroundColor: completed ? 'rgba(255,255,255,0.2)' : MUSCLE_GROUP_COLORS[mg], color: '#000' }}>
                        {mg}
                      </span>
                    ))}
                  </div>
                )}
                {completed && <div className="absolute top-0.5 right-1 text-xs" style={{ color: '#000' }}>✓</div>}
              </button>
            );
          })}
        </div>
      ))}

      <div className="flex flex-wrap gap-3 p-3">
        {Object.entries(MUSCLE_GROUP_COLORS).map(([group, color]) => (
          <div key={group} className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />{group}
          </div>
        ))}
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--color-sidebar)', opacity: 0.5 }} />休息
        </div>
      </div>
    </div>
  );
}

export { DayEditor };
