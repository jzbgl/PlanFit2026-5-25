import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import * as api from '../api/community';

interface TeachingPost {
  id: number;
  forumUserId: number;
  content: string;
  image?: string;
  createdAt: string;
  name?: string;
  avatar?: string;
  likesCount?: number;
  commentsCount?: number;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function Teaching() {
  const { state } = useApp();
  const user = state.currentUser;
  const [isAdmin, setIsAdmin] = useState(false);
  const [posts, setPosts] = useState<TeachingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [commentTexts, setCommentTexts] = useState<Record<number, string>>({});
  const [commentsMap, setCommentsMap] = useState<Record<number, any[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    api.forumAuth(user.id, user.name, user.avatar).then((data: { forumUserId: number }) => {
      if (data?.forumUserId) {
        api.adminCheck(data.forumUserId).then((r: { isAdmin: boolean }) => setIsAdmin(r.isAdmin));
      }
    });
  }, [user?.id]);

  useEffect(() => { fetchPosts(); }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const all = await api.getPosts();
      const teaching = (all || []).filter((p: any) => p.category === '教学')
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPosts(teaching);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  async function handlePost() {
    if (!content.trim() || submitting) return;
    // Get forumUserId
    const auth = await api.forumAuth(user!.id!, user!.name, user!.avatar);
    if (!auth?.forumUserId) return;
    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (selectedFile) {
        try {
          const up = await api.uploadImage(selectedFile);
          imageUrl = up.url || up.path;
        } catch {}
      }
      await api.createPost(auth.forumUserId, content.trim(), imageUrl, '教学');
      setContent('');
      setSelectedFile(null);
      fetchPosts();
    } catch {} finally {
      setSubmitting(false);
    }
  }

  async function handleToggleComments(postId: number) {
    if (expandedId === postId) { setExpandedId(null); return; }
    setExpandedId(postId);
    try {
      const comments = await api.getComments(postId);
      setCommentsMap((prev) => ({ ...prev, [postId]: comments || [] }));
    } catch {}
  }

  async function handleAddComment(postId: number) {
    const text = (commentTexts[postId] || '').trim();
    if (!text) return;
    const auth = await api.forumAuth(user!.id!, user!.name, user!.avatar);
    if (!auth?.forumUserId) return;
    try {
      await api.createComment(postId, auth.forumUserId, text);
      setCommentTexts((prev) => ({ ...prev, [postId]: '' }));
      const comments = await api.getComments(postId);
      setCommentsMap((prev) => ({ ...prev, [postId]: comments || [] }));
    } catch {}
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
          🎓 健身教学
        </h1>
        {isAdmin && <span className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}>👑 管理员</span>}
      </div>

      {!isAdmin && (
        <div className="rounded-xl p-4 mb-5 text-sm text-center" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text-muted)' }}>
          📖 教学模块由管理员发布专业健身内容，当前为只读模式
        </div>
      )}

      {isAdmin && (
        <div className="rounded-2xl p-4 mb-5" style={{ backgroundColor: 'var(--color-card)' }}>
          <textarea
            className="w-full p-3 rounded-xl resize-none text-sm outline-none"
            style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)', minHeight: '80px' }}
            placeholder="发布教学文章..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg text-sm"
              style={{ backgroundColor: selectedFile ? 'var(--color-primary)' : 'var(--color-bg)', color: selectedFile ? '#000' : 'var(--color-text-muted)', border: `1px solid ${selectedFile ? 'var(--color-primary)' : 'var(--color-border)'}` }}
            >
              {selectedFile ? `📎 ${selectedFile.name}` : '📎 添加图片'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setSelectedFile(f); }} />
            <button
              onClick={handlePost}
              disabled={!content.trim() || submitting}
              className="ml-auto px-5 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}
            >
              {submitting ? '发布中...' : '发布教学'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-primary)' }} />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 rounded-2xl" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text-muted)' }}>
          <div className="text-4xl mb-3">🎓</div>
          <div className="text-sm">暂无教学内容</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((post) => (
            <div key={post.id} className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-card)' }}>
              {post.image && (
                <img src={api.getImageUrl(post.image) || ''} alt="" className="w-full h-48 object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary), #00c853)', color: '#000' }}>
                    {post.avatar || '💪'}
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{post.name}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatTime(post.createdAt)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text)' }}>{post.content}</p>

                <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <button onClick={() => handleToggleComments(post.id)}
                    className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                    💬 {post.commentsCount || 0} 评论
                  </button>
                </div>

                {expandedId === post.id && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                    {(commentsMap[post.id] || []).map((c: any) => (
                      <div key={c.id} className="flex gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                          style={{ background: 'linear-gradient(135deg, var(--color-primary), #00c853)', color: '#000' }}>
                          {c.avatar || '💪'}
                        </div>
                        <div>
                          <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{c.name}</span>
                          <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>{c.content}</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <input
                        className="flex-1 px-2 py-1 rounded text-xs outline-none"
                        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                        placeholder="写评论..."
                        value={commentTexts[post.id] || ''}
                        onChange={(e) => setCommentTexts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                      />
                      <button onClick={() => handleAddComment(post.id)}
                        className="px-3 py-1 rounded text-xs font-semibold"
                        style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}>
                        发送
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
