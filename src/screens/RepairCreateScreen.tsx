import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createRepair } from '../api/repairs';

const PRIORITIES = ['standard', 'urgent', 'critical'];
const PRIORITY_TH: Record<string, string> = { standard: 'ปกติ', urgent: 'เร่งด่วน', critical: 'วิกฤต' };
const PRIORITY_COLOR: Record<string, string> = { standard: '#64748b', urgent: '#f97316', critical: '#dc2626' };

export default function RepairCreateScreen() {
  const nav = useNavigation();
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [location, setLocation] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor]       = useState('');
  const [priority, setPriority] = useState('standard');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit() {
    if (!title) { Alert.alert('กรุณาระบุหัวเรื่อง'); return; }
    setLoading(true);
    try {
      await createRepair({ title, description: desc, location, building, floor, priority });
      Alert.alert('แจ้งซ่อมสำเร็จ', '', [{ text: 'OK', onPress: () => nav.goBack() }]);
    } catch (e: any) {
      Alert.alert('ไม่สำเร็จ', e?.response?.data?.message || e.message);
    } finally { setLoading(false); }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.label}>หัวเรื่อง *</Text>
      <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="เช่น ไฟฟ้าดับ ห้อง 301" />

      <Text style={s.label}>รายละเอียด</Text>
      <TextInput style={[s.input, s.textarea]} value={desc} onChangeText={setDesc}
        multiline numberOfLines={4} placeholder="อธิบายปัญหาเพิ่มเติม..." textAlignVertical="top" />

      <Text style={s.label}>สถานที่</Text>
      <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder="เช่น ห้องผ่าตัด 3" />

      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>อาคาร</Text>
          <TextInput style={s.input} value={building} onChangeText={setBuilding} placeholder="อาคาร B" />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={s.label}>ชั้น</Text>
          <TextInput style={s.input} value={floor} onChangeText={setFloor} placeholder="ชั้น 3" />
        </View>
      </View>

      <Text style={s.label}>ระดับความเร่งด่วน</Text>
      <View style={s.priorityRow}>
        {PRIORITIES.map(p => (
          <TouchableOpacity key={p} onPress={() => setPriority(p)}
            style={[s.priorityBtn, priority === p && { backgroundColor: PRIORITY_COLOR[p] }]}>
            <Text style={[s.priorityTxt, priority === p && { color: '#fff' }]}>{PRIORITY_TH[p]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitTxt}>📤 แจ้งซ่อม</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  content:   { padding: 16, paddingBottom: 40 },
  label:     { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4, marginTop: 12 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 8, padding: 12, fontSize: 14,
  },
  textarea:  { height: 100 },
  row:       { flexDirection: 'row' },
  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#e2e8f0',
    backgroundColor: '#fff', alignItems: 'center',
  },
  priorityTxt: { fontSize: 13, fontWeight: '600', color: '#334155' },
  submitBtn: {
    backgroundColor: '#1f4e79', borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 24,
  },
  submitTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
