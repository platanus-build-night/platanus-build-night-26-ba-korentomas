/**
 * Crosshair — simple center cross with white 70% opacity.
 */

const ARM_LENGTH = 10;
const LINE_WIDTH = 2;
const GAP = 3;

export function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
): void {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineCap = 'round';

  // Horizontal line (left arm)
  ctx.beginPath();
  ctx.moveTo(centerX - ARM_LENGTH, centerY);
  ctx.lineTo(centerX - GAP, centerY);
  ctx.stroke();

  // Horizontal line (right arm)
  ctx.beginPath();
  ctx.moveTo(centerX + GAP, centerY);
  ctx.lineTo(centerX + ARM_LENGTH, centerY);
  ctx.stroke();

  // Vertical line (top arm)
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - ARM_LENGTH);
  ctx.lineTo(centerX, centerY - GAP);
  ctx.stroke();

  // Vertical line (bottom arm)
  ctx.beginPath();
  ctx.moveTo(centerX, centerY + GAP);
  ctx.lineTo(centerX, centerY + ARM_LENGTH);
  ctx.stroke();
}
