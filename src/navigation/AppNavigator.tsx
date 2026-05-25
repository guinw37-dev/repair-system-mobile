import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { registerPushToken } from '../api/notifications';
import { api } from '../api/client';

import LoginScreen          from '../screens/LoginScreen';
import HomeScreen           from '../screens/HomeScreen';
import RepairListScreen     from '../screens/RepairListScreen';
import RepairDetailScreen   from '../screens/RepairDetailScreen';
import RepairCreateScreen   from '../screens/RepairCreateScreen';
import PMListScreen         from '../screens/PMListScreen';
import PMDashboardScreen    from '../screens/PMDashboardScreen';
import OperationScreen      from '../screens/OperationScreen';
import DashboardScreen      from '../screens/DashboardScreen';
import NotificationScreen   from '../screens/NotificationScreen';
import ProfileScreen        from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();
const NAVY  = '#1f4e79';

function NotifBell() {
  const nav = useNavigation<any>();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    // Notification count — skip if endpoint not available
    api.get('/repairs?status=pending')
      .then(r => {
        const arr = Array.isArray(r.data) ? r.data : [];
        setUnread(arr.length > 9 ? 9 : arr.length);
      })
      .catch(() => {});
  }, []);

  return (
    <TouchableOpacity onPress={() => nav.navigate('Notifications')} style={{ marginRight: 4, padding: 6 }}>
      <Ionicons name="notifications-outline" size={22} color="#fff" />
      {unread > 0 && (
        <View style={st.badge}>
          <Text style={st.badgeTxt}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  badge:    { position: 'absolute', top: 2, right: 2, backgroundColor: '#ef4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '700' },
});

function TabNav() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: NAVY },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => <NotifBell />,
        tabBarActiveTintColor: NAVY,
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: { paddingBottom: 4, height: 58 },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, [string, string]> = {
            Repairs:   ['construct',   'construct-outline'],
            PM:        ['calendar',    'calendar-outline'],
            Operation: ['alarm',       'alarm-outline'],
            Dashboard: ['speedometer', 'speedometer-outline'],
            Profile:   ['person',      'person-outline'],
          };
          const [on, off] = icons[route.name] || ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? on : off) as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Repairs"   component={RepairListScreen}  options={{ title: 'แจ้งซ่อม' }} />
      <Tab.Screen name="PM"        component={PMListScreen}       options={{ title: 'PM' }} />
      <Tab.Screen name="Operation" component={OperationScreen}    options={{ title: 'Operation' }} />
      <Tab.Screen name="Dashboard" component={DashboardScreen}    options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Profile"   component={ProfileScreen}      options={{ title: 'โปรไฟล์', headerRight: undefined }} />
    </Tab.Navigator>
  );
}

function AuthedStack() {
  const { user } = useAuth();
  const navRef = useRef<any>(null);

  // Register FCM push token after login
  useEffect(() => {
    if (user) registerPushToken();
  }, [user]);

  // Handle notification tap → navigate to repair
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      if (data?.repairId) {
        navRef.current?.navigate('RepairDetail', { id: data.repairId });
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: NAVY },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="Main"          component={TabNav}            options={{ headerShown: false }} />
      <Stack.Screen name="RepairDetail"  component={RepairDetailScreen} options={{ title: 'รายละเอียดงานซ่อม' }} />
      <Stack.Screen name="RepairCreate"  component={RepairCreateScreen} options={{ title: 'แจ้งซ่อมใหม่' }} />
      <Stack.Screen name="PMDashboard"   component={PMDashboardScreen}  options={{ title: 'PM Dashboard' }} />
      <Stack.Screen name="Notifications" component={NotificationScreen} options={{ title: 'การแจ้งเตือน' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Stack.Navigator key={user ? 'authed' : 'guest'} screenOptions={{ headerShown: false }}>
      {!user
        ? <Stack.Screen name="Login" component={LoginScreen} />
        : <Stack.Screen name="App"   component={AuthedStack} />
      }
    </Stack.Navigator>
  );
}
