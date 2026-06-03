import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";

const version = Constants.expoConfig?.version;

const useItems = [
  "use the service only for lawful professional or business purposes",
  "provide accurate account and billing information",
  "maintain the confidentiality of login credentials",
  "review all generated content before use",
  "ensure submitted information may lawfully be uploaded or processed",
  "comply with applicable laws, regulations, employer policies, and claim-handling standards",
];

const prohibitedItems = [
  "use AdjusterAssist as the sole basis for claim decisions",
  "represent AI-generated content as a final coverage determination",
  "upload information you are not authorized to use",
  "attempt to reverse engineer, disrupt, overload, or misuse the service",
  "use the service for unlawful, fraudulent, or misleading purposes",
];

export default function TermsScreen() {
  const router = useRouter();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const TermsSection = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.cardDivider} />
      {children}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <SafeAreaView style={styles.safeHeader}>
        <View style={styles.headerNav}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainTitleContainer}>
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <Text style={styles.headerSubtitle}>AdjusterAssist LLC</Text>
        </View>

        <View style={styles.topInfo}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateText}>Effective Date: May 6, 2026</Text>
          </View>

          <Text style={styles.introParagraph}>
            These Terms of Service govern your access to and use of
            AdjusterAssist LLC (“AdjusterAssist,” “we,” “our,” or “us”),
            including our website, products, software, and related services.
          </Text>

          <Text style={styles.introParagraph}>
            By accessing or using AdjusterAssist, you agree to these Terms. If
            you do not agree, you should not use the service.
          </Text>
        </View>

        <TermsSection title="01. Service overview">
          <Text style={styles.bodyText}>
            AdjusterAssist provides software tools intended to support
            professional claim workflow, documentation, organization, and
            communication drafting for property insurance professionals and
            related users.
          </Text>
        </TermsSection>

        <TermsSection title="02. Professional-use disclaimer">
          <Text style={styles.bodyText}>
            AdjusterAssist is a drafting and workflow support tool only. It is
            not a claim decision-maker, legal advisor, coverage authority,
            payment authority, insurer, carrier system, public adjuster, or
            substitute for professional judgment.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 10 }]}>
            Users remain solely responsible for reviewing, editing, approving,
            and relying on any content generated or organized through the
            service.
          </Text>
        </TermsSection>

        <TermsSection title="03. No claim decisions or legal advice">
          <Text style={styles.bodyText}>
            AdjusterAssist does not make coverage determinations, payment
            decisions, liability decisions, claim approvals, claim denials, or
            legal conclusions. Any AI-assisted output must be reviewed by
            qualified professionals before use.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 10 }]}>
            Nothing provided by AdjusterAssist should be interpreted as legal
            advice, insurance coverage advice, regulatory guidance, or an
            instruction to take or avoid any claim-handling action.
          </Text>
        </TermsSection>

        <TermsSection title="04. User responsibilities">
          <Text style={[styles.bodyText, { marginBottom: 8 }]}>
            When using AdjusterAssist, you agree to:
          </Text>

          {useItems.map((item, index) => (
            <View key={index} style={styles.bulletRow}>
              <Ionicons
                name="chevron-forward"
                size={16}
                color="#3B82F6"
                style={styles.chevronIcon}
              />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </TermsSection>

        <TermsSection title="05. Submitted content">
          <Text style={styles.bodyText}>
            You are responsible for all information, prompts, files, claim
            details, documents, images, and other materials you submit to
            AdjusterAssist. You represent that you have the necessary rights,
            permissions, authority, and lawful basis to submit such information
            for processing.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 10 }]}>
            You should not submit information that violates applicable law,
            privacy obligations, confidentiality requirements, contractual
            restrictions, or claim handling rules.
          </Text>
        </TermsSection>

        <TermsSection title="06. AI-generated output">
          <Text style={styles.bodyText}>
            AI-generated content may be incomplete, inaccurate, outdated, or
            unsuitable for a particular claim, jurisdiction, policy, client,
            carrier, or business workflow. Users must independently review all
            generated content before relying on it, sharing it, storing it, or
            including it in a claim file.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 10 }]}>
            AdjusterAssist does not guarantee that any generated output is
            accurate, compliant, complete, or appropriate for any specific use.
          </Text>
        </TermsSection>

        <TermsSection title="07. Prohibited uses">
          {prohibitedItems.map((item, index) => (
            <View key={index} style={styles.simpleBulletRow}>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </TermsSection>

        <TermsSection title="08. Accounts and access">
          <Text style={styles.bodyText}>
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activity occurring under your
            account. You must notify us promptly if you believe your account has
            been accessed without authorization.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 10 }]}>
            We may suspend or restrict access if we believe an account is being
            misused, presents a security risk, violates these Terms, or may
            expose AdjusterAssist, users, systems, or third parties to harm.
          </Text>
        </TermsSection>

        <TermsSection title="09. Subscriptions and payments">
          <Text style={styles.bodyText}>
            Certain features may require a paid subscription or usage-based
            access. Pricing, billing terms, plan limits, renewal terms, and
            cancellation options may be provided at checkout, inside the
            product, or through related subscription documentation.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 10 }]}>
            Fees are generally non-refundable except where required by law or
            expressly stated otherwise.
          </Text>
        </TermsSection>

        <TermsSection title="10. Third-party services">
          <Text style={styles.bodyText}>
            AdjusterAssist may rely on third-party providers for hosting,
            authentication, analytics, payments, communications, storage, AI
            processing, and related functionality. Use of the service may
            involve processing by such providers as described in our Privacy
            Policy.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 10 }]}>
            We are not responsible for third-party services that we do not
            control.
          </Text>
        </TermsSection>

        <View style={styles.highlightCard}>
          <Text style={styles.sectionTitle}>
            11. Important professional limitation
          </Text>
          <View style={styles.cardDivider} />
          <Text style={styles.bodyText}>
            AdjusterAssist supports drafting, documentation, and workflow
            efficiency. It does not replace professional review,
            claim-handling judgment, carrier authority, legal review, policy
            interpretation, regulatory compliance review, or final approval by
            authorized personnel.
          </Text>
        </View>

        <TermsSection title="12. Disclaimers">
          <Text style={styles.bodyText}>
            The service is provided on an “as is” and “as available” basis. To
            the maximum extent permitted by law, AdjusterAssist disclaims
            warranties of any kind, whether express, implied, statutory, or
            otherwise, including warranties of accuracy, reliability, fitness for
            a particular purpose, availability, or non-infringement.
          </Text>
        </TermsSection>

        <TermsSection title="13. Limitation of liability">
          <Text style={styles.bodyText}>
            To the maximum extent permitted by law, AdjusterAssist will not be
            liable for indirect, incidental, consequential, special, punitive,
            exemplary, or similar damages arising from or related to use of the
            service, generated content, submitted information, interruptions,
            errors, or reliance on outputs.
          </Text>
        </TermsSection>

        <TermsSection title="14. Changes to these terms">
          <Text style={styles.bodyText}>
            We may update these Terms from time to time. When we do, we will
            update the Effective Date above. Continued use of our website or
            services after updated Terms are posted constitutes acceptance of
            the revised Terms.
          </Text>
        </TermsSection>

        <TermsSection title="15. Contact us">
          <Text style={[styles.bodyText, { marginBottom: 10 }]}>
            If you have questions about these Terms, you may contact us at:
          </Text>

          <View style={styles.contactCard}>
            <Text style={styles.contactName}>AdjusterAssist LLC</Text>

            <View style={styles.contactRow}>
              <MaterialCommunityIcons
                name="email-outline"
                size={16}
                color="#2563EB"
              />
              <Text style={styles.contactLink}>
                info@adjusterassistapp.com
              </Text>
            </View>

            <View style={styles.contactRow}>
              <MaterialCommunityIcons name="web" size={16} color="#2563EB" />
              <Text style={styles.contactLink}>adjusterassistapp.com</Text>
            </View>
          </View>
        </TermsSection>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>AdjusterAssist Intelligence</Text>
          <Text style={styles.footerVersion}> BUILD {version} | DEVELOPMENT</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  safeHeader: { backgroundColor: "#F8FAFC" },
  headerNav: {
    height: 56,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  backText: {
    fontSize: 16,
    color: "#1E293B",
    marginLeft: 4,
    fontWeight: "500",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  mainTitleContainer: {
    paddingHorizontal: 5,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  topInfo: {
    marginBottom: 25,
    paddingHorizontal: 5,
  },
  dateBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 15,
  },
  dateText: {
    color: "#1E40AF",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  introParagraph: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 22,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Platform.select({
      ios: {
        shadowColor: "#1E293B",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
      },
      android: { elevation: 3 },
    }),
  },
  highlightCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    ...Platform.select({
      ios: {
        shadowColor: "#1E293B",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
      },
      android: { elevation: 3 },
    }),
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginBottom: 15,
  },
  bodyText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
    paddingRight: 10,
  },
  simpleBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    paddingRight: 10,
  },
  chevronIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  dot: {
    color: "#3B82F6",
    fontSize: 18,
    lineHeight: 20,
    marginRight: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  contactCard: {
    marginTop: 10,
    gap: 10,
  },
  contactName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactLink: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "600",
  },
  footer: {
    marginTop: 20,
    alignItems: "center",
    gap: 5,
  },
  footerBrand: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94A3B8",
  },
  footerVersion: {
    fontSize: 10,
    color: "#565a5e",
    letterSpacing: 2,
  },
});