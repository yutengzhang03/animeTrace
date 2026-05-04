/**
 * 番库 Pinia store
 * 把"哪些番已经在我库里、是什么状态"这种全局信息缓存起来，
 * 避免每个组件都各自请求。
 */
import { defineStore } from 'pinia';
import {
  apiLibraryList,
  apiLibraryUpsert,
  apiLibraryPatch,
  apiLibraryDelete,
  apiStats,
} from '@/api';

export const useLibraryStore = defineStore('library', {
  state: () => ({
    items: [],          // 完整列表（带 subject 元数据）
    map: {},            // subject_id -> library row（用于卡片角标）
    stats: null,
    loading: false,
  }),

  actions: {
    async fetchAll() {
      this.loading = true;
      try {
        const res = await apiLibraryList();
        this.items = res.data;
        this.map = Object.fromEntries(res.data.map(it => [it.subject_id, it]));
      } finally {
        this.loading = false;
      }
    },
    async fetchStats() {
      this.stats = await apiStats();
    },
    async upsert(subjectId, payload) {
      const row = await apiLibraryUpsert(subjectId, payload);
      this.map[subjectId] = { ...this.map[subjectId], ...row };
      // 列表是合并后的形态（带 subject 字段），简单起见整体重拉
      await this.fetchAll();
      this.fetchStats();
      return row;
    },
    async patch(subjectId, payload) {
      const row = await apiLibraryPatch(subjectId, payload);
      if (this.map[subjectId]) {
        Object.assign(this.map[subjectId], row);
      }
      const it = this.items.find(i => i.subject_id === subjectId);
      if (it) Object.assign(it, row);
      this.fetchStats();
      return row;
    },
    async remove(subjectId) {
      await apiLibraryDelete(subjectId);
      delete this.map[subjectId];
      this.items = this.items.filter(i => i.subject_id !== subjectId);
      this.fetchStats();
    },
  },
});
