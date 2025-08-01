<template>
  <div>
    <a-page-header title="我的" :show-back="false" />
    <div class="profile-container">
      <a-card>
        <a-avatar :size="64">
          <template #icon><UserOutlined /></template>
        </a-avatar>
        <h2 class="user-name">{{ authStore.user?.name || '模拟用户' }}</h2>
        <p class="user-id">CorpID: {{ corpId }}</p>
      </a-card>

      <a-menu v-model:selectedKeys="selectedKeys" class="action-menu">
        <a-menu-item key="audit-log" @click="router.push('/audit-log')">
          <template #icon><file-search-outlined /></template>
          审计日志中心
        </a-menu-item>
        <!-- Can add more menu items here -->
      </a-menu>

      <div class="actions">
        <a-button type="primary" danger block size="large" @click="handleLogout">
          退出登录
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { UserOutlined, FileSearchOutlined } from '@ant-design/icons-vue';
import { useAuthStore } from '../stores/authStore';
import { Modal } from 'ant-design-vue';

const router = useRouter();
const authStore = useAuthStore();
const corpId = import.meta.env.VITE_DINGTALK_CORP_ID;
const selectedKeys = ref([]);

const handleLogout = () => {
  Modal.confirm({
    title: '您确定要退出登录吗？',
    okText: '确定',
    cancelText: '取消',
    onOk: () => {
      authStore.logout();
    },
  });
};
</script>

<style scoped>
.profile-container {
  padding: 16px;
}
.ant-card {
  text-align: center;
  margin-bottom: 24px;
}
.user-name {
  margin-top: 1rem;
  font-size: 1.5rem;
}
.user-id {
  color: #888;
  font-size: 0.8rem;
}
.action-menu {
  margin-bottom: 24px;
  border-radius: 8px;
}
.actions {
  margin-top: 2rem;
}
</style>