<template>
  <div class="page-wrapper">
    <div class="fixed-content" ref="fixedContentRef">
      <a-page-header title="审计日志" @back="router.back()" />
      <div class="filter-controls">
        <a-button block @click="showFilterDrawer = true">
          <template #icon><filter-outlined /></template>
          筛选日志
        </a-button>
      </div>
    </div>

    <div class="scrollable-content" :style="{ height: scrollableHeight }">
      <a-list
        :data-source="filteredLogs"
        :loading="auditLogStore.loading"
        :split="false"
      >
        <template #renderItem="{ item }">
          <div class="list-item-wrapper">
            <a-card>
              <p><strong>{{ item.action }}</strong> - <router-link :to="{ name: 'item-details', params: { id: item.itemId } }">{{ item.itemShortId }}</router-link></p>
              <p class="log-meta">{{ new Date(item.timestamp).toLocaleString() }}</p>
              <p class="log-meta">操作人: {{ item.user }} | 仓库: {{ item.warehouseName }}</p>
            </a-card>
          </div>
        </template>
        <template #loadMore>
          <div v-if="!auditLogStore.loading && filteredLogs.length === 0" style="text-align: center; margin-top: 16px;">
            <a-empty description="没有找到符合条件的日志" />
          </div>
        </template>
      </a-list>
    </div>

    <a-drawer title="筛选日志" :width="'90%'" :open="showFilterDrawer" @close="showFilterDrawer = false">
      <a-form layout="vertical" :model="filters">
        <a-form-item label="日期范围">
          <a-range-picker v-model:value="filters.dateRange" style="width: 100%;" />
        </a-form-item>
        <a-form-item label="操作类型">
          <a-select v-model:value="filters.action" placeholder="所有类型" allow-clear>
            <a-select-option value="入库">入库</a-select-option>
            <a-select-option value="借出">借出</a-select-option>
            <a-select-option value="处置">处置</a-select-option>
            <a-select-option value="归还">归还</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="操作人">
          <a-input v-model:value="filters.user" placeholder="输入用户名" allow-clear />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="showFilterDrawer = false">关闭</a-button>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAuditLogStore } from '../stores/auditLogStore';
import { FilterOutlined } from '@ant-design/icons-vue';
import dayjs from 'dayjs';

const router = useRouter();
const auditLogStore = useAuditLogStore();

const showFilterDrawer = ref(false);
const filters = reactive<{
  dateRange: [dayjs.Dayjs, dayjs.Dayjs] | null;
  action?: string;
  user?: string;
}>({
  dateRange: null,
  action: undefined,
  user: '',
});

// Layout calculation
const fixedContentRef = ref<HTMLElement | null>(null);
const scrollableHeight = ref('400px');

const calculateHeight = () => {
  if (fixedContentRef.value) {
    const fixedHeight = fixedContentRef.value.offsetHeight;
    const bottomNavHeight = 60;
    scrollableHeight.value = `calc(100vh - ${fixedHeight}px - ${bottomNavHeight}px)`;
  }
};

const filteredLogs = computed(() => {
  return auditLogStore.logs.filter(log => {
    const timestamp = dayjs(log.timestamp);
    const dateMatch = !filters.dateRange || 
      (timestamp.isAfter(filters.dateRange[0].startOf('day')) && timestamp.isBefore(filters.dateRange[1].endOf('day')));
    const actionMatch = !filters.action || log.action === filters.action;
    const userMatch = !filters.user || log.user.toLowerCase().includes(filters.user.toLowerCase());
    return dateMatch && actionMatch && userMatch;
  });
});

onMounted(async () => {
  await auditLogStore.fetchLogs();
  await nextTick();
  calculateHeight();
});
</script>

<style scoped>
.page-wrapper {
  height: 100%;
  width: 100%;
  position: relative;
  z-index: 0;
}
.fixed-content {
  background-color: #fff;
}
.filter-controls {
  padding: 0 16px 16px 16px;
  border-bottom: 1px solid #f0f0f0;
}
.scrollable-content {
  overflow-y: auto;
  padding: 16px;
  background-color: #f5f5f5;
}
.list-item-wrapper {
  margin-bottom: 16px;
  width: 95vw;
}
.log-meta { 
  font-size: 12px; 
  color: #888; 
}
</style>