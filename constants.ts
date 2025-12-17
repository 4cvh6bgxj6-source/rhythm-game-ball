
import { Song } from './types.ts';

export const SONGS: Song[] = [
  {
    id: '1',
    title: 'Boom Boom Hardtek',
    artist: 'Hardtek Elite',
    bpm: 175,
    difficulty: 'Insane',
    color: '#ff0055',
    audioUrl: 'https://cdn.pixabay.com/audio/2022/10/24/audio_9979720464.mp3' 
  },
  {
    id: '2',
    title: 'Nuts',
    artist: 'Lil Peep Style Chill',
    bpm: 90,
    difficulty: 'Easy',
    color: '#00ccff',
    audioUrl: 'https://cdn.pixabay.com/audio/2021/11/23/audio_0c98f828a1.mp3'
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
    title: 'From the Start',
    artist: 'Laufey Jazz Vibe',
    bpm: 110,
    difficulty: 'Hard',
    color: '#ffaa00',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
  }
];

export const HIT_WINDOWS = {
  PERFECT: 80, // Finestra più permissiva per un feedback migliore
  GREAT: 140,
  GOOD: 220
};
