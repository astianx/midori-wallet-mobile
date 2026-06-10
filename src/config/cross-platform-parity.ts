import {
  BTC_FEE_TIERS,
  DEVICE_SYNC_SCOPE,
  MOBILE_DAPP_STRATEGY,
  PROVIDER_POLICY,
  RELEASE_PARITY_NOTE,
  RISK_PREVIEW_FEE_ROWS,
  SETTINGS_SECTIONS,
} from '../../../shared/wallet/phase9-contract';
import tokenMetadata from '../../../shared/wallet/token-metadata.json';

export const phase9ContractVersion = 1 as const;

export const settingsSections = [
  ...SETTINGS_SECTIONS,
] as const;

export const mobileDefaultNetworks = [
  'Bitcoin SegWit',
  'Ethereum',
  'Polygon',
  'Arbitrum',
  'TON',
  'Tron',
  'Solana',
] as const;

export const extensionDefaultNetworks = [
  'Bitcoin',
  'Ethereum',
  'Polygon',
  'Sepolia',
  'Base',
  'Arbitrum',
  'TON',
  'TRON',
  'Solana',
  'Spark',
] as const;

export const mobilePendingNetworks = ['Sepolia', 'Base', 'Spark'] as const;

export const mobilePriorityTokens = ['BTC', 'USDT multi-chain', 'XAUt on Ethereum'] as const;

export const sharedTokenCatalogVersion = tokenMetadata.version;

export const extensionOnlyTokenCoverage = [
  'USDC on Ethereum/Base/Arbitrum/Sepolia/Polygon',
  'Wrapped native EVM tokens',
] as const;

export const mobileProviderStatus = {
  indexer: 'WDK Indexer',
  pricing: 'Bitfinex',
  activity: 'WDK Indexer',
  dapps: 'Not exposed on mobile',
  telemetry: 'Off by default',
} as const;

export const providerPolicy = PROVIDER_POLICY;

export const btcFeeTiers = BTC_FEE_TIERS;

export const riskPreviewFeeRows = RISK_PREVIEW_FEE_ROWS;

export const mobileDappStrategy = MOBILE_DAPP_STRATEGY;

export const deviceSyncScope = DEVICE_SYNC_SCOPE;

export const releaseParityNote = RELEASE_PARITY_NOTE;
