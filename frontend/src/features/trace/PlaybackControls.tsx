import { useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, FastForward, Rewind } from 'lucide-react';
import { useTraceStore } from '../../stores/traceStore';

export default function PlaybackControls() {
  const {
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    maxTime,
    playbackSpeed,
    setPlaybackSpeed
  } = useTraceStore();

  const requestRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current !== undefined) {
        const deltaTime = time - lastTimeRef.current;
        if (isPlaying) {
          setCurrentTime((prev) => {
            const nextTime = prev + deltaTime * playbackSpeed;
            if (nextTime >= maxTime) {
              setIsPlaying(false);
              return maxTime;
            }
            return nextTime;
          });
        }
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, maxTime, playbackSpeed, setCurrentTime, setIsPlaying]);

  const togglePlay = () => {
    if (currentTime >= maxTime) {
      setCurrentTime(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(Number(e.target.value));
  };

  const formatTime = (ms: number) => {
    return (ms / 1000).toFixed(2) + 's';
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-background border border-border shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 z-40">
      <div className="flex items-center gap-2">
        <button onClick={() => setCurrentTime(0)} className="p-2 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground transition-colors">
          <RotateCcw className="w-4 h-4" />
        </button>
        <button onClick={() => setCurrentTime(Math.max(0, currentTime - 1000))} className="p-2 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground transition-colors">
          <Rewind className="w-4 h-4" />
        </button>
        <button onClick={togglePlay} className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-lg">
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
        </button>
        <button onClick={() => setCurrentTime(Math.min(maxTime, currentTime + 1000))} className="p-2 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground transition-colors">
          <FastForward className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-4 min-w-[300px]">
        <span className="font-mono text-xs w-12 text-right">{formatTime(currentTime)}</span>
        <input 
          type="range" 
          min="0" 
          max={maxTime || 100} 
          value={currentTime} 
          onChange={handleSeek}
          className="flex-1 accent-primary h-1 bg-accent rounded-full appearance-none cursor-pointer"
        />
        <span className="font-mono text-xs w-12">{formatTime(maxTime)}</span>
      </div>

      <div className="flex items-center gap-1 border-l border-border pl-4">
        {[1, 2, 5].map((speed) => (
          <button
            key={speed}
            onClick={() => setPlaybackSpeed(speed)}
            className={`px-2 py-1 text-xs font-mono rounded-md transition-colors ${
              playbackSpeed === speed ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {speed}x
          </button>
        ))}
      </div>
    </div>
  );
}
