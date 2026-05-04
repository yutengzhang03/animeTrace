/**
 * 用户注册 / 登录路由
 *   POST /api/auth/register   注册（用户名 + 密码）
 *   POST /api/auth/login      登录
 *   GET  /api/auth/me         获取当前登录用户信息
 */
import { Router } from 'express';
import { db, hashPassword, verifyPassword, createToken, migrateOldData } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/** 注册 */
router.post('/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  if (username.length < 2 || username.length > 20) {
    return res.status(400).json({ error: '用户名长度 2-20 个字符' });
  }
  if (!/^[a-zA-Z0-9_一-鿿]+$/.test(username)) {
    return res.status(400).json({ error: '用户名只能包含字母、数字、下划线或中文' });
  }
  if (password.length < 1) {
    return res.status(400).json({ error: '密码不能为空' });
  }

  // 检查重名
  const existing = db.prepare('SELECT id FROM users WHERE username = @username').get({ username });
  if (existing) {
    return res.status(409).json({ error: '用户名已被注册' });
  }

  const { hash, salt } = hashPassword(password);
  const result = db.prepare(
    'INSERT INTO users (username, password_hash, salt) VALUES (@username, @hash, @salt)'
  ).run({ username, hash, salt });

  const userId = Number(result.lastInsertRowid);

  // 如果有旧数据待迁移（第一个注册的用户自动继承）
  migrateOldData(userId);

  const token = createToken(userId, username);
  res.json({ ok: true, token, user: { id: userId, username } });
});

/** 登录 */
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const row = db.prepare('SELECT * FROM users WHERE username = @username').get({ username });
  if (!row) {
    return res.status(401).json({ error: '用户名或密码不正确' });
  }

  if (!verifyPassword(password, row.password_hash, row.salt)) {
    return res.status(401).json({ error: '用户名或密码不正确' });
  }

  const token = createToken(row.id, row.username);
  res.json({ ok: true, token, user: { id: row.id, username: row.username } });
});

/** 获取当前用户 */
router.get('/me', requireAuth, (req, res) => {
  const row = db.prepare('SELECT id, username, created_at FROM users WHERE id = @id').get({ id: req.user.id });
  if (!row) return res.status(401).json({ error: '用户不存在' });
  res.json({ id: row.id, username: row.username, created_at: row.created_at });
});

export default router;
