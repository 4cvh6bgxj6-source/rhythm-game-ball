
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Song, ScoreData } from '../types.ts';
import { HIT_WINDOWS } from '../constants.ts';
import { ChevronLeft, Zap, Music, Play, Loader2, AlertCircle } from 'lucide-react';

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
  const [audioError, setAudioError] = useState(false);
  
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

  // Audio Setup con HTMLAudioElement (più compatibile di fetch)
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.src = song.audioUrl;
    audio.preload = "auto";
    audioRef.current = audio;

    const handleCanPlay = () => {
      console.log("Audio can play");
      setIsAudioLoading(false);
      setAudioError(false);
    };

    const handleError = (e: any) => {
      console.error("Audio failed to load", e);
      // Fallback: permetti di giocare anche se l'audio fallisce (modalità silente)
      setIsAudioLoading(false);
      setAudioError(true);
    };

    audio.addEventListener('canplaythrough', handleCanPlay);
    audio.addEventListener('error', handleError);

    // Timeout di sicurezza per il caricamento
    const loadTimeout = setTimeout(() => {
      if (isAudioLoading) {
        setIsAudioLoading(false);
      }
    }, 8000);

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

  const startSequence = async () => {
    if (!audioRef.current) return;
    
    // Inizializza l'AudioContext dopo il gesto dell'utente
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContext.current = ctx;

      // Prova a connettere l'analizzatore (potrebbe fallire per CORS su alcuni domini)
      try {
        const source = ctx.createMediaElementSource(audioRef.current);
        const node = ctx.createAnalyser();
        node.fftSize = 64;
        source.connect(node);
        node.connect(ctx.destination);
        analyzer.current = node;
        freqData.current = new Uint8Array(node.frequencyBinCount);
      } catch (e) {
        console.warn("CORS restrictions: Analyzer disabled, direct playback only.");
        // Se createMediaElementSource fallisce, l'audioElement è già connesso all'output di default del browser
      }
      
      await ctx.resume();
    } catch (e) {
      console.error("Web Audio init failed", e);
    }
    
    setIsReadyToStart(true);
  };

  const createParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 12; i++) {
      particles.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
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
      shakeAmount.current = 25;
    } else if (diff <= HIT_WINDOWS.GREAT) {
      rating = 'GREAT';
      points = 500;
      shakeAmount.current = 12;
    } else if (diff <= HIT_WINDOWS.GOOD) {
      rating = 'GOOD';
      points = 200;
      shakeAmount.current = 6;
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
    setTimeout(() => setLastRating(null), 350);
  }, [isActive, song.color, nextBeatTime]);

  const update = useCallback((time: number) => {
    if (!isActive) {
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    // Usiamo il tempo di sistema per la sincronizzazione se l'audio non è affidabile
    const elapsed = performance.now() - startTime.current;
    
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

    const jumpHeight = 160;
    ballState.current.y = 250 - (Math.sin(progressInBeat * Math.PI) * jumpHeight);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let visualModifier = 0;
        if (analyzer.current && freqData.current) {
          analyzer.current.getByteFrequencyData(freqData.current);
          visualModifier = (freqData.current[1] / 255) * 40;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        if (shakeAmount.current > 0) {
          ctx.translate((Math.random() - 0.5) * shakeAmount.current, (Math.random() - 0.5) * shakeAmount.current);
          shakeAmount.current *= 0.85;
        }

        ctx.lineWidth = 22;
        ctx.lineCap = 'round';
        
        // Muri neon
        ctx.strokeStyle = ballState.current.side === 'left' ? song.color : '#151515';
        ctx.shadowBlur = ballState.current.side === 'left' ? 40 : 0;
        ctx.shadowColor = song.color;
        ctx.beginPath(); ctx.moveTo(wallL, 100); ctx.lineTo(wallL, 400); ctx.stroke();
        
        ctx.strokeStyle = ballState.current.side === 'right' ? song.color : '#151515';
        ctx.shadowBlur = ballState.current.side === 'right' ? 40 : 0;
        ctx.beginPath(); ctx.moveTo(wallR, 100); ctx.lineTo(wallR, 400); ctx.stroke();
        ctx.shadowBlur = 0;

        // Effetti particellari
        particles.current = particles.current.filter(p => p.life > 0);
        particles.current.forEach(p => {
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
          p.x += p.vx; p.y += p.vy; p.life -= 0.04;
        });
        ctx.globalAlpha = 1.0;

        // Pallina Ultra-Visibile
        ctx.fillStyle = song.color;
        ctx.shadowBlur = 60 + visualModifier;
        ctx.shadowColor = song.color;
        ctx.beginPath();
        ctx.arc(ballState.current.x, ballState.current.y, 28 + (visualModifier / 8), 0, Math.PI * 2);
        ctx.fill();
        
        // Nucleo bianco per profondità
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(ballState.current.x, ballState.current.y, 14, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    if (audioRef.current) {
        const duration = audioRef.current.duration || 180;
        const p = (audioRef.current.currentTime / duration) * 100;
        setProgress(p);

        if (audioRef.current.ended || p >= 100) {
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
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.warn("Autoplay block bypass:", e));
      }
      requestRef.current = requestAnimationFrame(update);
    }
  }, [countdown, isReadyToStart, beatInterval, update]);

  const handleInput = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (!isActive) return;
    if (e.type === 'keydown' && (e as React.KeyboardEvent).code !== 'Space') return;
    handleHit(performance.now() - startTime.current);
  };

  return (
    <div 
      className="relative w-full h-screen bg-[#050505] flex flex-col items-center justify-center select-none outline-none overflow-hidden"
      onMouseDown={handleInput}
      tabIndex={0}
      onKeyDown={handleInput}
    >
      {!isReadyToStart && (
        <div className="absolute inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center p-8 text-center">
            <div className={`w-32 h-32 rounded-full mb-8 flex items-center justify-center shadow-2xl transition-all duration-500 ${isAudioLoading ? 'scale-75 opacity-50' : 'scale-100 opacity-100 animate-pulse'}`} style={{ backgroundColor: song.color }}>
                {isAudioLoading ? <Loader2 className="w-12 h-12 text-black animate-spin" /> : <Play fill="black" className="w-12 h-12 text-black ml-1" />}
            </div>
            
            <h2 className="text-5xl font-orbitron font-black text-white mb-2 tracking-tighter uppercase">{song.title}</h2>
            <p className="text-zinc-500 mb-10 uppercase tracking-[0.3em] font-bold text-xs">
              {audioError ? "Errore caricamento audio. Gioca in modalità silenziosa?" : "Sincronizza il ritmo"}
            </p>
            
            <button 
                onClick={startSequence}
                disabled={isAudioLoading}
                className="group relative px-20 py-8 bg-white text-black font-orbitron font-black text-4xl rounded-3xl hover:scale-105 active:scale-95 transition-all disabled:opacity-20 shadow-[0_0_50px_rgba(255,255,255,0.15)]"
            >
                <span className="relative z-10">{isAudioLoading ? "CARICAMENTO..." : "GIOCA"}</span>
                <div className="absolute inset-0 bg-zinc-200 rounded-3xl scale-0 group-hover:scale-100 transition-transform origin-center duration-300" />
            </button>

            {audioError && (
              <div className="mt-8 flex items-center gap-2 text-red-500/80 text-xs font-bold uppercase tracking-widest">
                <AlertCircle className="w-4 h-4" /> Problema con il server audio
              </div>
            )}
        </div>
      )}

      {/* Interfaccia in-game */}
      <div className="absolute top-0 w-full p-8 flex justify-between items-start pointer-events-none z-20">
        <button 
          onClick={(e) => { e.stopPropagation(); onBack(); }}
          className="pointer-events-auto flex items-center gap-3 text-zinc-600 hover:text-white transition-all font-orbitron text-[10px] tracking-[0.5em] group"
        >
          <div className="w-10 h-10 rounded-full border border-zinc-900 flex items-center justify-center group-hover:border-white group-hover:bg-white/10">
            <ChevronLeft className="w-5 h-5" />
          </div>
          MENU
        </button>

        <div className="flex flex-col items-end">
          <div className="text-7xl font-orbitron font-black text-white tabular-nums tracking-tighter drop-shadow-2xl">
            {Math.floor(score.totalScore).toLocaleString()}
          </div>
          <div className="text-zinc-700 font-bold text-[10px] tracking-[0.6em] mt-1 uppercase" style={{ color: song.color }}>SCORE</div>
        </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-2 bg-zinc-900/50">
        <div 
          className="h-full transition-all duration-300 shadow-[0_0_20px_white]"
          style={{ width: `${progress}%`, backgroundColor: song.color }}
        />
      </div>

      <div className="relative w-full max-w-6xl aspect-video flex items-center justify-center">
        <canvas 
          ref={canvasRef} 
          width={640} 
          height={500} 
          className="w-full h-auto max-h-[80vh] object-contain relative z-10"
        />
        
        {lastRating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div 
              className={`text-[12rem] font-orbitron font-black italic transform transition-all duration-100 scale-125 drop-shadow-[0_0_30px_rgba(0,0,0,1)] ${
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
              <span className="text-[12rem] font-orbitron text-white font-black tracking-tighter leading-none animate-bounce" style={{ color: song.color, textShadow: `0 0 50px ${song.color}` }}>
                {score.combo}
              </span>
              <span className="text-xl font-orbitron text-white/30 tracking-[1.5em] -mt-6">STREAK</span>
            </div>
          </div>
        )}
      </div>

      {isReadyToStart && countdown > 0 && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center text-white">
          <div className="text-[25rem] font-orbitron font-black animate-pulse">
            {countdown}
          </div>
          <div className="text-zinc-600 font-bold tracking-[2em] uppercase text-sm mt-10">Get Ready</div>
        </div>
      )}

      <div className="absolute bottom-16 flex flex-col items-center gap-4">
        <div className="px-10 py-5 rounded-full bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-3xl text-[10px] font-orbitron text-zinc-500 tracking-[0.5em] uppercase flex items-center gap-10 shadow-2xl">
          <div className="flex items-center gap-4">
             <span className="text-black bg-white px-3 py-1 rounded-lg font-black text-lg">SPACE</span>
             <span>SALTA</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-zinc-800" />
          <div className="flex items-center gap-4 text-white/80">
             <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
             <span>HIT THE BEAT</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
