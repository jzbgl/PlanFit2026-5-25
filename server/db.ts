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
    isAdmin INTEGER DEFAULT 0,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    forumUserId INTEGER NOT NULL,
    content TEXT NOT NULL,
    image TEXT,
    category TEXT DEFAULT '经验分享',
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (forumUserId) REFERENCES forum_users(id)
  );
`);

// Add anonymous column if missing (safe for upgrades)
try {
  db.exec(`ALTER TABLE posts ADD COLUMN anonymous INTEGER DEFAULT 0`);
} catch {
  // column already exists, ignore
}

// Add isAdmin column if missing
try {
  db.exec(`ALTER TABLE forum_users ADD COLUMN isAdmin INTEGER DEFAULT 0`);
} catch {
  // column already exists, ignore
}

export default db;
