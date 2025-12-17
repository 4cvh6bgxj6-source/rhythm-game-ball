
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Song, ScoreData } from '../types';
import { HIT_WINDOWS } from '../constants';
import { ChevronLeft, Volume2, Target } from 'lucide-react';

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
  const requestRef = useRef<number>();
  const startTime = useRef<number>(0);
  const nextBeatTime = useRef<number>(0);
  const beatInterval = (60 / song.bpm) * 1000; // ms
  
  const ballState = useRef({ x: 100, y: 250, side: 'left' as 'left' | 'right' });
  const lastTapTime = useRef<number>(0);
  const impactEffect = useRef<{ x: number, y: number, time: number } | null>(null);

  // Initialize Audio
  useEffect(() => {
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContext.current?.close();
    };
  }, []);

  // Simple Synthesizer for beat
  const playBeatSound = useCallback((freq: number = 440, type: OscillatorType = 'sine') => {
    if (!audioContext.current) return;
    const osc = audioContext.current.createOscillator();
    const gain = audioContext.current.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioContext.current.currentTime);
    gain.gain.setValueAtTime(0.1, audioContext.current.currentTime);
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
    } else if (diff <= HIT_WINDOWS.GREAT) {
      rating = 'GREAT';
      points = 500;
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
        playBeatSound(880, 'square');
        impactEffect.current = { 
            x: ballState.current.side === 'left' ? 60 : 580, 
            y: ballState.current.y, 
            time: performance.now() 
        };
    } else {
        setScore(prev => ({ ...prev, miss: prev.miss + 1, combo: 0 }));
    }

    setLastRating(rating);
    setTimeout(() => setLastRating(null), 500);
  }, [isActive, playBeatSound]);

  const update = useCallback((time: number) => {
    if (!startTime.current) startTime.current = time;
    const elapsed = time - startTime.current;
    
    // Check for miss if beat passed significantly
    if (time > nextBeatTime.current + HIT_WINDOWS.GOOD) {
      // If no tap was registered within the window of the beat that just passed
      if (lastTapTime.current < nextBeatTime.current - HIT_WINDOWS.GOOD) {
        setScore(prev => ({ ...prev, miss: prev.miss + 1, combo: 0 }));
        setLastRating('MISS');
        setTimeout(() => setLastRating(null), 500);
      }
      
      // Move to next beat target
      nextBeatTime.current += beatInterval;
      ballState.current.side = ballState.current.side === 'left' ? 'right' : 'left';
      playBeatSound(220, 'sine');
    }

    // Ball movement calculation
    const timeSinceLastBeat = (time - (nextBeatTime.current - beatInterval)) % beatInterval;
    const progressInBeat = timeSinceLastBeat / beatInterval;
    
    const wallLeft = 60;
    const wallRight = 580;
    const distance = wallRight - wallLeft;

    if (ballState.current.side === 'right') {
      // Moving from Left to Right
      ballState.current.x = wallLeft + (progressInBeat * distance);
    } else {
      // Moving from Right to Left
      ballState.current.x = wallRight - (progressInBeat * distance);
    }

    // Canvas drawing
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw Side Walls
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        
        // Left Wall
        ctx.strokeStyle = ballState.current.side === 'left' ? song.color : '#222';
        ctx.shadowBlur = ballState.current.side === 'left' ? 20 : 0;
        ctx.shadowColor = song.color;
        ctx.beginPath(); ctx.moveTo(wallLeft - 10, 50); ctx.lineTo(wallLeft - 10, 450); ctx.stroke();
        
        // Right Wall
        ctx.strokeStyle = ballState.current.side === 'right' ? song.color : '#222';
        ctx.shadowBlur = ballState.current.side === 'right' ? 20 : 0;
        ctx.beginPath(); ctx.moveTo(wallRight + 10, 50); ctx.lineTo(wallRight + 10, 450); ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw Impact Effect
        if (impactEffect.current && time - impactEffect.current.time < 300) {
            const alpha = 1 - (time - impactEffect.current.time) / 300;
            ctx.fillStyle = `${song.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
            ctx.beginPath();
            ctx.arc(impactEffect.current.x, impactEffect.current.y, 40 * (1 - alpha), 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw Ball Trail
        ctx.fillStyle = `${song.color}33`;
        ctx.beginPath();
        const trailX = ballState.current.side === 'right' ? ballState.current.x - 20 : ballState.current.x + 20;
        ctx.arc(trailX, ballState.current.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Draw Ball
        ctx.fillStyle = song.color;
        ctx.shadowBlur = 25;
        ctx.shadowColor = song.color;
        ctx.beginPath();
        ctx.arc(ballState.current.x, ballState.current.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    const totalDuration = 45000; // 45 seconds play session
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
      // Start ball on the left
      ballState.current.side = 'right'; // first target is right wall
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
      className="relative w-full h-screen bg-black flex flex-col items-center justify-center select-none outline-none"
      onMouseDown={handleInput}
      tabIndex={0}
      onKeyDown={handleInput}
    >
      {/* UI Overlay */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-start pointer-events-none">
        <button 
          onClick={(e) => { e.stopPropagation(); onBack(); }}
          className="pointer-events-auto flex items-center gap-2 text-zinc-400 hover:text-white transition-colors font-orbitron text-sm"
        >
          <ChevronLeft className="w-4 h-4" /> QUIT MISSION
        </button>

        <div className="flex flex-col items-end">
          <div className="text-4xl font-orbitron font-bold text-white tabular-nums tracking-tighter">
            {Math.floor(score.totalScore).toLocaleString()}
          </div>
          <div className="text-zinc-500 font-bold text-xs tracking-widest">PTS</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900">
        <div 
          className="h-full shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-300"
          style={{ width: `${progress}%`, backgroundColor: song.color }}
        />
      </div>

      {/* Game Stage */}
      <div className="relative w-full max-w-3xl h-[500px]">
        <canvas 
          ref={canvasRef} 
          width={640} 
          height={500} 
          className="mx-auto"
        />
        
        {/* Rating Feedback */}
        {lastRating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div 
              className={`text-7xl font-orbitron font-black italic transform -rotate-6 animate-pulse drop-shadow-lg ${
                lastRating === 'PERFECT' ? 'text-yellow-400' :
                lastRating === 'GREAT' ? 'text-cyan-400' :
                lastRating === 'GOOD' ? 'text-green-400' : 'text-red-500'
              }`}
            >
              {lastRating}
            </div>
          </div>
        )}

        {/* Combo */}
        {score.combo > 1 && (
          <div className="absolute bottom-4 w-full text-center">
            <div className="text-5xl font-orbitron text-white font-bold animate-bounce drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
              {score.combo}<span className="text-2xl ml-1 text-zinc-400">COMBO</span>
            </div>
          </div>
        )}
      </div>

      {/* Countdown Overlay */}
      {countdown > 0 && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
          <div className="text-zinc-500 font-orbitron mb-4 tracking-[0.3em] text-sm">SYNCHRONIZING...</div>
          <div className="text-9xl font-orbitron font-black text-white animate-pulse">
            {countdown}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 text-zinc-500 flex items-center gap-6 text-xs font-orbitron tracking-widest uppercase">
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-white font-bold">SPACE</kbd>
          <span>OR CLICK ON IMPACT</span>
        </div>
        <div className="w-1 h-1 bg-zinc-800 rounded-full" />
        <div className="flex items-center gap-2">
          <Volume2 className="w-3 h-3" />
          <span>FOLLOW THE BEAT</span>
        </div>
      </div>
    </div>
  );
};

export default Game;
