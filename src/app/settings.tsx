import Header from '@/components/header';
import { clearAvatar } from '@/config/avatar-options';
import {
  extensionDefaultNetworks,
  extensionOnlyTokenCoverage,
  btcFeeTiers,
  deviceSyncScope,
  mobileDappStrategy,
  mobileDefaultNetworks,
  mobilePendingNetworks,
  mobilePriorityTokens,
  mobileProviderStatus,
  providerPolicy,
  releaseParityNote,
  riskPreviewFeeRows,
  settingsSections,
  sharedTokenCatalogVersion,
} from '@/config/cross-platform-parity';
import { networkConfigs } from '@/config/networks';
import useWalletAvatar from '@/hooks/use-wallet-avatar';
import getDisplaySymbol from '@/utils/get-display-symbol';
import { NetworkType, useWallet } from '@tetherto/wdk-react-native-provider';
import * as Clipboard from 'expo-clipboard';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import {
  Copy,
  Database,
  Info,
  KeyRound,
  Link,
  Network,
  Shield,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react-native';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { colors } from '@/constants/colors';
import { pricingService } from '@/services/pricing-service';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const { wallet, clearWallet, addresses } = useWallet();
  const avatar = useWalletAvatar();

  const handleDeleteWallet = () => {
    Alert.alert(
      'Delete Wallet',
      'This will permanently delete your wallet and all associated data. Make sure you have backed up your recovery phrase. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Wallet',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearWallet();
              await clearAvatar();
              toast.success('Wallet deleted successfully');
              router.dismissAll('/');
            } catch (error) {
              console.error('Failed to delete wallet:', error);
              toast.error('Failed to delete wallet');
            }
          },
        },
      ]
    );
  };

  const handleCopyAddress = async (address: string, networkName: string) => {
    await Clipboard.setStringAsync(address);
    toast.success(`${networkName} address copied to clipboard`);
  };

  const formatAddress = (address: string) => {
    if (!address) return 'N/A';
    if (address.length <= 15) return address;
    return `${address.slice(0, 10)}...${address.slice(-10)}`;
  };

  const getNetworkName = (network: string) => {
    return networkConfigs[network as NetworkType]?.name || network;
  };

  const renderTagList = (items: readonly string[]) => (
    <View style={styles.tagList}>
      {items.map((item) => (
        <View key={item} style={styles.tag}>
          <Text style={styles.tagText}>{item}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Settings" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Wallet Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Wallet size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Wallet Information</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{wallet?.name || 'Unknown'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Icon</Text>
              <Text style={styles.infoValue}>{avatar}</Text>
            </View>

            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>Enabled Assets</Text>
              <Text style={styles.infoValue}>
                {wallet?.enabledAssets?.map((asset) => getDisplaySymbol(asset)).join(', ') ||
                  'None'}
              </Text>
            </View>
          </View>
        </View>

        {/* Cross-platform Settings Sections */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ShieldCheck size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Cross-platform Settings</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.blockRow}>
              <Text style={styles.infoLabel}>Sections</Text>
              {renderTagList(settingsSections)}
            </View>

            <View style={styles.blockRow}>
              <Text style={styles.infoLabel}>Security</Text>
              <Text style={styles.infoValueSmall}>Biometrics and local device vault</Text>
            </View>

            <View style={[styles.blockRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>Connections</Text>
              <Text style={styles.infoValueSmall}>
                dApp permissions are extension-only until mobile signing is enabled
              </Text>
            </View>
          </View>
        </View>

        {/* Networks and Tokens Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Network size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Networks and Tokens</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.blockRow}>
              <Text style={styles.infoLabel}>Mobile active</Text>
              {renderTagList(mobileDefaultNetworks)}
            </View>

            <View style={styles.blockRow}>
              <Text style={styles.infoLabel}>Extension active</Text>
              {renderTagList(extensionDefaultNetworks)}
            </View>

            <View style={styles.blockRow}>
              <Text style={styles.infoLabel}>Mobile pending</Text>
              {renderTagList(mobilePendingNetworks)}
            </View>

            <View style={styles.blockRow}>
              <Text style={styles.infoLabel}>Priority tokens</Text>
              {renderTagList(mobilePriorityTokens)}
            </View>

            <View style={styles.blockRow}>
              <Text style={styles.infoLabel}>Shared token catalog</Text>
              <Text style={styles.infoValueSmall}>v{sharedTokenCatalogVersion}</Text>
            </View>

            <View style={[styles.blockRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>Extension extras</Text>
              {renderTagList(extensionOnlyTokenCoverage)}
            </View>
          </View>
        </View>

        {/* Providers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Database size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Providers</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Indexer</Text>
              <Text style={styles.infoValue}>{mobileProviderStatus.indexer}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pricing</Text>
              <Text style={styles.infoValue}>{pricingService.getActiveProviderName()}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Activity</Text>
              <Text style={styles.infoValue}>{mobileProviderStatus.activity}</Text>
            </View>

            <View style={styles.blockRow}>
              <Text style={styles.infoLabel}>Balance fallback</Text>
              {renderTagList(providerPolicy.balances.mobile)}
            </View>

            <View style={styles.blockRow}>
              <Text style={styles.infoLabel}>Pricing policy</Text>
              <Text style={styles.infoValueSmall}>
                Extension: {providerPolicy.pricing.extensionPrimary}. Mobile:{' '}
                {providerPolicy.pricing.mobilePrimary}.
              </Text>
            </View>

            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>Privacy</Text>
              <Text style={styles.infoValue}>{mobileProviderStatus.telemetry}</Text>
            </View>
          </View>
        </View>

        {/* dApp Strategy Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Link size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Connections</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>dApps</Text>
              <Text style={styles.infoValueSmall}>{mobileProviderStatus.dapps}</Text>
            </View>

            <View style={styles.blockRow}>
              <Text style={styles.infoLabel}>Strategy</Text>
              {renderTagList(mobileDappStrategy)}
            </View>

            <View style={styles.blockRow}>
              <Text style={styles.infoLabel}>BTC fee tiers</Text>
              {renderTagList(btcFeeTiers.map((tier) => tier.label))}
            </View>

            <View style={styles.blockRow}>
              <Text style={styles.infoLabel}>Risk preview fees</Text>
              {renderTagList(riskPreviewFeeRows)}
            </View>

            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>Risk preview</Text>
              <Text style={styles.infoValueSmall}>QR/deep-link signing sheet enabled</Text>
            </View>
          </View>
        </View>

        {/* Metadata Sync Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <KeyRound size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Device Sync</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>Opt-in required</Text>
            </View>

            <View style={styles.blockRow}>
              <Text style={styles.infoLabel}>Allowed metadata</Text>
              {renderTagList(deviceSyncScope.allowed)}
            </View>

            <View style={styles.blockRow}>
              <Text style={styles.infoLabel}>Never synced</Text>
              {renderTagList(deviceSyncScope.forbidden)}
            </View>

            <View style={styles.blockRow}>
              <Text style={styles.infoLabel}>Pairing</Text>
              <Text style={styles.infoValueSmall}>{deviceSyncScope.transport}</Text>
            </View>

            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>Seed sync</Text>
              <Text style={styles.infoValue}>Never</Text>
            </View>
          </View>
        </View>

        {/* Release Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Release parity</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={[styles.blockRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>Notes</Text>
              <Text style={styles.infoValueSmall}>{releaseParityNote}</Text>
            </View>
          </View>
        </View>

        {/* Network Addresses Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Network Addresses</Text>
          </View>

          <View style={styles.addressCard}>
            {addresses &&
              Object.entries(addresses).map(([network, address], index, array) => (
                <TouchableOpacity
                  key={network}
                  style={[
                    styles.addressRow,
                    index === array.length - 1 ? styles.addressRowLast : null,
                  ]}
                  onPress={() => handleCopyAddress(address as string, getNetworkName(network))}
                  activeOpacity={0.7}
                >
                  <View style={styles.addressContent}>
                    <Text style={styles.networkLabel}>{getNetworkName(network)}</Text>
                    <Text style={styles.addressValue}>{formatAddress(address as string)}</Text>
                  </View>
                  <Copy size={18} color={colors.primary} />
                </TouchableOpacity>
              ))}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>About</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>

            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>WDK Version</Text>
              <Text style={styles.infoValue}>Latest</Text>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerSection}>
          <View style={styles.sectionHeader}>
            <Trash2 size={20} color={colors.danger} />
            <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
          </View>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteWallet}>
            <Trash2 size={20} color={colors.white} />
            <Text style={styles.deleteButtonText}>Delete Wallet</Text>
          </TouchableOpacity>

          <Text style={styles.warningText}>
            Deleting your wallet will remove all data from this device. Make sure you have backed up
            your recovery phrase before proceeding.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  blockRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  infoValueSmall: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
    lineHeight: 18,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  tag: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.background,
  },
  tagText: {
    color: colors.text,
    fontSize: 12,
  },
  addressCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  addressRowLast: {
    borderBottomWidth: 0,
  },
  addressContent: {
    flex: 1,
    marginRight: 12,
  },
  networkLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  addressValue: {
    fontSize: 13,
    color: colors.text,
    fontFamily: 'monospace',
  },
  dangerSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },
  dangerTitle: {
    color: colors.danger,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
  },
  deleteButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  warningText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
