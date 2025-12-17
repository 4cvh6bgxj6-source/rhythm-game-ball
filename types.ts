
export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  RESULTS = 'RESULTS'
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane';
  color: string;
}

export interface ScoreData {
  perfect: number;
  great: number;
  good: number;
  miss: number;
  combo: number;
  maxCombo: number;
  totalScore: number;
}
