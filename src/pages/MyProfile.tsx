import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { updateUser, getBodyLogs, createBodyLog, deleteBodyLog } from '../db/database';
import type { Goal, Achievement, BodyLog } from '../types';
import { GOAL_OPTIONS } from '../types';
import { checkAchievements } from '../utils/achievements';
import * as api from '../api/community';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AVATAR_OPTIONS = ['💪', '🏋️', '🏃', '🧘', '🤸', '🚴', '⚡', '🔥'];

export default function MyProfile() {
  const { state, dispatch } = useApp();
  const user = state.currentUser;
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    height: String(user?.height || ''),
    weight: String(user?.weight || ''),
    goal: (user?.goal || '增肌') as Goal,
  });
  const [avatar, setAvatar] = useState(user?.avatar || '💪');
  const [favPosts, setFavPosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const [showSection, setShowSection] = useState<'favs' | 'liked' | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    if (!user) return;
    checkAchievements(user.id!).then(setAchievements).catch(() => {});
  }, [user]);
  const [showBody, setShowBody] = useState(false);
  const [bodyLogs, setBodyLogs] = useState<BodyLog[]>([]);

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  const [bodyForm, setBodyForm] = useState({
    date: todayStr(),
    weight: '',
    bodyFat: '',
    chest: '',
    waist: '',
    hips: '',
    arm: '',
    thigh: '',
  });

  useEffect(() => {
    if (!user) return;
    api.forumAuth(user.id!, user.name, user.avatar).then((auth: any) => {
      if (!auth?.forumUserId) return;
      api.getFavorites(auth.forumUserId).then((ids: number[]) => {
        if (!ids?.length) return;
        api.getPosts().then((posts: any[]) => {
          setFavPosts(posts.filter((p: any) => ids.includes(p.id)));
        });
      });
      api.getUserLiked(auth.forumUserId).then((ids: number[]) => {
        if (!ids?.length) return;
        api.getPosts().then((posts: any[]) => {
          setLikedPosts(posts.filter((p: any) => ids.includes(p.id)));
        });
      });
    });

    getBodyLogs(user.id!).then(setBodyLogs);
  }, [user]);

  if (!user) return null;

  async function handleSave() {
    if (!user) return;
    const h = parseFloat(form.height);
    const w = parseFloat(form.weight);
    if (!form.name.trim() || isNaN(h) || isNaN(w)) return;

    await updateUser(user.id!, {
      name: form.name.trim(),
      height: h,
      weight: w,
      goal: form.goal,
      avatar,
    });

    dispatch({
      type: 'SET_USER',
      user: { id: user.id, name: form.name.trim(), height: h, weight: w, goal: form.goal, avatar, createdAt: user.createdAt },
    });
    setEditing(false);
  }

  async function handleAddBodyLog() {
    if (!user) return;
    const w = parseFloat(bodyForm.weight);
    if (!bodyForm.date || isNaN(w)) return;

    const log: Omit<BodyLog, 'id'> = {
      userId: user.id!,
      date: bodyForm.date,
      weight: w,
      bodyFat: bodyForm.bodyFat ? parseFloat(bodyForm.bodyFat) : undefined,
      chest: bodyForm.chest ? parseFloat(bodyForm.chest) : undefined,
      waist: bodyForm.waist ? parseFloat(bodyForm.waist) : undefined,
      hips: bodyForm.hips ? parseFloat(bodyForm.hips) : undefined,
      arm: bodyForm.arm ? parseFloat(bodyForm.arm) : undefined,
      thigh: bodyForm.thigh ? parseFloat(bodyForm.thigh) : undefined,
    };

    await createBodyLog(log);
    const updated = await getBodyLogs(user.id!);
    setBodyLogs(updated);
    setBodyForm({ date: todayStr(), weight: '', bodyFat: '', chest: '', waist: '', hips: '', arm: '', thigh: '' });
  }

  async function handleDeleteBodyLog(id: number) {
    if (!user) return;
    await deleteBodyLog(id);
    const updated = await getBodyLogs(user.id!);
    setBodyLogs(updated);
  }

  function handleLogout() {
    dispatch({ type: 'LOGOUT' });
    navigate('/login');
  }

  return (
    <div className="max-w-md mx-auto">
      {!editing ? (
        <>
          {/* View mode header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
              我的
            </h1>
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-1.5 rounded-full text-sm transition-opacity hover:opacity-90"
              style={{ border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}
            >
              编辑
            </button>
          </div>

          {/* Avatar + name */}
          <div className="flex flex-col items-center py-6 gap-2">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), #00c853)' }}
            >
              {user.avatar || '💪'}
            </div>
            <div className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
              {user.name}
            </div>
            <div className="text-sm" style={{ color: 'var(--color-primary)' }}>
              {user.goal} · {state.plans.length > 0 ? '进行中' : '未开始'}
            </div>
          </div>

          {/* Info card */}
          <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: 'var(--color-card)' }}>
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>身高</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{user.height} cm</span>
            </div>
            <div className="border-t" style={{ borderColor: 'var(--color-border)' }} />
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>体重</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                {bodyLogs.length > 0 ? `${bodyLogs[0].weight} kg` : `${user.weight} kg`}
              </span>
            </div>
            <div className="border-t" style={{ borderColor: 'var(--color-border)' }} />
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>健身目标</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{user.goal}</span>
            </div>
          </div>

          {/* Body measurement section */}
          <div className="mt-4">
            <button
              onClick={() => setShowBody(!showBody)}
              className="w-full py-2.5 rounded-lg text-sm text-center"
              style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}
            >
              📊 身体数据 ({bodyLogs.length})
            </button>

            {showBody && (
              <div className="mt-3 flex flex-col gap-3">
                {/* Add form */}
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-card)' }}>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>记录身体数据</h3>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={bodyForm.date}
                        onChange={(e) => setBodyForm({ ...bodyForm, date: e.target.value })}
                        className="flex-1 px-2 py-2 rounded-lg text-xs border outline-none"
                        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                      <input
                        type="number"
                        placeholder="体重 (kg)*"
                        value={bodyForm.weight}
                        onChange={(e) => setBodyForm({ ...bodyForm, weight: e.target.value })}
                        className="flex-1 px-2 py-2 rounded-lg text-xs border outline-none"
                        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        placeholder="体脂 (%)"
                        value={bodyForm.bodyFat}
                        onChange={(e) => setBodyForm({ ...bodyForm, bodyFat: e.target.value })}
                        className="w-full px-2 py-2 rounded-lg text-xs border outline-none"
                        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                      <input
                        type="number"
                        placeholder="胸围 (cm)"
                        value={bodyForm.chest}
                        onChange={(e) => setBodyForm({ ...bodyForm, chest: e.target.value })}
                        className="w-full px-2 py-2 rounded-lg text-xs border outline-none"
                        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                      <input
                        type="number"
                        placeholder="腰围 (cm)"
                        value={bodyForm.waist}
                        onChange={(e) => setBodyForm({ ...bodyForm, waist: e.target.value })}
                        className="w-full px-2 py-2 rounded-lg text-xs border outline-none"
                        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                      <input
                        type="number"
                        placeholder="臀围 (cm)"
                        value={bodyForm.hips}
                        onChange={(e) => setBodyForm({ ...bodyForm, hips: e.target.value })}
                        className="w-full px-2 py-2 rounded-lg text-xs border outline-none"
                        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                      <input
                        type="number"
                        placeholder="臂围 (cm)"
                        value={bodyForm.arm}
                        onChange={(e) => setBodyForm({ ...bodyForm, arm: e.target.value })}
                        className="w-full px-2 py-2 rounded-lg text-xs border outline-none"
                        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                      <input
                        type="number"
                        placeholder="腿围 (cm)"
                        value={bodyForm.thigh}
                        onChange={(e) => setBodyForm({ ...bodyForm, thigh: e.target.value })}
                        className="w-full px-2 py-2 rounded-lg text-xs border outline-none"
                        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                    </div>
                    <button
                      onClick={handleAddBodyLog}
                      className="w-full py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
                      style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}
                    >
                      记录
                    </button>
                  </div>
                </div>

                {/* Weight chart */}
                {bodyLogs.length >= 2 && (
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-card)' }}>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>体重趋势</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart
                        data={bodyLogs.slice(0, 30).reverse().map(l => ({ date: l.date, weight: l.weight }))}
                        margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#00E676" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#00E676" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                        <YAxis stroke="#64748b" fontSize={10} domain={['dataMin - 1', 'dataMax + 1']} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f3460',
                            border: '1px solid #1e3a5f',
                            borderRadius: '8px',
                            color: '#e2e8f0',
                            fontSize: '12px',
                          }}
                        />
                        <Area type="monotone" dataKey="weight" stroke="#00E676" strokeWidth={2} fill="url(#colorWeight)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* History list */}
                {bodyLogs.length > 0 && (
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-card)' }}>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>历史记录</h3>
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                      {bodyLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-2 rounded-lg"
                          style={{ backgroundColor: 'var(--color-bg)' }}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs" style={{ color: 'var(--color-text)' }}>{log.date}</span>
                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              体重: {log.weight}kg
                              {log.bodyFat != null ? ` · 体脂: ${log.bodyFat}%` : ''}
                              {log.chest != null ? ` · 胸: ${log.chest}cm` : ''}
                              {log.waist != null ? ` · 腰: ${log.waist}cm` : ''}
                              {log.hips != null ? ` · 臀: ${log.hips}cm` : ''}
                              {log.arm != null ? ` · 臂: ${log.arm}cm` : ''}
                              {log.thigh != null ? ` · 腿: ${log.thigh}cm` : ''}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteBodyLog(log.id!)}
                            className="text-xs px-2 py-1 rounded transition-opacity hover:opacity-80"
                            style={{ color: '#ef4444' }}
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Achievements */}
          <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: 'var(--color-card)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>🏅 成就</span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                已解锁 {achievements.filter(a => a.unlockedAt).length}/{achievements.length}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {achievements.map(a => (
                <div
                  key={a.id}
                  className="flex flex-col items-center justify-center p-2 rounded-lg text-center"
                  style={{
                    backgroundColor: a.unlockedAt ? 'var(--color-bg)' : 'transparent',
                    opacity: a.unlockedAt ? 1 : 0.4,
                    border: a.unlockedAt ? '1px solid var(--color-primary)' : '1px dashed var(--color-border)',
                  }}
                >
                  <span className="text-xl mb-1">{a.unlockedAt ? a.icon : '🔒'}</span>
                  <span className="text-xs" style={{ color: a.unlockedAt ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                    {a.name.length > 3 ? a.name.substring(0, 3) : a.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Favorites + Likes */}
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex gap-2">
              <button onClick={() => setShowSection(showSection === 'favs' ? null : 'favs')}
                className="flex-1 py-2.5 rounded-lg text-sm text-center"
                style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                ⭐ 收藏 ({favPosts.length})
              </button>
              <button onClick={() => setShowSection(showSection === 'liked' ? null : 'liked')}
                className="flex-1 py-2.5 rounded-lg text-sm text-center"
                style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
                ❤️ 点赞 ({likedPosts.length})
              </button>
            </div>

            {showSection === 'favs' && (
              <div className="rounded-xl p-3 flex flex-col gap-2 max-h-80 overflow-y-auto" style={{ backgroundColor: 'var(--color-card)' }}>
                {favPosts.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-muted)' }}>暂无收藏</p>
                ) : (
                  favPosts.map((p: any) => (
                    <div key={p.id}
                      onClick={() => navigate(`${p.category?.startsWith('教学_') ? '/teaching' : '/community'}?highlight=${p.id}`)}
                      className="p-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: 'var(--color-bg)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                          style={{ background: 'linear-gradient(135deg, var(--color-primary), #00c853)', color: '#000' }}>
                          {p.avatar || '💪'}
                        </div>
                        <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{p.name || '匿名'}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: 'var(--color-primary)', backgroundColor: 'var(--color-sidebar)' }}>
                          {p.category?.replace('教学_', '教学·') || '社区'}
                        </span>
                      </div>
                      <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                        {p.content?.replace(/\[VIDEO:.*?\]/, '[视频]').substring(0, 80)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {showSection === 'liked' && (
              <div className="rounded-xl p-3 flex flex-col gap-2 max-h-80 overflow-y-auto" style={{ backgroundColor: 'var(--color-card)' }}>
                {likedPosts.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-muted)' }}>暂无点赞</p>
                ) : (
                  likedPosts.map((p: any) => (
                    <div key={p.id}
                      onClick={() => navigate(`${p.category?.startsWith('教学_') ? '/teaching' : '/community'}?highlight=${p.id}`)}
                      className="p-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: 'var(--color-bg)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                          style={{ background: 'linear-gradient(135deg, var(--color-primary), #00c853)', color: '#000' }}>
                          {p.avatar || '💪'}
                        </div>
                        <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{p.name || '匿名'}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: 'var(--color-primary)', backgroundColor: 'var(--color-sidebar)' }}>
                          {p.category?.replace('教学_', '教学·') || '社区'}
                        </span>
                      </div>
                      <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                        {p.content?.replace(/\[VIDEO:.*?\]/, '[视频]').substring(0, 80)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Switch user */}
          <button
            onClick={handleLogout}
            className="w-full mt-4 p-4 rounded-xl flex items-center justify-between transition-colors hover:opacity-90"
            style={{ backgroundColor: 'var(--color-card)' }}
          >
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>切换用户</span>
            <span style={{ color: 'var(--color-primary)' }}>→</span>
          </button>
        </>
      ) : (
        <>
          {/* Edit mode header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
              编辑资料
            </h1>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}
            >
              保存
            </button>
          </div>

          {/* Avatar picker */}
          <div className="flex flex-col items-center py-4 gap-2">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), #00c853)' }}
            >
              {avatar}
            </div>
            <div className="flex gap-2 flex-wrap justify-center mt-2">
              {AVATAR_OPTIONS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: a === avatar ? 'var(--color-primary)' : 'var(--color-card)',
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Edit form */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>姓名</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
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
          </div>
        </>
      )}
    </div>
  );
}
