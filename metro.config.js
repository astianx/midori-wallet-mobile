const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { configureMetroForWDK } = require('@tetherto/wdk-react-native-provider/metro-polyfills');

// Root of the monorepo (one level above the mobile project)
const monorepoRoot = path.resolve(__dirname, '..');

const config = getDefaultConfig(__dirname);

const { transformer, resolver } = config;

// Watch the shared folder so Metro can resolve cross-project imports
config.watchFolders = [monorepoRoot];

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter(ext => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
  // Ensure module paths include root node_modules
  nodeModulesPaths: [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(monorepoRoot, 'node_modules'),
  ],
  alias: {
    '@': path.resolve(__dirname, 'src'),
  },
};

// Apply WDK polyfills configuration first (handles Node.js core module polyfills)
const wdkConfig = configureMetroForWDK(config);

// Now wrap the WDK's resolveRequest with our custom alias logic
const wdkResolveRequest = wdkConfig.resolver.resolveRequest;
const webAliases = {
  '@tetherto/wdk-react-native-provider': path.resolve(
    __dirname,
    'src/web/wdk-react-native-provider.tsx'
  ),
  '@tetherto/wdk-uikit-react-native': path.resolve(
    __dirname,
    'src/web/wdk-uikit-react-native.tsx'
  ),
};

wdkConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webAliases[moduleName]) {
    return context.resolveRequest(context, webAliases[moduleName], platform);
  }

  // Handle @/ alias
  if (moduleName.startsWith('@/')) {
    const resolvedPath = moduleName.replace('@/', path.resolve(__dirname, 'src') + '/');
    try {
      return context.resolveRequest(context, resolvedPath, platform);
    } catch (e) {
      // If the resolved path fails, fall through to WDK resolver
    }
  }

  // Delegate to WDK's resolveRequest
  return wdkResolveRequest(context, moduleName, platform);
};

module.exports = wdkConfig;
