/**
 * 鉴权 store（多用户版）
 * ----------------------------------------
 * 管理登录/注册/登出，持久化 token 和用户信息到 localStorage。
 *
 *  loggedIn   是否已登录
 *  user       { id, username }
 */
import { defineStore } from 'pinia';
import { apiLogin, apiRegister, apiAuthMe, tokenStorage, userStorage } from '@/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: tokenStorage.get(),
    user: userStorage.get(),
    inited: false,
  }),
  getters: {
    loggedIn: s => !!s.token && !!s.user,
  },
  actions: {
    async init() {
      // 如果有 token，尝试验证是否还有效
      if (this.token) {
        try {
          const me = await apiAuthMe();
          this.user = { id: me.id, username: me.username };
          userStorage.set(this.user);
        } catch {
          // token 过期或无效，清掉
          this.logout();
        }
      }
      this.inited = true;
    },
    async login(username, password) {
      const res = await apiLogin(username, password);
      this.token = res.token;
      this.user = res.user;
      tokenStorage.set(res.token);
      userStorage.set(res.user);
      return true;
    },
    async register(username, password) {
      const res = await apiRegister(username, password);
      this.token = res.token;
      this.user = res.user;
      tokenStorage.set(res.token);
      userStorage.set(res.user);
      return true;
    },
    logout() {
      this.token = '';
      this.user = null;
      tokenStorage.clear();
    },
  },
});
