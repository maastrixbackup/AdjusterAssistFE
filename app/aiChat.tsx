import { ChatInputSection } from '@/components/ChatInputSection';
import { ChatTimelineCard } from '@/components/ChatTimelineCard';
import { WorkspaceMetaModal } from '@/components/WorkspaceMetaModal';
import { ClaimFile, generateResponse, generateVariant, getDraftsByFile, getFileById, refineResponse, updateDraft, updateFile } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Keyboard,
    Platform,
    Pressable,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

const REFINEMENT_MAP: Record<string, string> = {
    "Shorten": "Shorten response",
    "Make more formal": "Make formal",
    "Make attornary facing": "Make a attorney response",
    "Make more firm": "Make more firm",
    "Add DOI safe language": "Add doi safe language",
};

const { width } = Dimensions.get('window');

const getFormattedTime = (timestamp: string | number | Date) => {
    if (!timestamp) return 'Just now';

    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';

    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'week', seconds: 604800 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'min', seconds: 60 },
    ];

    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) {
            return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
        }
    }
    return 'Just now';
};

// ─── Premium Keyboard Tracking ─────────────────────────────────────────────
function useKeyboardOffset() {
    const offset = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const show = Keyboard.addListener(showEvent, (e) => {
            Animated.timing(offset, {
                toValue: e.endCoordinates.height,
                duration: Platform.OS === 'ios' ? e.duration : 200,
                easing: Easing.out(Easing.exp),
                useNativeDriver: false,
            }).start();
        });

        const hide = Keyboard.addListener(hideEvent, (e) => {
            Animated.timing(offset, {
                toValue: 0,
                duration: Platform.OS === 'ios' ? e.duration : 200,
                easing: Easing.out(Easing.exp),
                useNativeDriver: false,
            }).start();
        });

        return () => {
            show.remove();
            hide.remove();
        };
    }, [offset]);

    return offset;
}

export default function AiChatScreen() {
    const { fileId, claimNumber, clientName, credits, initialData } = useLocalSearchParams();
    const { token } = useAuth();
    const insets = useSafeAreaInsets();

    const [inputText, setInputText] = useState('');
    const [chatHistory, setChatHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const [userCredits, setUserCredits] = useState(Number(credits || 0));

    const [isMetaModalVisible, setIsMetaModalVisible] = useState(false);
    const [currentWorkspace, setCurrentWorkspace] = useState<ClaimFile | null>(
        initialData ? JSON.parse(initialData as string) : null
    );


    const flatListRef = useRef<FlatList>(null);
    const keyboardOffset = useKeyboardOffset();

    // ─── AUTO SCROLL LOGIC ──────────────────────────────────────────────────
    useEffect(() => {
        // Since the list is inverted, index 0 is the bottom (newest)
        if (chatHistory.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }, 100);
        }
    }, [chatHistory.length]);
    // ────────────────────────────────────────────────────────────────────────


    // ─── Fetch Thread History ────────────────────────────────────────────────
    const loadThreadHistory = useCallback(async () => {
        if (!fileId || !token) return;

        setIsLoading(true);
        try {
            const drafts = await getDraftsByFile(token, Number(fileId));

            // Transform API Drafts into Chat Items
            const formattedHistory = drafts.map((draft: any) => ({
                id: draft.id,
                user_input: draft.user_input || 'Analysis request',
                ai_response: draft.ai_response,
                output_format: draft.content_type,
                next_step_suggestion: draft.next_step_suggestion,
                responseUsed: draft.response_used || false,
                // quick_actions: draft.quick_actions || [],
                quick_actions: ["Copy", "Create Variant", "Mark as used"],
                refinement: draft.refinement || ["Shorten", "Make more formal", "Make attornary facing", "Make more firm", " Add DOI safe language"],
                created_at: draft.created_at,
            }));

            // We reverse here because we are using the 'inverted' prop on FlatList
            setChatHistory(formattedHistory.reverse());
        } catch (error) {
            console.error("Error loading chat history:", error);
        } finally {
            setIsLoading(false);
        }
    }, [fileId, token]);

    const loadFileDetails = useCallback(async () => {
        if (!fileId || !token) {
            console.warn("Missing fileId or token in loadFileDetails");
            return;
        }
        try {
            const fileData = await getFileById(token, Number(fileId));

            if (fileData) {
                setCurrentWorkspace(fileData);
            } else {
                console.error("API returned empty data for fileId:", fileId);
            }
        } catch (error) {
            console.error("Error loading file metadata:", error);
        }
    }, [fileId, token]);

    useEffect(() => {
        loadThreadHistory();
        loadFileDetails();
    }, [loadThreadHistory, loadFileDetails]);

    const handleSend = useCallback(async (attachments: any[] = []) => {
        if (!token) return router.replace("/(auth)/login");

        if (!inputText.trim()) {
            return toast.warning("Please enter a message.");
        }

        if (!fileId) return toast.warning("Workspace context missing.");

        setIsGenerating(true);
        Keyboard.dismiss();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const formData = new FormData();
            formData.append('fileId', fileId.toString());
            formData.append('userInput', inputText.trim());

            attachments.forEach((file) => {
                formData.append('attachments', {
                    uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
                    type: file.type || 'image/jpeg',
                    name: file.name || 'upload.jpg',
                } as any);
            });

            const result = await generateResponse(token, formData);

            if (result) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                const NewInteraction = {
                    id: result.id || Date.now(),
                    user_input: inputText.trim(),
                    ai_response: result.responseText,
                    output_format: result.output_format,
                    next_step_suggestion: result.nextStep,
                    responseUsed: false,
                    quick_actions: ["Copy", "Create Variant", "Mark as used"],
                    refinement: ["Shorten", "Make more formal", "Make attornary facing", "Make more firm", " Add DOI safe language"],
                    created_at: result.createdAt,
                }

                setChatHistory(prev => [NewInteraction, ...prev]);
                setUserCredits(prev => Math.max(0, prev - 1));
                setInputText("");
                toast.success("Response added to timeline");
            }
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            toast.error(error?.message || "Generation failed");
        } finally {
            setIsGenerating(false);
        }
    }, [token, fileId, inputText]);

    const handleUpdateWorkspace = async (updatedData: Partial<ClaimFile>) => {
        if (!fileId || !token) return;
        try {
            setCurrentWorkspace(prev => prev ? { ...prev, ...updatedData } : null);
            await updateFile(token, Number(fileId), updatedData);
            toast.success("Workspace updated successfully");
            await loadFileDetails();
        } catch (error) {
            console.error("Failed to update workspace:", error);
            toast.error("Failed to update workspace");
        }
    };

    const handleQuickAction = useCallback(async (action: string, draftId: number, content: string) => {
        Haptics.selectionAsync();

        // Handle "Create Variant" logic
        if (action.startsWith("Variant: ")) {
            const variantLabel = action.replace("Variant: ", "");
            setIsGenerating(true);

            try {
                const result = await generateVariant(token!, {
                    fileId: Number(fileId),
                    parentMessageId: draftId,
                    variantLabel: variantLabel,
                    userInput: content,
                });

                if (result.success) {
                    toast.success(`${variantLabel} Created`);

                    const newInteraction = {
                        id: result.data.id,
                        user_input: `Variant: ${variantLabel}`,
                        ai_response: result.data.ai_response,
                        output_format: variantLabel,
                        next_step_suggestion: result.data.next_step_suggestion,
                        responseUsed: false,
                        quick_actions: ["Copy", "Create Variant", "Mark as used"],
                        refinement: ["Shorten", "Make more formal", "Make attornary facing", "Make more firm", " Add DOI safe language"],
                        created_at: result.data.created_at,
                    };

                    // Add to thread immediately for ChatGPT-style continuity
                    setChatHistory(prev => [newInteraction, ...prev]);
                    setUserCredits(prev => Math.max(0, prev - 1));
                }
            } catch (error: any) {
                toast.error(error?.message || "Failed to create variant");
            } finally {
                setIsGenerating(false);
            }
            return;
        }

        // Handle other actions (Copy, Mark as used, etc.)
        switch (action) {
            case "Copy":
                await Clipboard.setStringAsync(content);
                toast.success("Copied to clipboard");
                break;
            case "Mark as used":
                try {
                    const response = await updateDraft(token!, draftId, { response_used: true });
                    if (response.success) {
                        toast.success("Interaction Updated");
                        setChatHistory(prev =>
                            prev.map(item => item.id === draftId ? { ...item, responseUsed: true } : item)
                        );
                    }
                } catch (error) {
                    console.log(error)
                    toast.error("Update failed");
                }
                break;
        }
    }, [fileId, token]);

    const handleRefinement = useCallback(async (option: string, originalContent: string, parentId: number) => {
        Haptics.selectionAsync();

        const backendType = REFINEMENT_MAP[option] || 'formal';

        setIsGenerating(true);
        try {
            // 2. Call the new dedicated refinement API
            const result = await refineResponse(token!, {
                fileId: Number(fileId),
                parentMessageId: parentId,
                refinementType: backendType,
                userInput: originalContent,
            });

            if (result.success) {
                toast.success(`${option} Applied`);
                setUserCredits(prev => Math.max(0, prev - 1));

                // 3. Format the result to match your chatHistory structure
                const refinedInteraction = {
                    id: result.data.id,
                    user_input: `Refine: ${option}`, // Descriptive label for the thread
                    ai_response: result.data.ai_response,
                    output_format: result.data.content_type,
                    next_step_suggestion: result.data.next_step_suggestion,
                    responseUsed: false,
                    quick_actions: ["Copy", "Create Variant", "Mark as used"],
                    refinement: ["Shorten", "Make more formal", "Make attornary facing", "Make more firm", " Add DOI safe language"],
                    created_at: result.data.created_at,
                };

                // 4. Push to thread as a NEW standalone entry
                setChatHistory(prev => [refinedInteraction, ...prev]);
            }
        } catch (error) {
            console.error("Refinement error:", error);
            toast.error("Refinement failed");
        } finally {
            setIsGenerating(false);
        }
    }, [token, fileId]);

    const onShare = useCallback(async (content: string) => {
        try {
            await Share.share({ message: content, title: 'AdjusterAssist Claim Update' });
        } catch (error: any) {
            console.log(error)
            toast.error("Sharing failed");
        }
    }, []);

    const renderItem = useCallback(({ item }: { item: any }) => (
        <View style={styles.turnGroup}>
            <ChatTimelineCard
                category="USER INPUT"
                title=""
                content={item.user_input}
                color="#94A3B8"
                quickActions={["Copy"]}
                timeAgo={getFormattedTime(item.created_at)}
            />
            <ChatTimelineCard
                category="AI RESPONSE"
                title=""
                content={item.ai_response}
                color="#3B82F6"
                timeAgo=""
                quickActions={item.quick_actions}
                outputFormat={item.output_format}
                refinementOptions={item.refinement}
                responseUsed={item.responseUsed}
                onActionPress={(action) => handleQuickAction(action, item.id, item.ai_response || "")}
                onRefinementPress={(option) => handleRefinement(option, item.ai_response || "", item.id)}
                onSharePress={() => onShare(item.ai_response || "")}
            />
            <ChatTimelineCard
                category="Suggestions"
                title="Recommended Next Step"
                content={item.next_step_suggestion}
                color="#10B981"
                quickActions={["Copy"]}
                timeAgo={getFormattedTime(item.created_at)}
            />
        </View>
    ), [handleQuickAction, handleRefinement, onShare]);

    const dynamicBottomPadding = keyboardOffset.interpolate({
        inputRange: [0, 100],
        outputRange: [Math.max(insets.bottom, 12), 10],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.root}>
            <StatusBar style="light" />

            {/* HEADER SECTION */}
            <View style={styles.headerContainer}>
                <LinearGradient colors={['#001529', '#003366']} style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}>
                    <View style={styles.topNav}>
                        <TouchableOpacity style={styles.navCircle} onPress={() => router.back()} activeOpacity={0.6}>
                            <Ionicons name="chevron-back" size={22} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.logoTextMain}>Adjuster<Text style={styles.logoTextAccent}>Assist</Text></Text>
                        <TouchableOpacity activeOpacity={0.6}>
                            {credits !== undefined && (
                                <Pressable onPress={() => router.push("/settings")}>
                                    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: 'rgba(255, 255, 255, 0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
                                        <Ionicons name="sparkles" size={14} color="#FDE68A" />
                                        <Text style={styles.creditText}>{userCredits ?? 0}</Text>
                                    </View>
                                </Pressable>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.workspaceRow}>
                        <View style={styles.infoBlock}>
                            <View style={styles.claimBadge}>
                                <View style={styles.pulseDot} />
                                <Text style={styles.claimNoText}>{claimNumber || 'New Workspace'}</Text>
                            </View>
                            <Text style={styles.clientText}>{clientName || currentWorkspace?.client_name}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.workspaceBtn}
                            activeOpacity={0.8}
                            onPress={() => setIsMetaModalVisible(true)}
                        >
                            <MaterialCommunityIcons name="view-dashboard-outline" size={18} color="#FFF" />
                            <Text style={styles.workspaceBtnText}>Workspace</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
                <View style={styles.archBottom} />
            </View>

            {/* CHAT LIST */}
            {isLoading ? (
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
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode="interactive"
                    keyboardShouldPersistTaps="handled"
                    scrollEventThrottle={16}
                    ListEmptyComponent={
                        <View style={[styles.emptyContainer, { transform: [{ scaleY: -1 }] }]}>
                            <Ionicons name="chatbubbles-outline" size={48} color="#CBD5E1" />
                            <Text style={styles.emptyText}>No history yet. Start by asking a question.</Text>
                        </View>
                    }
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
    root: { flex: 1, backgroundColor: '#F8FAFC' },
    headerContainer: { backgroundColor: '#F8FAFC', zIndex: 10 },
    headerGradient: { paddingBottom: 40, paddingHorizontal: 20 },
    archBottom: {
        position: 'absolute',
        bottom: -20,
        width: width,
        height: 40,
        backgroundColor: '#F8FAFC',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    logoTextMain: { color: '#FFF', fontSize: 20, fontWeight: '800' },
    logoTextAccent: { color: '#3B82F6' },
    navCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.04)', justifyContent: 'center', alignItems: 'center' },
    workspaceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    infoBlock: { flex: 1 },
    claimBadge: { backgroundColor: 'rgba(59, 130, 246, 0.2)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3B82F6' },
    claimNoText: { fontSize: 13, fontWeight: '700', color: '#60A5FA' },
    clientText: { fontSize: 24, fontWeight: '800', color: '#FFF' },
    workspaceBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, gap: 8 },
    workspaceBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
    listContent: { padding: 16, paddingBottom: 24 },
    turnGroup: { marginBottom: 24 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loaderText: { marginTop: 12, color: '#64748B', fontSize: 14, fontWeight: '500' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 16, color: '#94A3B8', fontSize: 15, textAlign: 'center', paddingHorizontal: 40 },
    creditText: { color: "#FDE68A", fontSize: 13, fontWeight: "700", marginLeft: 6 },
});