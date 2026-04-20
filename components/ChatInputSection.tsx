import { useVoiceInput } from '@/hooks/useVoiceInput';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
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

// Structure compatible with FormData
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
  const [isPicking, setIsPicking] = useState(false);

 const pickImages = async () => {
    if (isPicking) return;
    setIsPicking(true);
    setMenuVisible(false);

    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      const result = await ImagePicker.launchImageLibraryAsync({
        // 'images' covers png, jpg, heic, gif, bmp, etc.
        mediaTypes: ['images'], 
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const newImages: Attachment[] = result.assets.map(asset => {
          const extension = asset.uri.split('.').pop()?.toLowerCase();
          
          return {
            uri: asset.uri, 
            name: asset.fileName || `img_${Date.now()}.${extension || 'jpg'}`,
            type: asset.mimeType || `image/${extension || 'jpeg'}`,
            kind: 'image'
          };
        });
        
        setSelectedAttachments(prev => [...prev, ...newImages]);
      }
    } catch (error) {
      console.error("Image Picker Error:", error);
    } finally {
      setIsPicking(false);
    }
  };

  // 2. Updated Document Picker
const pickDocs = async () => {
    if (isPicking) return;
    setIsPicking(true);
    setMenuVisible(false);

    try {
      // Essential for iOS to prevent the "Picking in progress" crash
      await new Promise(resolve => setTimeout(resolve, 300));

      const result = await DocumentPicker.getDocumentAsync({
        // Array of MIME types for Android and iOS translation
        type: [
          'application/pdf',
          'application/msword', // .doc
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
          'text/plain', // .txt
        ],
        multiple: true,
        copyToCacheDirectory: true, 
      });

      if (!result.canceled) {
        const newDocs: Attachment[] = result.assets.map(asset => {
          const isPDF = asset.mimeType?.includes('pdf') || asset.name.toLowerCase().endsWith('.pdf');
          
          return {
            // Keep the file:// prefix for local URI (remove only during actual upload)
            uri: asset.uri,
            name: asset.name,
            type: asset.mimeType || 'application/octet-stream',
            kind: isPDF ? 'pdf' : 'document'
          };
        });
        
        setSelectedAttachments(prev => [...prev, ...newDocs]);
      }
    } catch (error) {
      console.error("Document Picker Error:", error);
    } finally {
      setIsPicking(false);
    }
  };

  const removeAttachment = (index: number) => {
    setSelectedAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendPress = () => {
    Animated.sequence([
      Animated.timing(sendScale, { toValue: 0.9, duration: 45, useNativeDriver: true }),
      Animated.spring(sendScale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
    ]).start();

    // Pass the array of attachments to the parent handleSend
    onSend(selectedAttachments);
    setSelectedAttachments([]); // Clear UI after sending
  };

  // Text is mandatory, images/pdfs are optional
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
        toast.warning("Microphone permission required.");
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
        {/* Preview Section */}
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

          <TextInput
            style={styles.textInput}
            placeholder={voice.isTranscribing ? "Transcribing..." : "Update claim thread..."}
            placeholderTextColor="#94A3B8"
            multiline
            editable={!disabled && !voice.isTranscribing}
            value={inputText}
            onChangeText={setInputText}
            onFocus={onFocus}
            underlineColorAndroid="transparent"
          />

          <View style={styles.rightActions}>
            <TouchableOpacity onPress={handleVoiceToggle}>
              <Ionicons
                name={
                  voice.isRecording
                    ? "stop-circle"
                    : voice.isTranscribing
                      ? "hourglass"
                      : "mic"
                }
                size={25}
                color={
                  voice.isRecording
                    ? "#DC2626"
                    : voice.isTranscribing
                      ? "#94A3B8"
                      : "#0F4C9C"
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

      <Modal visible={menuVisible} transparent animationType="fade">
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
  removeBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#FFF', borderRadius: 10 },
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
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  micBtn: { padding: 8 },
  sendBtn: { backgroundColor: '#003366', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#CBD5E1' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end', paddingBottom: 110, paddingHorizontal: 25 },
  menuContainer: { backgroundColor: '#FFF', borderRadius: 20, padding: 8, width: 220, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  menuText: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  menuSeparator: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 8 },
});