/**
 * Bangumi v0 API 客户端
 * ----------------------------------------
 * 文档：https://bangumi.github.io/api/
 *
 * 关键点：
 *   1. Bangumi 要求带 User-Agent，否则会被限流甚至封 IP
 *   2. 我们对 /subjects/:id 和 /subjects/:id/subjects（关系）做本地缓存
 *      默认缓存 7 天，避免重复请求
 *   3. 搜索接口不缓存，因为搜索词组合无穷
 */
import { db } from '../db.js';

const BASE_URL = 'https://api.bgm.tv';
// 按官方建议带上联系方式；animeTrace 是项目名
const USER_AGENT = 'animeTrace/0.1 (https://github.com/yutengzhang03/animeTrace)';

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 天

/**
 * 通用请求函数
 */
async function bgmFetch(pathname, init = {}) {
  const res = await fetch(`${BASE_URL}${pathname}`, {
    ...init,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Bangumi API ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// ---------- 搜索 ----------

/**
 * 用 v0 新搜索接口（POST /v0/search/subjects）
 * type 2 = 动画
 */
export async function searchAnime(keyword, { limit = 20, offset = 0 } = {}) {
  if (!keyword || !keyword.trim()) return { total: 0, data: [] };
  const body = {
    keyword: keyword.trim(),
    sort: 'match',
    filter: { type: [2] },
  };
  const url = `/v0/search/subjects?limit=${limit}&offset=${offset}`;
  try {
    const json = await bgmFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return {
      total: json.total || 0,
      data: (json.data || []).map(normalizeSearchHit),
    };
  } catch (e) {
    // 如果 v0 搜索挂了（偶尔会），退回老接口
    if (e.status === 404 || e.status === 502) {
      const legacy = await bgmFetch(
        `/search/subject/${encodeURIComponent(keyword)}?type=2&responseGroup=large&max_results=${limit}`,
      );
      const list = legacy.list || [];
      return {
        total: legacy.results || list.length,
        data: list.map(normalizeLegacyHit),
      };
    }
    throw e;
  }
}

function normalizeSearchHit(s) {
  return {
    id: s.id,
    name: s.name,
    name_cn: s.name_cn || '',
    type: s.type,
    platform: pickPlatform(s),
    summary: s.summary || '',
    air_date: s.date || '',
    air_year: s.date ? Number(s.date.slice(0, 4)) : null,
    eps: s.eps ?? s.total_episodes ?? 0,
    image: s.image || (s.images && (s.images.large || s.images.common)) || '',
    rating_score: s.rating?.score ?? null,
    rating_total: s.rating?.total ?? null,
    tags: (s.tags || []).map(t => (typeof t === 'string' ? t : t.name)).slice(0, 8),
  };
}

function normalizeLegacyHit(s) {
  return {
    id: s.id,
    name: s.name,
    name_cn: s.name_cn || '',
    type: s.type,
    platform: pickPlatform(s),
    summary: s.summary || '',
    air_date: s.air_date || '',
    air_year: s.air_date ? Number(s.air_date.slice(0, 4)) : null,
    eps: s.eps_count ?? s.eps ?? 0,
    image: (s.images && (s.images.large || s.images.common)) || '',
    rating_score: s.rating?.score ?? null,
    rating_total: s.rating?.total ?? null,
    tags: [],
  };
}

function pickPlatform(s) {
  // v0 接口里 platform 字段有时直接是字符串
  if (typeof s.platform === 'string' && s.platform) return s.platform;
  return '';
}

// ---------- 详情（带缓存） ----------

const selectSubject = db.prepare('SELECT * FROM subjects WHERE id = ?');
const upsertSubject = db.prepare(`
  INSERT INTO subjects (
    id, name, name_cn, type, platform, summary, air_date, air_year,
    eps, total_episodes, rating_score, rating_total, rank,
    image_large, image_common, image_grid, tags_json, raw_json, fetched_at
  ) VALUES (
    @id, @name, @name_cn, @type, @platform, @summary, @air_date, @air_year,
    @eps, @total_episodes, @rating_score, @rating_total, @rank,
    @image_large, @image_common, @image_grid, @tags_json, @raw_json, strftime('%s','now')
  )
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    name_cn = excluded.name_cn,
    type = excluded.type,
    platform = excluded.platform,
    summary = excluded.summary,
    air_date = excluded.air_date,
    air_year = excluded.air_year,
    eps = excluded.eps,
    total_episodes = excluded.total_episodes,
    rating_score = excluded.rating_score,
    rating_total = excluded.rating_total,
    rank = excluded.rank,
    image_large = excluded.image_large,
    image_common = excluded.image_common,
    image_grid = excluded.image_grid,
    tags_json = excluded.tags_json,
    raw_json = excluded.raw_json,
    fetched_at = strftime('%s','now')
`);

/**
 * 拉取条目详情，命中缓存且未过期就直接读 DB
 */
export async function getSubject(id, { force = false } = {}) {
  const cached = selectSubject.get(id);
  const now = Math.floor(Date.now() / 1000);
  if (!force && cached && now - cached.fetched_at < CACHE_TTL_SECONDS) {
    return rowToSubject(cached);
  }
  const json = await bgmFetch(`/v0/subjects/${id}`);
  const row = {
    id: json.id,
    name: json.name || '',
    name_cn: json.name_cn || '',
    type: json.type,
    platform: json.platform || '',
    summary: json.summary || '',
    air_date: json.date || '',
    air_year: json.date ? Number(json.date.slice(0, 4)) : null,
    eps: json.eps || 0,
    total_episodes: json.total_episodes || json.eps || 0,
    rating_score: json.rating?.score ?? null,
    rating_total: json.rating?.total ?? null,
    rank: json.rating?.rank ?? null,
    image_large: json.images?.large || '',
    image_common: json.images?.common || '',
    image_grid: json.images?.grid || '',
    tags_json: JSON.stringify((json.tags || []).map(t => ({ name: t.name, count: t.count }))),
    raw_json: JSON.stringify(json),
  };
  upsertSubject.run(row);
  return rowToSubject({ ...row, fetched_at: now });
}

function rowToSubject(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    name_cn: row.name_cn,
    type: row.type,
    platform: row.platform || '',
    summary: row.summary || '',
    air_date: row.air_date,
    air_year: row.air_year,
    eps: row.eps,
    total_episodes: row.total_episodes,
    rating: {
      score: row.rating_score,
      total: row.rating_total,
      rank: row.rank,
    },
    image: row.image_large || row.image_common || row.image_grid || '',
    images: {
      large: row.image_large,
      common: row.image_common,
      grid: row.image_grid,
    },
    tags: row.tags_json ? JSON.parse(row.tags_json) : [],
  };
}

// ---------- 关系（带缓存） ----------

const selectRelations = db.prepare(
  'SELECT * FROM subject_relations WHERE source_id = ? ORDER BY relation, target_id',
);
const deleteRelations = db.prepare('DELETE FROM subject_relations WHERE source_id = ?');
const insertRelation = db.prepare(`
  INSERT OR REPLACE INTO subject_relations
    (source_id, target_id, relation, target_name, target_image, fetched_at)
  VALUES (?, ?, ?, ?, ?, strftime('%s','now'))
`);

/**
 * 拉取一个条目的关联条目（v0 /subjects/:id/subjects）
 * 返回值会按 relation 分组
 */
export async function getRelations(id, { force = false } = {}) {
  const cached = selectRelations.all(id);
  const now = Math.floor(Date.now() / 1000);
  const stale =
    cached.length === 0 || cached.some(r => now - r.fetched_at > CACHE_TTL_SECONDS);

  if (!force && !stale && cached.length > 0) {
    return cached;
  }

  const json = await bgmFetch(`/v0/subjects/${id}/subjects`);
  // json 是数组：[{ id, relation, name, name_cn, type, images, ... }]
  const items = json || [];
  db.exec('BEGIN');
  try {
    deleteRelations.run(id);
    for (const it of items) {
      insertRelation.run(
        id,
        it.id,
        it.relation || '其他',
        it.name_cn || it.name || '',
        it.images?.large || it.images?.common || it.images?.grid || '',
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return selectRelations.all(id);
}
