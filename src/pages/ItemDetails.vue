<template>
  <div class="page-wrapper">
    <div class="fixed-content" ref="fixedContentRef">
      <a-page-header v-if="item" :title="item.itemDefinition?.name" @back="() => router.back()" />
      
      <div v-if="!loading && item" class="details-section">
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
    </div>

    <div v-if="loading" class="loading-container">
      <a-spin size="large" />
    </div>

    <!-- Scrollable Log List -->
    <div v-else-if="item" class="scrollable-content" :style="{ height: scrollableHeight }">
      <h3 class="log-title">操作历史</h3>
      <a-list
        :loading="auditLogStore.loading"
        :data-source="auditLogStore.logs"
        :split="false"
      >
        <template #renderItem="{ item: log }">
          <div class="list-item-wrapper">
            <a-card>
              <a-list-item-meta>
                <template #title>{{ log.action }} - by {{ log.user }}</template>
                <template #description>{{ new Date(log.timestamp).toLocaleString() }}</template>
              </a-list-item-meta>
            </a-card>
          </div>
        </template>
      </a-list>
    </div>

    <a-empty v-else />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useItemStore, type ItemStatus } from '../stores/itemStore';
import { useAuditLogStore } from '../stores/auditLogStore';

const route = useRoute();
const router = useRouter();
const itemStore = useItemStore();
const auditLogStore = useAuditLogStore();

const loading = ref(true);
const itemId = route.params.id as string;

// Layout calculation
const fixedContentRef = ref<HTMLElement | null>(null);
const scrollableHeight = ref('300px'); // Default fallback height

const item = computed(() => itemStore.items.find(i => i.id === itemId));

const calculateHeight = () => {
  if (fixedContentRef.value) {
    const fixedHeight = fixedContentRef.value.offsetHeight;
    const bottomNavHeight = 60; // Height of the Default.vue footer
    scrollableHeight.value = `calc(100vh - ${fixedHeight}px - ${bottomNavHeight}px)`;
  }
};

onMounted(async () => {
  loading.value = true;
  auditLogStore.logs = []; 
  
  try {
    const fetchItemPromise = item.value ? Promise.resolve() : itemStore.fetchItems({ id: itemId });
    const fetchLogsPromise = auditLogStore.fetchLogs({ itemId: itemId });
    await Promise.all([fetchItemPromise, fetchLogsPromise]);
  } catch (error) {
    console.error("Failed to load item details:", error);
  } finally {
    loading.value = false;
    await nextTick();
    calculateHeight();
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
.page-wrapper {
  height: 100%;
  width: 100%;
  position: relative;
  z-index: 0;
}
.fixed-content {
  background-color: #fff;
}
.details-section {
  padding: 0 16px 16px 16px;
}
.loading-container {
  padding-top: 50px;
  text-align: center;
}
.scrollable-content {
  overflow-y: auto;
  padding: 0 16px;
  background-color: #f5f5f5;
}
.log-title {
  padding-top: 16px;
  margin-bottom: 8px;
}
.list-item-wrapper {
  margin-bottom: 12px;
}
</style>
