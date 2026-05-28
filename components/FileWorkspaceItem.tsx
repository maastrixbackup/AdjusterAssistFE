import { ClaimFile } from '@/lib/api';
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from 'expo-haptics';
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = -75;
const DELETE_WIDTH = -110;

// Date Formatter Utility
const getRelativeTime = (dateString?: string) => {
    if (!dateString) return "Just now";

    const now = new Date();
    const then = new Date(dateString);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `${interval}y ago`;

    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval}mo ago`;

    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval}d ago`;

    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval}h ago`;

    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval}m ago`;

    return "Just now";
};

interface Props {
    item: ClaimFile;
    onPress: () => void;
    onUpdate: (data: Partial<ClaimFile>) => Promise<void>;
    onDelete: () => void;
    getStatusStyle: (status?: string) => any;
}

const RenderDateInput = React.memo(({
    label,
    value,
    onPress,
}: {
    label: string;
    value?: string;
    onPress: () => void;
}) => (
    <View style={styles.inputGroup}>
        <Text style={styles.label}>{label}</Text>

        <Pressable
            onPress={onPress}
            style={styles.dateInputWrapper}
        >
            <View style={styles.dateLeft}>
                <MaterialCommunityIcons
                    name="calendar-range"
                    size={18}
                    color="#64748B"
                />

                <Text
                    style={[
                        styles.dateInputText,
                        !value && { color: "#94A3B8" }
                    ]}
                >
                    {value || "Select date"}
                </Text>
            </View>

            <Feather
                name="chevron-down"
                size={16}
                color="#94A3B8"
            />
        </Pressable>
    </View>
));

RenderDateInput.displayName = "RenderDateInput"

const RenderInput = React.memo(({
    label,
    value,
    onChange,
    placeholder
}: {
    label: string,
    value?: string,
    onChange: (t: string) => void,
    placeholder: string
}) => (
    <View style={styles.inputGroup}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
            style={styles.modernInput}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            autoCapitalize="sentences"
            selectionColor="#0a2a81"
        />
    </View>
));
RenderInput.displayName = "RenderInput";

const FileWorkspaceItem = React.memo(({ item, onPress, onUpdate, onDelete, getStatusStyle }: Props) => {
    const insets = useSafeAreaInsets();
    const translateX = useSharedValue(0);
    const scale = useSharedValue(1);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [editData, setEditData] = useState<Partial<ClaimFile>>({});

    const [showDatePicker, setShowDatePicker] = useState<{
        visible: boolean;
        field: "date_of_loss" | "reported_date" | null;
    }>({
        visible: false,
        field: null,
    });
    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    const openDatePicker = (
        field: "date_of_loss" | "reported_date"
    ) => {
        const currentValue = editData[field];

        setTempDate(
            currentValue ? new Date(currentValue) : new Date()
        );

        setShowDatePicker({
            visible: true,
            field,
        });

        if (Platform.OS !== "web") {
            Haptics.selectionAsync();
        }
    };

    const [tempDate, setTempDate] = useState(new Date());

    // Reset edit data when modal opens
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
                status: (item.status?.toLowerCase() === "closed" ? "closed" : "active") as any
            });
        }
    }, [editModalVisible, item]);

    // OPTIMIZATION: Memoize calculated styles and values
    const statusStyle = useMemo(() => getStatusStyle(item.status), [item.status, getStatusStyle]);
    const relativeTime = useMemo(() => getRelativeTime(item.updated_at), [item.updated_at]);

    // OPTIMIZATION: Memoize Interaction Handlers
    const handlePressIn = useCallback(() => {
        scale.value = withTiming(0.98, { duration: 150 });
    }, [scale]);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1);
    }, [scale]);

    const closeSwipe = useCallback(() => {
        translateX.value = withSpring(0);
    }, [translateX]);

    const handleSave = useCallback(async () => {
        if (!editData.claim_number?.trim()) {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }
        setIsUpdating(true);
        try {
            // FIX: This will work correctly if parent passes 'mutateAsync'
            await onUpdate(editData);
            setEditModalVisible(false);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsUpdating(false);
        }
    }, [editData, onUpdate]);

    // OPTIMIZATION: Memoize the Gesture Object
    const pan = useMemo(() =>
        Gesture.Pan()
            .activeOffsetX([-10, 10])
            .onUpdate((event) => {
                if (event.translationX < 0) translateX.value = event.translationX;
            })
            .onEnd((event) => {
                if (event.translationX < SWIPE_THRESHOLD) {
                    translateX.value = withSpring(DELETE_WIDTH);
                    if (Platform.OS !== 'web') runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
                } else {
                    translateX.value = withSpring(0);
                }
            }),
        [translateX]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { scale: scale.value }
        ],
    }));

    const deleteOpacityStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [DELETE_WIDTH, 0], [1, 0]),
        transform: [{ scale: interpolate(translateX.value, [DELETE_WIDTH, 0], [1, 0.8]) }]
    }));

    return (
        <View style={styles.wrapper}>
            <TouchableOpacity
                activeOpacity={1}
                style={styles.deleteAction}
                onPress={() => { closeSwipe(); onDelete(); }}
            >
                <Animated.View style={[styles.deleteContent, deleteOpacityStyle]}>
                    <View style={styles.deleteIconBg}>
                        <Feather name="trash-2" size={20} color="#FFF" />
                    </View>
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
                            <View style={styles.iconWrapper}>
                                <LinearGradient
                                    colors={item.status?.toLowerCase() === 'closed' ? ["#F1F5F9", "#E2E8F0"] : ["#EEF2FF", "#E0E7FF"]}
                                    style={styles.iconContainer}
                                >
                                    <MaterialCommunityIcons
                                        name={item.status?.toLowerCase() === 'closed' ? "folder-lock-outline" : "folder-open"}
                                        size={26}
                                        color={item.status?.toLowerCase() === 'closed' ? "#64748B" : "#1856ff"}
                                    />
                                </LinearGradient>
                            </View>

                            <View style={styles.infoColumn}>
                                <View style={styles.headerRow}>
                                    <Text style={styles.claimNoText}>Claim: {item.claim_number || "NO-ID"}</Text>
                                    <View style={[styles.miniBadge, { backgroundColor: statusStyle.badge.backgroundColor }]}>
                                        <View style={[styles.statusDot, { backgroundColor: statusStyle.text.color }]} />
                                        <Text style={[styles.miniBadgeText, { color: statusStyle.text.color }]}>
                                            {item.status?.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.clientText} numberOfLines={1}>
                                    Insured: {item.client_name || "Untitled Workspace"}
                                </Text>

                                <View style={styles.metaRow}>
                                    <Text style={styles.stageText}>Stage: {item.claim_stage?.replace('_', " ").toLocaleUpperCase() || "INTAKE"}</Text>
                                    <Text style={styles.metaDivider}>|</Text>
                                    <Text style={styles.dateText}>{relativeTime}</Text>
                                </View>
                            </View>

                            <Feather name="chevron-right" size={18} color="#CBD5E1" />
                        </View>
                    </Pressable>
                </Animated.View>
            </GestureDetector>

            <Modal
                animationType="slide"
                transparent
                visible={editModalVisible}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.overlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.keyboardView}
                    >
                        <View style={styles.sheet}>
                            <View style={styles.handle} />
                            <View style={styles.sheetHeader}>
                                <View>
                                    <Text style={styles.sheetTitle}>File Details</Text>
                                    <Text style={styles.sheetSubtitle}>Update claim metadata and status</Text>
                                </View>
                                <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.circleClose}>
                                    <Feather name="x" size={18} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={[
                                    styles.scrollContent,
                                    showDatePicker.visible &&
                                    Platform.OS === "ios" && {
                                        paddingBottom: 340,
                                    },
                                ]}
                                keyboardShouldPersistTaps="handled"
                            >
                                <RenderInput
                                    label="Claim Identifier"
                                    value={editData.claim_number}
                                    onChange={(t) => setEditData(prev => ({ ...prev, claim_number: t }))}
                                    placeholder="Enter claim number..."
                                />
                                <RenderInput
                                    label="Client / Policyholder"
                                    value={editData.client_name}
                                    onChange={(t) => setEditData(prev => ({ ...prev, client_name: t }))}
                                    placeholder="Full name..."
                                />
                                <RenderInput
                                    label="Site Address"
                                    value={editData.address}
                                    onChange={(t) => setEditData(prev => ({ ...prev, address: t }))}
                                    placeholder="Property address..."
                                />

                                <View style={styles.grid}>
                                    <View style={styles.gridHalf}>
                                        <RenderInput label="Policy Form" value={editData.policy_form} onChange={(t) => setEditData(prev => ({ ...prev, policy_form: t }))} placeholder="e.g. HO3" />
                                    </View>
                                    <View style={styles.gridHalf}>
                                        <RenderInput label="Loss Type" value={editData.loss_type} onChange={(t) => setEditData(prev => ({ ...prev, loss_type: t }))} placeholder="e.g. Fire" />
                                    </View>
                                </View>

                                <View style={styles.grid}>
                                    <View style={styles.gridHalf}>
                                        <RenderDateInput
                                            label="Loss Date"
                                            value={editData.date_of_loss}
                                            onPress={() => openDatePicker("date_of_loss")}
                                        />
                                    </View>
                                    <View style={styles.gridHalf}>
                                        <RenderDateInput
                                            label="Reported"
                                            value={editData.reported_date}
                                            onPress={() => openDatePicker("reported_date")}
                                        />
                                    </View>
                                </View>

                                <RenderInput label="Business Line" value={editData.line_of_business} onChange={(t) => setEditData(prev => ({ ...prev, line_of_business: t }))} placeholder="Commercial/Residential" />
                                <RenderInput label="Current Stage" value={editData.claim_stage} onChange={(t) => setEditData(prev => ({ ...prev, claim_stage: t }))} placeholder="e.g. Inspection" />

                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={[styles.saveBtn, isUpdating && styles.saveBtnDisabled]}
                                    onPress={handleSave}
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                    {showDatePicker.visible &&
                        Platform.OS === "android" && (
                            <DateTimePicker
                                value={tempDate}
                                mode="date"
                                display="calendar"
                                onChange={(event, selectedDate) => {
                                    const field = showDatePicker.field;

                                    setShowDatePicker({
                                        visible: false,
                                        field: null,
                                    });

                                    if (
                                        event.type === "dismissed" ||
                                        !selectedDate ||
                                        !field
                                    ) {
                                        return;
                                    }

                                    setEditData(prev => ({
                                        ...prev,
                                        [field]: formatDate(selectedDate),
                                    }));

                                    Haptics.notificationAsync(
                                        Haptics.NotificationFeedbackType.Success
                                    );
                                }}
                            />
                        )
                    }
                    {showDatePicker.visible &&
                        Platform.OS === "ios" && (
                            <View
                                style={[
                                    styles.iosPickerPanel,
                                    {
                                        bottom: Math.max(insets.bottom + 72, 90),
                                    },
                                ]}
                            >
                                <View style={styles.iosPickerHeader}>
                                    <TouchableOpacity
                                        onPress={() =>
                                            setShowDatePicker({
                                                visible: false,
                                                field: null,
                                            })
                                        }
                                    >
                                        <Text style={styles.iosCancel}>
                                            Cancel
                                        </Text>
                                    </TouchableOpacity>

                                    <Text style={styles.iosTitle}>
                                        Select Date
                                    </Text>

                                    <TouchableOpacity
                                        onPress={() => {
                                            const field = showDatePicker.field;

                                            if (!field) return;

                                            setEditData(prev => ({
                                                ...prev,
                                                [field]: formatDate(tempDate),
                                            }));

                                            setShowDatePicker({
                                                visible: false,
                                                field: null,
                                            });

                                            Haptics.notificationAsync(
                                                Haptics.NotificationFeedbackType.Success
                                            );
                                        }}
                                    >
                                        <Text style={styles.iosDone}>
                                            Done
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <DateTimePicker
                                    value={tempDate}
                                    mode="date"
                                    display="spinner"
                                    onChange={(_, selectedDate) => {
                                        if (selectedDate) {
                                            setTempDate(selectedDate);
                                        }
                                    }}
                                />
                            </View>
                        )}
                </View>
            </Modal>
        </View>
    );
});
FileWorkspaceItem.displayName = "FileWorkspaceItem";


const styles = StyleSheet.create({
    wrapper: { marginBottom: 14, marginHorizontal: 4 },
    deleteAction: {
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 120,
        backgroundColor: '#F87171', borderRadius: 24, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 20
    },
    deleteIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    deleteContent: { alignItems: 'center' },
    deleteText: { color: '#FFF', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },

    fileCard: {
        backgroundColor: "#FFFFFF", borderRadius: 24,
        ...Platform.select({
            ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16 },
            android: { elevation: 3 }
        }),
        borderWidth: 1, borderColor: '#F1F5F9'
    },
    pressArea: { padding: 18 },
    mainRow: { flexDirection: 'row', alignItems: 'center' },
    iconWrapper: { marginRight: 16 },
    iconContainer: {
        width: 52, height: 52, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)'
    },
    infoColumn: { flex: 1, justifyContent: 'center' },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
    claimNoText: { fontSize: 15, fontWeight: '800', color: '#1E293B', letterSpacing: -0.3 },
    clientText: { fontSize: 13, color: '#64748B', fontWeight: '500', marginBottom: 6 },
    metaRow: { flexDirection: 'row', alignItems: "center", justifyContent: 'space-between' },
    miniBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusDot: { width: 4, height: 4, borderRadius: 2, marginRight: 5 },
    miniBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
    metaDivider: { marginHorizontal: 6, color: '#CBD5E1', fontSize: 10 },
    stageText: { fontSize: 11, color: '#0a2a81', fontWeight: '700' },
    dateText: { fontSize: 11, color: '#7f8c9e', fontWeight: '500' },

    overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'flex-end' },
    keyboardView: { width: '100%' },
    sheet: {
        backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32,
        paddingHorizontal: 24, maxHeight: SCREEN_HEIGHT * 0.9
    },
    handle: { width: 36, height: 4, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    sheetTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
    sheetSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
    circleClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
    scrollContent: { paddingBottom: 60 },
    grid: { flexDirection: 'row', justifyContent: 'space-between' },
    gridHalf: { width: '48%' },
    inputGroup: { marginBottom: 18 },
    label: { fontSize: 11, fontWeight: '800', color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 },
    modernInput: {
        backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
        borderRadius: 14, padding: 14, fontSize: 15, color: '#1E293B', fontWeight: '500'
    },
    saveBtn: { backgroundColor: '#0a2a81', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
    saveBtnDisabled: { backgroundColor: '#94A3B8', shadowOpacity: 0 },
    dateInputWrapper: {
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 14,
        paddingHorizontal: 14,
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    dateLeft: {
        flexDirection: "row",
        alignItems: "center",
    },

    dateInputText: {
        marginLeft: 10,
        fontSize: 15,
        fontWeight: "500",
        color: "#1E293B",
    },

    iosPickerPanel: {
        position: "absolute",
        left: 0,
        right: 0,
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 30,
    },

    iosPickerHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        marginBottom: 4,
    },

    iosCancel: {
        color: "#64748B",
        fontWeight: "700",
        fontSize: 14,
    },

    iosDone: {
        color: "#0a2a81",
        fontWeight: "800",
        fontSize: 14,
    },

    iosTitle: {
        color: "#0F172A",
        fontWeight: "800",
        fontSize: 14,
    },
});

export default FileWorkspaceItem;