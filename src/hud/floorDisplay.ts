/**
 * Floor number display — centered gold text at top of screen.
 */

const FLOOR_COLOR = '#daa520';

export function drawFloorNumber(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  floor: number,
): void {
  const text = `FLOOR ${floor}`;

  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = FLOOR_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(text, centerX, y);
}
