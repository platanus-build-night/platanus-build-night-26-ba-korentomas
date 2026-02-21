import * as THREE from 'three';
import { EnemyModel } from './enemyLoader';
import { EnemyStateMachine, createEnemyStateMachine } from './enemyStateMachine';

export interface EnemyInstance {
  model: EnemyModel;
  stateMachine: EnemyStateMachine;
  update(delta: number, time: number, camera: THREE.Camera, cameraZ: number): void;
  dispose(): void;
}

const WALK_SPEED = 1.5;
const DETECT_RANGE = 20;
const ATTACK_RANGE = 2;

export function createEnemyInstance(
  model: EnemyModel,
  scene: THREE.Scene,
  spawnZ: number
): EnemyInstance {
  const stateMachine = createEnemyStateMachine(model.group);

  model.group.position.set(0, 0, spawnZ);
  scene.add(model.group);

  function update(delta: number, time: number, camera: THREE.Camera, cameraZ: number): void {
    stateMachine.update(delta, time, camera);
    if (stateMachine.isDead) return;

    const distToCamera = Math.abs(model.group.position.z - cameraZ);

    switch (stateMachine.currentState) {
      case 'idle':
        if (distToCamera < DETECT_RANGE) {
          stateMachine.transition('walk');
        }
        break;
      case 'walk':
        // Walk toward camera (camera moves in -Z)
        model.group.position.z += WALK_SPEED * delta;
        if (distToCamera < ATTACK_RANGE) {
          stateMachine.transition('attack');
        } else if (distToCamera > DETECT_RANGE) {
          stateMachine.transition('idle');
        }
        break;
    }
  }

  function dispose(): void {
    scene.remove(model.group);
    model.dispose();
  }

  return { model, stateMachine, update, dispose };
}
