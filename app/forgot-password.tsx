import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/providers/auth-provider';

export default function ForgotPasswordScreen() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!email.trim()) {
      setMessage('Please enter your email.');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await sendPasswordReset(email.trim());
      setMessage('If this email exists, a reset link has been sent.');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Unable to process request';
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your email to receive reset instructions.</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          style={styles.input}
        />
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Pressable style={styles.button} onPress={handleReset} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Send Link</Text>}
        </Pressable>
        <Pressable onPress={() => router.replace('/login')}>
          <Text style={styles.link}>Back to login</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F7FC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#143D72',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 16,
    color: '#4F5F78',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CFD8E4',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  message: {
    marginTop: 10,
    color: '#334155',
  },
  button: {
    marginTop: 14,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#1458A8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  link: {
    marginTop: 14,
    color: '#1458A8',
    textAlign: 'center',
    fontWeight: '600',
  },
});
