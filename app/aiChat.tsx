import { ChatInputSection } from "@/components/ChatInputSection";
import { ChatTimelineCard } from "@/components/ChatTimelineCard";
import { WorkspaceMetaModal } from "@/components/WorkspaceMetaModal";
import {
    ClaimFile,
    deleteDraft,
    generateResponse,
    generateVariant,
    getAttachmentPreview,
    getDraftsByFile,
    getFileById,
    refineResponse,
    updateDraft,
    updateFile,
} from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Keyboard,
    Linking,
    Platform,
    Pressable,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";


// ─── Constants (outside component so they never re-create) ────────────────────
const REFINEMENT_MAP: Record<string, string> = {
    "Shorten": "shorten",
    "Make more formal": "formal",
    "Make attorney facing": "attorney_facing",
    "Make more firm": "firm",
    "Add DOI safe language": "doi_safe",
};

const DEFAULT_QUICK_ACTIONS = ["Copy", "Create Variant", "Mark as used"];
const DEFAULT_REFINEMENT_OPTIONS = [
    "Shorten",
    "Make more formal",
    "Make attorney facing",
    "Make more firm",
    "Add DOI safe language",
];

const { width } = Dimensions.get("window");

// ─── Pure helper functions (outside component — never re-created) ─────────────
const getFormattedTime = (timestamp: string | number | Date) => {
    if (!timestamp) return "Just now";
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const intervals = [
        { label: "year", seconds: 31536000 },
        { label: "month", seconds: 2592000 },
        { label: "week", seconds: 604800 },
        { label: "day", seconds: 86400 },
        { label: "hour", seconds: 3600 },
        { label: "min", seconds: 60 },
    ];
    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) return `${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
    }
    return "Just now";
};

const formatFullDateTime = (dateString: string | Date) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const formatted = date.toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
    return formatted.replace(",", " -");
};

// ─── Transform a raw API draft into a chat item ───────────────────────────────
// Defined outside component so useMemo selector stays stable
const transformDraft = (draft: any) => ({
    id: draft.id,
    user_input: draft.user_input || "Analysis request",
    ai_response: draft.ai_response,
    output_format: draft.content_type,
    next_step_suggestion: draft.next_step_suggestion,
    responseUsed: draft.response_used || false,
    attachments: draft.attachments || {
        image: null,
        document: null
    },
    quick_actions: DEFAULT_QUICK_ACTIONS,
    refinement: DEFAULT_REFINEMENT_OPTIONS,
    created_at: draft.created_at,
    updated_at: draft.updated_at || draft.created_at,
});

// ─── Premium Keyboard Tracking (unchanged) ───────────────────────────────────
function useKeyboardOffset() {
    const offset = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
        const show = Keyboard.addListener(showEvent, (e) => {
            Animated.timing(offset, {
                toValue: e.endCoordinates.height,
                duration: Platform.OS === "ios" ? e.duration : 200,
                easing: Easing.out(Easing.exp),
                useNativeDriver: false,
            }).start();
        });
        const hide = Keyboard.addListener(hideEvent, (e) => {
            Animated.timing(offset, {
                toValue: 0,
                duration: Platform.OS === "ios" ? e.duration : 200,
                easing: Easing.out(Easing.exp),
                useNativeDriver: false,
            }).start();
        });
        return () => { show.remove(); hide.remove(); };
    }, [offset]);
    return offset;
}

interface TurnRowProps {
    item: any;
    loadingCardId: number | null;
    onQuickAction: (action: string, draftId: number, content: string) => void;
    onRefinement: (option: string, originalContent: string, parentId: number) => void;
    onShare: (content: string) => void;
    onDelete: () => void;
    onAttachmentPress: (messageId: number, type: 'image' | 'document') => void;
}

const TurnRow = React.memo(
    ({ item, loadingCardId, onQuickAction, onRefinement, onShare, onDelete, onAttachmentPress }: TurnRowProps) => (
        <View style={styles.turnGroup}>
            <ChatTimelineCard
                category="USER INPUT"
                title=""
                content={item.user_input}
                color="#94A3B8"
                quickActions={["Copy"]}
                timeAgo={getFormattedTime(item.created_at)}
                attachments={item.attachments}
                onActionPress={(action: string) =>
                    onQuickAction(action, item.id, item.user_input || "")
                }
                onAttachmentPress={(type) => onAttachmentPress(item.id, type)}
            />
            <ChatTimelineCard
                category="AI RESPONSE"
                title=""
                timeAgo=""
                content={item.ai_response}
                color="#3B82F6"
                actualTime={formatFullDateTime(item.updated_at)}
                quickActions={item.quick_actions}
                outputFormat={item.output_format}
                refinementOptions={item.refinement}
                responseUsed={item.responseUsed}
                onActionPress={(action: string) =>
                    onQuickAction(action, item.id, item.ai_response || "")
                }
                onRefinementPress={(option: string) =>
                    onRefinement(option, item.ai_response || "", item.id)
                }
                onSharePress={() => onShare(item.ai_response || "")}
                onDeletePress={onDelete}
                isLoading={loadingCardId === item.id}
            />
            <ChatTimelineCard
                category="SUGGESTIONS"
                title="Recommended Next Step"
                content={item.next_step_suggestion}
                color="#10B981"
                quickActions={["Copy"]}
                timeAgo={getFormattedTime(item.updated_at)}
                isLoading={loadingCardId === item.id}
                onActionPress={(action: string) =>
                    onQuickAction(action, item.id, item.next_step_suggestion || "")
                }
            />
        </View>
    ),
);
TurnRow.displayName = "TurnRow";


// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AiChatScreen() {
    const { fileId, claimNumber, clientName, credits, initialData } = useLocalSearchParams();
    const { token } = useAuth();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();

    const [inputText, setInputText] = useState("");
    const [userCredits, setUserCredits] = useState(Number(credits || 0));
    const [isMetaModalVisible, setIsMetaModalVisible] = useState(false);
    const [loadingCardId, setLoadingCardId] = useState<number | null>(null);

    // Local optimistic chat list — seeded from React Query cache then updated locally
    const [chatHistory, setChatHistory] = useState<any[]>([]);

    const flatListRef = useRef<FlatList>(null);
    const keyboardOffset = useKeyboardOffset();

    // ─── React Query: thread history ─────────────────────────────────────────
    const {
        data: draftsData,
        isLoading: isDraftsLoading,
    } = useQuery({
        queryKey: ["drafts", fileId],
        queryFn: () => getDraftsByFile(token!, Number(fileId)),
        enabled: !!token && !!fileId,
        staleTime: 30_000, // consider data fresh for 30 s — avoids redundant refetches
    });

    // Sync React Query data → local chatHistory (reversed for inverted FlatList)
    useEffect(() => {
        if (draftsData) {
            setChatHistory([...draftsData.map(transformDraft)].reverse());
        }
    }, [draftsData]);

    // ─── React Query: file metadata ───────────────────────────────────────────
    const { data: currentWorkspace } = useQuery({
        queryKey: ["file", fileId],
        queryFn: () => getFileById(token!, Number(fileId)),
        enabled: !!token && !!fileId,
        // Seed from initialData so we show something immediately
        initialData: initialData ? JSON.parse(initialData as string) : undefined,
        staleTime: 60_000,
    });

    // ─── Auto-scroll to newest message ───────────────────────────────────────
    useEffect(() => {
        if (chatHistory.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }, 100);
        }
    }, [chatHistory.length]);

    // ─── Mutation: update workspace metadata ──────────────────────────────────
    const updateWorkspaceMutation = useMutation({
        mutationFn: (updatedData: Partial<ClaimFile>) =>
            updateFile(token!, Number(fileId), updatedData),
        onMutate: async (updatedData) => {
            // 1. Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ["file", fileId] });
            await queryClient.cancelQueries({ queryKey: ["files"] }); // Cancel the main list too

            // 2. Snapshot the current data
            const previousFile = queryClient.getQueryData(["file", fileId]);
            const previousList = queryClient.getQueryData(["files"]);

            // 3. Optimistically update the individual file detail
            queryClient.setQueryData(["file", fileId], (old: any) =>
                old ? { ...old, ...updatedData } : old,
            );

            // 4. Optimistically update the file inside the global list
            queryClient.setQueryData(["files"], (old: any) => {
                if (!old || !old.files) return old;
                return {
                    ...old,
                    files: old.files.map((f: any) =>
                        f.id === Number(fileId) ? { ...f, ...updatedData } : f
                    )
                };
            });

            return { previousFile, previousList };
        },
        onSuccess: () => {
            toast.success("Workspace updated successfully");
            // Refetch in background to ensure we are synced with DB
            queryClient.invalidateQueries({ queryKey: ["file", fileId] });
            queryClient.invalidateQueries({ queryKey: ["files"] });
        },
        onError: (_err, _vars, context: any) => {
            // Rollback on error
            queryClient.setQueryData(["file", fileId], context?.previousFile);
            queryClient.setQueryData(["files"], context?.previousList);
            toast.error("Failed to update workspace");
        },
    });

    const handleUpdateWorkspace = useCallback(
        (updatedData: Partial<ClaimFile>): Promise<void> => {
            return new Promise((resolve, reject) => {
                updateWorkspaceMutation.mutate(updatedData, {
                    onSuccess: () => resolve(),
                    onError: (err) => reject(err),
                });
            });
        },
        [updateWorkspaceMutation],
    );

    // ─── Send message ─────────────────────────────────────────────────────────
    const [isGenerating, setIsGenerating] = useState(false);

    const handleSend = useCallback(
        async (attachments: any[] = []) => {
            if (!token) return router.replace("/(auth)/login");
            if (!inputText.trim()) return toast.warning("Please enter a message.");
            if (!fileId) return toast.warning("Workspace context missing.");

            setIsGenerating(true);
            Keyboard.dismiss();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
                const formData = new FormData();
                formData.append("fileId", fileId.toString());
                formData.append("userInput", inputText.trim());
                attachments.forEach((file) => {
                    formData.append("attachments", {
                        uri: Platform.OS === "android"
                            ? file.uri
                            : file.uri.replace("file://", ""),
                        type: file.type || "image/jpeg",
                        name: file.name || "upload.jpg",
                    } as any);
                });

                const result = await generateResponse(token, formData);

                if (result) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    const newInteraction = {
                        id: result.id || Date.now(),
                        user_input: inputText.trim(),
                        ai_response: result.responseText,
                        output_format: result.output_format,
                        next_step_suggestion: result.next_step_suggestion,
                        responseUsed: false,
                        quick_actions: DEFAULT_QUICK_ACTIONS,
                        refinement: DEFAULT_REFINEMENT_OPTIONS,
                        created_at: result.createdAt,
                        attachments: result.attachments,
                    };
                    setChatHistory((prev) => [newInteraction, ...prev]);
                    setUserCredits((prev) => Math.max(0, prev - 1));
                    setInputText("");
                    toast.success("Response added to timeline");
                    // Also invalidate so background sync stays fresh
                    queryClient.invalidateQueries({ queryKey: ["drafts", fileId] });
                }
            } catch (error: any) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                toast.error(error?.message || "Generation failed");
            } finally {
                setIsGenerating(false);
            }
        },
        [token, fileId, inputText, queryClient],
    );

    // ─── Quick actions ────────────────────────────────────────────────────────
    const handleQuickAction = useCallback(
        async (action: string, draftId: number, content: string) => {
            Haptics.selectionAsync();

            if (action.startsWith("Variant: ")) {
                const variantLabel = action.replace("Variant: ", "");
                setIsGenerating(true);
                setLoadingCardId(draftId);
                try {
                    const result = await generateVariant(token!, {
                        fileId: Number(fileId),
                        parentMessageId: draftId,
                        variantLabel,
                        userInput: content,
                    });
                    if (result.success) {
                        toast.success(`${variantLabel} Created`);
                        setChatHistory((prev) =>
                            prev.map((item) =>
                                item.id === draftId
                                    ? {
                                        ...item,
                                        ai_response: result.data.ai_response,
                                        output_format: variantLabel,
                                        next_step_suggestion: result.data.next_step_suggestion,
                                        updated_at: result.updated_at,
                                    }
                                    : item,
                            ),
                        );
                        setUserCredits((prev) => Math.max(0, prev - 1));
                    }
                } catch (error: any) {
                    toast.error(error?.message || "Failed to create variant");
                } finally {
                    setIsGenerating(false);
                    setLoadingCardId(null);
                }
                return;
            }

            switch (action) {
                case "Copy":
                    await Clipboard.setStringAsync(content);
                    toast.success("Copied to clipboard");
                    break;
                case "Mark as used":
                    try {
                        const currentItem = chatHistory.find((item) => item.id === draftId);
                        const currentUsedStatus = currentItem?.responseUsed || false;
                        const response = await updateDraft(token!, draftId, {
                            response_used: !currentUsedStatus,
                        });
                        if (response.success) {
                            const newStatus = !currentUsedStatus;
                            toast.success(newStatus ? "Marked as Used" : "Marked as Unused");
                            setChatHistory((prev) =>
                                prev.map((item) =>
                                    item.id === draftId
                                        ? { ...item, responseUsed: newStatus }
                                        : item,
                                ),
                            );
                        }
                    } catch {
                        toast.error("Update failed");
                    }
                    break;
            }
        },
        [fileId, token, chatHistory],
    );

    // ─── Refinement ───────────────────────────────────────────────────────────
    const handleRefinement = useCallback(
        async (option: string, originalContent: string, parentId: number) => {
            Haptics.selectionAsync();
            const backendType = REFINEMENT_MAP[option];
            setLoadingCardId(parentId);
            setIsGenerating(true);
            try {
                const result = await refineResponse(token!, {
                    fileId: Number(fileId),
                    parentMessageId: parentId,
                    refinementType: backendType,
                    userInput: originalContent,
                });
                if (result.success) {
                    toast.success(`${option} Applied`);
                    setUserCredits((prev) => Math.max(0, prev - 1));
                    setChatHistory((prev) =>
                        prev.map((item) =>
                            item.id === parentId
                                ? {
                                    ...item,
                                    ai_response: result.data.ai_response,
                                    output_format: result.data.output_format,
                                    next_step_suggestion: result.data.next_step_suggestion,
                                    created_at: result.data.created_at,
                                    updated_at: result.data.updated_at,
                                }
                                : item,
                        ),
                    );
                }
            } catch {
                toast.error("Refinement failed");
            } finally {
                setIsGenerating(false);
                setLoadingCardId(null);
            }
        },
        [token, fileId],
    );

    // ─── Share ────────────────────────────────────────────────────────────────
    const onShare = useCallback(async (content: string) => {
        try {
            await Share.share({ message: content, title: "AdjusterAssist Claim Update" });
        } catch {
            toast.error("Sharing failed");
        }
    }, []);

    const handleDeleteDraft = useCallback((draftId: number) => {
        const toastId = toast.warning("Delete this message?", {
            description: "This action cannot be undone.",

            action: {
                label: "Delete",
                onClick: async () => {
                    // Close confirmation toast immediately
                    toast.dismiss(toastId);

                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                    try {
                        const response = await deleteDraft(token!, draftId);

                        if (response.success) {
                            toast.success("Message deleted");

                            setChatHistory((prev) =>
                                prev.filter((item) => item.id !== draftId)
                            );

                            queryClient.invalidateQueries({
                                queryKey: ["drafts", fileId],
                            });
                        }
                    } catch (error: any) {
                        toast.error(error?.message || "Failed to delete");
                    }
                },
            },

            cancel: {
                label: "Cancel",
                onClick: () => {
                    toast.dismiss(toastId);
                },
            },
        });
    }, [token, fileId, queryClient]);

    const handleAttachmentPress = useCallback(async (messageId: number, type: 'image' | 'document') => {
        try {
            const response = await getAttachmentPreview(token!, messageId, type);
            if (response.success && response.signedUrl) {
                // Open the URL (Image preview or Browser for PDF)
                if (type === 'image') {
                    // Use a light box or Linking
                    Linking.openURL(response.signedUrl);
                } else {
                    Linking.openURL(response.signedUrl);
                }
            }
        } catch (error) {
            toast.error("Could not generate preview link");
        }
    }, [token]);
    // ─── Memoised renderItem — stable reference, only re-renders changed rows ─
    const renderItem = useCallback(
        ({ item }: { item: any }) => (
            <TurnRow
                item={item}
                loadingCardId={loadingCardId}
                onQuickAction={handleQuickAction}
                onRefinement={handleRefinement}
                onShare={onShare}
                onDelete={() => handleDeleteDraft(item.id)}
                onAttachmentPress={handleAttachmentPress}
            />
        ),
        [loadingCardId, handleQuickAction, handleRefinement, onShare, handleDeleteDraft, handleAttachmentPress],
    );



    // ─── Memoised keyboard interpolation ─────────────────────────────────────
    const dynamicBottomPadding = useMemo(
        () =>
            keyboardOffset.interpolate({
                inputRange: [0, 100],
                outputRange: [Math.max(insets.bottom, 12), 10],
                extrapolate: "clamp",
            }),
        [keyboardOffset, insets.bottom],
    );

    // ─── Memoised empty component so it's not recreated every render ──────────
    const ListEmptyComponent = useMemo(
        () => (
            <View style={[styles.emptyContainer]}>
                <Ionicons name="chatbubbles-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>
                    Add claim details, upload documents, or ask for a file note.
                </Text>
            </View>
        ),
        [],
    );

    // ─── Memoised key extractor ───────────────────────────────────────────────
    const keyExtractor = useCallback((item: any) => item.id.toString(), []);

    // ─── Derived display values ───────────────────────────────────────────────
    const displayClientName = useMemo(
        () => currentWorkspace?.client_name || clientName,
        [currentWorkspace?.client_name, clientName],
    );
    const displayClaimNumber = useMemo(
        () => currentWorkspace?.claim_number || claimNumber,
        [currentWorkspace?.claim_number, claimNumber],
    );

    return (
        <View style={styles.root}>
            <StatusBar style="light" />
            {isGenerating && (
                <View style={styles.globalBackdrop}>
                    <View>
                        <ActivityIndicator size="large" color="#4F46E5" />
                    </View>
                </View>
            )}

            {/* HEADER SECTION */}
            <View style={styles.headerContainer}>
                <LinearGradient
                    colors={["#001529", "#003366"]}
                    style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
                >
                    <View style={styles.topNav}>
                        <TouchableOpacity
                            style={styles.navCircle}
                            onPress={() => router.back()}
                            activeOpacity={0.6}
                        >
                            <Ionicons name="chevron-back" size={22} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.logoTextMain}>
                            Adjuster<Text style={styles.logoTextAccent}>Assist</Text>
                        </Text>
                        <TouchableOpacity activeOpacity={0.6}>
                            {userCredits !== undefined && (
                                <Pressable onPress={() => router.push("/settings")}>
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            backgroundColor: "rgba(255, 255, 255, 0.12)",
                                            paddingHorizontal: 10,
                                            paddingVertical: 6,
                                            borderRadius: 12,
                                        }}
                                    >
                                        <Ionicons name="sparkles" size={14} color="#FDE68A" />
                                        <Text style={styles.creditText}>{userCredits}</Text>
                                    </View>
                                </Pressable>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.workspaceRow}>
                        <View style={styles.infoBlock}>
                            <View style={styles.claimBadge}>
                                <View style={styles.pulseDot} />
                                <Text style={styles.claimNoText}>
                                    {displayClaimNumber || "New Workspace"}
                                </Text>
                            </View>
                            <Text style={styles.clientText}>{displayClientName}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.workspaceBtn}
                            activeOpacity={0.8}
                            onPress={() => setIsMetaModalVisible(true)}
                        >
                            <MaterialCommunityIcons
                                name="view-dashboard-outline"
                                size={18}
                                color="#FFF"
                            />
                            <Text style={styles.workspaceBtnText}>Workspace</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
                <View style={styles.archBottom} />
            </View>

            {/* CHAT LIST */}
            {isDraftsLoading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.loaderText}>Loading claim thread...</Text>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    inverted
                    data={chatHistory}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode="interactive"
                    keyboardShouldPersistTaps="handled"
                    scrollEventThrottle={16}
                    ListEmptyComponent={ListEmptyComponent}
                    // Performance tweaks
                    removeClippedSubviews={Platform.OS === "android"}
                    maxToRenderPerBatch={5}
                    windowSize={10}
                    initialNumToRender={8}
                />
            )}

            {/* PREMIUM INPUT BAR */}
            <ChatInputSection
                inputText={inputText}
                setInputText={setInputText}
                onSend={handleSend}
                onFocus={() => { }}
                keyboardOffset={keyboardOffset}
                dynamicBottomPadding={dynamicBottomPadding}
                disabled={isGenerating}
            />

            <WorkspaceMetaModal
                isVisible={isMetaModalVisible}
                onClose={() => setIsMetaModalVisible(false)}
                item={currentWorkspace}
                onUpdate={handleUpdateWorkspace}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F8FAFC" },
    headerContainer: { backgroundColor: "#F8FAFC", zIndex: 10 },
    headerGradient: { paddingBottom: 40, paddingHorizontal: 20 },
    archBottom: {
        position: "absolute",
        bottom: -20,
        width: width,
        height: 40,
        backgroundColor: "#F8FAFC",
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    globalBackdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
    },
    loaderBox: {
        backgroundColor: "#3B82F6",
        padding: 20,
        borderRadius: 12,
        alignItems: "center",
        elevation: 5,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: "#334155",
    },
    topNav: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    logoTextMain: { color: "#FFF", fontSize: 20, fontWeight: "800" },
    logoTextAccent: { color: "#3B82F6" },
    navCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        justifyContent: "center",
        alignItems: "center",
    },
    workspaceRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    infoBlock: { flex: 1 },
    claimBadge: {
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 10,
        marginBottom: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    pulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#3B82F6",
    },
    claimNoText: { fontSize: 13, fontWeight: "700", color: "#60A5FA" },
    clientText: { fontSize: 24, fontWeight: "800", color: "#FFF" },
    workspaceBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#3B82F6",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        gap: 8,
    },
    workspaceBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
    listContent: { padding: 16, paddingBottom: 24 },
    turnGroup: { marginBottom: 24 },
    loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    loaderText: {
        marginTop: 12,
        color: "#64748B",
        fontSize: 14,
        fontWeight: "500",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 100,
    },
    emptyText: {
        marginTop: 16,
        color: "#94A3B8",
        fontSize: 15,
        textAlign: "center",
        paddingHorizontal: 40,
    },
    creditText: {
        color: "#FDE68A",
        fontSize: 13,
        fontWeight: "700",
        marginLeft: 6,
    },
    disclaimerContainer: {
        padding: 20,
        backgroundColor: "#F1F5F9",
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 20,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    disclaimerText: {
        fontSize: 12,
        color: "#64748B",
        lineHeight: 18,
        flex: 1,
        fontStyle: "italic",
    },
});
