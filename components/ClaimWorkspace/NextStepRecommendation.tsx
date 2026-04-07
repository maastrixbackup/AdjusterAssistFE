import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface NextStep {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  action?: () => void;
}

interface NextStepRecommendationProps {
  nextSteps: NextStep[];
  isLoading?: boolean;
  onStepSelect?: (step: NextStep) => void;
}

const getPriorityColor = (priority: 'high' | 'medium' | 'low'): string => {
  switch (priority) {
    case 'high':
      return '#E74C3C';
    case 'medium':
      return '#F39C12';
    case 'low':
      return '#3498DB';
    default:
      return '#95A5A6';
  }
};

const getPriorityBgColor = (priority: 'high' | 'medium' | 'low'): string => {
  switch (priority) {
    case 'high':
      return '#FADBD8';
    case 'medium':
      return '#FCF3CF';
    case 'low':
      return '#D6EAF8';
    default:
      return '#ECF0F1';
  }
};

export const NextStepRecommendation: React.FC<NextStepRecommendationProps> = ({
  nextSteps,
  isLoading = false,
  onStepSelect,
}) => {
  if (!nextSteps.length && !isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="lightbulb-outline" size={40} color="#CBD5E1" />
        <Text style={styles.emptyText}>No recommendations yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#10B981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <MaterialCommunityIcons name="lightbulb-on" size={20} color="#FFFFFF" />
        <Text style={styles.headerTitle}>Recommended Next Steps</Text>
      </LinearGradient>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#10B981" />
          <Text style={styles.loadingText}>Analyzing and recommending next steps...</Text>
        </View>
      ) : (
        <ScrollView style={styles.stepsList} showsVerticalScrollIndicator={false}>
          {nextSteps.map((step, index) => (
            <TouchableOpacity
              key={step.id}
              style={styles.stepCard}
              onPress={() => {
                onStepSelect?.(step);
                step.action?.();
              }}
              activeOpacity={0.7}
            >
              {/* Priority Badge */}
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityBgColor(step.priority) },
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    { color: getPriorityColor(step.priority) },
                  ]}
                >
                  {step.priority.toUpperCase()}
                </Text>
              </View>

              {/* Step Number */}
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>

              {/* Content */}
              <View style={styles.stepContent}>
                <View style={styles.titleRow}>
                  <MaterialCommunityIcons
                    name={step.icon as any}
                    size={18}
                    color="#276bbd"
                    style={styles.stepIcon}
                  />
                  <Text style={styles.stepTitle}>{step.title}</Text>
                </View>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>

              {/* Arrow */}
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#CBD5E1"
                style={styles.arrowIcon}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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
  },
  stepsList: {
    maxHeight: 400,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    position: 'relative',
  },
  priorityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#276bbd',
  },
  stepContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stepIcon: {
    marginRight: 2,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  stepDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 4,
  },
  arrowIcon: {
    marginLeft: 8,
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 13,
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
    color: '#94A3B8',
  },
});
