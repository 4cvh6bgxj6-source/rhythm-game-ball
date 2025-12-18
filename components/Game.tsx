
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Song, ScoreData } from '../types.ts';
import { HIT_WINDOWS } from '../constants.ts';
import { ChevronLeft, Zap, Play, Loader2, AlertCircle } from 'lucide-react';

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
  const nextBeatTime = useRef<number>(0);
  const beatInterval = (60 / song.bpm) * 1000;
  
  const ballState = useRef({ x: 320, y: 250, side: 'left' as 'left' | 'right' });
  const particles = useRef<Particle[]>([]);
  const shakeAmount = useRef(0);
  const freqData = useRef<Uint8Array | null>(null);

  // Audio Setup
  useEffect(() => {
    const audio = new Audio();
    // Importante: settiamo crossOrigin per provare a usare l'analizzatore,
    // ma gestiamo il fallimento se il server non lo supporta.
    audio.crossOrigin = "anonymous";
    audio.src = song.audioUrl;
    audio.preload = "auto";
    audioRef.current = audio;

    const handleCanPlay = () => {
      setIsAudioLoading(false);
      setAudioError(false);
    };

    const handleError = () => {
      console.warn("Audio loading issue, attempting to proceed anyway.");
      setIsAudioLoading(false);
      setAudioError(true);
    };

    audio.addEventListener('canplaythrough', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
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
    
    // Inizializzazione sicura dell'AudioContext
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContext.current = ctx;

      // Proviamo a connettere l'analizzatore per gli effetti visivi
      try {
        const source = ctx.createMediaElementSource(audioRef.current);
        const node = ctx.createAnalyser();
        node.fftSize = 64;
        source.connect(node);
        node.connect(ctx.destination);
        analyzer.current = node;
        freqData.current = new Uint8Array(node.frequencyBinCount);
      } catch (e) {
        // Se fallisce per CORS, l'audio suonerà comunque ma senza visualizer
        console.warn("Visualizer disabled due to CORS/security restrictions.");
      }
      
      await ctx.resume();
    } catch (e) {
      console.error("Audio Context failed to start:", e);
    }
    
    setIsReadyToStart(true);
  };

  const createParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      particles.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        life: 1.0,
        color
      });
    }
  };

  const handleHit = useCallback(() => {
    if (!isActive || !audioRef.current) return;
    
    const audioTime = audioRef.current.currentTime * 1000;
    const diff = Math.abs(audioTime - nextBeatTime.current);
    let rating = 'MISS';
    let points = 0;

    if (diff <= HIT_WINDOWS.PERFECT) {
      rating = 'PERFECT';
      points = 1000;
      shakeAmount.current = 25;
    } else if (diff <= HIT_WINDOWS.GREAT) {
      rating = 'GREAT';
      points = 500;
      shakeAmount.current = 15;
    } else if (diff <= HIT_WINDOWS.GOOD) {
      rating = 'GOOD';
      points = 200;
      shakeAmount.current = 8;
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

  const update = useCallback(() => {
    if (!isActive || !audioRef.current) {
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    const audioTime = audioRef.current.currentTime * 1000;
    
    // Sincronizzazione beat
    if (audioTime > nextBeatTime.current) {
      nextBeatTime.current += beatInterval;
      ballState.current.side = ballState.current.side === 'left' ? 'right' : 'left';
    }

    const timeSinceLastBeat = (audioTime - (nextBeatTime.current - beatInterval)) % beatInterval;
    const progressInBeat = Math.max(0, Math.min(1, timeSinceLastBeat / beatInterval));
    
    const wallL = 70;
    const wallR = 570;
    const distance = wallR - wallL;

    // Movimento orizzontale
    if (ballState.current.side === 'right') {
      ballState.current.x = wallL + (progressInBeat * distance);
    } else {
      ballState.current.x = wallR - (progressInBeat * distance);
    }

    // Movimento a parabola
    const jumpHeight = 200;
    ballState.current.y = 250 - (Math.sin(progressInBeat * Math.PI) * jumpHeight);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let visualModifier = 0;
        if (analyzer.current && freqData.current) {
          analyzer.current.getByteFrequencyData(freqData.current);
          visualModifier = (freqData.current[1] / 255) * 60;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        if (shakeAmount.current > 0) {
          ctx.translate((Math.random() - 0.5) * shakeAmount.current, (Math.random() - 0.5) * shakeAmount.current);
          shakeAmount.current *= 0.9;
        }

        // Muri laterali
        ctx.lineWidth = 24;
        ctx.lineCap = 'round';
        
        ctx.strokeStyle = ballState.current.side === 'left' ? song.color : '#1a1a1a';
        ctx.shadowBlur = ballState.current.side === 'left' ? 40 : 0;
        ctx.shadowColor = song.color;
        ctx.beginPath(); ctx.moveTo(wallL, 100); ctx.lineTo(wallL, 400); ctx.stroke();
        
        ctx.strokeStyle = ballState.current.side === 'right' ? song.color : '#1a1a1a';
        ctx.shadowBlur = ballState.current.side === 'right' ? 40 : 0;
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

        // La Pallina (Sempre visibile)
        ctx.fillStyle = song.color;
        ctx.shadowBlur = 50 + visualModifier;
        ctx.shadowColor = song.color;
        ctx.beginPath();
        ctx.arc(ballState.current.x, ballState.current.y, 30 + (visualModifier / 8), 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(ballState.current.x, ballState.current.y, 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    const duration = audioRef.current.duration || 1;
    const p = (audioRef.current.currentTime / duration) * 100;
    setProgress(p);

    if (audioRef.current.ended) {
      setIsActive(false);
      onFinish(score);
      return;
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
      nextBeatTime.current = beatInterval;
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => {
          console.error("Playback failed:", e);
          setIsActive(false);
          setAudioError(true);
        });
      }
      requestRef.current = requestAnimationFrame(update);
    }
  }, [countdown, isReadyToStart, beatInterval, update]);

  const handleInput = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (!isActive) return;
    if (e.type === 'keydown' && (e as React.KeyboardEvent).code !== 'Space') return;
    handleHit();
  };

  return (
    <div 
      className="relative w-full h-screen bg-[#020202] flex flex-col items-center justify-center select-none outline-none overflow-hidden"
      onMouseDown={handleInput}
      tabIndex={0}
      onKeyDown={handleInput}
    >
      {/* Schermo di caricamento e inizio */}
      {!isReadyToStart && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center">
            <div className={`w-36 h-36 rounded-full mb-10 flex items-center justify-center shadow-[0_0_60px_rgba(255,255,255,0.1)] transition-all duration-700 ${isAudioLoading ? 'scale-75 opacity-30 animate-pulse' : 'scale-100 opacity-100'}`} style={{ backgroundColor: song.color }}>
                {isAudioLoading ? <Loader2 className="w-16 h-16 text-black animate-spin" /> : <Play fill="black" className="w-16 h-16 text-black ml-2" />}
            </div>
            
            <h2 className="text-6xl font-orbitron font-black text-white mb-4 tracking-tighter uppercase italic">{song.title}</h2>
            <p className="text-zinc-600 mb-12 uppercase tracking-[0.5em] font-bold text-xs">
              {audioError ? "Errore caricamento. Riprova o scegli un'altra traccia." : "Preparati alla sfida"}
            </p>
            
            <button 
                onClick={startSequence}
                disabled={isAudioLoading}
                className="group relative px-24 py-10 bg-white text-black font-orbitron font-black text-5xl rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-20 shadow-[0_0_80px_rgba(255,255,255,0.2)]"
            >
                <span className="relative z-10 uppercase tracking-widest">{isAudioLoading ? "CARICAMENTO" : "GIOCA"}</span>
            </button>

            {audioError && (
              <div className="mt-10 flex items-center gap-3 text-red-500 font-bold uppercase tracking-widest text-sm bg-red-500/10 px-6 py-3 rounded-full border border-red-500/20">
                <AlertCircle className="w-5 h-5" /> Connessione audio fallita
              </div>
            )}
        </div>
      )}

      {/* Header Info */}
      <div className="absolute top-0 w-full p-10 flex justify-between items-start pointer-events-none z-20">
        <button 
          onClick={(e) => { e.stopPropagation(); onBack(); }}
          className="pointer-events-auto flex items-center gap-4 text-zinc-500 hover:text-white transition-all font-orbitron text-[10px] tracking-[0.8em] group"
        >
          <div className="w-12 h-12 rounded-full border border-zinc-900 flex items-center justify-center group-hover:border-white group-hover:bg-white/10">
            <ChevronLeft className="w-6 h-6" />
          </div>
          CHIUDI
        </button>

        <div className="flex flex-col items-end">
          <div className="text-8xl font-orbitron font-black text-white tabular-nums tracking-tighter drop-shadow-2xl">
            {Math.floor(score.totalScore).toLocaleString()}
          </div>
          <div className="text-zinc-700 font-bold text-[12px] tracking-[1em] mt-2 uppercase" style={{ color: song.color }}>SCORE</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-3 bg-zinc-900/50">
        <div 
          className="h-full transition-all duration-300 shadow-[0_0_30px_white]"
          style={{ width: `${progress}%`, backgroundColor: song.color }}
        />
      </div>

      {/* Main Game Area */}
      <div className="relative w-full max-w-6xl aspect-video flex items-center justify-center">
        <canvas 
          ref={canvasRef} 
          width={640} 
          height={500} 
          className="w-full h-auto max-h-[85vh] object-contain relative z-10"
        />
        
        {/* Rating Popup */}
        {lastRating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div 
              className={`text-[15rem] font-orbitron font-black italic transform transition-all duration-100 scale-125 drop-shadow-[0_0_60px_rgba(0,0,0,1)] ${
                lastRating === 'PERFECT' ? 'text-yellow-400' :
                lastRating === 'GREAT' ? 'text-cyan-400' :
                lastRating === 'GOOD' ? 'text-green-400' : 'text-red-600'
              }`}
            >
              {lastRating}
            </div>
          </div>
        )}

        {/* Combo Indicator */}
        {score.combo > 1 && (
          <div className="absolute bottom-10 w-full text-center z-20">
            <div className="inline-flex flex-col items-center">
              <span className="text-[14rem] font-orbitron text-white font-black tracking-tighter leading-none animate-bounce" style={{ color: song.color, textShadow: `0 0 60px ${song.color}` }}>
                {score.combo}
              </span>
              <span className="text-3xl font-orbitron text-white/20 tracking-[1.5em] -mt-10">COMBO</span>
            </div>
          </div>
        )}
      </div>

      {/* Countdown Overlay */}
      {isReadyToStart && countdown > 0 && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center text-white">
          <div className="text-[30rem] font-orbitron font-black animate-ping text-white">
            {countdown}
          </div>
          <div className="text-zinc-700 font-bold tracking-[3em] uppercase text-xl mt-12">SALTA A TEMPO</div>
        </div>
      )}

      {/* Control Instruction */}
      <div className="absolute bottom-20 flex flex-col items-center gap-6">
        <div className="px-14 py-7 rounded-full bg-zinc-900/40 border border-zinc-800/40 backdrop-blur-2xl text-[12px] font-orbitron text-zinc-500 tracking-[0.6em] uppercase flex items-center gap-14 shadow-2xl">
          <div className="flex items-center gap-5">
             <span className="text-black bg-white px-5 py-2 rounded-xl font-black text-2xl shadow-[0_0_20px_white]">BARRA SPAZIO</span>
             <span>COLPISCI IL MURO</span>
          </div>
          <div className="w-3 h-3 rounded-full bg-zinc-800" />
          <div className="flex items-center gap-5 text-white/60">
             <Zap className="w-7 h-7 text-yellow-500 fill-yellow-500" />
             <span>SEGUE IL RITMO</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
