import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
  imageInput?: string;
  documentInput?: string;
  isLoading?: boolean; // ← NEW: triggers skeleton
}

// ─── MUI-style Pulsating Skeleton ────────────────────────────────────────────
function SkeletonLine({
  width = "100%",
  height = 14,
  borderRadius = 8,
  style,
}: {
  width?: string | number;
  height?: number;
  borderRadius?: number;
  style?: any;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: "#CBD5E1",
          opacity,
        },
        style,
      ]}
    />
  );
}

function generateSkeletonWidths(text: string): number[] {
  if (!text) return [100, 90, 75]; // fallback

  // Estimate characters per line (roughly 42 chars per line on mobile)
  const CHARS_PER_LINE = 42;
  const totalChars = text.length;
  const estimatedLines = Math.ceil(totalChars / CHARS_PER_LINE);

  // Cap between 2 and 12 lines
  const lineCount = Math.min(Math.max(estimatedLines, 2), 12);

  // Generate widths: full lines are 100%, last line is shorter
  return Array.from({ length: lineCount }, (_, i) => {
    if (i < lineCount - 1) {
      // Full lines vary slightly: 88–100%
      return 88 + Math.floor((i % 3) * 6); // cycles: 88, 94, 100, 88, 94...
    } else {
      // Last line is always shorter — mimics real text
      const lastLineChars = totalChars % CHARS_PER_LINE || CHARS_PER_LINE / 2;
      return Math.round((lastLineChars / CHARS_PER_LINE) * 100);
    }
  });
}

function CardSkeleton({ color, content }: { color: string, content: string }) {
  const skeletonWidths = generateSkeletonWidths(content);
  return (
    <View style={[skeletonStyles.card]}>
      {/* Accent bar */}
      <View style={[skeletonStyles.accentBar, { backgroundColor: color }]} />

      <View style={skeletonStyles.content}>
        {/* Header row */}
        <View style={skeletonStyles.headerRow}>
          <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
            <Text style={[styles.badgeText, { color: color }]}>
              AI RESPONSE
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refineTrigger}
          >
            <Feather name="sliders" size={12} color="#4056d1" />
            <Text style={styles.refineText}>Refine</Text>
          </TouchableOpacity>
        </View>

        {/* Format badge */}
        <SkeletonLine
          width={100}
          height={12}
          borderRadius={4}
          style={{ marginBottom: 12 }}
        />

        {/* Content lines */}
        {skeletonWidths.map((w, i) => (
          <SkeletonLine
            key={i}
            width={`${w}%`}
            height={14}
            style={{ marginBottom: i === skeletonWidths.length - 1 ? 16 : 8 }}
          />
        ))}

        {/* Footer */}
        <View style={skeletonStyles.footerRow}>
          <View style={skeletonStyles.footerLeft}>
            {/* Static Buttons that match the live UI exactly */}
            {["Copy", "Create Variant", "Mark as used"].map((action, index) => (
              <View
                key={index}
                style={[
                  styles.actionBadge,
                  { opacity: 0.8 }
                ]}
              >
                <Text style={styles.actionBadgeText}>
                  {action}
                </Text>
              </View>
            ))}
          </View>

          {/* Maintain the share icon for layout consistency */}
          <View style={{ opacity: 0.5 }}>
            <Feather name="share-2" size={18} color="#3B82F6" />
          </View>
        </View>
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginVertical: 4,
  },
  accentBar: {
    width: 4,
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
  },
  content: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 18,
    paddingLeft: 18,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: {
    flexDirection: "row",
    gap: 8,
  },
});
// ─────────────────────────────────────────────────────────────────────────────

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
  imageInput,
  documentInput,
  isLoading = false, // ← NEW
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

  const isAI = category.toUpperCase() === "AI RESPONSE";

  // ─── Swap card content with skeleton when loading ────────────────────────
  if (isLoading && isAI) {
    return <CardSkeleton color={color} content={content} />;
  }
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.cardWrapper}
    >
      <Animated.View
        style={[styles.card, { transform: [{ scale: animatedValue }] }]}
      >
        <View
          style={[
            styles.accentBar,
            { backgroundColor: color },
            category.toUpperCase() === "USER INPUT"
              ? { right: 0, width: 6 }
              : { left: 0 },
          ]}
        />

        <View style={styles.contentContainer}>
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
              <Text style={[styles.badgeText, { color: color }]}>
                {category.toUpperCase()}
              </Text>
            </View>

            <View style={styles.rightHeaderGroup}>
              {outputFormat && (
                <Text style={[styles.formatText, { color: "#f80505" }]}>
                  {outputFormat.replace("_", " ")}
                </Text>
              )}

              <View style={styles.arrowIcon}>
                <View style={[styles.dot, { backgroundColor: "#CBD5E1" }]} />
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

          {title && <Text style={styles.cardTitle}>{title}</Text>}

          {(imageInput || documentInput) && (
            <View style={styles.premiumAttachmentSection}>
              {imageInput && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => Linking.openURL(imageInput)}
                  style={styles.premiumImageBadge}
                >
                  <Image
                    source={{ uri: imageInput }}
                    style={styles.imageThumbnail}
                    resizeMode="cover"
                  />
                  <View style={styles.maximizeHint}>
                    <Feather name="maximize-2" size={8} color="#FFF" />
                  </View>
                </TouchableOpacity>
              )}

              {documentInput && (
                <TouchableOpacity
                  style={styles.premiumDocBadge}
                  onPress={() => Linking.openURL(documentInput)}
                >
                  <View style={styles.premiumIconCircle}>
                    <Feather name="file-text" size={13} color="#004B93" />
                  </View>
                  <Text style={styles.premiumDocText} numberOfLines={1}>
                    Evidence File
                  </Text>
                  <Feather name="external-link" size={11} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text
            style={[
              styles.cardDescription,
              {
                fontStyle: isAI ? "italic" : "normal",
                color: "#0a2447",
              },
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
                      pressed && styles.actionBadgePressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionBadgeText,
                        isActuallyUsed && styles.actionBadgeTextUsed,
                      ]}
                    >
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

      {/* Refinement Modal */}
      <Modal
        visible={showRefinements}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRefinements(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowRefinements(false)}
        >
          <View style={styles.sheetContainer}>
            <Animated.View style={styles.refinementSheet}>
              <View style={styles.dragHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.menuTitle}>Refine Response</Text>
                <Text style={styles.menuSubtitle}>
                  Adjust the tone or length of the AI output
                </Text>
              </View>
              <View style={styles.optionsList}>
                {refinementOptions.map((option, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.7}
                    style={[
                      styles.menuItem,
                      idx === refinementOptions.length - 1 && {
                        borderBottomWidth: 0,
                      },
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

      {/* Variant Modal */}
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
              <Text style={styles.menuSubtitle}>
                Select the format for this claim record
              </Text>
            </View>
            <View style={styles.variantGrid}>
              {[
                { id: "file_note", label: "File Note", icon: "file-text" },
                { id: "email", label: "Email", icon: "mail" },
                { id: "xa_note", label: "XA Note", icon: "zap" },
                { id: "attorney", label: "Attorney Response", icon: "shield" },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.variantOption}
                  onPress={() => {
                    onActionPress?.(`Variant: ${item.label}`);
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
  cardWrapper: { marginVertical: 4, width: "100%", paddingHorizontal: 4 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  accentBar: { width: 4, height: "100%", position: "absolute", zIndex: 10 },
  contentContainer: { flex: 1, paddingVertical: 10, paddingHorizontal: 14 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
  },
  badgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  arrowIcon: { opacity: 0.5 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A", marginBottom: 2 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  actionsRow: { flexDirection: "row", flex: 1, gap: 6 },
  actionBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  actionBadgeUsed: { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
  actionBadgeTextUsed: { color: "#166534" },
  actionBadgePressed: { backgroundColor: "#cfd9e6", borderColor: "#7aa0ce" },
  actionBadgeText: { fontSize: 12, color: "#0052c5", fontWeight: "700" },
  timeText: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  rightFooterGroup: { flexDirection: "row", alignItems: "center", gap: 12 },
  shareBtn: { padding: 4, backgroundColor: "#eff6fff3", borderRadius: 8 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  rightHeaderGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  formatText: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  refineTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  refineText: { fontSize: 13, color: "#3048b3", fontWeight: "700" },
  refinementMenu: {
    backgroundColor: "#FFF",
    width: "80%",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  cancelButton: { marginTop: 16, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  cancelButtonText: { fontSize: 15, fontWeight: "700", color: "#94A3B8" },
  sheetContainer: { width: "100%" },
  refinementSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
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
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
  },
  sheetHeader: { marginBottom: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  menuTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 },
  menuSubtitle: { fontSize: 13, color: "#64748B", marginTop: 4, fontWeight: "500" },
  optionsList: {
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuItemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemText: { fontSize: 15, fontWeight: "600", color: "#1E293B" },
  variantSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    width: "100%",
  },
  variantGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  variantOption: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  variantIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  variantLabel: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  premiumAttachmentSection: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 4 },
  premiumImageBadge: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  imageThumbnail: { width: "100%", height: "100%" },
  maximizeHint: {
    position: "absolute",
    bottom: 3,
    right: 3,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 3,
    borderRadius: 6,
  },
  premiumDocBadge: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flex: 1,
    minWidth: 160,
  },
  premiumIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  premiumDocText: { fontSize: 13, fontWeight: "700", color: "#004B93", flex: 1, marginRight: 6 },
  cardDescription: {
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto-Bold",
    fontStyle: "italic",
    color: "#0a2447",
    lineHeight: 20,
    marginBottom: 6,
  },
});