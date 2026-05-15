import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { ReactElement, useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { CustomConfirmModal } from "@/components/CustomConfirmModal";
import { NotificationSettings } from "@/components/NotificationSettings";
import {
  getProfile,
  getSubscriptionStatus,
  updateUserProfile,
  upgradeSubscription
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "expo-router";

const { width } = Dimensions.get('window');

type MenuLinkProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  color: string;
  isLast?: boolean;
  onPress?: () => void;
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (val: boolean) => void;
};

export default function SettingsScreen() {
  const { token, email, logout } = useAuth();
  const queryClient = useQueryClient();
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [busyCheckout, setBusyCheckout] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const router = useRouter();
  const [isNotificationModalVisible, setNotificationModalVisible] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({
    claimUpdates: true,
    weeklySummary: false,
  });

  const [form, setForm] = useState({
    name: "",
    phone: "",
    avatar_url: "",
    company: "",
    is_signature_enabled: false,
    signature_name: "",
    signature_designation: "",
    push_enabled: true,
  });

  const { data: subscriptionData, isLoading: isSubLoading, refetch: refetchSub } = useQuery({
    queryKey: ['subscription', token],
    queryFn: () => getSubscriptionStatus(token!),
    enabled: !!token,
  });

  const { data: profileData, isLoading: isProfileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ['profile', token],
    queryFn: () => getProfile(token!),
    enabled: !!token,
  });

  const { mutate: updateProfile, isPending: isUpdating } = useMutation({
    mutationFn: async (payload: any) => {
      const formData = new FormData();

      // 1. Only append basic strings if they are provided
      if (payload.name !== undefined) formData.append('name', payload.name);
      if (payload.phone !== undefined) formData.append('phone', payload.phone.toString());
      if (payload.company !== undefined) formData.append('company', payload.company);

      if (payload.push_enabled !== undefined) {
        console.log("Appending push_enabled to formData:", payload.push_enabled);
        formData.append('push_enabled', String(payload.push_enabled));
      }

      if (payload.is_signature_enabled !== undefined) {
        formData.append('is_signature_enabled', String(payload.is_signature_enabled));
      }

      // 3. Conditional Signature Details
      // Only send this if we are actually trying to update signature info
      if (payload.signature_name || payload.signature_designation) {
        formData.append('signature_details', JSON.stringify({
          name: payload.signature_name,
          designation: payload.signature_designation,
          company: payload.company || "",
        }));
      }

      // 4. Avatar Logic (already fine, but wrap in check)
      if (payload.avatar_url?.startsWith('file://')) {
        const filename = payload.avatar_url.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('avatar', {
          uri: payload.avatar_url,
          name: filename || 'upload.jpg',
          type,
        } as any);
      }

      return updateUserProfile(formData, token!);
    },

    onSuccess: () => {
      setEditModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to update profile");
    },
  });

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Promise.all([refetchSub(), refetchProfile()]);
  }, [refetchSub, refetchProfile]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setForm({ ...form, avatar_url: asset.uri });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleContactSupport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('mailto:support@adjusterassist.com?subject=Support Request');
  };

  const handleRateApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Replace with your actual store IDs
    const itunesItemId = 'YOUR_ID';
    const androidPackageName = 'com.adjusterassist.app';

    // eslint-disable-next-line no-unused-expressions
    Platform.OS === 'ios'
      ? Linking.openURL(`itms-apps://itunes.apple.com/app/viewContentsUserReviews/id${itunesItemId}?action=write-review`)
      : Linking.openURL(`market://details?id=${androidPackageName}`);
  };

  const onUpgrade = async () => {
    if (!token || busyCheckout || !subscriptionData?.subscription) return;
    setBusyCheckout(true);
    const targetPlan = subscriptionData.subscription.plan_type === "pro" ? "enterprise" : "pro";
    try {
      const { checkoutUrl } = await upgradeSubscription(token, targetPlan);
      if (checkoutUrl) await Linking.openURL(checkoutUrl);
      toast.success(`Plan Upgraded to ${targetPlan}`)
    } catch (error) {
      toast.error("Unable to reach payment gateway")
    } finally {
      setBusyCheckout(false);
    }
  };

  const handleLogoutConfirm = async () => {
    setLogoutModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await logout();
  };

  const usagePercentage = subscriptionData?.subscription?.usage_limit
    ? (subscriptionData.subscription.current_usage / subscriptionData.subscription.usage_limit) * 100
    : 0;

  const isLoading = isSubLoading || isProfileLoading;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.headerContainer}>
        <LinearGradient
          colors={["#001529", "#003366"]}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={["top"]}>
            <View style={styles.headerTopRow}>
              <View style={styles.userInfo}>
                <View style={styles.avatarContainer}>
                  <LinearGradient colors={["#60A5FA", "#2563EB"]} style={styles.avatarGradient}>
                    {profileData?.user.avatar_url ? (
                      <Image source={{ uri: profileData.user.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarText}>{email?.[0].toUpperCase()}</Text>
                    )}
                  </LinearGradient>
                  <Pressable
                    onPress={() => {
                      setForm({
                        name: profileData?.user.name || "",
                        phone: profileData?.user.phone?.toString() || "",
                        company: profileData?.user.company || "",
                        avatar_url: profileData?.user.avatar_url || "",
                        is_signature_enabled: profileData?.user.is_signature_enabled || false,
                        signature_name: profileData?.user.signature_details?.name || profileData?.user.name || "",
                        signature_designation: profileData?.user.signature_details?.designation || "",
                        push_enabled: profileData?.user.push_enabled || false,
                      });
                      setEditModalVisible(true);
                    }}
                    style={styles.editIcon}
                  >
                    <Ionicons name="pencil" size={10} color="#FFF" />
                  </Pressable>
                </View>
                <View style={styles.userText}>
                  <Text style={styles.userName}>{profileData?.user.name || "Account Profile"}</Text>
                  <Text style={styles.userEmail} numberOfLines={1}>{email}</Text>
                </View>
              </View>
              <Pressable onPress={() => setLogoutModalVisible(true)} style={({ pressed }) => [styles.logoutIcon, pressed && { opacity: 0.7 }]}>
                <MaterialCommunityIcons name="logout-variant" size={20} color="#FFF" />
              </Pressable>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#1E40AF" />}
      >
        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.planLabel}>CURRENT PLAN</Text>
              <Text style={styles.planName}>{subscriptionData?.subscription?.plan_type?.toUpperCase() || "FREE"}</Text>
            </View>
            <View style={styles.secureBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#10B981" />
              <Text style={styles.secureText}>VERIFIED</Text>
            </View>
          </View>

          <View style={styles.usageWrapper}>
            <View style={styles.usageHeader}>
              <Text style={styles.usageTitle}>Resource Usage</Text>
              <Text style={styles.usageValue}>
                {subscriptionData?.subscription?.current_usage || 0}
                <Text style={styles.usageTotal}> / {subscriptionData?.subscription?.usage_limit || 0}</Text>
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
                {subscriptionData?.subscription?.remaining || 0} credits remaining
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>RENEWAL</Text>
              <Text style={styles.statValue}>
                {subscriptionData?.subscription?.expires_at
                  ? new Date(subscriptionData.subscription.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  : "Lifetime"}
              </Text>
            </View>
            <View style={[styles.statItem, { alignItems: 'flex-end' }]}>
              <Text style={styles.statLabel}>AVAILABILITY</Text>
              <View style={styles.statusRow}>
                <View style={styles.pulseDot} />
                <Text style={[styles.statValue, { color: '#10B981' }]}>Online</Text>
              </View>
            </View>
          </View>

          {subscriptionData?.subscription?.plan_type !== "enterprise" && (
            <Pressable onPress={onUpgrade} style={({ pressed }) => [styles.upgradeBtn, pressed && { transform: [{ scale: 0.98 }] }]}>
              <LinearGradient colors={["#1E293B", "#0F172A"]} style={styles.upgradeGradient}>
                {busyCheckout ? <ActivityIndicator color="#FFF" size="small" /> : (
                  <>
                    <Text style={styles.upgradeBtnText}>Upgrade</Text>
                    {/* <Ionicons name="sparkles" size={16} color="#FBBF24" /> */}
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}
        </View>

        <Text style={styles.menuTitle}>Preferences</Text>
        <View style={styles.menuContainer}>
          <MenuLink
            icon="notifications-outline"
            label="Notifications"
            color="#3B82F6"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setNotificationModalVisible(!isNotificationModalVisible);
            }}
          />
          {isNotificationModalVisible && (
            <View style={styles.inlineSettingsWrapper}>
              <NotificationSettings
                preferences={notifPrefs}
                onUpdate={(key: any, val: any) => {
                  setNotifPrefs((prev) => ({ ...prev, [key]: val }));
                  // Logic to update server
                  // updateProfile({ [key]: val });
                }}
              />
            </View>
          )}

          <MenuLink icon="shield-outline" label="Security & Privacy" color="#64748B" onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/privacy");
          }} />

          <MenuLink
            icon="star-outline"
            label="Rate the App"
            color="#EC4899" // Pink
            isLast
            onPress={handleRateApp}
          />

          <MenuLink
            icon="log-out-outline"
            label="Sign Out"
            color="#EF4444"
            isLast
            onPress={() => setLogoutModalVisible(true)}
          />
        </View>


        <View style={styles.footerSection}>
          <Text style={styles.versionText}>VERSION 1.6.0 DEVELOPMENT</Text>
          <Text style={styles.powerText}>AdjusterAssist Intelligence</Text>
        </View>
      </ScrollView>

      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide" // Slide is generally smoother for bottom sheets
        onRequestClose={() => setEditModalVisible(false)}
      >
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

        <KeyboardAvoidingView
          // Use 'padding' for iOS and 'undefined' for Android to avoid double-resizing
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
          // This offset helps if you have a header or tabs
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setEditModalVisible(false)}
          />

          <View style={styles.editModal}>
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Profile</Text>
              <Pressable hitSlop={20} onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </Pressable>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <View style={styles.modalAvatarSection}>
                <Pressable onPress={pickImage} style={styles.modalAvatarContainer}>
                  {form.avatar_url ? (
                    <Image source={{ uri: form.avatar_url }} style={styles.modalAvatar} />
                  ) : (
                    <View style={styles.modalAvatarPlaceholder}>
                      <Ionicons name="camera" size={32} color="#94A3B8" />
                    </View>
                  )}
                  <View style={styles.modalEditBadge}>
                    <Ionicons name="cloud-upload" size={12} color="#FFF" />
                  </View>
                </Pressable>
                <Text style={styles.modalAvatarSub}>Change profile picture</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  placeholder="John Doe"
                  value={form.name}
                  onChangeText={(text) => setForm({ ...form, name: text })}
                  style={styles.input}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChangeText={(text) => setForm({ ...form, phone: text })}
                  keyboardType="phone-pad"
                  style={styles.input}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.signatureHeader}>
                <View>
                  <Text style={styles.inputLabel}>Email Signature</Text>
                  <Text style={styles.modalAvatarSub}>Append details to external drafts</Text>
                </View>
                <Switch
                  trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
                  thumbColor={form.is_signature_enabled ? "#2563EB" : "#F4F3F4"}
                  onValueChange={(val) => setForm({ ...form, is_signature_enabled: val })}
                  value={form.is_signature_enabled}
                />
              </View>

              {form.is_signature_enabled && (
                <View style={{ marginTop: 10 }}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Signature Name</Text>
                    <TextInput
                      placeholder="Name in signature"
                      value={form.signature_name}
                      onChangeText={(text) => setForm({ ...form, signature_name: text })}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Company</Text>
                    <TextInput
                      placeholder="Organization name"
                      value={form.company}
                      onChangeText={(text) => setForm({ ...form, company: text })}
                      style={styles.input}
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Designation</Text>
                    <TextInput
                      placeholder="e.g. Senior Adjuster"
                      value={form.signature_designation}
                      onChangeText={(text) => setForm({ ...form, signature_designation: text })}
                      style={styles.input}
                    />
                  </View>
                </View>
              )}

              <Pressable
                onPress={() =>
                  updateProfile({
                    name: form.name || undefined,
                    phone: form.phone ? Number(form.phone) : undefined,
                    company: form.company || undefined,
                    avatar_url: form.avatar_url || undefined,
                    is_signature_enabled: form.is_signature_enabled,
                    signature_name: form.signature_name,
                    signature_designation: form.signature_designation,
                  })
                }
                disabled={isUpdating}
                style={({ pressed }) => [
                  styles.saveBtn,
                  (pressed || isUpdating) && { opacity: 0.9, transform: [{ scale: 0.99 }] }
                ]}
              >
                {isUpdating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Save Settings</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CustomConfirmModal
        isVisible={isLogoutModalVisible}
        title="Sign Out"
        confirmText='Logout'
        message="Are you sure you want to log out? You will need to sign in again to access your workspaces."
        onConfirm={handleLogoutConfirm}
        onCancel={() => setLogoutModalVisible(false)}
      />
    </View>
  );
}

function MenuLink({
  icon,
  label,
  color,
  isLast,
  onPress,
}: MenuLinkProps): ReactElement {
  return (
    <View>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.menuItem,
          pressed && { backgroundColor: '#F1F5F9' }
        ]}
      >
        <View style={styles.menuLeft}>
          <View style={[styles.menuIconBg, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon} size={18} color={color} />
          </View>
          <Text style={[styles.menuLabel, { color: color === '#EF4444' ? color : '#334155' }]}>
            {label}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
      </Pressable>

      {/* Premium Divider Logic: Doesn't show on the last item of a group */}
      {!isLast && <View style={styles.menuDivider} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  headerContainer: {
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#1E3A8A'
  },
  headerGradient: { paddingBottom: 30, paddingTop: 10 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 56, height: 56, position: 'relative' },
  avatarGradient: { flex: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 28 },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  userText: { marginLeft: 16 },
  userName: { fontSize: 20, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  userEmail: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  logoutIcon: { padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },

  scrollContent: { padding: 20 },
  mainCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    marginTop: -20,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  planLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1 },
  planName: { fontSize: 28, fontWeight: '900', color: '#1E3A8A', marginTop: 2 },
  secureBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 4 },
  secureText: { fontSize: 10, fontWeight: '800', color: '#16A34A' },

  usageWrapper: { marginBottom: 20 },
  usageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  usageTitle: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  usageValue: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  usageTotal: { color: '#CBD5E1', fontWeight: '500' },
  progressTrack: { height: 8, backgroundColor: '#aec5db', borderRadius: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 10 },
  infoPill: { flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: '#FFFBEB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', gap: 6 },
  infoPillText: { fontSize: 12, fontWeight: '700', color: '#B45309' },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 24 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statItem: { flex: 1 },
  statLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', marginBottom: 6 },
  statValue: { fontSize: 15, fontWeight: '700', color: '#334155' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },

  upgradeBtn: { borderRadius: 16, overflow: 'hidden' },
  upgradeGradient: { paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  upgradeBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },

  menuTitle: { fontSize: 11, fontWeight: '800', color: '#94A3B8', marginTop: 32, marginBottom: 12, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1.2 },
  menuContainer: { backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '600' },
  menuDivider: { position: 'absolute', bottom: 0, left: 65, right: 0, height: 1, backgroundColor: '#F8FAFC' },

  footerSection: { marginTop: 40, marginBottom: 80, alignItems: 'center' },
  versionText: { fontSize: 10, fontWeight: '700', color: '#81a3cc', letterSpacing: 1.5 },
  powerText: { fontSize: 12, fontWeight: '600', color: '#596474', marginTop: 4 },

  editIcon: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#1E3A8A",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  editModal: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingTop: 12,
    // Fix: Setting a minHeight or avoiding overly restrictive maxHeights 
    // helps the ScrollView calculate space better.
    maxHeight: '90%',
    width: '100%',
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: '#0F172A' },
  modalAvatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalAvatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  modalAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  modalAvatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#2563EB',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF'
  },
  modalAvatarSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 10,
    fontWeight: '600'
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase'
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
  },
  saveBtn: {
    backgroundColor: "#003366",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  saveText: { color: "#FFF", fontWeight: "800", fontSize: 16 },
  signatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  inlineSettingsWrapper: {
    backgroundColor: '#F8FAFC', // Light grey to distinguish from the main menu
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
});