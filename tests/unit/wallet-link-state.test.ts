import { describe, expect, test } from 'bun:test';

import { mapWalletBalance, walletLinkOutcome } from '../../src/features/payments/wallet-link-state';

describe('vuelta de FondosEG a la app', () => {
  test('lee el estado con el que redirige la función', () => {
    expect(walletLinkOutcome({ type: 'success', url: 'casaseg://wallet-link?status=linked' })).toBe('linked');
    expect(walletLinkOutcome({ type: 'success', url: 'casaseg://wallet-link?status=denied' })).toBe('denied');
    expect(walletLinkOutcome({ type: 'success', url: 'casaseg://wallet-link?status=error' })).toBe('error');
  });

  test('cerrar el navegador no es un error', () => {
    expect(walletLinkOutcome({ type: 'cancel' })).toBe('dismissed');
    expect(walletLinkOutcome({ type: 'dismiss' })).toBe('dismissed');
  });

  test('un estado desconocido se trata como error', () => {
    expect(walletLinkOutcome({ type: 'success', url: 'casaseg://wallet-link?status=hacked' })).toBe('error');
    expect(walletLinkOutcome({ type: 'success', url: 'no es una url' })).toBe('error');
  });
});

describe('saldo de la billetera', () => {
  test('sin vincular no hay saldo', () => {
    expect(mapWalletBalance({ linked: false })).toEqual({ linked: false });
  });

  test('vinculada devuelve el saldo y el teléfono enmascarado', () => {
    expect(mapWalletBalance({ linked: true, walletPhoneMasked: '•••• 0111', available: '400000', currency: 'XAF', asOf: 't' }))
      .toEqual({ linked: true, walletPhoneMasked: '•••• 0111', available: 400000, currency: 'XAF', asOf: 't' });
  });

  test('rechaza un saldo que no es un número', () => {
    expect(() => mapWalletBalance({ linked: true, available: 'abc' })).toThrow('saldo no válido');
  });
});
