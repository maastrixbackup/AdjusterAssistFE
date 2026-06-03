import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
    Dimensions,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function PrivacyScreen() {
    const router = useRouter();

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const PolicySection = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <View style={styles.card}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.cardDivider} />
            {children}
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            
            {/* Simple Back Button Header */}
            <SafeAreaView style={styles.safeHeader}>
                <View style={styles.headerNav}>
                    <Pressable onPress={handleBack} style={({ pressed }) => [
                        styles.backButton,
                        pressed && { opacity: 0.7 }
                    ]}>
                        <Ionicons name="arrow-back" size={24} color="#1E293B" />
                        <Text style={styles.backText}>Back</Text>
                    </Pressable>
                </View>
            </SafeAreaView>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Main Heading Inside Content */}
                <View style={styles.mainTitleContainer}>
                    <Text style={styles.headerTitle}>Privacy Policy</Text>
                    <Text style={styles.headerSubtitle}>AdjusterAssist LLC</Text>
                </View>

                <View style={styles.topInfo}>
                    <View style={styles.dateBadge}>
                        <Text style={styles.dateText}>Effective Date: May 6, 2026</Text>
                    </View>
                    <Text style={styles.introParagraph}>
                        AdjusterAssist LLC (“AdjusterAssist,” “we,” “our,” or “us”) respects your privacy and is committed to protecting personal information collected through our website, products, and related services.
                    </Text>
                    <Text style={styles.introParagraph}>
                        This Privacy Policy explains how we may collect, use, disclose, and safeguard information when you visit our website, contact us, create an account, use our services, or otherwise interact with us.
                    </Text>
                </View>

                <PolicySection title="1. Who we are">
                    <Text style={styles.bodyText}>
                        AdjusterAssist LLC provides software and related services intended to support professional claim workflow, documentation, and communication drafting for property insurance professionals and related users.
                    </Text>
                </PolicySection>

                <PolicySection title="2. Information we may collect">
                    <View style={styles.listItem}>
                        <Text style={styles.listLabel}>Contact information</Text>
                        <Text style={styles.bodyText}>Name, email address, company name, phone number, and other information you provide when contacting us or submitting a form.</Text>
                    </View>
                    <View style={styles.listItem}>
                        <Text style={styles.listLabel}>Account information</Text>
                        <Text style={styles.bodyText}>Login credentials, subscription details, billing-related records, and account preferences if and when you create an account.</Text>
                    </View>
                    <View style={styles.listItem}>
                        <Text style={styles.listLabel}>Usage information</Text>
                        <Text style={styles.bodyText}>Information about how you interact with our website or services, including device information, browser type, IP address, pages viewed, session activity, referral source, and approximate location derived from IP address.</Text>
                    </View>
                    <View style={styles.listItem}>
                        <Text style={styles.listLabel}>Content you submit</Text>
                        <Text style={styles.bodyText}>Information, text, prompts, files, or other materials you choose to provide when using our services.</Text>
                    </View>
                    <View style={styles.listItem}>
                        <Text style={styles.listLabel}>Communications</Text>
                        <Text style={styles.bodyText}>Messages you send to us, support requests, and related correspondence.</Text>
                    </View>
                </PolicySection>

                <PolicySection title="3. How we use information">
                    <Text style={styles.bodyText}>We may use information to:</Text>
                    {[
                        'operate, maintain, and improve our website and services',
                        'provide customer support',
                        'respond to inquiries and requests',
                        'create and manage accounts',
                        'process subscriptions or payments',
                        'monitor usage, performance, and security',
                        'develop new features and functionality',
                        'communicate with you about updates, service information, or administrative matters',
                        'comply with legal obligations',
                        'protect our rights, users, systems, and business interests'
                    ].map((item, i) => (
                        <View key={i} style={styles.bulletRow}>
                            <View style={styles.bullet} />
                            <Text style={styles.bulletText}>{item}</Text>
                        </View>
                    ))}
                </PolicySection>

                <PolicySection title="4. AI and third-party processing">
                    <Text style={styles.bodyText}>
                        Our services may use third-party providers, including cloud hosting, authentication, analytics, payment processors, and AI-related service providers, to help deliver functionality.
                    </Text>
                    <Text style={[styles.bodyText, { marginTop: 10 }]}>
                        Information submitted by users may be processed by these service providers as necessary to operate the service. Users are responsible for ensuring they have the appropriate authority to submit any information they provide to the platform.
                    </Text>
                </PolicySection>

                <PolicySection title="5. How we may share information">
                    <Text style={styles.bodyText}>We may share information:</Text>
                    {[
                        'with service providers performing functions on our behalf',
                        'with professional advisors such as legal, accounting, or compliance advisors',
                        'in connection with a merger, acquisition, financing, or sale of assets',
                        'when required by law, subpoena, court order, or legal process',
                        'when necessary to protect rights, safety, security, or prevent fraud'
                    ].map((item, i) => (
                        <View key={i} style={styles.bulletRow}>
                            <View style={styles.bullet} />
                            <Text style={styles.bulletText}>{item}</Text>
                        </View>
                    ))}
                    <View style={styles.noticeBox}>
                        <Text style={styles.noticeText}>We do not sell personal information.</Text>
                    </View>
                </PolicySection>

                <PolicySection title="6. Data retention">
                    <Text style={styles.bodyText}>We retain information for as long as reasonably necessary to:</Text>
                    {['provide our services', 'maintain business and legal records', 'resolve disputes', 'enforce agreements', 'comply with legal obligations'].map((item, i) => (
                        <View key={i} style={styles.bulletRow}>
                            <View style={styles.bullet} />
                            <Text style={styles.bulletText}>{item}</Text>
                        </View>
                    ))}
                    <Text style={[styles.bodyText, { marginTop: 10 }]}>
                        Retention periods may vary depending on the nature of the information and the purpose for which it was collected.
                    </Text>
                </PolicySection>

                <PolicySection title="7. Security">
                    <Text style={styles.bodyText}>
                        We use reasonable administrative, technical, and organizational safeguards intended to protect information from unauthorized access, loss, misuse, or alteration. No method of transmission over the internet or electronic storage is completely secure, and we cannot guarantee absolute security.
                    </Text>
                </PolicySection>

                <PolicySection title="8. Your choices">
                    <Text style={styles.bodyText}>You may contact us to:</Text>
                    {[
                        'request access to personal information we maintain about you',
                        'request correction of inaccurate information',
                        'request deletion of information where appropriate',
                        'opt out of non-essential communications'
                    ].map((item, i) => (
                        <View key={i} style={styles.bulletRow}>
                            <View style={styles.bullet} />
                            <Text style={styles.bulletText}>{item}</Text>
                        </View>
                    ))}
                    <Text style={[styles.bodyText, { marginTop: 10, fontStyle: 'italic' }]}>
                        We may need to retain certain information where required for legal, security, contractual, or operational reasons.
                    </Text>
                </PolicySection>

                <PolicySection title="9. Cookies and analytics">
                    <Text style={styles.bodyText}>
                        Our website may use cookies, similar technologies, and analytics tools to understand traffic, improve performance, and enhance user experience. You may be able to control cookies through your browser settings.
                    </Text>
                </PolicySection>

                <PolicySection title="10. Children’s privacy">
                    <Text style={styles.bodyText}>
                        Our website and services are not directed to children under 13, and we do not knowingly collect personal information from children under 13.
                    </Text>
                </PolicySection>

                <PolicySection title="11. Professional-use notice">
                    <View style={styles.warningBox}>
                        <Ionicons name="information-circle" size={20} color="#1E3A8A" />
                        <Text style={styles.warningText}>
                            AdjusterAssist is intended for professional and business use. It is not legal advice, not insurance coverage advice, and not a claim determination service. Users remain responsible for their own professional decisions, compliance obligations, and final work product.
                        </Text>
                    </View>
                </PolicySection>

                <PolicySection title="12. Changes to this policy">
                    <Text style={styles.bodyText}>
                        We may update this Privacy Policy from time to time. When we do, we will update the Effective Date above. Continued use of our website or services after changes are posted constitutes acceptance of the updated policy.
                    </Text>
                </PolicySection>

                <PolicySection title="13. Contact us">
                    <Text style={styles.bodyText}>If you have questions about this Privacy Policy, you may contact us at:</Text>
                    <View style={styles.contactCard}>
                        <Text style={styles.contactName}>AdjusterAssist LLC</Text>
                        <View style={styles.contactRow}>
                            <MaterialCommunityIcons name="email-outline" size={16} color="#2563EB" />
                            <Text style={styles.contactLink}>info@adjusterassistapp.com</Text>
                        </View>
                        <View style={styles.contactRow}>
                            <MaterialCommunityIcons name="web" size={16} color="#2563EB" />
                            <Text style={styles.contactLink}>adjusterassistapp.com</Text>
                        </View>
                    </View>
                </PolicySection>

                <View style={styles.footer}>
                    <Text style={styles.footerBrand}>AdjusterAssist Intelligence</Text>
                    <Text style={styles.footerVersion}> BUILD {Constants.expoConfig?.version} | DEVELOPMENT</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    safeHeader: {
        backgroundColor: '#F8FAFC',
    },
    headerNav: {
        height: 56,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    backText: {
        fontSize: 16,
        color: '#1E293B',
        marginLeft: 4,
        fontWeight: '500',
    },
    mainTitleContainer: {
        paddingHorizontal: 5,
        marginBottom: 20,
    },
    headerTitle: { 
        fontSize: 28, 
        fontWeight: '900', 
        color: '#0F172A', 
        letterSpacing: -0.5 
    },
    headerSubtitle: { 
        fontSize: 16, 
        color: '#64748B', 
        fontWeight: '600',
        marginTop: 2 
    },
    scrollContent: { 
        padding: 20, 
        paddingBottom: 60 
    },
    topInfo: { marginBottom: 25, paddingHorizontal: 5 },
    dateBadge: {
        backgroundColor: '#DBEAFE',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 15,
    },
    dateText: { color: '#1E40AF', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    introParagraph: { fontSize: 15, color: '#475569', lineHeight: 22, marginBottom: 12 },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Platform.select({
            ios: { shadowColor: '#1E293B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 15 },
            android: { elevation: 3 }
        })
    },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
    cardDivider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 15 },
    bodyText: { fontSize: 14, color: '#475569', lineHeight: 22 },
    listItem: { marginBottom: 15 },
    listLabel: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 4 },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, paddingRight: 10 },
    bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3B82F6', marginTop: 8, marginRight: 12 },
    bulletText: { flex: 1, fontSize: 14, color: '#475569', lineHeight: 20 },
    noticeBox: { backgroundColor: '#F0FDF4', padding: 12, borderRadius: 12, marginTop: 10, alignItems: 'center' },
    noticeText: { color: '#16A34A', fontSize: 13, fontWeight: '700' },
    warningBox: { backgroundColor: '#F1F5F9', padding: 15, borderRadius: 12, flexDirection: 'row', gap: 10 },
    warningText: { flex: 1, fontSize: 13, color: '#1E3A8A', lineHeight: 18, fontWeight: '500' },
    contactCard: { marginTop: 10, gap: 10 },
    contactName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    contactLink: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
    footer: { marginTop: 20, alignItems: 'center', gap: 5 },
    footerBrand: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
    footerVersion: { fontSize: 10, color: '#6a6b6d', letterSpacing: 2 }
});