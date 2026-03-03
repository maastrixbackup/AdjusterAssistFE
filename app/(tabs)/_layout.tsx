import React, { useEffect } from 'react';
import { router, Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { HapticTab } from '@/components/haptic-tab';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/providers/auth-provider';

export default function TabLayout() {
  const { isHydrated, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isHydrated]);

  if (!isHydrated || !isAuthenticated) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1469C9',
        tabBarInactiveTintColor: '#8C97A8',
        headerShown: true,
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontSize: 15,
          fontWeight: '600',
        },
        headerBackground: () => (
          <LinearGradient
            colors={['#276bbd', '#0B3C7A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        ),
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: 86,
          paddingTop: 8,
          paddingBottom: 10,
          borderTopColor: '#D0D7E2',
          borderTopWidth: 1,
          backgroundColor: '#F8FAFC',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons size={28} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons size={28} name="clock-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="guides"
        options={{
          title: 'Guides',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons size={28} name="file-document-edit-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="settings" color={color} />,
        }}
      />
    </Tabs>
  );
}
