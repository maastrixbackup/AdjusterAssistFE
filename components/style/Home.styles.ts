import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  iconWrap: {
    marginBottom: 14,
  },

  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    marginTop: 20,
    width: "100%",
    borderRadius: 999,
    overflow: "hidden",

    // shadow (iOS)
    shadowColor: "#020617",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,

    // shadow (Android)
    elevation: 6,
  },

  primaryGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 999,
  },

  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  fabPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.95,
  },
  centerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },

  centerSubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  centerCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",

    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  // "#0549a1", "#1E63B6"
  primaryActionCard: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1E63B6",
    borderLeftWidth: 4,

    shadowColor: "#0549a1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryActionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  primaryActionIcon: {
    marginRight: 16,
  },
  primaryActionGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionText: {
    flex: 1,
  },
  primaryActionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  primaryActionSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  primaryActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f0fd",
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionsRow: {
    flexDirection: "row",
    marginTop: 20,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2F7",

    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  quickActionGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
  },
  recentClaimsSection: {
    marginTop: 24,
  },
  recentClaimsList: {
  },
  recentClaimCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEF2F7",

    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bottomFill: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    marginTop: -20, // keeps overlap effect with header
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  headerGradient: {
    paddingBottom: 18,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  headerContent: {
    paddingHorizontal: 20,
  },

  headerRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  brandBlock: {
    flex: 1,
    paddingRight: 16,
  },

  logo: {
    width: 160,
    height: 50,
    resizeMode: "contain",
  },

  brandSubtitle: {
    marginTop: 8,
    fontSize: 18,
    color: "#0B2F5B",
    letterSpacing: 0.3,
    fontFamily: "Inter-Regular",
    fontWeight: "bold",
  },

  creditPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  creditText: {
    color: "#F8E7A1",
    fontSize: 12,
    fontWeight: "800",
  },

  heroCard: {
    marginTop: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  heroTextWrap: {
    paddingRight: 10,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  heroSubtitle: {
    marginTop: 8,
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    lineHeight: 20,
  },

  heroBadge: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  heroBadgeText: {
    color: "#0F4C9C",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize",
  },

  statsRow: {
    flexDirection: "row",
    marginTop: 18,
    gap: 12,
  },
  // colors={["#0549a1", "#1E63B6"]}
  statCard: {
    flex: 1,
    backgroundColor: "#0549a1",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  statNumber: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },

  statLabel: {
    marginTop: 4,
    color: "rgba(255,255,255,0.68)",
    fontSize: 11,
    fontWeight: "600",
  },

  contentContainer: {
    flex: 1,
    marginTop: 18,
  },

  sectionHeader: {
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "#494f57",
    letterSpacing: 1.1,
  },

  sectionTitle: {
    marginTop: 2,
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },

  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  sectionActionText: {
    color: "#276bbd",
    fontSize: 12,
    fontWeight: "700",
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },

  contentWrapper: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },

  fileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
  },

  fileCardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.96,
  },

  fileIconWrap: {
    marginRight: 14,
  },

  fileIconGradient: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  fileInfo: {
    flex: 1,
  },

  fileTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  fileName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  clientName: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },

  fileMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  fileSubText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },

  statusBadgeBase: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },

  statusTextBase: {
    fontSize: 10,
    fontWeight: "800",
  },

  statusBadgeActive: {
    backgroundColor: "#DCFCE7",
  },

  statusTextActive: {
    color: "#166534",
  },

  statusBadgeDraft: {
    backgroundColor: "#FEF3C7",
  },

  statusTextDraft: {
    color: "#92400E",
  },

  statusBadgeClosed: {
    backgroundColor: "#E2E8F0",
  },

  statusTextClosed: {
    color: "#475569",
  },

  statusBadgeNeutral: {
    backgroundColor: "#EEF2F7",
  },

  statusTextNeutral: {
    color: "#64748B",
  },

  chevronWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },

  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  loaderCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },

  loaderTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },

  loaderSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },

  emptyState: {
    alignItems: "center",
    marginTop: 55,
    paddingHorizontal: 24,
  },

  emptyIconWrap: {
    width: 110,
    height: 110,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 18,
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "800",
  },

  emptySubtitle: {
    marginTop: 8,
    color: "#64748B",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },

  fab: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    borderRadius: 999,
    shadowColor: "#1D4ED8",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 8,
  },

  // fabPressed: {
  //   transform: [{ scale: 0.98 }],
  // },

  fabGradient: {
    height: 58,
    borderRadius: 999,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  fabText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});