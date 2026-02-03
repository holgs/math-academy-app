import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateLevel(xp: number): number {
  // Level = sqrt(xp / 100) + 1
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function xpForNextLevel(level: number): number {
  // XP needed = (level - 1)^2 * 100
  return Math.pow(level - 1, 2) * 100;
}

export function calculateXpReward(
  difficulty: number,
  attemptNumber: number,
  timeBonus: boolean
): { xp: number; coins: number } {
  // Base XP by difficulty
  const baseXp = difficulty * 10;
  
  // Attempt multiplier (first try = full, second = 70%, third = 40%, 4+ = 20%)
  const attemptMultiplier = attemptNumber === 1 ? 1 : attemptNumber === 2 ? 0.7 : attemptNumber === 3 ? 0.4 : 0.2;
  
  // Time bonus
  const timeMultiplier = timeBonus ? 1.2 : 1;
  
  const xp = Math.round(baseXp * attemptMultiplier * timeMultiplier);
  const coins = attemptNumber === 1 ? difficulty : 0;
  
  return { xp, coins };
}