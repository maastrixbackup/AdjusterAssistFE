import { getCreditUsageHistory } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Constants ────────────────────────────────────────────────────────────────
const FILTERS: { key: FilterType; label: string; shortLabel: string }[] = [
  { key: "24h", label: "24 Hours", shortLabel: "24h" },
  { key: "week", label: "Week", shortLabel: "Week" },
  { key: "month", label: "Month", shortLabel: "Month" },
  { key: "year", label: "Year", shortLabel: "Year" },
  { key: "all", label: "All Time", shortLabel: "All" },
];

const DEFAULT_TOTAL_QUOTA = 10000;
const PAGE_LIMIT = 30;
const HEADER_OVERLAP = 40; // How much the card overlaps the gradient header

// ─── Pure helpers ─────────────────────────────────────────────────────────────
const formatNumber = (value?: number) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toLocaleString("en-US") : "0";
};

const parseCreditCost = (cost?: string) => {
  const n = Number(String(cost ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.abs(n) : 0;
};

const formatLogDate = (iso?: string) => {
  if (!iso) return "--";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "--";
  return `${d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} • ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
};

const formatRenewalDate = (iso?: string | null) => {
  if (!iso) return "Not available";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "Not available"
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

const getPeriodLabel = (f: FilterType) =>
  ({
    "24h": "last 24 hours",
    week: "this week",
    month: "this month",
    year: "this year",
    all: "all time",
  })[f];

const getPlanBadge = (status?: string) => {
  const s = String(status ?? "active").toLowerCase();
  if (s === "active")
    return {
      label: "Active Plan",
      icon: "checkmark-circle" as const,
      color: "#16A34A",
      bg: "#DCFCE7",
      border: "rgba(22,163,74,0.18)",
    };
  if (s === "trialing" || s === "trial")
    return {
      label: "Trial Plan",
      icon: "sparkles" as const,
      color: "#2563EB",
      bg: "#DBEAFE",
      border: "rgba(37,99,235,0.18)",
    };
  return {
    label: "Action Required",
    icon: "alert-circle" as const,
    color: "#EF4444",
    bg: "#FEE2E2",
    border: "rgba(239,68,68,0.18)",
  };
};

const getIconConfig = (title?: string, rawActionType?: string | null) => {
  const n = `${title ?? ""} ${rawActionType ?? ""}`.toLowerCase();
  if (n.includes("voice") || n.includes("transcription"))
    return { name: "mic", color: "#2563EB", bg: "#EFF6FF" };
  if (
    n.includes("pdf") ||
    n.includes("report") ||
    n.includes("refined") ||
    n.includes("draft") ||
    n.includes("file")
  )
    return { name: "file-text", color: "#EA580C", bg: "#FFF7ED" };
  if (n.includes("variant") || n.includes("alternative"))
    return { name: "layers", color: "#8B5CF6", bg: "#F5F3FF" };
  if (n.includes("email") || n.includes("response"))
    return { name: "mail", color: "#0D9488", bg: "#F0FDFA" };
  if (n.includes("image") || n.includes("photo"))
    return { name: "image", color: "#0284C7", bg: "#F0F9FF" };
  return { name: "cpu", color: "#0D9488", bg: "#F0FDFA" };
};

// ─── Memoized sub-components ──────────────────────────────────────────────────
const MetricTile = memo(
  ({ label, value, hint }: { label: string; value: string; hint: string }) => (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.summaryHint} numberOfLines={1}>
        {hint}
      </Text>
    </View>
  )
);

MetricTile.displayName = "MetricTile";

const LogCard = memo(({ item }: { item: TransactionItem }) => {
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
});

LogCard.displayName="LogCard"

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function UsageHistoryScreen() {
  const { height, width } = useWindowDimensions();
  const { token } = useAuth();

  const mountedRef = useRef(true);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const prevProgressRef = useRef(-1);

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
  const headerHeight = Math.max(isSmallHeight ? 120 : 150, height * 0.15);

  // ── Derived values ──────────────────────────────────────────────────────────
  const planBadge = useMemo(() => getPlanBadge(planStatus), [planStatus]);

  const progressPercent = useMemo(() => {
    if (!totalQuota || totalQuota <= 0) return 0;
    return Math.min(100, Math.max(0, (remainingCredits / totalQuota) * 100));
  }, [remainingCredits, totalQuota]);

  const visibleSpent = useMemo(
    () =>
      transactions.reduce((sum, item) => {
        const c =
          typeof item.credits === "number"
            ? Math.abs(item.credits)
            : parseCreditCost(item.cost);
        return sum + c;
      }, 0),
    [transactions]
  );

  const usagePercent = useMemo(() => {
    if (!totalQuota || totalQuota <= 0) return 0;
    return Math.min(100, Math.max(0, (currentUsage / totalQuota) * 100));
  }, [currentUsage, totalQuota]);

  // ── Animate progress bar only when value changes ────────────────────────────
  useEffect(() => {
    if (prevProgressRef.current === progressPercent) return;
    prevProgressRef.current = progressPercent;
    Animated.timing(progressAnim, {
      toValue: progressPercent,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [progressAnim, progressPercent]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── Fetch — filter passed explicitly, no closure dependency ────────────────
  const fetchUsageData = useCallback(
    async ({
      filter,
      nextPage = 1,
      mode = "initial",
    }: {
      filter: FilterType;
      nextPage?: number;
      mode?: "initial" | "filter" | "refresh" | "loadMore";
    }) => {
      if (!token) {
        setLoading(false);
        return;
      }

      setErrorMessage("");

      if (mode === "loadMore") setLoadingMore(true);
      else if (mode === "refresh") setRefreshing(true);
      else if (mode === "filter") setFilterLoading(true);
      else setLoading(true);

      try {
        const response = (await getCreditUsageHistory(
          token,
          filter,
          nextPage,
          PAGE_LIMIT
        )) as UsageHistoryResponse;

        if (!mountedRef.current) return;
        if (!response.success)
          throw new Error(response.message ?? "Unable to load usage history.");

        const meta = response.meta ?? {};
        const incoming = response.transactions ?? [];

        setTransactions((prev) =>
          mode === "loadMore" ? [...prev, ...incoming] : incoming
        );
        setRunInPeriod(Number(meta.runInPeriod ?? 0));
        setRemainingCredits(Number(meta.remaining ?? 0));
        setCurrentUsage(Number(meta.currentUsage ?? 0));
        setRenewalDate(meta.nextRenewal ?? null);
        setPlanStatus(meta.planStatus ?? "active");
        setPlanType(meta.planType ?? null);
        setTotalQuota(Number(meta.totalQuota ?? DEFAULT_TOTAL_QUOTA));
        setPage(Number(meta.page ?? nextPage));
        setHasMore(Boolean(meta.hasMore));
        setTotalRecords(Number(meta.totalRecords ?? incoming.length));
      } catch (err: any) {
        console.error("[UsageHistory] fetch error:", err);
        if (mountedRef.current)
          setErrorMessage(err?.message ?? "Something went wrong.");
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setFilterLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [token]
  );

  // ── Initial load (once) ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchUsageData({ filter: "all", nextPage: 1, mode: "initial" });
  }, [fetchUsageData]);

  // ── Filter tap — controlled fade + single fetch ─────────────────────────────
  const handleFilterSelection = useCallback(
    (filter: FilterType) => {
      if (filter === activeFilter || filterLoading) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveFilter(filter);
      setPage(1);
      setHasMore(false);
      setTransactions([]); // clear immediately for snappy feel
      fetchUsageData({ filter, nextPage: 1, mode: "filter" });
    },
    [activeFilter, filterLoading, fetchUsageData]
  );

  const handleRefresh = useCallback(() => {
    if (refreshing || loadingMore) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchUsageData({ filter: activeFilter, nextPage: 1, mode: "refresh" });
  }, [refreshing, loadingMore, fetchUsageData, activeFilter]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading || refreshing || filterLoading)
      return;
    fetchUsageData({
      filter: activeFilter,
      nextPage: page + 1,
      mode: "loadMore",
    });
  }, [
    hasMore,
    loadingMore,
    loading,
    refreshing,
    filterLoading,
    fetchUsageData,
    activeFilter,
    page,
  ]);

  // ── Stable renderItem ───────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: TransactionItem }) => <LogCard item={item} />,
    []
  );

  // ── Stable ListHeaderComponent ──────────────────────────────────────────────
  // Using a stable component reference avoids FlatList unmounting/remounting header
  const HeaderComponent = useMemo(
    () => (
      <View>
        {/* Summary Card */}
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

          {/* Progress bar */}
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>Credit balance</Text>
            <Text style={styles.progressSubText}>
              {formatNumber(remainingCredits)} / {formatNumber(totalQuota)}
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <Animated.View
              style={[styles.progressBar, { width: progressWidth }]}
            />
          </View>

          {/* Metrics row */}
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

          {/* Renewal */}
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

        {/* Filter Block */}
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
            {FILTERS.map((f) => {
              const isActive = activeFilter === f.key;
              return (
                <Pressable
                  key={f.key}
                  disabled={filterLoading}
                  onPress={() => handleFilterSelection(f.key)}
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
                        {isCompact ? f.shortLabel : f.label}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.filterTabText}>
                      {isCompact ? f.shortLabel : f.label}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Section header */}
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

        {/* Error */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Feather name="alert-triangle" size={17} color="#B91C1C" />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Could not sync usage</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
            <Pressable
              onPress={() =>
                fetchUsageData({
                  filter: activeFilter,
                  nextPage: 1,
                  mode: "refresh",
                })
              }
              style={({ pressed }) => [
                styles.retryBtn,
                pressed && styles.retryBtnPressed,
              ]}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Filter loading skeleton rows */}
        {filterLoading && transactions.length === 0 ? (
          <View style={styles.filterSkeletonWrap}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonCard}>
                <View style={styles.skeletonIcon} />
                <View style={styles.skeletonLines}>
                  <View style={[styles.skeletonLine, { width: "60%" }]} />
                  <View
                    style={[
                      styles.skeletonLine,
                      { width: "40%", marginTop: 6 },
                    ]}
                  />
                </View>
                <View style={styles.skeletonBadge} />
              </View>
            ))}
          </View>
        ) : null}
      </View>
    ),
    [
      remainingCredits, planType, progressPercent, planBadge, totalQuota,
      progressWidth, runInPeriod, currentUsage, usagePercent, visibleSpent,
      renewalDate, activeFilter, filterLoading, totalRecords,
      transactions.length, errorMessage, handleFilterSelection,
      fetchUsageData, isCompact,
    ]
  );

  const ListEmpty = useMemo(() => {
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
  }, [loading, filterLoading, activeFilter]);

  const ListFooter = useMemo(() => {
    if (loadingMore)
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#1E40AF" />
          <Text style={styles.footerLoaderText}>Loading more activity...</Text>
        </View>
      );
    if (!hasMore && transactions.length > 0)
      return (
        <View style={styles.endCapsule}>
          <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
          <Text style={styles.endCapsuleText}>You are all caught up</Text>
        </View>
      );
    return null;
  }, [loadingMore, hasMore, transactions.length]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Gradient Header — fixed height, no overlap tricks */}
      <View style={[styles.arcHeader, { height: headerHeight }]}>
        <LinearGradient
          colors={["#001638e8", "#002657"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.bubble,
            { top: -28, right: -46, width: 200, height: 200 },
          ]}
        />
        <View
          style={[
            styles.bubble,
            { bottom: -50, left: -30, width: 140, height: 140 },
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
              <Feather name="arrow-left" size={22} color="#FFF" />
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
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Feather name="refresh-cw" size={18} color="#FFF" />
              )}
            </Pressable>
          </View>

          <Text style={styles.arcSub}>
            Track resource runs, credit consumption, and billing activity
          </Text>
        </SafeAreaView>
      </View>

      {/* Body — sits directly below header, no negative margin */}
      <View style={styles.body}>
        {loading && transactions.length === 0 ? (
          <View style={styles.initialLoaderWrap}>
            <View style={styles.initialLoaderCard}>
              <ActivityIndicator size="large" color="#1E40AF" />
              <Text style={styles.initialLoaderText}>
                Loading usage history...
              </Text>
            </View>
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item, index) => String(item.id ?? index)}
            renderItem={renderItem}
            ListHeaderComponent={HeaderComponent}
            ListEmptyComponent={ListEmpty}
            ListFooterComponent={ListFooter}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.35}
            removeClippedSubviews={Platform.OS === "android"}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={10}
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4FA" },

  // Header
  arcHeader: {
    overflow: "hidden",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  bubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 14 : 0,
  },
  topActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  headerButtonPressed: { transform: [{ scale: 0.95 }], opacity: 0.8 },
  headerButtonDisabled: { opacity: 0.65 },
  headerCenter: { alignItems: "center", flex: 1, paddingHorizontal: 10 },
  arcTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.4,
  },
  arcTinySub: {
    marginTop: 2,
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "700",
  },
  arcSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 20,
    lineHeight: 18,
    fontWeight: "500",
  },

  // Body
  body: { flex: 1, backgroundColor: "#F0F4FA" },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 40,
  },

  // Initial loader
  initialLoaderWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  initialLoaderCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  initialLoaderText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "800",
    color: "#64748B",
  },

  // Summary card
  summaryCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 10,
  },
  summaryTitleBlock: { flex: 1 },
  summaryEyebrow: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  balanceRow: { flexDirection: "row", alignItems: "flex-end", gap: 5 },
  summaryTitle: {
    color: "#0F172A",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  summaryTitleSuffix: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  planLine: { marginTop: 4, color: "#64748B", fontSize: 12, fontWeight: "700" },

  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: { fontSize: 12, color: "#334155", fontWeight: "900" },
  progressSubText: { fontSize: 11, color: "#64748B", fontWeight: "800" },
  progressContainer: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 99,
    overflow: "hidden",
  },
  progressBar: { height: "100%", backgroundColor: "#1E40AF", borderRadius: 99 },

  metricsGrid: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginTop: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 4,
  },
  summaryLabel: {
    color: "#94A3B8",
    fontSize: 9,
    marginBottom: 5,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  summaryValue: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
    maxWidth: "100%",
  },
  summaryHint: {
    color: "#94A3B8",
    fontSize: 9,
    marginTop: 3,
    fontWeight: "800",
    maxWidth: "100%",
    textAlign: "center",
  },
  divider: { width: 1, backgroundColor: "#E2E8F0" },

  renewalRow: { marginTop: 14 },
  renewalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 11,
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
  renewalValue: { fontSize: 13, fontWeight: "900", color: "#334155" },

  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 99,
    gap: 4,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "900" },

  // Filter
  filterBlock: { marginBottom: 16 },
  filterHeaderRow: {
    marginBottom: 10,
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },
  filterTitle: { fontSize: 13, fontWeight: "900", color: "#0F172A" },
  filterSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  filterCount: { fontSize: 11, color: "#64748B", fontWeight: "900" },
  filterGrid: { flexDirection: "row", gap: 7 },
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
  filterTabPressed: { transform: [{ scale: 0.96 }], opacity: 0.85 },
  filterTabDisabled: { opacity: 0.6 },
  filterTabActive: {
    backgroundColor: "#1E40AF",
    borderColor: "#1D4ED8",
    shadowColor: "#1E40AF",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  filterActiveGradient: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 99,
  },
  filterTabText: { fontSize: 12, fontWeight: "900", color: "#475569" },
  filterTabTextActive: { fontSize: 12, fontWeight: "900", color: "#FFF" },

  // Section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: "#94A3B8",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },

  // Error
  errorBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
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
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  retryBtnPressed: { transform: [{ scale: 0.97 }], opacity: 0.88 },
  retryText: { fontSize: 12, fontWeight: "900", color: "#B91C1C" },

  // Skeleton placeholders while filter loads
  filterSkeletonWrap: { gap: 10, marginBottom: 4 },
  skeletonCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  skeletonIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
  },
  skeletonLines: { flex: 1, gap: 0 },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  skeletonBadge: {
    width: 60,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },

  // Log card
  logCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  logCardPressed: { transform: [{ scale: 0.99 }], opacity: 0.9 },
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
  logContent: { flex: 1 },
  logAction: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 4,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  workspaceText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    maxWidth: 110,
  },
  bulletDivider: { fontSize: 11, color: "#94A3B8" },
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  logCredits: { fontSize: 13, fontWeight: "900", color: "#EF4444" },

  // Empty state
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    paddingHorizontal: 30,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
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

  // Footer
  footerLoader: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerLoaderText: { fontSize: 12, fontWeight: "800", color: "#64748B" },
  endCapsule: {
    alignSelf: "center",
    marginTop: 8,
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
  endCapsuleText: { fontSize: 12, color: "#15803D", fontWeight: "900" },
});