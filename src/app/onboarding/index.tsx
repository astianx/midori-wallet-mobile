import { View, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnBoardingWelcome } from '@/components/onboarding/onboarding-welcome';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '@/constants/colors';
import { ONBOARDING_COPY } from '../../../../shared/wallet/product-copy';

export default function OnBoardingScreen() {
  const router = useDebouncedNavigation();
  const insets = useSafeAreaInsets();

  const handleCreateWallet = () => {
    router.push('/wallet-setup/name-wallet');
  };

  const handleImportWallet = () => {
    router.push('/wallet-setup/import-wallet');
  };

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OnBoardingWelcome
        title="Welcome!"
        subtitle={ONBOARDING_COPY.sharedRestoreDescription}
        actionButtons={[
          {
            id: 1,
            title: ONBOARDING_COPY.createWallet,
            iconName: 'wallet',
            variant: 'filled',
            onPress: handleCreateWallet,
          },
          {
            id: 2,
            title: ONBOARDING_COPY.importWallet,
            iconName: 'download',
            variant: 'tinted',
            onPress: handleImportWallet,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
