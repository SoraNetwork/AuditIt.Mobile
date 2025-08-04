<template>
  <div>
    <a-page-header title="盘点分析" sub-title="查看盘点差异并处理" @back="() => $router.back()" />
    <div class="page-container">
      <a-card>
        <a-form :model="filterState" layout="vertical">
          <a-form-item label="选择仓库">
            <a-select v-model:value="filterState.warehouseId" placeholder="请选择仓库" allow-clear>
              <a-select-option v-for="wh in warehouseStore.warehouses" :key="wh.id" :value="wh.id">{{ wh.name }}</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="盘点日期范围">
            <a-range-picker v-model:value="filterState.dateRange" style="width: 100%" />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" @click="runAnalysis" :loading="isLoading" block>开始分析</a-button>
          </a-form-item>
        </a-form>
      </a-card>

      <a-row :gutter="[16, 16]" style="margin-top: 16px;">
        <a-col :span="24">
          <a-card title="未盘点物品 (疑似丢失)">
            <template #extra>
              <a-button type="primary" danger size="small" :disabled="Object.values(selectedItemIds).every(v => !v)" @click="markAsMissing" :loading="isMarking">
                标记为丢失
              </a-button>
            </template>
            <div class="scrollable-list">
              <a-list :data-source="unCheckedItems" :loading="isLoading" :bordered="true">
                <template #renderItem="{ item }">
                  <a-list-item>
                    <a-checkbox :value="item.id" v-model:checked="selectedItemIds[item.id]">
                      {{ item.itemDefinition?.name }} ({{ item.shortId }})
                    </a-checkbox>
                  </a-list-item>
                </template>
              </a-list>
            </div>
          </a-card>
        </a-col>
        <a-col :span="24">
          <a-card title="已盘点物品">
            <div class="scrollable-list">
              <a-list :data-source="checkedItems" :loading="isLoading" :bordered="true">
                <template #renderItem="{ item }">
                  <a-list-item>{{ item.itemDefinition?.name }} ({{ item.shortId }})</a-list-item>
                </template>
              </a-list>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import { useWarehouseStore } from '../stores/warehouseStore';
import { useItemStore, type Item } from '../stores/itemStore';
import { useAuditLogStore } from '../stores/auditLogStore';
import { message } from 'ant-design-vue';
import dayjs, { type Dayjs } from 'dayjs';

const warehouseStore = useWarehouseStore();
const itemStore = useItemStore();
const auditLogStore = useAuditLogStore();

const filterState = reactive<{
  warehouseId: number | undefined;
  dateRange: [Dayjs, Dayjs];
}>({
  warehouseId: undefined,
  dateRange: [dayjs().subtract(1, 'day'), dayjs()],
});

const isLoading = ref(false);
const isMarking = ref(false);
const checkedItems = ref<Item[]>([]);
const unCheckedItems = ref<Item[]>([]);
const selectedItemIds = ref<Record<string, boolean>>({});

onMounted(() => {
  warehouseStore.fetchWarehouses();
});

watch(() => filterState.warehouseId, () => {
  checkedItems.value = [];
  unCheckedItems.value = [];
  selectedItemIds.value = {};
});

const runAnalysis = async () => {
  if (!filterState.warehouseId) {
    message.error('请先选择一个仓库');
    return;
  }
  isLoading.value = true;
  checkedItems.value = [];
  unCheckedItems.value = [];
  selectedItemIds.value = {};

  try {
    await itemStore.fetchItems({ warehouseId: filterState.warehouseId, status: 'InStock' });
    const allItemsInStock = itemStore.items;

    await auditLogStore.fetchLogs(); 
    const startDate = filterState.dateRange[0].startOf('day').toDate();
    const endDate = filterState.dateRange[1].endOf('day').toDate();

    const checkedItemIdsInDateRange = new Set(
      auditLogStore.logs
        .filter(log =>
          log.action === 'Check' &&
          log.warehouseId === filterState.warehouseId &&
          new Date(log.timestamp) >= startDate &&
          new Date(log.timestamp) <= endDate
        )
        .map(log => log.itemId)
    );

    checkedItems.value = allItemsInStock.filter(item => checkedItemIdsInDateRange.has(item.id));
    unCheckedItems.value = allItemsInStock.filter(item => !checkedItemIdsInDateRange.has(item.id));

  } catch (error: any) {
    message.error('分析失败: ' + (error.message || error));
  } finally {
    isLoading.value = false;
  }
};

const markAsMissing = async () => {
  const idsToMark = Object.entries(selectedItemIds.value)
    .filter(([, isSelected]) => isSelected)
    .map(([id]) => id);

  if (idsToMark.length === 0) {
    message.warn('请至少选择一个物品');
    return;
  }

  isMarking.value = true;
  try {
    await itemStore.updateStatusBatch(idsToMark, 'SuspectedMissing');
    message.success('成功标记为疑似丢失');
    await runAnalysis();
  } catch (error: any) {
    message.error('标记失败: ' + (error.message || error));
  } finally {
    isMarking.value = false;
  }
};
</script>

<style scoped>
.page-container { padding: 16px; }
.scrollable-list {
  max-height: 40vh;
  overflow-y: auto;
}
</style>
