import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import db from './db';

const app = express();
const PORT = 3456;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// --- Auth ---
app.post('/api/auth', (req, res) => {
  const { localUserId, name, avatar } = req.body;
  if (!localUserId || !name) return res.status(400).json({ error: 'Missing fields' });

  let user = db.prepare('SELECT * FROM forum_users WHERE localUserId = ?').get(localUserId) as any;
  if (!user) {
    const result = db.prepare('INSERT INTO forum_users (localUserId, name, avatar, createdAt) VALUES (?, ?, ?, ?)').run(localUserId, name, avatar || '💪', Date.now());
    user = db.prepare('SELECT * FROM forum_users WHERE id = ?').get(result.lastInsertRowid) as any;
  }
  res.json({ forumUserId: user.id, name: user.name, avatar: user.avatar });
});

// --- Admin auth ---
const ADMIN_PASSWORD = 'planfit2026';

app.post('/api/admin-auth', (req, res) => {
  const { forumUserId, password } = req.body;
  if (!forumUserId || !password) return res.status(400).json({ error: 'Missing fields' });
  if (password === ADMIN_PASSWORD) {
    db.prepare('UPDATE forum_users SET isAdmin = 1 WHERE id = ?').run(forumUserId);
    res.json({ success: true });
  } else {
    res.status(403).json({ error: '密码错误' });
  }
});

app.get('/api/admin-check/:forumUserId', (req, res) => {
  const user = db.prepare('SELECT isAdmin FROM forum_users WHERE id = ?').get(Number(req.params.forumUserId)) as any;
  res.json({ isAdmin: user?.isAdmin === 1 });
});

// --- Posts ---
app.get('/api/posts', (_req, res) => {
  const posts = db.prepare(`
    SELECT p.*, u.name, u.avatar,
      (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likesCount,
      (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentsCount
    FROM posts p JOIN forum_users u ON p.forumUserId = u.id
    ORDER BY p.createdAt DESC
  `).all();
  res.json(posts);
});

app.post('/api/posts', (req, res) => {
  try {
    const { forumUserId, content, image, category, anonymous } = req.body;
    if (!forumUserId || !content) return res.status(400).json({ error: 'Missing fields' });
    const result = db.prepare('INSERT INTO posts (forumUserId, content, image, category, anonymous, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(forumUserId, content, image || null, category || '经验分享', anonymous ? 1 : 0, Date.now());
    const post = db.prepare('SELECT p.*, u.name, u.avatar FROM posts p JOIN forum_users u ON p.forumUserId = u.id WHERE p.id = ?').get(result.lastInsertRowid);
    res.json(post);
  } catch (err: any) {
    console.error('Create post error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.delete('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  const { forumUserId } = req.body;
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as any;
  if (!post) return res.status(404).json({ error: 'Not found' });
  if (post.forumUserId !== forumUserId) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  res.json({ success: true });
});

// --- Comments ---
app.get('/api/posts/:id/comments', (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.name, u.avatar FROM comments c
    JOIN forum_users u ON c.forumUserId = u.id
    WHERE c.postId = ? ORDER BY c.createdAt ASC
  `).all(req.params.id);
  res.json(comments);
});

app.post('/api/posts/:id/comments', (req, res) => {
  const { forumUserId, content } = req.body;
  if (!forumUserId || !content) return res.status(400).json({ error: 'Missing fields' });
  const result = db.prepare('INSERT INTO comments (postId, forumUserId, content, createdAt) VALUES (?, ?, ?, ?)').run(Number(req.params.id), forumUserId, content, Date.now());
  const comment = db.prepare('SELECT c.*, u.name, u.avatar FROM comments c JOIN forum_users u ON c.forumUserId = u.id WHERE c.id = ?').get(result.lastInsertRowid);
  res.json(comment);
});

// --- Likes ---
app.post('/api/posts/:id/like', (req, res) => {
  const { forumUserId } = req.body;
  if (!forumUserId) return res.status(400).json({ error: 'Missing userId' });
  const existing = db.prepare('SELECT * FROM likes WHERE postId = ? AND forumUserId = ?').get(Number(req.params.id), forumUserId) as any;
  if (existing) {
    db.prepare('DELETE FROM likes WHERE postId = ? AND forumUserId = ?').run(Number(req.params.id), forumUserId);
  } else {
    db.prepare('INSERT INTO likes (postId, forumUserId) VALUES (?, ?)').run(Number(req.params.id), forumUserId);
  }
  const count = (db.prepare('SELECT COUNT(*) as c FROM likes WHERE postId = ?').get(Number(req.params.id)) as any).c;
  res.json({ liked: !existing, likeCount: count });
});

app.get('/api/posts/:id/likes', (req, res) => {
  const likes = db.prepare('SELECT forumUserId FROM likes WHERE postId = ?').all(Number(req.params.id)) as any[];
  res.json(likes.map((l: any) => l.forumUserId));
});

app.listen(PORT, () => {
  console.log(`Forum server running on http://localhost:${PORT}`);
});
