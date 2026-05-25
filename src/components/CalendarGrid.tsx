import { useState } from 'react';
import type { PlanDay, Exercise, MuscleGroup } from '../types';
import { MUSCLE_GROUP_COLORS, MUSCLE_GROUPS } from '../types';

interface DayEditorProps {
  day: PlanDay;
  exercises: Exercise[];
  onClose: () => void;
  onSave: (day: PlanDay, exercises: Exercise[]) => void;
}

function DayEditor({ day, exercises, onClose, onSave }: DayEditorProps) {
  const [isRest, setIsRest] = useState(day.isRestDay);
  const [muscles, setMuscles] = useState<MuscleGroup[]>([...day.muscleGroups]);
  const [exs, setExs] = useState<Exercise[]>(exercises.map((e) => ({ ...e })));
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>('胸');
  const [newSets, setNewSets] = useState(3);
  const [newReps, setNewReps] = useState(12);
  const [newRest, setNewRest] = useState(60);

  function addExercise() {
    if (!newName.trim()) return;
    setExs([...exs, {
      planDayId: day.id!,
      name: newName.trim(),
      muscleGroup: newMuscle,
      sets: newSets,
      reps: newReps,
      restSeconds: newRest,
      order: exs.length + 1,
    }]);
    setNewName('');
  }

  function removeExercise(idx: number) {
    setExs(exs.filter((_, i) => i !== idx));
  }

  function toggleMuscle(mg: MuscleGroup) {
    setMuscles((prev) => (prev.includes(mg) ? prev.filter((m) => m !== mg) : [...prev, mg]));
  }

  function handleSave() {
    onSave({ ...day, isRestDay: isRest, muscleGroups: isRest ? [] : muscles }, isRest ? [] : exs);
  }

  const dayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(10,22,40,0.95)' }}>
      <div className="w-full max-w-md mx-4 rounded-2xl p-6 max-h-[85vh] overflow-y-auto" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            第{day.week}周 {dayNames[day.dayOfWeek]}
          </h2>
          <button onClick={onClose} className="text-xl" style={{ color: 'var(--color-text-muted)' }}>✕</button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setIsRest(!isRest)} className="px-4 py-2 rounded-lg text-sm font-semibold flex-1"
            style={{ backgroundColor: isRest ? 'var(--color-rest)' : 'var(--color-primary)', color: isRest ? '#fff' : '#000' }}>
            {isRest ? '休息日' : '训练日'}
          </button>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>点击切换</span>
        </div>

        {!isRest && (
          <>
            <label className="text-xs mb-2 block" style={{ color: 'var(--color-text-muted)' }}>肌群</label>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {MUSCLE_GROUPS.map((mg) => (
                <button key={mg} onClick={() => toggleMuscle(mg)} className="px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: muscles.includes(mg) ? MUSCLE_GROUP_COLORS[mg] : 'transparent',
                    color: muscles.includes(mg) ? '#000' : 'var(--color-text-muted)',
                    border: muscles.includes(mg) ? 'none' : '1px solid var(--color-border)',
                  }}>
                  {mg}
                </button>
              ))}
            </div>

            <label className="text-xs mb-2 block" style={{ color: 'var(--color-text-muted)' }}>训练动作</label>
            <div className="flex flex-col gap-2 mb-4">
              {exs.map((ex, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--color-card)' }}>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{ex.name}</span>
                    <span className="ml-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{ex.sets}×{ex.reps} · {ex.restSeconds}s</span>
                  </div>
                  <button onClick={() => removeExercise(idx)} className="ml-2 text-sm hover:opacity-70" style={{ color: 'var(--color-text-muted)' }}>×</button>
                </div>
              ))}
            </div>

            <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: 'var(--color-card)' }}>
              <div className="grid grid-cols-4 gap-2 mb-2">
                <div className="col-span-2">
                  <input value={newName} onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-2 py-1.5 rounded text-xs border outline-none"
                    style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} placeholder="动作名称" />
                </div>
                <div>
                  <select value={newMuscle} onChange={(e) => setNewMuscle(e.target.value as MuscleGroup)}
                    className="w-full px-1 py-1.5 rounded text-xs border outline-none"
                    style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                    {MUSCLE_GROUPS.map((mg) => (<option key={mg} value={mg}>{mg}</option>))}
                  </select>
                </div>
                <div />
              </div>
              <div className="grid grid-cols-4 gap-2 mb-2">
                <input type="number" min={1} value={newSets} onChange={(e) => setNewSets(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded text-xs border outline-none"
                  style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} placeholder="组数" />
                <input type="number" min={1} value={newReps} onChange={(e) => setNewReps(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded text-xs border outline-none"
                  style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} placeholder="次数" />
                <input type="number" min={0} value={newRest} onChange={(e) => setNewRest(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded text-xs border outline-none"
                  style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} placeholder="休息(秒)" />
                <button onClick={addExercise} className="px-2 py-1.5 rounded text-xs font-semibold"
                  style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}>添加</button>
              </div>
            </div>
          </>
        )}

        <button onClick={handleSave} className="w-full py-2.5 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}>保存</button>
      </div>
    </div>
  );
}

// --- Monthly Calendar Grid ---

interface CalendarGridProps {
  days: PlanDay[];
  completedDayIds: Set<number>;
  onEditDay: (day: PlanDay) => void;
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export default function CalendarGrid({ days, completedDayIds, onEditDay }: CalendarGridProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  // Map plan days to real dates: week 1 starts at first Monday of view month
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const firstMonday = new Date(firstOfMonth);
  // Find the Monday of the week containing the 1st
  const dayOfFirst = firstOfMonth.getDay();
  firstMonday.setDate(1 - (dayOfFirst === 0 ? 6 : dayOfFirst - 1));

  // Build date → planDay map
  const dateMap = new Map<string, PlanDay>();
  for (const day of days) {
    const d = new Date(firstMonday);
    d.setDate(d.getDate() + (day.week - 1) * 7 + (day.dayOfWeek - 1));
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    dateMap.set(key, day);
  }

  // Build 6-row calendar
  const startDate = new Date(firstMonday);
  startDate.setDate(startDate.getDate() - (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1)); // Go to Monday
  if (startDate.getMonth() === viewMonth && startDate.getDate() > 1) {
    startDate.setDate(startDate.getDate() - 7);
  }

  const todayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  const rows: Date[][] = [];
  for (let r = 0; r < 6; r++) {
    const row: Date[] = [];
    for (let c = 0; c < 7; c++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + r * 7 + c);
      row.push(d);
    }
    rows.push(row);
  }

  function prevMonth() { setViewMonth(viewMonth === 0 ? 11 : viewMonth - 1); if (viewMonth === 0) setViewYear(viewYear - 1); }
  function nextMonth() { setViewMonth(viewMonth === 11 ? 0 : viewMonth + 1); if (viewMonth === 11) setViewYear(viewYear + 1); }

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-card)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <button onClick={prevMonth} className="px-2 py-1 rounded text-sm" style={{ color: 'var(--color-text-muted)' }}>←</button>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{viewYear}年 {MONTHS[viewMonth]}</span>
        <button onClick={nextMonth} className="px-2 py-1 rounded text-sm" style={{ color: 'var(--color-text-muted)' }}>→</button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {WEEKDAYS.map((w) => (
          <div key={w} className="p-2 text-center text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>{w}</div>
        ))}
      </div>

      {/* Calendar grid */}
      {rows.map((row, ri) => (
        <div key={ri} className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--color-border)' }}>
          {row.map((date, ci) => {
            const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            const day = dateMap.get(key);
            const isToday = key === todayStr;
            const inMonth = date.getMonth() === viewMonth;

            if (!day) {
              return (
                <div key={ci} className="p-1 min-h-[68px]"
                  style={{ opacity: inMonth ? 0.3 : 0.15, backgroundColor: 'var(--color-sidebar)' }}>
                  <div className="text-[10px] p-0.5" style={{ color: 'var(--color-text-muted)' }}>{date.getDate()}</div>
                </div>
              );
            }

            const completed = completedDayIds.has(day.id!);
            const mainMuscle = day.muscleGroups[0];
            const bgColor = mainMuscle ? MUSCLE_GROUP_COLORS[mainMuscle] : undefined;

            return (
              <button key={ci} onClick={() => onEditDay(day)}
                className="p-1 text-left min-h-[68px] transition-colors hover:brightness-110 relative"
                style={{
                  backgroundColor: day.isRestDay ? 'var(--color-sidebar)'
                    : completed && bgColor ? bgColor : (inMonth ? 'transparent' : 'var(--color-sidebar)'),
                  opacity: day.isRestDay ? 0.4 : 1,
                  border: isToday ? '1px solid var(--color-primary)' : 'none',
                }}>
                <div className="text-[10px] p-0.5 font-semibold"
                  style={{ color: isToday ? 'var(--color-primary)' : completed ? '#000' : 'var(--color-text-muted)' }}>
                  {date.getDate()}
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

      {/* Legend */}
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
