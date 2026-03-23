import { useAuth } from '@/providers/auth-provider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const { height } = Dimensions.get('window');

export default function SplashScreen() {
  const { isHydrated, isAuthenticated } = useAuth();
  
  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Start Entrance Animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    if (!isHydrated) return;

    const timeout = setTimeout(() => {
      router.replace(isAuthenticated ? '/(tabs)' : '/login');
    }, 2000); // Increased slightly for a better "feel"

    return () => clearTimeout(timeout);
  }, [fadeAnim, isAuthenticated, isHydrated, scaleAnim]);

  return (
    <LinearGradient 
      colors={['#0F172A', '#0F4C9C', '#1E293B']} 
      style={styles.container}
    >
      {/* Decorative Background Element */}
      <View style={styles.circleDecorator} />

      <Animated.View 
        style={[
          styles.content, 
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
        ]}
      >
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={['#38BDF8', '#1D4ED8']}
            style={styles.iconGradient}
          >
            <MaterialCommunityIcons name="shield-check-outline" size={50} color="#FFFFFF" />
          </LinearGradient>
        </View>

        <View style={styles.textStack}>
          <Text style={styles.brandTitle}>ADJUSTER</Text>
          <Text style={styles.brandSubtitle}>ASSIST</Text>
        </View>
        
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#38BDF8" />
          <Text style={styles.loadingText}>Initializing Secure Environment</Text>
        </View>
      </Animated.View>

      {/* Footer Branding */}
      <View style={styles.footer}>
        <Text style={styles.versionText}>V 1.0.8</Text>
        <Text style={styles.powerText}>POWERED BY CLAIMSCOPE CLOUD</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleDecorator: {
    position: 'absolute',
    top: -height * 0.1,
    right: -height * 0.1,
    width: height * 0.4,
    height: height * 0.4,
    borderRadius: height * 0.2,
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 24,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  textStack: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
  },
  brandSubtitle: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 8,
    marginTop: -4,
  },
  loaderContainer: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  versionText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
  },
  powerText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
  },
});