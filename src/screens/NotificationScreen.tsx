import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

const NAVY = '#1f4e79';
const READ_KEY = 'notif_read_ids';

interface Notif {
  id: number;
  title: string;
  body: string;
  type: string;
  ref_id?: number;
  read: boolean;
  created_at: string;
}

async function getReadIds(): Promise<Set<number>> {
  try {
    const raw = await AsyncStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch { return new Set(); }
}

async function saveReadIds(ids: Set<number>) {
  const arr = Array.from(ids).slice(-200);
  await AsyncStorage.setItem(READ_KEY, JSON.stringify(arr));
}

export default function NotificationScreen() {
  const nav = useNavigation<any>();
  const [items, setItems]       = useState<Notif[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [readIds, setReadIds]   = useState<Set<number>>(new Set());

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [{ data }, ids] = await Promise.all([
        api.get('/notifications?limit=50'),
        getReadIds(),
      ]);
      const raw: Notif[] = Array.isArray(data) ? data : (data.items || []);
      setReadIds(ids);
      setItems(raw.map(n => ({ ...n, read: ids.has(n.id) })));
    } catch {
      setItems([]);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: number) {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    await saveReadIds(next);
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function markAllRead() {
    const next = new Set([...readIds, ...items.map(n => n.id)]);
    setReadIds(next);
    await saveReadIds(next);
    setItems(prev => prev.map(n => ({ ...n, read: true })));
  }

  const unread = items.filter(n => !n.read).length;

  const TYPE_ICON: Record<string, string> = {
    Register: 'add-circle-outline',
    Assign:   'person-add-outline',
    'Work On':'construct-outline',
    Clear:    'checkmark-circle-outline',
    Clear1:   'star-outline',
    Close:    'lock-closed-outline',
  };

  const TYPE_COLOR: Record<string, string> = {
    Register: '#f59e0b',
    Assign:   '#3b82f6',
    'Work On':'#8b5cf6',
    Clear:    '#22c55e',
    Clear1:   '#10b981',
    Close:    '#64748b',
  };

  return (
    <View style={s.container}>
      {unread > 0 && (
        <View style={s.unreadBar}>
          <Text style={s.unreadTxt}>{unread} รายการยังไม่อ่าน</Text>
          <TouchableOpacity onPress={markAllRead}>
            <Text style={s.readAllTxt}>อ่านทั้งหมด</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={n => String(n.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item: n }) => (
          <TouchableOpacity
            style={[s.item, !n.read && s.itemUnread]}
            onPress={() => {
              markRead(n.id);
              if (n.ref_id) nav.navigate('RepairDetail', { id: n.ref_id });
            }}
          >
            <View style={[s.iconBox, { backgroundColor: (TYPE_COLOR[n.type] || '#94a3b8') + '22' }]}>
              <Ionicons
                name={(TYPE_ICON[n.type] || 'notifications-outline') as any}
                size={22}
                color={TYPE_COLOR[n.type] || '#94a3b8'}
              />
            </View>
            <View style={s.notifContent}>
              <Text style={[s.title, !n.read && s.titleBold]} numberOfLines={2}>{n.title}</Text>
              <Text style={s.body} numberOfLines={2}>{n.body}</Text>
              <Text style={s.time}>{new Date(n.created_at).toLocaleString('th-TH')}</Text>
            </View>
            {!n.read && <View style={s.dot} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          loading ? null : (
            <View style={s.emptyBox}>
              <Ionicons name="notifications-off-outline" size={48} color="#cbd5e1" />
              <Text style={s.emptyTxt}>ไม่มีการแจ้งเตือน</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f0f4f8' },
  unreadBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#eff6ff', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: '#bfdbfe',
  },
  unreadTxt:  { fontSize: 13, color: NAVY, fontWeight: '600' },
  readAllTxt: { fontSize: 13, color: '#3b82f6', fontWeight: '600' },
  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderColor: '#f1f5f9',
  },
  itemUnread:   { backgroundColor: '#f8faff' },
  iconBox:      { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  notifContent: { flex: 1 },
  title:        { fontSize: 14, color: '#334155', marginBottom: 2 },
  titleBold:    { fontWeight: '700', color: '#1e293b' },
  body:         { fontSize: 12, color: '#64748b', marginBottom: 4 },
  time:         { fontSize: 11, color: '#94a3b8' },
  dot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: NAVY, marginTop: 6 },
  emptyBox:     { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTxt:     { fontSize: 15, color: '#94a3b8' },
});
