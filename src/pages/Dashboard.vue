<template>
  <div>
    <a-page-header title="仪表盘" :show-back="false" />
    <div class="page-container">
      <a-row :gutter="[16, 16]">
        <a-col :span="12">
          <a-card>
            <a-statistic title="总库存" :value="totalItems" />
          </a-card>
        </a-col>
        <a-col :span="12">
          <a-card>
            <a-statistic title="在库" :value="inStockItems" />
          </a-card>
        </a-col>
        <a-col :span="12">
          <a-card>
            <a-statistic title="借出" :value="loanedOutItems" />
          </a-card>
        </a-col>
        <a-col :span="12">
          <a-card>
            <a-statistic title="仓库数" :value="warehouseStore.warehouses.length" />
          </a-card>
        </a-col>
      </a-row>

      <a-card title="物品状态分布" style="margin-top: 16px;">
        <Pie :data="pieChartData" :options="chartOptions" />
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useItemStore } from '../stores/itemStore';
import { useWarehouseStore } from '../stores/warehouseStore';
import { Pie } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement, CategoryScale } from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale);

const itemStore = useItemStore();
const warehouseStore = useWarehouseStore();

onMounted(() => {
  itemStore.fetchItems();
  warehouseStore.fetchWarehouses();
});

const totalItems = computed(() => itemStore.items.length);
const inStockItems = computed(() => itemStore.items.filter(i => i.status === 'in_stock').length);
const loanedOutItems = computed(() => itemStore.items.filter(i => i.status === 'loaned_out').length);

const pieChartData = computed(() => ({
  labels: ['在库', '借出', '处置'],
  datasets: [{
    backgroundColor: ['#41B883', '#E46651', '#00D8FF'],
    data: [
      inStockItems.value,
      loanedOutItems.value,
      itemStore.items.filter(i => i.status === 'disposed').length
    ]
  }]
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false
};
</script>

<style scoped>
.page-container { padding: 16px; }
</style>
