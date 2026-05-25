import type { PlanDay } from '../types';
import { MUSCLE_GROUP_COLORS } from '../types';

interface CalendarGridProps {
  days: PlanDay[];
  week: number;
  completedDayIds: Set<number>;
}

const DAY_LABELS = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export default function CalendarGrid({ days, week, completedDayIds }: CalendarGridProps) {
  const weekDays = days.filter((d) => d.week === week).sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-card)' }}>
      {/* Header */}
      <div
        className="grid grid-cols-[80px_repeat(7,1fr)] border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="p-2.5 text-center" />
        {DAY_LABELS.map((label) =>
          label ? (
            <div
              key={label}
              className="p-2.5 text-center text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {label}
            </div>
          ) : null
        )}
      </div>

      {/* Week row */}
      <div
        className="grid grid-cols-[80px_repeat(7,1fr)] border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div
          className="p-2.5 text-center text-xs font-semibold"
          style={{ color: 'var(--color-primary)' }}
        >
          第{week}周
        </div>
        {[1, 2, 3, 4, 5, 6, 7].map((dow) => {
          const day = weekDays.find((d) => d.dayOfWeek === dow);
          if (!day) {
            return <div key={dow} className="p-2.5" />;
          }
          if (day.isRestDay) {
            return (
              <div key={dow} className="p-2.5 text-center">
                <div
                  className="rounded-lg py-2 px-1 text-xs"
                  style={{ backgroundColor: 'var(--color-sidebar)', color: 'var(--color-rest)' }}
                >
                  休息日
                </div>
              </div>
            );
          }
          const completed = completedDayIds.has(day.id!);
          const mainMuscle = day.muscleGroups[0] || '胸';
          const bgColor = MUSCLE_GROUP_COLORS[mainMuscle] || 'var(--color-primary)';
          return (
            <div key={dow} className="p-2.5 text-center">
              <div
                className="rounded-lg py-2 px-1 text-xs font-semibold"
                style={
                  completed
                    ? { backgroundColor: bgColor, color: mainMuscle === '胸' || mainMuscle === '肩' || mainMuscle === '减脂' ? '#000' : '#fff' }
                    : {
                        backgroundColor: 'var(--color-sidebar)',
                        color: 'var(--color-text-muted)',
                        border: '1px dashed var(--color-text-muted)',
                      }
                }
              >
                {day.muscleGroups.join('+')}
                {completed && <span className="block text-[10px] opacity-70 mt-0.5">✓ 完成</span>}
                {!completed && <span className="block text-[10px] opacity-70 mt-0.5">待完成</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-3">
        {Object.entries(MUSCLE_GROUP_COLORS).map(([group, color]) => (
          <div key={group} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            {group}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <div className="w-3 h-3 rounded-sm" style={{ border: '1px dashed var(--color-text-muted)' }} />
          待完成
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--color-sidebar)' }} />
          休息
        </div>
      </div>
    </div>
  );
}
