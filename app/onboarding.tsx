import { useAuth } from "@/providers/auth-provider";
import { Feather } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics'; // Recommended for premium feel
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
  useWindowDimensions
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// --- SLIDES DATA stays the same ---
const SLIDES = [
  { id: "1", icon: "file-text" as const, badge: "AI-Powered", badgeColor: "#22c55e", heading: "Manage Claims\nwith AI Guidance", sub: "AI-powered claims drafting for insurance adjusters. Accurate, fast, professional." },
  { id: "2", icon: "camera" as const, badge: "Smart Capture", badgeColor: "#f59e0b", heading: "Capture &\nOrganize Evidence", sub: "Photo, notes, and damage reports — all organized automatically in one place." },
  { id: "3", icon: "send" as const, badge: "Instant Submit", badgeColor: "#276bbd", heading: "Review and Use with\nConfidence", sub: "Review, approve, and submit polished claim drafts directly from the field." },
];

function SlideIllustration({ icon, badge, badgeColor }: any) {
  // Floating animation for the illustration
  const floatAnim = useRef(new Animated.Value(0)).current;

  useState(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  });

  return (
    <Animated.View style={[illus.wrap, { transform: [{ translateY: floatAnim }] }]}>
      <View style={illus.card}>
        <Feather name={icon} size={64} color="rgba(255,255,255,0.95)" />
        <View style={illus.line1} />
        <View style={illus.line2} />
      </View>
      <View style={[illus.badge, { top: -10, right: -10 }]}>
        <View style={[illus.badgeDot, { backgroundColor: badgeColor }]} />
        <Text style={illus.badgeText}>{badge}</Text>
      </View>
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const isTablet = width > 768;
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  // const fadeAnim = useRef(new Animated.Value(1)).current;
  const { completeOnboarding } = useAuth();

  const logoImg = require("../assets/images/AdjusterAssist1.png");

  const completeOnboardingHandler = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await completeOnboarding(); // ✅ sets state instantly in context
    router.replace("/(auth)/login");
  };

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeIndex < SLIDES.length - 1) {
      const next = activeIndex + 1;
      flatRef.current?.scrollToIndex({ index: next, animated: true });
    } else {
      completeOnboardingHandler();
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const isLast = activeIndex === SLIDES.length - 1;

  // Responsive Styles
  const logoStyle = {
    height: 50,
    width: isTablet ? 240 : width * 0.5,
    resizeMode: 'contain' as const
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#276bbd", "#1e40af", "#172554"]} style={StyleSheet.absoluteFill} />

      {/* Decorative Elements */}
      <View style={[styles.bgCircle, { top: -50, right: -50, width: width * 0.7, height: width * 0.7 }]} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.logoRow}>
          <Image source={logoImg} style={logoStyle} />
        </View>

        <FlatList
          ref={flatRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width }]}>
              <SlideIllustration icon={item.icon} badge={item.badge} badgeColor={item.badgeColor} />
              <Text style={[styles.heading, isTablet && { fontSize: 42 }]}>{item.heading}</Text>
              <Text style={[styles.sub, isTablet && { fontSize: 18, maxWidth: 500 }]}>{item.sub}</Text>
            </View>
          )}
        />

        <View style={[styles.bottom, isTablet && { paddingHorizontal: width * 0.2 }]}>
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]} />
            ))}
          </View>

          <Pressable style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]} onPress={goNext}>
            <Text style={styles.btnText}>{isLast ? "Get Started" : "Continue"}</Text>
            <Feather name={isLast ? "arrow-right" : "chevron-right"} size={20} color="#1e40af" />
          </Pressable>

          {/* {!isLast && (
            <Pressable onPress={completeOnboarding} style={styles.skipWrap}>
              <Text style={styles.skip}>Skip for now</Text>
            </Pressable>
          )} */}

          <Pressable onPress={completeOnboardingHandler} style={styles.skipWrap}>
            <Text style={styles.skip}>Skip for now</Text>
          </Pressable>

        </View>
      </SafeAreaView>
    </View>
  );
}

const illus = StyleSheet.create({
  wrap: { position: "relative", marginBottom: 40, alignItems: 'center' },
  card: {
    width: 220,
    height: 220,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
  },
  line1: { position: "absolute", bottom: 40, width: '60%', height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)" },
  line2: { position: "absolute", bottom: 25, width: '40%', height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)" },
  badge: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: "800", color: "#1e40af", textTransform: 'uppercase' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#172554' },
  safe: { flex: 1 },
  bgCircle: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.03)" },
  logoRow: { paddingHorizontal: 30, paddingTop: 20, alignItems: 'center' },
  slide: { paddingHorizontal: 40, alignItems: "center", justifyContent: 'center' },
  heading: { fontSize: 32, fontWeight: "800", color: "#fff", textAlign: "center", marginBottom: 16, lineHeight: 40, letterSpacing: -0.5 },
  sub: { fontSize: 16, color: "rgba(255,255,255,0.7)", textAlign: "center", lineHeight: 24, fontWeight: '400' },
  bottom: { paddingHorizontal: 30, paddingBottom: 40 },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 30 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 24, backgroundColor: "#fff" },
  dotInactive: { width: 6, backgroundColor: "rgba(255,255,255,0.2)" },
  btn: { backgroundColor: "#fff", borderRadius: 20, height: 64, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  btnText: { fontSize: 18, fontWeight: "700", color: "#1e40af" },
  skipWrap: { marginTop: 20, alignItems: "center" },
  skip: { fontSize: 14, color: "rgba(255,255,255,0.5)", fontWeight: '600' },
});