import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface UnifiedInputProps {
  onTextInput: (text: string) => void;
  onVoiceInput: (text: string, duration: number) => void;
  onImageInput: (imagePath: string, extractedText: string) => void;
  isProcessing?: boolean;
  placeholder?: string;
}

export const UnifiedInput: React.FC<UnifiedInputProps> = ({
  onTextInput,
  onVoiceInput,
  onImageInput,
  isProcessing = false,
  placeholder = "What happened? Type or use voice/photo...",
}) => {
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textInputRef = useRef<TextInput>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Text Input Handler
  const handleTextSubmit = () => {
    if (textInput.trim()) {
      onTextInput(textInput.trim());
      setTextInput('');
    }
  };

  // Voice Input Handlers
  const handleStartRecording = async () => {
    try {
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      // TODO: Implement actual voice recording with @react-native-voice/voice
      console.log('Recording started...');
    } catch (error) {
      Alert.alert('Error', 'Failed to start recording');
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      setIsRecording(false);
      
      // TODO: Get actual transcribed text from voice library
      const transcribedText = 'Water damage in the basement from the recent storm.';
      onVoiceInput(transcribedText, recordingDuration);
      setRecordingDuration(0);
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  // Scroll to Bottom Handler
  const handleScrollToBottom = () => {
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  };

  // Handle Text Change - Show/Hide Scroll Button
  const handleTextChange = (text: string) => {
    setTextInput(text);
    setShowScrollButton(text.length > 100);
  };

  // Image/OCR Handler
  const handleImagePicker = async () => {
    try {
      // TODO: Implement with expo-image-picker when dependency is available
      Alert.alert('Feature Coming Soon', 'Image upload will be available soon');
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      setOcrProcessing(false);
    }
  };

  const handleCameraCapture = async () => {
    try {
      // TODO: Implement with expo-image-picker when dependency is available
      Alert.alert('Feature Coming Soon', 'Camera capture will be available soon');
    } catch (error) {
      Alert.alert('Error', 'Failed to capture image');
      setOcrProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Text Input Section */}
      <View style={styles.inputSection}>
        <View style={styles.inputWrapper}>
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={2000}
            value={textInput}
            onChangeText={handleTextChange}
            editable={!isProcessing && !isRecording}
            scrollEnabled={true}
          />
          {/* Scroll to Bottom Button */}
          {showScrollButton && (
            <TouchableOpacity
              style={styles.scrollButton}
              onPress={handleScrollToBottom}
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
            >
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color="#276bbd"
              />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.charCount}>
          {textInput.length}/2000
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        {/* Text Submit */}
        <TouchableOpacity
          style={[styles.actionButton, textInput.trim() === '' && styles.buttonDisabled]}
          onPress={handleTextSubmit}
          disabled={textInput.trim() === '' || isProcessing}
        >
          <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
          <Text style={styles.buttonLabel}>Send</Text>
        </TouchableOpacity>

        {/* Voice Input */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            isRecording && styles.recordingButton,
            isProcessing && styles.buttonDisabled,
          ]}
          onPress={isRecording ? handleStopRecording : handleStartRecording}
          disabled={isProcessing}
        >
          <MaterialCommunityIcons
            name={isRecording ? 'stop-circle' : 'microphone'}
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.buttonLabel}>
            {isRecording ? `${recordingDuration}s` : 'Voice'}
          </Text>
        </TouchableOpacity>

        {/* Camera */}
        <TouchableOpacity
          style={[styles.actionButton, isProcessing && styles.buttonDisabled]}
          onPress={handleCameraCapture}
          disabled={isProcessing || ocrProcessing}
        >
          <MaterialCommunityIcons name="camera" size={20} color="#FFFFFF" />
          <Text style={styles.buttonLabel}>Photo</Text>
        </TouchableOpacity>

        {/* Image Gallery */}
        <TouchableOpacity
          style={[styles.actionButton, isProcessing && styles.buttonDisabled]}
          onPress={handleImagePicker}
          disabled={isProcessing || ocrProcessing}
        >
          <MaterialCommunityIcons name="image-multiple" size={20} color="#FFFFFF" />
          <Text style={styles.buttonLabel}>Image</Text>
        </TouchableOpacity>
      </View>

      {/* Image Preview */}
      {selectedImage && (
        <View style={styles.imagePreview}>
          <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          {ocrProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#276bbd" />
              <Text style={styles.processingText}>Extracting text...</Text>
            </View>
          )}
        </View>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <View style={styles.processingSection}>
          <ActivityIndicator size="small" color="#276bbd" />
          <Text style={styles.processingLabel}>Processing your input...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  inputSection: {
    marginBottom: 12,
  },
  inputWrapper: {
    position: 'relative',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 40,
    fontSize: 14,
    color: '#1E293B',
    maxHeight: 100,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  scrollButton: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  charCount: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#276bbd',
  },
  recordingButton: {
    backgroundColor: '#E74C3C',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  imagePreview: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    height: 200,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 14,
  },
  processingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  processingLabel: {
    color: '#0369A1',
    fontSize: 13,
  },
});
