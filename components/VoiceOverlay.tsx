import React, { useEffect, useRef } from "react";
import {
    Animated,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const BAR_COUNT = 20;

export function VoiceOverlay({
  visible,
  meteringLevel,
  onCancel,
}: {
  visible: boolean;
  meteringLevel: number;
  onCancel: () => void;
}) {
  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.2)),
  ).current;

  useEffect(() => {
    bars.forEach((bar, i) => {
      // Each bar gets a slightly different target so they don't all move together
      const jitter = 0.6 + Math.random() * 0.4;
      Animated.spring(bar, {
        toValue: meteringLevel * jitter,
        useNativeDriver: false,
        speed: 40,
        bounciness: 0,
      }).start();
    });
  }, [meteringLevel]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.waveform}>
          {bars.map((bar, i) => (
            <Animated.View
              key={i}
              style={[
                styles.bar,
                {
                  height: bar.interpolate({
                    inputRange: [0, 1],
                    outputRange: [6, 56],
                  }),
                  opacity: bar.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.4, 1],
                  }),
                },
              ]}
            />
          ))}
        </View>

        <Text style={styles.hint}>Tap the button to stop</Text>

        {/* Stop button */}
        <TouchableOpacity style={styles.stopBtn} onPress={onCancel}>
          <View style={styles.stopIcon} />
        </TouchableOpacity>

        {/* Cancel link */}
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  stopBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  stopIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  cancelText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    marginTop: 8,
  },
  hint: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.93)",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  waveform: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 60,
  },
  bar: {
    width: 4,
    borderRadius: 4,
    backgroundColor: "#DC2626",
  },
  timer: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
