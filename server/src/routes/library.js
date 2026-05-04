/**
 * 个人番库路由（多用户版）
 *   GET    /api/library                 列表 + 筛选（当前用户）
 *   GET    /api/library/:subjectId      单条
 *   PUT    /api/library/:subjectId      新增/更新（upsert）
 *   PATCH  /api/library/:subjectId      局部更新进度/评分/备注
 *   DELETE /api/library/:subjectId      删除
 *
 * 注意：这些路由已经在 app.js 中挂了 requireAuth，req.user 必定存在
 */
import { Router } from 'express';
import { db, STATUS_VALUES } from '../db.js';
import { getSubject } from '../services/bangumi.js';

const router = Router();

/** 列表 + 多维筛选 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, year, q, sort = 'updated' } = req.query;

    const where = ['l.user_id = ?'];
    const params = [userId];
    if (status) {
      const list = String(status).split(',').filter(s => STATUS_VALUES.includes(s));
      if (list.length) {
        where.push(`l.status IN (${list.map(() => '?').join(',')})`);
        params.push(...list);
      }
    }
    if (year) {
      where.push('s.air_year = ?');
      params.push(Number(year));
    }
    if (q) {
      where.push('(s.name LIKE ? OR s.name_cn LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    const orderBy = {
      updated: 'l.updated_at DESC',
      rating: 'l.rating DESC NULLS LAST, l.updated_at DESC',
      score: 's.rating_score DESC NULLS LAST',
      year: 's.air_year DESC NULLS LAST',
      name: 'COALESCE(s.name_cn, s.name) ASC',
    }[sort] || 'l.updated_at DESC';

    const rows = db.prepare(`
      SELECT
        l.subject_id, l.status, l.progress, l.rating, l.comment,
        l.started_at, l.finished_at, l.updated_at,
        s.name, s.name_cn, s.air_date, s.air_year,
        s.eps, s.total_episodes, s.platform,
        s.image_large, s.image_common,
        s.rating_score, s.rating_total, s.tags_json
      FROM user_library l
      JOIN subjects s ON s.id = l.subject_id
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy}
    `).all(...params);

    res.json({
      total: rows.length,
      data: rows.map(rowToItem),
    });
  } catch (e) {
    next(e);
  }
});

/** 单条 */
router.get('/:subjectId', (req, res) => {
  const userId = req.user.id;
  const id = Number(req.params.subjectId);
  const row = db.prepare('SELECT * FROM user_library WHERE user_id = ? AND subject_id = ?').get(userId, id);
  res.json(row || null);
});

/**
 * upsert：传 status 就保存，可选 progress / rating / comment
 * 第一次保存前若没有 subjects 缓存，会先从 Bangumi 拉一份
 */
router.put('/:subjectId', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.subjectId);
    const { status, progress, rating, comment } = req.body || {};
    if (!STATUS_VALUES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${STATUS_VALUES.join(',')}` });
    }
    // 确保 subjects 里有这条记录（外键依赖）
    await getSubject(id);

    const exists = db.prepare('SELECT 1 FROM user_library WHERE user_id = ? AND subject_id = ?').get(userId, id);
    const now = Math.floor(Date.now() / 1000);
    if (exists) {
      db.prepare(`
        UPDATE user_library
           SET status      = @status,
               progress    = COALESCE(@progress, progress),
               rating      = @rating,
               comment     = @comment,
               started_at  = COALESCE(started_at, CASE WHEN @status='doing' THEN @now ELSE NULL END),
               finished_at = CASE WHEN @status='done' THEN @now ELSE finished_at END,
               updated_at  = @now
         WHERE user_id = @userId AND subject_id = @id
      `).run({
        userId,
        id,
        status,
        progress: progress ?? null,
        rating: rating ?? null,
        comment: comment ?? null,
        now,
      });
    } else {
      db.prepare(`
        INSERT INTO user_library
          (user_id, subject_id, status, progress, rating, comment, started_at, finished_at, updated_at)
        VALUES
          (@userId, @id, @status, @progress, @rating, @comment,
           CASE WHEN @status='doing' THEN @now ELSE NULL END,
           CASE WHEN @status='done'  THEN @now ELSE NULL END,
           @now)
      `).run({
        userId,
        id,
        status,
        progress: progress ?? 0,
        rating: rating ?? null,
        comment: comment ?? null,
        now,
      });
    }
    const row = db.prepare('SELECT * FROM user_library WHERE user_id = ? AND subject_id = ?').get(userId, id);
    res.json(row);
  } catch (e) {
    next(e);
  }
});

/** 局部更新（比如只改进度） */
router.patch('/:subjectId', (req, res) => {
  const userId = req.user.id;
  const id = Number(req.params.subjectId);
  const exists = db.prepare('SELECT * FROM user_library WHERE user_id = ? AND subject_id = ?').get(userId, id);
  if (!exists) return res.status(404).json({ error: 'not in library' });

  const { progress, rating, comment, status } = req.body || {};
  if (status && !STATUS_VALUES.includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }
  const now = Math.floor(Date.now() / 1000);
  db.prepare(`
    UPDATE user_library SET
      status     = COALESCE(@status, status),
      progress   = COALESCE(@progress, progress),
      rating     = CASE WHEN @ratingProvided=1 THEN @rating ELSE rating END,
      comment    = CASE WHEN @commentProvided=1 THEN @comment ELSE comment END,
      finished_at = CASE WHEN @status='done' AND finished_at IS NULL THEN @now ELSE finished_at END,
      updated_at = @now
    WHERE user_id = @userId AND subject_id = @id
  `).run({
    userId,
    id,
    status: status ?? null,
    progress: progress ?? null,
    rating: rating ?? null,
    comment: comment ?? null,
    ratingProvided: rating === undefined ? 0 : 1,
    commentProvided: comment === undefined ? 0 : 1,
    now,
  });
  const row = db.prepare('SELECT * FROM user_library WHERE user_id = ? AND subject_id = ?').get(userId, id);
  res.json(row);
});

router.delete('/:subjectId', (req, res) => {
  const userId = req.user.id;
  const id = Number(req.params.subjectId);
  db.prepare('DELETE FROM user_library WHERE user_id = ? AND subject_id = ?').run(userId, id);
  res.json({ ok: true });
});

function rowToItem(row) {
  return {
    subject_id: row.subject_id,
    status: row.status,
    progress: row.progress,
    rating: row.rating,
    comment: row.comment,
    started_at: row.started_at,
    finished_at: row.finished_at,
    updated_at: row.updated_at,
    subject: {
      id: row.subject_id,
      name: row.name,
      name_cn: row.name_cn,
      air_date: row.air_date,
      air_year: row.air_year,
      eps: row.eps,
      total_episodes: row.total_episodes,
      platform: row.platform,
      image: row.image_large || row.image_common,
      rating_score: row.rating_score,
      rating_total: row.rating_total,
      tags: row.tags_json ? JSON.parse(row.tags_json) : [],
    },
  };
}

export default router;
