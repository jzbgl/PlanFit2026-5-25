import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WeeklyChartProps {
  data: { week: string; count: number }[];
}

export default function WeeklyChart({ data }: WeeklyChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        暂无训练数据，开始你的第一次训练吧
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--color-card)' }}>
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
        每周训练次数趋势
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00E676" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#00E676" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
          <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f3460',
              border: '1px solid #1e3a5f',
              borderRadius: '8px',
              color: '#e2e8f0',
            }}
          />
          <Area type="monotone" dataKey="count" stroke="#00E676" strokeWidth={2} fill="url(#colorCount)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
