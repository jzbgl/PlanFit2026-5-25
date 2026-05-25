import type { Exercise } from '../types';
import { MUSCLE_GROUP_COLORS } from '../types';

interface ExerciseCardProps {
  exercise: Exercise;
  completed: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function ExerciseCard({ exercise, completed, onToggle, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: ExerciseCardProps) {
  const muscleColor = MUSCLE_GROUP_COLORS[exercise.muscleGroup];

  return (
    <div
      className="flex items-center justify-between p-4 rounded-xl transition-opacity group"
      style={{
        backgroundColor: 'var(--color-card)',
        opacity: completed ? 0.5 : 1,
      }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onToggle}
          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
          style={{
            border: completed ? 'none' : '2px solid var(--color-border)',
            backgroundColor: completed ? 'var(--color-primary)' : 'transparent',
          }}
        >
          {completed && <span className="text-black text-xs font-bold">✓</span>}
        </button>
        <div className="min-w-0">
          <div
            className="font-semibold text-sm truncate"
            style={{
              color: 'var(--color-text)',
              textDecoration: completed ? 'line-through' : 'none',
            }}
          >
            {exercise.name}
          </div>
          <div className="flex gap-3 mt-1">
            <span className="text-xs font-medium" style={{ color: muscleColor }}>
              {exercise.muscleGroup}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {exercise.sets}组
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {exercise.reps}次
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              休息{exercise.restSeconds}s
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 ml-3 flex-shrink-0">
        {onMoveUp && (
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="w-6 h-6 rounded flex items-center justify-center text-xs transition-opacity"
            style={{
              color: isFirst ? 'var(--color-rest)' : 'var(--color-text-muted)',
              opacity: isFirst ? 0.3 : 0.6,
            }}
            title="上移"
          >
            ↑
          </button>
        )}
        {onMoveDown && (
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="w-6 h-6 rounded flex items-center justify-center text-xs transition-opacity"
            style={{
              color: isLast ? 'var(--color-rest)' : 'var(--color-text-muted)',
              opacity: isLast ? 0.3 : 0.6,
            }}
            title="下移"
          >
            ↓
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="w-6 h-6 rounded flex items-center justify-center text-sm transition-opacity hover:opacity-80"
            style={{ color: '#ef4444' }}
            title="删除"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
