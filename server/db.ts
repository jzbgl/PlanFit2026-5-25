import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, 'planfit_forum.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS forum_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    localUserId INTEGER NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT DEFAULT '💪',
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    forumUserId INTEGER NOT NULL,
    content TEXT NOT NULL,
    image TEXT,
    category TEXT DEFAULT '经验分享',
    anonymous INTEGER DEFAULT 0,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (forumUserId) REFERENCES forum_users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    postId INTEGER NOT NULL,
    forumUserId INTEGER NOT NULL,
    content TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (forumUserId) REFERENCES forum_users(id)
  );

  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    postId INTEGER NOT NULL,
    forumUserId INTEGER NOT NULL,
    UNIQUE(postId, forumUserId),
    FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (forumUserId) REFERENCES forum_users(id)
  );
`);

export default db;
