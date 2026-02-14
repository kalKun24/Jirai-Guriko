export enum Hand {
  ROCK = 'ROCK',
  SCISSORS = 'SCISSORS',
  PAPER = 'PAPER',
}

export enum PlayerId {
  P1 = 'P1',
  P2 = 'P2',
}

export enum GamePhase {
  SETUP_P1 = 'SETUP_P1',
  SETUP_P2 = 'SETUP_P2',
  PLAYING_SELECTION = 'PLAYING_SELECTION',
  PLAYING_REVEAL = 'PLAYING_REVEAL',
  SPECIAL_AIKO_CHOICE = 'SPECIAL_AIKO_CHOICE',
  GAME_OVER = 'GAME_OVER',
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  position: number;
  mines: number[]; // Steps where this player put mines
  lastArrivalTurn: number; // For tie-breaking (who arrived first)
}

export interface MineReveal {
  step: number;
  owner: PlayerId;
  isBlown: boolean; // If true, it was triggered by enemy (explosion). If false, triggered by owner (miss).
}

export interface GameLogEntry {
  turn: number;
  message: string;
  type: 'info' | 'alert' | 'success' | 'danger';
}
