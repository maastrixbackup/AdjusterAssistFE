import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { createCheckoutSession, getSubscriptionStatus, SubscriptionStatus } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

export default function SettingsScreen() {
  const { token, email, logout } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyCheckout, setBusyCheckout] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!token) {
        return;
      }
      setLoading(true);
      try {
        const next = await getSubscriptionStatus(token);
        if (mounted) {
          setStatus(next);
        }
      } catch (error) {
        if (mounted) {
          const message = error instanceof Error ? error.message : 'Unable to load subscription';
          setErrorMessage(message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [token]);

  async function onUpgrade() {
    if (!token) {
      return;
    }
    setBusyCheckout(true);
    setErrorMessage(null);
    try {
      const { checkoutUrl } = await createCheckoutSession(token);
      await Linking.openURL(checkoutUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start checkout';
      setErrorMessage(message);
    } finally {
      setBusyCheckout(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Account</Text>
      <Text style={styles.rowLabel}>Email</Text>
      <Text style={styles.rowValue}>{email ?? '-'}</Text>

      <Text style={[styles.title, styles.sectionTitle]}>Subscription</Text>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          <Text style={styles.rowLabel}>Plan</Text>
          <Text style={styles.rowValue}>{status?.plan === 'paid' ? 'Paid' : 'Free'}</Text>

          <Text style={styles.rowLabel}>Usage this month</Text>
          <Text style={styles.rowValue}>
            {status ? `${status.usedThisMonth}/${status.monthlyLimit}` : '-'}
          </Text>

          <Text style={styles.rowLabel}>Remaining</Text>
          <Text style={styles.rowValue}>{status ? status.remainingThisMonth : '-'}</Text>

          <Text style={styles.rowLabel}>Paid Tier</Text>
          <Text style={styles.rowValue}>{status?.priceLabel ?? '$49/month'}</Text>
        </>
      )}

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <Pressable style={styles.upgradeButton} disabled={busyCheckout} onPress={onUpgrade}>
        <Text style={styles.upgradeText}>{busyCheckout ? 'Starting Checkout...' : 'Upgrade to Paid'}</Text>
      </Pressable>

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F5F8',
    padding: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#213F67',
  },
  sectionTitle: {
    marginTop: 20,
  },
  rowLabel: {
    marginTop: 12,
    color: '#556680',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rowValue: {
    color: '#1F395B',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 2,
  },
  upgradeButton: {
    marginTop: 22,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#1458A8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  logoutButton: {
    marginTop: 10,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BCC7D6',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#2E466A',
    fontWeight: '700',
  },
  error: {
    marginTop: 10,
    color: '#B43232',
  },
});
