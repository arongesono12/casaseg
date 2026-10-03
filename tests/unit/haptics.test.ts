import { beforeEach, describe, expect, mock, test } from 'bun:test';

const calls: string[] = [];
const platform = { OS: 'ios' };
const engine = { broken: false };

mock.module('react-native', () => ({ Platform: platform }));
mock.module('expo-haptics', () => ({
  AndroidHaptics: { Clock_Tick: 'clock-tick', Virtual_Key: 'virtual-key', Confirm: 'confirm', Reject: 'reject' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  selectionAsync: async () => { calls.push('ios:selection'); },
  impactAsync: async (style: string) => {
    if (engine.broken) throw new Error('no engine');
    calls.push(`ios:impact:${style}`);
  },
  notificationAsync: async (type: string) => { calls.push(`ios:notification:${type}`); },
  performAndroidHapticsAsync: async (type: string) => { calls.push(`android:${type}`); },
}));

const { haptics } = await import('../../src/lib/haptics');

describe('haptics', () => {
  beforeEach(() => { calls.length = 0; });

  test('uses the iOS notification engine for success and error', () => {
    platform.OS = 'ios';
    haptics.success();
    haptics.error();
    expect(calls).toEqual(['ios:notification:success', 'ios:notification:error']);
  });

  test('uses native Android feedback constants instead of vibration patterns', () => {
    platform.OS = 'android';
    haptics.selection();
    haptics.toggle(true);
    haptics.error();
    expect(calls).toEqual(['android:clock-tick', 'android:confirm', 'android:reject']);
  });

  test('does nothing on web', () => {
    platform.OS = 'web';
    haptics.tap();
    expect(calls).toEqual([]);
  });

  test('a failing haptic engine never throws into the caller', async () => {
    platform.OS = 'ios';
    engine.broken = true;
    expect(() => haptics.tap()).not.toThrow();
    // Deja que la promesa rechazada se resuelva: sin el catch interno, bun la reportaría.
    await new Promise((resolve) => setTimeout(resolve, 0));
    engine.broken = false;
  });
});
