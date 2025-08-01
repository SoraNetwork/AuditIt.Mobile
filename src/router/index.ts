import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/authStore';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/Login.vue'),
  },
  {
    path: '/dingtalk-oauth',
    name: 'dingtalk-oauth',
    component: () => import('../pages/DingtalkOAuth.vue'),
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
      },
      {
        path: 'inventory',
        name: 'inventory',
        component: () => import('../pages/InventoryView.vue'),
      },
      {
        path: 'items/:id', // Changed for clarity
        name: 'item-details',
        component: () => import('../pages/ItemDetails.vue'),
      },
      {
        path: 'warehouses',
        name: 'warehouses',
        component: () => import('../pages/WarehouseList.vue'),
      },
      {
        path: 'warehouses/new',
        name: 'warehouse-new',
        component: () => import('../pages/WarehouseForm.vue'),
      },
      {
        path: 'warehouses/edit/:id',
        name: 'warehouse-edit',
        component: () => import('../pages/WarehouseForm.vue'),
      },
      {
        path: 'categories',
        name: 'categories',
        component: () => import('../pages/CategoryList.vue'),
      },
      {
        path: 'categories/new',
        name: 'category-new',
        component: () => import('../pages/CategoryForm.vue'),
      },
      {
        path: 'categories/edit/:id',
        name: 'category-edit',
        component: () => import('../pages/CategoryForm.vue'),
      },
      {
        path: 'item-definitions',
        name: 'item-definitions',
        component: () => import('../pages/ItemDefinitionList.vue'),
      },
      {
        path: 'item-definitions/new',
        name: 'item-definition-new',
        component: () => import('../pages/ItemDefinitionForm.vue'),
      },
      {
        path: 'item-definitions/edit/:id',
        name: 'item-definition-edit',
        component: () => import('../pages/ItemDefinitionForm.vue'),
      },
      {
        path: 'scan',
        name: 'scan',
        component: () => import('../pages/Scan.vue'),
      },
      {
        path: 'inbound',
        name: 'inbound',
        component: () => import('../pages/Inbound.vue'),
      },
      {
        path: 'check',
        name: 'check',
        component: () => import('../pages/Check.vue'),
      },
      {
        path: 'me',
        name: 'me',
        component: () => import('../pages/Profile.vue'),
      },
      {
        path: 'audit-log',
        name: 'audit-log',
        component: () => import('../pages/AuditLogView.vue'),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const isAuthenticated = authStore.isAuthenticated;

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'login' });
  } else if (to.name === 'login' && isAuthenticated) {
    next({ path: '/' });
  } else {
    next();
  }
});

export default router;