// components/DailyBriefing.tsx
// Draggable floating button + slide-up briefing card
// Fixed: no mixed useNativeDriver errors

import { ClaimFile } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SW, height: SH } = Dimensions.get("window");
const BTN_SIZE = 54;
const EDGE_MARGIN = 16;
const TAB_BAR_HEIGHT = 80;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Main Export ──────────────────────────────────────────────────────────────

interface Props {
  files: ClaimFile[];
  credits: number;
  userName?: string;
}

export function DailyBriefing({ files, credits, userName }: Props) {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);

  const hasFiles = files && files.length > 0;
  if (!hasFiles) return null;

  const lines = buildBriefingLines(files, credits);
  const hasUrgent = lines.some((l) => l.priority === 0 || l.priority === 2);

  return (
    <>
      <DraggableButton
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setModalVisible(true);
        }}
        hasUrgent={hasUrgent}
        bottomBound={insets.bottom + TAB_BAR_HEIGHT}
      />
      <BriefingModal
        visible={modalVisible}
        onClose={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setModalVisible(false);
        }}
        lines={lines}
        userName={userName}
        credits={credits}
        totalFiles={files.length}
      />
    </>
  );
}

// ─── Draggable Button ─────────────────────────────────────────────────────────
// KEY FIX: position uses useNativeDriver: false only
// scale/opacity/pulse use useNativeDriver: true on SEPARATE Animated.Values

function DraggableButton({
  onPress,
  hasUrgent,
  bottomBound,
}: {
  onPress: () => void;
  hasUrgent: boolean;
  bottomBound: number;
}) {
  const initX = SW - BTN_SIZE - EDGE_MARGIN;
  const initY = SH - bottomBound - BTN_SIZE - EDGE_MARGIN;

  // NON-NATIVE: position (layout driven, cannot use native driver)
  const posX = useRef(new Animated.Value(initX)).current;
  const posY = useRef(new Animated.Value(initY)).current;

  // NATIVE: visual-only animations (scale, opacity, pulse, glow)
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const trailAnim = useRef(new Animated.Value(0)).current;

  // Track current position in a plain ref (not animated)
  const currentPos = useRef({ x: initX, y: initY });
  const dragStartTime = useRef(0);
  const dragDistance = useRef(0);
  const isDragging = useRef(false);

  // Urgent pulse — NATIVE driver ✅
  useEffect(() => {
    if (hasUrgent) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.2, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      glowAnim.stopAnimation();
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [hasUrgent]);

  const snapToEdge = (x: number, y: number) => {
    const snapX = x + BTN_SIZE / 2 < SW / 2 ? EDGE_MARGIN : SW - BTN_SIZE - EDGE_MARGIN;
    const minY = 80;
    const maxY = SH - bottomBound - BTN_SIZE - EDGE_MARGIN;
    const clampedY = Math.max(minY, Math.min(maxY, y));

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // NON-NATIVE: position snap
    Animated.parallel([
      Animated.spring(posX, { toValue: snapX, tension: 120, friction: 8, useNativeDriver: false }),
      Animated.spring(posY, { toValue: clampedY, tension: 120, friction: 8, useNativeDriver: false }),
    ]).start();

    // NATIVE: scale reset
    Animated.spring(scaleAnim, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }).start();
    Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();

    currentPos.current = { x: snapX, y: clampedY };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,

      onPanResponderGrant: () => {
        isDragging.current = false;
        dragStartTime.current = Date.now();
        dragDistance.current = 0;

        // NATIVE: grab feedback
        Animated.spring(scaleAnim, { toValue: 1.15, tension: 200, friction: 6, useNativeDriver: true }).start();
        Animated.timing(opacityAnim, { toValue: 0.85, duration: 100, useNativeDriver: true }).start();

        // Trail ripple — NATIVE
        trailAnim.setValue(0);
        Animated.timing(trailAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      },

      onPanResponderMove: (_, g) => {
        isDragging.current = true;
        dragDistance.current = Math.sqrt(g.dx * g.dx + g.dy * g.dy);

        // NON-NATIVE: move position
        posX.setValue(currentPos.current.x + g.dx);
        posY.setValue(currentPos.current.y + g.dy);
      },

      onPanResponderRelease: (_, g) => {
        const elapsed = Date.now() - dragStartTime.current;
        const moved = dragDistance.current;

        if (elapsed < 250 && moved < 10) {
          // It's a tap — reset visuals and fire onPress
          Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 6, useNativeDriver: true }).start();
          Animated.timing(opacityAnim, { toValue: 1, duration: 100, useNativeDriver: true }).start();
          onPress();
          return;
        }

        // It's a drag — snap to edge
        const newX = currentPos.current.x + g.dx;
        const newY = currentPos.current.y + g.dy;
        snapToEdge(newX, newY);
      },

      onPanResponderTerminate: (_, g) => {
        const newX = currentPos.current.x + g.dx;
        const newY = currentPos.current.y + g.dy;
        snapToEdge(newX, newY);
      },
    })
  ).current;

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.55],
  });

  const trailScale = trailAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.4],
  });
  const trailOpacity = trailAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.45, 0.15, 0],
  });

  return (
    // Outer view: NON-NATIVE (handles position via left/top)
    <Animated.View
      style={[fabStyles.positionLayer, { left: posX, top: posY }]}
      {...panResponder.panHandlers}
    >
      {/* Trail — NATIVE (scale + opacity only) */}
      <Animated.View
        style={[
          fabStyles.trail,
          { transform: [{ scale: trailScale }], opacity: trailOpacity },
        ]}
        pointerEvents="none"
      />

      {/* Glow ring — NATIVE */}
      {hasUrgent && (
        <Animated.View
          style={[fabStyles.glowRing, { opacity: glowOpacity }]}
          pointerEvents="none"
        />
      )}

      {/* Button — NATIVE (scale + opacity) */}
      <Animated.View
        style={[
          fabStyles.btnWrapper,
          {
            transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
            opacity: opacityAnim,
          },
        ]}
      >
        <LinearGradient
          colors={hasUrgent ? ["#F59E0B", "#EF4444"] : ["#1D4ED8", "#0F2D6B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={fabStyles.gradient}
        >
          <View style={fabStyles.shine} />
          <Ionicons
            name={hasUrgent ? "alert-circle" : "sunny"}
            size={22}
            color="#FFFFFF"
          />
        </LinearGradient>

        {hasUrgent && <View style={fabStyles.dot} />}

        <View style={fabStyles.dragDots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={fabStyles.dragDot} />
          ))}
        </View>
      </Animated.View>
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
  // NATIVE: slide + backdrop (translateY and opacity only)
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SH, duration: 300, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;

  const firstName = userName?.split("@")[0] || "there";
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <Animated.View style={[mStyles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[mStyles.cardWrapper, { transform: [{ translateY: slideAnim }] }]}
      >
        <LinearGradient
          colors={["#080F1E", "#0C1E3E", "#080F1E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={mStyles.card}
        >
          <View style={mStyles.shimmerLine} />
          <View style={mStyles.handle} />

          <View style={mStyles.header}>
            <View style={mStyles.headerLeft}>
              <LinearGradient
                colors={["#F59E0B", "#F97316"]}
                style={mStyles.sunIcon}
              >
                <Ionicons name="sunny" size={18} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={mStyles.greeting}>
                  {getGreeting()}, {displayName} 👋
                </Text>
                <Text style={mStyles.dateLabel}>{getTodayLabel()}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={mStyles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={15} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </View>

          <View style={mStyles.statsRow}>
            <StatPill label="Claims" value={totalFiles} icon="layers-outline" color="#3B82F6" />
            <StatPill label="Credits" value={credits} icon="flash-outline" color="#F59E0B" />
          </View>

          <View style={mStyles.divider} />

          <Text style={mStyles.sectionLabel}>TODAY&apos;S BRIEFING</Text>

          <View style={mStyles.linesContainer}>
            {lines.map((line, i) => (
              <BriefingRow key={i} line={line} index={i} />
            ))}
          </View>

          <View style={mStyles.footer}>
            <Ionicons name="shield-checkmark-outline" size={11} color="rgba(255,255,255,0.2)" />
            <Text style={mStyles.footerText}>
              Auto-generated from your workspace data
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({ label, value, icon, color }: {
  label: string; value: number;
  icon: keyof typeof Ionicons.glyphMap; color: string;
}) {
  return (
    <View style={[spStyles.pill, { borderColor: `${color}28` }]}>
      <View style={[spStyles.iconWrap, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={icon} size={13} color={color} />
      </View>
      <Text style={spStyles.value}>{value}</Text>
      <Text style={spStyles.label}>{label}</Text>
    </View>
  );
}

// ─── Briefing Row ─────────────────────────────────────────────────────────────

function BriefingRow({ line, index }: { line: BriefingLine; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, delay: 180 + index * 85, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 9, delay: 180 + index * 85, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[rStyles.row, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <View style={[rStyles.iconWrap, { backgroundColor: line.bg }]}>
        <Ionicons name={line.icon} size={15} color={line.color} />
      </View>
      <Text style={rStyles.text}>{line.text}</Text>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const fabStyles = StyleSheet.create({
  // NON-NATIVE layer — handles position
  positionLayer: {
    position: "absolute",
    width: BTN_SIZE,
    height: BTN_SIZE,
    zIndex: 9999,
  },
  trail: {
    position: "absolute",
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    backgroundColor: "rgba(59,130,246,0.3)",
  },
  glowRing: {
    position: "absolute",
    width: BTN_SIZE + 20,
    height: BTN_SIZE + 20,
    borderRadius: (BTN_SIZE + 20) / 2,
    top: -10,
    left: -10,
    backgroundColor: "rgba(245,158,11,0.35)",
  },
  // NATIVE layer — handles scale + opacity
  btnWrapper: {
    position: "absolute",
    width: BTN_SIZE,
    height: BTN_SIZE,
  },
  gradient: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 14,
    shadowColor: "#1D4ED8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    overflow: "hidden",
  },
  shine: {
    position: "absolute",
    top: 5,
    left: 10,
    width: BTN_SIZE * 0.5,
    height: BTN_SIZE * 0.22,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    transform: [{ rotate: "-20deg" }],
  },
  dot: {
    position: "absolute",
    top: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#EF4444",
    borderWidth: 2.5,
    borderColor: "#fff",
  },
  dragDots: {
    position: "absolute",
    bottom: 7,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 3,
  },
  dragDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
});

const mStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 998,
  },
  cardWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    overflow: "hidden",
    elevation: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
  },
  card: {
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  shimmerLine: {
    position: "absolute",
    top: 0,
    left: "15%",
    right: "15%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 1,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.13)",
    alignSelf: "center",
    marginBottom: 24,
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
  sunIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  dateLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.38)",
    marginTop: 3,
    fontWeight: "500",
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.07)",
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
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.28)",
    letterSpacing: 1.8,
    marginBottom: 14,
  },
  linesContainer: {
    gap: 13,
    marginBottom: 26,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  footerText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.18)",
    fontWeight: "500",
  },
});

const spStyles = StyleSheet.create({
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
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
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
  },
});

const rStyles = StyleSheet.create({
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