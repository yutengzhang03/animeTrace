/**
 * SQLite 数据库初始化
 * ----------------------------------------
 * 用 Node 22 内置的 node:sqlite，无需任何原生编译依赖。
 * 启动时记得带 --experimental-sqlite（package.json 已配好）。
 *
 * 设计核心表：
 *   users             —— 多用户（用户名 + 密码哈希）
 *   subjects          —— 番剧元数据缓存（来自 Bangumi）
 *   subject_relations —— 番剧之间的关系（续集/前传/番外/剧场版 …）
 *   user_library      —— 个人收藏：状态、进度、评分、备注（多用户隔离）
 *
 * 注意 node:sqlite 的命名参数用 :name（不是 @name）。
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 默认放在 server/data/fanji.db。可通过 FANJI_DB_PATH 覆盖。
const DB_PATH =
  process.env.FANJI_DB_PATH || path.resolve(__dirname, '..', 'data', 'fanji.db');
const DATA_DIR = path.dirname(DB_PATH);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);
// 优先 WAL（高并发友好）；某些文件系统（如部分网络/沙箱挂载）不支持 WAL，自动降级
try {
  db.exec("PRAGMA journal_mode = WAL");
} catch {
  db.exec("PRAGMA journal_mode = DELETE");
}
db.exec("PRAGMA foreign_keys = ON");

// ---- 用户表 ----
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    salt          TEXT NOT NULL,
    created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS subjects (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,
    name_cn         TEXT,
    type            INTEGER,
    platform        TEXT,
    summary         TEXT,
    air_date        TEXT,
    air_year        INTEGER,
    eps             INTEGER,
    total_episodes  INTEGER,
    rating_score    REAL,
    rating_total    INTEGER,
    rank            INTEGER,
    image_large     TEXT,
    image_common    TEXT,
    image_grid      TEXT,
    tags_json       TEXT,
    raw_json        TEXT,
    fetched_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS subject_relations (
    source_id    INTEGER NOT NULL,
    target_id    INTEGER NOT NULL,
    relation     TEXT NOT NULL,
    target_name  TEXT,
    target_image TEXT,
    fetched_at   INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    PRIMARY KEY (source_id, target_id, relation)
  );
  CREATE INDEX IF NOT EXISTS idx_relations_source ON subject_relations(source_id);
  CREATE INDEX IF NOT EXISTS idx_relations_target ON subject_relations(target_id);
`);

// ---- 迁移：user_library 添加 user_id 列 ----
// 检查 user_library 是否存在且是否已经有 user_id 列
const tableInfo = db.prepare("PRAGMA table_info(user_library)").all();
const hasUserLibrary = tableInfo.length > 0;
const hasUserId = tableInfo.some(col => col.name === 'user_id');

if (!hasUserLibrary) {
  // 全新安装：直接建带 user_id 的表
  db.exec(`
    CREATE TABLE user_library (
      user_id      INTEGER NOT NULL,
      subject_id   INTEGER NOT NULL,
      status       TEXT NOT NULL CHECK (status IN ('wish','doing','done','on_hold','dropped')),
      progress     INTEGER NOT NULL DEFAULT 0,
      rating       INTEGER CHECK (rating IS NULL OR (rating BETWEEN 1 AND 10)),
      comment      TEXT,
      started_at   INTEGER,
      finished_at  INTEGER,
      updated_at   INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      PRIMARY KEY (user_id, subject_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_library_user ON user_library(user_id);
    CREATE INDEX IF NOT EXISTS idx_library_status ON user_library(user_id, status);
  `);
} else if (!hasUserId) {
  // 旧表存在但没有 user_id —— 需要迁移
  console.log('[番迹] 检测到旧版 user_library，正在迁移为多用户版本…');
  db.exec(`
    ALTER TABLE user_library RENAME TO _user_library_old;

    CREATE TABLE user_library (
      user_id      INTEGER NOT NULL,
      subject_id   INTEGER NOT NULL,
      status       TEXT NOT NULL CHECK (status IN ('wish','doing','done','on_hold','dropped')),
      progress     INTEGER NOT NULL DEFAULT 0,
      rating       INTEGER CHECK (rating IS NULL OR (rating BETWEEN 1 AND 10)),
      comment      TEXT,
      started_at   INTEGER,
      finished_at  INTEGER,
      updated_at   INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      PRIMARY KEY (user_id, subject_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_library_user ON user_library(user_id);
    CREATE INDEX IF NOT EXISTS idx_library_status ON user_library(user_id, status);
  `);
  // 旧数据稍后由 migrateOldData() 迁移（需要先创建用户）
}

export const STATUS_VALUES = ['wish', 'doing', 'done', 'on_hold', 'dropped'];
export const STATUS_LABELS = {
  wish: '想看',
  doing: '在看',
  done: '看过',
  on_hold: '搁置',
  dropped: '弃番',
};

// ---- 密码工具 ----
const HASH_ITERATIONS = 10000;
const KEY_LEN = 64;
const DIGEST = 'sha512';

export function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, storedHash, salt) {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

// ---- JWT-like token（HMAC-SHA256 签名）----
const TOKEN_SECRET = process.env.FANJI_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

export function createToken(userId, username) {
  const payload = JSON.stringify({ id: userId, u: username, exp: Math.floor(Date.now() / 1000) + 86400 * 30 }); // 30 天
  const b64 = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

export function parseToken(token) {
  if (!token) return null;
  const [b64, sig] = token.split('.');
  if (!b64 || !sig) return null;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(b64).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null; // 过期
    return payload;
  } catch {
    return null;
  }
}

// ---- 迁移旧数据到指定用户 ----
export function migrateOldData(userId) {
  // 检查旧表是否存在
  const oldTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_user_library_old'").get();
  if (!oldTable) return 0;

  const oldRows = db.prepare('SELECT * FROM _user_library_old').all();
  if (!oldRows.length) {
    db.exec('DROP TABLE IF EXISTS _user_library_old');
    return 0;
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO user_library
      (user_id, subject_id, status, progress, rating, comment, started_at, finished_at, updated_at)
    VALUES
      (@userId, @subject_id, @status, @progress, @rating, @comment, @started_at, @finished_at, @updated_at)
  `);

  for (const row of oldRows) {
    insert.run({ userId, ...row });
  }

  db.exec('DROP TABLE _user_library_old');
  console.log(`[番迹] 已迁移 ${oldRows.length} 条旧数据到用户 #${userId}`);
  return oldRows.length;
}

export default db;
