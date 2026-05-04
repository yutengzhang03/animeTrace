/**
 * 系列归集
 * ----------------------------------------
 * 思路：
 *   从一个起点 subject_id 开始，递归拉取它所有"系列内"的关系条目，
 *   构建一个连通分量。然后按 platform / 关系类型把节点分桶：
 *     - main      TV 主线（含续集 / 前传 / 主线故事）
 *     - movie     剧场版
 *     - ova       OVA / OAD
 *     - special   特别篇 / 番外篇
 *     - other     其他（不同版本、衍生作）
 *
 * Bangumi 的关系类型大致有：
 *   续集 / 前传 / 主线故事 / 番外篇 / 不同版本 / 改编 / 衍生 / 其他
 *
 * 我们只对"同系列"的关系做递归遍历，避免无限发散到不相关作品。
 */
import { getSubject, getRelations } from './bangumi.js';

// 哪些关系算"同系列"——会被纳入归集并递归
const SAME_SERIES_RELATIONS = new Set([
  '续集',
  '前传',
  '主线故事',
  '番外篇',
  '不同版本',
  '其他版本',
  '相同世界观',
]);

const MAX_NODES = 40;       // 安全阈值，防止某些大坑系列爆炸
const MAX_DEPTH = 4;

/**
 * 把一个 subject 分到哪个桶。规则：
 *   1. 优先看 platform 字段（"TV" / "OVA" / "剧场版" / "WEB" / ...）
 *   2. 拿不到就用关系类型兜底
 */
function bucketOf(subject, relation) {
  const platform = (subject.platform || '').trim();
  if (platform === '剧场版' || platform === 'Movie') return 'movie';
  if (platform === 'OVA' || platform === 'OAD') return 'ova';
  if (platform === '特别篇' || platform === 'TV特别篇') return 'special';
  if (platform === 'TV' || platform === 'WEB') return 'main';

  // 没 platform 就靠关系类型判断
  if (relation === '番外篇') return 'special';
  return 'main';
}

/**
 * 归集一个系列。返回：
 *   {
 *     entry: <起点 subject>,
 *     buckets: { main: [...], movie: [...], ova: [...], special: [...], other: [...] },
 *     nodes:   { [id]: subject },
 *     edges:   [{ from, to, relation }, ...]
 *   }
 */
export async function collectSeries(rootId) {
  const visited = new Map();           // id -> subject
  const incomingRelation = new Map();  // id -> 第一次被发现时的关系类型
  const edges = [];

  const queue = [{ id: Number(rootId), depth: 0 }];

  while (queue.length > 0 && visited.size < MAX_NODES) {
    const { id, depth } = queue.shift();
    if (visited.has(id)) continue;

    let subject;
    try {
      subject = await getSubject(id);
    } catch (e) {
      // 单个条目挂了不要影响整张图
      continue;
    }
    if (!subject) continue;
    visited.set(id, subject);

    if (depth >= MAX_DEPTH) continue;

    let relations;
    try {
      relations = await getRelations(id);
    } catch (e) {
      continue;
    }

    for (const r of relations) {
      edges.push({ from: id, to: r.target_id, relation: r.relation });
      if (!SAME_SERIES_RELATIONS.has(r.relation)) continue;
      if (!visited.has(r.target_id) && !incomingRelation.has(r.target_id)) {
        incomingRelation.set(r.target_id, r.relation);
        queue.push({ id: r.target_id, depth: depth + 1 });
      }
    }
  }

  // 分桶
  const buckets = { main: [], movie: [], ova: [], special: [], other: [] };
  for (const [id, subject] of visited) {
    const rel = id === Number(rootId) ? '主线故事' : incomingRelation.get(id) || '其他';
    const bucket = bucketOf(subject, rel);
    buckets[bucket].push({ ...subject, _series_relation: rel });
  }

  // 主线按放送时间排序，剧场版同样
  const byDate = (a, b) => (a.air_date || '').localeCompare(b.air_date || '');
  buckets.main.sort(byDate);
  buckets.movie.sort(byDate);
  buckets.ova.sort(byDate);
  buckets.special.sort(byDate);
  buckets.other.sort(byDate);

  return {
    entry: visited.get(Number(rootId)) || null,
    buckets,
    nodes: Object.fromEntries(visited),
    edges,
  };
}
