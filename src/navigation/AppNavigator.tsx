import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import LoginScreen         from '../screens/LoginScreen';
import HomeScreen          from '../screens/HomeScreen';
import RepairListScreen    from '../screens/RepairListScreen';
import RepairCreateScreen  from '../screens/RepairCreateScreen';
import PMListScreen        from '../screens/PMListScreen';
import PMDashboardScreen   from '../screens/PMDashboardScreen';
import OperationScreen     from '../screens/OperationScreen';
import DashboardScreen     from '../screens/DashboardScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const NAVY = '#1f4e79';

function TabNav() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: NAVY },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: NAVY,
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: { paddingBottom: 4, height: 58 },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, string> = {
            Home:        focused ? 'home' : 'home-outline',
            Repairs:     focused ? 'construct' : 'construct-outline',
            PM:          focused ? 'calendar' : 'calendar-outline',
            Operation:   focused ? 'alarm' : 'alarm-outline',
            Dashboard:   focused ? 'speedometer' : 'speedometer-outline',
          };
          return <Ionicons name={(icons[route.name] || 'ellipse-outline') as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"      component={HomeScreen}       options={{ title: 'หน้าหลัก' }} />
      <Tab.Screen name="Repairs"   component={RepairListScreen}  options={{ title: 'แจ้งซ่อม' }} />
      <Tab.Screen name="PM"        component={PMListScreen}      options={{ title: 'PM' }} />
      <Tab.Screen name="Operation" component={OperationScreen}   options={{ title: 'Operation' }} />
      <Tab.Screen name="Dashboard" component={DashboardScreen}   options={{ title: 'Dashboard' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: NAVY }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Main"          component={TabNav}             options={{ headerShown: false }} />
          <Stack.Screen name="RepairList"    component={RepairListScreen}   options={{ title: 'รายการแจ้งซ่อม' }} />
          <Stack.Screen name="RepairCreate"  component={RepairCreateScreen} options={{ title: 'แจ้งซ่อมใหม่' }} />
          <Stack.Screen name="PMList"        component={PMListScreen}       options={{ title: 'PM ติดตามงาน' }} />
          <Stack.Screen name="PMDashboard"   component={PMDashboardScreen}  options={{ title: 'PM Dashboard' }} />
          <Stack.Screen name="Operation"     component={OperationScreen}    options={{ title: 'Operation' }} />
          <Stack.Screen name="Dashboard"     component={DashboardScreen}    options={{ title: 'Dashboard' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
