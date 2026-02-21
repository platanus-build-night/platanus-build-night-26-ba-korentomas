/**
 * Leaderboard — localStorage-based top 10 highscore tracker.
 */

const STORAGE_KEY = 'dungeonslopper_highscores';
const MAX_ENTRIES = 10;

export interface HighscoreEntry {
  name: string;
  score: number;
  floor: number;
  date: string;
}

export function getScores(): HighscoreEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HighscoreEntry[];
    return parsed.sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function isHighScore(score: number): boolean {
  const scores = getScores();
  if (scores.length < MAX_ENTRIES) return true;
  return score > scores[scores.length - 1].score;
}

export function addScore(entry: HighscoreEntry): void {
  const scores = getScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const trimmed = scores.slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}
