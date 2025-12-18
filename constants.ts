
import { Song } from './types.ts';

export const SONGS: Song[] = [
  {
    id: '1',
    title: 'Phonk Night',
    artist: 'Street Racer',
    bpm: 120, // Sincronizzato con il loop audio
    difficulty: 'Medium',
    color: '#ff0055',
    audioUrl: 'https://cdn.pixabay.com/audio/2022/11/22/audio_feb6bd9202.mp3' 
  },
  {
    id: '2',
    title: 'Lofi Dreams',
    artist: 'Chill Cat',
    bpm: 80,
    difficulty: 'Easy',
    color: '#00ccff',
    audioUrl: 'https://cdn.pixabay.com/audio/2022/05/17/audio_8213798991.mp3'
  },
  {
    id: '3',
    title: 'Cyberpunk Drive',
    artist: 'Future Synth',
    bpm: 100,
    difficulty: 'Hard',
    color: '#99ff00',
    audioUrl: 'https://cdn.pixabay.com/audio/2022/01/21/audio_3174268798.mp3'
  },
  {
    id: '4',
    title: 'Arcade Rush',
    artist: '8-Bit Hero',
    bpm: 140,
    difficulty: 'Insane',
    color: '#ffaa00',
    audioUrl: 'https://cdn.pixabay.com/audio/2021/11/24/audio_98553259b1.mp3'
  }
];

export const HIT_WINDOWS = {
  PERFECT: 100, 
  GREAT: 180,
  GOOD: 280
};
