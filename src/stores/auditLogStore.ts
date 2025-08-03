import { defineStore } from 'pinia';
import apiClient from '../services/api';

// This interface must match the backend C# model
export interface AuditLog {
  id: number;
  timestamp: string;
  action: string;
  itemId: string; // Changed to string
  itemShortId: string;
  itemName: string;
  warehouseId: number;
  warehouseName: string;
  user: string;
  destination?: string;
}

interface AuditLogState {
  logs: AuditLog[];
  loading: boolean;
  error: string | null;
}

export const useAuditLogStore = defineStore('auditLog', {
  state: (): AuditLogState => ({
    logs: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchLogs(filters: { itemId?: string } = {}) { // Changed to string
      this.loading = true;
      this.error = null;
      try {
        const params = new URLSearchParams();
        if (filters.itemId) {
          params.append('itemId', filters.itemId); // No more toString()
        }
        
        const response = await apiClient.get<AuditLog[]>(`/auditLogs?${params.toString()}`);
        this.logs = response.data;
      } catch (err: any) {
        this.error = '获取审计日志失败: ' + (err.response?.data?.message || err.message);
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
  },
});