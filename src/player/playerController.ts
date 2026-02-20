import { PerspectiveCamera, Vector3 } from 'three';
import { CellType } from '../dungeon/types';
import { resolveMovement } from './collision';
import { cheats } from '../cheats/cheatState';

const MOVE_SPEED = 5;
const MOUSE_SENSITIVITY = 0.004;
const PITCH_LIMIT = (80 * Math.PI) / 180; // +-80 degrees
const EYE_HEIGHT = 2.5;
const PLAYER_RADIUS = 0.3;

export class PlayerController {
  health = 100;
  score = 0;

  private camera: PerspectiveCamera;
  private grid: CellType[][];

  private yaw = 0;
  private pitch = 0;
  private readonly position = new Vector3(0, EYE_HEIGHT, 0);

  // Cached vectors — never allocate in update()
  private readonly _forward = new Vector3();
  private readonly _right = new Vector3();
  private readonly _direction = new Vector3();

  // Key state
  private readonly keys: Record<string, boolean> = {};

  // Bound handlers for cleanup
  private readonly onKeyDown: (e: KeyboardEvent) => void;
  private readonly onKeyUp: (e: KeyboardEvent) => void;
  private readonly onMouseMove: (e: MouseEvent) => void;

  constructor(camera: PerspectiveCamera, grid: CellType[][]) {
    this.camera = camera;
    this.grid = grid;

    // Sync initial position from camera
    this.position.copy(camera.position);
    this.position.y = EYE_HEIGHT;

    this.onKeyDown = (e: KeyboardEvent) => {
      this.keys[e.code] = true;
    };

    this.onKeyUp = (e: KeyboardEvent) => {
      this.keys[e.code] = false;
    };

    this.onMouseMove = (e: MouseEvent) => {
      if (!document.pointerLockElement) return;
      this.yaw -= e.movementX * MOUSE_SENSITIVITY;
      this.pitch -= e.movementY * MOUSE_SENSITIVITY;
      this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch));
    };

    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
  }

  get isDead(): boolean {
    return this.health <= 0;
  }

  /** Request pointer lock for mouse look (raw input, no OS acceleration). */
  requestPointerLock(): void {
    // unadjustedMovement bypasses OS mouse acceleration for snappier FPS feel
    (document.body.requestPointerLock as (opts?: object) => Promise<void>)(
      { unadjustedMovement: true }
    )?.catch(() => {
      // Fallback without unadjustedMovement if browser doesn't support it
      document.body.requestPointerLock();
    });
  }

  /** Exit pointer lock. */
  exitPointerLock(): void {
    document.exitPointerLock();
  }

  /** Update the grid reference (e.g. when changing floors). */
  setGrid(grid: CellType[][]): void {
    this.grid = grid;
  }

  /** Teleport player to a grid position. */
  setPosition(x: number, z: number): void {
    this.position.x = x;
    this.position.z = z;
    this.position.y = EYE_HEIGHT;
  }

  /** Process input and move with collision. */
  update(delta: number): void {
    if (this.isDead) return;

    // Calculate movement direction from pressed keys
    this._forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this._right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    let moveX = 0;
    let moveZ = 0;

    if (this.keys['KeyW']) {
      moveX += this._forward.x;
      moveZ += this._forward.z;
    }
    if (this.keys['KeyS']) {
      moveX -= this._forward.x;
      moveZ -= this._forward.z;
    }
    if (this.keys['KeyA']) {
      moveX -= this._right.x;
      moveZ -= this._right.z;
    }
    if (this.keys['KeyD']) {
      moveX += this._right.x;
      moveZ += this._right.z;
    }

    // Normalize diagonal movement
    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (len > 0) {
      const speed = MOVE_SPEED * cheats.speedMultiplier * delta;
      moveX = (moveX / len) * speed;
      moveZ = (moveZ / len) * speed;

      const targetX = this.position.x + moveX;
      const targetZ = this.position.z + moveZ;

      if (cheats.noclip) {
        this.position.x = targetX;
        this.position.z = targetZ;
      } else {
        const resolved = resolveMovement(
          this.grid,
          this.position.x,
          this.position.z,
          targetX,
          targetZ,
          PLAYER_RADIUS,
        );

        this.position.x = resolved.x;
        this.position.z = resolved.z;
      }
    }

    // Apply camera transform
    this.camera.position.copy(this.position);

    // Set camera rotation from yaw/pitch using Euler order YXZ
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  /** Get current world position (copy). */
  getPosition(): Vector3 {
    return this.position.clone();
  }

  /** Get normalized forward direction on the XZ plane. */
  getDirection(): Vector3 {
    this._direction.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    return this._direction;
  }

  /** Reduce health by amount. */
  takeDamage(amount: number): void {
    if (cheats.god) return;
    this.health = Math.max(0, this.health - amount);
  }

  /** Add points to score. */
  addScore(points: number): void {
    this.score += points;
  }

  /** Remove all event listeners. */
  dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
  }
}
