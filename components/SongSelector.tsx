
import React, { useState, useEffect } from 'react';
import { SONGS } from '../constants';
import { Song } from '../types';
import { Play, Star, Music, Zap } from 'lucide-react';
import { getSongDescription } from '../services/geminiService';

interface Props {
  onSelect: (song: Song) => void;
}

const SongSelector: React.FC<Props> = ({ onSelect }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});

  useEffect(() => {
    // Prefetch some descriptions
    const fetchDesc = async () => {
      const results: Record<string, string> = {};
      for (const song of SONGS) {
        const desc = await getSongDescription(song);
        results[song.id] = desc || "Ready for the challenge?";
      }
      setDescriptions(results);
    };
    fetchDesc();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-b from-black to-zinc-900 overflow-y-auto">
      <h1 className="text-5xl font-orbitron font-bold mb-12 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 animate-pulse">
        RHYTHM BOUNCE
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl w-full">
        {SONGS.map((song) => (
          <button
            key={song.id}
            onClick={() => onSelect(song)}
            onMouseEnter={() => setHovered(song.id)}
            onMouseLeave={() => setHovered(null)}
            className={`relative p-6 rounded-2xl border transition-all duration-300 transform hover:scale-105 group overflow-hidden ${
              hovered === song.id ? 'border-white bg-zinc-800' : 'border-zinc-700 bg-zinc-900/50'
            }`}
          >
            <div 
              className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
              style={{ backgroundColor: song.color }}
            />
            
            <div className="relative flex items-center gap-6">
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center glow"
                style={{ backgroundColor: song.color }}
              >
                <Music className="text-black w-8 h-8" />
              </div>
              
              <div className="flex-1 text-left">
                <h3 className="text-2xl font-orbitron font-bold text-white mb-1">{song.title}</h3>
                <p className="text-zinc-400 mb-2">{song.artist}</p>
                
                <div className="flex gap-4 items-center">
                  <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded bg-zinc-800 text-zinc-300">
                    <Zap className="w-3 h-3 text-yellow-400" /> {song.bpm} BPM
                  </span>
                  <span 
                    className="text-xs font-bold px-2 py-1 rounded"
                    style={{ backgroundColor: `${song.color}33`, color: song.color }}
                  >
                    {song.difficulty}
                  </span>
                </div>
              </div>

              <Play className={`w-10 h-10 transition-colors ${hovered === song.id ? 'text-white' : 'text-zinc-700'}`} />
            </div>

            {hovered === song.id && descriptions[song.id] && (
              <p className="mt-4 text-sm text-zinc-400 italic animate-in fade-in slide-in-from-top-2">
                "{descriptions[song.id]}"
              </p>
            )}
          </button>
        ))}
      </div>

      <div className="mt-12 text-zinc-500 text-sm animate-bounce">
        Choose a track to begin your odyssey
      </div>
    </div>
  );
};

export default SongSelector;
