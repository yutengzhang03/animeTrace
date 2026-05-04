/**
 * 番迹 后端入口
 * ----------------------------------------
 * 端口：3001（默认；可用 PORT 覆盖）
 *
 * 两种模式：
 *   1. 开发模式：前端跑 vite dev (5173)，浏览器访问前端，前端代理 /api → 这里
 *   2. 生产/单端口模式：前端先 `npm run build` 出 web/dist，本进程同时伺服静态文件
 *
 * 路由：
 *   GET    /api/health
 *   POST   /api/auth/register
 *   POST   /api/auth/login
 *   GET    /api/auth/me
 *   GET    /api/search
 *   GET    /api/subjects/:id
 *   GET    /api/subjects/:id/series
 *   GET    /api/subjects/:id/relations
 *   GET    /api/library              需要登录
 *   PUT    /api/library/:subjectId   需要登录
 *   PATCH  /api/library/:subjectId   需要登录
 *   DELETE /api/library/:subjectId   需要登录
 *   GET    /api/stats                需要登录
 */
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import './db.js'; // 触发建表
import authRouter from './routes/auth.js';
import searchRouter from './routes/search.js';
import subjectsRouter from './routes/subjects.js';
import libraryRouter from './routes/library.js';
import statsRouter from './routes/stats.js';
import { requireAuth } from './middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // 允许被局域网/隧道访问
const WEB_DIST = path.resolve(__dirname, '..', '..', 'web', 'dist');

const app = express();
app.set('trust proxy', true); // 走 Cloudflare/ngrok 时拿到真实 IP（仅用于日志）

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// ---- 公开接口 ----
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    name: '番迹',
    version: '0.2.0',
    time: new Date().toISOString(),
  });
});

// ---- 认证路由（注册 / 登录 / me）----
app.use('/api/auth', authRouter);

// ---- 公开业务路由 ----
app.use('/api/search', searchRouter);
app.use('/api/subjects', subjectsRouter);

// ---- 需要登录的路由 ----
app.use('/api/library', requireAuth, libraryRouter);
app.use('/api/stats', requireAuth, statsRouter);

// ---- 静态资源（生产模式）----
if (fs.existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST, { index: 'index.html', maxAge: '1h' }));
  // SPA 回退：除 /api/* 外，所有 GET 请求都返回 index.html
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(WEB_DIST, 'index.html'));
  });
}

// ---- 兜底错误 ----
app.use((err, req, res, _next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({ error: err.message || 'internal error' });
});

app.listen(PORT, HOST, () => {
  const hint = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`[番迹] server listening on ${hint}`);
  console.log('[番迹] 多用户模式已启用');
  if (fs.existsSync(WEB_DIST)) {
    console.log(`[番迹] 已挂载前端静态文件：${WEB_DIST}`);
  } else {
    console.log('[番迹] 未发现 web/dist；请用 vite dev 或先 npm run build');
  }
});
