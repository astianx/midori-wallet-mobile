import { PropsWithChildren } from 'react';

export enum AssetTicker {
  BTC = 'BTC',
  USDt = 'USDt',
  XAUt = 'XAUt',
}

export enum NetworkType {
  Bitcoin = 'Bitcoin',
  Ethereum = 'Ethereum',
  Polygon = 'Polygon',
  Arbitrum = 'Arbitrum',
  Ton = 'Ton',
  Tron = 'Tron',
  Solana = 'Solana',
}

export type AssetAddressMap = Record<string, string>;
export type AssetBalanceMap = Record<string, unknown>;

const unavailable = () => {
  throw new Error('WDK native runtime is not available on web.');
};

export const WDKService = {
  initialize: async () => undefined,
};

export const wdkService = {
  getWallet: unavailable,
  createWallet: unavailable,
  importWallet: unavailable,
  deleteWallet: unavailable,
};

export const SMART_CONTRACT_BALANCE_ADDRESSES = {};

export function WalletProvider({ children }: PropsWithChildren<{ config?: unknown }>) {
  return <>{children}</>;
}

export function useWallet() {
  return {
    wallet: null,
    isInitialized: true,
    isUnlocked: false,
    createWallet: unavailable,
    importWallet: unavailable,
    unlockWallet: unavailable,
    lockWallet: unavailable,
  };
}

export default WalletProvider;
