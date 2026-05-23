import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';

interface Notif {
  id: number;
  title: string;
  body: string;
  type: string;
  ref_id?: number;
  read: boolean;
  created_at: string;
}

export default function NotificationScreen() {
  const nav = useNavigation<any>();
  const [items, setItems]   = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(quiet = false) {
    if (!quiet) setLoading(true);
    try {
      const { data } = await api.get('/notifications?limit=50');
      setItems(Array.isArray(data) ? data : data.items || []);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }

  async function markRead(id: number) {
    try { await api.put(`/notifications/${id}/read`); } catch { }
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  useEffect(() => { load(); }, []);

  const unread = items.filter(n => !n.read).length;

  return (
    <View style={s.container}>
      {unread > 0 && (
        <View style={s.unreadBar}>
          <Text style={s.unreadTxt}>{unread} รายการยังไม่อ่าน</Text>
          <TouchableOpacity onPress={async () => {
            try { await api.put('/notifications/read-all'); } catch { }
            setItems(prev => prev.map(n => ({ ...n, read: true })));
          }}>
            <Text style={s.readAllTxt}>อ่านทั้งหมด</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={n => String(n.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        renderItem={({ item: n }) => (
          <TouchableOpacity
            style={[s.card, !n.read && s.cardUnread]}
            onPress={() => {
              markRead(n.id);
              if (n.ref_id && n.type === 'repair') nav.navigate('RepairDetail', { id: n.ref_id });
            }}
          >
            <View style={s.iconWrap}>
              <Ionicons
                name={n.type === 'repair' ? 'construct-outline' : 'notifications-outline'}
                size={20}
                color={n.read ? '#94a3b8' : '#1f4e79'}
              />
            </View>
            <View style={s.textWrap}>
              <Text style={[s.nTitle, !n.read && s.nTitleUnread]}>{n.title}</Text>
              <Text style={s.nBody} numberOfLines={2}>{n.body}</Text>
              <Text style={s.nDate}>{new Date(n.created_at).toLocaleString('th-TH')}</Text>
            </View>
            {!n.read && <View style={s.dot} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="notifications-off-outline" size={48} color="#cbd5e1" />
            <Text style={s.emptyTxt}>ไม่มีการแจ้งเตือน</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  unreadBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#dbeafe', paddingHorizontal: 16, paddingVertical: 10,
  },
  unreadTxt:  { fontSize: 13, color: '#1e40af', fontWeight: '600' },
  readAllTxt: { fontSize: 13, color: '#1e40af', textDecorationLine: 'underline' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: '#1f4e79' },
  iconWrap:   { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  textWrap:   { flex: 1 },
  nTitle:     { fontSize: 14, color: '#64748b', fontWeight: '500', marginBottom: 2 },
  nTitleUnread: { color: '#1e293b', fontWeight: '700' },
  nBody:      { fontSize: 13, color: '#475569', marginBottom: 4, lineHeight: 18 },
  nDate:      { fontSize: 11, color: '#94a3b8' },
  dot:        { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1f4e79', marginTop: 4 },
  empty:      { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyTxt:   { fontSize: 15, color: '#94a3b8' },
});
