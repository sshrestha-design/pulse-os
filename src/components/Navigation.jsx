import React from 'react';
import { Radio, Upload, Home } from 'lucide-react';

export default function Navigation({ onHome, onImport }) {
  return (
    <nav className="nav-container">
      <div className="nav-brand" onClick={onHome} style={{ cursor: 'pointer' }}>
        <div className="nav-logo"><Radio size={20} color="white" /></div>
        <span className="nav-title">NepRadio</span>
      </div>

      <div className="nav-actions">
        <button className="nav-btn" onClick={onHome}>
          <Home size={18} /> Library
        </button>
        <label className="import-pill">
          <Upload size={16} /> 
          <span>Import M3U</span>
          <input type="file" accept=".m3u,.m3u8" style={{ display: 'none' }} onChange={onImport} />
        </label>
      </div>
    </nav>
  );
}