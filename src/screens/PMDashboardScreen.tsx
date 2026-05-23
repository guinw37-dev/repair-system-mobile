import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { getPmDashboardYearly } from '../api/pm';

const MONTH_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const CAT_TH: Record<string, string> = {
  fire:'ดับเพลิง', electrical:'ไฟฟ้า', generator:'เครื่องกำเนิด',
  plumbing:'ประปา', lift:'ลิฟต์', mechanical:'เครื่องกล',
  communication:'สื่อสาร', other:'อื่นๆ',
};

export default function PMDashboardScreen() {
  const [data, setData]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const year = new Date().getFullYear();

  async function load(quiet = false) {
    if (!quiet) setLoading(true);
    try { setData(await getPmDashboardYearly(year)); }
    catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1, marginTop: 80 }} size="large" color="#1f4e79" />;
  if (!data) return <Text style={{ textAlign: 'center', marginTop: 60, color: '#888' }}>โหลดไม่สำเร็จ</Text>;

  const t = data.yearTotals;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}>

      <Text style={s.sectionTitle}>ปี {year + 543}</Text>

      {/* KPI row */}
      <View style={s.kpiRow}>
        <View style={[s.kpi, { borderColor: '#1f4e79' }]}>
          <Text style={s.kpiVal}>{data.doneRate}%</Text>
          <Text style={s.kpiLabel}>% เสร็จ</Text>
        </View>
        <View style={[s.kpi, { borderColor: '#22c55e' }]}>
          <Text style={[s.kpiVal, { color: '#22c55e' }]}>{t.done}</Text>
          <Text style={s.kpiLabel}>เสร็จ</Text>
        </View>
        <View style={[s.kpi, { borderColor: '#f59e0b' }]}>
          <Text style={[s.kpiVal, { color: '#f59e0b' }]}>{t.pending}</Text>
          <Text style={s.kpiLabel}>รอ</Text>
        </View>
        <View style={[s.kpi, { borderColor: '#dc2626' }]}>
          <Text style={[s.kpiVal, { color: '#dc2626' }]}>{data.overdue?.length ?? 0}</Text>
          <Text style={s.kpiLabel}>เกินกำหนด</Text>
        </View>
      </View>

      {/* Monthly breakdown */}
      <Text style={s.sectionTitle}>รายเดือน</Text>
      <View style={s.card}>
        {data.byMonth?.map((m: any) => (
          <View key={m.month} style={s.monthRow}>
            <Text style={s.monthName}>{MONTH_TH[m.month - 1]}</Text>
            <View style={s.barBg}>
              <View style={[s.barFill, { width: `${m.rate}%` }]} />
            </View>
            <Text style={s.monthRate}>{m.rate}%</Text>
            <Text style={s.monthCounts}>{m.done}/{m.total}</Text>
          </View>
        ))}
      </View>

      {/* By category */}
      <Text style={s.sectionTitle}>แยกตามหมวด</Text>
      <View style={s.card}>
        {Object.entries(data.byCategory || {}).map(([cat, v]: [string, any]) => {
          const rate = v.total ? Math.round(v.done / v.total * 100) : 0;
          return (
            <View key={cat} style={s.catRow}>
              <Text style={s.catName}>{CAT_TH[cat] || cat}</Text>
              <View style={s.barBg}>
                <View style={[s.barFill, { width: `${rate}%`, backgroundColor: '#375623' }]} />
              </View>
              <Text style={s.catRate}>{v.done}/{v.total}</Text>
            </View>
          );
        })}
      </View>

      {/* Overdue */}
      {data.overdue?.length > 0 && (
        <>
          <Text style={[s.sectionTitle, { color: '#dc2626' }]}>⚠️ เกินกำหนด</Text>
          <View style={s.card}>
            {data.overdue.map((r: any) => (
              <View key={r.id} style={s.overdueRow}>
                <Text style={s.overdueName}>{r.asset_name}</Text>
                <Text style={s.overdueDate}>{r.pm_date}</Text>
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
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1f4e79', marginTop: 16, marginBottom: 8 },
  kpiRow:       { flexDirection: 'row', gap: 10 },
  kpi: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12,
    alignItems: 'center', borderTopWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  kpiVal:   { fontSize: 22, fontWeight: '800', color: '#1f4e79' },
  kpiLabel: { fontSize: 11, color: '#64748b', marginTop: 2 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  monthRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  monthName:   { width: 36, fontSize: 12, color: '#334155' },
  barBg:       { flex: 1, height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  barFill:     { height: 8, backgroundColor: '#1f4e79', borderRadius: 4 },
  monthRate:   { width: 32, fontSize: 11, color: '#1f4e79', textAlign: 'right' },
  monthCounts: { width: 36, fontSize: 11, color: '#94a3b8', textAlign: 'right' },
  catRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  catName:     { width: 70, fontSize: 12, color: '#334155' },
  catRate:     { width: 36, fontSize: 11, color: '#64748b', textAlign: 'right' },
  overdueRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#fee2e2' },
  overdueName: { fontSize: 13, color: '#334155', flex: 1 },
  overdueDate: { fontSize: 12, color: '#dc2626' },
});
