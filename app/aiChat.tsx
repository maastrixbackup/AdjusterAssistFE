import { ChatInputSection } from '@/components/ChatInputSection';
import { ChatTimelineCard } from '@/components/ChatTimelineCard';
import { WorkspaceMetaModal } from '@/components/WorkspaceMetaModal';
import { ClaimFile, getDraftsByFile } from '@/lib/api'; // Ensure this path matches your project structure
import { useAuth } from '@/providers/auth-provider';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    const { fileId, claimNumber, clientName, credits } = useLocalSearchParams();
    const { token } = useAuth();
    const insets = useSafeAreaInsets();

    const [inputText, setInputText] = useState('');
    const [chatHistory, setChatHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [isMetaModalVisible, setIsMetaModalVisible] = useState(false);
    const [currentWorkspace, setCurrentWorkspace] = useState<ClaimFile | null>(null);

    const handleUpdateWorkspace = async (data: Partial<ClaimFile>) => {
        // Your API call logic here (e.g., to your CSC-backend pricing/meta APIs)
        console.log("Updating workspace with:", data);
    };


    const flatListRef = useRef<FlatList>(null);
    const keyboardOffset = useKeyboardOffset();

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
                quick_actions: draft.quick_actions || [],
                created_at: draft.created_at,
            }));

            setChatHistory(formattedHistory);
        } catch (error) {
            console.error("Error loading chat history:", error);
        } finally {
            setIsLoading(false);
        }
    }, [fileId, token]);

    useEffect(() => {
        loadThreadHistory();
    }, [loadThreadHistory]);

    const scrollToBottom = useCallback((animated = true) => {
        requestAnimationFrame(() => {
            flatListRef.current?.scrollToEnd({ animated });
        });
    }, []);

    const handleSend = () => {
        if (!inputText.trim()) return;

        // Logic for sending new prompt would go here (API call to generate new draft)
        console.log('Sending to file:', fileId, 'Content:', inputText);
        setInputText('');
    };

    const renderItem = useCallback(({ item }: { item: any }) => (
        <View style={styles.turnGroup}>
            <ChatTimelineCard
                category="USER INPUT"
                title="Input"
                content={item.user_input}
                color="#94A3B8"
                timeAgo={getFormattedTime(item.created_at)}
            />
            <ChatTimelineCard
                category="AI RESPONSE"
                title="Response"
                content={item.ai_response}
                color="#3B82F6"
                timeAgo="Generated"
                quickActions={item.quick_actions}
                outputFormat={item.output_format}
            />
            <ChatTimelineCard
                category="Recommended Next Step"
                title="Follow up Suggestion"
                content={item.next_step_suggestion}
                color="#10B981"
                timeAgo={getFormattedTime(item.created_at)}
            />
        </View>
    ), []);

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
                            <Pressable
                                onPress={() => router.push("/settings")}
                            >
                                <View style={{ flexDirection: "row", alignItems: "center" }}>
                                    <Ionicons name="sparkles" size={14} color="#FDE68A" />
                                    <Text style={styles.creditText}>
                                        {credits ?? 0}
                                    </Text>
                                </View>
                            </Pressable>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.workspaceRow}>
                        <View style={styles.infoBlock}>
                            <View style={styles.claimBadge}>
                                <View style={styles.pulseDot} />
                                <Text style={styles.claimNoText}>{claimNumber || 'New Workspace'}</Text>
                            </View>
                            <Text style={styles.clientText}>{clientName || 'Unassigned'}</Text>
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
                    data={chatHistory}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    onContentSizeChange={() => scrollToBottom(true)}
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode="interactive"
                    keyboardShouldPersistTaps="handled"
                    scrollEventThrottle={16}
                    maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
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
                onFocus={() => setTimeout(() => scrollToBottom(true), 150)}
                keyboardOffset={keyboardOffset}
                dynamicBottomPadding={dynamicBottomPadding}
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
    navCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
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
    creditText: {
        color: "#FDE68A",
        fontSize: 13,
        fontWeight: "700",
        marginLeft: 6,
    },


});