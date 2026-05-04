<script setup>
import { ref, computed, onMounted } from 'vue';
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router';
import { useLibraryStore } from '@/stores/library';
import { useThemeStore } from '@/stores/theme';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const lib = useLibraryStore();
const theme = useThemeStore();
const auth = useAuthStore();

onMounted(async () => {
  theme.init();
  await auth.init();
  if (auth.loggedIn) {
    await Promise.all([lib.fetchAll(), lib.fetchStats()]);
  }
});

const navs = computed(() => {
  const base = [
    { to: '/search', label: '搜索' },
  ];
  if (auth.loggedIn) {
    return [
      { to: '/', label: '首页' },
      ...base,
      { to: '/library', label: '我的番库' },
      { to: '/settings', label: '设置' },
    ];
  }
  return base;
});

function logout() {
  auth.logout();
  lib.$reset();
  router.push('/login');
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-30 backdrop-blur bg-white/80 dark:bg-ink-900/80 border-b border-slate-200 dark:border-slate-700">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4 sm:gap-6">
        <RouterLink to="/" class="flex items-center gap-2 group">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-sakura-500 to-sea-500 grid place-items-center text-white font-bold shadow-card">番</div>
          <span class="font-semibold tracking-wide group-hover:text-sakura-700 transition">番迹</span>
        </RouterLink>
        <nav class="flex items-center gap-1 sm:gap-3 text-sm flex-1">
          <RouterLink
            v-for="n in navs"
            :key="n.to"
            :to="n.to"
            class="px-2 sm:px-3 py-1.5 rounded-md transition hover:bg-slate-100 dark:hover:bg-slate-800"
            :class="route.path === n.to || (n.to !== '/' && route.path.startsWith(n.to))
              ? 'text-sakura-700 font-medium bg-sakura-100/50 dark:bg-slate-800'
              : 'text-slate-600 dark:text-slate-300'"
          >
            {{ n.label }}
          </RouterLink>
        </nav>

        <!-- 用户状态 -->
        <template v-if="auth.loggedIn">
          <span class="text-xs text-slate-500 hidden sm:inline">{{ auth.user?.username }}</span>
          <button
            class="text-xs px-2 py-1 rounded-md transition border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            @click="logout"
          >
            退出
          </button>
        </template>
        <RouterLink
          v-else
          to="/login"
          class="text-xs px-3 py-1.5 rounded-md bg-sakura-500 text-white hover:bg-sakura-600 transition"
        >
          登录
        </RouterLink>

        <button
          class="text-sm w-9 h-9 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          :title="`当前主题：${theme.mode}`"
          @click="theme.set(theme.mode === 'dark' ? 'light' : theme.mode === 'light' ? 'auto' : 'dark')"
        >
          <span v-if="theme.mode === 'dark'">🌙</span>
          <span v-else-if="theme.mode === 'light'">☀️</span>
          <span v-else>🌓</span>
        </button>
      </div>
    </header>

    <!-- 主体 -->
    <main class="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <footer class="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
      数据来源 · <a class="hover:text-sakura-700 transition" href="https://bgm.tv" target="_blank" rel="noreferrer">Bangumi 番组计划</a>
    </footer>
  </div>
</template>

<style>
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
