import { api } from './client';

export type AlarmStatus = 'pending' | 'done' | 'issue';

export interface ShiftLogTask {
  task_id:     number;
  result_id:   number;
  name:        string;
  alarm_time:  string;
  system_code: string;
  status:      AlarmStatus;
  note:        string;
  done_by:     string;
  done_at:     string | null;
}

export interface ShiftLog {
  id:           number;
  log_date:     string;
  shift:        string;
  submitted:    boolean;
  submitted_by: string;
  tasks:        ShiftLogTask[];
}

export interface DailyOpItem {
  no:     number;
  sys:    string;
  time:   string;
  desc:   string;
  result: string;
  detail: string;
}

export interface HandoverRecord {
  id:           number;
  handover_date: string;
  shift:        string;
  data: {
    recorder?:         string;
    abnormal?:         string;
    extra_notes?:      string;
    daily_op_summary?: string;
    daily_op_items?:   DailyOpItem[];
  };
  sent_telegram: boolean;
  updated_at:   string;
}

export interface AlarmTask {
  id:          number;
  shift:       string;
  system_code: string;
  name:        string;
  alarm_time:  string;
}

// Bangkok time helpers
export function getTodayBKK(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

export function getCurrentShift(): 'morning' | 'afternoon' | 'night' {
  const h = new Date(Date.now() + 7 * 3600 * 1000).getUTCHours();
  if (h >= 7 && h < 15)  return 'morning';
  if (h >= 15 && h < 23) return 'afternoon';
  return 'night';
}

export const SHIFT_LABEL: Record<string, string> = {
  morning:   '☀️ กะเช้า',
  afternoon: '🌤 กะบ่าย',
  night:     '🌙 กะดึก',
};

export async function getAlarmLog(date: string, shift: string): Promise<ShiftLog | null> {
  try {
    const r = await api.get(`/alarm/log?date=${date}&shift=${shift}`);
    return r.data;
  } catch { return null; }
}

export async function getHandover(date: string): Promise<HandoverRecord[]> {
  try {
    const r = await api.get(`/operation/handover?date=${date}`);
    return Array.isArray(r.data) ? r.data : [];
  } catch { return []; }
}

export async function getAlarmDue(): Promise<AlarmTask[]> {
  try {
    const r = await api.get('/alarm/due');
    return Array.isArray(r.data) ? r.data : [];
  } catch { return []; }
}

export async function ackAlarm(task_id: number, date: string): Promise<void> {
  await api.post('/alarm/ack', { task_id, date });
}
