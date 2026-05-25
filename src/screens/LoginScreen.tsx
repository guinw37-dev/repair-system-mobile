import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
  FlatList, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { login } from '../api/auth';
import { setApiBase } from '../api/client';

const NAVY  = '#1f4e79';
const GREEN = '#1a6b3a';

interface Hospital {
  code: string;
  name: string;
  slug: string;
  subdomain: string;
  group: string;
}

const HOSPITALS: Hospital[] = [
  // กลุ่มพญาไท
  { code: 'PT1', name: 'โรงพยาบาลพญาไท 1',         slug: 'phayathai-1',          subdomain: 'pt1',  group: 'พญาไท' },
  { code: 'PT2', name: 'โรงพยาบาลพญาไท 2',         slug: 'phayathai-2',          subdomain: 'pt2',  group: 'พญาไท' },
  { code: 'PT3', name: 'โรงพยาบาลพญาไท 3',         slug: 'phayathai-3',          subdomain: 'pt3',  group: 'พญาไท' },
  { code: 'PTN', name: 'โรงพยาบาลพญาไท นวมินทร์',  slug: 'phayathai-nawamin',    subdomain: 'ptn',  group: 'พญาไท' },
  { code: 'PTW', name: 'โรงพยาบาลพญาไท บ่อวิน',    slug: 'phayathai-bowin',      subdomain: 'ptw',  group: 'พญาไท' },
  { code: 'PTP', name: 'โรงพยาบาลพญาไท พหลโยธิน',  slug: 'phayathai-phaholyothin', subdomain: 'ptp', group: 'พญาไท' },
  { code: 'PTS', name: 'โรงพยาบาลพญาไท ศรีราชา',   slug: 'phayathai-sriracha',   subdomain: 'pts',  group: 'พญาไท' },
  // กลุ่มเปาโล
  { code: 'PLK', name: 'โรงพยาบาลเปาโล เกษตร',     slug: 'paolo-kaset',          subdomain: 'plk',  group: 'เปาโล' },
  { code: 'PLC', name: 'โรงพยาบาลเปาโล โชคชัย 4',  slug: 'paolo-chokchai',       subdomain: 'plc',  group: 'เปาโล' },
  { code: 'PLR', name: 'โรงพยาบาลเปาโล รังสิต',    slug: 'paolo-rangsit',        subdomain: 'plr',  group: 'เปาโล' },
  { code: 'PLS', name: 'โรงพยาบาลเปาโล สมุทรปราการ', slug: 'paolo-samutprakan',  subdomain: 'pls',  group: 'เปาโล' },
  { code: 'PLD', name: 'โรงพยาบาลเปาโล พระประแดง', slug: 'paolo-phrapradaeng',   subdomain: 'pld',  group: 'เปาโล' },
  // Demo
  { code: 'DEMO', name: 'โรงพยาบาลสาธิต (Demo)',   slug: 'demo',                 subdomain: 'demo', group: 'Demo' },
];

const GROUP_COLOR: Record<string, string> = {
  'พญาไท': GREEN,
  'เปาโล': NAVY,
  'Demo':  '#64748b',
};

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [hospital, setHospital]   = useState<Hospital | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [loading, setLoading]     = useState(false);

  async function handleLogin() {
    if (!hospital) { Alert.alert('กรุณาเลือกหน่วยงาน'); return; }
    if (!username || !password) { Alert.alert('กรุณากรอก Username และ Password'); return; }
    setLoading(true);
    try {
      const base = `https://${hospital.subdomain}.pypl-engineering.online/api/${hospital.slug}`;
      await setApiBase(base);
      const { token, user } = await login({ username, password });
      await signIn(token, user);
    } catch (e: any) {
      Alert.alert('เข้าสู่ระบบไม่สำเร็จ', e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  // Group hospitals
  const groups = ['พญาไท', 'เปาโล', 'Demo'];

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.card}>

        {/* Logo */}
        <View style={s.logoBox}>
          <Text style={s.logoIcon}>🔧</Text>
        </View>
        <Text style={s.title}>ระบบแจ้งซ่อม</Text>
        <Text style={s.subtitle}>Repair Management System</Text>

        {/* Hospital selector */}
        <Text style={s.label}>หน่วยงาน</Text>
        <TouchableOpacity style={s.hospitalBtn} onPress={() => setShowPicker(true)}>
          {hospital ? (
            <View style={s.hospitalSelected}>
              <View style={[s.codeBadge, { backgroundColor: GROUP_COLOR[hospital.group] }]}>
                <Text style={s.codeTxt}>{hospital.code}</Text>
              </View>
              <Text style={s.hospitalName}>{hospital.name}</Text>
            </View>
          ) : (
            <Text style={s.hospitalPlaceholder}>- เลือกโรงพยาบาล / หน่วยงาน -</Text>
          )}
          <Ionicons name="chevron-down" size={18} color="#94a3b8" />
        </TouchableOpacity>

        {/* Username */}
        <Text style={s.label}>Username</Text>
        <TextInput
          style={s.input}
          placeholder="กรอก username"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />

        {/* Password */}
        <Text style={s.label}>Password</Text>
        <TextInput
          style={s.input}
          placeholder="กรอก password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity style={[s.btn, !hospital && s.btnDisabled]} onPress={handleLogin} disabled={loading || !hospital}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>เข้าสู่ระบบ</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Hospital picker modal */}
      <Modal visible={showPicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>เลือกหน่วยงาน</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={HOSPITALS}
              keyExtractor={i => i.code}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => {
                const prevGroup = index > 0 ? HOSPITALS[index - 1].group : null;
                const showHeader = item.group !== prevGroup;
                return (
                  <>
                    {showHeader && (
                      <View style={[s.groupHeader, { backgroundColor: GROUP_COLOR[item.group] + '15' }]}>
                        <Text style={[s.groupHeaderTxt, { color: GROUP_COLOR[item.group] }]}>
                          กลุ่ม{item.group}
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[s.hospitalItem, hospital?.code === item.code && s.hospitalItemActive]}
                      onPress={() => { setHospital(item); setShowPicker(false); }}>
                      <View style={[s.codeBadge, { backgroundColor: GROUP_COLOR[item.group] }]}>
                        <Text style={s.codeTxt}>{item.code}</Text>
                      </View>
                      <Text style={s.hospitalItemName}>{item.name}</Text>
                      {hospital?.code === item.code && (
                        <Ionicons name="checkmark-circle" size={20} color={GROUP_COLOR[item.group]} />
                      )}
                    </TouchableOpacity>
                  </>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d3b70', justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '90%', backgroundColor: '#fff', borderRadius: 20,
    padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, elevation: 10,
  },
  logoBox: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#e8f0fe',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  logoIcon:   { fontSize: 36 },
  title:      { fontSize: 22, fontWeight: '700', color: NAVY, marginBottom: 2 },
  subtitle:   { fontSize: 12, color: '#94a3b8', marginBottom: 20 },
  label:      { alignSelf: 'flex-start', fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4, marginTop: 10 },
  hospitalBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, backgroundColor: '#f8fafc',
  },
  hospitalSelected:    { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  hospitalPlaceholder: { fontSize: 14, color: '#94a3b8', flex: 1 },
  hospitalName:        { fontSize: 14, color: '#1e293b', fontWeight: '500', flex: 1 },
  codeBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  codeTxt:    { fontSize: 12, fontWeight: '700', color: '#fff' },
  input: {
    width: '100%', borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 10, padding: 12, fontSize: 14, backgroundColor: '#f8fafc', marginBottom: 2,
  },
  btn: {
    width: '100%', backgroundColor: NAVY, borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 20,
  },
  btnDisabled: { backgroundColor: '#94a3b8' },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  modalTitle:   { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  groupHeader:  { paddingHorizontal: 20, paddingVertical: 8 },
  groupHeaderTxt: { fontSize: 12, fontWeight: '700' },
  hospitalItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#f8fafc' },
  hospitalItemActive: { backgroundColor: '#f0f9ff' },
  hospitalItemName: { fontSize: 15, color: '#1e293b', flex: 1 },
});
