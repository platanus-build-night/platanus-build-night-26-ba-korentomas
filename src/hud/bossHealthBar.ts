export class BossHealthBar {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private visible = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 400;
    this.canvas.height = 50;
    Object.assign(this.canvas.style, {
      position: 'fixed',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '400px',
      height: '50px',
      pointerEvents: 'none',
      zIndex: '12',
      display: 'none',
    });

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context for boss health bar');
    this.ctx = ctx;

    document.body.appendChild(this.canvas);
  }

  show(name: string): void {
    if (!this.visible) {
      this.visible = true;
      this.canvas.style.display = 'block';
    }
    // Draw name above bar
    this.ctx.clearRect(0, 0, 400, 50);
    this.ctx.font = 'bold 14px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#ff4444';
    this.ctx.fillText(name, 200, 14);
  }

  hide(): void {
    if (this.visible) {
      this.visible = false;
      this.canvas.style.display = 'none';
    }
  }

  update(health: number, maxHealth: number): void {
    const barY = 20;
    const barW = 380;
    const barH = 20;
    const barX = 10;
    const ratio = Math.max(0, Math.min(1, health / maxHealth));

    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(barX, barY, barW, barH);

    // Health fill
    this.ctx.fillStyle = '#cc2222';
    this.ctx.fillRect(barX + 1, barY + 1, (barW - 2) * ratio, barH - 2);

    // Border
    this.ctx.strokeStyle = '#ff4444';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(barX, barY, barW, barH);
  }

  dispose(): void {
    this.canvas.remove();
  }
}
