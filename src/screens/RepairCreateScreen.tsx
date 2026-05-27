import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Modal, FlatList, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { createRepair } from '../api/repairs';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const NAVY = '#1f4e79';

interface Floor      { id: string; name: string; }
interface Department { id: number; name: string; floor_id: string; }
interface Building   { id: string; name: string; floors: Floor[]; departments: Department[]; }

function SelectModal({
  visible, title, items, onSelect, onClose,
}: {
  visible: boolean; title: string;
  items: { label: string; value: string }[];
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={m.overlay}>
        <View style={m.sheet}>
          <View style={m.sheetHeader}>
            <Text style={m.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color="#64748b" /></TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={i => i.value}
            renderItem={({ item }) => (
              <TouchableOpacity style={m.item} onPress={() => { onSelect(item.value); onClose(); }}>
                <Text style={m.itemTxt}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function RepairCreateScreen() {
  const nav = useNavigation();
  const { user } = useAuth();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [building, setBuilding]   = useState('');
  const [floor, setFloor]         = useState('');
  const [department, setDept]     = useState('');
  const [desc, setDesc]           = useState('');
  const [telephone, setTel]       = useState('');
  const [imageUri, setImageUri]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  const [modal, setModal] = useState<'building' | 'floor' | 'dept' | null>(null);

  useEffect(() => {
    api.get('/data/buildings')
      .then(r => setBuildings(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setInitLoading(false));
  }, []);

  const selectedBuilding = buildings.find(b => b.name === building);
  const floors = selectedBuilding?.floors ?? [];
  const departments = selectedBuilding
    ? selectedBuilding.departments.filter(d => !floor || !d.floor_id || d.floor_id === floor)
    : [];

  function onBuildingSelect(v: string) {
    setBuilding(v);
    setFloor('');
    setDept('');
  }
  function onFloorSelect(v: string) {
    setFloor(v);
    setDept('');
  }

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('ต้องการสิทธิ์เข้าถึงรูปภาพ'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!res.canceled) setImageUri(res.assets[0].uri);
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('ต้องการสิทธิ์เข้าถึงกล้อง'); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
    if (!res.canceled) setImageUri(res.assets[0].uri);
  }

  async function handleSubmit() {
    if (!building) { Alert.alert('กรุณาเลือกอาคาร'); return; }
    if (!department) { Alert.alert('กรุณาเลือกแผนก'); return; }
    if (!desc.trim()) { Alert.alert('กรุณากรอกรายละเอียด'); return; }

    setLoading(true);
    try {
      const body: Record<string, any> = {
        title: desc.trim(),
        building,
        floor,
        category: department,
        reported_by_name: user?.name || user?.username || 'ผู้แจ้ง',
        telephone: telephone.trim(),
      };

      // Attach image as base64 if selected
      if (imageUri) {
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
        body.fileBase64 = base64;
        body.fileName   = `repair_photo.${ext}`;
      }

      await createRepair(body);
      Alert.alert('แจ้งซ่อมสำเร็จ', '', [{ text: 'OK', onPress: () => nav.goBack() }]);
    } catch (e: any) {
      Alert.alert('ไม่สำเร็จ', e?.response?.data?.error || e.message);
    } finally { setLoading(false); }
  }

  if (initLoading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={NAVY} />;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

      {/* อาคาร */}
      <Text style={s.label}>1. อาคาร <Text style={s.req}>*</Text></Text>
      <TouchableOpacity style={s.select} onPress={() => setModal('building')}>
        <Text style={[s.selectTxt, !building && s.placeholder]}>{building || '- เลือกอาคาร -'}</Text>
        <Ionicons name="chevron-down" size={16} color="#94a3b8" />
      </TouchableOpacity>

      {/* ชั้น */}
      <Text style={s.label}>2. ชั้น</Text>
      <TouchableOpacity style={[s.select, !building && s.disabled]} onPress={() => building && setModal('floor')}>
        <Text style={[s.selectTxt, !floor && s.placeholder]}>{floor || '- เลือกชั้น -'}</Text>
        <Ionicons name="chevron-down" size={16} color="#94a3b8" />
      </TouchableOpacity>

      {/* แผนก */}
      <Text style={s.label}>3. แผนก <Text style={s.req}>*</Text></Text>
      <TouchableOpacity style={[s.select, !building && s.disabled]} onPress={() => building && setModal('dept')}>
        <Text style={[s.selectTxt, !department && s.placeholder]}>{department || '- เลือกแผนก -'}</Text>
        <Ionicons name="chevron-down" size={16} color="#94a3b8" />
      </TouchableOpacity>

      {/* รายละเอียด */}
      <Text style={s.label}>4. รายละเอียดปัญหา <Text style={s.req}>*</Text></Text>
      <TextInput
        style={[s.input, s.textarea]} value={desc} onChangeText={setDesc}
        multiline numberOfLines={4} placeholder="อธิบายปัญหาที่พบ..." textAlignVertical="top"
      />

      {/* ชื่อผู้แจ้ง */}
      <Text style={s.label}>5. ชื่อผู้แจ้ง</Text>
      <View style={[s.input, s.readOnly]}>
        <Text style={s.readOnlyTxt}>{user?.name || user?.username || '-'}</Text>
      </View>

      {/* เบอร์โทร */}
      <Text style={s.label}>6. เบอร์โทรติดต่อ</Text>
      <TextInput
        style={s.input} value={telephone} onChangeText={setTel}
        placeholder="กรอกเบอร์โทร" keyboardType="phone-pad"
      />

      {/* รูปภาพ */}
      <Text style={s.label}>7. รูปภาพประกอบ (ถ้ามี)</Text>
      <View style={s.imgRow}>
        <TouchableOpacity style={s.imgBtn} onPress={pickImage}>
          <Ionicons name="image-outline" size={20} color={NAVY} />
          <Text style={s.imgBtnTxt}>เลือกรูป</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.imgBtn} onPress={takePhoto}>
          <Ionicons name="camera-outline" size={20} color={NAVY} />
          <Text style={s.imgBtnTxt}>ถ่ายรูป</Text>
        </TouchableOpacity>
      </View>
      {imageUri && (
        <View style={s.imgPreviewBox}>
          <Image source={{ uri: imageUri }} style={s.imgPreview} resizeMode="cover" />
          <TouchableOpacity style={s.imgRemove} onPress={() => setImageUri(null)}>
            <Ionicons name="close-circle" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitTxt}>📤 แจ้งซ่อม</Text>}
      </TouchableOpacity>

      {/* Modals */}
      <SelectModal
        visible={modal === 'building'} title="เลือกอาคาร"
        items={buildings.map(b => ({ label: b.name, value: b.name }))}
        onSelect={onBuildingSelect} onClose={() => setModal(null)}
      />
      <SelectModal
        visible={modal === 'floor'} title="เลือกชั้น"
        items={floors.length ? floors.map(f => ({ label: f.name, value: f.name })) : [{ label: 'ทั้งหมด', value: '' }]}
        onSelect={onFloorSelect} onClose={() => setModal(null)}
      />
      <SelectModal
        visible={modal === 'dept'} title="เลือกแผนก"
        items={departments.map(d => ({ label: d.name, value: d.name }))}
        onSelect={setDept} onClose={() => setModal(null)}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  content:   { padding: 16, paddingBottom: 40 },
  label:     { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4, marginTop: 14 },
  req:       { color: '#ef4444' },
  select: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 8, padding: 12,
  },
  selectTxt:   { fontSize: 14, color: '#1e293b' },
  placeholder: { color: '#94a3b8' },
  disabled:    { opacity: 0.5 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 8, padding: 12, fontSize: 14,
  },
  textarea:    { height: 100 },
  readOnly:    { justifyContent: 'center' },
  readOnlyTxt: { fontSize: 14, color: '#64748b' },
  imgRow:       { flexDirection: 'row', gap: 10 },
  imgBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 8, padding: 12,
  },
  imgBtnTxt:    { fontSize: 14, color: NAVY, fontWeight: '600' },
  imgPreviewBox:{ marginTop: 10, position: 'relative' },
  imgPreview:   { width: '100%', height: 180, borderRadius: 10 },
  imgRemove: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: '#fff', borderRadius: 12,
  },
  submitBtn: {
    backgroundColor: NAVY, borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 24,
  },
  submitTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

const m = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: '#0006', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  sheetTitle:  { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  item:        { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#f8fafc' },
  itemTxt:     { fontSize: 15, color: '#1e293b' },
});
