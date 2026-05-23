import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getRepairs, Repair } from '../api/repairs';

const STATUS_COLOR: Record<string, string> = {
  pending:     '#f59e0b',
  assigned:    '#3b82f6',
  in_progress: '#8b5cf6',
  done:        '#22c55e',
  cancelled:   '#ef4444',
};
const STATUS_TH: Record<string, string> = {
  pending: 'รอรับ', assigned: 'รับแล้ว',
  in_progress: 'กำลังซ่อม', done: 'เสร็จ', cancelled: 'ยกเลิก',
};
const PRIORITY_COLOR: Record<string, string> = {
  critical: '#dc2626', urgent: '#f97316', standard: '#64748b',
};

export default function RepairListScreen() {
  const nav = useNavigation<any>();
  const [items, setItems]       = useState<Repair[]>([]);
  const [filtered, setFiltered] = useState<Repair[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await getRepairs(statusFilter ? { status: statusFilter } : undefined);
      setItems(data);
      setFiltered(data);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search) { setFiltered(items); return; }
    const q = search.toLowerCase();
    setFiltered(items.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.location?.toLowerCase().includes(q) ||
      r.reported_by_name?.toLowerCase().includes(q)
    ));
  }, [search, items]);

  const STATUS_TABS = ['', 'pending', 'assigned', 'in_progress', 'done'];

  return (
    <View style={s.container}>
      {/* Search */}
      <View style={s.searchRow}>
        <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
        <TextInput
          style={s.search} placeholder="ค้นหา..." value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Status filter tabs */}
      <View style={s.tabs}>
        {STATUS_TABS.map(st => (
          <TouchableOpacity key={st} onPress={() => setStatusFilter(st)}
            style={[s.tab, statusFilter === st && s.tabActive]}>
            <Text style={[s.tabTxt, statusFilter === st && s.tabTxtActive]}>
              {st ? STATUS_TH[st] : 'ทั้งหมด'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <ActivityIndicator style={{ flex: 1 }} size="large" color="#1f4e79" />
        : (
          <FlatList
            data={filtered}
            keyExtractor={r => String(r.id)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
            contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
            renderItem={({ item: r }) => (
              <TouchableOpacity style={s.card} onPress={() => nav.navigate('RepairDetail', { id: r.id })}>
                <View style={s.cardTop}>
                  <View style={[s.statusBadge, { backgroundColor: STATUS_COLOR[r.status] + '22' }]}>
                    <Text style={[s.statusTxt, { color: STATUS_COLOR[r.status] }]}>
                      {STATUS_TH[r.status] || r.status}
                    </Text>
                  </View>
                  <View style={[s.priorityDot, { backgroundColor: PRIORITY_COLOR[r.priority] || '#999' }]} />
                </View>
                <Text style={s.title} numberOfLines={2}>{r.title}</Text>
                <Text style={s.meta}>📍 {r.location || '-'}  |  👤 {r.reported_by_name}</Text>
                <Text style={s.date}>{new Date(r.created_at).toLocaleDateString('th-TH')}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={s.empty}>ไม่พบรายการ</Text>}
          />
        )
      }

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => nav.navigate('RepairCreate')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const NAVY = '#1f4e79';
const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f0f4f8' },
  searchRow:  { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, elevation: 2 },
  search:     { flex: 1, fontSize: 14 },
  tabs:       { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 4 },
  tab:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#e2e8f0' },
  tabActive:  { backgroundColor: NAVY },
  tabTxt:     { fontSize: 12, color: '#555' },
  tabTxtActive: { color: '#fff', fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusTxt:  { fontSize: 12, fontWeight: '600' },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  title:      { fontSize: 15, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  meta:       { fontSize: 12, color: '#64748b', marginBottom: 2 },
  date:       { fontSize: 11, color: '#94a3b8' },
  empty:      { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 15 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    backgroundColor: NAVY, width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', elevation: 6,
  },
});
