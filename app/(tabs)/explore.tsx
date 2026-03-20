import { ClaimFile, getMyFiles } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const TabTwoScreen = () => {
  const { token } = useAuth();
  const router = useRouter();

  const [files, setFiles] = useState<ClaimFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  /**
   * Fetch Files from API
   */
  const loadFiles = useCallback(
    async (isRefreshing = false) => {
      if (!token) {
        setLoading(false);
        return;
      }

      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      try {
        const data = await getMyFiles(token);
        // Ensure we handle the data correctly if getMyFiles returns an array directly
        setFiles(data || []);
      } catch (error) {
        console.error("Screen fetch error:", error);
        Alert.alert("Error", "Failed to load your workspace files.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const onRefresh = () => loadFiles(true);

  /**
   * Search Filtering
   */
  const filteredFiles = useMemo(() => {
    return files.filter(
      (f) =>
        f.claim_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.client_name?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [files, searchQuery]);

  /**
   * Render Component for List Item
   */
  const renderFileItem = ({ item }: { item: ClaimFile }) => (
    <TouchableOpacity
      style={styles.fileCard}
      activeOpacity={0.7}
      // onPress={() =>
      //   router.push({
      //     pathname: "/file-workspace", // Ensure this route exists in your (tabs) or app folder
      //     params: { fileId: item.id, claimNumber: item.claim_number },
      //   })
      // }
    >
      <View style={styles.cardIcon}>
        <MaterialCommunityIcons
          name="folder-text-outline"
          size={24}
          color="#276bbd"
        />
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.cardHeader}>
          <Text style={styles.claimNumber} numberOfLines={1}>
            {item.claim_number}
          </Text>
          <View
            style={[
              styles.statusBadge,
              item.status === "active"
                ? styles.activeBadge
                : styles.inactiveBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.status === "active"
                  ? styles.activeStatusText
                  : styles.inactiveStatusText,
              ]}
            >
              {(item.status || "N/A").toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.clientName}>
          {item.client_name || "Unknown Client"}
        </Text>

        <View style={styles.cardFooter}>
          <Feather name="calendar" size={12} color="#94A3B8" />
          <Text style={styles.dateText}>
            {item.created_at
              ? new Date(item.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "No date"}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>File Workspace</Text>
        <Text style={styles.headerSubtitle}>
          Manage your active claims and drafts
        </Text>

        <View style={styles.searchWrapper}>
          <Feather name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Claim # or Client"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#276bbd" />
          <Text style={styles.loaderText}>Loading Workspace...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFiles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderFileItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#276bbd"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="folder-open-outline"
                size={60}
                color="#CBD5E1"
              />
              <Text style={styles.emptyText}>
                {searchQuery ? "No matching files found" : "No files available"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default TabTwoScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 20,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#1E293B",
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  fileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  claimNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadge: {
    backgroundColor: "#DCFCE7",
  },
  inactiveBadge: {
    backgroundColor: "#F1F5F9",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  activeStatusText: {
    color: "#166534",
  },
  inactiveStatusText: {
    color: "#475569",
  },
  clientName: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyText: {
    marginTop: 12,
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "600",
  },
});