/** Keep cards wide enough for readable text and a full-size favorite control. */
export function responsiveGridColumns(
  viewportWidth: number,
  maxContentWidth: number,
  horizontalPadding: number,
  gap: number,
  fontScale: number,
  maxColumns: number,
): number {
  const available = Math.max(0, Math.min(viewportWidth, maxContentWidth) - horizontalPadding * 2);
  const minCardWidth = 190 * Math.max(1, Math.min(fontScale, 1.6));
  return Math.max(1, Math.min(maxColumns, Math.floor((available + gap) / (minCardWidth + gap))));
}
