
import React, { useState } from 'react';
import { GameState, Song, ScoreData } from './types';
import SongSelector from './components/SongSelector';
import Game from './components/Game';
import Results from './components/Results';

const App: React.FC = () => {
  const [state, setState] = useState<GameState>(GameState.MENU);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [lastScore, setLastScore] = useState<ScoreData | null>(null);

  const handleSongSelect = (song: Song) => {
    setSelectedSong(song);
    setState(GameState.PLAYING);
  };

  const handleGameFinish = (score: ScoreData) => {
    setLastScore(score);
    setState(GameState.RESULTS);
  };

  const handleRetry = () => {
    setState(GameState.PLAYING);
  };

  const handleMenu = () => {
    setSelectedSong(null);
    setState(GameState.MENU);
  };

  return (
    <div className="min-h-screen bg-black">
      {state === GameState.MENU && (
        <SongSelector onSelect={handleSongSelect} />
      )}
      
      {state === GameState.PLAYING && selectedSong && (
        <Game 
          song={selectedSong} 
          onFinish={handleGameFinish} 
          onBack={handleMenu}
        />
      )}
      
      {state === GameState.RESULTS && selectedSong && lastScore && (
        <Results 
          song={selectedSong} 
          score={lastScore} 
          onRetry={handleRetry} 
          onMenu={handleMenu}
        />
      )}
    </div>
  );
};

export default App;
