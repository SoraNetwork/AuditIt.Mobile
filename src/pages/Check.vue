<template>
  <div>
    <a-page-header title="库存盘点" @back="router.back()" />
    <div class="page-container">
      <a-form layout="vertical" :model="filterState">
        <a-form-item label="选择仓库">
          <a-select v-model:value="filterState.warehouseId" placeholder="请选择仓库" @change="loadInventory" allow-clear>
            <a-select-option v-for="wh in warehouseStore.warehouses" :key="wh.id" :value="wh.id">{{ wh.name }}</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>

      <a-list
        :data-source="inventoryData"
        :loading="itemStore.loading"
        item-layout="vertical"
      >
        <template #renderItem="{ item }">
          <a-list-item>
            <a-card :title="item.name">
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-statistic title="账面数量" :value="item.bookedQuantity" />
                </a-col>
                <a-col :span="12">
                   <a-statistic title="差异" :value="item.difference">
                     <template #formatter="{ value }">
                       <span :style="{ color: value !== 0 ? '#ff4d4f' : '#52c41a' }">{{ value }}</span>
                     </template>
                   </a-statistic>
                </a-col>
              </a-row>
              <a-divider style="margin: 12px 0;" />
              <div class="input-area">
                <span>实盘数量:</span>
                <a-input-number v-model:value="item.actualQuantity" :min="0" />
              </div>
            </a-card>
          </a-list-item>
        </template>
      </a-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useWarehouseStore } from '../stores/warehouseStore';
import { useItemStore } from '../stores/itemStore';
import { useItemDefinitionStore } from '../stores/itemDefinitionStore';

interface InventoryItem {
  itemDefinitionId: string;
  name: string;
  bookedQuantity: number;
  actualQuantity: number;
  difference: number;
}

const router = useRouter();
const warehouseStore = useWarehouseStore();
const itemStore = useItemStore();
const itemDefStore = useItemDefinitionStore();

const filterState = reactive({ warehouseId: undefined });
const inventoryData = ref<InventoryItem[]>([]);

const itemDefMap = computed(() => {
  return itemDefStore.itemDefinitions.reduce((map, def) => {
    map[def.id] = def;
    return map;
  }, {} as Record<string, { name: string }>);
});

onMounted(() => {
  warehouseStore.fetchWarehouses();
  itemDefStore.fetchItemDefinitions();
});

const loadInventory = async () => {
  if (!filterState.warehouseId) {
    inventoryData.value = [];
    return;
  }
  await itemStore.fetchItems(filterState.warehouseId);
  
  const aggregated = itemStore.items.reduce((acc, item) => {
    acc[item.itemDefinitionId] = (acc[item.itemDefinitionId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  inventoryData.value = Object.keys(aggregated).map(defId => {
    const bookedQuantity = aggregated[defId];
    return reactive({
      itemDefinitionId: defId,
      name: itemDefMap.value[defId]?.name || '未知物品',
      bookedQuantity: bookedQuantity,
      actualQuantity: bookedQuantity,
      get difference() {
        return this.actualQuantity - this.bookedQuantity;
      }
    });
  });
};
</script>

<style scoped>
.page-container { padding: 16px; }
.input-area { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
</style>
