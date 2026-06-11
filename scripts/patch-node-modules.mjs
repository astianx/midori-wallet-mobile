import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function patchAxiosAdapterName() {
  const adaptersPath = join(projectRoot, 'node_modules', 'axios', 'lib', 'adapters', 'adapters.js');

  if (!existsSync(adaptersPath)) {
    console.warn('[patch-node-modules] Axios adapters file not found; skipping.');
    return;
  }

  const source = readFileSync(adaptersPath, 'utf8');

  if (source.includes('Cannot redefine adapterName in Expo web')) {
    console.log('[patch-node-modules] Axios adapterName patch already applied.');
    return;
  }

  const target = "    Object.defineProperty(fn, 'adapterName', {value});";
  const replacement = `    try {
      Object.defineProperty(fn, 'adapterName', { __proto__: null, value, configurable: true });
    } catch (e) {
      // Cannot redefine adapterName in Expo web when Metro evaluates this module again.
    }`;

  if (!source.includes(target)) {
    console.warn('[patch-node-modules] Expected Axios adapterName assignment not found; skipping.');
    return;
  }

  writeFileSync(adaptersPath, source.replace(target, replacement));
  console.log('[patch-node-modules] Patched Axios adapterName assignment for Expo web.');
}

function patchFreeportAsync() {
  const freeportPath = join(projectRoot, 'node_modules', 'freeport-async', 'index.js');

  if (!existsSync(freeportPath)) {
    console.warn('[patch-node-modules] freeport-async file not found; skipping.');
    return;
  }

  const source = readFileSync(freeportPath, 'utf8');

  if (source.includes('Node 22 rejects port 65536')) {
    console.log('[patch-node-modules] freeport-async port limit patch already applied.');
    return;
  }

  const target = `    for (var i = 0; i < rangeSize; i++) {
      awaitables.push(availableAsync(lowPort + i, options));
    }`;
  const replacement = `    for (var i = 0; i < rangeSize; i++) {
      const candidatePort = lowPort + i;
      if (candidatePort > 65535) {
        // Node 22 rejects port 65536 before freeport-async can recover.
        reject(new Error("No available ports found below 65536"));
        return;
      }
      awaitables.push(availableAsync(candidatePort, options));
    }`;

  if (!source.includes(target)) {
    console.warn('[patch-node-modules] Expected freeport-async port loop not found; skipping.');
    return;
  }

  writeFileSync(freeportPath, source.replace(target, replacement));
  console.log('[patch-node-modules] Patched freeport-async port limit for Node 22.');
}

function patchWdkKeychainBiometryGuard() {
  const files = [
    join(
      projectRoot,
      'node_modules',
      '@tetherto',
      'wdk-react-native-provider',
      'lib',
      'module',
      'services',
      'wdk-service',
      'wdk-secret-manager-storage.js'
    ),
    join(
      projectRoot,
      'node_modules',
      '@tetherto',
      'wdk-react-native-provider',
      'src',
      'services',
      'wdk-service',
      'wdk-secret-manager-storage.ts'
    ),
  ];

  for (const storagePath of files) {
    if (!existsSync(storagePath)) {
      console.warn(`[patch-node-modules] WDK storage file not found: ${storagePath}`);
      continue;
    }

    const source = readFileSync(storagePath, 'utf8');

    const accessControlExpression =
      "key === 'seed' ? Keychain.ACCESS_CONTROL.BIOMETRY_ANY : undefined";
    const patchedAccessControl = `await WdkSecretManagerStorage.getSeedAccessControl(key)`;

    const oldSupportedBiometryGuard = `const supportedBiometry = await Keychain.getSupportedBiometryType();
    return supportedBiometry ? Keychain.ACCESS_CONTROL.BIOMETRY_ANY : undefined;`;
    const canAuthenticateGuard = `const canAuthenticate = await Keychain.canImplyAuthentication();
    return canAuthenticate ? Keychain.ACCESS_CONTROL.BIOMETRY_ANY : undefined;`;

    if (source.includes(oldSupportedBiometryGuard)) {
      writeFileSync(storagePath, source.replace(oldSupportedBiometryGuard, canAuthenticateGuard));
      console.log(`[patch-node-modules] Updated WDK Keychain biometry guard: ${storagePath}`);
      continue;
    }

    if (source.includes('canImplyAuthentication')) {
      console.log(`[patch-node-modules] WDK Keychain biometry guard already applied: ${storagePath}`);
      continue;
    }

    if (!source.includes(accessControlExpression)) {
      console.warn(
        `[patch-node-modules] Expected WDK Keychain accessControl expression not found: ${storagePath}`
      );
      continue;
    }

    const methodAnchor = source.includes('  static getServiceForItem(\n')
      ? '  static getServiceForItem(\n'
      : '  static getServiceForItem(key) {\n';

    if (!source.includes(methodAnchor)) {
      console.warn(`[patch-node-modules] Expected WDK storage method anchor not found: ${storagePath}`);
      continue;
    }

    const helper =
      storagePath.endsWith('.ts')
        ? `  static async getSeedAccessControl(
    key:
      | typeof WDK_STORAGE_SEED
      | typeof WDK_STORAGE_ENTROPY
      | typeof WDK_STORAGE_SALT
  ) {
    if (key !== WDK_STORAGE_SEED) {
      return undefined;
    }

    const canAuthenticate = await Keychain.canImplyAuthentication();
    return canAuthenticate ? Keychain.ACCESS_CONTROL.BIOMETRY_ANY : undefined;
  }

`
        : `  static async getSeedAccessControl(key) {
    if (key !== WDK_STORAGE_SEED) {
      return undefined;
    }
    const canAuthenticate = await Keychain.canImplyAuthentication();
    return canAuthenticate ? Keychain.ACCESS_CONTROL.BIOMETRY_ANY : undefined;
  }
`;

    const patched = source
      .replaceAll(accessControlExpression, patchedAccessControl)
      .replace(methodAnchor, helper + methodAnchor);

    writeFileSync(storagePath, patched);
    console.log(`[patch-node-modules] Patched WDK Keychain biometry guard: ${storagePath}`);
  }
}

function patchWdkWalletCreationFlow() {
  const providerRoot = join(projectRoot, 'node_modules', '@tetherto', 'wdk-react-native-provider');
  const files = [
    { path: join(providerRoot, 'lib', 'module', 'contexts', 'wallet-context.js'), type: 'js' },
    { path: join(providerRoot, 'src', 'contexts', 'wallet-context.tsx'), type: 'ts' },
  ];

  for (const file of files) {
    if (!existsSync(file.path)) {
      console.warn(`[patch-node-modules] WDK wallet context file not found: ${file.path}`);
      continue;
    }

    let source = readFileSync(file.path, 'utf8');

    if (source.includes('resolveWalletAddressesInBackground')) {
      console.log(`[patch-node-modules] WDK wallet creation flow patch already applied: ${file.path}`);
      continue;
    }

    if (file.type === 'ts') {
      const helperAnchor = `  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };
`;
      const helper = `  const resolveWalletAddressesInBackground = (enabledAssets: AssetTicker[]) => {
    getWalletAddresses(enabledAssets)
      .then((addresses) => {
        if (addresses) {
          dispatch({ type: 'SET_ADDRESSES', payload: addresses });
        }
      })
      .catch((error) => {
        console.error('Failed to resolve wallet addresses after wallet creation:', error);
      });
  };

`;
      const seedBlock = `      if (params.mnemonic) {
        await WDKService.importSeedPhrase({ prf, seedPhrase: params.mnemonic });
      } else {
        await WDKService.createSeed({ prf });
      }

`;
      const seedReplacement = `      if (params.mnemonic) {
        await WDKService.importSeedPhrase({ prf, seedPhrase: params.mnemonic });
      }

`;
      const addressesBlock = `      const addresses = await getWalletAddresses(wallet.enabledAssets);

      dispatch({ type: 'SET_WALLET', payload: wallet });
      dispatch({ type: 'SET_ADDRESSES', payload: addresses });
      dispatch({ type: 'SET_UNLOCKED', payload: true });
`;
      const addressesReplacement = `      dispatch({ type: 'SET_WALLET', payload: wallet });
      dispatch({ type: 'SET_UNLOCKED', payload: true });
      resolveWalletAddressesInBackground(wallet.enabledAssets);
`;

      if (!source.includes(helperAnchor) || !source.includes(seedBlock) || !source.includes(addressesBlock)) {
        console.warn(`[patch-node-modules] Expected WDK wallet creation TS patterns not found: ${file.path}`);
        continue;
      }

      source = source
        .replace(helperAnchor, helperAnchor + helper)
        .replace(seedBlock, seedReplacement)
        .replaceAll(addressesBlock, addressesReplacement);
    } else {
      const helperAnchor = `  const clearError = () => {
    dispatch({
      type: 'SET_ERROR',
      payload: null
    });
  };
`;
      const helper = `  const resolveWalletAddressesInBackground = enabledAssets => {
    getWalletAddresses(enabledAssets).then(addresses => {
      if (addresses) {
        dispatch({
          type: 'SET_ADDRESSES',
          payload: addresses
        });
      }
    }).catch(error => {
      console.error('Failed to resolve wallet addresses after wallet creation:', error);
    });
  };
`;
      const seedBlock = `      if (params.mnemonic) {
        await WDKService.importSeedPhrase({
          prf,
          seedPhrase: params.mnemonic
        });
      } else {
        await WDKService.createSeed({
          prf
        });
      }
`;
      const seedReplacement = `      if (params.mnemonic) {
        await WDKService.importSeedPhrase({
          prf,
          seedPhrase: params.mnemonic
        });
      }
`;
      const addressesBlock = `      const addresses = await getWalletAddresses(wallet.enabledAssets);
      dispatch({
        type: 'SET_WALLET',
        payload: wallet
      });
      dispatch({
        type: 'SET_ADDRESSES',
        payload: addresses
      });
      dispatch({
        type: 'SET_UNLOCKED',
        payload: true
      });
`;
      const addressesReplacement = `      dispatch({
        type: 'SET_WALLET',
        payload: wallet
      });
      dispatch({
        type: 'SET_UNLOCKED',
        payload: true
      });
      resolveWalletAddressesInBackground(wallet.enabledAssets);
`;

      if (!source.includes(helperAnchor) || !source.includes(seedBlock) || !source.includes(addressesBlock)) {
        console.warn(`[patch-node-modules] Expected WDK wallet creation JS patterns not found: ${file.path}`);
        continue;
      }

      source = source
        .replace(helperAnchor, helperAnchor + helper)
        .replace(seedBlock, seedReplacement)
        .replaceAll(addressesBlock, addressesReplacement);
    }

    writeFileSync(file.path, source);
    console.log(`[patch-node-modules] Patched WDK wallet creation flow: ${file.path}`);
  }
}

function replaceOrWarn(source, target, replacement, filePath, label) {
  if (!source.includes(target)) {
    console.warn(`[patch-node-modules] Expected ${label} pattern not found: ${filePath}`);
    return source;
  }

  return source.replace(target, replacement);
}

function patchFileOnce({ path, marker, patches, description }) {
  if (!existsSync(path)) {
    console.warn(`[patch-node-modules] ${description} file not found: ${path}`);
    return;
  }

  let source = readFileSync(path, 'utf8');
  if (source.includes(marker)) {
    console.log(`[patch-node-modules] ${description} patch already applied: ${path}`);
    return;
  }

  for (const patch of patches) {
    source = replaceOrWarn(source, patch.target, patch.replacement, path, patch.label);
  }

  writeFileSync(path, source);
  console.log(`[patch-node-modules] Patched ${description}: ${path}`);
}

function patchFileTransforms(path, description, transforms) {
  if (!existsSync(path)) {
    console.warn(`[patch-node-modules] ${description} file not found: ${path}`);
    return;
  }

  let source = readFileSync(path, 'utf8');
  let changed = false;

  for (const transform of transforms) {
    if (transform.marker && source.includes(transform.marker)) {
      continue;
    }

    const next = replaceOrWarn(source, transform.target, transform.replacement, path, transform.label);
    if (next !== source) {
      source = next;
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(path, source);
    console.log(`[patch-node-modules] Patched ${description}: ${path}`);
  } else {
    console.log(`[patch-node-modules] ${description} patch already applied: ${path}`);
  }
}

function patchWdkWalletAddressReadiness() {
  const providerRoot = join(projectRoot, 'node_modules', '@tetherto', 'wdk-react-native-provider');

  const files = [
    {
      path: join(providerRoot, 'src', 'contexts', 'constants.ts'),
      marker: 'isResolvingAddresses: false',
      description: 'WDK address readiness constants',
      patches: [{ label: 'initial state', target: `  isLoading: false,
  error: null,`, replacement: `  isLoading: false,
  isResolvingAddresses: false,
  error: null,` }],
    },
    {
      path: join(providerRoot, 'lib', 'module', 'contexts', 'constants.js'),
      marker: 'isResolvingAddresses: false',
      description: 'WDK compiled address readiness constants',
      patches: [{ label: 'compiled initial state', target: `  isLoading: false,
  error: null`, replacement: `  isLoading: false,
  isResolvingAddresses: false,
  error: null` }],
    },
    {
      path: join(providerRoot, 'src', 'contexts', 'types.ts'),
      marker: 'resolveWalletAddresses: (params?',
      description: 'WDK address readiness types',
      patches: [
        { label: 'state type', target: `  isLoading: boolean;
  error: string | null;`, replacement: `  isLoading: boolean;
  isResolvingAddresses: boolean;
  error: string | null;` },
        { label: 'method type', target: `  clearWallet: () => Promise<void>;
  clearError: () => void;
  refreshWalletBalance: () => Promise<void>;`, replacement: `  clearWallet: () => Promise<void>;
  clearError: () => void;
  resolveWalletAddresses: (params?: {
    enabledAssets?: AssetTicker[];
    forceUpdate?: boolean;
  }) => Promise<AddressMap>;
  refreshWalletBalance: () => Promise<void>;` },
      ],
    },
    {
      path: join(providerRoot, 'lib', 'typescript', 'src', 'contexts', 'types.d.ts'),
      marker: 'resolveWalletAddresses: (params?',
      description: 'WDK compiled address readiness types',
      patches: [
        { label: 'AssetTicker import', target: `import type { AddressMap, Amount, BalanceMap, ChainsConfig, Transaction, TransactionMap, Wallet } from '../services/wdk-service/types';`, replacement: `import type { AddressMap, Amount, AssetTicker, BalanceMap, ChainsConfig, Transaction, TransactionMap, Wallet } from '../services/wdk-service/types';` },
        { label: 'compiled state type', target: `    isLoading: boolean;
    error: string | null;`, replacement: `    isLoading: boolean;
    isResolvingAddresses: boolean;
    error: string | null;` },
        { label: 'compiled method type', target: `    clearWallet: () => Promise<void>;
    clearError: () => void;
    refreshWalletBalance: () => Promise<void>;`, replacement: `    clearWallet: () => Promise<void>;
    clearError: () => void;
    resolveWalletAddresses: (params?: {
        enabledAssets?: AssetTicker[];
        forceUpdate?: boolean;
    }) => Promise<AddressMap>;
    refreshWalletBalance: () => Promise<void>;` },
      ],
    },
    {
      path: join(providerRoot, 'src', 'contexts', 'reducer.ts'),
      marker: "SET_RESOLVING_ADDRESSES",
      description: 'WDK address readiness reducer',
      patches: [
        { label: 'action type', target: `  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_UNLOCKED'; payload: boolean }
  | { type: 'SET_BALANCES'; payload: BalanceMap }`, replacement: `  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_UNLOCKED'; payload: boolean }
  | { type: 'SET_RESOLVING_ADDRESSES'; payload: boolean }
  | { type: 'SET_BALANCES'; payload: BalanceMap }` },
        { label: 'reducer case', target: `    case 'SET_UNLOCKED':
      return { ...state, isUnlocked: action.payload };

    case 'SET_BALANCES':`, replacement: `    case 'SET_UNLOCKED':
      return { ...state, isUnlocked: action.payload };

    case 'SET_RESOLVING_ADDRESSES':
      return { ...state, isResolvingAddresses: action.payload };

    case 'SET_BALANCES':` },
      ],
    },
    {
      path: join(providerRoot, 'lib', 'module', 'contexts', 'reducer.js'),
      marker: "SET_RESOLVING_ADDRESSES",
      description: 'WDK compiled address readiness reducer',
      patches: [
        { label: 'compiled reducer case', target: `    case 'SET_UNLOCKED':
      return {
        ...state,
        isUnlocked: action.payload
      };
    case 'SET_BALANCES':`, replacement: `    case 'SET_UNLOCKED':
      return {
        ...state,
        isUnlocked: action.payload
      };
    case 'SET_RESOLVING_ADDRESSES':
      return {
        ...state,
        isResolvingAddresses: action.payload
      };
    case 'SET_BALANCES':` },
      ],
    },
    {
      path: join(providerRoot, 'src', 'contexts', 'wallet-context.tsx'),
      marker: 'const resolveWalletAddresses = async',
      description: 'WDK wallet address resolver',
      patches: [
        { label: 'getWalletAddresses force update', target: `  const getWalletAddresses = async (enabledAssets: AssetTicker[]) => {`, replacement: `  const getWalletAddresses = async (enabledAssets: AssetTicker[], forceUpdate = false) => {` },
        { label: 'cache bypass', target: `      if (stored) {`, replacement: `      if (stored && !forceUpdate) {` },
        { label: 'resolver helper', target: `  const resolveWalletAddressesInBackground = (enabledAssets: AssetTicker[]) => {
    getWalletAddresses(enabledAssets)
      .then((addresses) => {
        if (addresses) {
          dispatch({ type: 'SET_ADDRESSES', payload: addresses });
        }
      })
      .catch((error) => {
        console.error('Failed to resolve wallet addresses after wallet creation:', error);
      });
  };
`, replacement: `  const hasResolvedWalletAddress = (addresses?: AddressMap) => {
    return Object.values(addresses || {}).some(
      (address) => typeof address === 'string' && address.trim().length > 0
    );
  };
  const resolveWalletAddresses = async (params?: {
    enabledAssets?: AssetTicker[];
    forceUpdate?: boolean;
  }): Promise<AddressMap> => {
    const enabledAssets = params?.enabledAssets || state.wallet?.enabledAssets || [];

    if (enabledAssets.length === 0) {
      throw new Error('Wallet has no enabled assets');
    }

    dispatch({ type: 'SET_RESOLVING_ADDRESSES', payload: true });

    try {
      const addresses = await getWalletAddresses(enabledAssets, params?.forceUpdate);

      if (!hasResolvedWalletAddress(addresses)) {
        throw new Error('Wallet addresses could not be resolved');
      }

      dispatch({ type: 'SET_ADDRESSES', payload: addresses });
      return addresses;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to resolve wallet addresses';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_RESOLVING_ADDRESSES', payload: false });
    }
  };
  const resolveWalletAddressesInBackground = (enabledAssets: AssetTicker[]) => {
    resolveWalletAddresses({ enabledAssets })
      .catch((error) => {
        console.error('Failed to resolve wallet addresses after wallet creation:', error);
      });
  };
` },
        { label: 'context value', target: `    clearWallet,
    clearError,
    refreshWalletBalance,`, replacement: `    clearWallet,
    clearError,
    resolveWalletAddresses,
    refreshWalletBalance,` },
      ],
    },
    {
      path: join(providerRoot, 'lib', 'module', 'contexts', 'wallet-context.js'),
      marker: 'const resolveWalletAddresses = async',
      description: 'WDK compiled wallet address resolver',
      patches: [
        { label: 'compiled getWalletAddresses force update', target: `  const getWalletAddresses = async enabledAssets => {`, replacement: `  const getWalletAddresses = async (enabledAssets, forceUpdate = false) => {` },
        { label: 'compiled cache bypass', target: `      if (stored) {`, replacement: `      if (stored && !forceUpdate) {` },
        { label: 'compiled resolver helper', target: `  const resolveWalletAddressesInBackground = enabledAssets => {
    getWalletAddresses(enabledAssets).then(addresses => {
      if (addresses) {
        dispatch({
          type: 'SET_ADDRESSES',
          payload: addresses
        });
      }
    }).catch(error => {
      console.error('Failed to resolve wallet addresses after wallet creation:', error);
    });
  };
`, replacement: `  const hasResolvedWalletAddress = addresses => {
    return Object.values(addresses || {}).some(address => typeof address === 'string' && address.trim().length > 0);
  };
  const resolveWalletAddresses = async params => {
    const enabledAssets = params?.enabledAssets || state.wallet?.enabledAssets || [];
    if (enabledAssets.length === 0) {
      throw new Error('Wallet has no enabled assets');
    }
    dispatch({
      type: 'SET_RESOLVING_ADDRESSES',
      payload: true
    });
    try {
      const addresses = await getWalletAddresses(enabledAssets, params?.forceUpdate);
      if (!hasResolvedWalletAddress(addresses)) {
        throw new Error('Wallet addresses could not be resolved');
      }
      dispatch({
        type: 'SET_ADDRESSES',
        payload: addresses
      });
      return addresses;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resolve wallet addresses';
      dispatch({
        type: 'SET_ERROR',
        payload: errorMessage
      });
      throw error;
    } finally {
      dispatch({
        type: 'SET_RESOLVING_ADDRESSES',
        payload: false
      });
    }
  };
  const resolveWalletAddressesInBackground = enabledAssets => {
    resolveWalletAddresses({
      enabledAssets
    }).catch(error => {
      console.error('Failed to resolve wallet addresses after wallet creation:', error);
    });
  };
` },
        { label: 'compiled context value', target: `    clearWallet,
    clearError,
    refreshWalletBalance,`, replacement: `    clearWallet,
    clearError,
    resolveWalletAddresses,
    refreshWalletBalance,` },
      ],
    },
  ];

  for (const file of files) {
    patchFileOnce(file);
  }
}

function patchWdkDirectedNetworkResolution() {
  const providerRoot = join(projectRoot, 'node_modules', '@tetherto', 'wdk-react-native-provider');

  const usdtMapTarget = `    [NetworkType.ARBITRUM]: 'arbitrum',
    [NetworkType.TON]: 'ton'`;
  const usdtMapReplacement = `    [NetworkType.ARBITRUM]: 'arbitrum',
    [NetworkType.TON]: 'ton',
    [NetworkType.TRON]: 'tron',
    [NetworkType.SOLANA]: 'solana'`;
  const usdtMapTargetCompiled = `    [NetworkType.ARBITRUM]: 'arbitrum',
    [NetworkType.TON]: 'ton'`;
  const usdtMapReplacementCompiled = usdtMapReplacement;

  patchFileTransforms(
    join(providerRoot, 'src', 'services', 'wdk-service', 'types.ts'),
    'WDK directed network types',
    [
      {
        marker: "[NetworkType.SOLANA]: 'solana'",
        label: 'USDT address network coverage',
        target: usdtMapTarget,
        replacement: usdtMapReplacement,
      },
      {
        label: 'USDT balance network coverage cleanup',
        target: `export const AssetBalanceMap = {
  [AssetTicker.BTC]: {
    [NetworkType.SEGWIT]: 'bitcoin',
  },
  [AssetTicker.USDT]: {
    [NetworkType.ETHEREUM]: 'ethereum',
    [NetworkType.POLYGON]: 'polygon',
    [NetworkType.ARBITRUM]: 'arbitrum',
    [NetworkType.TON]: 'ton',
    [NetworkType.TRON]: 'tron',
    [NetworkType.SOLANA]: 'solana',
  },
  [AssetTicker.XAUT]: {`,
        replacement: `export const AssetBalanceMap = {
  [AssetTicker.BTC]: {
    [NetworkType.SEGWIT]: 'bitcoin',
  },
  [AssetTicker.USDT]: {
    [NetworkType.ETHEREUM]: 'ethereum',
    [NetworkType.POLYGON]: 'polygon',
    [NetworkType.ARBITRUM]: 'arbitrum',
    [NetworkType.TON]: 'ton',
  },
  [AssetTicker.XAUT]: {`,
      },
      {
        marker: 'solana?: {',
        label: 'Solana chains config type',
        target: `  bitcoin?: BitcoinChainConfig;
  tron?: TronChainConfig;
}`,
        replacement: `  bitcoin?: BitcoinChainConfig;
  tron?: TronChainConfig;
  solana?: {
    rpcUrl?: string;
    wsUrl?: string;
    transferMaxFee?: number;
  };
}`,
      },
      {
        marker: 'chainId: number | string;',
        label: 'Tron gasfree chain id type',
        target: '  chainId: number;',
        replacement: '  chainId: number | string;',
      },
      {
        marker: 'gasFreeApiKey?: string;',
        label: 'Tron gasfree credential type',
        target: `  apiKey: string;
  apiSecret: string;`,
        replacement: `  apiKey: string;
  apiSecret: string;
  gasFreeApiKey?: string;
  gasFreeApiSecret?: string;`,
      },
    ]
  );

  patchFileTransforms(
    join(providerRoot, 'lib', 'module', 'services', 'wdk-service', 'types.js'),
    'WDK compiled directed network types',
    [
      {
        marker: "[NetworkType.SOLANA]: 'solana'",
        label: 'compiled USDT address network coverage',
        target: usdtMapTargetCompiled,
        replacement: usdtMapReplacementCompiled,
      },
      {
        label: 'compiled USDT balance network coverage cleanup',
        target: `export const AssetBalanceMap = {
  [AssetTicker.BTC]: {
    [NetworkType.SEGWIT]: 'bitcoin'
  },
  [AssetTicker.USDT]: {
    [NetworkType.ETHEREUM]: 'ethereum',
    [NetworkType.POLYGON]: 'polygon',
    [NetworkType.ARBITRUM]: 'arbitrum',
    [NetworkType.TON]: 'ton',
    [NetworkType.TRON]: 'tron',
    [NetworkType.SOLANA]: 'solana'
  },
  [AssetTicker.XAUT]: {`,
        replacement: `export const AssetBalanceMap = {
  [AssetTicker.BTC]: {
    [NetworkType.SEGWIT]: 'bitcoin'
  },
  [AssetTicker.USDT]: {
    [NetworkType.ETHEREUM]: 'ethereum',
    [NetworkType.POLYGON]: 'polygon',
    [NetworkType.ARBITRUM]: 'arbitrum',
    [NetworkType.TON]: 'ton'
  },
  [AssetTicker.XAUT]: {`,
      },
    ]
  );

  patchFileTransforms(
    join(providerRoot, 'lib', 'typescript', 'src', 'services', 'wdk-service', 'types.d.ts'),
    'WDK d.ts directed network types',
    [
      {
        marker: 'solana: string;',
        label: 'd.ts USDT address network coverage',
        target: `        arbitrum: string;
        ton: string;`,
        replacement: `        arbitrum: string;
        ton: string;
        tron: string;
        solana: string;`,
      },
      {
        label: 'd.ts USDT balance network coverage cleanup',
        target: `export declare const AssetBalanceMap: {
    btc: {
        bitcoin: string;
    };
    usdt: {
        ethereum: string;
        polygon: string;
        arbitrum: string;
        ton: string;
        tron: string;
        solana: string;
    };
    xaut: {`,
        replacement: `export declare const AssetBalanceMap: {
    btc: {
        bitcoin: string;
    };
    usdt: {
        ethereum: string;
        polygon: string;
        arbitrum: string;
        ton: string;
    };
    xaut: {`,
      },
      {
        marker: 'solana?: {',
        label: 'd.ts Solana chains config type',
        target: `    bitcoin?: BitcoinChainConfig;
    tron?: TronChainConfig;
}`,
        replacement: `    bitcoin?: BitcoinChainConfig;
    tron?: TronChainConfig;
    solana?: {
        rpcUrl?: string;
        wsUrl?: string;
        transferMaxFee?: number;
    };
}`,
      },
      {
        marker: 'chainId: number | string;',
        label: 'd.ts Tron gasfree chain id type',
        target: '    chainId: number;',
        replacement: '    chainId: number | string;',
      },
      {
        marker: 'gasFreeApiKey?: string;',
        label: 'd.ts Tron gasfree credential type',
        target: `    apiKey: string;
    apiSecret: string;`,
        replacement: `    apiKey: string;
    apiSecret: string;
    gasFreeApiKey?: string;
    gasFreeApiSecret?: string;`,
      },
    ]
  );

  patchFileTransforms(
    join(providerRoot, 'src', 'services', 'wdk-service', 'index.ts'),
    'WDK directed network service',
    [
      {
        marker: "tron: 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj'",
        label: 'USDT Tron/Solana token addresses',
        target: `    arbitrum: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    ton: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',`,
        replacement: `    arbitrum: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    ton: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
    tron: 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj',
    solana: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkYAwLr8B5x6R7tHe',`,
      },
      {
        marker: 'ADDRESS_RESOLUTION_TIMEOUT_MS = 15000',
        label: 'directed address timeout',
        target: 'const ADDRESS_RESOLUTION_TIMEOUT_MS = 8000;',
        replacement: 'const ADDRESS_RESOLUTION_TIMEOUT_MS = 15000;',
      },
      {
        marker: 'hasTronGasfreeCredentials',
        label: 'Solana/Tron normal address fallback',
        target: '    if (network === NetworkType.SEGWIT) {',
        replacement: `    const chainsConfig = this.getChainsConfig();
    const tronConfig = chainsConfig?.tron;
    const hasTronGasfreeCredentials =
      Boolean(tronConfig?.gasFreeApiKey || tronConfig?.apiKey) &&
      Boolean(tronConfig?.gasFreeApiSecret || tronConfig?.apiSecret);

    if (
      network === NetworkType.SEGWIT ||
      network === NetworkType.SOLANA ||
      (network === NetworkType.TRON && !hasTronGasfreeCredentials)
    ) {`,
      },
      {
        marker: 'Falling back to standard Tron receive address',
        label: 'Tron gasfree failure fallback',
        target: `    } else {
      return await this.wdkManager.getAbstractedAddress({
        network: toNetwork(network),
        accountIndex: index,
      });
    }`,
        replacement: `    } else {
      try {
        return await this.wdkManager.getAbstractedAddress({
          network: toNetwork(network),
          accountIndex: index,
        });
      } catch (error) {
        if (network !== NetworkType.TRON) {
          throw error;
        }

        console.warn('Falling back to standard Tron receive address:', error);
        return await this.wdkManager.getAddress({
          network: toNetwork(network),
          accountIndex: index,
        });
      }
    }`,
      },
      {
        marker: 'networks?: NetworkType[]',
        label: 'directed resolver signature',
        target: `  async resolveWalletAddresses(
    enabledAssets: AssetTicker[],
    index: number = 0`,
        replacement: `  async resolveWalletAddresses(
    enabledAssets: AssetTicker[],
    index: number = 0,
    networks?: NetworkType[]`,
      },
      {
        marker: 'const requestedNetworks = networks ? new Set(networks) : null;',
        label: 'directed resolver queue',
        target: `    const networkAddresses: Partial<Record<NetworkType, string>> = {};
    const addressesArr = [];

    for (const asset of enabledAssets) {
      for (const networkType of Object.keys(AssetAddressMap[asset])) {
        addressesArr.push({ [networkType]: null });`,
        replacement: `    const networkAddresses: Partial<Record<NetworkType, string>> = {};
    const addressesArr = [];
    const requestedNetworks = networks ? new Set(networks) : null;
    const queuedNetworks = new Set<NetworkType>();

    for (const asset of enabledAssets) {
      for (const networkType of Object.keys(AssetAddressMap[asset])) {
        if (requestedNetworks && !requestedNetworks.has(networkType as NetworkType)) {
          continue;
        }
        if (queuedNetworks.has(networkType as NetworkType)) {
          continue;
        }
        queuedNetworks.add(networkType as NetworkType);
        addressesArr.push({ [networkType]: null });`,
      },
      {
        marker: `NetworkType.TON,
          NetworkType.TRON`,
        label: 'Tron quote support',
        target: `          NetworkType.ARBITRUM,
          NetworkType.TON,`,
        replacement: `          NetworkType.ARBITRUM,
          NetworkType.TON,
          NetworkType.TRON,`,
      },
      {
        marker: `NetworkType.TON,
        NetworkType.TRON`,
        label: 'Tron send support',
        target: `        NetworkType.ARBITRUM,
        NetworkType.TON,`,
        replacement: `        NetworkType.ARBITRUM,
        NetworkType.TON,
        NetworkType.TRON,`,
      },
    ]
  );

  patchFileTransforms(
    join(providerRoot, 'lib', 'module', 'services', 'wdk-service', 'index.js'),
    'WDK compiled directed network service',
    [
      {
        marker: "tron: 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj'",
        label: 'compiled USDT Tron/Solana token addresses',
        target: `    arbitrum: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    ton: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs'`,
        replacement: `    arbitrum: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    ton: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
    tron: 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj',
    solana: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkYAwLr8B5x6R7tHe'`,
      },
      {
        marker: 'ADDRESS_RESOLUTION_TIMEOUT_MS = 15000',
        label: 'compiled directed address timeout',
        target: 'const ADDRESS_RESOLUTION_TIMEOUT_MS = 8000;',
        replacement: 'const ADDRESS_RESOLUTION_TIMEOUT_MS = 15000;',
      },
      {
        marker: 'hasTronGasfreeCredentials',
        label: 'compiled Solana/Tron normal address fallback',
        target: '    if (network === NetworkType.SEGWIT) {',
        replacement: `    const chainsConfig = this.getChainsConfig();
    const tronConfig = chainsConfig?.tron;
    const hasTronGasfreeCredentials = Boolean(tronConfig?.gasFreeApiKey || tronConfig?.apiKey) && Boolean(tronConfig?.gasFreeApiSecret || tronConfig?.apiSecret);
    if (network === NetworkType.SEGWIT || network === NetworkType.SOLANA || network === NetworkType.TRON && !hasTronGasfreeCredentials) {`,
      },
      {
        marker: 'Falling back to standard Tron receive address',
        label: 'compiled Tron gasfree failure fallback',
        target: `    } else {
      return await this.wdkManager.getAbstractedAddress({
        network: toNetwork(network),
        accountIndex: index
      });
    }`,
        replacement: `    } else {
      try {
        return await this.wdkManager.getAbstractedAddress({
          network: toNetwork(network),
          accountIndex: index
        });
      } catch (error) {
        if (network !== NetworkType.TRON) {
          throw error;
        }
        console.warn('Falling back to standard Tron receive address:', error);
        return await this.wdkManager.getAddress({
          network: toNetwork(network),
          accountIndex: index
        });
      }
    }`,
      },
      {
        marker: 'async resolveWalletAddresses(enabledAssets, index = 0, networks)',
        label: 'compiled directed resolver signature',
        target: '  async resolveWalletAddresses(enabledAssets, index = 0) {',
        replacement: '  async resolveWalletAddresses(enabledAssets, index = 0, networks) {',
      },
      {
        marker: 'const requestedNetworks = networks ? new Set(networks) : null;',
        label: 'compiled directed resolver queue',
        target: `    const networkAddresses = {};
    const addressesArr = [];
    for (const asset of enabledAssets) {
      for (const networkType of Object.keys(AssetAddressMap[asset])) {
        addressesArr.push({`,
        replacement: `    const networkAddresses = {};
    const addressesArr = [];
    const requestedNetworks = networks ? new Set(networks) : null;
    const queuedNetworks = new Set();
    for (const asset of enabledAssets) {
      for (const networkType of Object.keys(AssetAddressMap[asset])) {
        if (requestedNetworks && !requestedNetworks.has(networkType)) {
          continue;
        }
        if (queuedNetworks.has(networkType)) {
          continue;
        }
        queuedNetworks.add(networkType);
        addressesArr.push({`,
      },
      {
        marker: 'NetworkType.TON, NetworkType.TRON',
        label: 'compiled Tron quote/send support',
        target: 'NetworkType.ETHEREUM, NetworkType.POLYGON, NetworkType.ARBITRUM, NetworkType.TON',
        replacement: 'NetworkType.ETHEREUM, NetworkType.POLYGON, NetworkType.ARBITRUM, NetworkType.TON, NetworkType.TRON',
      },
    ]
  );

  patchFileTransforms(
    join(providerRoot, 'src', 'contexts', 'types.ts'),
    'WDK directed wallet context types',
    [
      {
        marker: 'NetworkType,',
        label: 'NetworkType context type import',
        target: `  ChainsConfig,
  Transaction,`,
        replacement: `  ChainsConfig,
  NetworkType,
  Transaction,`,
      },
      {
        marker: 'AssetTicker,',
        label: 'AssetTicker context type import',
        target: `  AddressMap,
  Amount,
  BalanceMap,`,
        replacement: `  AddressMap,
  Amount,
  AssetTicker,
  BalanceMap,`,
      },
      {
        marker: 'networks?: NetworkType[];',
        label: 'networks resolver param type',
        target: `    enabledAssets?: AssetTicker[];
    forceUpdate?: boolean;`,
        replacement: `    enabledAssets?: AssetTicker[];
    forceUpdate?: boolean;
    networks?: NetworkType[];`,
      },
    ]
  );

  patchFileTransforms(
    join(providerRoot, 'lib', 'typescript', 'src', 'contexts', 'types.d.ts'),
    'WDK directed wallet context d.ts',
    [
      {
        marker: 'NetworkType, Transaction',
        label: 'NetworkType d.ts context import',
        target: `AssetTicker, BalanceMap, ChainsConfig, Transaction`,
        replacement: `AssetTicker, BalanceMap, ChainsConfig, NetworkType, Transaction`,
      },
      {
        marker: 'networks?: NetworkType[];',
        label: 'networks d.ts resolver param type',
        target: `        enabledAssets?: AssetTicker[];
        forceUpdate?: boolean;`,
        replacement: `        enabledAssets?: AssetTicker[];
        forceUpdate?: boolean;
        networks?: NetworkType[];`,
      },
    ]
  );

  const contextResolverSource = `  const getWalletAddresses = async (enabledAssets: AssetTicker[], forceUpdate = false) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_ADDRESSES);
      if (stored && !forceUpdate) {
        return JSON.parse(stored);
      } else {
        const addresses =
          await WDKService.resolveWalletAddresses(enabledAssets);
        await AsyncStorage.setItem(
          STORAGE_KEY_ADDRESSES,
          JSON.stringify(addresses)
        );
        return addresses;
      }
    } catch (error) {
      console.error('Failed to get wallet addresses:', error);
    }
  };
`;
  const contextResolverReplacement = `  const hasResolvedRequiredWalletAddresses = (addresses?: AddressMap, networks?: NetworkType[]) => {
    const requiredNetworks = networks?.length ? networks : undefined;

    if (requiredNetworks) {
      return requiredNetworks.every(
        (network) => typeof addresses?.[network] === 'string' && addresses[network]?.trim().length > 0
      );
    }

    return Object.values(addresses || {}).some(
      (address) => typeof address === 'string' && address.trim().length > 0
    );
  };

  const getWalletAddresses = async (
    enabledAssets: AssetTicker[],
    forceUpdate = false,
    networks?: NetworkType[]
  ) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_ADDRESSES);
      const storedAddresses: AddressMap = stored ? JSON.parse(stored) : {};

      if (stored && !forceUpdate && hasResolvedRequiredWalletAddresses(storedAddresses, networks)) {
        return storedAddresses;
      } else {
        const addresses =
          await WDKService.resolveWalletAddresses(enabledAssets, 0, networks);
        const mergedAddresses = { ...storedAddresses, ...addresses };
        await AsyncStorage.setItem(
          STORAGE_KEY_ADDRESSES,
          JSON.stringify(mergedAddresses)
        );
        return mergedAddresses;
      }
    } catch (error) {
      console.error('Failed to get wallet addresses:', error);
    }
  };
`;

  patchFileTransforms(
    join(providerRoot, 'src', 'contexts', 'wallet-context.tsx'),
    'WDK directed wallet context',
    [
      {
        marker: 'NetworkType,',
        label: 'NetworkType wallet context import',
        target: `  BalanceMap,
  TransactionMap,`,
        replacement: `  BalanceMap,
  NetworkType,
  TransactionMap,`,
      },
      {
        marker: 'hasResolvedRequiredWalletAddresses',
        label: 'directed wallet address cache',
        target: contextResolverSource,
        replacement: contextResolverReplacement,
      },
      {
        marker: 'networks?: NetworkType[];',
        label: 'directed resolver params',
        target: `    enabledAssets?: AssetTicker[];
    forceUpdate?: boolean;`,
        replacement: `    enabledAssets?: AssetTicker[];
    forceUpdate?: boolean;
    networks?: NetworkType[];`,
      },
      {
        marker: 'params?.networks',
        label: 'directed resolver call',
        target: `      const addresses = await getWalletAddresses(enabledAssets, params?.forceUpdate);

      if (!hasResolvedWalletAddress(addresses)) {`,
        replacement: `      const addresses = await getWalletAddresses(
        enabledAssets,
        params?.forceUpdate,
        params?.networks
      );

      if (!hasResolvedRequiredWalletAddresses(addresses, params?.networks)) {`,
      },
    ]
  );

  const compiledContextResolverSource = `  const getWalletAddresses = async (enabledAssets, forceUpdate = false) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_ADDRESSES);
      if (stored && !forceUpdate) {
        return JSON.parse(stored);
      } else {
        const addresses = await WDKService.resolveWalletAddresses(enabledAssets);
        await AsyncStorage.setItem(STORAGE_KEY_ADDRESSES, JSON.stringify(addresses));
        return addresses;
      }
    } catch (error) {
      console.error('Failed to get wallet addresses:', error);
    }
  };
`;
  const compiledContextResolverReplacement = `  const hasResolvedRequiredWalletAddresses = (addresses, networks) => {
    const requiredNetworks = networks?.length ? networks : undefined;
    if (requiredNetworks) {
      return requiredNetworks.every(network => typeof addresses?.[network] === 'string' && addresses[network]?.trim().length > 0);
    }
    return Object.values(addresses || {}).some(address => typeof address === 'string' && address.trim().length > 0);
  };
  const getWalletAddresses = async (enabledAssets, forceUpdate = false, networks) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_ADDRESSES);
      const storedAddresses = stored ? JSON.parse(stored) : {};
      if (stored && !forceUpdate && hasResolvedRequiredWalletAddresses(storedAddresses, networks)) {
        return storedAddresses;
      } else {
        const addresses = await WDKService.resolveWalletAddresses(enabledAssets, 0, networks);
        const mergedAddresses = {
          ...storedAddresses,
          ...addresses
        };
        await AsyncStorage.setItem(STORAGE_KEY_ADDRESSES, JSON.stringify(mergedAddresses));
        return mergedAddresses;
      }
    } catch (error) {
      console.error('Failed to get wallet addresses:', error);
    }
  };
`;

  patchFileTransforms(
    join(providerRoot, 'lib', 'module', 'contexts', 'wallet-context.js'),
    'WDK compiled directed wallet context',
    [
      {
        marker: 'hasResolvedRequiredWalletAddresses',
        label: 'compiled directed wallet address cache',
        target: compiledContextResolverSource,
        replacement: compiledContextResolverReplacement,
      },
      {
        marker: 'params?.networks',
        label: 'compiled directed resolver call',
        target: `      const addresses = await getWalletAddresses(enabledAssets, params?.forceUpdate);
      if (!hasResolvedWalletAddress(addresses)) {`,
        replacement: `      const addresses = await getWalletAddresses(enabledAssets, params?.forceUpdate, params?.networks);
      if (!hasResolvedRequiredWalletAddresses(addresses, params?.networks)) {`,
      },
    ]
  );
}

function patchWdkAddressResolutionTimeout() {
  const providerRoot = join(projectRoot, 'node_modules', '@tetherto', 'wdk-react-native-provider');

  const files = [
    {
      path: join(providerRoot, 'src', 'services', 'wdk-service', 'index.ts'),
      marker: 'ADDRESS_RESOLUTION_TIMEOUT_MS',
      description: 'WDK address timeout service',
      patches: [
        {
          label: 'address timeout constant',
          target: `};

const toNetwork = (n: NetworkType): string => {`,
          replacement: `};

const ADDRESS_RESOLUTION_TIMEOUT_MS = 8000;

const toNetwork = (n: NetworkType): string => {`,
        },
        {
          label: 'address timeout method',
          target: `  async resolveWalletAddresses(
    enabledAssets: AssetTicker[],`,
          replacement: `  private async getAssetAddressWithTimeout(
    network: NetworkType,
    index: number
  ): Promise<{ address: string }> {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        this.getAssetAddress(network, index),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            reject(new Error(\`Timed out resolving wallet address for \${network}\`));
          }, ADDRESS_RESOLUTION_TIMEOUT_MS);
        }),
      ]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  async resolveWalletAddresses(
    enabledAssets: AssetTicker[],`,
        },
        {
          label: 'address timeout usage',
          target: `          this.getAssetAddress(networkType as NetworkType, index)`,
          replacement: `          this.getAssetAddressWithTimeout(networkType as NetworkType, index)`,
        },
        {
          label: 'evm fallback mapping',
          target: `    networkAddresses[NetworkType.POLYGON] =
      networkAddresses[NetworkType.ETHEREUM];
    networkAddresses[NetworkType.ARBITRUM] =
      networkAddresses[NetworkType.ETHEREUM];`,
          replacement: `    const evmAddress =
      networkAddresses[NetworkType.ETHEREUM] ||
      networkAddresses[NetworkType.POLYGON] ||
      networkAddresses[NetworkType.ARBITRUM];

    if (evmAddress) {
      networkAddresses[NetworkType.ETHEREUM] = evmAddress;
      networkAddresses[NetworkType.POLYGON] = evmAddress;
      networkAddresses[NetworkType.ARBITRUM] = evmAddress;
    }`,
        },
        {
          label: 'address timeout warning',
          target: `        console.error(
          \`Error while resolving wallet address \${key} - err - \${(addresses[i] as any).reason}\`
        );`,
          replacement: `        console.warn(
          \`Error while resolving wallet address \${key} - err - \${(addresses[i] as any).reason}\`
        );`,
        },
      ],
    },
    {
      path: join(providerRoot, 'lib', 'module', 'services', 'wdk-service', 'index.js'),
      marker: 'ADDRESS_RESOLUTION_TIMEOUT_MS',
      description: 'WDK compiled address timeout service',
      patches: [
        {
          label: 'compiled address timeout constant',
          target: `};
const toNetwork = n => {`,
          replacement: `};
const ADDRESS_RESOLUTION_TIMEOUT_MS = 8000;
const toNetwork = n => {`,
        },
        {
          label: 'compiled address timeout method',
          target: `  async resolveWalletAddresses(enabledAssets, index = 0) {`,
          replacement: `  async getAssetAddressWithTimeout(network, index) {
    let timeout;
    try {
      return await Promise.race([this.getAssetAddress(network, index), new Promise((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(\`Timed out resolving wallet address for \${network}\`));
        }, ADDRESS_RESOLUTION_TIMEOUT_MS);
      })]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
  async resolveWalletAddresses(enabledAssets, index = 0) {`,
        },
        {
          label: 'compiled address timeout usage',
          target: `addressPromises.push(this.getAssetAddress(networkType, index));`,
          replacement: `addressPromises.push(this.getAssetAddressWithTimeout(networkType, index));`,
        },
        {
          label: 'compiled evm fallback mapping',
          target: `    networkAddresses[NetworkType.POLYGON] = networkAddresses[NetworkType.ETHEREUM];
    networkAddresses[NetworkType.ARBITRUM] = networkAddresses[NetworkType.ETHEREUM];`,
          replacement: `    const evmAddress = networkAddresses[NetworkType.ETHEREUM] || networkAddresses[NetworkType.POLYGON] || networkAddresses[NetworkType.ARBITRUM];
    if (evmAddress) {
      networkAddresses[NetworkType.ETHEREUM] = evmAddress;
      networkAddresses[NetworkType.POLYGON] = evmAddress;
      networkAddresses[NetworkType.ARBITRUM] = evmAddress;
    }`,
        },
        {
          label: 'compiled address timeout warning',
          target: `        console.error(\`Error while resolving wallet address \${key} - err - \${addresses[i].reason}\`);`,
          replacement: `        console.warn(\`Error while resolving wallet address \${key} - err - \${addresses[i].reason}\`);`,
        },
      ],
    },
  ];

  for (const file of files) {
    patchFileOnce(file);
  }
}

patchAxiosAdapterName();
patchFreeportAsync();
patchWdkKeychainBiometryGuard();
patchWdkWalletCreationFlow();
patchWdkWalletAddressReadiness();
patchWdkAddressResolutionTimeout();
patchWdkDirectedNetworkResolution();
