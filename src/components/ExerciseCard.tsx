import type { Exercise } from '../types';
import { MUSCLE_GROUP_COLORS } from '../types';

interface ExerciseCardProps {
  exercise: Exercise;
  completed: boolean;
  onToggle: () => void;
}

export default function ExerciseCard({ exercise, completed, onToggle }: ExerciseCardProps) {
  const muscleColor = MUSCLE_GROUP_COLORS[exercise.muscleGroup];

  return (
    <div
      className="flex items-center justify-between p-4 rounded-xl transition-opacity"
      style={{
        backgroundColor: 'var(--color-card)',
        opacity: completed ? 0.5 : 1,
      }}
    >
      <div className="flex items-center gap-3">
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
        <div>
          <div
            className="font-semibold text-sm"
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
    </div>
  );
}
