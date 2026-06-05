import { type DragEvent } from 'react';
import type { Exercise } from '../types';
import { MUSCLE_GROUP_COLORS } from '../types';

interface ExerciseCardProps {
  exercise: Exercise;
  completed: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  onStartTimer?: () => void;
  index: number;
  onDragStart: (index: number) => void;
  onDragOver: (e: DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDropTarget: boolean;
}

export default function ExerciseCard({
  exercise, completed, onToggle, onDelete, onStartTimer,
  index, onDragStart, onDragOver, onDrop, onDragEnd,
  isDragging, isDropTarget,
}: ExerciseCardProps) {
  const muscleColor = MUSCLE_GROUP_COLORS[exercise.muscleGroup];

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={() => onDrop(index)}
      onDragEnd={onDragEnd}
      className="flex items-center justify-between p-4 rounded-xl transition-all cursor-grab active:cursor-grabbing"
      style={{
        backgroundColor: 'var(--color-card)',
        opacity: isDragging ? 0.4 : completed ? 0.5 : 1,
        borderTop: isDropTarget ? '2px solid var(--color-primary)' : '2px solid transparent',
      }}
    >
      {/* Drag handle */}
      <div
        className="mr-2 flex-shrink-0 cursor-grab active:cursor-grabbing select-none"
        style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: 1 }}
      >
        ⋮⋮
      </div>

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

      {/* Timer & Delete buttons */}
      <div className="flex items-center gap-1 ml-3 flex-shrink-0">
        {onStartTimer && (
          <button
            onClick={onStartTimer}
            className="w-6 h-6 rounded flex items-center justify-center text-sm transition-opacity hover:opacity-80"
            title="休息计时"
          >
            ⏱
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
