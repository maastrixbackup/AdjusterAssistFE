import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

interface Props {
  isVisible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  isDestructive?: boolean;
}

export const CustomConfirmModal = ({
  isVisible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Delete',
  isDestructive = true,
}: Props) => {
  const [mounted, setMounted] = useState(isVisible);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1.08)).current;

  useEffect(() => {
    if (isVisible) {
      setMounted(true);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          damping: 18,
          stiffness: 220,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 0.96,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMounted(false);
        cardScale.setValue(1.08); // reset for next open
      });
    }
  }, [isVisible, mounted, backdropOpacity, cardOpacity, cardScale]);

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={onCancel}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.25],
                }),
              },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Alert Card */}
        <View style={styles.centerWrap} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.animatedCard,
              {
                opacity: cardOpacity,
                transform: [{ scale: cardScale }],
              },
            ]}
          >
            {Platform.OS === 'ios' ? (
              <BlurView intensity={90} tint="light" style={styles.card}>
                <ModalContent
                  title={title}
                  message={message}
                  onCancel={onCancel}
                  onConfirm={onConfirm}
                  confirmText={confirmText}
                  isDestructive={isDestructive}
                />
              </BlurView>
            ) : (
              <View style={[styles.card, styles.androidCard]}>
                <ModalContent
                  title={title}
                  message={message}
                  onCancel={onCancel}
                  onConfirm={onConfirm}
                  confirmText={confirmText}
                  isDestructive={isDestructive}
                />
              </View>
            )}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const ModalContent = ({
  title,
  message,
  onCancel,
  onConfirm,
  confirmText,
  isDestructive,
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText: string;
  isDestructive: boolean;
}) => {
  return (
    <>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={onCancel}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        <View style={styles.verticalDivider} />

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={onConfirm}
        >
          <Text
            style={[
              styles.confirmText,
              isDestructive ? styles.destructiveText : styles.defaultConfirmText,
            ]}
          >
            {confirmText}
          </Text>
        </Pressable>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  centerWrap: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedCard: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  card: {
    width: 270,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  androidCard: {
    backgroundColor: '#F8F8F8',
  },
  textContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 13,
    color: '#000',
    textAlign: 'center',
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(60, 60, 67, 0.29)',
    height: 44,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  verticalDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(60, 60, 67, 0.29)',
  },
  cancelText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
  confirmText: {
    fontSize: 17,
    fontWeight: '600',
  },
  defaultConfirmText: {
    color: '#007AFF',
  },
  destructiveText: {
    color: '#FF3B30',
  },
});