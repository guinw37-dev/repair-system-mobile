import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { getRepairStats } from '../api/repairs';

export default function DashboardScreen() {
  const [stats, setStats]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(quiet = false) {
    if (!quiet) setLoading(true);
    try { setStats(await getRepairStats()); }
    catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1, marginTop: 80 }} size="large" color="#7030a0" />;

  const STATUS_COLOR: Record<string, string> = {
    pending:'#f59e0b', assigned:'#3b82f6', in_progress:'#8b5cf6', done:'#22c55e', cancelled:'#ef4444',
  };
  const STATUS_TH: Record<string, string> = {
    pending:'รอรับ', assigned:'รับแล้ว', in_progress:'กำลังซ่อม', done:'เสร็จ', cancelled:'ยกเลิก',
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}>

      <Text style={s.title}>📊 Dashboard</Text>

      {/* Status breakdown */}
      {stats?.byStatus && (
        <>
          <Text style={s.sectionTitle}>แยกตามสถานะ</Text>
          <View style={s.row}>
            {Object.entries(stats.byStatus).map(([st, cnt]: [string, any]) => (
              <View key={st} style={[s.statCard, { borderTopColor: STATUS_COLOR[st] || '#999' }]}>
                <Text style={[s.statNum, { color: STATUS_COLOR[st] || '#999' }]}>{cnt}</Text>
                <Text style={s.statLabel}>{STATUS_TH[st] || st}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* SLA */}
      {stats?.sla && (
        <>
          <Text style={s.sectionTitle}>SLA</Text>
          <View style={s.card}>
            <View style={s.slaRow}>
              <Text style={s.slaLabel}>ผ่าน SLA</Text>
              <Text style={[s.slaVal, { color: '#22c55e' }]}>{stats.sla.passed ?? '-'}</Text>
            </View>
            <View style={s.slaRow}>
              <Text style={s.slaLabel}>เกิน SLA</Text>
              <Text style={[s.slaVal, { color: '#ef4444' }]}>{stats.sla.failed ?? '-'}</Text>
            </View>
            <View style={s.slaRow}>
              <Text style={s.slaLabel}>อัตราผ่าน</Text>
              <Text style={[s.slaVal, { color: '#1f4e79', fontWeight: '800' }]}>{stats.sla.rate ?? '-'}%</Text>
            </View>
          </View>
        </>
      )}

      {/* Top categories */}
      {stats?.byCategory && (
        <>
          <Text style={s.sectionTitle}>แยกตามหมวด</Text>
          <View style={s.card}>
            {Object.entries(stats.byCategory).slice(0, 6).map(([cat, cnt]: [string, any]) => (
              <View key={cat} style={s.catRow}>
                <Text style={s.catName}>{cat}</Text>
                <Text style={s.catCnt}>{cnt}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f0f4f8' },
  content:      { padding: 16, paddingBottom: 40 },
  title:        { fontSize: 20, fontWeight: '700', color: '#7030a0', marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#334155', marginTop: 16, marginBottom: 8 },
  row:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '30%', backgroundColor: '#fff', borderRadius: 10, padding: 12,
    alignItems: 'center', borderTopWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  statNum:   { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 2, textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  slaRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  slaLabel: { fontSize: 14, color: '#334155' },
  slaVal:   { fontSize: 18, fontWeight: '700' },
  catRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  catName:  { fontSize: 13, color: '#334155' },
  catCnt:   { fontSize: 13, fontWeight: '700', color: '#1f4e79' },
});
