import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  type: 'info' | 'success' | 'alert';
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'Draft Generated', message: 'Your email draft for Claim #CLM-100 is ready.', time: '2m ago', isRead: false, type: 'success' },
  { id: '2', title: 'Subscription Update', message: 'You have 15 credits remaining.', time: '1h ago', isRead: true, type: 'info' },
];

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const insets = useSafeAreaInsets(); // Fixes the camera/notch overlap

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(item => item.id !== id));
  };

  const renderRightActions = (id: string) => {
    return (
      <Pressable 
        style={styles.deleteAction} 
        onPress={() => deleteNotification(id)}
      >
        <Feather name="trash-2" size={24} color="#FFF" />
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    );
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item.id)}
      friction={2}
      rightThreshold={40}
    >
      <View style={[styles.card, !item.isRead && styles.unreadCard]}>
        <View style={[styles.iconBadge, styles[`${item.type}Badge`]]}>
          <Ionicons 
            name={item.type === 'success' ? 'checkmark-circle' : 'information-circle'} 
            size={20} 
            color="#FFF" 
          />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardTime}>{item.time}</Text>
          </View>
          <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>
        </View>
      </View>
    </Swipeable>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#1E293B" />
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Pressable onPress={() => setNotifications([])}>
            <Text style={styles.clearText}>Clear All</Text>
          </Pressable>
        </View>

        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="bell-off" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No new notifications</Text>
            </View>
          }
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  clearText: { color: '#276bbd', fontWeight: '600' },
  listContent: { padding: 20 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  unreadCard: { backgroundColor: '#F0F7FF' },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoBadge: { backgroundColor: '#276bbd' }, // Primary Color
  successBadge: { backgroundColor: '#10B981' },
  alertBadge: { backgroundColor: '#EF4444' },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  cardTime: { fontSize: 12, color: '#94A3B8' },
  cardMessage: { fontSize: 14, color: '#64748B', lineHeight: 20 },
  
  // Swipe Action Styles
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteText: { color: '#FFF', fontSize: 12, fontWeight: '700', marginTop: 4 },
  
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, color: '#94A3B8', fontSize: 16, fontWeight: '500' },
});