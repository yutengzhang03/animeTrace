import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', name: 'home', component: () => import('@/views/Home.vue'), meta: { title: '番迹 · 首页', auth: true } },
  { path: '/search', name: 'search', component: () => import('@/views/Search.vue'), meta: { title: '搜索番剧' } },
  { path: '/library', name: 'library', component: () => import('@/views/Library.vue'), meta: { title: '我的番库', auth: true } },
  { path: '/subject/:id', name: 'subject', component: () => import('@/views/SubjectDetail.vue'), meta: { title: '番剧详情' } },
  { path: '/settings', name: 'settings', component: () => import('@/views/Settings.vue'), meta: { title: '设置', auth: true } },
  { path: '/login', name: 'login', component: () => import('@/views/Login.vue'), meta: { title: '登录' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

// 路由守卫：检查登录态（直接读 localStorage 避免循环依赖）
router.beforeEach((to) => {
  const hasToken = !!localStorage.getItem('fanji.token');

  if (to.meta.auth && !hasToken) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.name === 'login' && hasToken) {
    return { name: 'home' };
  }
});

router.afterEach(to => {
  if (to.meta?.title) document.title = to.meta.title;
});

export default router;
