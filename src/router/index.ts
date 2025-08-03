import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore'; // 导入 UI store

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/Login.vue'),
    meta: { title: '登录' },
  },
  
  {
    path: '/',
    component: () => import('../layouts/Default.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('../pages/Dashboard.vue'),
        meta: { title: '仪表盘' },
      },
      {
        path: 'inventory',
        name: 'inventory',
        component: () => import('../pages/InventoryView.vue'),
        meta: { title: '库存总览' },
      },
      {
        path: 'items/:id',
        name: 'item-details',
        component: () => import('../pages/ItemDetails.vue'),
        meta: { title: '物品详情' },
      },
      {
        path: 'items/edit/:id',
        name: 'item-edit',
        component: () => import('../pages/ItemEdit.vue'),
        meta: { title: '编辑物品' },
      },
      {
        path: 'warehouses',
        name: 'warehouses',
        component: () => import('../pages/WarehouseList.vue'),
        meta: { title: '仓库管理' },
      },
      {
        path: 'warehouses/new',
        name: 'warehouse-new',
        component: () => import('../pages/WarehouseForm.vue'),
        meta: { title: '新建仓库' },
      },
      {
        path: 'warehouses/edit/:id',
        name: 'warehouse-edit',
        component: () => import('../pages/WarehouseForm.vue'),
        meta: { title: '编辑仓库' },
      },
      {
        path: 'categories',
        name: 'categories',
        component: () => import('../pages/CategoryList.vue'),
        meta: { title: '分类管理' },
      },
      {
        path: 'categories/new',
        name: 'category-new',
        component: () => import('../pages/CategoryForm.vue'),
        meta: { title: '新建分类' },
      },
      {
        path: 'categories/edit/:id',
        name: 'category-edit',
        component: () => import('../pages/CategoryForm.vue'),
        meta: { title: '编辑分类' },
      },
      {
        path: 'item-definitions',
        name: 'item-definitions',
        component: () => import('../pages/ItemDefinitionList.vue'),
        meta: { title: '物品定义' },
      },
      {
        path: 'item-definitions/new',
        name: 'item-definition-new',
        component: () => import('../pages/ItemDefinitionForm.vue'),
        meta: { title: '新建定义' },
      },
      {
        path: 'item-definitions/edit/:id',
        name: 'item-definition-edit',
        component: () => import('../pages/ItemDefinitionForm.vue'),
        meta: { title: '编辑定义' },
      },
      {
        path: 'item-creation',
        name: 'item-creation',
        component: () => import('../pages/ItemCreation.vue'),
        meta: { title: '添加物品' },
      },
      {
        path: 'scan',
        name: 'scan',
        component: () => import('../pages/Scan.vue'),
        meta: { title: '扫码' },
      },
      {
        path: 'inbound',
        name: 'inbound',
        component: () => import('../pages/Inbound.vue'),
        meta: { title: '入库' },
      },
      {
        path: 'check',
        name: 'check',
        component: () => import('../pages/Check.vue'),
        meta: { title: '盘点' },
      },
      {
        path: 'me',
        name: 'me',
        component: () => import('../pages/Profile.vue'),
        meta: { title: '我的' },
      },
      {
        path: 'audit-log',
        name: 'audit-log',
        component: () => import('../pages/AuditLogView.vue'),
        meta: { title: '审计日志' },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  const uiStore = useUiStore();
  uiStore.startLoading(); // 开始加载

  const isAuthenticated = authStore.isAuthenticated;

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'login' });
  } else if (to.name === 'login' && isAuthenticated) {
    next({ path: '/' });
  } else {
    next();
  }
});

router.afterEach((to) => {
  const uiStore = useUiStore();
  // 更新页面标题
  if (to.meta.title) {
    document.title = `盘一个库 | ${to.meta.title}`;
  } else {
    document.title = '盘一个库';
  }
  uiStore.stopLoading(); // 结束加载
});

export default router;
