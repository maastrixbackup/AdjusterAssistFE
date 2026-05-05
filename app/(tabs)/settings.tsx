import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ReactElement, useCallback, useState } from "react";



import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from 'react-native-toast-message';

import { CustomConfirmModal } from "@/components/CustomConfirmModal";
import {
  getSubscriptionStatus,
  SubscriptionStatus,
  upgradeSubscription
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner-native";

type MenuLinkProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  color: string;
  isLast?: boolean;
  onPress?: () => void;
};

export default function SettingsScreen() {
  const { token, email, logout } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyCheckout, setBusyCheckout] = useState(false);

  // Logout Modal State
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);

  const loadSubscription = useCallback(async (showLoading = true) => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    try {
      const response = await getSubscriptionStatus(token);
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
      toast.success(`Plan Upgraded to ${targetPlan}`)
    } catch (error) {
      toast.error("Unable to react payment gateway")
      console.log(error)
    } finally {
      setBusyCheckout(false);
    }
  };

  const handleLogoutConfirm = async () => {
    setLogoutModalVisible(false); // Close modal first
    // Perform the Supabase/Auth logout
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await logout();
    } catch (error) {
      toast.error("Error logging out. Please try again.");
      console.error("Logout Error:", error);
      return;
    }
  };

  const usagePercentage = status?.subscription?.usage_limit
    ? (status.subscription.current_usage / status.subscription.usage_limit) * 100
    : 0;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {/* Modern Glossy Header */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={["#156bdb", "#123C78", "#0B2F5B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={["top"]}>
            <View style={styles.headerTopRow}>
              <View style={styles.userInfo}>
                <View style={styles.avatarContainer}>
                  <LinearGradient colors={["#38BDF8", "#1D4ED8"]} style={styles.avatarGradient}>
                    <Text style={styles.avatarText}>{email?.[0].toUpperCase()}</Text>
                  </LinearGradient>
                  <View style={styles.onlineIndicator} />
                </View>
                <View style={styles.userText}>
                  <Text style={styles.userName}>Account Profile</Text>
                  <Text style={styles.userEmail} numberOfLines={1}>{email}</Text>
                </View>
              </View>
              {/* UPDATED: Trigger modal instead of direct logout */}
              <Pressable onPress={() => setLogoutModalVisible(true)} style={({ pressed }) => [styles.logoutIcon, pressed && { opacity: 0.7 }]}>
                <MaterialCommunityIcons name="logout-variant" size={22} color="#F8FAFC" />
              </Pressable>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSubscription} tintColor="#0F4C9C" />}
      >
        {/* Subscription Dashboard Card */}
        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View style={styles.planBadge}>
              <Text style={styles.planLabel}>ACTIVE PLAN</Text>
              <Text style={styles.planName}>{status?.subscription?.plan_type?.toUpperCase() || "FREE"}</Text>
            </View>
            <View style={styles.secureBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#10B981" />
              <Text style={styles.secureText}>SECURE</Text>
            </View>
          </View>

          <View style={styles.usageWrapper}>
            <View style={styles.usageHeader}>
              <Text style={styles.usageTitle}>Generation Usage</Text>
              <Text style={styles.usageValue}>
                {status?.subscription?.current_usage || 0}
                <Text style={styles.usageTotal}> / {status?.subscription?.usage_limit || 0}</Text>
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <LinearGradient
                colors={["#3B82F6", "#8B5CF6"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${Math.min(usagePercentage, 100)}%` }]}
              />
            </View>

            <View style={styles.infoPill}>
              <MaterialCommunityIcons name="lightning-bolt" size={14} color="#F59E0B" />
              <Text style={styles.infoPillText}>
                {status?.subscription?.remaining || 0} credits remaining
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>RENEWAL DATE</Text>
              <Text style={styles.statValue}>
                {status?.subscription?.expires_at
                  ? new Date(status.subscription.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                  : "Permanent"}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>SERVER STATUS</Text>
              <View style={styles.statusRow}>
                <View style={styles.pulseDot} />
                <Text style={[styles.statValue, { color: '#10B981' }]}>Operational</Text>
              </View>
            </View>
          </View>

          {status?.subscription?.plan_type !== "enterprise" && (
            <Pressable onPress={onUpgrade} style={({ pressed }) => [styles.upgradeBtn, pressed && { transform: [{ scale: 0.97 }] }]}>
              <LinearGradient colors={["#1E293B", "#0F172A"]} style={styles.upgradeGradient}>
                <Text style={styles.upgradeBtnText}>Upgrade Your Plan</Text>
                <Ionicons name="rocket" size={18} color="#FFF" />
              </LinearGradient>
            </Pressable>
          )}
        </View>

        {/* Action Menu */}
        <Text style={styles.menuTitle}>Application Settings</Text>
        <View style={styles.menuContainer}>
          <MenuLink icon="notifications-outline" label="Push Notifications" color="#64748B" />
          <MenuLink icon="lock-closed-outline" label="Security & Privacy" color="#64748B" />
          {/* UPDATED: Trigger modal instead of direct logout */}
          <MenuLink
            icon="log-out-outline"
            label="Logout Account"
            color="#EF4444"
            isLast
            onPress={() => setLogoutModalVisible(true)}
          />
        </View>

        <View style={styles.footerSection}>
          <Text style={styles.versionText}>BUILD 1.5.0 | DEVELOPMENT</Text>
          <Text style={styles.powerText}>AdjusterAssist Intelligence Engine</Text>
        </View>
      </ScrollView>
      <Toast />

      {/* Logout Confirmation Modal */}
      <CustomConfirmModal
        isVisible={isLogoutModalVisible}
        title="Sign Out"
        confirmText='Logout'
        message="Are you sure you want to log out of AdjusterAssist? You will need to sign in again to access your workspaces."
        onConfirm={handleLogoutConfirm}
        onCancel={() => setLogoutModalVisible(false)}
      />
    </View>
  );
}

// Sub-component for Menu Items
function MenuLink({ icon, label, color, isLast, onPress }: MenuLinkProps): ReactElement {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: '#F8FAFC' }]}>
      <View style={styles.menuLeft}>
        <View style={[styles.menuIconBg, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.menuLabel, { color: color === '#EF4444' ? color : '#1E293B' }]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
      {!isLast && <View style={styles.menuDivider} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F1F5F9" },
  headerContainer: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden', elevation: 20, shadowColor: '#0f4c9c', shadowOpacity: 0.3, shadowRadius: 15 },
  headerGradient: { paddingBottom: 16, paddingTop: 20 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 50, height: 50, position: 'relative' },
  avatarGradient: { flex: 1, borderRadius: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  onlineIndicator: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 3, borderColor: '#0F172A' },
  userText: { marginLeft: 15 },
  userName: { fontSize: 18, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  userEmail: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  logoutIcon: { padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },

  scrollContent: { padding: 20 },
  mainCard: { backgroundColor: '#FFF', borderRadius: 30, padding: 24, shadowColor: '#64748B', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
  planBadge: { flex: 1 },
  planLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1 },
  planName: { fontSize: 28, fontWeight: '900', color: '#0010ec', marginTop: 4 },
  secureBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  secureText: { fontSize: 9, fontWeight: '900', color: '#10B981' },

  usageWrapper: { marginBottom: 25 },
  usageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  usageTitle: { fontSize: 14, fontWeight: '700', color: '#475569' },
  usageValue: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  usageTotal: { color: '#94A3B8', fontWeight: '400' },
  progressTrack: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 10 },
  infoPill: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start', gap: 6 },
  infoPillText: { fontSize: 12, fontWeight: '700', color: '#B45309' },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statItem: { flex: 1 },
  statLabel: { fontSize: 9, fontWeight: '900', color: '#94A3B8', marginBottom: 6 },
  statValue: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },

  upgradeBtn: { borderRadius: 18, overflow: 'hidden' },
  upgradeGradient: { paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  upgradeBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },

  menuTitle: { fontSize: 12, fontWeight: '900', color: '#94A3B8', marginTop: 35, marginBottom: 15, marginLeft: 10, textTransform: 'uppercase', letterSpacing: 1 },
  menuContainer: { backgroundColor: '#FFF', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  menuIconBg: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '700' },
  menuDivider: { position: 'absolute', bottom: 0, left: 70, right: 20, height: 1, backgroundColor: '#F8FAFC' },

  footerSection: { marginTop: 40, marginBottom: 50, alignItems: 'center' },
  versionText: { fontSize: 10, fontWeight: '800', color: '#CBD5E1', letterSpacing: 1 },
  powerText: { fontSize: 12, fontWeight: '600', color: '#94A3B8', marginTop: 5 }
});
