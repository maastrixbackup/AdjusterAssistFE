import { enrollMFA, verifyMFAEnrollment } from "@/lib/services/mfaService";
import { useAuth } from "@/providers/auth-provider";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { toast } from "sonner-native";

export default function MFASetupScreen() {
    const { width, height } = useWindowDimensions();
    const isTablet = width > 768;
    const isSmallDevice = height < 700;

    const { mfaTempSession, completeMfaLogin, logout } = useAuth();

    const [factorId, setFactorId] = useState("");
    const [secret, setSecret] = useState("");
    const [qrCode, setQrCode] = useState("");
    const [otp, setOtp] = useState("");

    const [focused, setFocused] = useState(false);
    const [loadingEnroll, setLoadingEnroll] = useState(false);
    const [loadingVerify, setLoadingVerify] = useState(false);

    const logoImg = require("../../assets/images/AdjusterAssist1.png");

    useEffect(() => {
        if (!mfaTempSession) {
            router.replace("/login");
            return;
        }
        handleEnroll();
    }, []);

    function getQrSvgXml(qrCode: string) {
        if (!qrCode) return "";
        if (qrCode.startsWith("data:image/svg+xml")) {
            const commaIndex = qrCode.indexOf(",");
            if (commaIndex === -1) return "";
            const svgContent = qrCode.substring(commaIndex + 1);
            return decodeURIComponent(svgContent);
        }
        return qrCode;
    }

    async function handleEnroll() {
        if (!mfaTempSession) return;
        try {
            setLoadingEnroll(true);
            const data = await enrollMFA({
                temp_access_token: mfaTempSession.temp_access_token,
            });
            setFactorId(data.factor_id);
            setSecret(data.secret);
            setQrCode(data.qr_code);
        } catch (error: any) {
            toast.error("MFA Setup Failed", {
                description: error?.message || "Unable to start MFA setup.",
            });
        } finally {
            setLoadingEnroll(false);
        }
    }

    async function handleCopySecret() {
        try {
            await Clipboard.setStringAsync(secret);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            toast.success("Setup key copied", {
                description: "Paste it directly into your authenticator app.",
            });
        } catch {
            toast.error("Failed to copy setup key");
        }
    }

    async function handleVerify() {
        if (!mfaTempSession) return;
        const code = otp.trim();

        if (!factorId || code.length !== 6) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            toast.error("Invalid Code", {
                description: "Please enter a valid 6-digit verification code.",
            });
            return;
        }

        try {
            setLoadingVerify(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const session = await verifyMFAEnrollment({
                factor_id: factorId,
                code,
                temp_access_token: mfaTempSession.temp_access_token,
            });

            await completeMfaLogin(session);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            toast.success("MFA Enabled", {
                description: "Your account is now securely managed.",
            });
            router.replace("/(tabs)");
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            toast.error("Verification Failed", {
                description: error?.message || "Invalid authenticator code.",
            });
        } finally {
            setLoadingVerify(false);
        }
    }

    const logoStyle = {
        height: isSmallDevice ? 40 : 50,
        width: isTablet ? 240 : width * 0.45,
        resizeMode: "contain" as const,
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header Stack Background */}
                    <View style={[styles.arcHeader, { height: isSmallDevice ? 200 : Math.max(240, height * 0.32) }]}>
                        <LinearGradient
                            colors={["#276bbd", "#1e40af", "#172554"]}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={[styles.bubble, { top: -40, right: -40, width: 180, height: 180 }]} />
                        <View style={[styles.bubble, { bottom: -30, left: -30, width: 120, height: 120 }]} />

                        <SafeAreaView edges={['top']} style={styles.headerContent}>
                            <View style={styles.logoContainer}>
                                <Image source={logoImg} style={logoStyle} />
                            </View>
                            <Text style={[styles.arcTitle, isSmallDevice && { fontSize: 22 }]}>
                                Multi-Factor Security
                            </Text>
                            <Text style={styles.arcSub}>
                                Your workspace digital vault door 🔐
                            </Text>
                        </SafeAreaView>
                    </View>

                    {/* Core Dynamic Content Frame */}
                    <View style={[styles.body, { marginTop: isSmallDevice ? -40 : -55 }]}>
                        <View style={[styles.card, isTablet && styles.tabletCard]}>
                            <View style={styles.iconCircle}>
                                <MaterialCommunityIcons
                                    name="shield-check-outline"
                                    size={30}
                                    color="#1e40af"
                                />
                            </View>

                            <Text style={styles.title}>Secure Your Account</Text>
                            <Text style={styles.subtitle}>
                                Authenticate through custom TOTP provider apps seamlessly.
                            </Text>

                            {loadingEnroll ? (
                                <View style={styles.loadingBox}>
                                    <ActivityIndicator size="large" color="#1e40af" />
                                    <Text style={styles.loadingText}>Preparing secure setup...</Text>
                                </View>
                            ) : (
                                <>
                                    {/* QR Frame Container */}
                                    <View style={styles.qrContainer}>
                                        {qrCode ? (
                                            <View style={styles.qrWrapper}>
                                                <SvgXml
                                                    xml={getQrSvgXml(qrCode)}
                                                    width={isSmallDevice ? 160 : 190}
                                                    height={isSmallDevice ? 160 : 190}
                                                />
                                            </View>
                                        ) : (
                                            <View style={styles.qrFallback}>
                                                <Text style={styles.qrFallbackText}>QR Code unavailable</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Secret Copy Field */}
                                    <View style={styles.secretBox}>
                                        <View style={styles.secretHeader}>
                                            <Text style={styles.secretLabel}>SETUP SECURE KEY</Text>
                                            <Pressable
                                                onPress={handleCopySecret}
                                                style={({ pressed }) => [
                                                    styles.copyButton,
                                                    pressed && { opacity: 0.7 }
                                                ]}
                                            >
                                                <Feather name="copy" size={13} color="#1e40af" />
                                                <Text style={styles.copyText}>Copy</Text>
                                            </Pressable>
                                        </View>
                                        <Text selectable numberOfLines={1} adjustsFontSizeToFit style={styles.secretText}>
                                            {secret}
                                        </Text>
                                    </View>

                                    {/* Instructional Guide Layout */}
                                    <View style={styles.stepsBox}>
                                        <View style={styles.stepItem}>
                                            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View>
                                            <Text style={styles.stepText}>Open your preferred Authenticator App.</Text>
                                        </View>
                                        <View style={styles.stepItem}>
                                            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></View>
                                            <Text style={styles.stepText}>Scan the QR canvas or paste the setup key.</Text>
                                        </View>
                                        <View style={styles.stepItem}>
                                            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>3</Text></View>
                                            <Text style={styles.stepText}>Input the generated 6-digit confirmation token below.</Text>
                                        </View>
                                    </View>

                                    {/* Verification Field Component */}
                                    <View style={styles.inputWrapper}>
                                        <Text style={styles.inputLabel}>AUTHENTICATOR TOKEN CODE</Text>
                                        <View style={[styles.inputBox, focused && styles.inputActive]}>
                                            <Feather
                                                name="shield"
                                                size={18}
                                                color={focused ? "#1e40af" : "#94A3B8"}
                                            />
                                            <TextInput
                                                value={otp}
                                                onChangeText={(text) => setOtp(text.replace(/\D/g, "").slice(0, 6))}
                                                onFocus={() => setFocused(true)}
                                                onBlur={() => setFocused(false)}
                                                keyboardType="number-pad"
                                                placeholder="000000"
                                                placeholderTextColor="#94A3B8"
                                                maxLength={6}
                                                style={styles.input}
                                                textAlign="center"
                                            />
                                        </View>
                                    </View>

                                    {/* Action Verification Button */}
                                    <Pressable
                                        style={({ pressed }) => [styles.button, pressed && { opacity: 0.95 }]}
                                        onPress={handleVerify}
                                        disabled={loadingVerify}
                                    >
                                        <LinearGradient
                                            colors={["#1e40af", "#1e3a8a"]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.buttonInner}
                                        >
                                            {loadingVerify ? (
                                                <ActivityIndicator color="#fff" />
                                            ) : (
                                                <>
                                                    <Text style={styles.buttonText}>Verify & Complete Setup</Text>
                                                    <View style={styles.btnArrow}>
                                                        <Feather name="arrow-right" size={14} color="#1e40af" />
                                                    </View>
                                                </>
                                            )}
                                        </LinearGradient>
                                    </Pressable>
                                </>
                            )}

                            <Pressable
                                style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.6 }]}
                                onPress={() => {
                                    logout();
                                    router.replace("/login");
                                }}
                            >
                                <Text style={styles.logoutText}>Cancel & Go Back</Text>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    keyboardView: {
        flex: 1,
    },
    scroll: {
        flexGrow: 1,
        paddingBottom: 30,
    },
    arcHeader: {
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        overflow: "hidden",
        justifyContent: "center",
        position: 'relative',
    },
    bubble: {
        position: "absolute",
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.05)",
    },
    headerContent: {
        paddingHorizontal: 24,
        alignItems: "center",
    },
    logoContainer: {
        marginBottom: 12,
        backgroundColor: "rgba(255,255,255,0.08)",
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.15)",
    },
    arcTitle: {
        fontSize: 25,
        fontWeight: "800",
        color: "#fff",
        textAlign: "center",
        letterSpacing: -0.5,
    },
    arcSub: {
        marginTop: 4,
        fontSize: 13,
        color: "rgba(255,255,255,0.68)",
        textAlign: "center",
    },
    body: {
        flex: 1,
        paddingHorizontal: 16,
    },
    tabletCard: {
        maxWidth: 500,
        alignSelf: "center",
    },
    card: {
        width: "100%",
        backgroundColor: "#fff",
        borderRadius: 28,
        padding: 20,
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
        elevation: 6,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#EFF6FF",
        borderWidth: 4,
        borderColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        marginTop: -52,
        marginBottom: 14,
    },
    title: {
        fontSize: 21,
        fontWeight: "800",
        color: "#0F172A",
        textAlign: "center",
    },
    subtitle: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 18,
        color: "#64748B",
        textAlign: "center",
        marginBottom: 18,
        paddingHorizontal: 10,
    },
    loadingBox: {
        alignItems: "center",
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 14,
        color: "#64748B",
        fontWeight: "600",
    },
    qrContainer: {
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginBottom: 16,
        alignSelf: 'center',
    },
    qrWrapper: {
        padding: 4,
        backgroundColor: '#fff',
    },
    qrFallback: {
        width: 180,
        height: 180,
        borderRadius: 16,
        backgroundColor: "#F8FAFC",
        alignItems: "center",
        justifyContent: "center",
    },
    qrFallbackText: {
        color: "#64748B",
        fontWeight: "600",
        fontSize: 13,
    },
    secretBox: {
        backgroundColor: "#F8FAFC",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        padding: 14,
        marginBottom: 16,
    },
    secretHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    secretLabel: {
        fontSize: 10,
        fontWeight: "800",
        color: "#94A3B8",
        letterSpacing: 1,
    },
    copyButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#EFF6FF",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    copyText: {
        color: "#1e40af",
        fontWeight: "700",
        fontSize: 12,
    },
    secretText: {
        color: "#0F172A",
        fontSize: 14,
        fontWeight: "700",
        letterSpacing: 1,
        textAlign: 'left',
    },
    stepsBox: {
        backgroundColor: "#F8FAFC",
        borderRadius: 16,
        padding: 14,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        gap: 10,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    stepBadge: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    stepBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#1e40af',
    },
    stepText: {
        color: "#475569",
        fontSize: 12,
        fontWeight: "500",
        flex: 1,
    },
    inputWrapper: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: "800",
        color: "#94A3B8",
        letterSpacing: 1,
        marginBottom: 6,
        marginLeft: 2,
    },
    inputBox: {
        height: 54,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
        backgroundColor: "#F8FAFC",
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
    },
    inputActive: {
        borderColor: "#1e40af",
        backgroundColor: "#fff",
    },
    input: {
        flex: 1,
        fontSize: 20,
        fontWeight: "800",
        color: "#0F172A",
        letterSpacing: Platform.OS === 'ios' ? 8 : 6,
        paddingLeft: Platform.OS === 'ios' ? 8 : 0, 
    },
    button: {
        borderRadius: 16,
        overflow: "hidden",
    },
    buttonInner: {
        height: 54,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 10,
    },
    buttonText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "700",
    },
    btnArrow: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
    },
    logoutButton: {
        marginTop: 16,
        alignItems: "center",
        padding: 8,
    },
    logoutText: {
        color: "#64748B",
        fontWeight: "600",
        fontSize: 13,
    },
});