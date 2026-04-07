import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface OutputPanelProps {
  response: string | null;
  responseType: string;
  isLoading?: boolean;
  onCopy?: (text: string) => void;
  onShare?: (text: string) => void;
  onSave?: (text: string) => void;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({
  response,
  responseType,
  isLoading = false,
  onCopy,
  onShare,
  onSave,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (response && onCopy) {
      onCopy(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (response && onShare) {
      onShare(response);
    }
  };

  const handleSave = () => {
    if (response && onSave) {
      onSave(response);
    }
  };

  if (!response && !isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="thought-bubble-outline" size={48} color="#CBD5E1" />
        <Text style={styles.emptyText}>AI response will appear here</Text>
        <Text style={styles.emptySubtext}>Submit your claim details to get started</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#276bbd', '#1e4d8b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <MaterialCommunityIcons name="text-box-outline" size={20} color="#FFFFFF" />
          <Text style={styles.headerTitle}>AI Response</Text>
          <Text style={styles.responseType}>{responseType}</Text>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#276bbd" />
            <Text style={styles.loadingText}>Generating response...</Text>
          </View>
        ) : (
          <Text style={styles.responseText}>{response}</Text>
        )}
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
          <MaterialCommunityIcons
            name={copied ? 'check-circle' : 'content-copy'}
            size={18}
            color={copied ? '#10B981' : '#276bbd'}
          />
          <Text style={[styles.actionLabel, copied && styles.copiedLabel]}>
            {copied ? 'Copied!' : 'Copy'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <MaterialCommunityIcons name="share-variant" size={18} color="#276bbd" />
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
          <MaterialCommunityIcons name="content-save-outline" size={18} color="#276bbd" />
          <Text style={styles.actionLabel}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <MaterialCommunityIcons name="refresh" size={18} color="#276bbd" />
          <Text style={styles.actionLabel}>Regenerate</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Footer */}
      <View style={styles.statsFooter}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Words</Text>
          <Text style={styles.statValue}>
            {response?.split(/\s+/).length || 0}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Characters</Text>
          <Text style={styles.statValue}>
            {response?.length || 0}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Generated</Text>
          <Text style={styles.statValue}>
            {new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
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
    maxHeight: 500,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  responseType: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '500',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  contentScroll: {
    maxHeight: 300,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  responseText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#1E293B',
    fontFamily: 'System',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: '#276bbd',
    fontWeight: '500',
  },
  copiedLabel: {
    color: '#10B981',
  },
  statsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
});
