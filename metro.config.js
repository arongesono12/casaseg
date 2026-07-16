const { getDefaultConfig } = require('expo/metro-config');

// Keep Metro's official Windows fallback watcher. NativeWatcher assumes every
// fs.watch event includes a path, but Windows can emit null and crash Metro.
const config = getDefaultConfig(__dirname);

config.transformer.workerThreads = true;
config.maxWorkers = 4;

module.exports = config;
