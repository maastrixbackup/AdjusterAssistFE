import { TimelineEntry } from '@/lib/utils/timelineStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface TimelineLogProps {
  entries: TimelineEntry[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onDeleteEntry?: (entryId: string) => void;
}

const getInputTypeIcon = (type: 'text' | 'voice' | 'ocr'): string => {
  switch (type) {
    case 'text':
      return 'keyboard';
    case 'voice':
      return 'microphone';
    case 'ocr':
      return 'image';
    default:
      return 'file-document';
  }
};

const getInputTypeLabel = (type: 'text' | 'voice' | 'ocr'): string => {
  switch (type) {
    case 'text':
      return 'Text Input';
    case 'voice':
      return 'Voice Input';
    case 'ocr':
      return 'Image/OCR';
    default:
      return 'Input';
  }
};

const getInputTypeColor = (type: 'text' | 'voice' | 'ocr'): string => {
  switch (type) {
    case 'text':
      return '#3B82F6';
    case 'voice':
      return '#8B5CF6';
    case 'ocr':
      return '#EC4899';
    default:
      return '#6B7280';
  }
};

interface TimelineItemProps {
  entry: TimelineEntry;
  onPress: (entry: TimelineEntry) => void;
  onDelete: (entryId: string) => void;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ entry, onPress, onDelete }) => {
  const timestamp = new Date(entry.timestamp);
  const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = timestamp.toLocaleDateString();
  const typeColor = getInputTypeColor(entry.inputType);

  const contentPreview = entry.inputContent.substring(0, 80) + 
    (entry.inputContent.length > 80 ? '...' : '');

  return (
    <TouchableOpacity style={styles.timelineItem} onPress={() => onPress(entry)}>
      {/* Timeline Dot */}
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineDot, { backgroundColor: typeColor }]}>
          <MaterialCommunityIcons
            name={getInputTypeIcon(entry.inputType) as any}
            size={14}
            color="#FFFFFF"
          />
        </View>
        <View style={[styles.timelineConnector, { backgroundColor: typeColor }]} />
      </View>

      {/* Content */}
      <View style={styles.timelineContent}>
        <View style={styles.timelineHeader}>
          <View style={styles.typeContainer}>
            <Text style={[styles.typeLabel, { color: typeColor }]}>
              {getInputTypeLabel(entry.inputType)}
            </Text>
            {entry.metadata?.wordCount && (
              <Text style={styles.wordCount}>
                {entry.metadata.wordCount} words
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(entry.id)}
          >
            <MaterialCommunityIcons name="close" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <Text style={styles.contentPreview}>{contentPreview}</Text>

        <View style={styles.timelineFooter}>
          <Text style={styles.timeString}>{timeString}</Text>
          {entry.aiResponse && (
            <View style={styles.responseIndicator}>
              <MaterialCommunityIcons name="check-circle" size={12} color="#10B981" />
              <Text style={styles.responseText}>Response Generated</Text>
            </View>
          )}
        </View>
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={18}
        color="#CBD5E1"
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
};

export const TimelineLog: React.FC<TimelineLogProps> = ({
  entries,
  onRefresh,
  isRefreshing = false,
  onDeleteEntry,
}) => {
  const [selectedEntry, setSelectedEntry] = useState<TimelineEntry | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  const handleEntryPress = (entry: TimelineEntry) => {
    setSelectedEntry(entry);
    setDetailsModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#8B5CF6', '#6D28D9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <MaterialCommunityIcons name="history" size={20} color="#FFFFFF" />
        <Text style={styles.headerTitle}>Activity Timeline</Text>
        {entries.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{entries.length}</Text>
          </View>
        )}
      </LinearGradient>

      {/* Timeline List */}
      {entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="history" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No activity yet</Text>
          <Text style={styles.emptySubtext}>Your inputs and responses will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={({ item }) => (
            <TimelineItem
              entry={item}
              onPress={handleEntryPress}
              onDelete={entryId => onDeleteEntry?.(entryId)}
            />
          )}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
            ) : undefined
          }
        />
      )}

      {/* Details Modal */}
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
        transparent={false}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <LinearGradient
            colors={['#8B5CF6', '#6D28D9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.modalHeader}
          >
            <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Activity Details</Text>
            <View style={{ width: 24 }} />
          </LinearGradient>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent}>
            {selectedEntry && (
              <>
                {/* Header Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Input Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type</Text>
                    <Text style={[
                      styles.detailValue,
                      { color: getInputTypeColor(selectedEntry.inputType) }
                    ]}>
                      {getInputTypeLabel(selectedEntry.inputType)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Timestamp</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedEntry.timestamp).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Metadata */}
                {selectedEntry.metadata && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Metadata</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Words</Text>
                      <Text style={styles.detailValue}>
                        {selectedEntry.metadata.wordCount}
                      </Text>
                    </View>
                    {selectedEntry.metadata.duration && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Duration</Text>
                        <Text style={styles.detailValue}>
                          {selectedEntry.metadata.duration}s
                        </Text>
                      </View>
                    )}
                    {selectedEntry.metadata.confidence && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>OCR Confidence</Text>
                        <Text style={styles.detailValue}>
                          {(selectedEntry.metadata.confidence * 100).toFixed(1)}%
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Input Content */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Input Content</Text>
                  <View style={styles.contentBox}>
                    <Text style={styles.contentText}>{selectedEntry.inputContent}</Text>
                  </View>
                </View>

                {/* AI Response */}
                {selectedEntry.aiResponse && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>AI Response</Text>
                    <View style={styles.contentBox}>
                      <Text style={styles.contentText}>{selectedEntry.aiResponse}</Text>
                    </View>
                  </View>
                )}

                {/* Next Step */}
                {selectedEntry.nextStepSuggestion && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Suggested Next Step</Text>
                    <View style={styles.sugestionBox}>
                      <MaterialCommunityIcons
                        name="lightbulb-on"
                        size={18}
                        color="#F39C12"
                      />
                      <Text style={styles.sugestionText}>
                        {selectedEntry.nextStepSuggestion}
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 16,
    marginVertical: 12,
    maxHeight: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  timelineItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'flex-start',
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 2,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineConnector: {
    width: 2,
    height: 40,
    marginTop: 4,
    opacity: 0.3,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  wordCount: {
    fontSize: 11,
    color: '#94A3B8',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deleteButton: {
    padding: 4,
  },
  contentPreview: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
    marginBottom: 8,
  },
  timelineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeString: {
    fontSize: 11,
    color: '#94A3B8',
  },
  responseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  responseText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#94A3B8',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
  },
  contentBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contentText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#1E293B',
  },
  sugestionBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  sugestionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: '#92400E',
  },
});
