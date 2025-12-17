
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

  // Caricamento audio ultra-resiliente
  useEffect(() => {
    const audio = new Audio();
    // Il flag anonymous deve essere settato prima del caricamento della sorgente
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    
    const loadTimeout = setTimeout(() => {
      console.warn("Audio loading taking too long, enabling play anyway");
      setIsAudioLoading(false);
    }, 5000);

    const handleCanPlay = () => {
      clearTimeout(loadTimeout);
      setIsAudioLoading(false);
    };
    
    const handleError = () => {
      clearTimeout(loadTimeout);
      console.error("Audio failed to load from source");
      setIsAudioLoading(false);
    };

    audio.addEventListener('canplaythrough', handleCanPlay);
    audio.addEventListener('error', handleError);
    
    // Inizia il caricamento dopo aver settato gli eventi
    audio.src = song.audioUrl;
    audioRef.current = audio;

    return () => {
      clearTimeout(loadTimeout);
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = "";
      if (audioContext.current) audioContext.current.close();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [song.audioUrl]);

  const initGame = async () => {
    if (!audioRef.current) return;
    
    try {
      // Inizializza AudioContext solo dopo interazione utente
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContext.current = ctx;

      try {
        const source = ctx.createMediaElementSource(audioRef.current);
        const node = ctx.createAnalyser();
        node.fftSize = 128;
        source.connect(node);
        node.connect(ctx.destination);
        analyzer.current = node;
        freqData.current = new Uint8Array(node.frequencyBinCount);
      } catch (e) {
        console.warn("CORS/Source node failed, proceeding with standard audio");
        audioRef.current.connect(ctx.destination as any);
      }
      
      await ctx.resume();
    } catch (e) {
      console.warn("Audio Context init failed");
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
      shakeAmount.current = 20;
    } else if (diff <= HIT_WINDOWS.GREAT) {
      rating = 'GREAT';
      points = 500;
      shakeAmount.current = 10;
    } else if (diff <= HIT_WINDOWS.GOOD) {
      rating = 'GOOD';
      points = 200;
      shakeAmount.current = 5;
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

  const update = useCallback((time: number) => {
    if (!isActive) {
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    // Fallback del tempo se l'audio è bloccato
    const audioTime = audioRef.current ? audioRef.current.currentTime * 1000 : 0;
    const elapsed = audioTime > 0 ? audioTime : (performance.now() - startTime.current);
    
    if (elapsed > nextBeatTime.current) {
      nextBeatTime.current += beatInterval;
      ballState.current.side = ballState.current.side === 'left' ? 'right' : 'left';
    }

    const timeSinceLastBeat = (elapsed - (nextBeatTime.current - beatInterval)) % beatInterval;
    const progressInBeat = Math.max(0, Math.min(1, timeSinceLastBeat / beatInterval));
    
    const wallL = 70;
    const wallR = 570;
    const distance = wallR - wallL;

    if (ballState.current.side === 'right') {
      ballState.current.x = wallL + (progressInBeat * distance);
    } else {
      ballState.current.x = wallR - (progressInBeat * distance);
    }

    const jumpHeight = 180;
    ballState.current.y = 250 - (Math.sin(progressInBeat * Math.PI) * jumpHeight);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let visualModifier = 0;
        if (analyzer.current && freqData.current) {
          analyzer.current.getByteFrequencyData(freqData.current);
          visualModifier = (freqData.current[2] / 255) * 50;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        if (shakeAmount.current > 0) {
          ctx.translate((Math.random() - 0.5) * shakeAmount.current, (Math.random() - 0.5) * shakeAmount.current);
          shakeAmount.current *= 0.9;
        }

        // Pareti
        ctx.lineWidth = 20;
        ctx.lineCap = 'round';
        
        // Sinistra
        ctx.strokeStyle = ballState.current.side === 'left' ? song.color : '#151515';
        ctx.shadowBlur = ballState.current.side === 'left' ? 30 : 0;
        ctx.shadowColor = song.color;
        ctx.beginPath(); ctx.moveTo(wallL, 100); ctx.lineTo(wallL, 400); ctx.stroke();
        
        // Destra
        ctx.strokeStyle = ballState.current.side === 'right' ? song.color : '#151515';
        ctx.shadowBlur = ballState.current.side === 'right' ? 30 : 0;
        ctx.beginPath(); ctx.moveTo(wallR, 100); ctx.lineTo(wallR, 400); ctx.stroke();
        ctx.shadowBlur = 0;

        // Particelle
        particles.current = particles.current.filter(p => p.life > 0);
        particles.current.forEach(p => {
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
          p.x += p.vx; p.y += p.vy; p.life -= 0.03;
        });
        ctx.globalAlpha = 1.0;

        // PALLINA
        ctx.fillStyle = song.color;
        ctx.shadowBlur = 50 + visualModifier;
        ctx.shadowColor = song.color;
        ctx.beginPath();
        ctx.arc(ballState.current.x, ballState.current.y, 25 + (visualModifier / 6), 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(ballState.current.x, ballState.current.y, 12, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    if (audioRef.current) {
        const dur = audioRef.current.duration || 300;
        const p = (audioRef.current.currentTime / dur) * 100;
        setProgress(p);

        if (audioRef.current.ended || (p >= 100 && audioTime > 2000)) {
            setIsActive(false);
            onFinish(score);
            return;
        }
    }

    requestRef.current = requestAnimationFrame(update);
  }, [isActive, beatInterval, onFinish, score, song.color]);

  useEffect(() => {
    if (!isReadyToStart) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsActive(true);
      startTime.current = performance.now();
      nextBeatTime.current = beatInterval;
      if (audioRef.current) {
        audioRef.current.play().catch(() => console.warn("Audio blocked, proceeding silenty..."));
      }
      requestRef.current = requestAnimationFrame(update);
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
            <div 
                className={`w-36 h-36 rounded-full flex items-center justify-center mb-8 shadow-2xl transition-all duration-700 ${isAudioLoading ? 'scale-75 opacity-50' : 'scale-100 opacity-100 animate-pulse'}`} 
                style={{ backgroundColor: song.color }}
            >
                {isAudioLoading ? <Loader2 className="w-16 h-16 text-black animate-spin" /> : <Play fill="black" className="w-16 h-16 text-black" />}
            </div>
            <h2 className="text-6xl font-orbitron font-black text-white mb-4 tracking-tighter uppercase">{song.title}</h2>
            <p className="text-zinc-500 mb-12 uppercase tracking-[0.4em] font-bold text-sm">Caricamento traccia...</p>
            
            <button 
                onClick={initGame}
                disabled={isAudioLoading}
                className="px-20 py-8 bg-white text-black font-orbitron font-black text-4xl rounded-3xl hover:scale-105 active:scale-95 transition-all flex items-center gap-6 disabled:opacity-20 shadow-[0_0_50px_rgba(255,255,255,0.2)]"
            >
                {isAudioLoading ? "ATTENDI..." : "GIOCA ORA"}
            </button>
            <p className="mt-8 text-zinc-700 text-[10px] uppercase tracking-widest font-black">Nota: Clicca GIOCA per attivare il suono</p>
        </div>
      )}

      <div className="absolute top-0 w-full p-10 flex justify-between items-start pointer-events-none z-20">
        <button 
          onClick={(e) => { e.stopPropagation(); onBack(); }}
          className="pointer-events-auto flex items-center gap-3 text-zinc-600 hover:text-white transition-all font-orbitron text-xs tracking-[0.5em] group"
        >
          <div className="w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center group-hover:border-white">
            <ChevronLeft className="w-6 h-6" />
          </div>
          CHIUDI
        </button>

        <div className="flex flex-col items-end">
          <div className="text-8xl font-orbitron font-black text-white tabular-nums tracking-tighter drop-shadow-2xl">
            {Math.floor(score.totalScore).toLocaleString()}
          </div>
          <div className="text-zinc-600 font-bold text-xs tracking-[0.6em] mt-2 uppercase" style={{ color: song.color }}>SYNC SCORE</div>
        </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-3 bg-zinc-900">
        <div 
          className="h-full transition-all duration-300 shadow-[0_0_30px_white]"
          style={{ width: `${progress}%`, backgroundColor: song.color }}
        />
      </div>

      <div className="relative w-full max-w-6xl aspect-video flex items-center justify-center">
        <canvas 
          ref={canvasRef} 
          width={640} 
          height={500} 
          className="w-full h-auto max-h-[85vh] object-contain relative z-10"
        />
        
        {lastRating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div 
              className={`text-[12rem] font-orbitron font-black italic transform transition-all duration-75 scale-125 drop-shadow-2xl ${
                lastRating === 'PERFECT' ? 'text-yellow-400' :
                lastRating === 'GREAT' ? 'text-cyan-400' :
                lastRating === 'GOOD' ? 'text-green-400' : 'text-red-600'
              }`}
            >
              {lastRating}
            </div>
          </div>
        )}

        {score.combo > 1 && (
          <div className="absolute bottom-5 w-full text-center z-20">
            <div className="inline-flex flex-col items-center">
              <span className="text-[12rem] font-orbitron text-white font-black tracking-tighter leading-none animate-bounce" style={{ color: song.color, textShadow: `0 0 40px ${song.color}` }}>
                {score.combo}
              </span>
              <span className="text-2xl font-orbitron text-white/50 tracking-[1em] -mt-6">STREAK</span>
            </div>
          </div>
        )}
      </div>

      {isReadyToStart && countdown > 0 && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center text-white">
          <div className="text-[30rem] font-orbitron font-black animate-ping">
            {countdown}
          </div>
        </div>
      )}

      <div className="absolute bottom-16 flex flex-col items-center gap-4">
        <div className="px-10 py-5 rounded-3xl bg-zinc-900/90 border-2 border-zinc-800 backdrop-blur-2xl text-xs font-orbitron text-zinc-400 tracking-[0.5em] uppercase flex items-center gap-10 shadow-2xl">
          <div className="flex items-center gap-4">
             <span className="text-black bg-white px-4 py-1.5 rounded-xl font-black text-xl">SPACE</span>
             <span>SALTA</span>
          </div>
          <div className="w-3 h-3 rounded-full bg-zinc-700" />
          <div className="flex items-center gap-4 text-white">
             <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" />
             <span>COINCIDI IL BEAT</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
