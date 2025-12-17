
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Song, ScoreData } from '../types.ts';
import { HIT_WINDOWS } from '../constants.ts';
import { ChevronLeft, Zap, Music, Play, Loader2 } from 'lucide-react';

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
  const [isReadyToStart, setIsReadyToStart] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isAudioLoading, setIsAudioLoading] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyzer = useRef<AnalyserNode | null>(null);
  const requestRef = useRef<number>(0);
  const startTime = useRef<number>(0);
  const nextBeatTime = useRef<number>(0);
  const beatInterval = (60 / song.bpm) * 1000;
  
  const ballState = useRef({ x: 320, y: 250, side: 'left' as 'left' | 'right' });
  const particles = useRef<Particle[]>([]);
  const shakeAmount = useRef(0);
  const freqData = useRef<Uint8Array | null>(null);

  useEffect(() => {
    const audio = new Audio(song.audioUrl);
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    const handleCanPlay = () => setIsAudioLoading(false);
    audio.addEventListener('canplaythrough', handleCanPlay);
    audio.addEventListener('error', (e) => {
      console.error("Audio Load Error", e);
      setIsAudioLoading(false);
    });

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.pause();
      audio.src = "";
      if (audioContext.current) audioContext.current.close();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [song.audioUrl]);

  const initAudioContext = async () => {
    if (!audioRef.current) return;
    
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContext.current = ctx;

      const source = ctx.createMediaElementSource(audioRef.current);
      const node = ctx.createAnalyser();
      node.fftSize = 256;
      source.connect(node);
      node.connect(ctx.destination);
      analyzer.current = node;
      freqData.current = new Uint8Array(node.frequencyBinCount);
      
      await ctx.resume();
    } catch (e) {
      console.warn("Analyzer failed, proceeding anyway", e);
    }
    
    setIsReadyToStart(true);
  };

  const createParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      particles.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        life: 1.0,
        color
      });
    }
  };

  const handleHit = useCallback((timestamp: number) => {
    if (!isActive) return;
    
    const diff = Math.abs(timestamp - nextBeatTime.current);
    let rating = 'MISS';
    let points = 0;

    if (diff <= HIT_WINDOWS.PERFECT) {
      rating = 'PERFECT';
      points = 1000;
      shakeAmount.current = 15;
    } else if (diff <= HIT_WINDOWS.GREAT) {
      rating = 'GREAT';
      points = 500;
      shakeAmount.current = 8;
    } else if (diff <= HIT_WINDOWS.GOOD) {
      rating = 'GOOD';
      points = 200;
      shakeAmount.current = 3;
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
        createParticles(
          ballState.current.side === 'left' ? 65 : 575, 
          ballState.current.y, 
          song.color
        );
    } else {
        setScore(prev => ({ ...prev, miss: prev.miss + 1, combo: 0 }));
    }

    setLastRating(rating);
    setTimeout(() => setLastRating(null), 500);
  }, [isActive, song.color, nextBeatTime]);

  const update = useCallback((time: number) => {
    if (!audioRef.current || !isActive) {
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    const audioTime = audioRef.current.currentTime * 1000;
    const elapsed = audioTime > 0 ? audioTime : (performance.now() - startTime.current);
    
    if (elapsed > nextBeatTime.current) {
      nextBeatTime.current += beatInterval;
      ballState.current.side = ballState.current.side === 'left' ? 'right' : 'left';
    }

    const timeSinceLastBeat = (elapsed - (nextBeatTime.current - beatInterval)) % beatInterval;
    const progressInBeat = Math.max(0, Math.min(1, timeSinceLastBeat / beatInterval));
    
    const wallL = 65;
    const wallR = 575;
    const distance = wallR - wallL;

    if (ballState.current.side === 'right') {
      ballState.current.x = wallL + (progressInBeat * distance);
    } else {
      ballState.current.x = wallR - (progressInBeat * distance);
    }

    const jumpHeight = 160;
    ballState.current.y = 250 - (Math.sin(progressInBeat * Math.PI) * jumpHeight);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let avgFreq = 0;
        if (analyzer.current && freqData.current) {
          analyzer.current.getByteFrequencyData(freqData.current);
          avgFreq = freqData.current.reduce((a, b) => a + b, 0) / freqData.current.length;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        if (shakeAmount.current > 0) {
          ctx.translate((Math.random() - 0.5) * shakeAmount.current, (Math.random() - 0.5) * shakeAmount.current);
          shakeAmount.current *= 0.9;
        }

        // Walls
        ctx.lineWidth = 15;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 0;

        // Left
        ctx.strokeStyle = ballState.current.side === 'left' ? song.color : '#111';
        if (ballState.current.side === 'left') { ctx.shadowBlur = 20; ctx.shadowColor = song.color; }
        ctx.beginPath(); ctx.moveTo(wallL, 80); ctx.lineTo(wallL, 420); ctx.stroke();
        
        // Right
        ctx.strokeStyle = ballState.current.side === 'right' ? song.color : '#111';
        if (ballState.current.side === 'right') { ctx.shadowBlur = 20; ctx.shadowColor = song.color; }
        ctx.beginPath(); ctx.moveTo(wallR, 80); ctx.lineTo(wallR, 420); ctx.stroke();
        ctx.shadowBlur = 0;

        // Particles
        particles.current = particles.current.filter(p => p.life > 0);
        particles.current.forEach(p => {
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
          p.x += p.vx; p.y += p.vy; p.life -= 0.025;
        });
        ctx.globalAlpha = 1.0;

        // THE BALL
        ctx.fillStyle = song.color;
        ctx.shadowBlur = 40 + (avgFreq / 4);
        ctx.shadowColor = song.color;
        ctx.beginPath();
        ctx.arc(ballState.current.x, ballState.current.y, 22 + (avgFreq / 30), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.restore();
      }
    }

    const dur = audioRef.current.duration || 300;
    const p = (audioRef.current.currentTime / dur) * 100;
    setProgress(p);

    if (audioRef.current.ended || (p >= 100 && audioTime > 5000)) {
      setIsActive(false);
      onFinish(score);
    } else {
      requestRef.current = requestAnimationFrame(update);
    }
  }, [isActive, beatInterval, onFinish, score, song.color]);

  useEffect(() => {
    if (!isReadyToStart) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsActive(true);
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.warn("Autoplay blocked", e));
        startTime.current = performance.now();
        nextBeatTime.current = beatInterval;
        requestRef.current = requestAnimationFrame(update);
      }
    }
  }, [countdown, isReadyToStart, beatInterval, update]);

  const handleInput = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (!isActive) return;
    if (e.type === 'keydown' && (e as React.KeyboardEvent).code !== 'Space') return;
    const now = audioRef.current && audioRef.current.currentTime > 0 
      ? audioRef.current.currentTime * 1000 
      : (performance.now() - startTime.current);
    handleHit(now);
  };

  return (
    <div 
      className="relative w-full h-screen bg-black flex flex-col items-center justify-center select-none outline-none overflow-hidden"
      onMouseDown={handleInput}
      tabIndex={0}
      onKeyDown={handleInput}
    >
      {!isReadyToStart && (
        <div className="absolute inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-32 h-32 rounded-3xl flex items-center justify-center mb-8 rotate-3 shadow-2xl" style={{ backgroundColor: song.color }}>
                {isAudioLoading ? <Loader2 className="w-12 h-12 text-black animate-spin" /> : <Music className="w-12 h-12 text-black" />}
            </div>
            <h2 className="text-5xl font-orbitron font-black text-white mb-4 tracking-tighter">{song.title}</h2>
            <p className="text-zinc-500 mb-12 max-w-sm uppercase tracking-[0.2em] font-bold text-xs">Sincronizzazione audio necessaria</p>
            
            <button 
                onClick={initAudioContext}
                disabled={isAudioLoading}
                className="px-16 py-6 bg-white text-black font-orbitron font-black text-3xl rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 disabled:opacity-20 group"
            >
                {isAudioLoading ? "CARICAMENTO..." : <><Play fill="currentColor" className="w-8 h-8 group-hover:translate-x-1 transition-transform" /> START</>}
            </button>
        </div>
      )}

      <div className="absolute top-0 w-full p-8 flex justify-between items-start pointer-events-none z-20">
        <button 
          onClick={(e) => { e.stopPropagation(); onBack(); }}
          className="pointer-events-auto flex items-center gap-2 text-zinc-700 hover:text-white transition-all font-orbitron text-[10px] tracking-[0.4em] group"
        >
          <div className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center group-hover:border-white">
            <ChevronLeft className="w-4 h-4" />
          </div>
          MENU
        </button>

        <div className="flex flex-col items-end">
          <div className="text-7xl font-orbitron font-black text-white tabular-nums tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            {Math.floor(score.totalScore).toLocaleString()}
          </div>
          <div className="text-zinc-600 font-bold text-[10px] tracking-[0.5em] mt-1 uppercase" style={{ color: song.color }}>BEAT SCORE</div>
        </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-2 bg-zinc-900">
        <div 
          className="h-full transition-all duration-300 shadow-[0_0_20px_white]"
          style={{ width: `${progress}%`, backgroundColor: song.color }}
        />
      </div>

      <div className="relative w-full max-w-5xl aspect-video flex items-center justify-center">
        <canvas 
          ref={canvasRef} 
          width={640} 
          height={500} 
          className="w-full h-auto max-h-[85vh] object-contain relative z-10"
        />
        
        {lastRating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div 
              className={`text-[12rem] font-orbitron font-black italic transform transition-all duration-150 scale-110 drop-shadow-2xl ${
                lastRating === 'PERFECT' ? 'text-yellow-400' :
                lastRating === 'GREAT' ? 'text-cyan-400' :
                lastRating === 'GOOD' ? 'text-green-400' : 'text-red-500'
              }`}
            >
              {lastRating}
            </div>
          </div>
        )}

        {score.combo > 1 && (
          <div className="absolute bottom-10 w-full text-center z-20">
            <div className="inline-flex flex-col items-center">
              <span className="text-[10rem] font-orbitron text-white font-black tracking-tighter leading-none animate-bounce" style={{ color: song.color }}>
                {score.combo}
              </span>
              <span className="text-xl font-orbitron text-white/50 tracking-[1em] -mt-4">COMBO</span>
            </div>
          </div>
        )}
      </div>

      {isReadyToStart && countdown > 0 && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center">
          <div className="text-[25rem] font-orbitron font-black text-white leading-none animate-pulse">
            {countdown}
          </div>
        </div>
      )}

      <div className="absolute bottom-12 flex flex-col items-center gap-2">
        <div className="px-10 py-4 rounded-3xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-xl text-xs font-orbitron text-zinc-400 tracking-[0.4em] uppercase flex items-center gap-6">
          <div className="flex items-center gap-3">
             <span className="text-black bg-white px-3 py-1 rounded-lg font-black">SPACE</span>
             <span>BOUNCE</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-zinc-700" />
          <div className="flex items-center gap-3 text-white">
             <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
             <span>SYNC THE BALL</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
