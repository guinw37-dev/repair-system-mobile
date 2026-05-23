import { api } from './client';

export interface Repair {
  id: number; title: string; description: string;
  status: string; priority: string; category: string;
  location: string; building: string; floor: string;
  reported_by_name: string; assigned_to_name?: string;
  created_at: string; updated_at: string;
  image_url?: string;
}

export async function getRepairs(params?: Record<string, string>) {
  const { data } = await api.get('/repairs', { params });
  return data as Repair[];
}

export async function getRepair(id: number) {
  const { data } = await api.get(`/repairs/${id}`);
  return data as Repair;
}

export async function createRepair(body: Partial<Repair>) {
  const { data } = await api.post('/repairs', body);
  return data as Repair;
}

export async function updateRepair(id: number, body: Partial<Repair>) {
  const { data } = await api.put(`/repairs/${id}`, body);
  return data as Repair;
}

export async function getRepairStats() {
  const { data } = await api.get('/repairs/stats');
  return data;
}
