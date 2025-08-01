<template>
  <a-layout class="layout">
    <a-layout-content class="content">
      <router-view />
    </a-layout-content>
    <div class="footer-tabs">
      <router-link to="/dashboard" class="tab-item">
        <dashboard-outlined />
        <span>仪表盘</span>
      </router-link>
      <router-link to="/inventory" class="tab-item">
        <database-outlined />
        <span>总览</span>
      </router-link>
      <router-link to="/scan" class="tab-item">
        <scan-outlined />
        <span>操作</span>
      </router-link>
      <router-link to="/me" class="tab-item">
        <user-outlined />
        <span>我的</span>
      </router-link>
    </div>
  </a-layout>
</template>

<script setup lang="ts">
import {
  DashboardOutlined,
  DatabaseOutlined,
  ScanOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
// The selected state will now be handled automatically by Vue Router's active classes
</script>

<style scoped>
.layout {
  min-height: 100vh;
  background: #f5f5f5;
}
.content {
  /* Add padding to the bottom to prevent content from being hidden by the fixed footer */
  padding-bottom: 60px; 
}
.footer-tabs {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 60px; /* Fixed height for stability */
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
  z-index: 10;
  display: flex; /* Use Flexbox for the container */
  align-items: center; /* Vertically center all items */
  justify-content: space-around; /* Distribute items evenly */
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
}
.tab-item {
  flex: 1; /* Each item takes up equal space */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #888; /* Default color for inactive items */
  text-decoration: none;
  gap: 4px;
  font-size: 12px;
}
.tab-item .anticon {
  font-size: 20px;
}
/* This is Vue Router's default class for the active link */
.router-link-active,
.router-link-exact-active {
  color: #1677ff; /* Ant Design's primary color for active items */
}
</style>