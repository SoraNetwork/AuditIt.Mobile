<template>
  <div class="item-details-container">
    <a-page-header v-if="item" :title="item.itemDefinition?.name" @back="() => router.back()" />
    
    <div v-if="loading" class="loading-container">
      <a-spin size="large" />
    </div>

    <div v-else-if="item" class="content-wrapper">
      <!-- Top Details Section -->
      <div class="details-section">
        <a-descriptions bordered :column="1">
          <a-descriptions-item label="短ID">{{ item.shortId }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-badge :status="getStatusColor(item.status)" :text="getStatusText(item.status)" />
          </a-descriptions-item>
          <a-descriptions-item label="仓库">{{ item.warehouse?.name }}</a-descriptions-item>
          <a-descriptions-item label="入库日期">{{ new Date(item.entryDate).toLocaleString() }}</a-descriptions-item>
          <a-descriptions-item label="最后更新">{{ new Date(item.lastUpdated).toLocaleString() }}</a-descriptions-item>
        </a-descriptions>
      </div>

      <!-- Scrollable Log List -->
      <div class="log-list-wrapper">
        <h3 class="log-title">操作历史</h3>
        <a-list
          :loading="auditLogStore.loading"
          :data-source="auditLogStore.logs"
          size="small"
        >
          <template #renderItem="{ item: log }">
            <a-list-item>
              <a-list-item-meta>
                <template #title>{{ log.action }} - by {{ log.user }}</template>
                <template #description>{{ new Date(log.timestamp).toLocaleString() }}</template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>
      </div>
    </div>

    <a-empty v-else />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useItemStore, type ItemStatus } from '../stores/itemStore';
import { useAuditLogStore } from '../stores/auditLogStore';

const route = useRoute();
const router = useRouter();
const itemStore = useItemStore();
const auditLogStore = useAuditLogStore();

const loading = ref(true);
const itemId = route.params.id as string;

const item = computed(() => itemStore.items.find(i => i.id === itemId));

onMounted(async () => {
  loading.value = true;
  // Ensure logs are cleared before fetching new ones
  auditLogStore.logs = []; 
  
  try {
    const fetchItemPromise = item.value ? Promise.resolve() : itemStore.fetchItems({ id: itemId });
    const fetchLogsPromise = auditLogStore.fetchLogs({ itemId: itemId });
    await Promise.all([fetchItemPromise, fetchLogsPromise]);
  } catch (error) {
    console.error("Failed to load item details:", error);
  } finally {
    loading.value = false;
  }
});

const getStatusColor = (status: ItemStatus) => {
  switch (status) {
    case 'InStock': return 'success';
    case 'LoanedOut': return 'warning';
    case 'Disposed': return 'error';
    default: return 'default';
  }
};

const getStatusText = (status: ItemStatus) => {
  switch (status) {
    case 'InStock': return '在库';
    case 'LoanedOut': return '已借出';
    case 'Disposed': return '已处置';
    default: return '未知';
  }
};
</script>

<style scoped>
.item-details-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.loading-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}
.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent entire wrapper from scrolling */
}
.details-section {
  padding: 0 16px 16px 16px;
  flex-shrink: 0;
}
.log-list-wrapper {
  flex: 1;
  overflow-y: auto; /* Enable scrolling for the log list only */
  padding: 0 16px;
}
.log-title {
  margin-top: 8px;
  margin-bottom: 8px;
}
</style>
