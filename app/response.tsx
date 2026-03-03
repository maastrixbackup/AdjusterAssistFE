import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

type Params = {
  type?: string;
  text?: string;
};

const fontRegular = 'Roboto';
const fontMedium = 'Roboto-Medium';
const fontBold = 'Roboto-Bold';

async function copyText(value: string): Promise<boolean> {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  return false;
}

export default function ResponseScreen() {
  const params = useLocalSearchParams<Params>();
  const [copied, setCopied] = useState(false);
  const responseType = useMemo(() => params.type ?? 'Response', [params.type]);
  const responseText = useMemo(() => params.text ?? '', [params.text]);

  async function onCopy() {
    if (!responseText) {
      return;
    }

    const ok = await copyText(responseText);
    if (ok) {
      setCopied(true);
      return;
    }
    Alert.alert('Copy unavailable', 'Clipboard copy is currently available on web in this build.');
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.labelWrap}>
        <Text style={styles.label}>Response Type</Text>
        <Text style={styles.value}>{responseType}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.bodyText}>{responseText || 'No response available.'}</Text>
      </View>
      <Pressable style={styles.button} onPress={onCopy}>
        <Text style={styles.buttonText}>{copied ? 'Copied' : 'Copy to Clipboard'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 18,
    backgroundColor: '#F3F5F8',
    minHeight: '100%',
  },
  labelWrap: {
    marginBottom: 10,
  },
  label: {
    color: '#576884',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: fontMedium,
  },
  value: {
    color: '#1E3E66',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
    fontFamily: fontBold,
  },
  body: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#0B1A33',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    padding: 14,
    minHeight: 260,
  },
  bodyText: {
    color: '#233B5D',
    lineHeight: 22,
    fontFamily: fontRegular,
  },
  button: {
    marginTop: 14,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#1458A8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: fontMedium,
  },
});
