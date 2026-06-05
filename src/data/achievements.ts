import type { Achievement } from '../types';

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_workout', name: '初出茅庐', description: '完成第一次训练', icon: '🎯' },
  { id: 'streak_7', name: '坚持一周', description: '连续训练7天', icon: '🔥' },
  { id: 'streak_30', name: '月度冠军', description: '累计训练30天', icon: '👑' },
  { id: 'sets_100', name: '百组达人', description: '累计完成100组训练', icon: '💯' },
  { id: 'sets_500', name: '五百勇士', description: '累计完成500组训练', icon: '⚔️' },
  { id: 'exercises_50', name: '动作大师', description: '累计完成50个不同动作', icon: '🏆' },
  { id: 'all_muscles', name: '全身训练', description: '训练过所有肌群', icon: '🌟' },
  { id: 'early_bird', name: '晨练达人', description: '早上6点前完成训练', icon: '🌅' },
];
