
import { Song } from './types.ts';

export const SONGS: Song[] = [
  {
    id: '1',
    title: 'Boom Boom Hardtek',
    artist: 'Hardtek Elite',
    bpm: 175,
    difficulty: 'Insane',
    color: '#ff0055',
    // Link diretto Pixabay per un brano ad alta energia (Hardtek/Phonk vibe)
    audioUrl: 'https://cdn.pixabay.com/audio/2024/05/15/audio_5b30647c2a.mp3' 
  },
  {
    id: '2',
    title: 'Nuts',
    artist: 'Lil Peep Style Chill',
    bpm: 90,
    difficulty: 'Easy',
    color: '#00ccff',
    // Link diretto Pixabay per un brano lo-fi/emo-trap
    audioUrl: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1088734685.mp3'
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
  PERFECT: 80, 
  GREAT: 140,
  GOOD: 220
};
