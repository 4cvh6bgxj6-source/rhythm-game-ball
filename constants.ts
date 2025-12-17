
import { Song } from './types.ts';

export const SONGS: Song[] = [
  {
    id: '1',
    title: 'Hardcore Rave',
    artist: 'Helix Master',
    bpm: 160,
    difficulty: 'Insane',
    color: '#ff0055',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' 
  },
  {
    id: '2',
    title: 'Chill Vibes',
    artist: 'Lofi Dreams',
    bpm: 90,
    difficulty: 'Easy',
    color: '#00ccff',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
  },
  {
    id: '3',
    title: 'Digital Pulse',
    artist: 'Cyber Synth',
    bpm: 128,
    difficulty: 'Medium',
    color: '#99ff00',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
  },
  {
    id: '4',
    title: 'Neo Swing',
    artist: 'Jazz Hop',
    bpm: 115,
    difficulty: 'Hard',
    color: '#ffaa00',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
  }
];

export const HIT_WINDOWS = {
  PERFECT: 90, 
  GREAT: 160,
  GOOD: 250
};
