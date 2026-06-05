import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getRandomMotivation } from '../data/motivations';
import { useMemo } from 'react';

const NAV_ITEMS = [
  { to: '/today', icon: '📋', label: '今日计划' },
  { to: '/overview', icon: '📅', label: '计划概览' },
  { to: '/records', icon: '📊', label: '训练记录' },
  { to: '/community', icon: '💬', label: '社区' },
  { to: '/profile', icon: '👤', label: '我的' },
];

export default function Sidebar() {
  const { state } = useApp();
  const user = state.currentUser;
  const motivation = useMemo(() => getRandomMotivation(), []);

  const baseLinkClasses =
    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors';
  const activeClasses = 'bg-[var(--color-primary)] text-black font-semibold';
  const inactiveClasses = 'text-[var(--color-text-muted)] hover:bg-[var(--color-card)]';

  return (
    <aside
      className="w-[240px] flex-shrink-0 flex flex-col h-screen py-5 px-4"
      style={{ backgroundColor: 'var(--color-sidebar)' }}
    >
      {/* User info */}
      <div className="flex items-center gap-3 mb-7">
        <div
          className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--color-primary), #00c853)' }}
        >
          {user?.avatar || '💪'}
        </div>
        <div className="min-w-0">
          <div className="text-[var(--color-text)] font-semibold text-sm truncate">
            {user?.name || '未登录'}
          </div>
          <div className="text-[var(--color-text-muted)] text-xs">
            {user?.goal || ''} {state.plans.length > 0 ? '· 进行中' : ''}
          </div>
        </div>
      </div>

      <div className="border-t mb-4" style={{ borderColor: 'var(--color-border)' }} />

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `${baseLinkClasses} ${isActive ? activeClasses : inactiveClasses}`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Daily motivation */}
      <div className="mt-auto pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="text-[var(--color-primary)] text-[10px] mb-1">💬 每日格言</div>
        <p className="text-[var(--color-text-muted)] text-xs leading-relaxed italic">
          "{motivation}"
        </p>
      </div>
    </aside>
  );
}
