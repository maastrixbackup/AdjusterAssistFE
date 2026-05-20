import { supabase } from "@/lib/supabase";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function CallbackScreen() {

    const [message, setMessage] = useState(
        "Verifying your session..."
    );

    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data } =
                    await supabase.auth.getSession();
                if (data.session) {
                    setMessage(
                        "Email verified successfully"
                    );
                    setTimeout(() => {
                        router.replace("/(tabs)");
                    }, 1800);
                } else {
                    setMessage(
                        "Redirecting to login..."
                    );
                    setTimeout(() => {
                        router.replace("/login");
                    }, 1800);
                }
            } catch (error) {

                console.error(
                    "Callback session error:",
                    error
                );

                setMessage(
                    "Something went wrong"
                );

                setTimeout(() => {
                    console.log("Redirecting to login...");
                    router.replace("/login");

                }, 1800);
            }
        };

        checkSession();

    }, []);

    return (
        <View style={styles.container}>

            <StatusBar style="light" />

            <LinearGradient
                colors={[
                    "#276bbd",
                    "#1e40af",
                    "#172554"
                ]}
                style={StyleSheet.absoluteFill}
            />

            {/* Ambient Bubbles */}
            <View
                style={[
                    styles.bubble,
                    {
                        width: 220,
                        height: 220,
                        top: -60,
                        right: -40,
                    },
                ]}
            />

            <View
                style={[
                    styles.bubble,
                    {
                        width: 140,
                        height: 140,
                        bottom: -20,
                        left: -20,
                        opacity: 0.05,
                    },
                ]}
            />

            {/* Card */}
            <View style={styles.card}>

                <View style={styles.iconWrap}>

                    <LinearGradient
                        colors={[
                            "#3b82f6",
                            "#1d4ed8"
                        ]}
                        style={styles.iconGradient}
                    >

                        <Feather
                            name="shield"
                            size={34}
                            color="#fff"
                        />

                    </LinearGradient>

                </View>

                <Text style={styles.title}>
                    AdjusterAssist
                </Text>

                <Text style={styles.subtitle}>
                    Secure Authentication Gateway
                </Text>

                <View style={styles.loaderSection}>

                    <ActivityIndicator
                        size="large"
                        color="#1e40af"
                    />

                    <Text style={styles.message}>
                        {message}
                    </Text>

                </View>

                <View style={styles.footerRow}>

                    <View style={styles.dot} />

                    <Text style={styles.footerText}>
                        Establishing secure connection
                    </Text>

                </View>

            </View>

        </View>
    );
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0f172a",
        paddingHorizontal: 24,
    },

    bubble: {
        position: "absolute",
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.06)",
    },

    card: {
        width: "100%",
        maxWidth: 380,
        backgroundColor: "rgba(255,255,255,0.96)",
        borderRadius: 32,
        paddingVertical: 40,
        paddingHorizontal: 28,
        alignItems: "center",

        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.15,
        shadowRadius: 20,

        elevation: 12,
    },

    iconWrap: {
        marginBottom: 24,
    },

    iconGradient: {
        width: 84,
        height: 84,
        borderRadius: 42,
        justifyContent: "center",
        alignItems: "center",
    },

    title: {
        fontSize: 28,
        fontWeight: "800",
        color: "#0f172a",
        letterSpacing: -0.5,
    },

    subtitle: {
        marginTop: 6,
        fontSize: 14,
        color: "#64748B",
        textAlign: "center",
    },

    loaderSection: {
        marginTop: 34,
        alignItems: "center",
    },

    message: {
        marginTop: 18,
        fontSize: 15,
        fontWeight: "600",
        color: "#1e293b",
        textAlign: "center",
    },

    footerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 34,
    },

    dot: {
        width: 8,
        height: 8,
        borderRadius: 999,
        backgroundColor: "#22c55e",
        marginRight: 8,
    },

    footerText: {
        fontSize: 12,
        color: "#64748B",
        fontWeight: "500",
    },

});