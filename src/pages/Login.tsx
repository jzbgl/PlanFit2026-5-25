import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getAllUsers, createUser } from '../db/database';
import type { User, Goal } from '../types';
import { GOAL_OPTIONS } from '../types';

export default function Login() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', height: '', weight: '', goal: '增肌' as Goal });

  useEffect(() => {
    getAllUsers().then((u) => {
      setUsers(u);
      if (u.length === 0) setShowCreate(true);
    });
  }, []);

  async function handleLogin(user: User) {
    dispatch({ type: 'SET_USER', user });
    navigate('/today');
  }

  async function handleCreate() {
    const h = parseFloat(form.height);
    const w = parseFloat(form.weight);
    if (!form.name.trim() || isNaN(h) || isNaN(w)) return;

    const id = await createUser({
      name: form.name.trim(),
      avatar: '💪',
      height: h,
      weight: w,
      goal: form.goal,
      createdAt: Date.now(),
    });
    const user: User = { id, name: form.name.trim(), avatar: '💪', height: h, weight: w, goal: form.goal, createdAt: Date.now() };
    dispatch({ type: 'SET_USER', user });
    navigate('/today');
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2" style={{ color: 'var(--color-primary)' }}>
          PlanFit
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: 'var(--color-text-muted)' }}>
          选择用户登录
        </p>

        {!showCreate && (
          <>
            <div className="flex flex-col gap-3 mb-6">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleLogin(u)}
                  className="flex items-center gap-3 p-4 rounded-xl text-left transition-colors hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-card)' }}
                >
                  <div
                    className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary), #00c853)' }}
                  >
                    {u.avatar || '💪'}
                  </div>
                  <div>
                    <div className="text-[var(--color-text)] font-semibold">{u.name}</div>
                    <div className="text-[var(--color-text-muted)] text-xs">
                      {u.height}cm · {u.weight}kg · {u.goal}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCreate(true)}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
              style={{ border: '2px dashed var(--color-primary)', color: 'var(--color-primary)' }}
            >
              + 新建用户
            </button>
          </>
        )}

        {showCreate && (
          <div>
            <h2 className="text-lg font-bold mb-5" style={{ color: 'var(--color-text)' }}>
              新建用户
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>姓名</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none focus:border-[var(--color-primary)]"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  placeholder="请输入姓名"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>身高 (cm)</label>
                  <input
                    type="number"
                    value={form.height}
                    onChange={(e) => setForm({ ...form, height: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    placeholder="170"
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>体重 (kg)</label>
                  <input
                    type="number"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    placeholder="65"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>健身目标</label>
                <select
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value as Goal })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                >
                  {GOAL_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 mt-2">
                {users.length > 0 && (
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 py-2.5 rounded-lg text-sm"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
                  >
                    返回
                  </button>
                )}
                <button
                  onClick={handleCreate}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}
                >
                  创建并登录
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
