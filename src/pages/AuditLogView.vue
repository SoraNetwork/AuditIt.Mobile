<template>
  <div>
    <a-page-header title="审计日志" @back="router.back()" />
    <div class="page-container">
      <!-- 筛选功能可以放在一个抽屉里 -->
      <a-button block @click="showFilterDrawer = true" style="margin-bottom: 16px;">
        <template #icon><filter-outlined /></template>
        筛选日志
      </a-button>

      <a-list
        :data-source="filteredLogs"
        :loading="auditLogStore.loading"
        item-layout="vertical"
      >
        <template #renderItem="{ item }">
          <a-list-item>
            <a-card>
              <p><strong>{{ item.action }}</strong> - <router-link :to="{ name: 'item-details', params: { id: item.itemId } }">{{ item.itemShortId }}</router-link></p>
              <p class="log-meta">{{ item.timestamp }}</p>
              <p class="log-meta">操作人: {{ item.user }} | 仓库: {{ item.warehouseName }}</p>
            </a-card>
          </a-list-item>
        </template>
        <template #loadMore>
          <div v-if="!auditLogStore.loading && filteredLogs.length === 0" style="text-align: center; margin-top: 16px;">
            <a-empty description="没有找到符合条件的日志" />
          </div>
        </template>
      </a-list>

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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
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

onMounted(() => {
  auditLogStore.fetchLogs();
});
</script>

<style scoped>
.page-container { padding: 16px; }
.log-meta { font-size: 12px; color: #888; }
</style>
