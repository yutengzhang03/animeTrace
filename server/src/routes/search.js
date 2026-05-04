/**
 * 搜索路由
 *   GET /api/search?q=关键词&limit=20&offset=0
 *
 * 返回 Bangumi 动画类目的搜索结果，已经做了字段归一化。
 */
import { Router } from 'express';
import { searchAnime } from '../services/bangumi.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q || '').toString();
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    if (!q.trim()) {
      return res.json({ total: 0, data: [] });
    }
    const result = await searchAnime(q, { limit, offset });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

export default router;
