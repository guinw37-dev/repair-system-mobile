import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, TextInput,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../context/AuthContext';
import { setApiBase } from '../api/client';

const NAVY = '#1f4e79';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [apiBase, setApiBaseState] = useState('');
  const [showApiEdit, setShowApiEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    SecureStore.getItemAsync('repair_api_base').then(v => setApiBaseState(v || ''));
  }, []);

  async function saveApiBase() {
    setSaving(true);
    await setApiBase(apiBase.trim());
    setSaving(false);
    setShowApiEdit(false);
    Alert.alert('บันทึกแล้ว', 'API URL อัพเดทแล้ว');
  }

  const ROLE_TH: Record<string, string> = {
    admin: 'ผู้ดูแลระบบ', dev_admin: 'Dev Admin',
    supervisor: 'ผู้บังคับบัญชา', technician: 'ช่างซ่อม',
    tech: 'ช่างซ่อม', staff: 'เจ้าหน้าที่',
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Avatar */}
      <View style={s.avatarWrap}>
        <View style={s.avatar}>
          <Text style={s.avatarTxt}>{user?.name?.charAt(0) ?? '?'}</Text>
        </View>
        <Text style={s.name}>{user?.name}</Text>
        <Text style={s.role}>{ROLE_TH[user?.role ?? ''] || user?.role}</Text>
        <Text style={s.hospital}>{user?.hospital}</Text>
      </View>

      {/* Info card */}
      <View style={s.card}>
        <InfoRow icon="person-outline"  label="Username"  value={user?.username || '-'} />
        <InfoRow icon="shield-outline"  label="Role"      value={user?.role || '-'} />
        <InfoRow icon="business-outline" label="Hospital" value={user?.hospital || '-'} />
      </View>

      {/* API Base URL */}
      <View style={s.card}>
        <View style={s.rowBetween}>
          <Text style={s.sectionTitle}>🔗 API Server</Text>
          <TouchableOpacity onPress={() => setShowApiEdit(v => !v)}>
            <Ionicons name="pencil-outline" size={18} color={NAVY} />
          </TouchableOpacity>
        </View>
        <Text style={s.apiUrl} numberOfLines={2}>{apiBase || 'ใช้ค่าเริ่มต้น'}</Text>
        {showApiEdit && (
          <View style={{ marginTop: 10 }}>
            <TextInput
              style={s.input}
              value={apiBase}
              onChangeText={setApiBaseState}
              placeholder="https://hospital.example.com/api/slug"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={s.saveBtn} onPress={saveApiBase} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.saveTxt}>บันทึก</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={() => {
        Alert.alert('ออกจากระบบ', 'ยืนยันออกจากระบบ?', [
          { text: 'ยกเลิก', style: 'cancel' },
          { text: 'ออก', style: 'destructive', onPress: signOut },
        ]);
      }}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={s.logoutTxt}>ออกจากระบบ</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon as any} size={16} color="#64748b" />
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f0f4f8' },
  content:     { padding: 20, paddingBottom: 40 },
  avatarWrap:  { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  avatarTxt: { fontSize: 30, color: '#fff', fontWeight: '700' },
  name:      { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  role:      { fontSize: 14, color: '#64748b', marginTop: 2 },
  hospital:  { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  infoRow:   { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  infoLabel: { width: 70, fontSize: 13, color: '#64748b' },
  infoValue: { flex: 1, fontSize: 13, color: '#1e293b', fontWeight: '500' },
  rowBetween:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#334155' },
  apiUrl:    { fontSize: 12, color: '#64748b' },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8,
    padding: 10, fontSize: 13, backgroundColor: '#f8fafc', marginBottom: 8,
  },
  saveBtn:   { backgroundColor: NAVY, borderRadius: 8, padding: 10, alignItems: 'center' },
  saveTxt:   { color: '#fff', fontWeight: '700' },
  logoutBtn: {
    flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  logoutTxt: { fontSize: 16, color: '#ef4444', fontWeight: '700' },
});
