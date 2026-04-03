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
    ScrollView,
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
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = -75;
const DELETE_WIDTH = -110;

interface Props {
    item: ClaimFile;
    onPress: () => void;
    onUpdate: (data: Partial<ClaimFile>) => Promise<void>;
    onDelete: () => void;
    getStatusStyle: (status?: string) => any;
}

export default function FileWorkspaceItem({ item, onPress, onUpdate, onDelete, getStatusStyle }: Props) {
    const translateX = useSharedValue(0);
    const scale = useSharedValue(1);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [editData, setEditData] = useState<Partial<ClaimFile>>({});

    useEffect(() => {
        if (editModalVisible) {
            setEditData({
                claim_number: item.claim_number || "",
                client_name: item.client_name || "",
                address: item.address || "",
                policy_form: item.policy_form || "",
                date_of_loss: item.date_of_loss || "",
                reported_date: item.reported_date || "",
                loss_type: item.loss_type || "",
                jurisdiction: item.jurisdiction || "",
                line_of_business: item.line_of_business || "",
                claim_stage: item.claim_stage || "",
                status: (item.status?.toLowerCase() === "closed" ? "closed" : "active") as "active" | "closed"
            });
        }
    }, [editModalVisible, item]);

    const statusStyle = getStatusStyle(item.status);

    const handlePressIn = () => { scale.value = withTiming(0.97, { duration: 100 }); };
    const handlePressOut = () => { scale.value = withSpring(1); };

    const closeSwipe = () => { translateX.value = withSpring(0); };

    const handleSave = async () => {
        if (!editData.claim_number?.trim()) {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }
        setIsUpdating(true);
        try {
            await onUpdate(editData);
            setEditModalVisible(false);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsUpdating(false);
        }
    };

    const pan = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onUpdate((event) => {
            if (event.translationX < 0) translateX.value = event.translationX;
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
        transform: [
            { translateX: translateX.value },
            { scale: scale.value }
        ],
    }));

    const deleteOpacityStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [DELETE_WIDTH, 0], [1, 0]),
        transform: [{ scale: interpolate(translateX.value, [DELETE_WIDTH, 0], [1, 0.5]) }]
    }));

    const RenderInput = ({ label, value, keyName, placeholder }: { label: string, value?: string, keyName: keyof ClaimFile, placeholder: string }) => (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <TextInput 
                style={styles.modernInput} 
                value={value} 
                onChangeText={(t) => setEditData({ ...editData, [keyName]: t })}
                placeholder={placeholder}
                placeholderTextColor="#94A3B8"
            />
        </View>
    );

    return (
        <View style={styles.wrapper}>
            <TouchableOpacity 
                activeOpacity={0.9}
                style={styles.deleteAction} 
                onPress={() => { closeSwipe(); onDelete(); }}
            >
                <Animated.View style={[styles.deleteContent, deleteOpacityStyle]}>
                    <Feather name="trash-2" size={24} color="#FFF" />
                    <Text style={styles.deleteText}>Delete</Text>
                </Animated.View>
            </TouchableOpacity>

            <GestureDetector gesture={pan}>
                <Animated.View style={[styles.fileCard, animatedStyle]}>
                    <Pressable
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        onPress={() => { translateX.value !== 0 ? closeSwipe() : onPress(); }}
                        onLongPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                            setEditModalVisible(true);
                        }}
                        delayLongPress={400}
                        style={styles.pressArea}
                    >
                        <View style={styles.mainRow}>
                            <LinearGradient colors={["#6366F1", "#4F46E5"]} style={styles.statusLine} />
                            
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons 
                                    name={item.status?.toLowerCase() === 'closed' ? "folder-lock" : "folder-text"} 
                                    size={28} 
                                    color={item.status?.toLowerCase() === 'closed' ? "#94A3B8" : "#4F46E5"} 
                                />
                            </View>

                            <View style={styles.infoColumn}>
                                <View style={styles.headerRow}>
                                    <Text style={styles.claimNoLabel}>Claim #</Text>
                                    <Text style={styles.claimNoText}>{item.claim_number || "---"}</Text>
                                </View>
                                <Text style={styles.clientText} numberOfLines={1}>
                                    {item.client_name || "New Property Claim"}
                                </Text>
                                <View style={styles.badgeRow}>
                                    <View style={[styles.miniBadge, { backgroundColor: statusStyle.badge.backgroundColor }]}>
                                        <Text style={[styles.miniBadgeText, { color: statusStyle.text.color }]}>
                                            {item.status?.toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={styles.stageText}>• {item.claim_stage || "Initial Intake"}</Text>
                                </View>
                            </View>

                            <Feather name="chevron-right" size={20} color="#E2E8F0" />
                        </View>
                    </Pressable>
                </Animated.View>
            </GestureDetector>

            <Modal animationType="slide" transparent visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
                <View style={styles.overlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardView}>
                        <View style={styles.sheet}>
                            <View style={styles.handle} />
                            <View style={styles.sheetHeader}>
                                <Text style={styles.sheetTitle}>File Parameters</Text>
                                <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.circleClose}>
                                    <Feather name="x" size={20} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                                <RenderInput label="Claim ID" value={editData.claim_number} keyName="claim_number" placeholder="Assign Claim ID..." />
                                <RenderInput label="Policyholder" value={editData.client_name} keyName="client_name" placeholder="John Doe..." />
                                <RenderInput label="Loss Location" value={editData.address} keyName="address" placeholder="123 Maple St..." />
                                
                                <View style={styles.grid}>
                                    <View style={styles.gridHalf}><RenderInput label="Form" value={editData.policy_form} keyName="policy_form" placeholder="HO3" /></View>
                                    <View style={styles.gridHalf}><RenderInput label="Cause" value={editData.loss_type} keyName="loss_type" placeholder="Wind" /></View>
                                </View>

                                <View style={styles.grid}>
                                    <View style={styles.gridHalf}><RenderInput label="DOL" value={editData.date_of_loss} keyName="date_of_loss" placeholder="YYYY-MM-DD" /></View>
                                    <View style={styles.gridHalf}><RenderInput label="Reported" value={editData.reported_date} keyName="reported_date" placeholder="YYYY-MM-DD" /></View>
                                </View>

                                <RenderInput label="LOB" value={editData.line_of_business} keyName="line_of_business" placeholder="Residential" />
                                <RenderInput label="Workflow Stage" value={editData.claim_stage} keyName="claim_stage" placeholder="Inspection" />

                                <TouchableOpacity 
                                    activeOpacity={0.8}
                                    style={[styles.saveBtn, isUpdating && styles.saveBtnDisabled]} 
                                    onPress={handleSave} 
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Update File Metadata</Text>}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: { marginBottom: 16 },
    deleteAction: { 
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 110, 
        backgroundColor: '#EF4444', borderRadius: 24, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 25 
    },
    deleteContent: { alignItems: 'center', gap: 4 },
    deleteText: { color: '#FFF', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    fileCard: { 
        backgroundColor: "#FFFFFF", borderRadius: 24, 
        ...Platform.select({
            ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
            android: { elevation: 4 }
        }),
        borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden'
    },
    pressArea: { padding: 20 },
    mainRow: { flexDirection: 'row', alignItems: 'center' },
    statusLine: { position: 'absolute', left: -20, top: -20, bottom: -20, width: 6 },
    iconContainer: { 
        width: 56, height: 56, borderRadius: 18, backgroundColor: '#F8FAFC', 
        alignItems: 'center', justifyContent: 'center', marginRight: 16,
        borderWidth: 1, borderColor: '#F1F5F9'
    },
    infoColumn: { flex: 1 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    claimNoLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginRight: 6 },
    claimNoText: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
    clientText: { fontSize: 14, color: '#64748B', fontWeight: '600', marginBottom: 8 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    miniBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    miniBadgeText: { fontSize: 10, fontWeight: '900' },
    stageText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
    
    overlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.6)', justifyContent: 'flex-end' },
    keyboardView: { width: '100%' },
    sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 24, maxHeight: SCREEN_HEIGHT * 0.88 },
    handle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginTop: 14, marginBottom: 20 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    sheetTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
    circleClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingBottom: 50 },
    grid: { flexDirection: 'row', justifyContent: 'space-between' },
    gridHalf: { width: '48%' },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 8, textTransform: 'uppercase', marginLeft: 4 },
    modernInput: { 
        backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#F1F5F9', 
        borderRadius: 16, padding: 16, fontSize: 16, color: '#0F172A', fontWeight: '500'
    },
    saveBtn: { backgroundColor: '#4F46E5', padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: '#FFF', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
    saveBtnDisabled: { backgroundColor: '#CBD5E1' }
});