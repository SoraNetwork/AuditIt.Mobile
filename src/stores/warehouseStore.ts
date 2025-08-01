import { defineStore } from 'pinia';
import apiClient from '../services/api';

export interface Warehouse {
  id: number; // Changed to number
  name: string;
  location: string;
  capacity: number;
  description: string;
  createdAt: string;
}

export type CreateWarehousePayload = Omit<Warehouse, 'id' | 'createdAt'>;

interface WarehouseState {
  warehouses: Warehouse[];
  loading: boolean;
  error: string | null;
}

export const useWarehouseStore = defineStore('warehouse', {
  state: (): WarehouseState => ({
    warehouses: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchWarehouses() {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.get<Warehouse[]>('/warehouses');
        this.warehouses = response.data;
      } catch (err: any) {
        this.error = '获取仓库列表失败: ' + (err.response?.data?.message || err.message);
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
    async addWarehouse(payload: CreateWarehousePayload) {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiClient.post<Warehouse>('/warehouses', payload);
        this.warehouses.unshift(response.data);
      } catch (err: any) {
        this.error = '添加仓库失败: ' + (err.response?.data?.message || err.message);
        console.error(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async updateWarehouse(warehouse: Pick<Warehouse, 'id'> & Partial<Warehouse>) {
      this.loading = true;
      this.error = null;
      try {
        // Assuming the backend returns the updated warehouse object
        const response = await apiClient.put<Warehouse>(`/warehouses/${warehouse.id}`, warehouse);
        const index = this.warehouses.findIndex(w => w.id === warehouse.id);
        if (index !== -1) {
          this.warehouses[index] = response.data;
        }
      } catch (err: any) {
        this.error = '更新仓库失败: ' + (err.response?.data?.message || err.message);
        console.error(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async deleteWarehouse(id: number) {
      this.loading = true;
      this.error = null;
      try {
        await apiClient.delete(`/warehouses/${id}`);
        this.warehouses = this.warehouses.filter(w => w.id !== id);
      } catch (err: any) {
        this.error = '删除仓库失败: ' + (err.response?.data?.message || err.message);
        console.error(err);
        throw err;
      } finally {
        this.loading = false;
      }
    },
  },
});