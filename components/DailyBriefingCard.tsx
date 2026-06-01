// components/DailyBriefing.tsx

import { ClaimFile } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
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

/**
 * Glow control:
 * Keep opacity low for premium soft neon.
 */
const GLOW = {
  idleMinOpacity: 0.12,
  idleMaxOpacity: 0.98,
  urgentMinOpacity: 0.18,
  urgentMaxOpacity: 0.38,
  idleScale: 1.16,
  urgentScale: 1.22,
  idleDuration: 2400,
  urgentDuration: 1200,
};

type TimeTheme = {
  gradientColors: [string, string];
  glowColor: string;
  borderColor: string;
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
};

function getTimeTheme(hasUrgent: boolean): TimeTheme {
  if (hasUrgent) {
    return {
      gradientColors: ["#F59E0B", "#EF4444"],
      glowColor: "rgba(245,158,11,0.45)",
      borderColor: "rgba(255,255,255,0.18)",
      iconName: "alert-circle",
      label: "urgent",
    };
  }

  const h = new Date().getHours();

  // Morning: soft champagne / light premium
  if (h >= 5 && h < 11) {
    return {
      gradientColors: ["#FBBF24", "#F59E0B"],
      glowColor: "rgba(253,230,138,0.34)",
      borderColor: "rgba(253,230,138,0.34)",
      iconName: "partly-sunny-outline",
      label: "morning",
    };
  }

  // Day: refined yellow
  if (h >= 11 && h < 16) {
    return {
      gradientColors: ["#FACC15", "#d98f06"],
      glowColor: "rgba(250,204,21,0.32)",
      borderColor: "rgba(250,204,21,0.28)",
      iconName: "sunny",
      label: "day",
    };
  }

  // Evening: controlled warm orange
  if (h >= 16 && h < 20) {
    return {
      gradientColors: ["#FB923C", "#EA580C"],
      glowColor: "rgba(251,146,60,0.34)",
      borderColor: "rgba(251,146,60,0.3)",
      iconName: "partly-sunny-outline",
      label: "evening",
    };
  }

  // Night: dark blue, app-theme friendly
  return {
    gradientColors: ["#2563EB", "#0F172A"],
    glowColor: "rgba(37,99,235,0.36)",
    borderColor: "rgba(96,165,250,0.26)",
    iconName: "moon",
    label: "night",
  };
}

function getDaysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good Morning";
  if (h >= 12 && h < 17) return "Good Afternoon";
  if (h >= 17 && h < 21) return "Good Evening";
  return "Working Late";
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

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
        getDaysSince(a.last_activity_at || a.updated_at),
    );

  if (stale.length > 0) {
    const oldest = stale[0];
    const days = getDaysSince(oldest.last_activity_at || oldest.updated_at);

    lines.push({
      icon: "alert-circle-outline",
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.15)",
      text: `${oldest.claim_number} hasn't been updated in ${days} day${days !== 1 ? "s" : ""
        }. Consider following up.`,
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
      text: `${credits} credits remaining. Consider upgrading.`,
      priority: 1,
    });
  }

  const touchedToday = files.filter(
    (f) => getDaysSince(f.last_activity_at || f.updated_at) === 0,
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

interface Props {
  files: ClaimFile[];
  credits: number;
  userName?: string;
}

export function DailyBriefing({ files = [], credits, userName }: Props) {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);

  const hasFiles = files.length > 0;

  const lines = useMemo(
    () => buildBriefingLines(files, credits),
    [files, credits],
  );

  const hasUrgent = useMemo(
    () => lines.some((l) => l.priority === 0 || l.priority === 2),
    [lines],
  );

  const theme = useMemo(() => getTimeTheme(hasUrgent), [hasUrgent]);

  if (!hasFiles) return null;

  return (
    <>
      <DraggableButton
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setModalVisible(true);
        }}
        hasUrgent={hasUrgent}
        theme={theme}
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
        theme={theme}
      />
    </>
  );
}

function DraggableButton({
  onPress,
  hasUrgent,
  theme,
  bottomBound,
}: {
  onPress: () => void;
  hasUrgent: boolean;
  theme: TimeTheme;
  bottomBound: number;
}) {
  const initX = SW - BTN_SIZE - EDGE_MARGIN;
  const initY = SH - bottomBound - BTN_SIZE - EDGE_MARGIN;

  const posX = useRef(new Animated.Value(initX)).current;
  const posY = useRef(new Animated.Value(initY)).current;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const trailAnim = useRef(new Animated.Value(0)).current;

  const currentPos = useRef({ x: initX, y: initY });
  const dragStartTime = useRef(0);
  const dragDistance = useRef(0);

  useEffect(() => {
    pulseAnim.stopAnimation();
    glowAnim.stopAnimation();

    const maxOpacity = hasUrgent ? GLOW.urgentMaxOpacity : GLOW.idleMaxOpacity;
    const minOpacity = hasUrgent ? GLOW.urgentMinOpacity : GLOW.idleMinOpacity;
    const maxScale = hasUrgent ? 1.055 : 1.025;
    const duration = hasUrgent ? GLOW.urgentDuration : GLOW.idleDuration;

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: maxScale,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: maxOpacity,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: minOpacity,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();
    glowLoop.start();

    return () => {
      pulseLoop.stop();
      glowLoop.stop();
    };
  }, [hasUrgent, pulseAnim, glowAnim]);

  const snapToEdge = (x: number, y: number, velocityX = 0) => {
    const center = x + BTN_SIZE / 2;

    const snapX =
      Math.abs(center - SW / 2) < 60
        ? velocityX >= 0
          ? SW - BTN_SIZE - EDGE_MARGIN
          : EDGE_MARGIN
        : center < SW / 2
          ? EDGE_MARGIN
          : SW - BTN_SIZE - EDGE_MARGIN;

    const minY = 80;
    const maxY = SH - bottomBound - BTN_SIZE - EDGE_MARGIN;
    const clampedY = Math.max(minY, Math.min(maxY, y));

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.parallel([
      Animated.spring(posX, {
        toValue: snapX,
        tension: 180,
        friction: 14,
        useNativeDriver: false,
      }),
      Animated.spring(posY, {
        toValue: clampedY,
        tension: 180,
        friction: 14,
        useNativeDriver: false,
      }),
    ]).start();

    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 200,
      friction: 8,
      useNativeDriver: true,
    }).start();

    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    Animated.sequence([
      Animated.timing(rotateAnim, {
        toValue: snapX === EDGE_MARGIN ? -1 : 1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(rotateAnim, {
        toValue: 0,
        tension: 200,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    currentPos.current = { x: snapX, y: clampedY };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,

      onPanResponderGrant: () => {
        dragStartTime.current = Date.now();
        dragDistance.current = 0;

        Animated.spring(scaleAnim, {
          toValue: 1.14,
          tension: 280,
          friction: 7,
          useNativeDriver: true,
        }).start();

        Animated.timing(opacityAnim, {
          toValue: 0.9,
          duration: 80,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();

        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: -0.8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();

        trailAnim.setValue(0);
        Animated.timing(trailAnim, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      },

      onPanResponderMove: (_, g) => {
        dragDistance.current = Math.sqrt(g.dx * g.dx + g.dy * g.dy);
        posX.setValue(currentPos.current.x + g.dx);
        posY.setValue(currentPos.current.y + g.dy);
      },

      onPanResponderRelease: (_, g) => {
        const elapsed = Date.now() - dragStartTime.current;
        const moved = dragDistance.current;

        if (elapsed < 200 && moved < 8) {
          Animated.spring(scaleAnim, {
            toValue: 0.94,
            tension: 400,
            friction: 6,
            useNativeDriver: true,
          }).start(() => {
            Animated.spring(scaleAnim, {
              toValue: 1,
              tension: 300,
              friction: 8,
              useNativeDriver: true,
            }).start();
          });

          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }).start();

          onPress();
          return;
        }

        snapToEdge(
          currentPos.current.x + g.dx,
          currentPos.current.y + g.dy,
          g.vx,
        );
      },

      onPanResponderTerminate: (_, g) => {
        snapToEdge(
          currentPos.current.x + (g.dx || 0),
          currentPos.current.y + (g.dy || 0),
        );
      },
    }),
  ).current;

  const glowScale = pulseAnim.interpolate({
    inputRange: [1, 1.055],
    outputRange: [1, hasUrgent ? GLOW.urgentScale : GLOW.idleScale],
  });

  const trailScale = trailAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.9],
  });

  const trailOpacity = trailAnim.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0.22, 0.1, 0],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-8deg", "0deg", "8deg"],
  });

  return (
    <Animated.View
      style={[fabStyles.positionLayer, { left: posX, top: posY }]}
      {...panResponder.panHandlers}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          fabStyles.softGlow,
          {
            backgroundColor: theme.glowColor,
            opacity: glowAnim,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          fabStyles.edgeGlow,
          {
            borderColor: theme.glowColor,
            opacity: glowAnim,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          fabStyles.trail,
          {
            backgroundColor: theme.glowColor,
            transform: [{ scale: trailScale }],
            opacity: trailOpacity,
          },
        ]}
      />

      {hasUrgent && (
        <Animated.View
          pointerEvents="none"
          style={[
            fabStyles.urgentRing,
            {
              borderColor: theme.glowColor,
              opacity: glowAnim,
            },
          ]}
        />
      )}

      <Animated.View
        style={[
          fabStyles.btnWrapper,
          {
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
              { rotate },
            ],
            opacity: opacityAnim,
          },
        ]}
      >
        <LinearGradient
          colors={theme.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            fabStyles.gradient,
            {
              borderColor: theme.borderColor,
              shadowColor: "#000",
            },
          ]}
        >
          <View style={fabStyles.shineTop} />
          <View style={fabStyles.shineBottom} />

          <Ionicons name={theme.iconName} size={22} color="#FFFFFF" />
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

function BriefingModal({
  visible,
  onClose,
  lines,
  userName,
  credits,
  totalFiles,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  lines: BriefingLine[];
  userName?: string;
  credits: number;
  totalFiles: number;
  theme: TimeTheme;
}) {
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 70,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SH,
          duration: 280,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible, slideAnim, backdropAnim, scaleAnim]);

  if (!mounted) return null;

  const firstName = userName?.split("@")[0] || "there";
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <Animated.View style={[mStyles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          mStyles.cardWrapper,
          {
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={[
            "#020617",
            "#0F172A",
            "#1E293B",
            "#0F172A"
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={mStyles.card}
        >
          <View
            style={[
              mStyles.shimmerLine,
              { backgroundColor: theme.glowColor },
            ]}
          />

          <View style={mStyles.handle} />

          <View style={mStyles.header}>
            <View style={mStyles.headerLeft}>
              <LinearGradient
                colors={theme.gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={mStyles.sunIcon}
              >
                <Ionicons name={theme.iconName} size={18} color="#fff" />
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
            <StatPill
              label="Claims"
              value={totalFiles}
              icon="layers-outline"
              color="#3B82F6"
            />
            <StatPill
              label="Credits"
              value={credits}
              icon="flash-outline"
              color="#F59E0B"
            />
          </View>

          <View style={mStyles.divider} />

          <Text style={mStyles.sectionLabel}>TODAY&apos;S BRIEFING</Text>

          <View style={mStyles.linesContainer}>
            {lines.map((line, i) => (
              <BriefingRow key={`${line.text}-${i}`} line={line} index={i} />
            ))}
          </View>

          <View style={mStyles.footer}>
            <Ionicons
              name="shield-checkmark-outline"
              size={11}
              color="rgba(255,255,255,0.2)"
            />
            <Text style={mStyles.footerText}>
              Auto-generated from your workspace data
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
}

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
    <View style={[spStyles.pill, { borderColor: `${color}28` }]}>
      <View style={[spStyles.iconWrap, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={icon} size={13} color={color} />
      </View>
      <Text style={spStyles.value}>{value}</Text>
      <Text style={spStyles.label}>{label}</Text>
    </View>
  );
}

function BriefingRow({ line, index }: { line: BriefingLine; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: 160 + index * 80,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 90,
        friction: 10,
        delay: 160 + index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View
      style={[
        rStyles.row,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={[rStyles.iconWrap, { backgroundColor: line.bg }]}>
        <Ionicons name={line.icon} size={15} color={line.color} />
      </View>
      <Text style={rStyles.text}>{line.text}</Text>
    </Animated.View>
  );
}

const fabStyles = StyleSheet.create({
  positionLayer: {
    position: "absolute",
    width: BTN_SIZE,
    height: BTN_SIZE,
    zIndex: 9999,
  },
  softGlow: {
    position: "absolute",
    width: BTN_SIZE + 18,
    height: BTN_SIZE + 18,
    borderRadius: (BTN_SIZE + 18) / 2,
    top: -9,
    left: -9,
  },
  edgeGlow: {
    position: "absolute",
    width: BTN_SIZE + 10,
    height: BTN_SIZE + 10,
    borderRadius: (BTN_SIZE + 10) / 2,
    top: -5,
    left: -5,
    borderWidth: 1.2,
    backgroundColor: "transparent",
  },
  trail: {
    position: "absolute",
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
  },
  urgentRing: {
    position: "absolute",
    width: BTN_SIZE + 14,
    height: BTN_SIZE + 14,
    borderRadius: (BTN_SIZE + 14) / 2,
    top: -7,
    left: -7,
    borderWidth: 1.4,
    backgroundColor: "transparent",
  },
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
    elevation: 10,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  shineTop: {
    position: "absolute",
    top: 5,
    left: 10,
    width: BTN_SIZE * 0.5,
    height: BTN_SIZE * 0.2,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    transform: [{ rotate: "-22deg" }],
  },
  shineBottom: {
    position: "absolute",
    bottom: 7,
    right: 8,
    width: BTN_SIZE * 0.24,
    height: BTN_SIZE * 0.1,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.07)",
    transform: [{ rotate: "-22deg" }],
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
    shadowColor: "#FF6B6B",
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  dragDots: {
    position: "absolute",
    bottom: 6,
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
    backgroundColor: "rgba(255,255,255,0.3)",
  },
});

const mStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.62)",
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
    paddingBottom: 44,
  },
  shimmerLine: {
    position: "absolute",
    top: 0,
    left: "20%",
    right: "20%",
    height: 1.5,
    borderRadius: 1,
    opacity: 0.35,
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
    width: 44,
    height: 44,
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