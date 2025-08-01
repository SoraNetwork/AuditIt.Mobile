import type { ItemStatus } from '../stores/itemStore';

export const STATUS_MAP: Record<ItemStatus, { text: string; color: string }> = {
  InStock: { text: '在库', color: 'green' },
  LoanedOut: { text: '借出', color: 'orange' },
  Disposed: { text: '处置', color: 'red' },
};
