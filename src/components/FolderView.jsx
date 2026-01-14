import React from 'react';
import { ChevronLeft, Music, Play, Pause, Activity } from 'lucide-react';

export default function FolderView({ folder, onBack, onPlay, current, isPlaying }) {
  return (
    <div className="fade-in">
      <button className="back-link" onClick={onBack}>
        <ChevronLeft size={18} /> Back to Library
      </button>
      <h1 className="view-title">{folder.name}</h1>
      
      <div className="station-list">
        {folder.stations.map(s => (
          <div key={s.id} className="station-row" onClick={() => onPlay(s)}>
            <div className="row-icon">
              {current?.id === s.id && isPlaying ? <Activity size={18} color="#6366f1" /> : <Music size={18} />}
            </div>
            <div className="row-info">
              <span className={current?.id === s.id ? "active-text" : ""}>{s.name}</span>
              <small>{s.genre}</small>
            </div>
            <div className="row-action">
              {current?.id === s.id && isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}