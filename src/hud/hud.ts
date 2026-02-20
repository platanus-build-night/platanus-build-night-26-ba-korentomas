/**
 * HUD manager — single Canvas2D overlay for all in-game UI elements.
 * Receives HUDState data and draws health bar, score, crosshair,
 * floor number, weapon sprite, and damage overlay.
 */

import { drawHealthBar } from './healthBar';
import { drawScore } from './scoreDisplay';
import { drawCrosshair } from './crosshair';
import { drawFloorNumber } from './floorDisplay';
import { drawDamageOverlay } from './damageOverlay';

export interface HUDState {
  health: number;
  maxHealth: number;
  score: number;
  floor: number;
  isAttacking: boolean;
  attackProgress: number;
  damageFlash: number;
}

export class HUD {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '10';

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context for HUD canvas');
    this.ctx = ctx;

    this.resize();
    document.body.appendChild(this.canvas);
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  update(state: HUDState, _delta: number): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const margin = 20;

    // Clear
    this.ctx.clearRect(0, 0, w, h);

    // Scale HUD element sizes relative to canvas height
    const scale = h / 1080;
    const barWidth = 200 * scale;
    const barHeight = 20 * scale;
    const fontSize24 = Math.round(24 * scale);
    const fontSize18 = Math.round(18 * scale);

    // Health bar — top-left
    drawHealthBar(this.ctx, margin, margin, barWidth, barHeight, state.health, state.maxHealth);

    // Score — top-right
    this.ctx.font = `bold ${fontSize24}px monospace`;
    drawScore(this.ctx, w - margin, margin, state.score);

    // Floor number — top-center
    this.ctx.font = `bold ${fontSize18}px monospace`;
    drawFloorNumber(this.ctx, w / 2, margin, state.floor);

    // Crosshair — center
    drawCrosshair(this.ctx, w / 2, h / 2);

    // Damage overlay — fullscreen vignette
    if (state.damageFlash > 0) {
      drawDamageOverlay(this.ctx, w, h, state.damageFlash);
    }
  }

  show(): void {
    this.canvas.style.display = 'block';
  }

  hide(): void {
    this.canvas.style.display = 'none';
  }

  dispose(): void {
    this.canvas.remove();
  }
}
