import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { brand, darkPalette, lightPalette, actionGradient, heroGradient, colors } from '../../src/constants/brand';
import { contrastRatio, mixHex } from '../../src/lib/color-contrast';

// WCAG 2.1 AA: 4.5:1 para texto normal, 3:1 para iconos y elementos gráficos.
const TEXT = 4.5;
const GRAPHIC = 3;

describe('paleta derivada del logo', () => {
  test('los colores de marca salen del logo', () => {
    expect(brand.logo.deep).toBe('#1D66A3');
    expect(brand.logo.sky).toBe('#36A9E1');
    expect(colors.brand).toBe(brand.logo.deep);
  });

  test('texto legible sobre los fondos claros', () => {
    for (const background of [lightPalette.background, lightPalette.surface, lightPalette.subtle]) {
      expect(contrastRatio(lightPalette.text, background)).toBeGreaterThanOrEqual(TEXT);
      expect(contrastRatio(lightPalette.textSecondary, background)).toBeGreaterThanOrEqual(TEXT);
      expect(contrastRatio(lightPalette.brandText, background)).toBeGreaterThanOrEqual(TEXT);
      expect(contrastRatio(lightPalette.errorText, background)).toBeGreaterThanOrEqual(TEXT);
      expect(contrastRatio(lightPalette.muted, background)).toBeGreaterThanOrEqual(GRAPHIC);
      expect(contrastRatio(lightPalette.brandIcon, background)).toBeGreaterThanOrEqual(GRAPHIC);
    }
  });

  test('texto legible sobre los fondos oscuros', () => {
    for (const background of [darkPalette.background, darkPalette.surface, darkPalette.elevated]) {
      expect(contrastRatio(darkPalette.text, background)).toBeGreaterThanOrEqual(TEXT);
      expect(contrastRatio(darkPalette.textSecondary, background)).toBeGreaterThanOrEqual(TEXT);
      expect(contrastRatio(darkPalette.brandText, background)).toBeGreaterThanOrEqual(TEXT);
      expect(contrastRatio(darkPalette.errorText, background)).toBeGreaterThanOrEqual(TEXT);
      expect(contrastRatio(darkPalette.muted, background)).toBeGreaterThanOrEqual(GRAPHIC);
      expect(contrastRatio(darkPalette.brandIcon, background)).toBeGreaterThanOrEqual(GRAPHIC);
    }
  });

  test('el texto blanco de los botones se lee sobre su degradado', () => {
    const [start, end] = actionGradient;
    // La etiqueta va centrada: su fondo real es el tramo central del degradado.
    for (const amount of [0.25, 0.5, 0.75]) {
      expect(contrastRatio(colors.onBrand, mixHex(start, end, amount))).toBeGreaterThanOrEqual(TEXT);
    }
    // En los extremos solo hay iconos (flechas, spinner): basta el mínimo gráfico.
    for (const stop of [start, end]) {
      expect(contrastRatio(colors.onBrand, stop)).toBeGreaterThanOrEqual(GRAPHIC);
    }
  });

  test('el texto de la cabecera se lee en todo su degradado', () => {
    for (const stop of heroGradient) {
      expect(contrastRatio(colors.onBrand, stop)).toBeGreaterThanOrEqual(TEXT);
      expect(contrastRatio(colors.onBrandMuted, stop)).toBeGreaterThanOrEqual(TEXT);
    }
  });

  test('la selección se lee sobre su fondo suave', () => {
    expect(contrastRatio(colors.brandDark, colors.brandSoft)).toBeGreaterThanOrEqual(TEXT);
  });
});

// Colores de la identidad anterior (azul genérico, turquesa y morado). Si vuelven
// a aparecer escritos a mano en una pantalla, la app deja de verse uniforme.
const RETIRED_COLORS = [
  '#2563EB', '#1D4ED8', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#EFF6FF', '#172554',
  '#0B2545', '#0F3F7A', '#0E7490', '#0369A1', '#14B8A6', '#0F766E', '#0D9488', '#14B3AA', '#1D65A2',
  '#7C3AED', '#6D28D9', '#9333EA', '#3B0764', '#C4B5FD', '#DDD6FE', '#EDE9FE',
  '#2D91CC', '#247EC7', '#67C7F3', '#7DD3FC',
  // Neutros con matiz verdoso y fondos oscuros propios del onboarding anterior.
  '#E8F2F3', '#E6EFF2', '#AFC3CC', '#06111E', '#0B2036', '#0D2740', '#102233',
];
const RETIRED_RGB = ['37,99,235', '59,130,246', '29,78,216', '96,165,250', '15,118,110', '14,116,144', '20,179,170', '124,58,237', '109,40,217', '45,145,204', '103,199,243', '15,45,92'];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|ts)$/.test(name) ? [path] : [];
  });
}

describe('control de colores', () => {
  test('ninguna pantalla usa colores retirados de la marca', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(join(import.meta.dir, '../../src'))) {
      const source = readFileSync(file, 'utf8');
      const upper = source.toUpperCase();
      const compact = source.replace(/\s+/g, '');
      for (const color of RETIRED_COLORS) if (upper.includes(color)) offenders.push(`${file}: ${color}`);
      for (const rgb of RETIRED_RGB) if (compact.includes(`rgba(${rgb},`) || compact.includes(`rgb(${rgb})`)) offenders.push(`${file}: rgba(${rgb})`);
    }
    expect(offenders).toEqual([]);
  });
});
