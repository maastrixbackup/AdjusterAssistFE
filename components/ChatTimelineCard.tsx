import { Feather } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ChatTimelineCardProps {
  title: string;
  content: string;
  category: string;
  color: string;
  timeAgo: string;
  quickActions?: string[];
  outputFormat?: string;
  refinementOptions?: string[];
  responseUsed?: boolean;
  onActionPress?: (action: string) => void;
  onRefinementPress?: (option: string) => void;
  onSharePress?: () => void;
}

export const ChatTimelineCard = ({
  title,
  content,
  category,
  outputFormat,
  color,
  timeAgo,
  quickActions = [],
  refinementOptions = [],
  responseUsed,
  onActionPress,
  onRefinementPress,
  onSharePress,
}: ChatTimelineCardProps) => {

  const [showRefinements, setShowRefinements] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);

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

  const isAI = category.toUpperCase() === 'AI RESPONSE';

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
        <View style={[
          styles.accentBar,
          { backgroundColor: color },
          category.toUpperCase() === 'USER INPUT' ? { right: 0, width: 6 } : { left: 0 }
        ]} />

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

              {isAI && refinementOptions.length > 0 && (
                <TouchableOpacity
                  onPress={() => setShowRefinements(true)}
                  style={styles.refineTrigger}
                >
                  <Feather name="sliders" size={12} color="#4056d1" />
                  <Text style={styles.refineText}>Refine</Text>
                </TouchableOpacity>
              )}


            </View>
          </View>

          {title && (
            <Text style={styles.cardTitle}>{title}</Text>
          )}

          <Text
            style={[
              styles.cardDescription,
              {
                fontStyle: isAI ? 'italic' : 'normal',
                color: '#0a2447'
              }
            ]}
          >
            {content}
          </Text>

          <View style={styles.footer}>
            <View style={styles.actionsRow}>
              {quickActions.slice(0, 3).map((action, index) => {
                const isMarkUsedAction = action === "Mark as used";
                const isActuallyUsed = isMarkUsedAction && responseUsed;
                return (
                  <Pressable
                    key={index}
                    onPress={(e) => {
                      e.stopPropagation();
                      if (action === "Create Variant") {
                        setShowVariantModal(true);
                      } else {
                        onActionPress?.(action);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.actionBadge,
                      isActuallyUsed && styles.actionBadgeUsed,
                      pressed && styles.actionBadgePressed
                    ]}
                  >
                    <Text style={[
                      styles.actionBadgeText,
                      // Apply white or darker green text if used
                      isActuallyUsed && styles.actionBadgeTextUsed
                    ]}>
                      {isActuallyUsed ? "Used" : action}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.rightFooterGroup}>
              {isAI && (
                <TouchableOpacity
                  onPress={onSharePress}
                  style={styles.shareBtn}
                  activeOpacity={0.6}
                >
                  <Feather name="share-2" size={18} color="#3B82F6" />
                </TouchableOpacity>
              )}
              <Text style={styles.timeText}>{timeAgo}</Text>
            </View>

          </View>
        </View>
      </Animated.View>

      {/* Refinement modal  */}
      <Modal
        visible={showRefinements}
        transparent
        animationType="slide" // Slide feels more organic for bottom sheets
        onRequestClose={() => setShowRefinements(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowRefinements(false)}>
          {/* Inner container to keep the sheet at the bottom */}
          <View style={styles.sheetContainer}>
            <Animated.View style={styles.refinementSheet}>
              {/* Modern "Grabber" handle */}
              <View style={styles.dragHandle} />

              <View style={styles.sheetHeader}>
                <Text style={styles.menuTitle}>Refine Response</Text>
                <Text style={styles.menuSubtitle}>Adjust the tone or length of the AI output</Text>
              </View>

              <View style={styles.optionsList}>
                {refinementOptions.map((option, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.7}
                    style={[
                      styles.menuItem,
                      idx === refinementOptions.length - 1 && { borderBottomWidth: 0 }
                    ]}
                    onPress={() => {
                      onRefinementPress?.(option);
                      setShowRefinements(false);
                    }}
                  >
                    <View style={styles.menuItemLeft}>
                      <View style={styles.iconCircle}>
                        <Feather name="zap" size={14} color="#4F46E5" />
                      </View>
                      <Text style={styles.menuItemText}>{option}</Text>
                    </View>
                    <Feather name="arrow-right" size={16} color="#CBD5E1" />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Cancel Button - Optional but good for UX */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowRefinements(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Pressable>
      </Modal>
      <Modal
        visible={showVariantModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVariantModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowVariantModal(false)}
        >
          <Animated.View style={styles.variantSheet}>
            <View style={styles.dragHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.menuTitle}>Create Variant</Text>
              <Text style={styles.menuSubtitle}>Select the format for this claim record</Text>
            </View>

            <View style={styles.variantGrid}>
              {[
                { id: 'file_note', label: 'File Note', icon: 'file-text' },
                { id: 'email', label: 'Email', icon: 'mail' },
                { id: 'xa_note', label: 'XA Note', icon: 'zap' },
                { id: 'attorney', label: 'Attorney Response', icon: 'shield' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.variantOption}
                  onPress={() => {
                    console.log("Selected Variant:", item.id);
                    onActionPress?.(`Variant: ${item.label}`); // Pass back to parent
                    setShowVariantModal(false);
                  }}
                >
                  <View style={styles.variantIconCircle}>
                    <Feather name={item.icon as any} size={22} color="#3B82F6" />
                  </View>
                  <Text style={styles.variantLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
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
    position: 'absolute',
    zIndex: 10,
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
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontStyle: 'italic',
    color: '#0a2447',
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
  actionBadgeUsed: {
    backgroundColor: '#DCFCE7', // Light green background
    borderColor: '#86EFAC',     // Soft green border
  },
  actionBadgeTextUsed: {
    color: '#166534', // Deep green text
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
  rightFooterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareBtn: {
    padding: 4,
    backgroundColor: '#eff6fff3',
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rightHeaderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // Spacing between text and the dot
  },
  formatText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  refineTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  refineText: { fontSize: 13, color: '#3048b3', fontWeight: '700' },

  // modalOverlay: {
  //   flex: 1,
  //   backgroundColor: 'rgba(15, 23, 42, 0.4)',
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   padding: 20
  // },
  refinementMenu: {
    backgroundColor: '#FFF',
    width: '80%',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10
  },
  // menuTitle: {
  //   fontSize: 14,
  //   fontWeight: '800',
  //   color: '#64748B',
  //   marginBottom: 12,
  //   textTransform: 'uppercase',
  //   textAlign: 'center'
  // },
  // menuItem: {
  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   alignItems: 'center',
  //   paddingVertical: 12,
  //   borderBottomWidth: 1,
  //   borderBottomColor: '#F1F5F9'
  // },
  // menuItemText: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  // cancelButton: {
  //   marginTop: 16,
  //   paddingVertical: 16,
  //   alignItems: 'center',
  //   justifyContent: 'center',
  // },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94A3B8',
  },
  sheetContainer: {
    width: '100%',
  },
  refinementSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24, // Account for safe areas
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -20 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 25,
  },
  dragHandle: {
    width: 38,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  sheetHeader: {
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // Deeper, more sophisticated slate blue alpha
    justifyContent: 'flex-end', // Aligns to bottom
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  optionsList: {
    backgroundColor: '#F8FAFC', // Subtle contrast background
    borderRadius: 20,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  variantSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    width: '100%',
  },
  variantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  variantOption: {
    width: '48%', // Creates a 2x2 grid
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  variantIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  variantLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
});