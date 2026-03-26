import { BlurView } from 'expo-blur';
import React from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Modal from 'react-native-modal';

const { width } = Dimensions.get('window');

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
  isVisible, title, message, onConfirm, onCancel, confirmText = "Delete", isDestructive = true 
}: Props) => {
  return (
    <Modal 
      isVisible={isVisible} 
      onBackdropPress={onCancel}
      backdropOpacity={0.25} // Lighter backdrop for iOS feel
      animationIn="fadeIn"
      animationOut="fadeOut"
      useNativeDriver
      hideModalContentWhileAnimating
      style={styles.modalMargin}
    >
      <View style={styles.modalContainer}>
        {/* iOS Alerts use very high intensity light blur */}
        <BlurView intensity={90} tint="light" style={styles.iosCard}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>

          {/* iOS Button Layout: Horizontal with Hairline dividers */}
          <View style={styles.buttonRow}>
            <Pressable 
              style={({ pressed }) => [
                styles.button, 
                styles.cancelButton,
                pressed && styles.buttonPressed
              ]} 
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            
            <View style={styles.verticalDivider} />

            <Pressable 
              style={({ pressed }) => [
                styles.button, 
                pressed && styles.buttonPressed
              ]} 
              onPress={onConfirm}
            >
              <Text style={[
                styles.confirmText, 
                isDestructive ? styles.destructiveText : styles.defaultConfirmText
              ]}>
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalMargin: {
    margin: 0, // Helps with centering
  },
  modalContainer: { 
    flex: 1,
    alignItems: 'center', 
    justifyContent: 'center',
  },
  iosCard: {
    width: 270, // Standard iOS Alert width
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.8)' : '#FFFFFF',
  },
  textContainer: {
    padding: 20,
    alignItems: 'center',
  },
  title: { 
    fontSize: 17, 
    fontWeight: '600', 
    color: '#000', 
    textAlign: 'center',
    marginBottom: 4,
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
    borderTopColor: 'rgba(60, 60, 67, 0.29)', // iOS separator color
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
    color: '#007AFF', // Standard iOS Blue
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
    color: '#FF3B30', // Standard iOS Red
  },
  cancelButton: {
    // Optional: add specific cancel styling if needed
  }
});