<template>
  <div>
    <a-page-header title="分类管理" :show-back="false">
      <template #extra>
        <a-button key="1" type="primary" @click="goToNew">添加</a-button>
      </template>
    </a-page-header>
    <div class="list-container">
      <a-list
        item-layout="horizontal"
        :data-source="categoryStore.categories"
        :loading="categoryStore.loading"
        :grid="{ gutter: 16, xs: 1, sm: 1, md: 2 }"
      >
        <template #renderItem="{ item }">
          <a-list-item>
            <a-card :title="item.name" style="width: 100%">
              <p>{{ item.description }}</p>
              <template #actions>
                <edit-outlined key="edit" @click="goToEdit(item.id)" />
                <a-popconfirm
                  title="您确定要删除这个分类吗？"
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
import { useCategoryStore } from '../stores/categoryStore';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';

const router = useRouter();
const categoryStore = useCategoryStore();

const goToNew = () => {
  router.push({ name: 'category-new' });
};

const goToEdit = (id: string) => {
  router.push({ name: 'category-edit', params: { id } });
};

const handleDelete = async (id: string) => {
  try {
    await categoryStore.deleteCategory(id);
    message.success('分类删除成功');
  } catch (error) {
    message.error('删除分类失败');
  }
};

onMounted(() => {
  categoryStore.fetchCategories();
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