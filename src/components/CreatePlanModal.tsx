import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { createPlan, createPlanDay, bulkCreateExercises } from '../db/database';
import type { MuscleGroup } from '../types';
import { MUSCLE_GROUPS } from '../types';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

interface DayConfig {
  isRest: boolean;
  muscles: MuscleGroup[];
  exercises: { name: string; sets: number; reps: number; restSeconds: number }[];
}

export default function CreatePlanModal({ onClose, onCreated }: Props) {
  const { state } = useApp();
  const [planName, setPlanName] = useState('我的训练计划');
  const [step, setStep] = useState<'name' | 'days'>('name');
  const [currentWeek, setCurrentWeek] = useState(0);
  const [weeks, setWeeks] = useState<DayConfig[][]>(
    Array.from({ length: 4 }, () =>
      Array.from({ length: 7 }, (): DayConfig => ({
        isRest: false,
        muscles: [],
        exercises: [],
      }))
    )
  );

  function toggleDay(week: number, dayIdx: number) {
    const newWeeks = weeks.map((w, wi) =>
      wi === week ? w.map((d, di) => (di === dayIdx ? { ...d, isRest: !d.isRest } : d)) : w
    );
    setWeeks(newWeeks);
  }

  function toggleMuscle(week: number, dayIdx: number, muscle: MuscleGroup) {
    const newWeeks = weeks.map((w, wi) =>
      wi === week
        ? w.map((d, di) => {
            if (di !== dayIdx) return d;
            const hasIt = d.muscles.includes(muscle);
            return {
              ...d,
              muscles: hasIt ? d.muscles.filter((m) => m !== muscle) : [...d.muscles, muscle],
            };
          })
        : w
    );
    setWeeks(newWeeks);
  }

  async function handleCreate() {
    if (!planName.trim() || !state.currentUser?.id) return;

    const planId = await createPlan({
      userId: state.currentUser.id,
      name: planName.trim(),
      weeks: 4,
      createdAt: Date.now(),
    });

    for (let w = 0; w < weeks.length; w++) {
      for (let d = 0; d < weeks[w].length; d++) {
        const dayCfg = weeks[w][d];
        const dayId = await createPlanDay({
          planId,
          week: w + 1,
          dayOfWeek: d + 1,
          isRestDay: dayCfg.isRest,
          muscleGroups: dayCfg.muscles,
        });

        if (!dayCfg.isRest && dayCfg.exercises.length > 0) {
          await bulkCreateExercises(
            dayCfg.exercises.map((ex, idx) => ({
              planDayId: dayId,
              name: ex.name,
              muscleGroup: dayCfg.muscles[0] || '胸',
              sets: ex.sets,
              reps: ex.reps,
              restSeconds: ex.restSeconds,
              order: idx + 1,
            }))
          );
        }
      }
    }

    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(10,22,40,0.95)' }}>
      <div
        className="w-full max-w-lg mx-4 rounded-2xl p-6 max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>创建训练计划</h2>
          <button onClick={onClose} className="text-xl" style={{ color: 'var(--color-text-muted)' }}>✕</button>
        </div>

        {step === 'name' ? (
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>计划名称</label>
            <input
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none mb-4"
              style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              placeholder="例如：推拉腿计划"
            />

            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
              计划固定为 4 周。接下来可以设置每周的训练日安排。
            </p>

            <button
              onClick={() => setStep('days')}
              className="w-full py-2.5 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}
            >
              下一步：设置训练日
            </button>
          </div>
        ) : (
          <div>
            {/* Week selector */}
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4].map((w) => (
                <button
                  key={w}
                  onClick={() => setCurrentWeek(w - 1)}
                  className="px-3 py-1 rounded-md text-xs font-semibold"
                  style={{
                    backgroundColor: currentWeek === w - 1 ? 'var(--color-primary)' : 'var(--color-card)',
                    color: currentWeek === w - 1 ? '#000' : 'var(--color-text-muted)',
                  }}
                >
                  第{w}周
                </button>
              ))}
            </div>

            {/* Days */}
            <div className="flex flex-col gap-2 mb-4">
              {weeks[currentWeek].map((day, idx) => (
                <div
                  key={idx}
                  className="rounded-lg p-3"
                  style={{ backgroundColor: 'var(--color-card)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                      {DAY_LABELS[idx]}
                    </span>
                    <button
                      onClick={() => toggleDay(currentWeek, idx)}
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: day.isRest ? 'var(--color-rest)' : 'var(--color-primary)',
                        color: day.isRest ? '#fff' : '#000',
                      }}
                    >
                      {day.isRest ? '休息日' : '训练日'}
                    </button>
                  </div>

                  {!day.isRest && (
                    <div className="flex flex-wrap gap-1.5">
                      {MUSCLE_GROUPS.map((mg) => {
                        const selected = day.muscles.includes(mg);
                        return (
                          <button
                            key={mg}
                            onClick={() => toggleMuscle(currentWeek, idx, mg)}
                            className="px-2 py-0.5 rounded text-xs transition-colors"
                            style={{
                              backgroundColor: selected ? 'var(--color-primary)' : 'transparent',
                              color: selected ? '#000' : 'var(--color-text-muted)',
                              border: selected ? 'none' : '1px solid var(--color-border)',
                            }}
                          >
                            {mg}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Week nav */}
            <div className="flex gap-2 mb-4">
              {currentWeek > 0 && (
                <button
                  onClick={() => setCurrentWeek(currentWeek - 1)}
                  className="px-3 py-1 rounded text-xs" style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                >
                  ← 上一周
                </button>
              )}
              <div className="flex-1" />
              {currentWeek < 3 && (
                <button
                  onClick={() => setCurrentWeek(currentWeek + 1)}
                  className="px-3 py-1 rounded text-xs" style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                >
                  下一周 →
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep('name')}
                className="flex-1 py-2.5 rounded-lg text-sm"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                返回
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}
              >
                创建计划
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
