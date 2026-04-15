import { ClaimFile } from '@/lib/api';
import { Feather } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WorkspaceMetaModalProps {
    isVisible: boolean;
    onClose: () => void;
    item: ClaimFile | null;
    onUpdate: (data: Partial<ClaimFile>) => Promise<void>;
}

// Reusable Modern Input Component
const RenderInput = ({ label, value, onChange, placeholder, icon }: any) => (
    <View style={styles.inputGroup}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.inputWrapper}>
            {icon && <Feather name={icon} size={16} color="#94A3B8" style={styles.inputIcon} />}
            <TextInput 
                style={styles.modernInput} 
                value={value || ''} 
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                selectionColor="#4F46E5"
            />
        </View>
    </View>
);

export const WorkspaceMetaModal = ({ isVisible, onClose, item, onUpdate }: WorkspaceMetaModalProps) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [editData, setEditData] = useState<Partial<ClaimFile>>({});

    useEffect(() => {
        if (isVisible && item) {
            setEditData({ ...item });
        }
    }, [isVisible, item]);

    const handleSave = async () => {
        if (!editData.claim_number?.trim() || !editData.client_name?.trim()) {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert("Required Fields", "Claim Number and Client Name are mandatory.");
            return;
        }

        setIsUpdating(true);
        try {
            await onUpdate(editData);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onClose();
        } catch (error) {
            console.error("Update failed:", error);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Error", "Failed to update workspace details.");
        } finally {
            setIsUpdating(false);
        }
    };

    const updateField = (field: keyof ClaimFile, value: string) => {
        setEditData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Modal animationType="slide" transparent visible={isVisible} onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === "ios" ? "padding" : "height"} 
                    style={styles.keyboardView}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                >
                    <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.handle} />
                        
                        <View style={styles.sheetHeader}>
                            <View>
                                <Text style={styles.sheetTitle}>Workspace Details</Text>
                                <Text style={styles.sheetSubtitle}>Manage complete claim metadata</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.circleClose}>
                                <Feather name="x" size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView 
                            showsVerticalScrollIndicator={false} 
                            contentContainerStyle={styles.scrollContent} 
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* SECTION: PRIMARY IDENTIFIERS */}
                            <Text style={styles.sectionDivider}>Core Information</Text>
                            <RenderInput 
                                label="Claim Number" 
                                value={editData.claim_number} 
                                onChange={(t: string) => updateField('claim_number', t)} 
                                placeholder="e.g. CLM-201" 
                            />
                            <RenderInput 
                                label="Policyholder / Insured" 
                                value={editData.client_name} 
                                onChange={(t: string) => updateField('client_name', t)} 
                                placeholder="Full name of insured..." 
                            />

                            {/* SECTION: POLICY & TYPE */}
                            <Text style={styles.sectionDivider}>Policy & Loss Details</Text>
                            <View style={styles.grid}>
                                <View style={styles.gridHalf}>
                                    <RenderInput 
                                        label="Policy Form" 
                                        value={editData.policy_form} 
                                        onChange={(t: string) => updateField('policy_form', t)} 
                                        placeholder="e.g. HO-3" 
                                    />
                                </View>
                                <View style={styles.gridHalf}>
                                    <RenderInput 
                                        label="Line of Business" 
                                        value={editData.line_of_business} 
                                        onChange={(t: string) => updateField('line_of_business', t)} 
                                        placeholder="e.g. Homeowners" 
                                    />
                                </View>
                            </View>

                            <View style={styles.grid}>
                                <View style={styles.gridHalf}>
                                    <RenderInput 
                                        label="Loss Type" 
                                        value={editData.loss_type} 
                                        onChange={(t: string) => updateField('loss_type', t)} 
                                        placeholder="e.g. Water" 
                                    />
                                </View>
                                <View style={styles.gridHalf}>
                                    <RenderInput 
                                        label="Jurisdiction" 
                                        value={editData.jurisdiction} 
                                        onChange={(t: string) => updateField('jurisdiction', t)} 
                                        placeholder="e.g. FL" 
                                    />
                                </View>
                            </View>

                            {/* SECTION: DATES */}
                            <Text style={styles.sectionDivider}>Timeline (YYYY-MM-DD)</Text>
                            <View style={styles.grid}>
                                <View style={styles.gridHalf}>
                                    <RenderInput 
                                        label="Date of Loss" 
                                        value={editData.date_of_loss} 
                                        onChange={(t: string) => updateField('date_of_loss', t)} 
                                        placeholder="2026-04-13" 
                                    />
                                </View>
                                <View style={styles.gridHalf}>
                                    <RenderInput 
                                        label="Reported Date" 
                                        value={editData.reported_date} 
                                        onChange={(t: string) => updateField('reported_date', t)} 
                                        placeholder="2026-04-14" 
                                    />
                                </View>
                            </View>

                            {/* SECTION: LOCATION & STAGE */}
                            <Text style={styles.sectionDivider}>Workflow Context</Text>
                            <RenderInput 
                                label="Property Address" 
                                value={editData.address} 
                                onChange={(t: string) => updateField('address', t)} 
                                placeholder="Full site address..." 
                            />
                            <RenderInput 
                                label="Current Claim Stage" 
                                value={editData.claim_stage} 
                                onChange={(t: string) => updateField('claim_stage', t)} 
                                placeholder="e.g. Inspection" 
                            />

                            {/* SECTION: STATUS TOGGLE */}
                            <Text style={styles.label}>Operational Status</Text>
                            <View style={styles.statusRow}>
                                {(['active', 'closed'] as const).map((s) => (
                                    <TouchableOpacity 
                                        key={s}
                                        onPress={() => updateField('status', s)}
                                        style={[styles.statusTab, editData.status === s && styles.statusTabActive]}
                                    >
                                        <Text style={[styles.statusTabText, editData.status === s && styles.statusTabTextActive]}>
                                            {s.toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity 
                                activeOpacity={0.8}
                                style={[styles.saveBtn, isUpdating && styles.saveBtnDisabled]} 
                                onPress={handleSave} 
                                disabled={isUpdating}
                            >
                                {isUpdating ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Update Workspace</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </Pressable>
                </KeyboardAvoidingView>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
    keyboardView: { width: '100%' },
    sheet: { 
        backgroundColor: '#FFF', 
        borderTopLeftRadius: 32, 
        borderTopRightRadius: 32, 
        paddingHorizontal: 24, 
        maxHeight: SCREEN_HEIGHT * 0.9, // Slightly taller to fit more fields
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 25
    },
    handle: { width: 36, height: 4, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
    sheetTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
    sheetSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
    circleClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
    scrollContent: { paddingBottom: 80 }, // Extra padding for keyboard
    sectionDivider: { fontSize: 12, fontWeight: '800', color: '#4F46E5', marginTop: 15, marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
    grid: { flexDirection: 'row', justifyContent: 'space-between' },
    gridHalf: { width: '48%' },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 11, fontWeight: '800', color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6, marginLeft: 4 },
    inputWrapper: {
        backgroundColor: '#F8FAFC', 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center'
    },
    inputIcon: { marginLeft: 14 },
    modernInput: { 
        flex: 1,
        padding: 14, 
        fontSize: 15, 
        color: '#1E293B', 
        fontWeight: '600'
    },
    statusRow: { flexDirection: 'row', gap: 10, marginBottom: 25, marginTop: 8 },
    statusTab: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#F8FAFC' },
    statusTabActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
    statusTabText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    statusTabTextActive: { color: '#4F46E5' },
    saveBtn: { 
        backgroundColor: '#4F46E5', 
        padding: 18, 
        borderRadius: 18, 
        alignItems: 'center', 
        marginTop: 10,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8
    },
    saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
    saveBtnDisabled: { backgroundColor: '#94A3B8', shadowOpacity: 0 }
});