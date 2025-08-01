<template>
  <div>
    <a-page-header title="物品列表" />
    <vue-pull-refresh @refresh="handleRefresh">
      <div class="page-container">
        <!-- Error Alert -->
        <a-alert
          v-if="itemStore.error"
          :message="'加载失败'"
          :description="itemStore.error"
          type="error"
          show-icon
          closable
          style="margin-bottom: 16px;"
        />

        <!-- Main List -->
        <a-list
          :loading="itemStore.loading && !isRefreshing"
          :data-source="itemStore.items"
          item-layout="horizontal"
        >
          <template #renderItem="{ item }">
            <a-list-item @click="showActions(item)" :hoverable="true">
            <a-list-item-meta>
              <template #title>
                <a>{{ item.itemDefinition?.name || '未知物品' }}</a>
              </template>
              <template #description>
                <p>ID: {{ item.shortId }}</p>
                <p>仓库: {{ item.warehouse?.name || '未知仓库' }}</p>
              </template>
            </a-list-item-meta>
            <template #actions>
              <a-badge :status="getStatusColor(item.status)" :text="getStatusText(item.status)" />
            </template>
          </a-list-item>
          </template>
          
          <!-- Empty State -->
          <template #empty>
            <div v-if="!itemStore.loading">
              <a-empty description="暂无物品，请先在“入库”页面添加" />
            </div>
          </template>
        </a-list>
      </div>
    </vue-pull-refresh>

    <!-- Action Sheet -->
    <a-action-sheet
      v-model:open="actionsVisible"
      :title="`操作物品: ${selectedItem?.itemDefinition?.name}`"
      cancel-text="取消"
      @close="selectedItem = null"
    >
      <div class="action-sheet-content">
        <a-button v-if="selectedItem?.status === 'InStock'" @click="handleAction('outbound')" block>借出</a-button>
        <a-button v-if="selectedItem?.status === 'LoanedOut'" @click="handleAction('return')" block>归还</a-button>
        <a-button @click="handleAction('check')" block>盘点</a-button>
        <a-button @click="viewItemDetails(selectedItem!.id)" block>查看详情</a-button>
        <a-button v-if="selectedItem?.status !== 'Disposed'" @click="handleAction('dispose')" danger block>处置</a-button>
      </div>
    </a-action-sheet>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useItemStore, type Item, type ItemStatus } from '../stores/itemStore';
import { message } from 'ant-design-vue';

const router = useRouter();
const itemStore = useItemStore();

const actionsVisible = ref(false);
const selectedItem = ref<Item | null>(null);
const isRefreshing = ref(false);

const fetchData = async () => {
  await itemStore.fetchItems();
};

onMounted(fetchData);

const handleRefresh = async (done: () => void) => {
  isRefreshing.value = true;
  await fetchData();
  isRefreshing.value = false;
  done();
};

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

const showActions = (item: Item) => {
  selectedItem.value = item;
  actionsVisible.value = true;
};

const handleAction = async (action: 'outbound' | 'return' | 'check' | 'dispose') => {
  if (!selectedItem.value) return;
  try {
    await itemStore.updateItemStatus(selectedItem.value.id, action);
    message.success(`操作成功: ${action}`);
    actionsVisible.value = false;
  } catch (error) {
    message.error('操作失败');
  }
};

const viewItemDetails = (id: number) => {
  router.push(`/items/${id}`);
};
</script>

<style scoped>
.page-container {
  padding: 0 16px 16px 16px;
}
.action-sheet-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
