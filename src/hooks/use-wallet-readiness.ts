import { assetConfig } from '@/config/assets';
import { NetworkType, useWallet } from '@tetherto/wdk-react-native-provider';
import { useCallback, useMemo } from 'react';

type WalletContextWithAddressResolution = ReturnType<typeof useWallet>;

export const hasUsableAddress = (
  addresses: WalletContextWithAddressResolution['addresses'],
  networkType: NetworkType
) => {
  const address = addresses?.[networkType];
  return typeof address === 'string' && address.trim().length > 0;
};

export const getRequiredReceiveNetworks = (enabledAssets?: string[]) => {
  const requiredNetworks = new Set<NetworkType>();

  enabledAssets?.forEach(assetSymbol => {
    const config = assetConfig[assetSymbol as keyof typeof assetConfig];
    config?.supportedNetworks.forEach(networkType => requiredNetworks.add(networkType));
  });

  return Array.from(requiredNetworks);
};

export function useWalletReadiness(requiredNetworks?: NetworkType[]) {
  const walletContext = useWallet();
  const requiredReceiveNetworks = useMemo(
    () => requiredNetworks ?? getRequiredReceiveNetworks(walletContext.wallet?.enabledAssets),
    [requiredNetworks, walletContext.wallet?.enabledAssets]
  );

  const hasAnyAddress = useMemo(
    () => Object.values(walletContext.addresses ?? {}).some(address => address?.trim().length > 0),
    [walletContext.addresses]
  );

  const hasRequiredAddresses = useMemo(() => {
    if (requiredReceiveNetworks.length === 0) {
      return false;
    }

    return requiredReceiveNetworks.every(networkType =>
      hasUsableAddress(walletContext.addresses, networkType)
    );
  }, [requiredReceiveNetworks, walletContext.addresses]);

  const isResolvingAddresses = Boolean(walletContext.isResolvingAddresses);

  const ensureWalletAddresses = useCallback(
    async (forceUpdate = false, networks?: NetworkType[]) => {
      return walletContext.resolveWalletAddresses({
        enabledAssets: walletContext.wallet?.enabledAssets,
        forceUpdate,
        networks,
      });
    },
    [walletContext.resolveWalletAddresses, walletContext.wallet?.enabledAssets]
  );

  return {
    ...walletContext,
    requiredReceiveNetworks,
    hasAnyAddress,
    hasRequiredAddresses,
    isResolvingAddresses,
    ensureWalletAddresses,
  };
}
