import React from 'react';
import { Play, Pause, Volume2, Music } from 'lucide-react';

export default function Player({ current, isPlaying, onToggle, volume, setVolume }) {
  return (
    <footer className="player-bar">
      <div className="p-info">
        <div className="p-art"><Music size={20} color={isPlaying ? "#6366f1" : "#475569"} /></div>
        <div>
          <div className="p-name">{current ? current.name : "Select a station"}</div>
          <div className="p-status">{isPlaying ? "Streaming Live" : "Ready"}</div>
        </div>
      </div>

      <div className="p-controls">
        <button className="play-btn-main" onClick={onToggle}>
          {isPlaying ? <Pause fill="white" /> : <Play fill="white" style={{marginLeft: 3}} />}
        </button>
      </div>

      <div className="p-volume">
        <Volume2 size={18} color="#475569" />
        <input 
          type="range" min="0" max="1" step="0.01" 
          value={volume} 
          onChange={(e) => setVolume(parseFloat(e.target.value))} 
        />
      </div>
    </footer>
  );
}