/**
 * Score display — top-right gold monospace text.
 */

const SCORE_COLOR = '#daa520';

export function drawScore(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  score: number,
): void {
  const text = `SCORE: ${String(score).padStart(6, '0')}`;

  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = SCORE_COLOR;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
}
