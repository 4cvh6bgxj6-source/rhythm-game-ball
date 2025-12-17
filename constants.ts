
import { Song } from './types.ts';

export const SONGS: Song[] = [
  {
    id: '1',
    title: 'Boom Boom Hardtek',
    artist: 'Generic Tekno',
    bpm: 175,
    difficulty: 'Insane',
    color: '#ff0055'
  },
  {
    id: '2',
    title: 'Nuts',
    artist: 'Lil Peep ft. Rainy Bear',
    bpm: 90,
    difficulty: 'Easy',
    color: '#00ccff'
  },
  {
    id: '3',
    title: 'All I Need',
    artist: 'Slushii',
    bpm: 128,
    difficulty: 'Medium',
    color: '#99ff00'
  },
  {
    id: '4',
    title: 'From the Start',
    artist: 'Laufey',
    bpm: 110,
    difficulty: 'Hard',
    color: '#ffaa00'
  }
];

export const HIT_WINDOWS = {
  PERFECT: 50, // ms
  GREAT: 100,
  GOOD: 150
};
