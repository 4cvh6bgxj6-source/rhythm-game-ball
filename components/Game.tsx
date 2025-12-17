
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
  const lastSyncTime = useRef<number>(0);
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
      console.error("Audio Load Error:", e);
      setIsAudioLoading(false);
    });

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.pause();
      audio.src = "";
      if (audioContext.current) audioContext.current.close();
    };
  }, [song.audioUrl]);

  const initAudioContext = async () => {
    if (!audioRef.current) return;
    
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContext.current = ctx;

      const source = ctx.createMediaElementSource(audioRef.current);
      const node = ctx.createAnalyser();
      node.fftSize = 128;
      source.connect(node);
      node.connect(ctx.destination);
      analyzer.current = node;
      freqData.current = new Uint8Array(node.frequencyBinCount);
      
      await ctx.resume();
    } catch (e) {
      console.warn("Analyzer/Context failed, playing without visualizer", e);
    }
    
    setIsReadyToStart(true);
  };

  const createParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 12; i++) {
      particles.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
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
      shakeAmount.current = 12;
    } else if (diff <= HIT_WINDOWS.GREAT) {
      rating = 'GREAT';
      points = 500;
      shakeAmount.current = 6;
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
                totalScore: prev.totalScore + (points * (1 + newCombo * 0.05))
            };
        });
        createParticles(
          ballState.current.side === 'left' ? 70 : 570, 
          ballState.current.y, 
          song.color
        );
    } else {
        setScore(prev => ({ ...prev, miss: prev.miss + 1, combo: 0 }));
    }

    setLastRating(rating);
    setTimeout(() => setLastRating(null), 400);
  }, [isActive, song.color, nextBeatTime]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, avgFreq: number) => {
    ctx.save();
    
    // Background Glow
    const gradient = ctx.createRadialGradient(width/2, height/2, 50, width/2, height/2, 400);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Grid Visualizer
    if (avgFreq > 0) {
      ctx.strokeStyle = `${song.color}11`;
      ctx.lineWidth = 1;
      for(let i=0; i<width; i+=40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
      }
    }

    const wallL = 65;
    const wallR = 575;

    // Left Wall
    ctx.strokeStyle = ballState.current.side === 'left' ? song.color : '#222';
    ctx.shadowBlur = ballState.current.side === 'left' ? 20 + avgFreq/5 : 0;
    ctx.shadowColor = song.color;
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(wallL, 100); ctx.lineTo(wallL, 400); ctx.stroke();

    // Right Wall
    ctx.strokeStyle = ballState.current.side === 'right' ? song.color : '#222';
    ctx.shadowBlur = ballState.current.side === 'right' ? 20 + avgFreq/5 : 0;
    ctx.beginPath(); ctx.moveTo(wallR, 100); ctx.lineTo(wallR, 400); ctx.stroke();
    ctx.shadowBlur = 0;

    // Particles
    particles.current = particles.current.filter(p => p.life > 0);
    particles.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI*2); ctx.fill();
      p.x += p.vx; p.y += p.vy; p.life -= 0.02;
    });
    ctx.globalAlpha = 1.0;

    // THE BALL
    ctx.fillStyle = song.color;
    ctx.shadowBlur = 40 + avgFreq/3;
    ctx.shadowColor = song.color;
    ctx.beginPath();
    ctx.arc(ballState.current.x, ballState.current.y, 18 + avgFreq/30, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }, [song.color]);

  const update = useCallback((time: number) => {
    if (!audioRef.current || !isActive) {
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    const audioTime = audioRef.current.currentTime * 1000;
    const elapsed = audioTime > 0 ? audioTime : (time - startTime.current);
    
    // Beat management
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

    const jumpHeight = 140;
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

        ctx.save();
        if (shakeAmount.current > 0) {
          ctx.translate((Math.random() - 0.5) * shakeAmount.current, (Math.random() - 0.5) * shakeAmount.current);
          shakeAmount.current *= 0.85;
        }
        draw(ctx, canvas.width, canvas.height, avgFreq);
        ctx.restore();
      }
    }

    const dur = audioRef.current.duration || 300; // fallback long duration
    const p = (audioRef.current.currentTime / dur) * 100;
    setProgress(p);

    if (audioRef.current.ended || (p >= 100 && audioRef.current.currentTime > 10)) {
      setIsActive(false);
      onFinish(score);
    } else {
      requestRef.current = requestAnimationFrame(update);
    }
  }, [isActive, beatInterval, draw, onFinish, score]);

  useEffect(() => {
    if (!isReadyToStart) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsActive(true);
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.error("Play failed", e));
        startTime.current = performance.now();
        nextBeatTime.current = beatInterval;
        ballState.current.side = 'right'; 
        requestRef.current = requestAnimationFrame(update);
      }
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [countdown, beatInterval, update, isReadyToStart]);

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
        <div className="absolute inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 rounded-full border-4 border-white/10 flex items-center justify-center mb-8 bg-zinc-900" style={{ borderColor: isAudioLoading ? '#333' : song.color }}>
                {isAudioLoading ? <Loader2 className="w-10 h-10 text-zinc-600 animate-spin" /> : <Music className="w-10 h-10 text-white" />}
            </div>
            <h2 className="text-4xl font-orbitron font-bold text-white mb-2">{song.title}</h2>
            <p className="text-zinc-500 mb-10 uppercase tracking-[0.3em] text-xs">Pronto alla sincronizzazione</p>
            
            <button 
                onClick={initAudioContext}
                disabled={isAudioLoading}
                className="px-16 py-5 bg-white text-black font-orbitron font-black text-2xl rounded-full hover:scale-105 active:scale-95 transition-all flex items-center gap-4 disabled:opacity-20 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
                {isAudioLoading ? "CARICAMENTO..." : <><Play fill="currentColor" className="w-6 h-6" /> INIZIA ORA</>}
            </button>
            <p className="mt-8 text-zinc-600 text-[10px] uppercase tracking-widest font-bold">L'audio richiede un'azione manuale per le norme del browser</p>
        </div>
      )}

      <div className="absolute top-0 w-full p-8 flex justify-between items-start pointer-events-none z-20">
        <button 
          onClick={(e) => { e.stopPropagation(); onBack(); }}
          className="pointer-events-auto flex items-center gap-2 text-zinc-600 hover:text-white transition-all font-orbitron text-[10px] tracking-[0.3em] group"
        >
          <div className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center group-hover:border-white">
            <ChevronLeft className="w-4 h-4" />
          </div>
          ABORT MISSION
        </button>

        <div className="flex flex-col items-end">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: song.color }} />
             <div className="text-6xl font-orbitron font-bold text-white tabular-nums tracking-tighter drop-shadow-lg">
                {Math.floor(score.totalScore).toLocaleString()}
             </div>
          </div>
          <div className="text-zinc-700 font-bold text-[9px] tracking-[0.5em] mt-1 uppercase">HYPER SCORE</div>
        </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900">
        <div 
          className="h-full shadow-[0_0_15px_white] transition-all duration-300"
          style={{ width: `${progress}%`, backgroundColor: song.color }}
        />
      </div>

      <div className="relative w-full max-w-4xl aspect-video flex items-center justify-center">
        <canvas 
          ref={canvasRef} 
          width={640} 
          height={500} 
          className="w-full h-auto max-h-[80vh] object-contain relative z-10"
        />
        
        {lastRating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div 
              className={`text-9xl font-orbitron font-black italic transform transition-all duration-200 scale-110 ${
                lastRating === 'PERFECT' ? 'text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]' :
                lastRating === 'GREAT' ? 'text-cyan-400' :
                lastRating === 'GOOD' ? 'text-green-400' : 'text-red-500'
              }`}
            >
              {lastRating}
            </div>
          </div>
        )}

        {score.combo > 1 && (
          <div className="absolute bottom-4 w-full text-center z-20">
            <div className="inline-flex flex-col items-center">
              <span className="text-7xl font-orbitron text-white font-black tracking-tighter animate-bounce">
                {score.combo}
              </span>
              <span className="text-xs font-orbitron text-zinc-600 tracking-[0.6em] -mt-2">COMBO</span>
            </div>
          </div>
        )}
      </div>

      {isReadyToStart && countdown > 0 && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-zinc-500 font-orbitron mb-4 tracking-[1.5em] text-[10px] uppercase animate-pulse">Syncing heart rate</div>
          <div className="text-[15rem] font-orbitron font-black text-white leading-none drop-shadow-2xl">
            {countdown}
          </div>
        </div>
      )}

      <div className="absolute bottom-8 flex flex-col items-center gap-2">
        <div className="px-6 py-2 rounded-full border border-zinc-800 bg-black/50 backdrop-blur text-[10px] font-orbitron text-zinc-400 tracking-[0.3em] uppercase flex items-center gap-4">
          <div className="flex items-center gap-2">
             <span className="text-white bg-zinc-800 px-2 py-0.5 rounded">SPACE</span>
             <span>SALTA</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-zinc-700" />
          <div className="flex items-center gap-2">
             <Zap className="w-3 h-3 text-yellow-500" />
             <span>COLPISCI IL MURO</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
