import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Animated,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSend: () => void;
  onFocus: () => void;
  keyboardOffset: Animated.Value;
  dynamicBottomPadding: Animated.AnimatedAddition<number> | Animated.AnimatedInterpolation<number>;
}

export const ChatInputSection = ({
  inputText,
  setInputText,
  onSend,
  onFocus,
  keyboardOffset,
  dynamicBottomPadding,
}: ChatInputProps) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const sendScale = React.useRef(new Animated.Value(1)).current;

  const handleSendPress = () => {
    Animated.sequence([
      Animated.timing(sendScale, { toValue: 0.9, duration: 45, useNativeDriver: true }),
      Animated.spring(sendScale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
    ]).start();
    onSend();
  };

  return (
    <>
      <Animated.View
        style={[
          styles.inputWrapper,
          { paddingBottom: Animated.add(keyboardOffset, dynamicBottomPadding) },
        ]}
      >
        <View style={styles.inputCard}>
          <TouchableOpacity 
            style={styles.attachBtn} 
            onPress={() => setMenuVisible(true)} 
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={28} color="#004B93" />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Update claim thread..."
            placeholderTextColor="#94A3B8"
            multiline
            value={inputText}
            onChangeText={setInputText}
            onFocus={onFocus}
            underlineColorAndroid="transparent"
          />

          <View style={styles.rightActions}>
            <TouchableOpacity style={styles.micBtn} activeOpacity={0.7}>
              <Ionicons name="mic-outline" size={22} color="#64748B" />
            </TouchableOpacity>

            <Animated.View style={{ transform: [{ scale: sendScale }] }}>
              <TouchableOpacity
                style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                disabled={!inputText.trim()}
                onPress={handleSendPress}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-up" size={20} color="#FFF" />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </Animated.View>

      {/* Upload Selection Dialog */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => setMenuVisible(false)}>
              <Ionicons name="image-outline" size={20} color="#003366" />
              <Text style={styles.menuText}>Upload Image</Text>
            </TouchableOpacity>
            <View style={styles.menuSeparator} />
            <TouchableOpacity style={styles.menuItem} onPress={() => setMenuVisible(false)}>
              <Ionicons name="document-text-outline" size={20} color="#003366" />
              <Text style={styles.menuText}>Upload Document</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  inputWrapper: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: '#F8FAFC' },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 28,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
      android: { elevation: 3, borderColor: '#D1D9E0' },
    }),
  },
  attachBtn: { width: 40, height: 40, backgroundColor: '#F1F5F9', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  textInput: { flex: 1, fontSize: 16, color: '#1E293B', maxHeight: 100, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 5 },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  micBtn: { padding: 8 },
  sendBtn: { backgroundColor: '#003366', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#CBD5E1' },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end', paddingBottom: 110, paddingHorizontal: 25 },
  menuContainer: { backgroundColor: '#FFF', borderRadius: 20, padding: 8, width: 200, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  menuText: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  menuSeparator: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 8 },
});