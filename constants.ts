
import { Song } from './types.ts';

export const SONGS: Song[] = [
  {
    id: '1',
    title: 'Boom Boom Hardtek',
    artist: 'Hardtek Elite',
    bpm: 175,
    difficulty: 'Insane',
    color: '#ff0055',
    audioUrl: 'https://cdn.pixabay.com/audio/2022/10/24/audio_9979720464.mp3' // Fast techno style
  },
  {
    id: '2',
    title: 'Nuts',
    artist: 'Chill Vibes',
    bpm: 90,
    difficulty: 'Easy',
    color: '#00ccff',
    audioUrl: 'https://cdn.pixabay.com/audio/2021/11/23/audio_0c98f828a1.mp3' // Lofi/Chill style
  },
  {
    id: '3',
    title: 'All I Need',
    artist: 'Future Bassist',
    bpm: 128,
    difficulty: 'Medium',
    color: '#99ff00',
    audioUrl: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a7351b.mp3' // Electronic dance style
  },
  {
    id: '4',
    title: 'From the Start',
    artist: 'Bossa Nova Jazz',
    bpm: 110,
    difficulty: 'Hard',
    color: '#ffaa00',
    audioUrl: 'https://cdn.pixabay.com/audio/2024/02/14/audio_73147f15e7.mp3' // Bossa/Jazz style
  }
];

export const HIT_WINDOWS = {
  PERFECT: 50, // ms
  GREAT: 100,
  GOOD: 150
};
