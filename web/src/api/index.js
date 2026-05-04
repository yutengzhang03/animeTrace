/**
 * 后端接口封装（多用户版）
 * - dev 模式下走 vite proxy 代理 /api → http://localhost:3001
 * - 生产/单端口模式下，前端和后端是同源，直接 /api
 *
 * 自动从 localStorage 读取 token 并加到请求头 Authorization: Bearer ...
 */
import axios from 'axios';

const TOKEN_KEY = 'fanji.token';
const USER_KEY = 'fanji.user';

const http = axios.create({
  baseURL: '/api',
  timeout: 20000,
});

// 请求拦截：把 token 塞进头
http.interceptors.request.use(cfg => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) cfg.headers['Authorization'] = `Bearer ${t}`;
  return cfg;
});

// 响应拦截：把 .data 直接吐出，错误归一
http.interceptors.response.use(
  r => r.data,
  err => {
    const status = err.response?.status;
    const msg = err.response?.data?.error || err.message || '网络错误';
    const e = new Error(msg);
    e.status = status;
    return Promise.reject(e);
  },
);

// 健康
export const apiHealth = () => http.get('/health');

// 认证
export const apiRegister = (username, password) => http.post('/auth/register', { username, password });
export const apiLogin = (username, password) => http.post('/auth/login', { username, password });
export const apiAuthMe = () => http.get('/auth/me');

// 搜索
export const apiSearch = (q, params = {}) =>
  http.get('/search', { params: { q, ...params } });

// 番剧详情
export const apiSubject = (id, opts = {}) => http.get(`/subjects/${id}`, { params: opts });

// 系列归集
export const apiSeries = id => http.get(`/subjects/${id}/series`);

// 个人番库
export const apiLibraryList = (params = {}) => http.get('/library', { params });
export const apiLibraryGet = id => http.get(`/library/${id}`);
export const apiLibraryUpsert = (id, data) => http.put(`/library/${id}`, data);
export const apiLibraryPatch = (id, data) => http.patch(`/library/${id}`, data);
export const apiLibraryDelete = id => http.delete(`/library/${id}`);

// 统计
export const apiStats = () => http.get('/stats');

// localStorage token/user 读写（auth store 用）
export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY) || '',
  set: t => localStorage.setItem(TOKEN_KEY, t),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export const userStorage = {
  get: () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  },
  set: u => localStorage.setItem(USER_KEY, JSON.stringify(u)),
};

// 状态映射（前端展示用）
export const STATUS_LIST = [
  { value: 'wish',    label: '想看', color: 'sakura', icon: '✦' },
  { value: 'doing',   label: '在看', color: 'sea',    icon: '▶' },
  { value: 'done',    label: '看过', color: 'green',  icon: '✓' },
  { value: 'on_hold', label: '搁置', color: 'amber',  icon: '⏸' },
  { value: 'dropped', label: '弃番', color: 'gray',   icon: '✗' },
];

export const STATUS_LABEL = Object.fromEntries(STATUS_LIST.map(s => [s.value, s.label]));
