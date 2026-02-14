import { Hand } from "./types";

export const TOTAL_STEPS = 46;
export const MINES_PER_PLAYER = 3;
export const AIKO_LIMIT = 5;

// Steps moved per hand
export const MOVE_STEPS = {
  [Hand.ROCK]: 3,      // Glico (3 chars) - actually Glico is Gu-Ri-Co
  [Hand.SCISSORS]: 6,  // Chiyokoreito (6 chars)
  [Hand.PAPER]: 6,     // Painatsupuru (6 chars)
};

export const PENALTY_STEPS = 10;
