/**
 * Health bar renderer — top-left red bar with pulsing low-health effect.
 */

const BG_COLOR = '#333333';
const FILL_COLOR = '#cc2222';
const LOW_HEALTH_THRESHOLD = 0.3;

export function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  health: number,
  maxHealth: number,
): void {
  const ratio = Math.max(0, Math.min(1, health / maxHealth));

  // Background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(x, y, width, height);

  // Health fill
  const fillWidth = width * ratio;

  if (ratio < LOW_HEALTH_THRESHOLD && ratio > 0) {
    // Pulsing effect when low health — oscillate alpha
    const pulse = 0.6 + 0.4 * Math.sin(performance.now() * 0.006);
    ctx.globalAlpha = pulse;
  }

  ctx.fillStyle = FILL_COLOR;
  ctx.fillRect(x, y, fillWidth, height);
  ctx.globalAlpha = 1;

  // Border
  ctx.strokeStyle = BG_COLOR;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
}
