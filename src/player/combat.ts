import { Vector3 } from 'three';

const ATTACK_COOLDOWN = 0.5;
const ATTACK_RANGE = 2.5;
const ATTACK_CONE_COS = Math.cos((60 * Math.PI) / 180); // 60-degree half-angle
const DAMAGE_PER_HIT = 15;

// Reusable vector to avoid allocations in hot path
const _toTarget = new Vector3();

export interface CombatTarget {
  position: Vector3;
  id: number;
}

export class SwordCombat {
  readonly damage = DAMAGE_PER_HIT;

  private _cooldownRemaining = 0;
  private _attacking = false;
  private _attackProgress = 0;

  /** Start a sword swing if not on cooldown. */
  startAttack(): void {
    if (this._cooldownRemaining > 0) return;
    this._attacking = true;
    this._attackProgress = 0;
    this._cooldownRemaining = ATTACK_COOLDOWN;
  }

  /** Advance cooldown and attack animation. */
  update(delta: number): void {
    if (this._cooldownRemaining > 0) {
      this._cooldownRemaining -= delta;
      if (this._cooldownRemaining < 0) this._cooldownRemaining = 0;
    }

    if (this._attacking) {
      this._attackProgress += delta / ATTACK_COOLDOWN;
      if (this._attackProgress >= 1) {
        this._attackProgress = 1;
        this._attacking = false;
      }
    }
  }

  isAttacking(): boolean {
    return this._attacking;
  }

  /** Returns 0-1 progress through the current attack swing. */
  getAttackProgress(): number {
    return this._attackProgress;
  }

  /**
   * Check which targets are hit by the sword swing.
   * A target is hit if it's within ATTACK_RANGE and within the forward cone.
   * Returns array of IDs of hit targets.
   */
  checkHits(
    playerPos: Vector3,
    playerDir: Vector3,
    targets: CombatTarget[],
  ): number[] {
    const hitIds: number[] = [];

    for (const target of targets) {
      _toTarget.copy(target.position).sub(playerPos);
      // Ignore Y difference for cone check
      _toTarget.y = 0;
      const dist = _toTarget.length();

      if (dist > ATTACK_RANGE) continue;
      if (dist < 0.001) {
        // Target is essentially on top of player — count as hit
        hitIds.push(target.id);
        continue;
      }

      _toTarget.normalize();
      const dot = _toTarget.dot(playerDir);
      if (dot >= ATTACK_CONE_COS) {
        hitIds.push(target.id);
      }
    }

    return hitIds;
  }
}
