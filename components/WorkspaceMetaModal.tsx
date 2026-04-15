import { ClaimFile } from '@/lib/api'; // Adjust based on your path
import { Feather } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WorkspaceMetaModalProps {
    isVisible: boolean;
    onClose: () => void;
    item: ClaimFile | null;
    onUpdate: (data: Partial<ClaimFile>) => Promise<void>;
}

const RenderInput = ({ label, value, onChange, placeholder, icon }: any) => (
    <View style={styles.inputGroup}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.inputWrapper}>
            <TextInput 
                style={styles.modernInput} 
                value={value} 
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor="#94A3B8"
                autoCapitalize="sentences"
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
        if (!editData.claim_number?.trim()) {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }
        setIsUpdating(true);
        try {
            await onUpdate(editData);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onClose();
        } catch (error) {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Modal 
            animationType="slide" 
            transparent 
            visible={isVisible} 
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === "ios" ? "padding" : "height"} 
                    style={styles.keyboardView}
                >
                    <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.handle} />
                        
                        <View style={styles.sheetHeader}>
                            <View>
                                <Text style={styles.sheetTitle}>Workspace Details</Text>
                                <Text style={styles.sheetSubtitle}>Management & Claim Metadata</Text>
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
                            <RenderInput 
                                label="Claim Number" 
                                value={editData.claim_number} 
                                onChange={(t: string) => setEditData(prev => ({ ...prev, claim_number: t }))} 
                                placeholder="e.g. CLM-102938" 
                            />
                            
                            <RenderInput 
                                label="Policyholder / Insured" 
                                value={editData.client_name} 
                                onChange={(t: string) => setEditData(prev => ({ ...prev, client_name: t }))} 
                                placeholder="Customer name..." 
                            />

                            <View style={styles.grid}>
                                <View style={styles.gridHalf}>
                                    <RenderInput label="Loss Type" value={editData.loss_type} onChange={(t: string) => setEditData(prev => ({ ...prev, loss_type: t }))} placeholder="e.g. Water" />
                                </View>
                                <View style={styles.gridHalf}>
                                    <RenderInput label="Jurisdiction" value={editData.jurisdiction} onChange={(t: string) => setEditData(prev => ({ ...prev, jurisdiction: t }))} placeholder="e.g. Florida" />
                                </View>
                            </View>

                            <RenderInput 
                                label="Property Address" 
                                value={editData.address} 
                                onChange={(t: string) => setEditData(prev => ({ ...prev, address: t }))} 
                                placeholder="Full site address..." 
                            />

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
        maxHeight: SCREEN_HEIGHT * 0.85,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 25
    },
    handle: { width: 36, height: 4, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
    sheetTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
    sheetSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
    circleClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
    scrollContent: { paddingBottom: 60 },
    grid: { flexDirection: 'row', justifyContent: 'space-between' },
    gridHalf: { width: '48%' },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 11, fontWeight: '800', color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6, marginLeft: 4 },
    inputWrapper: {
        backgroundColor: '#F8FAFC', 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        borderRadius: 16,
    },
    modernInput: { 
        padding: 16, 
        fontSize: 15, 
        color: '#1E293B', 
        fontWeight: '600'
    },
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