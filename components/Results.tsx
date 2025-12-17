
import React, { useEffect, useState } from 'react';
import { ScoreData, Song } from '../types.ts';
import { getGeminiFeedback } from '../services/geminiService.ts';
import { RotateCcw, Home, Award } from 'lucide-react';

interface Props {
  song: Song;
  score: ScoreData;
  onRetry: () => void;
  onMenu: () => void;
}

const Results: React.FC<Props> = ({ song, score, onRetry, onMenu }) => {
  const [feedback, setFeedback] = useState<string>("Calcolo del ranking...");

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
          <h2 className="text-4xl font-orbitron font-bold mb-2 uppercase">Completo</h2>
          <p className="text-zinc-400">{song.title} - {song.difficulty}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
            <div className="text-sm text-zinc-500 font-bold mb-1 uppercase tracking-widest">Precisione</div>
            <div className="text-3xl font-orbitron font-bold text-cyan-400">{accuracy}%</div>
          </div>
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
            <div className="text-sm text-zinc-500 font-bold mb-1 uppercase tracking-widest">Max Combo</div>
            <div className="text-3xl font-orbitron font-bold text-pink-500">{score.maxCombo}</div>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <div className="flex justify-between items-center text-zinc-300">
             <span className="flex items-center gap-2 font-orbitron text-xs"><div className="w-2 h-2 rounded-full bg-yellow-400" /> PERFECT</span>
             <span className="font-bold">{score.perfect}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-300">
             <span className="flex items-center gap-2 font-orbitron text-xs"><div className="w-2 h-2 rounded-full bg-cyan-400" /> GREAT</span>
             <span className="font-bold">{score.great}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-300">
             <span className="flex items-center gap-2 font-orbitron text-xs"><div className="w-2 h-2 rounded-full bg-green-400" /> GOOD</span>
             <span className="font-bold">{score.good}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-400">
             <span className="flex items-center gap-2 font-orbitron text-xs"><div className="w-2 h-2 rounded-full bg-red-500" /> MISS</span>
             <span className="font-bold">{score.miss}</span>
          </div>
        </div>

        <div className="mb-10 text-center p-4 bg-white/5 rounded-xl border border-white/5">
          <div className="text-[10px] text-zinc-500 font-bold mb-2 uppercase tracking-[0.2em]">Gemini Announcer</div>
          <div className="text-lg font-medium italic text-zinc-200 leading-tight">"{feedback}"</div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2 bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-colors font-orbitron text-xs"
          >
            <RotateCcw className="w-4 h-4" /> RIPROVA
          </button>
          <button 
            onClick={onMenu}
            className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 text-white font-bold py-4 rounded-2xl hover:bg-zinc-700 transition-colors font-orbitron text-xs"
          >
            <Home className="w-4 h-4" /> MENU
          </button>
        </div>
      </div>
    </div>
  );
};

export default Results;
