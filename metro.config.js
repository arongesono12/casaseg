const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Zustand 5 exposes an ESM middleware build containing import.meta. Metro's
// web export currently emits a classic script, so resolve only this entry to
// its equivalent CommonJS build. Native platforms keep Expo's defaults.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'zustand/middleware') {
    return { filePath: require.resolve('zustand/middleware'), type: 'sourceFile' };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
