const { spawn } = require('node:child_process');

const cliArgs = process.argv.slice(2);
const usesTunnel = cliArgs.includes('--tunnel');

// Expo tunnels require network access. Keep LAN starts available in offline
// mode, but never pass EXPO_OFFLINE to ngrok because the two are incompatible.
if (usesTunnel) {
  delete process.env.EXPO_OFFLINE;
} else {
  process.env.EXPO_OFFLINE ??= '1';
}
process.env.EXPO_NO_DEPENDENCY_VALIDATION ??= '1';

const expoCli = require.resolve('expo/bin/cli');
const args = ['start', ...cliArgs];

const child = spawn(process.execPath, [expoCli, ...args], {
  env: process.env,
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
