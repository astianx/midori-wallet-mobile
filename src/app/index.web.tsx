import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';

export default function WebIndex() {
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>Midori Wallet Mobile</Text>
      <Text style={styles.title}>Native runtime required</Text>
      <Text style={styles.body}>
        The mobile wallet uses WDK BareKit worklets and secure native storage. Open it with the
        Expo dev client on Android or iOS to initialize WDK.
      </Text>
      <View style={styles.commands}>
        <Text style={styles.command}>npm run android</Text>
        <Text style={styles.command}>npm run ios</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: 14,
    justifyContent: 'center',
    padding: 24,
  },
  kicker: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 520,
    textAlign: 'center',
  },
  commands: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 8,
  },
  command: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    color: colors.text,
    fontFamily: 'monospace',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
