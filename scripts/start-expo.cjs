const { spawn } = require('node:child_process');

const cliArgs = process.argv.slice(2);
const usesTunnel = cliArgs.includes('--tunnel');
const usesOffline = cliArgs.includes('--offline');

// Let the Expo CLI enable offline mode through its official --offline flag.
// Forcing only EXPO_OFFLINE while also passing --host prevents Expo Go from
// obtaining or generating the development manifest signature.
if (usesTunnel || !usesOffline) {
  delete process.env.EXPO_OFFLINE;
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
