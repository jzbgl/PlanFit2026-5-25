import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import * as api from '../api/community';

const CATEGORIES = ['全部', '经验分享', '身材展示', '饮食交流', '提问求助'];
const CREATE_CATEGORIES = ['经验分享', '身材展示', '饮食交流', '提问求助'];

function formatTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return '刚刚';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分钟前`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}小时前`;
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface ForumUser {
  name: string;
  avatar?: string;
}

interface Post {
  id: number;
  forumUserId: number;
  content: string;
  image?: string;
  category?: string;
  createdAt: string;
  user: ForumUser;
  likesCount?: number;
  commentsCount?: number;
  likedByMe?: boolean;
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  user: ForumUser;
}

export default function Community() {
  const { state } = useApp();
  const user = state.currentUser;

  const [forumUserId, setForumUserId] = useState<number | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('经验分享');
  const [submitting, setSubmitting] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<number, Comment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<number, boolean>>({});
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [commentTexts, setCommentTexts] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    api.forumAuth(user.id, user.name, user.avatar).then((data: { forumUserId: number }) => {
      if (data?.forumUserId) {
        setForumUserId(data.forumUserId);
      }
    }).catch(() => {});
  }, [user?.id, user?.name, user?.avatar]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data: Post[] = await api.getPosts();
      const sorted = (data || []).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setPosts(sorted);
      const liked = new Set<number>();
      for (const p of sorted) {
        if (p.likedByMe) liked.add(p.id);
      }
      setLikedPosts(liked);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const filteredPosts = activeCategory === '全部'
    ? posts
    : posts.filter((p) => p.category === activeCategory);

  const handleCreatePost = async () => {
    if (!forumUserId || !content.trim()) return;
    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (selectedFile) {
        const uploadRes: { url?: string; path?: string } = await api.uploadImage(selectedFile);
        imageUrl = uploadRes.url || uploadRes.path || undefined;
      }
      await api.createPost(forumUserId, content.trim(), imageUrl, selectedCategory);
      setContent('');
      setSelectedFile(null);
      setSelectedCategory('经验分享');
      await fetchPosts();
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!forumUserId) return;
    try {
      await api.deletePost(postId, forumUserId);
      await fetchPosts();
    } catch {
      // ignore
    }
  };

  const handleToggleComments = async (postId: number) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }
    setExpandedPostId(postId);
    if (!commentsMap[postId]) {
      setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
      try {
        const data: Comment[] = await api.getComments(postId);
        setCommentsMap((prev) => ({ ...prev, [postId]: data || [] }));
      } catch {
        setCommentsMap((prev) => ({ ...prev, [postId]: [] }));
      } finally {
        setCommentsLoading((prev) => ({ ...prev, [postId]: false }));
      }
    }
  };

  const handleLike = async (postId: number) => {
    if (!forumUserId) return;
    const wasLiked = likedPosts.has(postId);
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(postId);
      else next.add(postId);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return { ...p, likesCount: (p.likesCount || 0) + (wasLiked ? -1 : 1) };
      })
    );
    try {
      await api.toggleLike(postId, forumUserId);
    } catch {
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(postId);
        else next.delete(postId);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          return { ...p, likesCount: (p.likesCount || 0) + (wasLiked ? 1 : -1) };
        })
      );
    }
  };

  const handleAddComment = async (postId: number) => {
    if (!forumUserId) return;
    const text = (commentTexts[postId] || '').trim();
    if (!text) return;
    setCommentTexts((prev) => ({ ...prev, [postId]: '' }));
    try {
      const newComment: Comment = await api.createComment(postId, forumUserId, text);
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }));
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          return { ...p, commentsCount: (p.commentsCount || 0) + 1 };
        })
      );
    } catch {
      setCommentTexts((prev) => ({ ...prev, [postId]: text }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreatePost();
    }
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, postId: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddComment(postId);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-5" style={{ color: 'var(--color-text)' }}>
        社区
      </h1>

      {/* Create post card */}
      <div
        className="rounded-2xl p-4 mb-5"
        style={{ backgroundColor: 'var(--color-card)' }}
      >
        <textarea
          className="w-full p-3 rounded-xl resize-none text-sm outline-none"
          style={{
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            minHeight: '80px',
          }}
          placeholder="分享你的健身心得、成果或问题..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <select
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {CREATE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            className="px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: selectedFile ? 'var(--color-primary)' : 'var(--color-bg)',
              color: selectedFile ? '#000' : 'var(--color-text-muted)',
              border: `1px solid ${selectedFile ? 'var(--color-primary)' : 'var(--color-border)'}`,
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            {selectedFile ? `📎 ${selectedFile.name}` : '📎 添加图片'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setSelectedFile(file);
            }}
          />
          <button
            className="ml-auto px-5 py-1.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#000',
            }}
            disabled={!forumUserId || !content.trim() || submitting}
            onClick={handleCreatePost}
          >
            {submitting ? '发布中...' : '发布'}
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className="px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors font-medium"
            style={{
              backgroundColor: activeCategory === cat ? 'var(--color-primary)' : 'var(--color-card)',
              color: activeCategory === cat ? '#000' : 'var(--color-text-muted)',
            }}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Posts list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div
            className="w-8 h-8 border-4 rounded-full animate-spin"
            style={{
              borderColor: 'var(--color-border)',
              borderTopColor: 'var(--color-primary)',
            }}
          />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div
          className="text-center py-12 rounded-2xl"
          style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text-muted)' }}
        >
          <div className="text-4xl mb-3">💬</div>
          <div className="text-sm">暂无帖子，快来发布第一条吧！</div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="rounded-2xl p-4 cursor-pointer transition-colors"
              style={{ backgroundColor: 'var(--color-card)' }}
              onClick={() => handleToggleComments(post.id)}
            >
              {/* Header: avatar, name, time, category */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-primary), #00c853)',
                    color: '#000',
                  }}
                >
                  {post.user?.avatar || '💪'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    {post.user?.name || '匿名用户'}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {formatTime(post.createdAt)}
                  </div>
                </div>
                {post.category && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: '#000',
                      opacity: 0.8,
                    }}
                  >
                    {post.category}
                  </span>
                )}
              </div>

              {/* Content */}
              <div
                className="text-sm leading-relaxed mb-3 whitespace-pre-wrap"
                style={{ color: 'var(--color-text)' }}
              >
                {post.content}
              </div>

              {/* Image */}
              {post.image && (
                <div className="mb-3">
                  <img
                    src={api.getImageUrl(post.image) || undefined}
                    alt="post"
                    className="rounded-xl max-h-72 w-auto object-cover"
                    style={{ maxWidth: '100%' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}

              {/* Actions: like, comments, delete */}
              <div className="flex items-center gap-4 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                <button
                  className="flex items-center gap-1 text-sm transition-colors"
                  style={{ color: likedPosts.has(post.id) ? '#ef4444' : 'var(--color-text-muted)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike(post.id);
                  }}
                >
                  {likedPosts.has(post.id) ? '❤️' : '🤍'} {post.likesCount || 0}
                </button>
                <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  💬 {post.commentsCount || 0}
                </div>
                {forumUserId === post.forumUserId && (
                  <button
                    className="ml-auto text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePost(post.id);
                    }}
                  >
                    🗑️
                  </button>
                )}
              </div>

              {/* Comments section */}
              {expandedPostId === post.id && (
                <div
                  className="mt-3 pt-3"
                  style={{ borderTop: '1px solid var(--color-border)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {commentsLoading[post.id] ? (
                    <div className="text-center py-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      加载中...
                    </div>
                  ) : (commentsMap[post.id] || []).length === 0 ? (
                    <div className="text-center py-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      暂无评论
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 mb-3">
                      {(commentsMap[post.id] || []).map((comment) => (
                        <div key={comment.id} className="flex gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                            style={{
                              background: 'linear-gradient(135deg, var(--color-primary), #00c853)',
                              color: '#000',
                            }}
                          >
                            {comment.user?.avatar || '💪'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                                {comment.user?.name || '匿名用户'}
                              </span>
                              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                {formatTime(comment.createdAt)}
                              </span>
                            </div>
                            <div className="text-sm mt-0.5" style={{ color: 'var(--color-text)' }}>
                              {comment.content}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add comment input */}
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
                      style={{
                        backgroundColor: 'var(--color-bg)',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border)',
                      }}
                      placeholder="写下你的评论..."
                      value={commentTexts[post.id] || ''}
                      onChange={(e) =>
                        setCommentTexts((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      onKeyDown={(e) => handleCommentKeyDown(e, post.id)}
                    />
                    <button
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}
                      disabled={!(commentTexts[post.id] || '').trim()}
                      onClick={() => handleAddComment(post.id)}
                    >
                      发送
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
