/**
 * 多用户鉴权中间件
 * ----------------------------------------
 * 从 Authorization: Bearer <token> 解析当前用户。
 *
 *  requireAuth  —— 所有写操作都需要登录
 *  optionalAuth —— 尝试解析用户，没登录也放行（用于可选场景）
 */
import { parseToken } from '../db.js';

/**
 * 解析 token 并挂到 req.user = { id, u(sername) }
 */
function extractUser(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.headers['x-fanji-token'] || '');
  if (!token) return null;
  return parseToken(token);
}

/**
 * 必须登录才能访问（写操作用）
 */
export function requireAuth(req, res, next) {
  const user = extractUser(req);
  if (!user) {
    return res.status(401).json({ error: '请先登录' });
  }
  req.user = user;
  next();
}

/**
 * 可选登录（读操作也想知道当前用户时用）
 */
export function optionalAuth(req, res, next) {
  req.user = extractUser(req) || null;
  next();
}
