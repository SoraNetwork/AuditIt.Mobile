<template>
  <a-spin :spinning="uiStore.isLoading" tip="加载中..." size="large" wrapperClassName="full-screen-spin">
    <a-layout class="layout">
      <div class="content-wrapper">
        <router-view />
      </div>
      <div class="footer-tabs">
        <router-link to="/dashboard" class="tab-item">
          <dashboard-outlined />
          <span>仪表盘</span>
        </router-link>
        <router-link to="/inventory" class="tab-item">
          <database-outlined />
          <span>总览</span>
        </router-link>
        <router-link to="/item-creation" class="tab-item">
          <plus-circle-outlined />
          <span>添加</span>
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
  </a-spin>
</template>

<script setup lang="ts">
import { useUiStore } from '../stores/uiStore'; // 导入 UI store
import {
  DashboardOutlined,
  DatabaseOutlined,
  PlusCircleOutlined,
  ScanOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';

const uiStore = useUiStore(); // 获取 UI store 实例
</script>

<style>
.full-screen-spin .ant-spin-nested-loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
}
.full-screen-spin .ant-spin-spinning {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.7);
  width: 100%;
  height: 100%;
}
</style>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
  overflow: hidden; /* Prevent the whole layout from scrolling */
}
.content-wrapper {
  flex: 1; /* Take up all available space */
  overflow-y: auto; /* Enable vertical scrolling for the content area only */
  position: relative; /* Establish a positioning context */
  /* The padding-bottom is still useful to ensure there's space at the very end of the scroll */
  padding-bottom: 60px; 
}
.footer-tabs {
  width: 95vw;
  bottom: 0;
  left: 0;
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
