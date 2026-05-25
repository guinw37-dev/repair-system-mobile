import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, Image, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import {
  getRepair, updateRepair, Repair,
  STATUS_COLOR, STATUS_TH, PRIORITY_COLOR, PRIORITY_TH,
} from '../api/repairs';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

interface JobType { id: number; code: string; name: string; issue_type: string; }

const NAVY = '#1f4e79';

/** Convert relative /uploads/... path to full URL using api baseURL */
function toFullUrl(path: string | null | undefined): string | null {
  if (!path || path === '-') return null;
  if (path.startsWith('http')) return path;
  // Strip /api/hospitalSlug suffix → get origin only
  const base = api.defaults.baseURL || '';
  const origin = base.replace(/\/api\/.*$/, '');
  return origin + path;
}

// Next statuses a technician can move to
const TECH_TRANSITIONS: Record<string, { status: string; label: string; color: string }[]> = {
  pending:     [{ status: 'assigned',    label: '✅ รับงาน',         color: '#3b82f6' }],
  assigned:    [{ status: 'in_progress', label: '🔧 เริ่มซ่อม',      color: '#8b5cf6' }],
  in_progress: [{ status: 'done',        label: '🎉 ซ่อมเสร็จ',      color: '#22c55e' }],
  done:        [{ status: 'evaluate',    label: '⭐ ประเมินความพึงพอใจ', color: '#f59e0b' }],
  evaluated:   [{ status: 'close',       label: '🔩 ตัดอะไหล่/ปิดงาน', color: '#64748b' }],
};

export default function RepairDetailScreen() {
  const { params } = useRoute<any>();
  const nav = useNavigation();
  const { user, isTech, isAdmin } = useAuth();

  const [repair, setRepair]   = useState<Repair | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [notes, setNotes]         = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [imageUri, setImageUri]   = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [nextStatus, setNextStatus] = useState('');
  const [scorePolite, setScorePolite] = useState('5');
  const [scoreSpeed, setScoreSpeed]   = useState('5');
  const [scoreSkill, setScoreSkill]   = useState('5');
  const [scoreSat, setScoreSat]       = useState('5');
  // Assign form
  const [jobTypes, setJobTypes]       = useState<JobType[]>([]);
  const [assignName, setAssignName]   = useState('');
  const [issueType, setIssueType]     = useState('');
  const [issueTypeName, setIssueTypeName] = useState('');
  const [jobDetail, setJobDetail]     = useState('');
  const [typeModal, setTypeModal]     = useState(false);
  const [priority, setPriority]       = useState('ปกติ');
  const [statusWork, setStatusWork]   = useState('');
  const [statusWorkName, setStatusWorkName] = useState('');
  const [workTypeModal, setWorkTypeModal] = useState(false);
  // Spare parts / close form
  const [stockItems, setStockItems]   = useState<any[]>([]);
  const [staffList, setStaffList]     = useState<any[]>([]);
  const [partSearch, setPartSearch]   = useState('');
  const [partQty, setPartQty]         = useState('1');
  const [cart, setCart]               = useState<{code:string;name:string;qty:number;price:number}[]>([]);
  const [pickerName, setPickerName]   = useState('');
  const [staffModal, setStaffModal]   = useState(false);
  const [partResults, setPartResults] = useState<any[]>([]);
  const [partPickerModal, setPartPickerModal] = useState(false);
  const [pendingPart, setPendingPart] = useState<any>(null);
  const [pendingQty, setPendingQty]   = useState('1');

  const load = useCallback(async () => {
    setLoading(true);
    try { setRepair(await getRepair(params.id)); }
    catch (e) { Alert.alert('โหลดไม่สำเร็จ'); nav.goBack(); }
    finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get('/data/types').then(r => { if (Array.isArray(r.data)) setJobTypes(r.data); }).catch(() => {});
    api.get('/stock').then(r => { if (Array.isArray(r.data)) setStockItems(r.data); }).catch(() => {});
    api.get('/data/staff').then(r => { if (Array.isArray(r.data)) setStaffList(r.data); }).catch(() => {});
  }, []);

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
    setAssignName(user?.name || '');
    setIssueType('');
    setIssueTypeName('');
    setJobDetail('');
    setPriority(repair?.priority === 'critical' ? 'วิกฤต' : repair?.priority === 'urgent' ? 'เร่งด่วน' : 'ปกติ');
    setCart([]);
    setPartSearch('');
    setPartQty('1');
    setPickerName(user?.name || '');
    setStatusWork('');
    setStatusWorkName('');
    setModal(true);
  }

  async function handleUpdate() {
    setSaving(true);
    try {
      if (nextStatus === 'evaluate') {
        await api.post(`/repairs/${repair!.id}/evaluate`, {
          scorePolite: parseInt(scorePolite),
          scoreSpeed:  parseInt(scoreSpeed),
          scoreSkill:  parseInt(scoreSkill),
          scoreSat:    parseInt(scoreSat),
          suggestions: notes,
        });
      } else if (nextStatus === 'close') {
        await api.post(`/repairs/${repair!.id}/spare-parts`, {
          cartItems: cart,
          pickerName,
          remark: notes,
          noSparePart: cart.length === 0,
        });
      } else {
        const body: Record<string, unknown> = { status: nextStatus };
        if (notes) body.notes = notes;
        if (partsCost) body.parts_cost = parseFloat(partsCost);
        if (nextStatus === 'in_progress' && statusWork) body.status_work = statusWork;
        if (nextStatus === 'assigned') {
          body.assigned_to_name = assignName || user?.name;
          body.issue_type = priority; // priority stored as Thai string: วิกฤต/เร่งด่วน/ปกติ
          if (issueType) body.job_code = issueType; // job type → job_code field
          if (jobDetail) body.job_detail = jobDetail;
        }
        await updateRepair(repair!.id, body);
      }
      setModal(false);
      load();
    } catch (e: any) {
      Alert.alert('ไม่สำเร็จ', e?.response?.data?.error || e?.response?.data?.message || e.message);
    } finally { setSaving(false); }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={NAVY} />;
  if (!repair) return null;

  const transitions = TECH_TRANSITIONS[repair.status] || [];

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

      {/* Type picker modal */}
      <Modal visible={typeModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { padding: 0, paddingBottom: 0 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#f1f5f9' }}>
              <Text style={s.modalTitle}>เลือกประเภทงาน</Text>
              <TouchableOpacity onPress={() => setTypeModal(false)}><Ionicons name="close" size={22} color="#64748b" /></TouchableOpacity>
            </View>
            <FlatList
              data={jobTypes}
              keyExtractor={i => String(i.id)}
              style={{ maxHeight: 350 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#f8fafc' }}
                  onPress={() => { setIssueType(item.issue_type || item.code); setIssueTypeName(item.name); setTypeModal(false); }}>
                  <Text style={{ fontSize: 15, color: '#1e293b' }}>{item.name}</Text>
                  {item.code ? <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{item.code}</Text> : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Work type picker modal (for in_progress) */}
      <Modal visible={workTypeModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { padding: 0, paddingBottom: 0 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#f1f5f9' }}>
              <Text style={s.modalTitle}>เลือกประเภทการซ่อม</Text>
              <TouchableOpacity onPress={() => setWorkTypeModal(false)}><Ionicons name="close" size={22} color="#64748b" /></TouchableOpacity>
            </View>
            <FlatList
              data={jobTypes}
              keyExtractor={i => String(i.id)}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#f8fafc' }}
                  onPress={() => {
                    setStatusWork(item.status_work || item.name);
                    setStatusWorkName(item.name);
                    setWorkTypeModal(false);
                  }}>
                  <Text style={{ fontSize: 15, color: '#1e293b' }}>{item.name}</Text>
                  {item.code ? <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{item.code}</Text> : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Part picker modal — with images */}
      <Modal visible={partPickerModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { padding: 0, paddingBottom: 0 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#f1f5f9' }}>
              <Text style={s.modalTitle}>เลือกอะไหล่</Text>
              <TouchableOpacity onPress={() => { setPartPickerModal(false); setPendingPart(null); }}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Selected part preview */}
            {pendingPart && (
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f0f9ff', borderBottomWidth: 1, borderColor: '#bae6fd', gap: 12 }}>
                {toFullUrl(pendingPart.image_url) ? (
                  <Image source={{ uri: toFullUrl(pendingPart.image_url)! }} style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: '#e2e8f0' }} resizeMode="cover" />
                ) : (
                  <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="cube-outline" size={28} color="#94a3b8" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }}>{pendingPart.name}</Text>
                  <Text style={{ fontSize: 12, color: '#64748b' }}>รหัส: {pendingPart.code} · คงเหลือ: {pendingPart.remaining}</Text>
                  <Text style={{ fontSize: 13, color: NAVY, fontWeight: '600' }}>฿{Number(pendingPart.price || 0).toLocaleString()}/ชิ้น</Text>
                </View>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 11, color: '#64748b' }}>จำนวน</Text>
                  <TextInput
                    style={{ borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, width: 52, textAlign: 'center', fontSize: 16, fontWeight: '700', padding: 4, backgroundColor: '#fff' }}
                    value={pendingQty} onChangeText={setPendingQty} keyboardType="numeric" />
                </View>
              </View>
            )}

            <FlatList
              data={partResults}
              keyExtractor={i => String(i.id)}
              style={{ maxHeight: pendingPart ? 240 : 380 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f8fafc', gap: 12 },
                    pendingPart?.id === item.id && { backgroundColor: '#eff6ff' }
                  ]}
                  onPress={() => { setPendingPart(item); setPendingQty('1'); }}>
                  {toFullUrl(item.image_url) ? (
                    <Image source={{ uri: toFullUrl(item.image_url)! }} style={{ width: 44, height: 44, borderRadius: 6, backgroundColor: '#e2e8f0' }} resizeMode="cover" />
                  ) : (
                    <View style={{ width: 44, height: 44, borderRadius: 6, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="cube-outline" size={22} color="#94a3b8" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e293b' }}>{item.name}</Text>
                    <Text style={{ fontSize: 12, color: '#94a3b8' }}>{item.code} · คงเหลือ: {item.remaining}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: NAVY }}>฿{Number(item.price || 0).toLocaleString()}</Text>
                </TouchableOpacity>
              )}
            />

            {pendingPart && (
              <View style={{ padding: 16 }}>
                <TouchableOpacity style={[s.addPartBtn, { borderRadius: 10, paddingVertical: 12 }]} onPress={() => {
                  const qty = parseInt(pendingQty) || 1;
                  setCart(prev => {
                    const ex = prev.find(c => c.code === pendingPart.code);
                    if (ex) return prev.map(c => c.code === pendingPart.code ? { ...c, qty: c.qty + qty } : c);
                    return [...prev, { code: pendingPart.code, name: pendingPart.name, qty, price: parseFloat(pendingPart.price) || 0 }];
                  });
                  setPartPickerModal(false);
                  setPartSearch('');
                  setPartResults([]);
                  setPendingPart(null);
                }}>
                  <Text style={[s.addPartBtnTxt, { fontSize: 15 }]}>+ เพิ่มเข้าตะกร้า</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Staff picker modal */}
      <Modal visible={staffModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { padding: 0, paddingBottom: 0 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#f1f5f9' }}>
              <Text style={s.modalTitle}>เลือกผู้เบิก</Text>
              <TouchableOpacity onPress={() => setStaffModal(false)}><Ionicons name="close" size={22} color="#64748b" /></TouchableOpacity>
            </View>
            <FlatList
              data={staffList}
              keyExtractor={i => String(i.id)}
              style={{ maxHeight: 350 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#f8fafc' }}
                  onPress={() => { setPickerName(item.name); setStaffModal(false); }}>
                  <Text style={{ fontSize: 15, color: '#1e293b' }}>{item.name}</Text>
                  {item.role ? <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{item.role}</Text> : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Update modal */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>
              {nextStatus === 'assigned'    ? 'รับงาน'
               : nextStatus === 'in_progress' ? 'เริ่มซ่อม'
               : nextStatus === 'done'        ? 'ยืนยันเสร็จงาน'
               : nextStatus === 'evaluate'    ? 'ประเมินความพึงพอใจ'
               : 'ตัดอะไหล่ / ปิดงาน'}
            </Text>

            {nextStatus === 'assigned' ? (
              <>
                <Text style={s.inputLabel}>ชื่อช่าง</Text>
                <TextInput style={s.modalInput} value={assignName} onChangeText={setAssignName}
                  placeholder="ชื่อช่างที่รับงาน" />

                <Text style={s.inputLabel}>ความสำคัญ</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  {[
                    { label: 'ปกติ',    color: '#64748b' },
                    { label: 'เร่งด่วน', color: '#f97316' },
                    { label: 'วิกฤต',   color: '#dc2626' },
                  ].map(({ label, color }) => (
                    <TouchableOpacity
                      key={label}
                      onPress={() => setPriority(label)}
                      style={[s.priorityBtn, priority === label && { backgroundColor: color, borderColor: color }]}>
                      <Text style={[s.priorityBtnTxt, priority === label && { color: '#fff' }]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.inputLabel}>ประเภทงาน</Text>
                <TouchableOpacity style={s.typeSelect} onPress={() => setTypeModal(true)}>
                  <Text style={[s.typeSelectTxt, !issueTypeName && { color: '#94a3b8' }]}>
                    {issueTypeName || '- เลือกประเภทงาน -'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                </TouchableOpacity>

                <Text style={s.inputLabel}>รายละเอียดงาน</Text>
                <TextInput style={[s.modalInput, { minHeight: 80 }]} value={jobDetail} onChangeText={setJobDetail}
                  multiline numberOfLines={3} placeholder="รายละเอียดการซ่อม..." textAlignVertical="top" />
              </>
            ) : nextStatus === 'evaluate' ? (
              <>
                {[
                  { label: 'ความสุภาพ', val: scorePolite, set: setScorePolite },
                  { label: 'ความรวดเร็ว', val: scoreSpeed, set: setScoreSpeed },
                  { label: 'ทักษะการซ่อม', val: scoreSkill, set: setScoreSkill },
                  { label: 'ความพึงพอใจรวม', val: scoreSat, set: setScoreSat },
                ].map(({ label, val, set }) => (
                  <View key={label}>
                    <Text style={s.inputLabel}>{label}: <Text style={{ color: NAVY, fontWeight: '700' }}>{val}/5</Text></Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                      {['1','2','3','4','5'].map(n => (
                        <TouchableOpacity key={n} onPress={() => set(n)}
                          style={[s.scoreBtn, val === n && s.scoreBtnActive]}>
                          <Text style={[s.scoreBtnTxt, val === n && { color: '#fff' }]}>{n}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
                <Text style={s.inputLabel}>ข้อเสนอแนะ</Text>
                <TextInput style={s.modalInput} value={notes} onChangeText={setNotes}
                  multiline numberOfLines={2} placeholder="ข้อเสนอแนะ..." textAlignVertical="top" />
              </>
            ) : nextStatus === 'close' ? (
              <>
                {/* Job number */}
                <View style={s.closeJobRow}>
                  <Text style={s.closeJobLabel}>จัดการเคส:</Text>
                  <Text style={s.closeJobNum}>{repair?.job_number || `#${repair?.id}`}</Text>
                </View>

                {/* Warning if no parts */}
                {cart.length === 0 && (
                  <View style={s.closeWarning}>
                    <Ionicons name="alert-circle-outline" size={14} color="#b45309" />
                    <Text style={s.closeWarningTxt}> ไม่มีการเบิกใช้อะไหล่ในเคสนี้ (ปิดงานทันที)</Text>
                  </View>
                )}

                {/* Search + Add */}
                <Text style={s.inputLabel}>ค้นหาและเพิ่มรายการอะไหล่</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                  <TextInput
                    style={[s.modalInput, { flex: 1, minHeight: 0, paddingVertical: 8 }]}
                    value={partSearch}
                    onChangeText={v => {
                      setPartSearch(v);
                      const kw = v.trim().toLowerCase();
                      if (kw.length < 1) { setPartResults([]); return; }
                      setPartResults(
                        stockItems.filter(i =>
                          i.name?.toLowerCase().includes(kw) || i.code?.toLowerCase().includes(kw)
                        ).slice(0, 20)
                      );
                    }}
                    placeholder="พิมพ์ชื่อหรือรหัสอะไหล่..." />
                  <TouchableOpacity style={s.addPartBtn} onPress={() => {
                    if (!partResults.length) { Alert.alert('พิมพ์ชื่ออะไหล่ก่อน'); return; }
                    setPendingPart(null);
                    setPendingQty('1');
                    setPartPickerModal(true);
                  }}>
                    <Text style={s.addPartBtnTxt}>🔍 เลือก</Text>
                  </TouchableOpacity>
                </View>

                {/* Cart table */}
                {cart.length > 0 && (
                  <View style={s.cartTable}>
                    <View style={s.cartHeader}>
                      <Text style={[s.cartCell, { flex: 2 }]}>รหัส / ชื่อ</Text>
                      <Text style={[s.cartCell, { width: 36, textAlign: 'center' }]}>จน.</Text>
                      <Text style={[s.cartCell, { width: 64, textAlign: 'right' }]}>รวม</Text>
                      <Text style={[s.cartCell, { width: 32, textAlign: 'center' }]}>ลบ</Text>
                    </View>
                    {cart.map((item, idx) => (
                      <View key={idx} style={s.cartRow}>
                        <View style={{ flex: 2 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#1e293b' }}>{item.code}</Text>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>{item.name}</Text>
                        </View>
                        <Text style={{ width: 36, textAlign: 'center', fontSize: 13 }}>{item.qty}</Text>
                        <Text style={{ width: 64, textAlign: 'right', fontSize: 13 }}>฿{(item.qty * item.price).toLocaleString()}</Text>
                        <TouchableOpacity style={{ width: 32, alignItems: 'center' }}
                          onPress={() => setCart(prev => prev.filter((_, i) => i !== idx))}>
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    <View style={s.cartTotalRow}>
                      <Text style={s.cartTotalLabel}>รวมทั้งหมด</Text>
                      <Text style={s.cartTotalVal}>฿{cart.reduce((a, c) => a + c.qty * c.price, 0).toLocaleString()}</Text>
                    </View>
                  </View>
                )}

                {/* ผู้เบิก */}
                <Text style={s.inputLabel}>ผู้เบิก (ช่าง / ผู้รับของ)</Text>
                <TouchableOpacity style={s.typeSelect} onPress={() => setStaffModal(true)}>
                  <Text style={[s.typeSelectTxt, !pickerName && { color: '#94a3b8' }]}>
                    {pickerName || '-- เลือกผู้เบิก --'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                </TouchableOpacity>

                {/* หมายเหตุ */}
                <Text style={s.inputLabel}>หมายเหตุ</Text>
                <TextInput style={[s.modalInput, { minHeight: 60 }]} value={notes} onChangeText={setNotes}
                  multiline numberOfLines={2} placeholder="ระบุรายละเอียด..." textAlignVertical="top" />
              </>
            ) : nextStatus === 'in_progress' ? (
              <>
                <Text style={s.inputLabel}>Status Work</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {['Start Working', 'Pending on Contractor', 'Hold'].map(opt => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setStatusWork(opt)}
                      style={[
                        s.scoreBtn,
                        { flex: 0, paddingHorizontal: 14 },
                        statusWork === opt && s.scoreBtnActive,
                      ]}>
                      <Text style={[s.scoreBtnTxt, statusWork === opt && { color: '#fff' }]}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.inputLabel}>Work Description</Text>
                <TextInput style={[s.modalInput, { minHeight: 80 }]} value={notes} onChangeText={setNotes}
                  multiline numberOfLines={3} placeholder="อธิบายงานที่กำลังดำเนินการ..." textAlignVertical="top" />
              </>
            ) : nextStatus === 'done' ? (
              <>
                <Text style={s.inputLabel}>สรุปผลการซ่อม <Text style={{ color: '#94a3b8', fontWeight: '400' }}>(ไม่บังคับ)</Text></Text>
                <TextInput style={[s.modalInput, { minHeight: 100 }]} value={notes} onChangeText={setNotes}
                  multiline numberOfLines={4} placeholder="สรุปสิ่งที่ซ่อม / วิธีแก้ไข..." textAlignVertical="top" />
              </>
            ) : (
              <>
                <Text style={s.inputLabel}>บันทึก / หมายเหตุ</Text>
                <TextInput style={s.modalInput} value={notes} onChangeText={setNotes}
                  multiline numberOfLines={3} placeholder="อธิบาย..." textAlignVertical="top" />
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
  scoreBtn:     { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', backgroundColor: '#f8fafc' },
  scoreBtnActive: { backgroundColor: NAVY, borderColor: NAVY },
  scoreBtnTxt:  { fontSize: 14, fontWeight: '600', color: '#334155' },
  priorityBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1.5,
    borderColor: '#e2e8f0', alignItems: 'center', backgroundColor: '#f8fafc',
  },
  priorityBtnTxt: { fontSize: 14, fontWeight: '700', color: '#334155' },
  typeSelect: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10,
    backgroundColor: '#f8fafc', marginBottom: 4,
  },
  typeSelectTxt: { fontSize: 14, color: '#1e293b', flex: 1 },
  // Close / spare parts
  closeJobRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  closeJobLabel: { fontSize: 13, color: '#64748b', marginRight: 6 },
  closeJobNum:   { fontSize: 14, fontWeight: '700', color: NAVY },
  closeWarning:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', borderRadius: 8, padding: 8, marginBottom: 8 },
  closeWarningTxt: { fontSize: 12, color: '#b45309', flex: 1 },
  addPartBtn:    { backgroundColor: NAVY, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' },
  addPartBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cartTable:     { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginBottom: 8, overflow: 'hidden' },
  cartHeader:    { flexDirection: 'row', backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  cartCell:      { fontSize: 11, fontWeight: '700', color: '#64748b' },
  cartRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  cartTotalRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#f0f4f8' },
  cartTotalLabel:{ fontSize: 13, fontWeight: '700', color: '#334155' },
  cartTotalVal:  { fontSize: 14, fontWeight: '700', color: NAVY },
});
