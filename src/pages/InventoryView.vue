<template>
  <div class="inventory-view-container">
    <a-page-header title="库存总览" :show-back="false" />
    
    <!-- Filter and Search Section -->
    <div class="filter-controls">
      <a-form layout="vertical" :model="filters">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item>
              <a-select
                v-model:value="filters.warehouseId"
                placeholder="所有仓库"
                allow-clear
                @change="applyFilters"
              >
                <a-select-option v-for="wh in warehouses" :key="wh.id" :value="wh.id">
                  {{ wh.name }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item>
              <a-select
                v-model:value="filters.status"
                placeholder="所有状态"
                allow-clear
                @change="applyFilters"
              >
                <a-select-option value="InStock">在库</a-select-option>
                <a-select-option value="LoanedOut">借出</a-select-option>
                <a-select-option value="Disposed">处置</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
      <a-input-search
        v-model:value="searchText"
        placeholder="通过ID或名称搜索..."
      />
    </div>

    <!-- Data List -->
    <div class="list-wrapper">
      <a-list
        :data-source="displayData"
        :loading="isLoading"
        item-layout="vertical"
      >
        <template #renderItem="{ item }">
          <a-list-item :key="item.id">
            <router-link :to="{ name: 'item-details', params: { id: item.id } }">
              <a-card hoverable>
                <template #title>
                  <span class="card-title">{{ item.name }}</span>
                </template>
                <template #extra>
                  <a-tag :color="statusDisplay(item.status).color">
                    {{ statusDisplay(item.status).text }}
                  </a-tag>
                </template>
                <p><strong>可视化ID:</strong> {{ item.shortId }}</p>
                <p><strong>所在仓库:</strong> {{ item.warehouseName }}</p>
                <p class="item-id"><strong>UUID:</strong> {{ item.id }}</p>
              </a-card>
            </router-link>
          </a-list-item>
        </template>

        <template #empty>
          <a-empty v-if="!isLoading" description="没有找到物品">
            <a-button type="primary" @click="router.push('/inbound')">立即入库</a-button>
          </a-empty>
        </template>
      </a-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { useItemStore, type Item, type ItemStatus } from '../stores/itemStore';
import { useWarehouseStore, type Warehouse } from '../stores/warehouseStore';
import { STATUS_MAP } from '../utils/constants';

const router = useRouter();
const itemStore = useItemStore();
const warehouseStore = useWarehouseStore();

// --- Local State ---
const isLoading = ref(true);
const items = ref<Item[]>([]);
const warehouses = ref<Warehouse[]>([]);
const searchText = ref('');
const filters = reactive<{ warehouseId?: number; status?: ItemStatus }>({
  warehouseId: undefined,
  status: undefined,
});

const statusDisplay = (status: ItemStatus) => {
  return STATUS_MAP[status] || { text: '未知', color: 'gray' };
};

// --- Data Fetching ---
const fetchData = async () => {
  isLoading.value = true;
  try {
    await Promise.all([
      itemStore.fetchItems({ ...filters }),
      warehouseStore.fetchWarehouses(),
    ]);
    items.value = itemStore.items;
    warehouses.value = warehouseStore.warehouses;
  } catch (error) {
    console.error("Failed to fetch inventory data:", error);
    message.error("加载库存数据失败");
    items.value = [];
  } finally {
    isLoading.value = false;
  }
};

// --- Lifecycle Hooks ---
onMounted(() => {
  fetchData();
});

// --- Computed Properties ---
const displayData = computed(() => {
  const formattedItems = items.value.map(item => ({
    ...item,
    name: item.itemDefinition?.name || '未知物品',
    warehouseName: item.warehouse?.name || '未知仓库',
  }));

  if (searchText.value) {
    const lowerCaseQuery = searchText.value.toLowerCase();
    return formattedItems.filter(item =>
      item.name.toLowerCase().includes(lowerCaseQuery) ||
      item.shortId.toLowerCase().includes(lowerCaseQuery)
    );
  }
  
  return formattedItems;
});

// --- Methods ---
const applyFilters = () => {
  fetchData();
};
</script>

<style scoped>
.inventory-view-container {
  display: flex;
  flex-direction: column;
  height: 100%; /* Crucial for flexbox layout */
}
.filter-controls {
  padding: 0 16px 16px 16px;
  flex-shrink: 0; /* Prevent this area from shrinking */
}
.list-wrapper {
  flex: 1; /* Take up all remaining space */
  overflow-y: auto; /* Enable scrolling for this area only */
  padding: 0 16px;
}
.card-title {
  font-weight: 600;
}
.item-id {
  font-size: 10px;
  color: #888;
  word-break: break-all;
  margin-top: 8px;
}
.ant-form-item {
  margin-bottom: 8px;
}
:deep(.ant-list-item) {
  flex-shrink: 0;
}
</style>
