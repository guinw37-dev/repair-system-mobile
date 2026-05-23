import { api } from './client';

export interface Repair {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  location: string;
  building: string;
  floor: string;
  reported_by_name: string;
  assigned_to_name?: string;
  performed_by?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  image_url?: string;
  notes?: string;
  parts_cost?: number;
  evaluation?: number;
}

export async function getRepairs(params?: Record<string, string>) {
  const { data } = await api.get('/repairs', { params });
  return data as Repair[];
}

export async function getRepair(id: number) {
  const { data } = await api.get(`/repairs/${id}`);
  return data as Repair;
}

export async function createRepair(body: Partial<Repair> & { image?: string }) {
  const { data } = await api.post('/repairs', body);
  return data as Repair;
}

export async function updateRepair(id: number, body: Record<string, unknown>) {
  const { data } = await api.put(`/repairs/${id}`, body);
  return data as Repair;
}

export async function getRepairStats(params?: Record<string, string>) {
  const { data } = await api.get('/repairs/stats', { params });
  return data;
}

export async function getMyRepairs() {
  const { data } = await api.get('/repairs', { params: { my: '1' } });
  return data as Repair[];
}

export const STATUS_COLOR: Record<string, string> = {
  pending:     '#f59e0b',
  assigned:    '#3b82f6',
  in_progress: '#8b5cf6',
  done:        '#22c55e',
  evaluated:   '#10b981',
  cancelled:   '#ef4444',
  evaluate:    '#f59e0b',
  close:       '#64748b',
};

export const STATUS_TH: Record<string, string> = {
  pending:     'รอรับงาน',
  assigned:    'รับงานแล้ว',
  in_progress: 'กำลังซ่อม',
  done:        'เสร็จแล้ว',
  evaluated:   'ประเมินแล้ว',
  cancelled:   'ยกเลิก',
};

export const PRIORITY_COLOR: Record<string, string> = {
  critical: '#dc2626',
  urgent:   '#f97316',
  standard: '#64748b',
};

export const PRIORITY_TH: Record<string, string> = {
  critical: 'วิกฤต',
  urgent:   'เร่งด่วน',
  standard: 'ปกติ',
};
