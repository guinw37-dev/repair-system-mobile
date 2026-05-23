import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { login } from '../api/auth';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleLogin() {
    if (!username || !password) {
      Alert.alert('กรุณากรอก username และ password');
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await login({ username, password });
      await signIn(token, user);
    } catch (e: any) {
      Alert.alert('เข้าสู่ระบบไม่สำเร็จ', e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.card}>
        <Text style={s.logo}>🔧</Text>
        <Text style={s.title}>ระบบแจ้งซ่อม</Text>
        <Text style={s.subtitle}>Repair Management System</Text>

        <TextInput
          style={s.input}
          placeholder="Username"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={s.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>เข้าสู่ระบบ</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const NAVY = '#1f4e79';
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '88%', backgroundColor: '#fff', borderRadius: 16,
    padding: 28, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  logo:     { fontSize: 48, marginBottom: 8 },
  title:    { fontSize: 22, fontWeight: '700', color: NAVY },
  subtitle: { fontSize: 13, color: '#888', marginBottom: 24 },
  input: {
    width: '100%', borderWidth: 1, borderColor: '#d0d8e4',
    borderRadius: 8, padding: 12, marginBottom: 12,
    fontSize: 15, backgroundColor: '#f8fafc',
  },
  btn: {
    width: '100%', backgroundColor: NAVY, borderRadius: 8,
    padding: 14, alignItems: 'center', marginTop: 4,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
