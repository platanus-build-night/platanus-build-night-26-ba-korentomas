export enum GameStateType {
  MENU = 'MENU',
  FADE_TO_GAME = 'FADE_TO_GAME',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  FADE_TO_MENU = 'FADE_TO_MENU',
}

export class GameStateMachine {
  current: GameStateType = GameStateType.MENU;
  private listeners: ((state: GameStateType) => void)[] = [];

  transition(to: GameStateType) {
    this.current = to;
    for (const fn of this.listeners) fn(to);
  }

  onTransition(fn: (state: GameStateType) => void) {
    this.listeners.push(fn);
  }
}
