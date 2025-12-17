
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Song, ScoreData } from '../types.ts';
import { HIT_WINDOWS } from '../constants.ts';
import { ChevronLeft, Volume2, Target, Zap } from 'lucide-react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface Props {
  song: Song;
  onFinish: (score: ScoreData) => void;
  onBack: () => void;
}

const Game: React.FC<Props> = ({ song, onFinish, onBack }) => {
  const [score, setScore] = useState<ScoreData>({
    perfect: 0, great: 0, good: 0, miss: 0, combo: 0, maxCombo: 0, totalScore: 0
  });
  const [lastRating, setLastRating] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState(3);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const requestRef = useRef<number>(0);
  const startTime = useRef<number>(0);
  const nextBeatTime = useRef<number>(0);
  const beatInterval = (60 / song.bpm) * 1000;
  
  const ballState = useRef({ x: 100, y: 250, side: 'left' as 'left' | 'right' });
  const lastTapTime = useRef<number>(0);
  const particles = useRef<Particle[]>([]);
  const shakeAmount = useRef(0);

  useEffect(() => {
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContext.current?.close();
    };
  }, []);

  const createParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      particles.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color
      });
    }
  };

  const playBeatSound = useCallback((freq: number = 440, type: OscillatorType = 'sine', vol: number = 0.1) => {
    if (!audioContext.current) return;
    const osc = audioContext.current.createOscillator();
    const gain = audioContext.current.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioContext.current.currentTime);
    gain.gain.setValueAtTime(vol, audioContext.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.current.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioContext.current.destination);
    osc.start();
    osc.stop(audioContext.current.currentTime + 0.1);
  }, []);

  const handleHit = useCallback((timestamp: number) => {
    if (!isActive) return;
    
    const diff = Math.abs(timestamp - nextBeatTime.current);
    let rating = 'MISS';
    let points = 0;

    if (diff <= HIT_WINDOWS.PERFECT) {
      rating = 'PERFECT';
      points = 1000;
      shakeAmount.current = 10;
    } else if (diff <= HIT_WINDOWS.GREAT) {
      rating = 'GREAT';
      points = 500;
      shakeAmount.current = 5;
    } else if (diff <= HIT_WINDOWS.GOOD) {
      rating = 'GOOD';
      points = 200;
    }

    if (rating !== 'MISS') {
        setScore(prev => {
            const newCombo = prev.combo + 1;
            return {
                ...prev,
                perfect: rating === 'PERFECT' ? prev.perfect + 1 : prev.perfect,
                great: rating === 'GREAT' ? prev.great + 1 : prev.great,
                good: rating === 'GOOD' ? prev.good + 1 : prev.good,
                combo: newCombo,
                maxCombo: Math.max(prev.maxCombo, newCombo),
                totalScore: prev.totalScore + (points * (1 + newCombo * 0.1))
            };
        });
        playBeatSound(880, 'square', 0.15);
        createParticles(
          ballState.current.side === 'left' ? 60 : 580, 
          ballState.current.y, 
          song.color
        );
    } else {
        setScore(prev => ({ ...prev, miss: prev.miss + 1, combo: 0 }));
        playBeatSound(110, 'sawtooth', 0.05);
    }

    setLastRating(rating);
    setTimeout(() => setLastRating(null), 500);
  }, [isActive, playBeatSound, song.color, nextBeatTime, beatInterval]);

  const update = useCallback((time: number) => {
    if (!startTime.current) startTime.current = time;
    const elapsed = time - startTime.current;
    
    if (time > nextBeatTime.current + HIT_WINDOWS.GOOD) {
      if (lastTapTime.current < nextBeatTime.current - HIT_WINDOWS.GOOD) {
        setScore(prev => ({ ...prev, miss: prev.miss + 1, combo: 0 }));
        setLastRating('MISS');
        setTimeout(() => setLastRating(null), 500);
      }
      nextBeatTime.current += beatInterval;
      ballState.current.side = ballState.current.side === 'left' ? 'right' : 'left';
      playBeatSound(220, 'sine', 0.05);
    }

    const timeSinceLastBeat = (time - (nextBeatTime.current - beatInterval)) % beatInterval;
    const progressInBeat = timeSinceLastBeat / beatInterval;
    
    const wallLeft = 60;
    const wallRight = 580;
    const distance = wallRight - wallLeft;

    if (ballState.current.side === 'right') {
      ballState.current.x = wallLeft + (progressInBeat * distance);
    } else {
      ballState.current.x = wallRight - (progressInBeat * distance);
    }

    const jumpHeight = 150;
    ballState.current.y = 250 - (Math.sin(progressInBeat * Math.PI) * jumpHeight);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        if (shakeAmount.current > 0) {
          ctx.translate((Math.random() - 0.5) * shakeAmount.current, (Math.random() - 0.5) * shakeAmount.current);
          shakeAmount.current *= 0.9;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        
        ctx.strokeStyle = ballState.current.side === 'left' ? song.color : '#1a1a1a';
        ctx.shadowBlur = ballState.current.side === 'left' ? 30 : 0;
        ctx.shadowColor = song.color;
        ctx.beginPath(); ctx.moveTo(wallLeft - 15, 80); ctx.lineTo(wallLeft - 15, 420); ctx.stroke();
        
        ctx.strokeStyle = ballState.current.side === 'right' ? song.color : '#1a1a1a';
        ctx.shadowBlur = ballState.current.side === 'right' ? 30 : 0;
        ctx.beginPath(); ctx.moveTo(wallRight + 15, 80); ctx.lineTo(wallRight + 15, 420); ctx.stroke();
        ctx.shadowBlur = 0;

        particles.current = particles.current.filter(p => p.life > 0);
        particles.current.forEach(p => {
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.03;
        });
        ctx.globalAlpha = 1.0;

        ctx.fillStyle = `${song.color}44`;
        const trailOffset = ballState.current.side === 'right' ? -15 : 15;
        ctx.beginPath();
        ctx.arc(ballState.current.x + trailOffset, ballState.current.y + 5, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = song.color;
        ctx.shadowBlur = 35;
        ctx.shadowColor = song.color;
        ctx.beginPath();
        ctx.arc(ballState.current.x, ballState.current.y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
      }
    }

    const totalDuration = 45000; 
    const p = Math.min((elapsed / totalDuration) * 100, 100);
    setProgress(p);

    if (p >= 100) {
      setIsActive(false);
      onFinish(score);
    } else {
      requestRef.current = requestAnimationFrame(update);
    }
  }, [beatInterval, onFinish, playBeatSound, score, song.color]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsActive(true);
      startTime.current = performance.now();
      nextBeatTime.current = startTime.current + beatInterval;
      ballState.current.side = 'right'; 
      requestRef.current = requestAnimationFrame(update);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [countdown, beatInterval, update]);

  const handleInput = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).code !== 'Space') return;
    const now = performance.now();
    lastTapTime.current = now;
    handleHit(now);
  };

  return (
    <div 
      className="relative w-full h-screen bg-[#020202] flex flex-col items-center justify-center select-none outline-none overflow-hidden"
      onMouseDown={handleInput}
      tabIndex={0}
      onKeyDown={handleInput}
    >
      <div className="absolute top-0 w-full p-8 flex justify-between items-start pointer-events-none z-20">
        <button 
          onClick={(e) => { e.stopPropagation(); onBack(); }}
          className="pointer-events-auto flex items-center gap-2 text-zinc-500 hover:text-white transition-all font-orbitron text-xs tracking-[0.2em] group"
        >
          <div className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center group-hover:border-white">
            <ChevronLeft className="w-4 h-4" />
          </div>
          ABORT
        </button>

        <div className="flex flex-col items-end">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: song.color }} />
             <div className="text-5xl font-orbitron font-bold text-white tabular-nums tracking-tighter">
                {Math.floor(score.totalScore).toLocaleString()}
             </div>
          </div>
          <div className="text-zinc-600 font-bold text-[10px] tracking-[0.4em] mt-1 uppercase">SYNCED SCORE</div>
        </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-1.5 bg-zinc-900/50">
        <div 
          className="h-full shadow-[0_0_20px_white] transition-all duration-300 relative"
          style={{ width: `${progress}%`, backgroundColor: song.color }}
        >
          <div className="absolute right-0 top-0 h-full w-4 bg-white blur-sm" />
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="grid grid-cols-12 h-full w-full">
           {[...Array(12)].map((_, i) => (
             <div key={i} className="border-r border-zinc-800 h-full" />
           ))}
        </div>
      </div>

      <div className="relative w-full max-w-4xl h-[600px] flex items-center justify-center">
        <canvas 
          ref={canvasRef} 
          width={640} 
          height={500} 
          className="relative z-10"
        />
        
        {lastRating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div 
              className={`text-8xl font-orbitron font-black italic transform transition-all duration-300 scale-125 ${
                lastRating === 'PERFECT' ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]' :
                lastRating === 'GREAT' ? 'text-cyan-400' :
                lastRating === 'GOOD' ? 'text-green-400' : 'text-red-500'
              }`}
            >
              {lastRating}
            </div>
          </div>
        )}

        {score.combo > 1 && (
          <div className="absolute bottom-12 w-full text-center z-20">
            <div className="inline-flex flex-col items-center">
              <span className="text-6xl font-orbitron text-white font-black tracking-tighter animate-bounce">
                {score.combo}
              </span>
              <span className="text-xs font-orbitron text-zinc-500 tracking-[0.5em] -mt-2">STREAK</span>
            </div>
          </div>
        )}
      </div>

      {countdown > 0 && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <div className="text-zinc-700 font-orbitron mb-8 tracking-[1em] text-xs uppercase animate-pulse">Initializing neural link</div>
          <div className="text-[12rem] font-orbitron font-black text-white leading-none">
            {countdown}
          </div>
        </div>
      )}

      <div className="absolute bottom-10 flex flex-col items-center gap-4">
        <div className="flex items-center gap-8 text-[10px] font-orbitron text-zinc-600 tracking-[0.3em] uppercase">
          <div className="flex items-center gap-2">
             <div className="w-10 h-6 border border-zinc-700 rounded flex items-center justify-center text-zinc-400">SPACE</div>
             <span>TO BOUNCE</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
          <div className="flex items-center gap-2">
             <Zap className="w-3 h-3" />
             <span>HIT THE WALLS</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
