// components/DailyBriefing.tsx
// Floating accessibility button + slide-up briefing card
// Usage: <DailyBriefing files={files} credits={credits} userName={email} />

import { ClaimFile } from "@/lib/api"; // adjust if needed
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ─── Briefing Logic ───────────────────────────────────────────────────────────

interface BriefingLine {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  text: string;
  priority: number;
}

function buildBriefingLines(files: ClaimFile[], credits: number): BriefingLine[] {
  const lines: BriefingLine[] = [];

  const activeFiles = files.filter((f) => f.status?.toLowerCase() === "active");
  const draftFiles = files.filter((f) => f.status?.toLowerCase() === "draft");

  // Active claims count
  if (activeFiles.length > 0) {
    lines.push({
      icon: "briefcase-outline",
      color: "#3B82F6",
      bg: "rgba(59,130,246,0.15)",
      text:
        activeFiles.length === 1
          ? "You have 1 active claim open today."
          : `You have ${activeFiles.length} active claims open today.`,
      priority: 1,
    });
  }

  // Stale claims — not updated in 3+ days
  const stale = activeFiles
    .filter((f) => getDaysSince(f.last_activity_at || f.updated_at) >= 3)
    .sort(
      (a, b) =>
        getDaysSince(b.last_activity_at || b.updated_at) -
        getDaysSince(a.last_activity_at || a.updated_at)
    );

  if (stale.length > 0) {
    const oldest = stale[0];
    const days = getDaysSince(oldest.last_activity_at || oldest.updated_at);
    lines.push({
      icon: "alert-circle-outline",
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.15)",
      text: `${oldest.claim_number} hasn't been updated in ${days} day${days !== 1 ? "s" : ""}. Consider following up.`,
      priority: 2,
    });
  }

  // Draft workspaces
  if (draftFiles.length > 0) {
    lines.push({
      icon: "document-text-outline",
      color: "#A78BFA",
      bg: "rgba(167,139,250,0.15)",
      text:
        draftFiles.length === 1
          ? "1 draft workspace is waiting to be activated."
          : `${draftFiles.length} draft workspaces are waiting to be activated.`,
      priority: 3,
    });
  }

  // Low credits
  if (credits <= 100) {
    lines.push({
      icon: "flash",
      color: "#EF4444",
      bg: "rgba(239,68,68,0.15)",
      text: `Critical: Only ${credits} credits left. Upgrade now to avoid interruptions.`,
      priority: 0,
    });
  } else if (credits <= 500) {
    lines.push({
      icon: "flash-outline",
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.15)",
      text: `${credits} credits remaining — running low. Consider upgrading.`,
      priority: 1,
    });
  }

  // No activity today
  const touchedToday = files.filter(
    (f) => getDaysSince(f.last_activity_at || f.updated_at) === 0
  );
  if (touchedToday.length === 0 && files.length > 0) {
    lines.push({
      icon: "sunny-outline",
      color: "#10B981",
      bg: "rgba(16,185,129,0.15)",
      text: "No activity yet today. Pick up where you left off.",
      priority: 4,
    });
  }

  // All good
  if (lines.length === 0) {
    lines.push({
      icon: "checkmark-circle-outline",
      color: "#10B981",
      bg: "rgba(16,185,129,0.15)",
      text: "All claims are up to date. Great work today!",
      priority: 4,
    });
  }

  return lines.sort((a, b) => a.priority - b.priority);
}

// ─── Floating Button ──────────────────────────────────────────────────────────

interface Props {
  files: ClaimFile[];
  credits: number;
  userName?: string;
}

export function DailyBriefing({ files, credits, userName }: Props) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);

  // Only show button if user has files (drafts/active)
  const hasFiles = files && files.length > 0;
  if (!hasFiles) return null;

  const lines = buildBriefingLines(files, credits);
  const hasUrgent = lines.some((l) => l.priority === 0 || l.priority === 2);

  const openCard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVisible(true);
  };

  const closeCard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVisible(false);
  };

  return (
    <>
      {/* Floating Button */}
      <FloatingButton
        onPress={openCard}
        hasUrgent={hasUrgent}
        bottomOffset={insets.bottom + 90} // above tab bar
      />

      {/* Briefing Card Modal */}
      <BriefingModal
        visible={visible}
        onClose={closeCard}
        lines={lines}
        userName={userName}
        credits={credits}
        totalFiles={files.length}
      />
    </>
  );
}

// ─── Floating Button ──────────────────────────────────────────────────────────

function FloatingButton({
  onPress,
  hasUrgent,
  bottomOffset,
}: {
  onPress: () => void;
  hasUrgent: boolean;
  bottomOffset: number;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasUrgent) {
      // Pulse animation for urgent state
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [hasUrgent]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        fabStyles.container,
        { bottom: bottomOffset, transform: [{ scale: pulseAnim }] },
      ]}
    >
      {/* Glow ring for urgent */}
      {hasUrgent && (
        <Animated.View
          style={[fabStyles.glowRing, { opacity: glowOpacity }]}
        />
      )}

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          fabStyles.btn,
          pressed && { transform: [{ scale: 0.93 }] },
        ]}
      >
        <LinearGradient
          colors={hasUrgent ? ["#F59E0B", "#EF4444"] : ["#1D4ED8", "#0F2D6B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={fabStyles.gradient}
        >
          <Ionicons
            name={hasUrgent ? "alert-circle" : "sunny"}
            size={22}
            color="#FFFFFF"
          />
        </LinearGradient>

        {/* Notification dot */}
        {hasUrgent && <View style={fabStyles.dot} />}
      </Pressable>
    </Animated.View>
  );
}

// ─── Briefing Modal ───────────────────────────────────────────────────────────

function BriefingModal({
  visible,
  onClose,
  lines,
  userName,
  credits,
  totalFiles,
}: {
  visible: boolean;
  onClose: () => void;
  lines: BriefingLine[];
  userName?: string;
  credits: number;
  totalFiles: number;
}) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;

  const greeting = getGreeting();
  const todayLabel = getTodayLabel();
  const firstName = userName?.split("@")[0] || "there";
  // Capitalize first letter
  const displayName =
    firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View
        style={[modalStyles.backdrop, { opacity: backdropAnim }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Card */}
      <Animated.View
        style={[
          modalStyles.cardWrapper,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <LinearGradient
          colors={["#0A1628", "#0D2347", "#0A1628"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={modalStyles.card}
        >
          {/* Handle bar */}
          <View style={modalStyles.handle} />

          {/* Header */}
          <View style={modalStyles.header}>
            <View style={modalStyles.headerLeft}>
              <View style={modalStyles.sunIconWrap}>
                <LinearGradient
                  colors={["#F59E0B", "#F97316"]}
                  style={modalStyles.sunIconGrad}
                >
                  <Ionicons name="sunny" size={18} color="#fff" />
                </LinearGradient>
              </View>
              <View>
                <Text style={modalStyles.greeting}>
                  {greeting} 👋
                </Text>
                <Text style={modalStyles.dateLabel}>{todayLabel}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={modalStyles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={16} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </View>

          {/* Stats row */}
          <View style={modalStyles.statsRow}>
            <StatPill label="Claims" value={totalFiles} icon="layers-outline" color="#3B82F6" />
            <StatPill label="Credits" value={credits} icon="flash-outline" color="#F59E0B" />
          </View>

          {/* Divider */}
          <View style={modalStyles.divider} />

          {/* Briefing label */}
          <Text style={modalStyles.sectionLabel}>TODAY&apos;S BRIEFING</Text>

          {/* Lines */}
          <View style={modalStyles.linesContainer}>
            {lines.map((line, i) => (
              <BriefingRow key={i} line={line} index={i} />
            ))}
          </View>

          {/* Footer */}
          <View style={modalStyles.footer}>
            <Ionicons name="shield-checkmark-outline" size={12} color="rgba(255,255,255,0.25)" />
            <Text style={modalStyles.footerText}>
              AdjusterAssist · Auto-generated from your workspace data
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View style={[statStyles.pill, { borderColor: `${color}30` }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={13} color={color} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

// ─── Single briefing row with staggered animation ─────────────────────────────

function BriefingRow({ line, index }: { line: BriefingLine; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 380,
        delay: 200 + index * 90,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        delay: 200 + index * 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        rowStyles.row,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={[rowStyles.iconWrap, { backgroundColor: line.bg }]}>
        <Ionicons name={line.icon} size={15} color={line.color} />
      </View>
      <Text style={rowStyles.text}>{line.text}</Text>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const fabStyles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 20,
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(245,158,11,0.3)",
  },
  btn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    elevation: 12,
    shadowColor: "#1D4ED8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  gradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#fff",
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 998,
  },
  cardWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  card: {
    paddingTop: 14,
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center",
    marginBottom: 22,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  sunIconWrap: {
    borderRadius: 14,
    overflow: "hidden",
  },
  sunIconGrad: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  greeting: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  dateLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: 3,
    fontWeight: "500",
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  linesContainer: {
    gap: 12,
    marginBottom: 24,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  footerText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.2)",
    fontWeight: "500",
  },
});

const statStyles = StyleSheet.create({
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  label: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    fontWeight: "600",
  },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontSize: 14,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 21,
    fontWeight: "500",
  },
});