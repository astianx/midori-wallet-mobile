import { PropsWithChildren } from 'react';
import { View } from 'react-native';

export type Token = Record<string, unknown>;

export function ThemeProvider({ children }: PropsWithChildren<{ defaultMode?: string; brandConfig?: unknown }>) {
  return <>{children}</>;
}

export function useTheme() {
  return {
    colors: {},
    mode: 'dark',
  };
}

export function Balance() {
  return null;
}

export function Transaction() {
  return null;
}

export function TransactionList() {
  return null;
}

export function QRCode() {
  return null;
}

export function AssetSelector() {
  return null;
}

export function CryptoAddressInput() {
  return <View />;
}
