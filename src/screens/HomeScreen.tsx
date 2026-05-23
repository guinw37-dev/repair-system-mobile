import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const NAVY = '#1f4e79';
const CARDS = [
  { key: 'RepairList',     icon: 'construct-outline',  label: 'แจ้งซ่อม',       color: '#1f4e79' },
  { key: 'PMList',         icon: 'calendar-outline',   label: 'PM ติดตามงาน',   color: '#375623' },
  { key: 'PMDashboard',    icon: 'stats-chart-outline', label: 'PM Dashboard',  color: '#2e75b6' },
  { key: 'Operation',      icon: 'alarm-outline',      label: 'Operation',      color: '#c55a11' },
  { key: 'Dashboard',      icon: 'speedometer-outline', label: 'Dashboard',     color: '#7030a0' },
];

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const nav = useNavigation<any>();

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>สวัสดี, {user?.name}</Text>
          <Text style={s.role}>{user?.role} · {user?.hospital}</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={s.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={NAVY} />
        </TouchableOpacity>
      </View>

      <View style={s.grid}>
        {CARDS.map(c => (
          <TouchableOpacity key={c.key} style={[s.card, { borderLeftColor: c.color }]} onPress={() => nav.navigate(c.key)}>
            <Ionicons name={c.icon as any} size={28} color={c.color} />
            <Text style={[s.cardLabel, { color: c.color }]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  content:   { padding: 20 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24,
  },
  greeting: { fontSize: 20, fontWeight: '700', color: NAVY },
  role:     { fontSize: 13, color: '#666', marginTop: 2 },
  logoutBtn: { padding: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: {
    width: '47%', backgroundColor: '#fff', borderRadius: 12,
    padding: 20, alignItems: 'center', gap: 10,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  cardLabel: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
