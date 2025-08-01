import { defineStore } from 'pinia';
import apiClient from '../services/api';

export interface Category {
  id: number; // Changed to number
  name: string;
  description: string;
}

export type CreateCategoryPayload = Omit<Category, 'id'>;

interface CategoryState {
  categories: Category[];
  loading: boolean;
  error: string | null;
}

export const useCategoryStore = defineStore('category', {
  state: (): CategoryState => ({
    categories: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchCategories() {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get<Category[]>('/categories');
        this.categories = response.data;
      } catch (err: any) {
        this.error = '获取分类列表失败: ' + (err.response?.data?.message || err.message);
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
    async addCategory(payload: CreateCategoryPayload) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.post<Category>('/categories', payload);
        this.categories.unshift(response.data);
      } catch (err: any) {
        this.error = '添加分类失败: ' + (err.response?.data?.message || err.message);
        console.error(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async updateCategory(category: Pick<Category, 'id'> & Partial<Category>) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.put<Category>(`/categories/${category.id}`, category);
        const index = this.categories.findIndex(c => c.id === category.id);
        if (index !== -1) {
          this.categories[index] = response.data;
        }
      } catch (err: any) {
        this.error = '更新分类失败: ' + (err.response?.data?.message || err.message);
        console.error(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async deleteCategory(id: number) {
      this.loading = true;
      this.error = null;
      try {
        await apiClient.delete(`/categories/${id}`);
        this.categories = this.categories.filter(c => c.id !== id);
      } catch (err: any) {
        this.error = '删除分类失败: ' + (err.response?.data?.message || err.message);
        console.error(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
  },
});