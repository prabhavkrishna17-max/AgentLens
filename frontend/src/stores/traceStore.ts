import { create } from 'zustand';

interface TraceState {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  
  // Replay controls
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTime: number; // Current playback time in ms
  setCurrentTime: (time: number | ((prev: number) => number)) => void;
  maxTime: number;
  setMaxTime: (time: number) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
}

export const useTraceStore = create<TraceState>((set) => ({
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  
  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  currentTime: 0,
  setCurrentTime: (time: number | ((prev: number) => number)) => set((state) => ({ 
    currentTime: typeof time === 'function' ? time(state.currentTime) : time 
  })),
  maxTime: 0,
  setMaxTime: (time) => set({ maxTime: time }),
  playbackSpeed: 1,
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
}));
