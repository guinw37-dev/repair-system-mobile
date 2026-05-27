import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getAlarmLog, getHandover, updateTaskResult,
  getTodayBKK, getCurrentShift,
  SHIFT_LABEL, ShiftLogTask, HandoverRecord, DailyOpItem, AlarmStatus,
} from '../api/operation';
import { useAuth } from '../context/AuthContext';

const NAVY   = '#1f4e79';
const ORANGE = '#c55a11';

const SYS_COLOR: Record<string, string> = {
  EE: '#e67e22', SAN: '#17a2b8', Lift: '#6f42c1', FP: '#dc3545', COM: '#6c757d',
};

function statusColor(s: string) {
  if (s === 'done')  return '#16a34a';
  if (s === 'issue') return '#dc2626';
  return '#94a3b8';
}
function statusLabel(s: string) {
  if (s === 'done')  return '✅ เสร็จ';
  if (s === 'issue') return '⚠️ แจ้งปัญหา';
  return '⏳ รอ';
}
function resultIcon(r: string) {
  if (r === '✓' || r === 'ปกติ') return '✅';
  if (r === '×') return '❌';
  return '—';
}

function SysBadge({ sys }: { sys: string }) {
  return (
    <View style={[s.sysBadge, { backgroundColor: SYS_COLOR[sys] ?? '#6c757d' }]}>
      <Text style={s.sysTxt}>{sys}</Text>
    </View>
  );
}

// ── Tappable TaskRow ──────────────────────────────────────────────────
function TaskRow({ t, onTap }: { t: ShiftLogTask; onTap: (t: ShiftLogTask) => void }) {
  return (
    <TouchableOpacity style={s.taskRow} onPress={() => onTap(t)} activeOpacity={0.7}>
      <View style={s.taskLeft}>
        <SysBadge sys={t.system_code} />
        <View style={{ flex: 1 }}>
          <Text style={s.taskName}>{t.name}</Text>
          {t.note ? <Text style={s.taskNote}>{t.note}</Text> : null}
          {t.done_by ? <Text style={s.taskNote}>👤 {t.done_by}</Text> : null}
        </View>
      </View>
      <View style={s.taskRight}>
        <Text style={s.taskTime}>{(t.alarm_time || '').slice(0, 5)}</Text>
        <View style={[s.statusBadge, { backgroundColor: statusColor(t.status) + '22' }]}>
          <Text style={[s.statusTxt, { color: statusColor(t.status) }]}>
            {statusLabel(t.status)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
      </View>
    </TouchableOpacity>
  );
}

function DailyOpRow({ it }: { it: DailyOpItem }) {
  return (
    <View style={s.opRow}>
      <Text style={s.opNo}>{it.no}</Text>
      <SysBadge sys={it.sys} />
      <Text style={s.opTime}>{it.time}</Text>
      <Text style={s.opDesc} numberOfLines={1}>{it.desc}</Text>
      <Text style={s.opResult}>{resultIcon(it.result)}</Text>
    </View>
  );
}

function HandoverCard({ rec }: { rec: HandoverRecord }) {
  const [open, setOpen] = useState(false);
  const d = rec.data;
  const items = d.daily_op_items || [];
  const done  = items.filter(i => i.result === '✓' || i.result === 'ปกติ').length;

  return (
    <View style={s.hvCard}>
      <View style={s.hvHeader}>
        <Text style={s.hvShift}>{SHIFT_LABEL[rec.shift] ?? rec.shift}</Text>
        {rec.sent_telegram && (
          <View style={s.tgBadge}><Text style={s.tgTxt}>📨 ส่งแล้ว</Text></View>
        )}
      </View>
      {d.recorder    ? <Text style={s.hvMeta}>👤 {d.recorder}</Text> : null}
      {d.abnormal    ? <View style={s.abnBox}><Text style={s.abnTxt}>⚠️ {d.abnormal}</Text></View> : null}
      {d.extra_notes ? <Text style={s.hvMeta}>📌 {d.extra_notes}</Text> : null}
      {items.length > 0 && (
        <TouchableOpacity style={s.opToggle} onPress={() => setOpen(v => !v)}>
          <Ionicons name="list-outline" size={14} color={NAVY} />
          <Text style={s.opToggleTxt}>Daily Op ✓ {done}/{items.length}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color="#888" />
        </TouchableOpacity>
      )}
      {open && items.map((it, i) => <DailyOpRow key={i} it={it} />)}
    </View>
  );
}

// ── Update Task Modal ─────────────────────────────────────────────────
function TaskUpdateModal({
  task, visible, onClose, onSaved,
}: {
  task: ShiftLogTask | null;
  visible: boolean;
  onClose: () => void;
  onSaved: (resultId: number, status: AlarmStatus, note: string) => void;
}) {
  const { user } = useAuth();
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) setNote(task.note || '');
  }, [task]);

  async function save(status: AlarmStatus) {
    if (!task) return;
    setSaving(true);
    try {
      await updateTaskResult(task.result_id, status, note, user?.name || '');
      onSaved(task.result_id, status, note);
      onClose();
    } catch (e: any) {
      Alert.alert('ไม่สำเร็จ', e?.response?.data?.error || e.message);
    } finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.sheet}>
          {/* Header */}
          <View style={m.header}>
            <Text style={m.title} numberOfLines={2}>{task?.name}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Current status */}
          <View style={[m.currentBadge, { backgroundColor: statusColor(task?.status || 'pending') + '22' }]}>
            <Text style={[m.currentTxt, { color: statusColor(task?.status || 'pending') }]}>
              สถานะปัจจุบัน: {statusLabel(task?.status || 'pending')}
            </Text>
          </View>

          {/* Note input */}
          <Text style={m.label}>บันทึก / หมายเหตุ</Text>
          <TextInput
            style={m.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="ระบุรายละเอียด (ถ้ามี)..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Action buttons */}
          {saving ? (
            <ActivityIndicator color={NAVY} style={{ marginTop: 16 }} />
          ) : (
            <View style={m.btnRow}>
              <TouchableOpacity
                style={[m.btn, { backgroundColor: '#16a34a' }]}
                onPress={() => save('done')}
              >
                <Text style={m.btnTxt}>✅ เสร็จแล้ว</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[m.btn, { backgroundColor: '#dc2626' }]}
                onPress={() => save('issue')}
              >
                <Text style={m.btnTxt}>⚠️ แจ้งปัญหา</Text>
              </TouchableOpacity>
            </View>
          )}

          {task?.status !== 'pending' && !saving && (
            <TouchableOpacity style={m.resetBtn} onPress={() => save('pending')}>
              <Text style={m.resetTxt}>↩ รีเซ็ตเป็น รอดำเนินการ</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────
export default function OperationScreen() {
  const today = getTodayBKK();
  const shift = getCurrentShift();

  const [log,        setLog]        = useState<ShiftLogTask[]>([]);
  const [handovers,  setHandovers]  = useState<HandoverRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab,        setTab]        = useState<'alarm' | 'handover'>('alarm');
  const [selected,   setSelected]   = useState<ShiftLogTask | null>(null);
  const [modalOpen,  setModalOpen]  = useState(false);

  const load = useCallback(async () => {
    const [lg, hv] = await Promise.all([
      getAlarmLog(today, shift),
      getHandover(today),
    ]);
    setLog(lg?.tasks ?? []);
    setHandovers(hv);
  }, [today, shift]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  function handleTap(t: ShiftLogTask) {
    setSelected(t);
    setModalOpen(true);
  }

  function handleSaved(resultId: number, status: AlarmStatus, note: string) {
    setLog(prev => prev.map(t =>
      t.result_id === resultId ? { ...t, status, note } : t
    ));
  }

  const done    = log.filter(t => t.status === 'done').length;
  const issues  = log.filter(t => t.status === 'issue').length;
  const pending = log.filter(t => t.status === 'pending').length;

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Shift header */}
        <View style={s.shiftHeader}>
          <Text style={s.shiftLabel}>{SHIFT_LABEL[shift]}</Text>
          <Text style={s.shiftDate}>{today}</Text>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          {[
            { label: 'เสร็จ',        val: done,    color: '#16a34a' },
            { label: 'แจ้งปัญหา',   val: issues,  color: '#dc2626' },
            { label: 'รอดำเนินการ', val: pending, color: '#94a3b8' },
          ].map(st => (
            <View key={st.label} style={[s.statBox, { borderTopColor: st.color }]}>
              <Text style={[s.statNum, { color: st.color }]}>{st.val}</Text>
              <Text style={s.statLbl}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={s.tabRow}>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'alarm' && s.tabActive]}
            onPress={() => setTab('alarm')}
          >
            <Text style={[s.tabTxt, tab === 'alarm' && s.tabActiveTxt]}>⏰ รายการ Alarm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'handover' && s.tabActive]}
            onPress={() => setTab('handover')}
          >
            <Text style={[s.tabTxt, tab === 'handover' && s.tabActiveTxt]}>📋 ส่งเวรวันนี้</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={NAVY} style={{ marginTop: 40 }} />
        ) : tab === 'alarm' ? (
          log.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="alarm-outline" size={48} color="#ccc" />
              <Text style={s.emptyTxt}>ยังไม่มีรายการกะนี้</Text>
            </View>
          ) : (
            <>
              <Text style={s.tapHint}>กดที่รายการเพื่ออัพเดทสถานะ</Text>
              {log.map(t => <TaskRow key={t.task_id} t={t} onTap={handleTap} />)}
            </>
          )
        ) : (
          handovers.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="document-outline" size={48} color="#ccc" />
              <Text style={s.emptyTxt}>ยังไม่มีการส่งเวรวันนี้</Text>
            </View>
          ) : (
            handovers.map(h => <HandoverCard key={h.id} rec={h} />)
          )
        )}
      </ScrollView>

      {/* Update modal */}
      <TaskUpdateModal
        task={selected}
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  content:   { padding: 16, paddingBottom: 32 },

  shiftHeader: {
    backgroundColor: ORANGE, borderRadius: 12, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  shiftLabel: { fontSize: 18, fontWeight: '700', color: '#fff' },
  shiftDate:  { fontSize: 12, color: '#ffe0cc' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10,
    borderTopWidth: 3, padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statNum: { fontSize: 22, fontWeight: '700' },
  statLbl: { fontSize: 11, color: '#888', marginTop: 2 },

  tabRow:      { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#fff',
    alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0',
  },
  tabActive:    { backgroundColor: NAVY, borderColor: NAVY },
  tabTxt:       { fontSize: 13, color: '#64748b', fontWeight: '600' },
  tabActiveTxt: { color: '#fff' },

  tapHint: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginBottom: 8 },

  taskRow: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  taskLeft:  { flexDirection: 'row', gap: 10, flex: 1, alignItems: 'flex-start' },
  taskRight: { alignItems: 'flex-end', gap: 6, marginLeft: 8 },
  taskName:  { fontSize: 13, color: '#1e293b', fontWeight: '600', flexShrink: 1 },
  taskNote:  { fontSize: 11, color: '#888', marginTop: 2 },
  taskTime:  { fontSize: 13, fontWeight: '700', color: NAVY },

  sysBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  sysTxt:   { fontSize: 10, color: '#fff', fontWeight: '700' },

  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusTxt:   { fontSize: 11, fontWeight: '600' },

  hvCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    borderLeftWidth: 4, borderLeftColor: ORANGE,
  },
  hvHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  hvShift:  { fontSize: 15, fontWeight: '700', color: NAVY },
  tgBadge:  { backgroundColor: '#dbeafe', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  tgTxt:    { fontSize: 11, color: '#1d4ed8' },
  hvMeta:   { fontSize: 12, color: '#555', marginBottom: 4 },
  abnBox:   { backgroundColor: '#fff9e6', borderRadius: 6, padding: 8, marginBottom: 6 },
  abnTxt:   { fontSize: 12, color: '#92400e' },
  opToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6,
    backgroundColor: '#f0fff4', borderRadius: 6, padding: 8,
  },
  opToggleTxt: { flex: 1, fontSize: 12, color: NAVY, fontWeight: '600' },
  opRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  opNo:     { fontSize: 10, color: '#aaa', width: 18, textAlign: 'center' },
  opTime:   { fontSize: 10, color: '#666', width: 46 },
  opDesc:   { flex: 1, fontSize: 11, color: '#334155' },
  opResult: { fontSize: 14, width: 24, textAlign: 'center' },

  empty:    { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyTxt: { fontSize: 14, color: '#aaa' },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#0006', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 14, gap: 12,
  },
  title:       { flex: 1, fontSize: 16, fontWeight: '700', color: '#1e293b' },
  currentBadge:{ borderRadius: 8, padding: 10, marginBottom: 14 },
  currentTxt:  { fontSize: 13, fontWeight: '600' },
  label:       { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  noteInput: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 8, padding: 12, fontSize: 14, minHeight: 80,
  },
  btnRow:  { flexDirection: 'row', gap: 12, marginTop: 16 },
  btn: {
    flex: 1, paddingVertical: 14, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  btnTxt:  { color: '#fff', fontSize: 15, fontWeight: '700' },
  resetBtn:{ alignItems: 'center', marginTop: 12, paddingVertical: 8 },
  resetTxt:{ fontSize: 13, color: '#94a3b8' },
});
