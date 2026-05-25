// src/components/Celebration.tsx

interface CelebrationProps {
  exerciseCount: number;
  streakDays: number;
  totalSets: number;
  onClose: () => void;
}

function RingStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="w-[70px] h-[70px] rounded-full flex items-center justify-center mb-2"
        style={{ border: '3px solid var(--color-primary)' }}
      >
        <span className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
          {value}
        </span>
      </div>
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
    </div>
  );
}

export default function Celebration({ exerciseCount, streakDays, totalSets, onClose }: CelebrationProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(10,22,40,0.95)' }}>
      <div className="flex flex-col items-center text-center px-8">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
          训练完成!
        </h2>
        <p className="text-base mb-8" style={{ color: 'var(--color-text-muted)' }}>
          今天所有动作都已完成
        </p>

        <div className="flex gap-6 mb-8">
          <RingStat value={exerciseCount} label="动作完成" />
          <RingStat value={streakDays} label="连续天数" />
          <RingStat value={totalSets} label="总组数" />
        </div>

        <button
          onClick={onClose}
          className="px-10 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}
        >
          返回
        </button>
      </div>
    </div>
  );
}
