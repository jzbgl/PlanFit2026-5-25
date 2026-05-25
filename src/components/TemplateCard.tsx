import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getTemplatesByUser, createTemplate, deleteTemplate, updateTemplate } from '../db/database';
import type { WorkoutTemplate, MuscleGroup, Exercise } from '../types';
import { MUSCLE_GROUPS, MUSCLE_GROUP_COLORS } from '../types';

interface TemplateCardProps {
  templates: WorkoutTemplate[];
  todayMuscles: MuscleGroup[];
  onSelect: (tmpl: WorkoutTemplate) => void;
  onManage: () => void;
}

export function TemplateCards({ templates, todayMuscles, onSelect, onManage }: TemplateCardProps) {
  // Filter templates matching today's muscles (at least one match)
  const matching = templates.filter((t) =>
    t.muscleGroups.some((m) => todayMuscles.includes(m))
  );
  const others = templates.filter((t) => !matching.includes(t));

  const all = [...matching, ...others];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>📋 训练模板</h3>
        <button onClick={onManage} className="text-xs" style={{ color: 'var(--color-primary)' }}>管理</button>
      </div>

      {all.length === 0 ? (
        <p className="text-xs py-2" style={{ color: 'var(--color-text-muted)' }}>暂无模板，点击"管理"创建</p>
      ) : (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {all.map((tmpl) => {
          const isMatch = matching.includes(tmpl);
          return (
            <button
              key={tmpl.id}
              onClick={() => onSelect(tmpl)}
              className="flex-shrink-0 rounded-xl p-3 text-left min-w-[160px] transition-opacity hover:opacity-80"
              style={{
                backgroundColor: 'var(--color-card)',
                border: isMatch ? '1px solid var(--color-primary)' : '1px solid transparent',
                opacity: isMatch ? 1 : 0.5,
              }}
            >
              <div className="text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text)' }}>
                {isMatch && <span className="text-xs mr-1" style={{ color: 'var(--color-primary)' }}>★</span>}
                {tmpl.name}
              </div>
              <div className="flex flex-wrap gap-1 mb-1">
                {tmpl.muscleGroups.map((mg) => (
                  <span key={mg} className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                    style={{ backgroundColor: MUSCLE_GROUP_COLORS[mg], color: '#000' }}>{mg}</span>
                ))}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {tmpl.exercises.length}个动作
              </div>
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
}

// --- Template Manager Modal ---

interface ManagerProps {
  onClose: () => void;
  onRefresh: () => void;
}

const defaultExercises = [
  { name: '杠铃卧推', muscleGroup: '胸' as MuscleGroup, sets: 4, reps: 8, restSeconds: 90 },
  { name: '哑铃飞鸟', muscleGroup: '胸' as MuscleGroup, sets: 3, reps: 12, restSeconds: 60 },
  { name: '绳索下压', muscleGroup: '手臂' as MuscleGroup, sets: 3, reps: 15, restSeconds: 60 },
];

export function TemplateManager({ onClose, onRefresh }: ManagerProps) {
  const { state } = useApp();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [editing, setEditing] = useState<WorkoutTemplate | null>(null);
  const [name, setName] = useState('');
  const [muscles, setMuscles] = useState<MuscleGroup[]>(['胸']);
  const [exercises, setExercises] = useState(defaultExercises);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (state.currentUser?.id) getTemplatesByUser(state.currentUser.id).then(setTemplates);
  }, [state.currentUser?.id]);

  function openNew() {
    setEditing(null);
    setName('');
    setMuscles(['胸']);
    setExercises(defaultExercises.map((e) => ({ ...e })));
    setShowForm(true);
  }

  function openEdit(tmpl: WorkoutTemplate) {
    setEditing(tmpl);
    setName(tmpl.name);
    setMuscles([...tmpl.muscleGroups]);
    setExercises(tmpl.exercises.map((e) => ({ ...e })));
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim() || !state.currentUser?.id) return;
    const data = { userId: state.currentUser.id, name: name.trim(), muscleGroups: muscles, exercises };

    if (editing?.id) {
      await updateTemplate(editing.id, data);
    } else {
      await createTemplate(data);
    }
    setShowForm(false);
    const updated = await getTemplatesByUser(state.currentUser.id);
    setTemplates(updated);
    onRefresh();
  }

  async function handleDelete(id: number) {
    await deleteTemplate(id);
    const updated = await getTemplatesByUser(state.currentUser!.id!);
    setTemplates(updated);
    onRefresh();
  }

  function addExercise() {
    setExercises([...exercises, { name: '', muscleGroup: '胸' as MuscleGroup, sets: 3, reps: 12, restSeconds: 60 }]);
  }

  function updateEx(idx: number, field: string, value: any) {
    const updated = exercises.map((e, i) => (i === idx ? { ...e, [field]: value } : e));
    setExercises(updated);
  }

  function removeEx(idx: number) {
    setExercises(exercises.filter((_, i) => i !== idx));
  }

  function toggleMuscle(mg: MuscleGroup) {
    setMuscles((prev) => (prev.includes(mg) ? prev.filter((m) => m !== mg) : [...prev, mg]));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(10,22,40,0.95)' }}>
      <div className="w-full max-w-md mx-4 rounded-2xl p-6 max-h-[85vh] overflow-y-auto" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>管理训练模板</h2>
          <button onClick={onClose} className="text-xl" style={{ color: 'var(--color-text-muted)' }}>✕</button>
        </div>

        {!showForm ? (
          <>
            {templates.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>暂无模板</p>
            ) : (
              <div className="flex flex-col gap-2 mb-4">
                {templates.map((tmpl) => (
                  <div key={tmpl.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--color-card)' }}>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{tmpl.name}</div>
                      <div className="flex gap-1 mt-1">
                        {tmpl.muscleGroups.map((mg) => (
                          <span key={mg} className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                            style={{ backgroundColor: MUSCLE_GROUP_COLORS[mg], color: '#000' }}>{mg}</span>
                        ))}
                        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>· {tmpl.exercises.length}动作</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(tmpl)} className="text-xs px-2 py-1 rounded"
                        style={{ color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}>编辑</button>
                      <button onClick={() => handleDelete(tmpl.id!)} className="text-xs px-2 py-1 rounded"
                        style={{ color: '#ef4444' }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={openNew} className="w-full py-2.5 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}>+ 新建模板</button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3 mb-4">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>模板名称</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  placeholder="例如：胸+三头常规" />
              </div>

              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>肌群</label>
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLE_GROUPS.map((mg) => (
                    <button key={mg} onClick={() => toggleMuscle(mg)} className="px-2 py-0.5 rounded text-xs"
                      style={{
                        backgroundColor: muscles.includes(mg) ? MUSCLE_GROUP_COLORS[mg] : 'transparent',
                        color: muscles.includes(mg) ? '#000' : 'var(--color-text-muted)',
                        border: muscles.includes(mg) ? 'none' : '1px solid var(--color-border)',
                      }}>{mg}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-muted)' }}>训练动作</label>
                <div className="flex flex-col gap-2">
                  {exercises.map((ex, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-1 items-center p-2 rounded-lg" style={{ backgroundColor: 'var(--color-card)' }}>
                      <input value={ex.name} onChange={(e) => updateEx(idx, 'name', e.target.value)}
                        className="col-span-4 px-1 py-1 rounded text-xs border outline-none"
                        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                        placeholder="动作名" />
                      <select value={ex.muscleGroup} onChange={(e) => updateEx(idx, 'muscleGroup', e.target.value)}
                        className="col-span-2 px-1 py-1 rounded text-xs border outline-none"
                        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                        {MUSCLE_GROUPS.map((mg) => (<option key={mg} value={mg}>{mg}</option>))}
                      </select>
                      <input type="number" value={ex.sets} onChange={(e) => updateEx(idx, 'sets', Number(e.target.value))}
                        className="col-span-1 px-1 py-1 rounded text-xs border outline-none"
                        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} placeholder="组" />
                      <input type="number" value={ex.reps} onChange={(e) => updateEx(idx, 'reps', Number(e.target.value))}
                        className="col-span-1 px-1 py-1 rounded text-xs border outline-none"
                        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} placeholder="次" />
                      <input type="number" value={ex.restSeconds} onChange={(e) => updateEx(idx, 'restSeconds', Number(e.target.value))}
                        className="col-span-2 px-1 py-1 rounded text-xs border outline-none"
                        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} placeholder="休息s" />
                      <div className="col-span-2 flex gap-1">
                        <button onClick={() => removeEx(idx)} className="text-xs px-1 py-1 rounded" style={{ color: '#ef4444' }}>×</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={addExercise} className="w-full py-2 rounded text-xs font-semibold mt-1" style={{ color: 'var(--color-primary)', border: '1px dashed var(--color-primary)' }}>
                    + 添加动作
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg text-sm"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>取消</button>
              <button onClick={handleSave} className="flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}>保存</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
