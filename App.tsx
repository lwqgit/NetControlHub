/**
 * NetControl Hub - 主应用入口
 * 路由配置、认证状态管理
 */
import React from 'react';
import { StatusBar, ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';

// 页面
import LoginScreen from './src/screens/LoginScreen';
import DevicesScreen from './src/screens/DevicesScreen';
import DeviceDetailScreen from './src/screens/DeviceDetailScreen';
import TimeRestrictionScreen from './src/screens/TimeRestrictionScreen';
import TimeTemplatesScreen from './src/screens/TimeTemplatesScreen';
import SettingsScreen from './src/screens/SettingsScreen';

import { Colors } from './src/components/Common';
import { Device } from './src/services/api';

// —— 类型定义 ——
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Devices: undefined;
  DeviceDetail: { device: Device };
  TimeRestriction: { device: Device };
  TimeTemplates: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// —— Tab 图标组件 ——
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    devices: '📡',
    time: '🕐',
    settings: '⚙️',
  };
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>{icons[name] || '📡'}</Text>
    </View>
  );
}

// —— 底部 Tab 导航（设备 + 时段 + 设置） ——
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderTopWidth: 1,
          borderTopColor: Colors.gray200,
          paddingTop: 8,
          height: 83,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Devices"
        component={DevicesScreen}
        options={{
          tabBarLabel: '设备',
          tabBarIcon: ({ focused }) => <TabIcon name="devices" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="TimeTemplates"
        component={TimeTemplatesScreen}
        options={{
          tabBarLabel: '时段',
          tabBarIcon: ({ focused }) => <TabIcon name="time" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: '设置',
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// —— 认证路由 ——
function AppNavigator() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 12, color: Colors.gray500, fontSize: 14 }}>NetControl Hub</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="DeviceDetail"
            component={DeviceDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="TimeRestriction"
            component={TimeRestrictionScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ animationTypeForReplace: 'pop' }} />
      )}
    </Stack.Navigator>
  );
}

// —— App 根组件 ——
export default function App() {
  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </NavigationContainer>
  );
}
