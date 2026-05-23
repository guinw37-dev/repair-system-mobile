import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { getPmRecords } from '../api/pm';

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b', done: '#22c55e', skipped: '#94a3b8',
};
const STATUS_TH: Record<string, string> = { pending: 'รอดำเนินการ', done: 'เสร็จแล้ว', skipped: 'ข้ามไป' };
const MONTH_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

export default function PMListScreen() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await getPmRecords({ year, month });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const done    = items.filter(r => r.status === 'done').length;
  const pending = items.filter(r => r.status === 'pending').length;

  return (
    <View style={s.container}>
      {/* Month nav */}
      <View style={s.monthNav}>
        <TouchableOpacity onPress={() => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }} style={s.navBtn}>
          <Text style={s.navTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={s.monthLabel}>{MONTH_TH[month - 1]} {year + 543}</Text>
        <TouchableOpacity onPress={() => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }} style={s.navBtn}>
          <Text style={s.navTxt}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Summary bar */}
      <View style={s.summaryBar}>
        <Text style={s.summaryItem}>✅ เสร็จ <Text style={{ color: '#22c55e', fontWeight: '700' }}>{done}</Text></Text>
        <Text style={s.summaryItem}>⏳ รอ <Text style={{ color: '#f59e0b', fontWeight: '700' }}>{pending}</Text></Text>
        <Text style={s.summaryItem}>รวม <Text style={{ fontWeight: '700' }}>{items.length}</Text></Text>
      </View>

      {loading
        ? <ActivityIndicator style={{ flex: 1 }} size="large" color="#375623" />
        : (
          <FlatList
            data={items}
            keyExtractor={r => String(r.id)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
            contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
            renderItem={({ item: r }) => (
              <View style={s.card}>
                <View style={s.cardTop}>
                  <View style={[s.badge, { backgroundColor: STATUS_COLOR[r.status] + '22' }]}>
                    <Text style={[s.badgeTxt, { color: STATUS_COLOR[r.status] }]}>{STATUS_TH[r.status]}</Text>
                  </View>
                  <Text style={s.freq}>{r.frequency}</Text>
                </View>
                <Text style={s.name}>{r.asset_name}</Text>
                <Text style={s.meta}>📦 {r.unit_count} หน่วย  |  🏷 {r.category}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={s.empty}>ไม่มีรายการเดือนนี้</Text>}
          />
        )
      }
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f0f4f8' },
  monthNav:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#375623' },
  navBtn:      { padding: 8 },
  navTxt:      { fontSize: 24, color: '#fff', fontWeight: '700' },
  monthLabel:  { fontSize: 16, fontWeight: '700', color: '#fff' },
  summaryBar:  { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', paddingVertical: 10, marginBottom: 4 },
  summaryItem: { fontSize: 13, color: '#334155' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  badge:     { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeTxt:  { fontSize: 12, fontWeight: '600' },
  freq:      { fontSize: 11, color: '#94a3b8' },
  name:      { fontSize: 15, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  meta:      { fontSize: 12, color: '#64748b' },
  empty:     { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 15 },
});
