// NotificationSettings.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';

// 1. Define the shape of your props
interface NotificationSettingsProps {
  preferences: {
    claimUpdates: boolean;
    weeklySummary: boolean;
  };
  onUpdate: (key: string, value: boolean) => void;
}

// 2. Apply the type to the component
export const NotificationSettings = ({ 
  preferences, 
  onUpdate 
}: NotificationSettingsProps) => {
  
  const handleToggle = (key: string, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdate(key, value);
  };

  return (
    <View style={styles.inlineContainer}>
      <View style={styles.optionRow}>
        <View style={styles.optionInfo}>
          <View style={[styles.iconBg, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="document-text" size={16} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.optionLabel}>Claim Updates</Text>
            <Text style={styles.optionDesc}>Real-time alerts on AI drafts</Text>
          </View>
        </View>
        <Switch
          trackColor={{ false: "#E2E8F0", true: "#93C5FD" }}
          thumbColor={preferences.claimUpdates ? "#2563EB" : "#F4F3F4"}
          onValueChange={(val) => handleToggle('claimUpdates', val)}
          value={preferences.claimUpdates}
          style={Platform.OS === 'ios' ? { transform: [{ scale: 0.8 }] } : {}}
        />
      </View>

      <View style={styles.innerDivider} />

      <View style={styles.optionRow}>
        <View style={styles.optionInfo}>
          <View style={[styles.iconBg, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="stats-chart" size={16} color="#16A34A" />
          </View>
          <View>
            <Text style={styles.optionLabel}>Weekly Summary</Text>
            <Text style={styles.optionDesc}>Performance & savings report</Text>
          </View>
        </View>
        <Switch
          trackColor={{ false: "#E2E8F0", true: "#93C5FD" }}
          thumbColor={preferences.weeklySummary ? "#2563EB" : "#F4F3F4"}
          onValueChange={(val) => handleToggle('weeklySummary', val)}
          value={preferences.weeklySummary}
          style={Platform.OS === 'ios' ? { transform: [{ scale: 0.8 }] } : {}}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inlineContainer: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  optionInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBg: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { fontSize: 14, fontWeight: '600', color: '#334155' },
  optionDesc: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  innerDivider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 44 },
});