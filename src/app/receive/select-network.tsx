import Header from '@/components/header';
import { assetConfig } from '@/config/assets';
import { Network, networkConfigs } from '@/config/networks';
import { hasUsableAddress, useWalletReadiness } from '@/hooks/use-wallet-readiness';
import { NetworkType } from '@tetherto/wdk-react-native-provider';
import { useLocalSearchParams } from 'expo-router';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';

interface NetworkOption extends Network {
  networkType: NetworkType;
  address?: string;
  hasAddress: boolean;
  description?: string;
}

// Network descriptions for receive flow
const NETWORK_DESCRIPTIONS = {
  [NetworkType.ETHEREUM]: 'ERC20',
  [NetworkType.POLYGON]: 'Polygon Network',
  [NetworkType.ARBITRUM]: 'Arbitrum One',
  [NetworkType.TON]: 'TON Network',
  [NetworkType.TRON]: 'Tron Network',
  [NetworkType.SOLANA]: 'Solana Network',
  [NetworkType.SEGWIT]: 'Native Bitcoin Network',
  [NetworkType.LIGHTNING]: 'Lightning Network',
};

export default function ReceiveSelectNetworkScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const params = useLocalSearchParams();

  const { tokenId, tokenSymbol, tokenName } = params as {
    tokenId: string;
    tokenSymbol: string;
    tokenName: string;
  };

  const tokenNetworks = useMemo(() => {
    const tokenConfig = assetConfig[tokenId];
    return tokenConfig?.supportedNetworks ?? [];
  }, [tokenId]);

  const { addresses, ensureWalletAddresses, isResolvingAddresses, hasRequiredAddresses } =
    useWalletReadiness(tokenNetworks);
  const [addressPreparationTimedOut, setAddressPreparationTimedOut] = useState(false);
  const [addressPreparationAttempted, setAddressPreparationAttempted] = useState(false);

  useEffect(() => {
    setAddressPreparationAttempted(false);
    setAddressPreparationTimedOut(false);
  }, [tokenId]);

  useEffect(() => {
    if (
      tokenNetworks.length === 0 ||
      hasRequiredAddresses ||
      isResolvingAddresses ||
      addressPreparationAttempted
    ) {
      return;
    }

    setAddressPreparationAttempted(true);
    let cancelled = false;

    const prepareNetworks = async () => {
      for (const networkType of tokenNetworks) {
        if (cancelled) {
          return;
        }

        try {
          await ensureWalletAddresses(false, [networkType]);
        } catch (error) {
          console.error(`Failed to prepare ${networkType} receive address:`, error);
        }
      }
    };

    prepareNetworks();

    return () => {
      cancelled = true;
    };
  }, [
    tokenNetworks,
    hasRequiredAddresses,
    isResolvingAddresses,
    addressPreparationAttempted,
    ensureWalletAddresses,
  ]);

  useEffect(() => {
    if (!isResolvingAddresses) {
      setAddressPreparationTimedOut(false);
      return;
    }

    const timeout = setTimeout(() => {
      setAddressPreparationTimedOut(true);
    }, 12000);

    return () => clearTimeout(timeout);
  }, [isResolvingAddresses]);

  const networks: NetworkOption[] = useMemo(() => {
    const tokenConfig = assetConfig[tokenId];
    if (!tokenConfig) {
      return [];
    }

    return tokenConfig.supportedNetworks.map(networkType => {
      const network = networkConfigs[networkType];
      const address = addresses?.[networkType];
      return {
        ...network,
        networkType,
        address,
        hasAddress: hasUsableAddress(addresses, networkType),
        description: NETWORK_DESCRIPTIONS[networkType],
      };
    });
  }, [tokenId, addresses]);

  const handleSelectNetwork = useCallback(
    async (network: NetworkOption) => {
      if (!network.hasAddress) {
        try {
          setAddressPreparationTimedOut(false);
          setAddressPreparationAttempted(true);
          const resolvedAddresses = await ensureWalletAddresses(true, [network.networkType]);
          const resolvedAddress = resolvedAddresses[network.networkType];

          if (!resolvedAddress) {
            return;
          }

          router.push({
            pathname: '/receive/details',
            params: {
              tokenId,
              tokenSymbol,
              tokenName,
              networkId: network.id,
              networkName: network.name,
              address: resolvedAddress,
            },
          });
        } catch (error) {
          console.error('Failed to resolve receive address:', error);
        }
        return;
      }

      router.push({
        pathname: '/receive/details',
        params: {
          tokenId,
          tokenSymbol,
          tokenName,
          networkId: network.id,
          networkName: network.name,
          address: network.address,
        },
      });
    },
    [router, tokenId, tokenSymbol, tokenName, ensureWalletAddresses]
  );

  const renderNetwork = ({ item }: { item: NetworkOption }) => {
    const isDisabled = !item.hasAddress;
    const isPending = isDisabled && isResolvingAddresses && !addressPreparationTimedOut;

    return (
      <TouchableOpacity
        style={[styles.networkRow, isPending && styles.networkRowDisabled]}
        onPress={() => handleSelectNetwork(item)}
        disabled={isPending}
        activeOpacity={isPending ? 1 : 0.7}
      >
        <View style={styles.networkInfo}>
          <View
            style={[
              styles.networkIcon,
              { backgroundColor: item.color },
              isPending && styles.networkIconDisabled,
            ]}
          >
            {typeof item.icon === 'string' ? (
              <Text style={[styles.networkIconText, isPending && styles.networkIconTextDisabled]}>
                {item.icon}
              </Text>
            ) : (
              <Image
                source={item.icon}
                style={[styles.networkIconImage, isPending && styles.networkIconImageDisabled]}
              />
            )}
          </View>
          <View style={styles.networkDetails}>
            <Text style={[styles.networkName, isPending && styles.networkNameDisabled]}>
              {item.name}
            </Text>
            {item.description && (
              <Text
                style={[styles.networkDescription, isPending && styles.networkDescriptionDisabled]}
              >
                {item.description}
              </Text>
            )}
            {isPending ? (
              <View style={styles.pendingAddressRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.pendingAddressLabel}>Preparing address...</Text>
              </View>
            ) : (
              isDisabled && <Text style={styles.noAddressLabel}>Tap to retry address setup</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Select network" style={styles.header} />

      <View style={styles.description}>
        <Text style={styles.descriptionText}>
          Select the network you will be using to receive {tokenName}
        </Text>
      </View>

      <FlatList
        data={networks}
        renderItem={renderNetwork}
        keyExtractor={item => item.id}
        style={styles.networksList}
        contentContainerStyle={styles.networksContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: 16,
  },
  description: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  networksList: {
    flex: 1,
  },
  networksContent: {
    paddingBottom: 20,
  },
  networkRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  networkRowDisabled: {
    opacity: 0.5,
  },
  networkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  networkIconDisabled: {
    backgroundColor: colors.border,
  },
  networkIconText: {
    fontSize: 18,
    color: colors.white,
  },
  networkIconTextDisabled: {
    opacity: 0.6,
  },
  networkIconImage: {
    width: 24,
    height: 24,
  },
  networkIconImageDisabled: {
    opacity: 0.6,
  },
  networkDetails: {
    flex: 1,
  },
  networkName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  networkNameDisabled: {
    color: colors.textTertiary,
  },
  networkDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  networkDescriptionDisabled: {
    color: colors.textDisabled,
  },
  noAddressLabel: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
    fontWeight: '500',
  },
  pendingAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  pendingAddressLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
