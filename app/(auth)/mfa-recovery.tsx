import { recoveryCodeLogin, requestMFARecovery } from "@/lib/services/mfaService";
import { useAuth } from "@/providers/auth-provider";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Keyboard,
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
import { toast } from "sonner-native";

function formatRecoveryCode(value: string) {
    const cleaned = value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 10);

    if (cleaned.length <= 5) return cleaned;

    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
}

function normalizeRecoveryCode(value: string) {
    return value
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace(/[^A-Z0-9-]/g, "");
}

export default function MFARecoveryScreen() {
    const { width, height } = useWindowDimensions();
    const isTablet = width > 768;
    const { mfaTempSession, updateMfaTempSession, logout } = useAuth();
    const [supportLoading, setSupportLoading] = useState(false);
    const [code, setCode] = useState("");
    const [focused, setFocused] = useState(false);
    const [loading, setLoading] = useState(false);
    const [keyboardOpen, setKeyboardOpen] = useState(false);

    const logoImg = require("../../assets/images/AdjusterAssist1.png");

    useEffect(() => {
        if (!mfaTempSession?.temp_access_token) {
            router.replace("/login");
            return;
        }

        const showSub = Keyboard.addListener("keyboardDidShow", () =>
            setKeyboardOpen(true),
        );
        const hideSub = Keyboard.addListener("keyboardDidHide", () =>
            setKeyboardOpen(false),
        );

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const isValidCode = useMemo(() => {
        const cleaned = code.replace(/[^A-Z0-9]/gi, "");
        return cleaned.length === 10;
    }, [code]);

    async function handleRequestRecoveryAssistance() {
        if (!mfaTempSession?.temp_access_token) {
            toast.error("Session Missing", {
                description: "Please login again to request recovery assistance.",
            });
            router.replace("/login");
            return;
        }
        try {
            setSupportLoading(true);
            const response = await requestMFARecovery({
                temp_access_token: mfaTempSession.temp_access_token,
            });
            toast.success("Recovery Request Submitted", {
                description:
                    response.message ||
                    "Your request has been submitted for review.",
            });
        } catch (error: any) {
            toast.error("Request Failed", {
                description:
                    error?.message || "Unable to submit recovery request.",
            });
        } finally {
            setSupportLoading(false);
        }
    }

    async function handleRecoveryLogin() {
        if (!mfaTempSession?.temp_access_token) {
            toast.error("Session Missing", {
                description: "Please login again to continue.",
            });
            router.replace("/login");
            return;
        }

        const recoveryCode = normalizeRecoveryCode(code);

        if (!isValidCode) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            toast.error("Invalid Recovery Code", {
                description: "Enter a valid 10-character recovery code.",
            });
            return;
        }

        try {
            setLoading(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const response = await recoveryCodeLogin({
                recovery_code: recoveryCode,
                temp_access_token: mfaTempSession.temp_access_token,
            });

            if (!response.success || !response.requires_mfa_setup) {
                throw new Error(response.message || "Recovery failed.");
            }

            updateMfaTempSession({
                email: mfaTempSession.email,
                temp_access_token: mfaTempSession.temp_access_token,
                temp_refresh_token: mfaTempSession.temp_refresh_token,
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            toast.success("Recovery Code Accepted", {
                description: "Please set up MFA again.",
            });

            router.replace("/mfa-setup");
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            toast.error("Recovery Failed", {
                description:
                    error?.message || "Invalid or already used recovery code.",
            });
        } finally {
            setLoading(false);
        }
    }

    const logoStyle = {
        height: 50,
        width: isTablet ? 240 : width * 0.5,
        resizeMode: "contain" as const,
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.flex}
            >
                <ScrollView
                    contentContainerStyle={[
                        styles.scroll,
                        keyboardOpen && Platform.OS === "android" && {
                            paddingBottom: 50,
                        },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    showsVerticalScrollIndicator={false}
                >
                    <View
                        style={[
                            styles.arcHeader,
                            { height: Math.max(230, height * 0.32) },
                        ]}
                    >
                        <LinearGradient
                            colors={["#276bbd", "#1e40af", "#172554"]}
                            style={StyleSheet.absoluteFill}
                        />

                        <View
                            style={[
                                styles.bubble,
                                {
                                    top: -45,
                                    right: -45,
                                    width: 210,
                                    height: 210,
                                },
                            ]}
                        />
                        <View
                            style={[
                                styles.bubble,
                                {
                                    bottom: -34,
                                    left: -34,
                                    width: 135,
                                    height: 135,
                                    opacity: 0.04,
                                },
                            ]}
                        />

                        <SafeAreaView style={styles.headerContent}>
                            <View style={styles.logoContainer}>
                                <Image source={logoImg} style={logoStyle} />
                            </View>

                            <Text style={styles.arcTitle}>Account Recovery</Text>
                            <Text style={styles.arcSub}>
                                Use one of your saved recovery codes
                            </Text>
                        </SafeAreaView>
                    </View>

                    <View style={[styles.body, { marginTop: -20 }]}>
                        <View style={[styles.card, isTablet && styles.tabletCard]}>
                            <View style={styles.iconCircle}>
                                <MaterialCommunityIcons
                                    name="shield-refresh-outline"
                                    size={35}
                                    color="#1e40af"
                                />
                            </View>

                            <Text style={styles.title}>Recover MFA Access</Text>



                            <View style={styles.noticeBox}>
                                <Feather name="info" size={18} color="#1e40af" />
                                <Text style={styles.noticeText}>
                                    Each recovery code works only once. Keep the remaining
                                    codes safe.
                                </Text>
                            </View>

                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>RECOVERY CODE</Text>

                                <View
                                    style={[
                                        styles.inputBox,
                                        focused && styles.inputActive,
                                        code.length > 0 &&
                                        !isValidCode &&
                                        styles.inputWarning,
                                    ]}
                                >
                                    <Feather
                                        name="key"
                                        size={18}
                                        color={focused ? "#1e40af" : "#94A3B8"}
                                    />

                                    <TextInput
                                        value={code}
                                        onChangeText={(text) =>
                                            setCode(formatRecoveryCode(text))
                                        }
                                        onFocus={() => setFocused(true)}
                                        onBlur={() => setFocused(false)}
                                        placeholder="ABCDE-12345"
                                        placeholderTextColor="#94A3B8"
                                        autoCapitalize="characters"
                                        autoCorrect={false}
                                        keyboardType={
                                            Platform.OS === "ios"
                                                ? "default"
                                                : "visible-password"
                                        }
                                        maxLength={11}
                                        editable={!loading}
                                        style={styles.input}
                                    />
                                </View>

                                <Text style={styles.helperText}>
                                    Format: 5 characters, dash, 5 characters
                                </Text>
                            </View>

                            <Pressable
                                style={[
                                    styles.button,
                                    (!isValidCode || loading) && styles.buttonDisabled,
                                ]}
                                onPress={handleRecoveryLogin}
                                disabled={!isValidCode || loading}
                            >
                                <LinearGradient
                                    colors={
                                        !isValidCode || loading
                                            ? ["#94A3B8", "#64748B"]
                                            : ["#1e40af", "#1e3a8a"]
                                    }
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.buttonInner}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Text style={styles.buttonText}>
                                                Verify Recovery Code
                                            </Text>
                                            <View style={styles.btnArrow}>
                                                <Feather
                                                    name="arrow-right"
                                                    size={16}
                                                    color="#1e40af"
                                                />
                                            </View>
                                        </>
                                    )}
                                </LinearGradient>
                            </Pressable>

                            <Pressable
                                style={styles.secondaryButton}
                                disabled={loading}
                                onPress={() => router.replace("/mfa-login")}
                            >
                                <Feather name="shield" size={15} color="#1e40af" />
                                <Text style={styles.secondaryText}>
                                    Use Authenticator Code
                                </Text>
                            </Pressable>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.supportButton,
                                    pressed && { opacity: 0.82 },
                                    supportLoading && { opacity: 0.65 },
                                ]}
                                disabled={loading || supportLoading}
                                onPress={handleRequestRecoveryAssistance}
                            >
                                {supportLoading ? (
                                    <ActivityIndicator color="#0f172a" />
                                ) : (
                                    <>
                                        <MaterialCommunityIcons
                                            name="headset"
                                            size={18}
                                            color="#004cff"
                                        />

                                        <Text style={styles.supportButtonText}>
                                            Request Account Recovery Assistance
                                        </Text>
                                    </>
                                )}
                            </Pressable>

                            <Pressable
                                style={styles.logoutButton}
                                disabled={loading}
                                onPress={() => {
                                    logout();
                                    router.replace("/login");
                                }}
                            >
                                <Text style={styles.logoutText}>Back to Login</Text>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    scroll: {
        flexGrow: 1,
        paddingBottom: 36,
    },
    arcHeader: {
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        overflow: "hidden",
        justifyContent: "center",
    },
    bubble: {
        position: "absolute",
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    headerContent: {
        paddingHorizontal: 30,
        alignItems: "center",
    },
    logoContainer: {
        marginBottom: 18,
        backgroundColor: "rgba(255,255,255,0.1)",
        padding: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
    },
    arcTitle: {
        fontSize: 27,
        fontWeight: "800",
        color: "#fff",
        textAlign: "center",
    },
    arcSub: {
        marginTop: 6,
        fontSize: 14,
        color: "rgba(255,255,255,0.68)",
        textAlign: "center",
    },
    body: {
        flex: 1,
        paddingHorizontal: 22,
        paddingBottom: 40,
    },
    tabletCard: {
        maxWidth: 520,
        alignSelf: "center",
    },
    card: {
        width: "100%",
        backgroundColor: "#fff",
        borderRadius: 30,
        padding: 24,
        shadowColor: "#1e40af",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
    },
    iconCircle: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: "#EFF6FF",
        borderWidth: 6,
        borderColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        marginTop: -62,
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: "800",
        color: "#0F172A",
        textAlign: "center",
    },
    subtitle: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 21,
        color: "#64748B",
        textAlign: "center",
        marginBottom: 18,
    },
    noticeBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#DBEAFE",
        borderRadius: 18,
        padding: 14,
        marginBottom: 20,
        marginTop: 10,
    },
    noticeText: {
        flex: 1,
        color: "#475569",
        fontSize: 13,
        lineHeight: 19,
        fontWeight: "600",
    },
    inputWrapper: { marginBottom: 18 },
    inputLabel: {
        fontSize: 10,
        fontWeight: "800",
        color: "#94A3B8",
        letterSpacing: 1,
        marginBottom: 8,
        marginLeft: 4,
    },
    inputBox: {
        height: 60,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: "#F1F5F9",
        backgroundColor: "#F8FAFC",
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    inputActive: {
        borderColor: "#1e40af",
        backgroundColor: "#fff",
    },
    inputWarning: {
        borderColor: "#FDBA74",
    },
    input: {
        flex: 1,
        fontSize: 18,
        fontWeight: "800",
        color: "#0F172A",
        letterSpacing: 2.5,
    },
    helperText: {
        marginTop: 8,
        marginLeft: 4,
        color: "#94A3B8",
        fontSize: 12,
        fontWeight: "600",
    },
    button: {
        borderRadius: 20,
        overflow: "hidden",
    },
    buttonDisabled: {
        opacity: 0.85,
    },
    buttonInner: {
        height: 62,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 12,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "800",
    },
    btnArrow: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
    },
    secondaryButton: {
        marginTop: 18,
        marginBottom: 8,
        alignSelf: "center",
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#DBEAFE",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
    },
    secondaryText: {
        color: "#1e40af",
        fontWeight: "800",
        fontSize: 14,
    },
    logoutButton: {
        marginTop: 14,
        alignItems: "center",
        padding: 8,
    },
    logoutText: {
        color: "#64748B",
        fontWeight: "700",
        fontSize: 14,
    },
    supportContainer: {
        marginTop: 26,
        alignItems: "center",
    },

    supportLabel: {
        fontSize: 13,
        color: "#64748B",
        fontWeight: "600",
        marginBottom: 12,
        textAlign: "center",
    },

    supportButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,

        minHeight: 54,
        width: "100%",

        borderRadius: 18,
        paddingHorizontal: 18,

        backgroundColor: "#FFFFFF",

        borderWidth: 1.2,
        borderColor: "#E2E8F0",

        shadowColor: "#0F172A",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },

    supportButtonText: {
        color: "#1b5ffd",
        fontSize: 14,
        fontWeight: "700",
    },
});