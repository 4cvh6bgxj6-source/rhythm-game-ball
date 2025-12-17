
import { Song } from './types.ts';

export const SONGS: Song[] = [
  {
    id: '1',
    title: 'Boom Boom Hardtek',
    artist: 'Hardtek Elite',
    bpm: 175,
    difficulty: 'Insane',
    color: '#ff0055',
    // Utilizziamo un MP3 diretto ad alta velocità che corrisponde allo stile Hardtek richiesto
    audioUrl: 'https://cdn.pixabay.com/audio/2022/10/24/audio_9979720464.mp3' 
  },
  {
    id: '2',
    title: 'Nuts',
    artist: 'Chill Vibes',
    bpm: 90,
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
    title: 'From the Start',
    artist: 'Bossa Nova Jazz',
    bpm: 110,
    difficulty: 'Hard',
    color: '#ffaa00',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
  }
];

export const HIT_WINDOWS = {
  PERFECT: 60, // Leggermente più permissivo per migliorare il feeling
  GREAT: 120,
  GOOD: 180
};
