const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Temporarily disable package.json:exports to fix bundling issues with SDK 53
config.resolver.unstable_enablePackageExports = false;

// Add resolver configuration to handle Node.js modules
config.resolver.alias = {
  ...config.resolver.alias,
  crypto: require.resolve('expo-crypto'),
  stream: require.resolve('readable-stream'),
  url: require.resolve('react-native-url-polyfill'),
  https: false,
  http: false,
  fs: false,
  net: false,
  tls: false,
  ws: false,
};

// Add platform-specific extensions
config.resolver.platforms = ['ios', 'android', 'web'];

// Enable inline requires for faster start-up (modules evaluated lazily)
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config; 