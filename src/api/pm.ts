import { api } from './client';

export async function getPmRecords(params: Record<string, string | number>) {
  const { data } = await api.get('/pm/records', { params });
  return data;
}

export async function getPmDashboardYearly(year: number) {
  const { data } = await api.get('/pm/dashboard/yearly', { params: { year } });
  return data;
}

export async function getPmDashboard(year: number, month: number) {
  const { data } = await api.get('/pm/dashboard', { params: { year, month } });
  return data;
}

export async function updatePmRecord(id: number, body: Record<string, unknown>) {
  const { data } = await api.put(`/pm/records/${id}`, body);
  return data;
}

export async function getPmAssets(params?: Record<string, string>) {
  const { data } = await api.get('/pm/assets', { params });
  return data;
}
