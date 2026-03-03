import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';

export default function SplashScreen() {
  const { isHydrated, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const timeout = setTimeout(() => {
      router.replace(isAuthenticated ? '/(tabs)' : '/login');
    }, 900);

    return () => clearTimeout(timeout);
  }, [isAuthenticated, isHydrated]);

  return (
    <LinearGradient colors={['#1E63B6', '#0B3C7A']} style={styles.container}>
      <Text style={styles.title}>Adjuster Assist</Text>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
