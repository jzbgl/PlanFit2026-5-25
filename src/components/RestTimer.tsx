import { useState, useEffect, useRef, useCallback } from 'react';

interface RestTimerProps {
  exerciseName: string;
  restSeconds: number;
  onComplete: () => void;
  onClose: () => void;
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.value = 0.3;
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, 200);
  } catch {}
}

export default function RestTimer({ exerciseName, restSeconds, onComplete, onClose }: RestTimerProps) {
  const [remaining, setRemaining] = useState(restSeconds);
  const [running, setRunning] = useState(true);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => {
    if (!running || done) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearTimer();
          setDone(true);
          onComplete();
          for (let i = 0; i < 3; i++) setTimeout(playBeep, i * 400);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [running, done, onComplete, clearTimer]);

  const pct = ((restSeconds - remaining) / restSeconds) * 100;
  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;

  return (
    <div className="fixed bottom-0 left-[240px] right-0 z-40 p-3" style={{ backgroundColor: 'var(--color-bg)', borderTop: '1px solid var(--color-border)' }}>
      <div className="max-w-2xl mx-auto flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-xs mb-1 truncate" style={{ color: 'var(--color-text-muted)' }}>
            休息计时 · {exerciseName}
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-card)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{
              width: `${pct}%`,
              backgroundColor: 'var(--color-primary)',
              opacity: done ? 1 : 0.8,
            }} />
          </div>
          <div className="text-2xl font-bold mt-1" style={{ color: done ? 'var(--color-primary)' : 'var(--color-text)' }}>
            {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
          </div>
        </div>
        <div className="flex gap-2">
          {!done && (
            <button onClick={() => setRunning(!running)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
              {running ? '⏸' : '▶'}
            </button>
          )}
          <button onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{ color: 'var(--color-text-muted)' }}>
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
