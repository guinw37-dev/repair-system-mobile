import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import {
  getRepair, updateRepair, Repair,
  STATUS_COLOR, STATUS_TH, PRIORITY_COLOR, PRIORITY_TH,
} from '../api/repairs';
import { useAuth } from '../context/AuthContext';

const NAVY = '#1f4e79';

// Next statuses a technician can move to
const TECH_TRANSITIONS: Record<string, { status: string; label: string; color: string }[]> = {
  pending:     [{ status: 'assigned',    label: '✅ รับงาน',     color: '#3b82f6' }],
  assigned:    [{ status: 'in_progress', label: '🔧 เริ่มซ่อม',  color: '#8b5cf6' }],
  in_progress: [{ status: 'done',        label: '🎉 ซ่อมเสร็จ',  color: '#22c55e' }],
};

export default function RepairDetailScreen() {
  const { params } = useRoute<any>();
  const nav = useNavigation();
  const { user, isTech, isAdmin } = useAuth();

  const [repair, setRepair]   = useState<Repair | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [notes, setNotes]     = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [imageUri, setImageUri]   = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [nextStatus, setNextStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setRepair(await getRepair(params.id)); }
    catch (e) { Alert.alert('โหลดไม่สำเร็จ'); nav.goBack(); }
    finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7, base64: false,
    });
    if (!res.canceled) setImageUri(res.assets[0].uri);
  }

  function openModal(status: string) {
    setNextStatus(status);
    setNotes('');
    setPartsCost('');
    setImageUri(null);
    setModal(true);
  }

  async function handleUpdate() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { status: nextStatus };
      if (notes) body.notes = notes;
      if (partsCost) body.parts_cost = parseFloat(partsCost);
      if (nextStatus === 'assigned' || nextStatus === 'in_progress') {
        body.performed_by = user?.name;
      }
      await updateRepair(repair!.id, body);
      setModal(false);
      load();
    } catch (e: any) {
      Alert.alert('ไม่สำเร็จ', e?.response?.data?.message || e.message);
    } finally { setSaving(false); }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={NAVY} />;
  if (!repair) return null;

  const transitions = (isTech || isAdmin) ? (TECH_TRANSITIONS[repair.status] || []) : [];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Status + priority */}
      <View style={s.topRow}>
        <View style={[s.statusBadge, { backgroundColor: STATUS_COLOR[repair.status] + '22' }]}>
          <Text style={[s.statusTxt, { color: STATUS_COLOR[repair.status] }]}>
            {STATUS_TH[repair.status]}
          </Text>
        </View>
        <View style={[s.priorityBadge, { backgroundColor: PRIORITY_COLOR[repair.priority] }]}>
          <Text style={s.priorityTxt}>{PRIORITY_TH[repair.priority]}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={s.title}>{repair.title}</Text>

      {/* Meta info */}
      <View style={s.card}>
        <Row icon="location-outline" label="สถานที่" value={[repair.building, repair.floor, repair.location].filter(Boolean).join(' · ') || '-'} />
        <Row icon="person-outline"   label="ผู้แจ้ง"  value={repair.reported_by_name || '-'} />
        {repair.assigned_to_name && <Row icon="construct-outline" label="ช่างที่รับ" value={repair.assigned_to_name} />}
        <Row icon="time-outline"    label="วันที่แจ้ง" value={new Date(repair.created_at).toLocaleString('th-TH')} />
        {repair.closed_at && <Row icon="checkmark-circle-outline" label="วันที่เสร็จ" value={new Date(repair.closed_at).toLocaleString('th-TH')} />}
        {repair.parts_cost !== undefined && repair.parts_cost !== null && (
          <Row icon="wallet-outline" label="ค่าอะไหล่" value={`฿${Number(repair.parts_cost).toLocaleString()}`} />
        )}
      </View>

      {/* Description */}
      {repair.description ? (
        <>
          <Text style={s.sectionLabel}>รายละเอียด</Text>
          <View style={s.card}><Text style={s.desc}>{repair.description}</Text></View>
        </>
      ) : null}

      {/* Notes */}
      {repair.notes ? (
        <>
          <Text style={s.sectionLabel}>บันทึกช่าง</Text>
          <View style={s.card}><Text style={s.desc}>{repair.notes}</Text></View>
        </>
      ) : null}

      {/* Image */}
      {repair.image_url ? (
        <>
          <Text style={s.sectionLabel}>รูปภาพ</Text>
          <Image source={{ uri: repair.image_url }} style={s.image} resizeMode="cover" />
        </>
      ) : null}

      {/* Action buttons */}
      {transitions.map(t => (
        <TouchableOpacity key={t.status} style={[s.actionBtn, { backgroundColor: t.color }]} onPress={() => openModal(t.status)}>
          <Text style={s.actionTxt}>{t.label}</Text>
        </TouchableOpacity>
      ))}

      {/* Update modal */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>
              {nextStatus === 'assigned' ? 'รับงาน' : nextStatus === 'in_progress' ? 'เริ่มซ่อม' : 'ยืนยันเสร็จงาน'}
            </Text>

            <Text style={s.inputLabel}>บันทึก / หมายเหตุ</Text>
            <TextInput style={s.modalInput} value={notes} onChangeText={setNotes}
              multiline numberOfLines={3} placeholder="อธิบายการซ่อม..." textAlignVertical="top" />

            {nextStatus === 'done' && (
              <>
                <Text style={s.inputLabel}>ค่าอะไหล่ (บาท)</Text>
                <TextInput style={s.modalInput} value={partsCost} onChangeText={setPartsCost}
                  keyboardType="decimal-pad" placeholder="0.00" />

                <TouchableOpacity style={s.imgPickBtn} onPress={pickImage}>
                  <Ionicons name="camera-outline" size={18} color={NAVY} />
                  <Text style={s.imgPickTxt}>{imageUri ? 'เปลี่ยนรูป' : 'แนบรูป (ถ้ามี)'}</Text>
                </TouchableOpacity>
                {imageUri && <Image source={{ uri: imageUri }} style={s.previewImg} />}
              </>
            )}

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModal(false)}>
                <Text style={s.cancelTxt}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, { backgroundColor: STATUS_COLOR[nextStatus] || NAVY }]} onPress={handleUpdate} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmTxt}>ยืนยัน</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.row}>
      <Ionicons name={icon as any} size={16} color="#64748b" style={{ marginTop: 1 }} />
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f0f4f8' },
  content:     { padding: 16, paddingBottom: 40 },
  topRow:      { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  statusTxt:   { fontSize: 13, fontWeight: '700' },
  priorityBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  priorityTxt:   { fontSize: 13, fontWeight: '700', color: '#fff' },
  title:       { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 14 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  row:       { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
  rowLabel:  { fontSize: 13, color: '#64748b', width: 70 },
  rowValue:  { fontSize: 13, color: '#1e293b', flex: 1, fontWeight: '500' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 6, marginTop: 4 },
  desc:      { fontSize: 14, color: '#334155', lineHeight: 20 },
  image:     { width: '100%', height: 200, borderRadius: 12, marginBottom: 12 },
  actionBtn: { borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 10 },
  actionTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  modalTitle:   { fontSize: 18, fontWeight: '700', color: NAVY, marginBottom: 16 },
  inputLabel:   { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4, marginTop: 10 },
  modalInput:   { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#f8fafc', minHeight: 70 },
  imgPickBtn:   { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 10, marginTop: 8 },
  imgPickTxt:   { fontSize: 14, color: NAVY, fontWeight: '600' },
  previewImg:   { width: '100%', height: 160, borderRadius: 10, marginTop: 8 },
  modalBtns:    { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn:    { flex: 1, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  cancelTxt:    { fontSize: 15, color: '#64748b', fontWeight: '600' },
  confirmBtn:   { flex: 2, padding: 14, borderRadius: 8, alignItems: 'center' },
  confirmTxt:   { fontSize: 15, color: '#fff', fontWeight: '700' },
});
