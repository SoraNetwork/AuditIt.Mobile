<template>
  <div>
    <a-page-header title="物品定义" :show-back="false">
      <template #extra>
        <a-button key="1" type="primary" @click="goToNew">添加</a-button>
      </template>
    </a-page-header>
    <div class="list-container">
      <a-list
        item-layout="horizontal"
        :data-source="tableData"
        :loading="itemDefStore.loading"
        :grid="{ gutter: 16, xs: 1, sm: 1, md: 2 }"
      >
        <template #renderItem="{ item }">
          <a-list-item>
            <a-card :title="item.name" style="width: 100%">
              <p><strong>分类:</strong> {{ item.categoryName }}</p>
              <p><strong>单位:</strong> {{ item.unit }}</p>
              <p v-if="item.description"><strong>描述:</strong> {{ item.description }}</p>
              <template #actions>
                <edit-outlined key="edit" @click="goToEdit(item.id)" />
                <a-popconfirm
                  title="您确定要删除这个物品定义吗？"
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
import { onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useItemDefinitionStore } from '../stores/itemDefinitionStore';
import { useCategoryStore } from '../stores/categoryStore';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';

const router = useRouter();
const itemDefStore = useItemDefinitionStore();
const categoryStore = useCategoryStore();

const categoryMap = computed(() => {
  return categoryStore.categories.reduce((map, cat) => {
    map[cat.id] = cat.name;
    return map;
  }, {} as Record<string, string>);
});

const tableData = computed(() => {
  return itemDefStore.itemDefinitions.map(item => ({
    ...item,
    categoryName: categoryMap.value[item.categoryId] || 'N/A',
  }));
});

const goToNew = () => {
  router.push({ name: 'item-definition-new' });
};

const goToEdit = (id: number) => {
  router.push({ name: 'item-definition-edit', params: { id: id.toString() } });
};

const handleDelete = async (id: number) => {
  try {
    await itemDefStore.deleteItemDefinition(id);
    message.success('物品定义删除成功');
  } catch (error) {
    message.error('删除物品定义失败');
  }
};

onMounted(() => {
  itemDefStore.fetchItemDefinitions();
  if (categoryStore.categories.length === 0) {
    categoryStore.fetchCategories();
  }
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