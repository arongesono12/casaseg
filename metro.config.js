const { getDefaultConfig } = require('expo/metro-config');

// Keep Metro's official Windows fallback watcher. NativeWatcher assumes every
// fs.watch event includes a path, but Windows can emit null and crash Metro.
const config = getDefaultConfig(__dirname);

config.transformer.workerThreads = true;
config.maxWorkers = 4;

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
