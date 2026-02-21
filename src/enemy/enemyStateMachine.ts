import * as THREE from 'three';

export type EnemyState = 'idle' | 'walk' | 'attack' | 'death';

export interface EnemyStateMachine {
  readonly currentState: EnemyState;
  readonly isDead: boolean;
  update(delta: number, time: number, camera: THREE.Camera): void;
  transition(newState: EnemyState): void;
}

export function createEnemyStateMachine(
  group: THREE.Group
): EnemyStateMachine {
  let currentState: EnemyState = 'idle';
  let isDead = false;
  let stateTime = 0;
  const baseY = group.position.y;

  function transition(newState: EnemyState): void {
    if (isDead && newState !== 'death') return;
    if (newState === currentState) return;
    currentState = newState;
    stateTime = 0;
    if (newState === 'death') isDead = true;
  }

  function update(delta: number, time: number, camera: THREE.Camera): void {
    stateTime += delta;

    // Billboard: always face the camera (Doom-style)
    group.lookAt(camera.position.x, group.position.y, camera.position.z);

    switch (currentState) {
      case 'idle':
        // Gentle hover bob
        group.position.y = baseY + Math.sin(time * 1.5) * 0.05;
        group.scale.setScalar(1);
        break;

      case 'walk':
        // Bouncing step + slight left-right sway
        group.position.y = baseY + Math.abs(Math.sin(time * 6)) * 0.1;
        break;

      case 'attack': {
        // Quick scale pulse (lunge effect)
        if (stateTime < 0.2) {
          // Wind up — shrink slightly
          const t = stateTime / 0.2;
          group.scale.setScalar(1 - t * 0.15);
        } else if (stateTime < 0.5) {
          // Strike — enlarge (lunge toward camera)
          const t = (stateTime - 0.2) / 0.3;
          group.scale.setScalar(0.85 + t * 0.35);
        } else if (stateTime < 0.8) {
          // Recovery
          const t = (stateTime - 0.5) / 0.3;
          group.scale.setScalar(1.2 - t * 0.2);
        } else {
          group.scale.setScalar(1);
          group.position.y = baseY;
          transition('idle');
        }
        break;
      }

      case 'death':
        if (stateTime < 1.5) {
          const t = Math.min(stateTime / 1.5, 1);
          // Sink + fade via scale
          group.position.y = baseY - t * 1.0;
          group.scale.setScalar(1 - t * 0.5);
        }
        break;
    }
  }

  return {
    get currentState() { return currentState; },
    get isDead() { return isDead; },
    update,
    transition,
  };
}
