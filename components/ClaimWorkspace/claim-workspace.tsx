import { useFocusEffect } from '@react-navigation/native';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { NextStepRecommendation } from '@/components/ClaimWorkspace/NextStepRecommendation';
import { OutputPanel } from '@/components/ClaimWorkspace/OutputPanel';
import { TimelineLog } from '@/components/ClaimWorkspace/TimelineLog';
import { UnifiedInput } from '@/components/ClaimWorkspace/UnifiedInput';

import { OutputType } from '@/lib/api';
import {
    consolidateOCRInput,
    consolidateTextInput,
    consolidateVoiceInput,
    formatForBackendSubmission,
    type ConsolidatedInput,
} from '@/lib/services/inputConsolidation';
import {
    addTimelineEntry,
    deleteTimelineEntry,
    getTimeline,
    type TimelineEntry,
} from '@/lib/utils/timelineStorage';

interface NextStepType {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  action?: () => void;
}

export default function ClaimWorkspaceScreen() {
  const [currentInput, setCurrentInput] = useState<ConsolidatedInput | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [responseType, setResponseType] = useState<OutputType>('file_note');
  const [nextSteps, setNextSteps] = useState<NextStepType[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingSteps, setIsGeneratingSteps] = useState(false);

  // Load timeline on mount
  useFocusEffect(
    React.useCallback(() => {
      loadTimeline();
    }, [])
  );

  const loadTimeline = async () => {
    try {
      const entries = await getTimeline();
      setTimeline(entries);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    }
  };

  // Handle text input
  const handleTextInput = async (text: string) => {
    const consolidated = consolidateTextInput(text);
    await processInput(consolidated);
  };

  // Handle voice input
  const handleVoiceInput = async (text: string, duration: number) => {
    const consolidated = consolidateVoiceInput(text, duration);
    await processInput(consolidated);
  };

  // Handle image/OCR input
  const handleImageInput = async (imagePath: string, extractedText: string) => {
    const consolidated = consolidateOCRInput(extractedText, imagePath);
    await processInput(consolidated);
  };

  // Main input processing
  const processInput = async (consolidated: ConsolidatedInput) => {
    try {
      setCurrentInput(consolidated);
      setIsProcessing(true);
      setAiResponse(null);
      setNextSteps([]);

      // Save to timeline (without AI response yet)
      const timelineEntry = await addTimelineEntry({
        inputType: consolidated.type,
        inputContent: consolidated.processedContent,
        metadata: consolidated.metadata,
      });

      // Generate AI response
      const response = await generateAIResponse(consolidated);

      // Update timeline with response
      if (timelineEntry.id) {
        await updateTimelineWithResponse(timelineEntry.id, response);
      }

      // Generate recommended next steps
      await generateNextSteps(response, consolidated);

      // Show success toast
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `${consolidated.type.toUpperCase()} input processed`,
      });
    } catch (error) {
      console.error('Error processing input:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to process input. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateAIResponse = async (consolidated: ConsolidatedInput): Promise<string> => {
    try {
      // Format for backend
      const formattedInput = formatForBackendSubmission(
        consolidated,
        responseType,
        undefined
      );

      // Call API (update this based on your actual API structure)
      // For now, returning mock response
      const mockResponse = `Based on your ${consolidated.type} input about: "${consolidated.processedContent.substring(0, 50)}..."
      
This appears to be a water damage claim that requires immediate mitigation. The following aspects should be documented:

1. **Immediate Actions**: Prevent further water intrusion and document damage with photos
2. **Coverage Verification**: Confirm water damage coverage under the policy
3. **Timeline Documentation**: Note the exact time of discovery and date of loss
4. **Mitigation Costs**: Separate and track emergency mitigation expenses

Recommended next steps have been generated based on this input.`;

      setAiResponse(mockResponse);
      setResponseType('file_note');
      return mockResponse;
    } catch (error) {
      throw new Error('Failed to generate AI response');
    }
  };

  const updateTimelineWithResponse = async (entryId: string, response: string) => {
    try {
      // In a real implementation, this would update the timeline entry with the response
      console.log('Timeline entry updated with response:', entryId);
    } catch (error) {
      console.error('Failed to update timeline:', error);
    }
  };

  const generateNextSteps = async (
    response: string,
    consolidated: ConsolidatedInput
  ) => {
    try {
      setIsGeneratingSteps(true);

      // Generate AI-driven next steps based on response
      // This is a mock implementation - adapt to your actual API
      const steps: NextStepType[] = [
        {
          id: 'document-damage',
          title: 'Document All Damage',
          description:
            'Take comprehensive photos and videos of all affected areas with date/time stamps',
          priority: 'high',
          icon: 'camera-outline',
        },
        {
          id: 'contact-carrier',
          title: 'Contact Insurance Carrier',
          description:
            'Notify the insurance company within 24 hours of discovery per policy requirements',
          priority: 'high',
          icon: 'phone-outline',
        },
        {
          id: 'mitigate-damage',
          title: 'Begin Mitigation',
          description:
            'Stop water source if possible and begin removing water to prevent additional damage',
          priority: 'high',
          icon: 'water-alert',
        },
        {
          id: 'preserve-items',
          title: 'Preserve Damaged Items',
          description:
            'Move undamaged items away from affected areas and protect with tarps if needed',
          priority: 'medium',
          icon: 'package-outline',
        },
        {
          id: 'get-estimates',
          title: 'Obtain Repair Estimates',
          description:
            'Contact local contractors for repair estimates within 48-72 hours',
          priority: 'medium',
          icon: 'file-document-outline',
        },
      ];

      setNextSteps(steps);
    } catch (error) {
      console.error('Failed to generate next steps:', error);
    } finally {
      setIsGeneratingSteps(false);
    }
  };

  const handleCopyResponse = (text: string) => {
    // In a real implementation, copy to clipboard
    Toast.show({
      type: 'info',
      text1: 'Copied',
      text2: 'Response copied to clipboard',
    });
  };

  const handleShareResponse = async (text: string) => {
    try {
      await Share.share({
        message: text,
        title: 'Claim Workspace Response',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleSaveResponse = (text: string) => {
    Toast.show({
      type: 'success',
      text1: 'Saved',
      text2: 'Response saved to drafts',
    });
  };

  const handleRefreshTimeline = async () => {
    await loadTimeline();
  };

  const handleDeleteTimelineEntry = async (entryId: string) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this timeline entry?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await deleteTimelineEntry(entryId);
            await loadTimeline();
            Toast.show({
              type: 'success',
              text1: 'Deleted',
              text2: 'Timeline entry removed',
            });
          } catch (error) {
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'Failed to delete entry',
            });
          }
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* AI Response Output */}
          <OutputPanel
            response={aiResponse}
            responseType={responseType}
            isLoading={isProcessing}
            onCopy={handleCopyResponse}
            onShare={handleShareResponse}
            onSave={handleSaveResponse}
          />

          {/* Recommended Next Steps */}
          {(nextSteps.length > 0 || isGeneratingSteps) && (
            <NextStepRecommendation
              nextSteps={nextSteps}
              isLoading={isGeneratingSteps}
              onStepSelect={(step) => {
                Toast.show({
                  type: 'info',
                  text1: step.title,
                  text2: step.description,
                });
              }}
            />
          )}

          {/* Timeline Log */}
          <TimelineLog
            entries={timeline}
            isRefreshing={false}
            onRefresh={handleRefreshTimeline}
            onDeleteEntry={handleDeleteTimelineEntry}
          />

          {/* Unified Input Module */}
          <View style={styles.inputSpacer} />
        </ScrollView>

        {/* Fixed Input at Bottom */}
        <UnifiedInput
          onTextInput={handleTextInput}
          onVoiceInput={handleVoiceInput}
          onImageInput={handleImageInput}
          isProcessing={isProcessing}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  inputSpacer: {
    height: 20,
  },
});
