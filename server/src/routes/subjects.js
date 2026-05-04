/**
 * 番剧条目路由
 *   GET /api/subjects/:id           条目详情（带本地缓存）
 *   GET /api/subjects/:id/series    系列归集（核心功能）
 *   GET /api/subjects/:id/relations 原始关系列表
 *
 * 这些路由公开访问，但 library 数据只在登录时返回。
 */
import { Router } from 'express';
import { getSubject, getRelations } from '../services/bangumi.js';
import { collectSeries } from '../services/series.js';
import { db } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// 所有路由都尝试解析用户（但不强制登录）
router.use(optionalAuth);

const selectLibraryByIds = (userId, ids) => {
  if (!ids.length || !userId) return [];
  const placeholders = ids.map(() => '?').join(',');
  return db
    .prepare(`SELECT * FROM user_library WHERE user_id = ? AND subject_id IN (${placeholders})`)
    .all(userId, ...ids);
};

// 条目详情
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const force = req.query.refresh === '1';
    const subject = await getSubject(id, { force });
    if (!subject) return res.status(404).json({ error: 'subject not found' });

    let lib = null;
    if (req.user) {
      lib = db.prepare('SELECT * FROM user_library WHERE user_id = ? AND subject_id = ?').get(req.user.id, id) || null;
    }
    res.json({ ...subject, library: lib });
  } catch (e) {
    next(e);
  }
});

// 系列归集：自动找出该番的全部季 / OVA / 剧场版 / 特别篇
router.get('/:id/series', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const series = await collectSeries(id);

    // 把个人收藏状态也合并进去（仅登录用户）
    const ids = Object.keys(series.nodes).map(Number);
    const libRows = selectLibraryByIds(req.user?.id, ids);
    const libMap = Object.fromEntries(libRows.map(r => [r.subject_id, r]));

    for (const bucket of Object.values(series.buckets)) {
      for (const s of bucket) {
        s.library = libMap[s.id] || null;
      }
    }

    res.json(series);
  } catch (e) {
    next(e);
  }
});

// 原始关系（调试用）
router.get('/:id/relations', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const relations = await getRelations(id, { force: req.query.refresh === '1' });
    res.json(relations);
  } catch (e) {
    next(e);
  }
});

export default router;
