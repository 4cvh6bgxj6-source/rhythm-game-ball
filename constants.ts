
import { Song } from './types.ts';

export const SONGS: Song[] = [
  {
    id: '1',
    title: 'Hardcore Beat',
    artist: 'Techno Master',
    bpm: 170,
    difficulty: 'Insane',
    color: '#ff0055',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' 
  },
  {
    id: '2',
    title: 'Nuts (Chill Vibe)',
    artist: 'Lofi Beats',
    bpm: 95,
    difficulty: 'Easy',
    color: '#00ccff',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
  },
  {
    id: '3',
    title: 'All I Need',
    artist: 'Future Bassist',
    bpm: 128,
    difficulty: 'Medium',
    color: '#99ff00',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
  },
  {
    id: '4',
    title: 'Fast Jazz',
    artist: 'Swing King',
    bpm: 110,
    difficulty: 'Hard',
    color: '#ffaa00',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
  }
];

export const HIT_WINDOWS = {
  PERFECT: 90, 
  GREAT: 150,
  GOOD: 250
};
