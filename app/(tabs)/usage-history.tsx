import { getCreditUsageHistory } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterType = "24h" | "week" | "month" | "year" | "all";

type TransactionItem = {
  id: string;
  title: string;
  rawActionType?: string | null;
  workspace: string;
  cost: string;
  credits?: number;
  timestamp: string;
};

type ApiMeta = {
  range?: FilterType;
  runInPeriod?: number;
  remaining?: number;
  currentUsage?: number;
  totalQuota?: number;
  nextRenewal?: string | null;
  planStatus?: string;
  planType?: string | null;
  page?: number;
  limit?: number;
  totalRecords?: number;
  hasMore?: boolean;
};

type UsageHistoryResponse = {
  success: boolean;
  message?: string;
  meta?: ApiMeta;
  transactions?: TransactionItem[];
};

const FILTERS: { key: FilterType; label: string; shortLabel: string }[] = [
  { key: "24h", label: "24 Hours", shortLabel: "24h" },
  { key: "week", label: "Week", shortLabel: "Week" },
  { key: "month", label: "Month", shortLabel: "Month" },
  { key: "year", label: "Year", shortLabel: "Year" },
  { key: "all", label: "All Time", shortLabel: "All" },
];

const DEFAULT_TOTAL_QUOTA = 10000;
const PAGE_LIMIT = 30;

function formatNumber(value?: number) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0";
  return number.toLocaleString("en-US");
}

function parseCreditCost(cost?: string) {
  const numeric = Number(String(cost || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? Math.abs(numeric) : 0;
}

function formatLogDate(isoString?: string) {
  if (!isoString) return "--";

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "--";

  const dateLabel = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const timeLabel = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${dateLabel} • ${timeLabel}`;
}

function formatRenewalDate(isoString?: string | null) {
  if (!isoString) return "Not available";

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPeriodLabel(filter: FilterType) {
  switch (filter) {
    case "24h":
      return "last 24 hours";
    case "week":
      return "this week";
    case "month":
      return "this month";
    case "year":
      return "this year";
    default:
      return "all time";
  }
}

function normalizePlanStatus(status?: string) {
  return String(status || "active").toLowerCase();
}

function getPlanBadge(status?: string) {
  const normalized = normalizePlanStatus(status);

  if (normalized === "active") {
    return {
      label: "Active Plan",
      icon: "checkmark-circle" as const,
      color: "#16A34A",
      bg: "#DCFCE7",
      border: "rgba(22,163,74,0.14)",
    };
  }

  if (normalized === "trialing" || normalized === "trial") {
    return {
      label: "Trial Plan",
      icon: "sparkles" as const,
      color: "#2563EB",
      bg: "#DBEAFE",
      border: "rgba(37,99,235,0.14)",
    };
  }

  return {
    label: "Action Required",
    icon: "alert-circle" as const,
    color: "#EF4444",
    bg: "#FEE2E2",
    border: "rgba(239,68,68,0.14)",
  };
}

function getIconConfig(title?: string, rawActionType?: string | null) {
  const normalized = `${title || ""} ${rawActionType || ""}`.toLowerCase();

  if (normalized.includes("voice") || normalized.includes("transcription")) {
    return { name: "mic", color: "#2563EB", bg: "#EFF6FF" };
  }

  if (
    normalized.includes("pdf") ||
    normalized.includes("report") ||
    normalized.includes("refined") ||
    normalized.includes("draft") ||
    normalized.includes("file")
  ) {
    return { name: "file-text", color: "#EA580C", bg: "#FFF7ED" };
  }

  if (normalized.includes("variant") || normalized.includes("alternative")) {
    return { name: "layers", color: "#8B5CF6", bg: "#F5F3FF" };
  }

  if (normalized.includes("email") || normalized.includes("response")) {
    return { name: "mail", color: "#0D9488", bg: "#F0FDFA" };
  }

  if (normalized.includes("image") || normalized.includes("photo")) {
    return { name: "image", color: "#0284C7", bg: "#F0F9FF" };
  }

  return { name: "cpu", color: "#0D9488", bg: "#F0FDFA" };
}

export default function UsageHistoryScreen() {
  const { height, width } = useWindowDimensions();
  const { token } = useAuth();

  const mountedRef = useRef(true);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  const [runInPeriod, setRunInPeriod] = useState(0);
  const [remainingCredits, setRemainingCredits] = useState(0);
  const [currentUsage, setCurrentUsage] = useState(0);
  const [renewalDate, setRenewalDate] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState("active");
  const [planType, setPlanType] = useState<string | null>(null);
  const [totalQuota, setTotalQuota] = useState(DEFAULT_TOTAL_QUOTA);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  const [errorMessage, setErrorMessage] = useState("");

  const isCompact = width < 380;
  const isSmallHeight = height < 720;

  const planBadge = useMemo(() => getPlanBadge(planStatus), [planStatus]);

  const progressPercent = useMemo(() => {
    if (!totalQuota || totalQuota <= 0) return 0;
    return Math.min(100, Math.max(0, (remainingCredits / totalQuota) * 100));
  }, [remainingCredits, totalQuota]);

  const visibleSpent = useMemo(() => {
    return transactions.reduce((sum, item) => {
      const credits =
        typeof item.credits === "number"
          ? Math.abs(item.credits)
          : parseCreditCost(item.cost);

      return sum + credits;
    }, 0);
  }, [transactions]);

  const usagePercent = useMemo(() => {
    if (!totalQuota || totalQuota <= 0) return 0;
    return Math.min(100, Math.max(0, (currentUsage / totalQuota) * 100));
  }, [currentUsage, totalQuota]);

  const fetchUsageData = useCallback(
    async ({
      nextPage = 1,
      mode = "initial",
    }: {
      nextPage?: number;
      mode?: "initial" | "filter" | "refresh" | "loadMore";
    } = {}) => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setErrorMessage("");

        if (mode === "loadMore") {
          setLoadingMore(true);
        } else if (mode === "refresh") {
          setRefreshing(true);
        } else if (mode === "filter") {
          setFilterLoading(true);
        } else {
          setLoading(true);
        }

        /**
         * Recommended API signature:
         * getCreditUsageHistory(token, range, page, limit)
         *
         * It should call:
         * /usage/history?range=month&page=1&limit=30
         */
        const response = (await getCreditUsageHistory(
          token,
          activeFilter,
          nextPage,
          PAGE_LIMIT,
        )) as UsageHistoryResponse;

        if (!mountedRef.current) return;

        if (!response.success) {
          throw new Error(response.message || "Unable to load usage history.");
        }

        const meta = response.meta || {};
        const nextTransactions = response.transactions || [];

        setTransactions((prev) =>
          mode === "loadMore"
            ? [...prev, ...nextTransactions]
            : nextTransactions,
        );

        setRunInPeriod(Number(meta.runInPeriod || 0));
        setRemainingCredits(Number(meta.remaining || 0));
        setCurrentUsage(Number(meta.currentUsage || 0));
        setRenewalDate(meta.nextRenewal || null);
        setPlanStatus(meta.planStatus || "active");
        setPlanType(meta.planType || null);
        setTotalQuota(Number(meta.totalQuota || DEFAULT_TOTAL_QUOTA));
        setPage(Number(meta.page || nextPage));
        setHasMore(Boolean(meta.hasMore));
        setTotalRecords(Number(meta.totalRecords || nextTransactions.length));
      } catch (error: any) {
        console.error("Failed syncing usage history:", error);

        if (mountedRef.current) {
          setErrorMessage(
            error?.message ||
              "Something went wrong while loading usage history.",
          );
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setFilterLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [token, activeFilter],
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setPage(1);
    setHasMore(false);
    fetchUsageData({ nextPage: 1, mode: "filter" });
  }, [activeFilter, fetchUsageData]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: progressPercent,
        duration: 650,
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [progressPercent, progressAnim, fadeAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const handleFilterSelection = (filter: FilterType) => {
    if (filter === activeFilter || filterLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fadeAnim.setValue(0.75);
    setActiveFilter(filter);
  };

  const handleRefresh = () => {
    if (refreshing || loadingMore) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchUsageData({ nextPage: 1, mode: "refresh" });
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || loading || refreshing || filterLoading) return;

    fetchUsageData({ nextPage: page + 1, mode: "loadMore" });
  };

  const renderLogItem = ({ item }: { item: TransactionItem }) => {
    const iconConfig = getIconConfig(item.title, item.rawActionType);
    const credits =
      typeof item.credits === "number"
        ? Math.abs(item.credits)
        : parseCreditCost(item.cost);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.logCard,
          pressed && styles.logCardPressed,
        ]}
      >
        <View style={styles.logLeft}>
          <View style={[styles.logIconBox, { backgroundColor: iconConfig.bg }]}>
            <Feather
              name={iconConfig.name as any}
              size={16}
              color={iconConfig.color}
            />
          </View>

          <View style={styles.logContent}>
            <Text style={styles.logAction} numberOfLines={1}>
              {item.title || "Usage Activity"}
            </Text>

            <View style={styles.metaRow}>
              <Feather name="briefcase" size={10} color="#94A3B8" />

              <Text style={styles.workspaceText} numberOfLines={1}>
                {item.workspace || "Workspace"}
              </Text>

              <Text style={styles.bulletDivider}>•</Text>

              <Text style={styles.logDate} numberOfLines={1}>
                {formatLogDate(item.timestamp)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.creditBadge}>
          <Text style={styles.logCredits}>-{formatNumber(credits)} cr</Text>
        </View>
      </Pressable>
    );
  };

  const renderHeaderBlock = () => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <View style={styles.summaryTitleBlock}>
            <Text style={styles.summaryEyebrow}>Credit overview</Text>

            <View style={styles.balanceRow}>
              <Text style={styles.summaryTitle}>
                {formatNumber(remainingCredits)}
              </Text>
              <Text style={styles.summaryTitleSuffix}>left</Text>
            </View>

            <Text style={styles.planLine}>
              {planType ? `${planType} plan` : "Subscription plan"} •{" "}
              {Math.round(progressPercent)}% remaining
            </Text>
          </View>

          <View
            style={[
              styles.badgeContainer,
              {
                backgroundColor: planBadge.bg,
                borderColor: planBadge.border,
              },
            ]}
          >
            <Ionicons
              name={planBadge.icon}
              size={13}
              color={planBadge.color}
            />
            <Text style={[styles.badgeText, { color: planBadge.color }]}>
              {planBadge.label}
            </Text>
          </View>
        </View>

        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>Credit balance</Text>
          <Text style={styles.progressSubText}>
            {formatNumber(remainingCredits)} / {formatNumber(totalQuota)}
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>

        <View style={styles.metricsGrid}>
          <MetricTile
            label="RUNS"
            value={formatNumber(runInPeriod)}
            hint={getPeriodLabel(activeFilter)}
          />

          <View style={styles.divider} />

          <MetricTile
            label="USED"
            value={formatNumber(currentUsage)}
            hint={`${Math.round(usagePercent)}% quota`}
          />

          <View style={styles.divider} />

          <MetricTile
            label="VISIBLE"
            value={formatNumber(visibleSpent)}
            hint="loaded logs"
          />
        </View>

        <View style={styles.renewalRow}>
          <View style={styles.renewalItem}>
            <View style={styles.renewalIcon}>
              <Feather name="calendar" size={13} color="#1E40AF" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.renewalLabel}>Next renewal</Text>
              <Text style={styles.renewalValue}>
                {formatRenewalDate(renewalDate)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.filterBlock}>
        <View style={styles.filterHeaderRow}>
          <View>
            <Text style={styles.filterTitle}>Timeline</Text>
            <Text style={styles.filterSubtitle}>
              Showing {getPeriodLabel(activeFilter)}
            </Text>
          </View>

          {filterLoading ? (
            <ActivityIndicator size="small" color="#1E40AF" />
          ) : (
            <Text style={styles.filterCount}>
              {formatNumber(totalRecords)} logs
            </Text>
          )}
        </View>

        <View style={styles.filterGrid}>
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter.key;

            return (
              <Pressable
                key={filter.key}
                disabled={filterLoading}
                onPress={() => handleFilterSelection(filter.key)}
                style={({ pressed }) => [
                  styles.filterTab,
                  isActive && styles.filterTabActive,
                  pressed && styles.filterTabPressed,
                  filterLoading && !isActive && styles.filterTabDisabled,
                ]}
              >
                {isActive ? (
                  <LinearGradient
                    colors={["#004AC0", "#1E40AF", "#2563EB"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.filterActiveGradient}
                  >
                    <Text style={styles.filterTabTextActive}>
                      {isCompact ? filter.shortLabel : filter.label}
                    </Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.filterTabText}>
                    {isCompact ? filter.shortLabel : filter.label}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Transaction Stream</Text>
          <Text style={styles.sectionSubtitle}>
            {transactions.length} of {formatNumber(totalRecords)} record
            {totalRecords === 1 ? "" : "s"} loaded
          </Text>
        </View>

        {filterLoading && transactions.length > 0 ? (
          <ActivityIndicator size="small" color="#1E40AF" />
        ) : null}
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Feather name="alert-triangle" size={17} color="#B91C1C" />

          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>Could not sync usage</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>

          <Pressable
            onPress={() => fetchUsageData({ nextPage: 1, mode: "refresh" })}
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && styles.retryBtnPressed,
            ]}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
    </Animated.View>
  );

  const renderEmptyState = () => {
    if (loading || filterLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Feather name="inbox" size={30} color="#94A3B8" />
        </View>

        <Text style={styles.emptyTitle}>No usage found</Text>

        <Text style={styles.emptyText}>
          No resource logs match {getPeriodLabel(activeFilter)}. Try another
          timeline filter.
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#1E40AF" />
          <Text style={styles.footerLoaderText}>Loading more activity...</Text>
        </View>
      );
    }

    if (!hasMore && transactions.length > 0) {
      return (
        <View style={styles.endCapsule}>
          <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
          <Text style={styles.endCapsuleText}>You are all caught up</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View
        style={[
          styles.arcHeader,
          {
            height: Math.max(isSmallHeight ? 205 : 225, height * 0.28),
          },
        ]}
      >
        <LinearGradient
          colors={["#004AC0", "#002657"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View
          style={[
            styles.bubble,
            {
              top: -28,
              right: -46,
              width: 210,
              height: 210,
            },
          ]}
        />

        <View
          style={[
            styles.bubble,
            {
              bottom: -64,
              left: -34,
              width: 150,
              height: 150,
            },
          ]}
        />

        <SafeAreaView
          edges={["top", "left", "right"]}
          style={styles.headerContent}
        >
          <View style={styles.topActionRow}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.headerButtonPressed,
              ]}
              hitSlop={12}
            >
              <Feather name="arrow-left" size={22} color="#FFFFFF" />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={styles.arcTitle}>Usage History</Text>
              <Text style={styles.arcTinySub}>Credits & activity ledger</Text>
            </View>

            <Pressable
              onPress={handleRefresh}
              disabled={refreshing || loading || filterLoading}
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.headerButtonPressed,
                (refreshing || loading || filterLoading) &&
                  styles.headerButtonDisabled,
              ]}
              hitSlop={12}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="refresh-cw" size={18} color="#FFFFFF" />
              )}
            </Pressable>
          </View>

          <Text style={styles.arcSub}>
            Track resource runs, credit consumption, and billing activity
          </Text>
        </SafeAreaView>
      </View>

      <View style={[styles.body, { marginTop: -54 }]}>
        {loading && transactions.length === 0 ? (
          <View style={styles.initialLoaderCard}>
            <ActivityIndicator size="large" color="#1E40AF" />
            <Text style={styles.initialLoaderText}>
              Loading usage history...
            </Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item, index) => String(item.id || index)}
            renderItem={renderLogItem}
            ListHeaderComponent={renderHeaderBlock}
            ListEmptyComponent={renderEmptyState}
            ListFooterComponent={renderFooter}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.35}
            removeClippedSubviews={Platform.OS === "android"}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={8}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#1E40AF"
                colors={["#1E40AF"]}
              />
            }
          />
        )}
      </View>
    </View>
  );
}

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.summaryHint} numberOfLines={1}>
        {hint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  arcHeader: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: "hidden",
    minHeight: 190,
  },
  bubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.065)",
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 16 : 0,
  },
  topActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
  },
  headerButtonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.82,
  },
  headerButtonDisabled: {
    opacity: 0.72,
  },
  headerCenter: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 12,
  },
  arcTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.45,
  },
  arcTinySub: {
    marginTop: 2,
    fontSize: 11,
    color: "rgba(255,255,255,0.58)",
    fontWeight: "700",
  },
  arcSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.68)",
    textAlign: "center",
    marginTop: 14,
    paddingHorizontal: 22,
    lineHeight: 19,
    fontWeight: "500",
  },

  body: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listContainer: {
    paddingBottom: 36,
  },

  initialLoaderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  initialLoaderText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "800",
    color: "#64748B",
  },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.075,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  summaryTitleBlock: {
    flex: 1,
  },
  summaryEyebrow: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  summaryTitle: {
    color: "#0F172A",
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: -0.9,
  },
  summaryTitleSuffix: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 5,
  },
  planLine: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },

  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "900",
  },
  progressSubText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "800",
  },
  progressContainer: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 99,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#1E40AF",
    borderRadius: 99,
  },

  metricsGrid: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginTop: 18,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  summaryLabel: {
    color: "#94A3B8",
    fontSize: 10,
    marginBottom: 6,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  summaryValue: {
    color: "#0F172A",
    fontSize: 19,
    fontWeight: "900",
    maxWidth: "100%",
  },
  summaryHint: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 4,
    fontWeight: "800",
    maxWidth: "100%",
  },
  divider: {
    width: 1,
    backgroundColor: "#E2E8F0",
  },

  renewalRow: {
    marginTop: 14,
  },
  renewalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  renewalIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  renewalLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "800",
    marginBottom: 2,
  },
  renewalValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#334155",
  },

  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 99,
    gap: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "900",
  },

  filterBlock: {
    marginBottom: 18,
  },
  filterHeaderRow: {
    marginBottom: 10,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F172A",
  },
  filterSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  filterCount: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "900",
  },
  filterGrid: {
    flexDirection: "row",
    gap: 8,
  },
  filterTab: {
    flex: 1,
    minHeight: 38,
    borderRadius: 99,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterTabPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.88,
  },
  filterTabDisabled: {
    opacity: 0.68,
  },
  filterTabActive: {
    backgroundColor: "#1E40AF",
    borderColor: "#1D4ED8",
    shadowColor: "#1E40AF",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  filterActiveGradient: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 99,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#475569",
  },
  filterTabTextActive: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#94A3B8",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },

  errorBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 13,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#991B1B",
    marginBottom: 2,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B91C1C",
    lineHeight: 17,
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  retryBtnPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.88,
  },
  retryText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#B91C1C",
  },

  logCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.035,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  logCardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.92,
  },
  logLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  logIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  logContent: {
    flex: 1,
  },
  logAction: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  workspaceText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    maxWidth: 112,
  },
  bulletDivider: {
    fontSize: 11,
    color: "#94A3B8",
  },
  logDate: {
    fontSize: 11,
    color: "#64748B",
    flexShrink: 1,
    fontWeight: "600",
  },
  creditBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  logCredits: {
    fontSize: 13,
    fontWeight: "900",
    color: "#EF4444",
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 44,
    paddingHorizontal: 30,
  },
  emptyIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 6,
  },
  emptyText: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },

  footerLoader: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
  },
  endCapsule: {
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
  },
  endCapsuleText: {
    fontSize: 12,
    color: "#15803D",
    fontWeight: "900",
  },
});