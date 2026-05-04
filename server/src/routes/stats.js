/**
 * 统计路由（多用户版）
 *   GET /api/stats   首页用：各状态计数、总集数、平均评分
 *
 * 注意：已在 app.js 中挂了 requireAuth，req.user 必定存在
 */
import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const userId = req.user.id;

  const counts = db.prepare(`
    SELECT status, COUNT(*) AS c FROM user_library WHERE user_id = ? GROUP BY status
  `).all(userId);

  const totals = db.prepare(`
    SELECT
      COUNT(*)                               AS total,
      COALESCE(SUM(progress), 0)             AS watched_episodes,
      ROUND(AVG(NULLIF(rating, 0)), 2)       AS avg_rating,
      COUNT(rating) FILTER (WHERE rating IS NOT NULL) AS rated_count
    FROM user_library
    WHERE user_id = ?
  `).get(userId);

  const byYear = db.prepare(`
    SELECT s.air_year AS year, COUNT(*) AS c
    FROM user_library l JOIN subjects s ON s.id = l.subject_id
    WHERE l.user_id = ? AND s.air_year IS NOT NULL
    GROUP BY s.air_year ORDER BY year DESC LIMIT 20
  `).all(userId);

  res.json({
    counts: Object.fromEntries(counts.map(r => [r.status, r.c])),
    totals,
    by_year: byYear,
  });
});

export default router;
