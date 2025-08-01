<template>
  <div>
    <a-page-header v-if="item" :title="item.itemDefinition?.name" @back="() => router.back()" />
    <div v-if="loading" class="loading-container">
      <a-spin size="large" />
    </div>
    <div v-else-if="item" class="page-container">
      <a-descriptions bordered :column="1">
        <a-descriptions-item label="短ID">{{ item.shortId }}</a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-badge :status="getStatusColor(item.status)" :text="getStatusText(item.status)" />
        </a-descriptions-item>
        <a-descriptions-item label="仓库">{{ item.warehouse?.name }}</a-descriptions-item>
        <a-descriptions-item label="入库日期">{{ new Date(item.entryDate).toLocaleString() }}</a-descriptions-item>
        <a-descriptions-item label="最后更新">{{ new Date(item.lastUpdated).toLocaleString() }}</a-descriptions-item>
      </a-descriptions>

      <h3 style="margin-top: 24px;">操作历史</h3>
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
  // Fetch the specific item if it's not already in the store
  if (!item.value) {
    await itemStore.fetchItems({ id: itemId });
  }
  // Fetch audit logs for this item
  await auditLogStore.fetchLogs({ itemId: itemId });
  loading.value = false;
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
.page-container {
  padding: 16px;
}
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}
</style>