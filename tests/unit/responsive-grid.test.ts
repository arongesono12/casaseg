import { describe, expect, test } from 'bun:test';

import { responsiveGridColumns } from '../../src/lib/responsive-grid';

describe('responsive property grid', () => {
  test('keeps a readable single card on narrow phones', () => {
    expect(responsiveGridColumns(320, 1180, 12, 12, 1, 4)).toBe(1);
    expect(responsiveGridColumns(375, 720, 16, 12, 1, 3)).toBe(1);
  });

  test('uses the available width in larger orientations', () => {
    expect(responsiveGridColumns(430, 1180, 12, 12, 1, 4)).toBe(2);
    expect(responsiveGridColumns(900, 1180, 12, 12, 1, 4)).toBe(4);
    expect(responsiveGridColumns(1366, 1180, 12, 12, 1, 4)).toBe(4);
  });

  test('reserves more width when system text is enlarged', () => {
    expect(responsiveGridColumns(430, 1180, 12, 12, 1.5, 4)).toBe(1);
    expect(responsiveGridColumns(720, 720, 16, 12, 1.5, 3)).toBe(2);
  });
});
