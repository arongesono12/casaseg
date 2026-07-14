const { getDefaultConfig } = require('@expo/metro-config');

// Metro only enables its recursive native watcher on macOS. Node also supports
// recursive fs.watch on Windows, but Windows may emit events without a path.
// Ignore those incomplete events before Metro passes them to path.resolve;
// otherwise the dev server crashes while Expo Go downloads the first bundle.
if (process.platform === 'win32') {
  const NativeWatcher = require('metro-file-map/private/watchers/NativeWatcher').default;
  const handleEvent = NativeWatcher.prototype._handleEvent;

  NativeWatcher.prototype._handleEvent = function handleWindowsEvent(relativePath) {
    if (typeof relativePath !== 'string' || relativePath.length === 0) {
      return Promise.resolve();
    }

    return handleEvent.call(this, relativePath);
  };
  NativeWatcher.isSupported = () => true;
}

const config = getDefaultConfig(__dirname);

config.transformer.workerThreads = true;
config.maxWorkers = 4;

module.exports = config;
