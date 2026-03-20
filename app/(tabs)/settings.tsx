import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from 'react-native-toast-message';

import {
  getSubscriptionStatus,
  SubscriptionStatus,
  upgradeSubscription
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

const { width } = Dimensions.get("window");

export default function SettingsScreen() {
  const { token, email, logout } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyCheckout, setBusyCheckout] = useState(false);
  const prevPlanRef = useRef<string | null>(null);

  const loadSubscription = useCallback(async (showLoading = true) => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    try {
      const response = await getSubscriptionStatus(token);
      if (prevPlanRef.current && prevPlanRef.current !== response.subscription.plan_type) {
        if (response.subscription.plan_type !== 'free') {
          Toast.show({
            type: 'success',
            text1: 'Plan Synced ⚡',
            text2: `Enjoy your ${response.subscription.plan_type.toUpperCase()} features.`,
          });
        }
      }
      prevPlanRef.current = response.subscription.plan_type;
      setStatus(response);
    } catch (error) {
      console.error("Sync Error:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadSubscription(true);
    }, [loadSubscription])
  );

  const onUpgrade = async () => {
    if (!token || busyCheckout || !status?.subscription) return;
    setBusyCheckout(true);
    const targetPlan = status.subscription.plan_type === "pro" ? "enterprise" : "pro";
    try {
      const { checkoutUrl } = await upgradeSubscription(token, targetPlan);
      if (checkoutUrl) await Linking.openURL(checkoutUrl);
    } catch (error) {
      Toast.show({ 
        type: 'error', 
        text1: 'Billing Error', 
        text2: 'Unable to reach payment gateway.' 
      });
    } finally {
      setBusyCheckout(false);
    }
  };

  const usagePercentage = status?.subscription 
    ? (status.subscription.current_usage / status.subscription.usage_limit) * 100 
    : 0;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      
      {/* Brand-Consistent Custom Header */}
      <View style={styles.headerStack}>
        <LinearGradient
          colors={["#0F172A", "#0F4C9C"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={["top"]}>
            <View style={styles.headerContent}>
              <View style={styles.profileSection}>
                <View style={styles.avatarWrapper}>
                  <LinearGradient
                    colors={["#38BDF8", "#0EA5E9"]}
                    style={styles.avatarGradient}
                  >
                    <Text style={styles.avatarChar}>{email?.[0].toUpperCase() || "U"}</Text>
                  </LinearGradient>
                  <View style={styles.statusDot} />
                </View>
                <View style={styles.metaInfo}>
                  <Text style={styles.headerTitle}>Account Settings</Text>
                  <Text style={styles.headerSubtitle} numberOfLines={1}>{email}</Text>
                </View>
              </View>
              <Pressable 
                style={({ pressed }) => [styles.exitBtn, pressed && { opacity: 0.6 }]} 
                onPress={logout}
              >
                <Ionicons name="power" size={20} color="#FFF" />
              </Pressable>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={loading} 
            onRefresh={loadSubscription} 
            tintColor="#0F4C9C" 
            progressViewOffset={20}
          />
        }
      >
        {/* Subscription Engine Card */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View>
              <Text style={styles.labelCaps}>ENGINE STATUS</Text>
              <Text style={styles.planTitle}>{status?.subscription?.plan_type?.toUpperCase() || "FREE"}</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={14} color="#0EA5E9" />
              <Text style={styles.badgeText}>ENCRYPTED</Text>
            </View>
          </View>

          <View style={styles.usageContainer}>
            <View style={styles.usageText}>
              <Text style={styles.usageLabel}>AI Generation Credits</Text>
              <Text style={styles.usageNumbers}>
                {status?.subscription?.current_usage || 0}
                <Text style={styles.usageLimit}> / {status?.subscription?.usage_limit || 0}</Text>
              </Text>
            </View>
            
            <View style={styles.barFrame}>
              <LinearGradient
                colors={["#0EA5E9", "#6366F1"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.barFill, { width: `${Math.min(usagePercentage, 100)}%` }]}
              />
            </View>
            
            <View style={styles.pillRow}>
              <MaterialCommunityIcons name="lightning-bolt" size={14} color="#F59E0B" />
              <Text style={styles.pillText}>
                {status?.subscription?.remaining || 0} Credits available for use
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>RENEWAL</Text>
              <Text style={styles.statValue}>
                {status?.subscription?.expires_at 
                  ? new Date(status.subscription.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) 
                  : "Never"}
              </Text>
            </View>
            <View style={styles.verticalLine} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>NETWORK</Text>
              <Text style={[styles.statValue, { color: '#10B981' }]}>Online</Text>
            </View>
          </View>

          {status?.subscription?.plan_type !== "enterprise" && (
            <Pressable 
              onPress={onUpgrade}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { transform: [{ scale: 0.98 }] }
              ]}
              disabled={busyCheckout}
            >
              <LinearGradient
                colors={["#0F172A", "#334155"]}
                style={styles.btnGradient}
              >
                <Text style={styles.btnText}>
                  {busyCheckout ? "Opening Billing..." : "Upgrade Subscription"}
                </Text>
                <Ionicons name="arrow-forward-circle" size={20} color="#FFF" />
              </LinearGradient>
            </Pressable>
          )}
        </View>

        {/* Preferences Menu */}
        <Text style={styles.sectionTitle}>System Preferences</Text>
        
        <View style={styles.menuCard}>
          <Pressable style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="notifications" size={18} color="#475569" />
              </View>
              <Text style={styles.menuLabel}>Notification Controls</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </Pressable>

          <View style={styles.hr} />

          <Pressable style={styles.menuItem} onPress={logout}>
            <View style={styles.menuLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFF1F2' }]}>
                <Ionicons name="log-out" size={18} color="#E11D48" />
              </View>
              <Text style={[styles.menuLabel, { color: '#E11D48' }]}>Sign Out of Device</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#FECACA" />
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.version}>VERSION 1.0.8 • PRODUCTION BUILD</Text>
          <Text style={styles.copyright}>Powered by ClaimScope Cloud Architecture</Text>
        </View>
      </ScrollView>
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  headerStack: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 10 }
    })
  },
  headerGradient: { paddingBottom: 25 },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 15,
  },
  profileSection: { flexDirection: 'row', alignItems: 'center' },
  avatarWrapper: { width: 54, height: 54, position: 'relative' },
  avatarGradient: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarChar: { fontSize: 22, fontWeight: '900', color: '#FFF' },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#0F172A',
  },
  metaInfo: { marginLeft: 16 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2, width: 180 },
  exitBtn: { 
    width: 42, height: 42, borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    alignItems: 'center', justifyContent: 'center' 
  },

  scrollBody: { padding: 20, paddingTop: 30 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 5,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  labelCaps: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5 },
  planTitle: { fontSize: 32, fontWeight: '900', color: '#0F172A', marginTop: 4 },
  badge: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', 
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start', gap: 5
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#0EA5E9' },

  usageContainer: { marginBottom: 25 },
  usageText: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  usageLabel: { fontSize: 14, fontWeight: '700', color: '#334155' },
  usageNumbers: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  usageLimit: { color: '#94A3B8', fontWeight: '400' },
  barFrame: { height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  pillRow: { 
    flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 6, 
    backgroundColor: '#FFFBEB', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8
  },
  pillText: { fontSize: 12, fontWeight: '700', color: '#B45309' },

  statsRow: { 
    flexDirection: 'row', paddingVertical: 20, borderTopWidth: 1, 
    borderBottomWidth: 1, borderColor: '#F8FAFC', marginBottom: 24 
  },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 9, fontWeight: '900', color: '#94A3B8', marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  verticalLine: { width: 1, height: '100%', backgroundColor: '#F1F5F9' },

  primaryBtn: { borderRadius: 20, overflow: 'hidden' },
  btnGradient: { 
    paddingVertical: 18, flexDirection: 'row', 
    alignItems: 'center', justifyContent: 'center', gap: 10 
  },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  sectionTitle: { 
    fontSize: 12, fontWeight: '900', color: '#94A3B8', 
    marginTop: 40, marginBottom: 16, marginLeft: 8, textTransform: 'uppercase', letterSpacing: 1.5
  },
  menuCard: { backgroundColor: '#FFF', borderRadius: 24, paddingVertical: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, paddingHorizontal: 20 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconCircle: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  hr: { height: 1, backgroundColor: '#F8FAFC', marginHorizontal: 20 },

  footer: { marginTop: 50, marginBottom: 40, alignItems: 'center' },
  version: { color: '#CBD5E1', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  copyright: { color: '#E2E8F0', fontSize: 11, fontWeight: '600', marginTop: 6 }
});