<template>
  <div>
    <a-page-header title="仓库管理" :show-back="false">
      <template #extra>
        <a-button key="1" type="primary" @click="goToNew">添加</a-button>
      </template>
    </a-page-header>
    <div class="list-container">
      <a-list
        item-layout="horizontal"
        :data-source="warehouseStore.warehouses"
        :loading="warehouseStore.loading"
        :grid="{ gutter: 16, xs: 1, sm: 1, md: 2 }"
      >
        <template #renderItem="{ item }">
          <a-list-item>
            <a-card :title="item.name" style="width: 100%">
              <p><strong>位置:</strong> {{ item.location }}</p>
              <p><strong>容量:</strong> {{ item.capacity }}</p>
              <p v-if="item.description"><strong>描述:</strong> {{ item.description }}</p>
              <template #actions>
                <edit-outlined key="edit" @click="goToEdit(item.id)" />
                <a-popconfirm
                  title="您确定要删除这个仓库吗？"
                  @confirm="handleDelete(item.id)"
                  ok-text="确定"
                  cancel-text="取消"
                >
                  <delete-outlined key="delete" style="color: red" />
                </a-popconfirm>
              </template>
            </a-card>
          </a-list-item>
        </template>
      </a-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useWarehouseStore } from '../stores/warehouseStore';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';

const router = useRouter();
const warehouseStore = useWarehouseStore();

const goToNew = () => {
  router.push({ name: 'warehouse-new' });
};

const goToEdit = (id: string) => {
  router.push({ name: 'warehouse-edit', params: { id } });
};

const handleDelete = async (id: string) => {
  try {
    await warehouseStore.deleteWarehouse(id);
    message.success('仓库删除成功');
  } catch (error) {
    message.error('删除仓库失败');
  }
};

onMounted(() => {
  warehouseStore.fetchWarehouses();
});
</script>

<style scoped>
.ant-page-header {
  padding: 16px 0;
}
.list-container {
  padding: 0 16px 16px 16px;
}
.ant-list-item {
  padding: 8px 0;
}
</style>