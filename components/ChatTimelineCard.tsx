import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

interface ChatTimelineCardProps {
  title: string;
  content: string;
  category: string;
  color: string;
  timeAgo: string;
  quickActions?: string[];
  outputFormat?: string;
  // NEW: Callback for specific action clicks
  onActionPress?: (action: string) => void;
}

export const ChatTimelineCard = ({
  title,
  content,
  category,
  outputFormat,
  color,
  timeAgo,
  quickActions = [],
  onActionPress
}: ChatTimelineCardProps) => {

  const animatedValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(animatedValue, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(animatedValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.cardWrapper}
    >
      <Animated.View style={[
        styles.card,
        { transform: [{ scale: animatedValue }] }
      ]}>
        <View style={[styles.accentBar, { backgroundColor: color }]} />

        <View style={styles.contentContainer}>
          <View style={styles.cardHeader}>
            {/* Left Side: Category Badge */}
            <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
              <Text style={[styles.badgeText, { color: color }]}>
                {category.toUpperCase()}
              </Text>
            </View>

            {/* Right Side: Output Format & Dot Indicator */}
            <View style={styles.rightHeaderGroup}>
              {outputFormat && (
                <Text style={[styles.formatText, { color: '#f80505' }]}>
                  {outputFormat.replace('_', ' ')}
                </Text>
              )}
              <View style={styles.arrowIcon}>
                <View style={[styles.dot, { backgroundColor: '#CBD5E1' }]} />
              </View>
            </View>
          </View>

          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDescription} numberOfLines={2}>
            {content}
          </Text>

          <View style={styles.footer}>
            <View style={styles.actionsRow}>
              {quickActions.slice(0, 3).map((action, index) => (
                <Pressable
                  key={index}
                  // Logic to handle specific button click without triggering card click
                  onPress={(e) => {
                    e.stopPropagation();
                    onActionPress?.(action);
                  }}
                  style={({ pressed }) => [
                    styles.actionBadge,
                    pressed && styles.actionBadgePressed
                  ]}
                >
                  <Text style={styles.actionBadgeText}>{action}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.timeText}>{timeAgo}</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginVertical: 4,
    width: '100%',
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  accentBar: {
    width: 4,
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: "stretch",
    justifyContent: 'space-between',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  arrowIcon: {
    opacity: 0.5,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    flex: 1,
    gap: 6,
  },
  actionBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4, // Slightly taller for better touch target
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionBadgePressed: {
    backgroundColor: '#cfd9e6',
    borderColor: '#7aa0ce',
  },
  actionBadgeText: {
    fontSize: 12,
    color: '#0052c5',
    fontWeight: '700',
  },
  timeText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Pushes items to opposite corners
    alignItems: 'center',
    marginBottom: 6,
  },
  rightHeaderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // Spacing between text and the dot
  },
  formatText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});