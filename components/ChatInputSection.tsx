import { useVoiceInput } from '@/hooks/useVoiceInput';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { toast } from 'sonner-native';
import { VoiceOverlay } from './VoiceOverlay';

export interface Attachment {
  uri: string;
  name: string;
  type: string;
  kind: 'image' | 'pdf' | 'document';
}

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSend: (attachments: Attachment[]) => void;
  onFocus: () => void;
  keyboardOffset: Animated.Value;
  dynamicBottomPadding: Animated.AnimatedAddition<number> | Animated.AnimatedInterpolation<number>;
  disabled?: boolean;
}

export const ChatInputSection = ({
  inputText,
  setInputText,
  onSend,
  onFocus,
  keyboardOffset,
  dynamicBottomPadding,
  disabled,
}: ChatInputProps) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<Attachment[]>([]);
  const sendScale = React.useRef(new Animated.Value(1)).current;
  const [isFullEditorVisible, setIsFullEditorVisible] = useState(false);
  const MAX_INPUT_HEIGHT = 150; // Threshold before the small input scrolls
  const isLongText = inputText.length > 200;

  // ─── Track what to launch AFTER the modal fully dismisses ─────────────
  const pendingAction = useRef<'image' | 'doc' | null>(null);
  // ──────────────────────────────────────────────────────────────────────

  // ─── Called by Modal's onDismiss — fires only after modal is fully gone ─
  const handleModalDismissed = async () => {
    const action = pendingAction.current;
    pendingAction.current = null;

    if (!action) return;

    if (action === 'image') {
      await launchImagePicker();
    } else if (action === 'doc') {
      await launchDocPicker();
    }
  };
  // ──────────────────────────────────────────────────────────────────────

  const launchImagePicker = async () => {
    try {
      // 1. Request Permissions (Crucial for Standalone Builds)
      const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        if (!canAskAgain) {
          // User denied permanently; must send them to Settings
          Alert.alert(
            'Permission Required',
            'AdjusterAssist needs gallery access to upload photos. Please enable it in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        } else {
          toast.error('Permission to access gallery is required.');
        }
        return;
      }

      // 2. Configure Picker
      // Note: Android supports multiple selection in recent Expo versions, 
      // but keeping your logic for 'isMultiple' if you prefer stability.
      const isMultiple = Platform.OS === 'ios';

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], // Correct modern array format
        allowsMultipleSelection: isMultiple,
        quality: 0.8,
        selectionLimit: isMultiple ? 10 : 1, // Optional: safety limit
      });

      console.log('PICKER RESULT:', result);

      // 3. Handle Results
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages: Attachment[] = result.assets.map(asset => ({
          uri: asset.uri,
          // Fallback for name if fileName is null
          name: asset.fileName || `img_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`,
          type: asset.mimeType || 'image/jpeg',
          kind: 'image',
        }));

        setSelectedAttachments(prev => [...prev, ...newImages]);
        toast.success(`${newImages.length} image(s) added`);
      } else {
        console.log('User cancelled or no assets found');
      }
    } catch (error) {
      // This will now capture the 'ImageLoader' or 'Permission' errors in your logs
      console.error('Image Picker Error:', error);
      toast.error('Image selection failed. Please try again.');
    }
  };

  const launchDocPicker = async () => {
    try {
      if (Platform.OS === 'ios') {
        const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          if (!canAskAgain) {
            Alert.alert(
              'Storage Access Required',
              'Please enable file/storage access in your iPhone Settings to attach documents.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
              ]
            );
          }
          return;
        }
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const newDocs: Attachment[] = result.assets.map(asset => {
          const isPDF = asset.mimeType?.includes('pdf') || asset.name.toLowerCase().endsWith('.pdf');
          return {
            uri: asset.uri,
            name: asset.name,
            type: asset.mimeType || 'application/octet-stream',
            kind: isPDF ? 'pdf' : 'document',
          };
        });
        setSelectedAttachments(prev => [...prev, ...newDocs]);
      }
    } catch (error) {
      toast.error("Unable to upload file.")
      console.error('Document Picker Error:', error);
    }
  };

  // ─── These are what the menu buttons call ─────────────────────────────
  const pickImages = () => {
    pendingAction.current = 'image';
    setMenuVisible(false);
    if (Platform.OS === 'android') {
      handleModalDismissed();
    }
  };

  const pickDocs = () => {
    pendingAction.current = 'doc';
    setMenuVisible(false);
    if (Platform.OS === 'android') {
      handleModalDismissed();
    }
  };
  // ──────────────────────────────────────────────────────────────────────

  const removeAttachment = (index: number) => {
    setSelectedAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendPress = () => {
    Animated.sequence([
      Animated.timing(sendScale, { toValue: 0.9, duration: 45, useNativeDriver: true }),
      Animated.spring(sendScale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
    ]).start();

    onSend(selectedAttachments);
    setSelectedAttachments([]);
  };

  const isSendDisabled = !inputText.trim();
  const voice = useVoiceInput();

  const handleVoiceToggle = async () => {
    if (voice.isRecording) {
      const transcript = await voice.stop();
      if (transcript) {
        setInputText(inputText ? `${inputText} ${transcript}` : transcript);
      }
    } else {
      try {
        await voice.start();
      } catch {
        toast.warning('Microphone permission required.');
      }
    }
  };

  return (
    <>
      <Animated.View
        style={[
          styles.inputWrapper,
          { paddingBottom: Animated.add(keyboardOffset, dynamicBottomPadding) },
        ]}
      >
        {selectedAttachments.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.previewContainer}
            contentContainerStyle={styles.previewContent}
          >
            {selectedAttachments.map((item, index) => (
              <View key={index} style={styles.previewItem}>
                {item.kind === 'image' ? (
                  <Image source={{ uri: item.uri }} style={styles.thumbnail} />
                ) : (
                  <View style={[styles.thumbnail, styles.pdfThumbnail]}>
                    <Ionicons name="document-text" size={20} color="#004B93" />
                    <Text numberOfLines={1} style={styles.pdfText}>{item.name}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeAttachment(index)}
                >
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.inputCard}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={28} color="#004B93" />
          </TouchableOpacity>

          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end' }}>
            <TextInput
              style={[
                styles.textInput,
                { maxHeight: MAX_INPUT_HEIGHT } // Forces scrollability after this height
              ]}
              placeholder={voice.isTranscribing ? 'Transcribing...' : 'Update claim thread...'}
              placeholderTextColor="#94A3B8"
              multiline
              editable={!disabled && !voice.isTranscribing}
              value={inputText}
              onChangeText={setInputText}
              onFocus={onFocus}
              underlineColorAndroid="transparent"
              scrollEnabled={true}
            />
            {/* OPTION: Full Screen Trigger Icon */}
            {isLongText && (
              <TouchableOpacity
                onPress={() => setIsFullEditorVisible(true)}
                style={styles.expandIcon}
              >
                <Ionicons name="expand-outline" size={20} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.rightActions}>
            <TouchableOpacity onPress={handleVoiceToggle}>
              <Ionicons
                name={
                  voice.isRecording
                    ? 'stop-circle'
                    : voice.isTranscribing
                      ? 'hourglass'
                      : 'mic'
                }
                size={25}
                color={
                  voice.isRecording
                    ? '#DC2626'
                    : voice.isTranscribing
                      ? '#94A3B8'
                      : '#0F4C9C'
                }
              />
            </TouchableOpacity>
            <VoiceOverlay
              visible={voice.isRecording}
              meteringLevel={voice.meteringLevel}
              onCancel={handleVoiceToggle}
            />

            <Animated.View style={{ transform: [{ scale: sendScale }] }}>
              <TouchableOpacity
                style={[styles.sendBtn, (isSendDisabled || disabled) && styles.sendBtnDisabled]}
                disabled={isSendDisabled || disabled}
                onPress={handleSendPress}
                activeOpacity={0.8}
              >
                {disabled ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="arrow-up" size={18} color="#FFF" />
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </Animated.View>

      <Modal visible={isFullEditorVisible} animationType="slide" presentationStyle="fullScreen">
        {/* KeyboardAvoidingView prevents the keyboard from covering the input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.fullEditorContainer}>
            {/* Header stays fixed at the top */}
            <View style={styles.fullEditorHeader}>
              <TouchableOpacity onPress={() => setIsFullEditorVisible(false)}>
                <Text style={styles.closeEditorText}>Done</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Review Claim Draft</Text>
              <TouchableOpacity
                onPress={() => {
                  handleSendPress();
                  setIsFullEditorVisible(false);
                }}
                disabled={isSendDisabled}
              >
                <Text style={[styles.sendEditorText, isSendDisabled && { opacity: 0.5 }]}>Send</Text>
              </TouchableOpacity>
            </View>

            {/* ScrollView allows the user to see everything, even with the keyboard up */}
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                style={styles.fullEditorInput}
                multiline
                autoFocus
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type or paste your detailed claim notes..."
                textAlignVertical="top" // Important for Android to start text at top
                scrollEnabled={false} // Disable internal scroll so the parent ScrollView handles it
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onDismiss={handleModalDismissed}
      // ─────────────────────────────────────────────────────────────────
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={pickImages}>
              <Ionicons name="image-outline" size={20} color="#003366" />
              <Text style={styles.menuText}>Upload Photos</Text>
            </TouchableOpacity>

            <View style={styles.menuSeparator} />

            <TouchableOpacity style={styles.menuItem} onPress={pickDocs}>
              <Ionicons name="document-text-outline" size={20} color="#003366" />
              <Text style={styles.menuText}>Upload Documents</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  inputWrapper: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: '#F8FAFC' },
  previewContainer: { marginBottom: 10, maxHeight: 70 },
  previewContent: { gap: 10, paddingRight: 20 },
  previewItem: { width: 60, height: 60, position: 'relative' },
  thumbnail: { width: '100%', height: '100%', borderRadius: 12, backgroundColor: '#E2E8F0' },
  pdfThumbnail: { justifyContent: 'center', alignItems: 'center', padding: 4, borderWidth: 1, borderColor: '#CBD5E1' },
  pdfText: { fontSize: 8, color: '#475569', marginTop: 2, textAlign: 'center' },
  removeBtn: { position: 'absolute', top: -3, right: -8, backgroundColor: '#FFF', borderRadius: 10 },
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
  // textInput: { flex: 1, fontSize: 16, color: '#1E293B', maxHeight: 100, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 5 },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  micBtn: { padding: 8 },
  sendBtn: { backgroundColor: '#003366', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#CBD5E1' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end', paddingBottom: 110, paddingHorizontal: 25 },
  menuContainer: { backgroundColor: '#FFF', borderRadius: 20, padding: 8, width: 220, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  menuText: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  menuSeparator: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 8 },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    textAlignVertical: 'top', // Crucial for Android multiline
  },
  expandIcon: {
    paddingBottom: 10,
    paddingRight: 5,
  },
  fullEditorContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  fullEditorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeEditorText: {
    color: '#004B93',
    fontSize: 16,
    fontWeight: '600',
  },
  sendEditorText: {
    color: '#004B93',
    fontSize: 16,
    fontWeight: '700',
  },
  fullEditorInput: {
    flex: 1,
    padding: 20,
    fontSize: 18,
    lineHeight: 26,
    color: '#1E293B',
    minHeight:300,
    textAlignVertical: 'top',
  },
});