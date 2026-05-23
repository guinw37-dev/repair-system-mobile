import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function OperationScreen() {
  return (
    <View style={s.container}>
      <Text style={s.icon}>⏰</Text>
      <Text style={s.title}>Operation Reminders</Text>
      <Text style={s.sub}>กำลังพัฒนา — Phase 2</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', justifyContent: 'center', alignItems: 'center' },
  icon:  { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#c55a11' },
  sub:   { fontSize: 14, color: '#888', marginTop: 6 },
});
