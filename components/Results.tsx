
import React, { useEffect, useState } from 'react';
import { ScoreData, Song } from '../types';
import { getGeminiFeedback } from '../services/geminiService';
import { RotateCcw, Home, Award, TrendingUp } from 'lucide-react';

interface Props {
  song: Song;
  score: ScoreData;
  onRetry: () => void;
  onMenu: () => void;
}

const Results: React.FC<Props> = ({ song, score, onRetry, onMenu }) => {
  const [feedback, setFeedback] = useState<string>("Calculating ranking...");

  useEffect(() => {
    getGeminiFeedback(song, Math.floor(score.totalScore)).then(setFeedback);
  }, [song, score.totalScore]);

  const accuracy = Math.floor(
    ((score.perfect + score.great * 0.7 + score.good * 0.4) / 
    Math.max(1, score.perfect + score.great + score.good + score.miss)) * 100
  );

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white overflow-hidden relative">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
         <div 
          className="w-[500px] h-[500px] absolute -top-20 -left-20 rounded-full blur-[120px]"
          style={{ backgroundColor: song.color }}
        />
        <div 
          className="w-[500px] h-[500px] absolute -bottom-20 -right-20 rounded-full blur-[120px]"
          style={{ backgroundColor: song.color }}
        />
      </div>

      <div className="max-w-xl w-full bg-zinc-900/50 backdrop-blur-xl p-8 rounded-3xl border border-zinc-800 relative z-10">
        <div className="text-center mb-8">
          <Award className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
          <h2 className="text-4xl font-orbitron font-bold mb-2">COMPLETE</h2>
          <p className="text-zinc-400">{song.title} - {song.difficulty}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
            <div className="text-sm text-zinc-500 font-bold mb-1">ACCURACY</div>
            <div className="text-3xl font-orbitron font-bold text-cyan-400">{accuracy}%</div>
          </div>
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
            <div className="text-sm text-zinc-500 font-bold mb-1">MAX COMBO</div>
            <div className="text-3xl font-orbitron font-bold text-pink-500">{score.maxCombo}</div>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <div className="flex justify-between items-center text-zinc-300">
             <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-400" /> Perfect</span>
             <span className="font-bold">{score.perfect}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-300">
             <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-400" /> Great</span>
             <span className="font-bold">{score.great}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-300">
             <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-400" /> Good</span>
             <span className="font-bold">{score.good}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-400">
             <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /> Miss</span>
             <span className="font-bold">{score.miss}</span>
          </div>
        </div>

        <div className="mb-10 text-center">
          <div className="text-sm text-zinc-500 font-bold mb-2">GEMINI SAYS:</div>
          <div className="text-xl font-medium italic text-zinc-200">"{feedback}"</div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2 bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-colors"
          >
            <RotateCcw className="w-5 h-5" /> RETRY
          </button>
          <button 
            onClick={onMenu}
            className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 text-white font-bold py-4 rounded-2xl hover:bg-zinc-700 transition-colors"
          >
            <Home className="w-5 h-5" /> MENU
          </button>
        </div>
      </div>
    </div>
  );
};

export default Results;
