/**
 * Damage overlay — red vignette effect when player takes damage.
 */

export function drawDamageOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
): void {
  if (intensity <= 0) return;

  const clamped = Math.min(1, intensity);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.max(width, height) * 0.7;

  const gradient = ctx.createRadialGradient(
    centerX, centerY, radius * 0.3,
    centerX, centerY, radius,
  );

  gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
  gradient.addColorStop(1, `rgba(255, 0, 0, ${(clamped * 0.6).toFixed(3)})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}
