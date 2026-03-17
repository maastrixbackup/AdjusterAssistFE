import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import Toast from 'react-native-toast-message'; // Import Toast

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const prevPlanRef = useRef<string | null>(null);

  const loadSubscription = useCallback(async (showLoading = true) => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    setErrorMessage(null);

    try {
      const response = await getSubscriptionStatus(token);
      
      // Detect if the plan upgraded since last check
      if (prevPlanRef.current && prevPlanRef.current !== response.subscription.plan_type) {
        if (response.subscription.plan_type !== 'free') {
          // Professional Toast Notification
          Toast.show({
            type: 'success',
            text1: 'Upgrade Successful! 🚀',
            text2: `You are now on the ${response.subscription.plan_type.toUpperCase()} plan.`,
            position: 'top',
            visibilityTime: 4000,
            autoHide: true,
            topOffset: 60,
          });
        }
      }
      
      prevPlanRef.current = response.subscription.plan_type;
      setStatus(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load subscription";
      setErrorMessage(message);
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
    setErrorMessage(null);

    const currentPlan = status.subscription.plan_type;
    const targetPlan = currentPlan === "pro" ? "enterprise" : "pro";

    try {
      const { checkoutUrl } = await upgradeSubscription(token, targetPlan);
      if (checkoutUrl) {
        await Linking.openURL(checkoutUrl);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start checkout";
      setErrorMessage(message);
      
      Toast.show({
        type: 'error',
        text1: 'Checkout Error',
        text2: message,
      });
    } finally {
      setBusyCheckout(false);
    }
  };

  const usagePercentage = status?.subscription 
    ? (status.subscription.current_usage / status.subscription.usage_limit) * 100 
    : 0;

  const userInitial = email ? email.charAt(0).toUpperCase() : "R";

  return (
    <View style={styles.screen}>
      <ScrollView 
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSubscription} tintColor="#6366F1" />}
      >
        {/* Profile Header */}
        <View style={styles.headerRow}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarGradient}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </View>
            <View style={styles.onlineBadge} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greeting}>Hey there!</Text>
            <Text style={styles.emailText} numberOfLines={1}>{email ?? "Developer"}</Text>
          </View>
        </View>

        {/* Subscription Card */}
        <View style={styles.mainCard}>
          <View style={styles.cardTop}>
            <View>
              <Text style={styles.cardLabel}>MEMBERSHIP</Text>
              <Text style={styles.planName}>
                {status?.subscription?.plan_type?.toUpperCase() ?? "FREE"}
              </Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>Verified Account</Text>
            </View>
          </View>

          {/* Usage Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Monthly Credits</Text>
              <Text style={styles.progressValue}>
                {status?.subscription?.current_usage ?? 0}
                <Text style={{ color: '#94A3B8' }}> / {status?.subscription?.usage_limit ?? 0}</Text>
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.min(usagePercentage, 100)}%` }]}>
                <View style={styles.barGlow} />
              </View>
            </View>
            <View style={styles.remainingBadge}>
               <Text style={styles.remainingText}>
                 🚀 {status?.subscription?.remaining ?? 0} credits left
               </Text>
            </View>
          </View>

          <View style={styles.detailsRow}>
             <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>NEXT BILLING</Text>
                <Text style={styles.detailValue}>
                  {status?.subscription?.expires_at 
                    ? new Date(status.subscription.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) 
                    : "---"}
                </Text>
             </View>
             <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>PLAN TIER</Text>
                <Text style={styles.detailValue}>Monthly</Text>
             </View>
          </View>

          {status?.subscription?.plan_type !== "enterprise" && (
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && { transform: [{ scale: 0.97 }] },
                busyCheckout && { opacity: 0.7 }
              ]}
              disabled={busyCheckout}
              onPress={onUpgrade}
            >
              <Text style={styles.primaryButtonText}>
                {busyCheckout
                  ? "Contacting Stripe..."
                  : status?.subscription?.plan_type === "pro"
                    ? "Upgrade to Enterprise"
                    : "Get Pro Access"}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        
        <Pressable style={styles.menuItem}>
          <Text style={styles.menuItemText}>Notification Settings</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable style={[styles.menuItem, { marginTop: 8 }]} onPress={logout}>
          <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Log Out</Text>
          <Text style={[styles.chevron, { color: '#EF4444' }]}>›</Text>
        </Pressable>

        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <Text style={styles.buildInfo}>Rudra-Dev Environment • v1.0.8</Text>
      </ScrollView>
      {/* Required for Toast to render */}
      <Toast /> 
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    padding: 24,
    paddingTop: 70,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 35,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#276bbd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: '#F8FAFC',
  },
  headerTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
  },
  emailText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  mainCard: {
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.06,
    shadowRadius: 25,
    elevation: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
  },
  planName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
  },
  statusPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  progressContainer: {
    marginBottom: 25,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  barTrack: {
    height: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#276bbd',
    borderRadius: 6,
  },
  barGlow: {
    position: 'absolute',
    right: 0,
    width: 15,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  remainingBadge: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  remainingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  detailsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 20,
    marginBottom: 25,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  primaryButton: {
    height: 56,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94A3B8',
    marginTop: 35,
    marginBottom: 15,
    marginLeft: 5,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuItem: {
    backgroundColor: '#FFF',
    padding: 18,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  chevron: {
    fontSize: 20,
    color: '#CBD5E1',
    fontWeight: '300',
  },
  errorBox: {
    marginTop: 20,
    backgroundColor: '#FEF2F2',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  buildInfo: {
    textAlign: 'center',
    color: '#CBD5E1',
    fontSize: 10,
    marginTop: 40,
    marginBottom: 20,
  }
});