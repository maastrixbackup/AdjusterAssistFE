import { ClaimFile } from '@/lib/api';
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {
    Gesture,
    GestureDetector
} from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = -70;
const DELETE_WIDTH = -100;

interface Props {
    item: ClaimFile;
    onPress: () => void;
    onUpdate: (id: number, data: { client_name?: string; claim_number?: string; status?: string }) => Promise<void>;
    onDelete: (id: number) => void;
    getStatusStyle: (status?: string) => any;
}

export default function FileWorkspaceItem({ item, onPress, onUpdate, onDelete, getStatusStyle }: Props) {
    const translateX = useSharedValue(0);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Sync local state with props when modal opens
    const [editData, setEditData] = useState({
        client_name: item.client_name || "",
        claim_number: item.claim_number || "",
        policy_number: item.policy_number|| "",
        status: (item.status?.toLowerCase() === "closed" ? "closed" : "active")
    });

    useEffect(() => {
        if (editModalVisible) {
            setEditData({
                client_name: item.client_name || "",
                claim_number: item.claim_number || "",
                policy_number: item.policy_number || "",
                status: (item.status?.toLowerCase() === "closed" ? "closed" : "active")
            });
        }
    }, [editModalVisible, item]);

    const statusStyle = getStatusStyle(item.status);

    const closeSwipe = () => {
        translateX.value = withSpring(0);
    };

    const handleSave = async () => {
        setIsUpdating(true);
        try {
            await onUpdate(item.id, editData);
            setEditModalVisible(false);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsUpdating(false);
        }
    };

    // --- Gesture Logic ---
    const pan = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onUpdate((event) => {
            // Only allow swiping to the left (negative X)
            const newX = event.translationX;
            if (newX < 0) {
                translateX.value = newX;
            }
        })
        .onEnd((event) => {
            if (event.translationX < SWIPE_THRESHOLD) {
                translateX.value = withSpring(DELETE_WIDTH);
                if (Platform.OS !== 'web') runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
            } else {
                translateX.value = withSpring(0);
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const toggleStatus = () => {
        setEditData(prev => ({
            ...prev,
            status: prev.status === "active" ? "closed" : "active"
        }));
        if (Platform.OS !== 'web') Haptics.selectionAsync();
    };

    return (
        <View style={styles.outerContainer}>
            {/* DELETE ACTION LAYER (Visible under the card) */}
            <TouchableOpacity 
                activeOpacity={0.8}
                style={styles.deleteBackground} 
                onPress={() => {
                    closeSwipe();
                    onDelete(item.id);
                }}
            >
                <View style={styles.deleteContent}>
                    <Feather name="trash-2" size={22} color="#FFF" />
                    <Text style={styles.deleteText}>Delete</Text>
                </View>
            </TouchableOpacity>

            <GestureDetector gesture={pan}>
                <Animated.View style={[styles.fileCard, animatedStyle]}>
                    <Pressable
                        onPress={() => {
                            if (translateX.value !== 0) {
                                closeSwipe();
                            } else {
                                onPress();
                            }
                        }}
                        onLongPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setEditModalVisible(true);
                        }}
                        delayLongPress={500}
                        style={({ pressed }) => [pressed && styles.pressed]}
                    >
                        <View style={styles.contentRow}>
                            <LinearGradient colors={["#F8FAFC", "#F1F5F9"]} style={styles.iconBox}>
                                <MaterialCommunityIcons 
                                    name={item.status?.toLowerCase() === 'closed' ? "folder-lock-outline" : "folder-open-outline"} 
                                    size={24} 
                                    color={item.status?.toLowerCase() === 'closed' ? "#94A3B8" : "#2563EB"} 
                                />
                            </LinearGradient>

                            <View style={styles.fileInfo}>
                                <View style={styles.fileTopRow}>
                                    <Text style={styles.fileName} numberOfLines={1}>
                                        {item.claim_number || "Untitled"}
                                    </Text>
                                    <View style={[styles.statusBadge, statusStyle.badge]}>
                                        <View style={[styles.statusDot, { backgroundColor: statusStyle.text.color }]} />
                                        <Text style={[styles.statusText, statusStyle.text]}>{item.status}</Text>
                                    </View>
                                </View>
                                <Text style={styles.clientName} numberOfLines={1}>
                                    {item.client_name || "Unassigned Client"}
                                </Text>
                            </View>
                            <Feather name="chevron-right" size={18} color="#CBD5E1" />
                        </View>
                    </Pressable>
                </Animated.View>
            </GestureDetector>

            {/* EDIT MODAL */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={editModalVisible}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setEditModalVisible(false)}
                >
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={{ width: '100%' }}
                    >
                        <Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>
                            <View style={styles.modalHandle} />
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Workspace Settings</Text>
                                <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.closeBtn}>
                                    <Feather name="x" size={20} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                            
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Client Name</Text>
                                <TextInput 
                                    style={styles.modernInput} 
                                    value={editData.client_name} 
                                    onChangeText={(t) => setEditData({...editData, client_name: t})}
                                    placeholder="e.g. Terrence Walker"
                                    placeholderTextColor="#CBD5E1"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Claim Number</Text>
                                <TextInput 
                                    style={styles.modernInput} 
                                    value={editData.claim_number} 
                                    onChangeText={(t) => setEditData({...editData, claim_number: t})}
                                    placeholder="e.g. CLM-8829"
                                    placeholderTextColor="#CBD5E1"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Policy Number</Text>
                                <TextInput 
                                    style={styles.modernInput} 
                                    value={editData.policy_number} 
                                    onChangeText={(t) => setEditData({...editData, policy_number: t})}
                                    placeholder="e.g. POL-D12"
                                    placeholderTextColor="#CBD5E1"
                                />
                            </View>

                            <View style={styles.statusToggleRow}>
                                <View>
                                    <Text style={styles.label}>Workspace Status</Text>
                                    <Text style={styles.statusSubLabel}>Toggle to mark as complete</Text>
                                </View>
                                <TouchableOpacity 
                                    style={[styles.statusToggle, editData.status === 'closed' && styles.statusToggleclosed]} 
                                    onPress={toggleStatus}
                                >
                                    <Text style={[styles.statusToggleText, editData.status === 'closed' && styles.statusToggleTextclosed]}>
                                        {editData.status}
                                    </Text>
                                    <MaterialCommunityIcons 
                                        name={editData.status === 'active' ? "check-circle" : "lock"} 
                                        size={16} 
                                        color={editData.status === 'active' ? "#059669" : "#64748B"} 
                                    />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity 
                                style={[styles.primaryBtn, isUpdating && styles.disabledBtn]} 
                                onPress={handleSave} 
                                disabled={isUpdating}
                            >
                                {isUpdating ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.primaryBtnText}>Save Changes</Text>
                                )}
                            </TouchableOpacity>
                        </Pressable>
                    </KeyboardAvoidingView>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: { 
        marginBottom: 12, 
        backgroundColor: '#EF4444', 
        borderRadius: 24,
        marginHorizontal: 16,
    },
    deleteBackground: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteContent: { 
        alignItems: 'center', 
        gap: 4, 
        paddingLeft: 10 
    },
    deleteText: { 
        color: '#FFF', 
        fontSize: 10, 
        fontWeight: '900', 
        textTransform: 'uppercase' 
    },
    fileCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: "#F1F5F9",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    contentRow: { flexDirection: 'row', alignItems: 'center' },
    pressed: { opacity: 0.7, backgroundColor: '#F8FAFC' },
    iconBox: { 
        width: 48, 
        height: 48, 
        borderRadius: 14, 
        alignItems: "center", 
        justifyContent: "center", 
        marginRight: 14 
    },
    fileInfo: { flex: 1 },
    fileTopRow: { 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: 'center', 
        marginBottom: 2 
    },
    fileName: { fontSize: 15, fontWeight: "800", color: "#0F172A", flex: 1 },
    clientName: { fontSize: 13, color: "#64748B", fontWeight: '500' },
    statusBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 8, 
        paddingVertical: 3, 
        borderRadius: 8, 
        gap: 5,
        marginLeft: 8
    },
    statusDot: { width: 5, height: 5, borderRadius: 2.5 },
    statusText: { fontSize: 10, fontWeight: "800", textTransform: 'uppercase' },
    
    // Modal Styles
    modalOverlay: { 
        flex: 1, 
        backgroundColor: 'rgba(15, 23, 42, 0.4)', 
        justifyContent: 'flex-end' 
    },
    modalCard: { 
        backgroundColor: '#FFF', 
        borderTopLeftRadius: 32, 
        borderTopRightRadius: 32, 
        padding: 24, 
        paddingTop: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20
    },
    modalHandle: { 
        width: 36, 
        height: 4, 
        backgroundColor: '#E2E8F0', 
        borderRadius: 2, 
        alignSelf: 'center', 
        marginBottom: 20 
    },
    modalHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24 
    },
    modalTitle: { fontSize: 19, fontWeight: '900', color: '#0F172A' },
    closeBtn: { 
        width: 32, 
        height: 32, 
        borderRadius: 16, 
        backgroundColor: '#F1F5F9', 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    inputGroup: { marginBottom: 18 },
    label: { 
        fontSize: 11, 
        fontWeight: '800', 
        color: '#94A3B8', 
        marginBottom: 8, 
        textTransform: 'uppercase', 
        letterSpacing: 0.5 
    },
    statusSubLabel: { fontSize: 12, color: '#94A3B8', marginTop: -4 },
    modernInput: { 
        backgroundColor: '#F8FAFC', 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        borderRadius: 14, 
        padding: 14, 
        fontSize: 15, 
        color: '#0F172A' 
    },
    statusToggleRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 32,
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 16
    },
    statusToggle: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 6, 
        backgroundColor: '#DCFCE7', 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#10B981'
    },
    statusToggleclosed: { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
    statusToggleText: { fontSize: 12, fontWeight: '800', color: '#059669' },
    statusToggleTextclosed: { color: '#64748B' },
    primaryBtn: { 
        backgroundColor: '#0F172A', 
        padding: 18, 
        borderRadius: 16, 
        alignItems: 'center',
        marginBottom: Platform.OS === 'ios' ? 20 : 0
    },
    primaryBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
    disabledBtn: { backgroundColor: '#94A3B8' }
});