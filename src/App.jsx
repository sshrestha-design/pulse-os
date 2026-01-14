import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Radio, Volume2, Upload, ChevronLeft, Activity, Orbit, Search, Layers, Star, Disc, Share2, Zap, SignalHigh, Trash2 } from 'lucide-react';
import Hls from 'hls.js';

const THEME = {
  bg: '#0A0A0B',
  surface: '#121214',
  border: '#1F1F22',
  accent: '#DFFF00', // Neon Green/Yellow
  text: '#FFFFFF',
  textMuted: '#6B6B76',
  danger: '#FF0033'  // Signal Lost Red
};

export default function PulseOS() {
  const [folders, setFolders] = useState(() => {
    const saved = localStorage.getItem('pulse_v4_lib');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('pulse_favs');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeFolder, setActiveFolder] = useState(null);
  const [current, setCurrent] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [metadata, setMetadata] = useState("SIGNAL_IDLE");
  const [volume, setVolume] = useState(0.7);
  const [search, setSearch] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const audioRef = useRef(new Audio());
  const hlsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // --- PRELOAD LOGIC ---
  useEffect(() => {
    const preloadM3UFiles = async () => {
      if (folders.length === 0) {
        const defaultFiles = ['india.m3u', 'indie.m3u', 'pop.m3u', 'rap.m3u', 'rock.m3u', 'top_40.m3u', 'urban.m3u'];
        let preloadedFolders = [];
        for (const fileName of defaultFiles) {
          try {
            const response = await fetch(`/${fileName}`);
            if (!response.ok) continue; 
            const text = await response.text();
            const lines = text.split('\n');
            const stations = [];
            let currentName = "";
            lines.forEach(line => {
              if (line.startsWith('#EXTINF:')) currentName = line.split(',')[1] || "NODE";
              else if (line.startsWith('http')) {
                stations.push({ id: Math.random().toString(36).substr(2, 9), name: currentName.trim(), url: line.trim() });
                currentName = "";
              }
            });
            if (stations.length > 0) {
              preloadedFolders.push({ id: `pre-${fileName}`, name: fileName.toUpperCase().replace('.M3U', ''), stations, listeners: Math.floor(Math.random() * 500) + 100 });
            }
          } catch (e) { console.error("PRELOAD_FAIL:", fileName); }
        }
        if (preloadedFolders.length > 0) setFolders(preloadedFolders);
      }
    };
    preloadM3UFiles();
  }, []);

  // --- RECORDER & SIGNAL HANDLING ---
  useEffect(() => {
    audioRef.current.crossOrigin = "anonymous";
    
    const handleError = () => {
      setMetadata("SIGNAL_LOST_404"); // This triggers the RED color
      setIsLoading(false);
      setIsPlaying(false);
    };

    const audio = audioRef.current;
    audio.addEventListener('error', handleError);
    return () => audio.removeEventListener('error', handleError);
  }, []);

  const toggleRecord = () => {
    if (isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      if (!isPlaying) return alert("SIGNAL_REQUIRED");
      try {
        const stream = audioRef.current.captureStream ? audioRef.current.captureStream() : audioRef.current.mozCaptureStream();
        mediaRecorderRef.current = new MediaRecorder(stream);
        chunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `PULSE_REC_${Date.now()}.webm`;
          a.click();
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) { alert("REC_BLOCKED: Check HTTPS/CORS"); }
    }
  };

  const playStation = (station) => {
    if (current?.id === station.id && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    setMetadata("SYNCING...");
    setIsLoading(true);
    if (hlsRef.current) hlsRef.current.destroy();

    const onReady = () => {
      audioRef.current.play().then(() => { 
        setIsPlaying(true); 
        setIsLoading(false); 
        setMetadata("LIVE_SIGNAL"); // This triggers the GREEN color
      }).catch(() => {
        setMetadata("SIGNAL_LOST_404");
        setIsLoading(false);
      });
    };

    if (station.url.includes('m3u8') && Hls.isSupported()) {
      hlsRef.current = new Hls();
      hlsRef.current.loadSource(station.url);
      hlsRef.current.attachMedia(audioRef.current);
      hlsRef.current.on(Hls.Events.MANIFEST_PARSED, onReady);
    } else {
      audioRef.current.src = station.url;
      onReady();
    }
    setCurrent(station);
  };

  // --- RENDER ---
  return (
    <div style={s.app}>
      <style>{`
        body { background: ${THEME.bg}; margin: 0; font-family: 'JetBrains Mono', monospace; color: white; overflow: hidden; }
        .row-item { border-bottom: 1px solid ${THEME.border}; display: flex; align-items: center; justify-content: space-between; padding: 14px 10px; cursor: pointer; transition: 0.2s; }
        .row-item:hover { background: ${THEME.surface}; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .loading { animation: spin 2s linear infinite; }
        .glitch-text { text-shadow: ${metadata.includes('LOST') ? `0 0 10px ${THEME.danger}` : 'none'}; }
      `}</style>

      {/* SIDEBAR & MAIN (Simplified for brevity, same as previous) */}
      <aside style={s.side}>
        <div style={s.logo}><Zap size={16} fill={THEME.accent}/> PULSE_OS</div>
        <div style={{flex: 1, overflowY: 'auto'}}>
          {folders.map(f => (
            <div key={f.id} onClick={() => setActiveFolder(f)} style={s.trendItem}>
              <Layers size={14}/> {f.name}
            </div>
          ))}
        </div>
      </aside>

      <main style={s.main}>
        {activeFolder ? (
           <div style={{padding: '40px'}}>
             <button onClick={() => setActiveFolder(null)} style={s.back}><ChevronLeft size={16}/> BACK</button>
             {activeFolder.stations.map(st => (
               <div key={st.id} onClick={() => playStation(st)} className="row-item">
                 <span style={{color: current?.id === st.id ? THEME.accent : 'white'}}>{st.name}</span>
               </div>
             ))}
           </div>
        ) : (
          <div style={s.empty}><Orbit size={100} color={isPlaying ? THEME.accent : THEME.border} className={isLoading ? 'loading' : ''}/></div>
        )}
      </main>

      {/* FOOTER - WITH COLOR FEEDBACK */}
      <footer style={s.footer}>
        <div style={s.fLeft}>
          <div style={{
            fontSize: '0.6rem', 
            color: isPlaying ? THEME.accent : THEME.textMuted, 
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span style={{
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              background: isPlaying ? THEME.accent : THEME.textMuted,
              boxShadow: isPlaying ? `0 0 8px ${THEME.accent}` : 'none'
            }}/>
            {isPlaying ? '● LIVE' : '○ IDLE'}
          </div>
          <div style={{fontWeight: 900, fontSize: '1.2rem'}}>{current ? current.name.toUpperCase() : 'SYSTEM_OFFLINE'}</div>
          
          {/* DYNAMIC COLOR METADATA */}
          <div style={{
            fontSize: '0.65rem', 
            marginTop: '4px',
            fontWeight: 700,
            color: metadata.includes('LOST') ? THEME.danger : (metadata.includes('LIVE') ? THEME.accent : THEME.textMuted),
            transition: 'color 0.3s ease'
          }} className="glitch-text">
            {metadata}
          </div>
        </div>

        <div style={s.fCenter}>
          <button onClick={() => current && playStation(current)} style={s.playBtn}>
            {isPlaying ? <Pause size={24} fill="black"/> : <Play size={24} fill="black"/>}
          </button>
          <button onClick={toggleRecord} style={{...s.iconBtn, color: isRecording ? THEME.danger : THEME.textMuted, marginLeft: '20px'}}>
              <Disc size={24} className={isRecording ? 'loading' : ''}/>
          </button>
        </div>
        
        <div style={s.fRight}>
          <Volume2 size={16} color={THEME.textMuted}/>
          <input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => {
            const v = parseFloat(e.target.value);
            setVolume(v);
            audioRef.current.volume = v;
          }} style={s.volumeSlider}/>
        </div>
      </footer>
    </div>
  );
}

const s = {
  app: { height: '100vh', display: 'grid', gridTemplateColumns: '260px 1fr', gridTemplateRows: '1fr 120px', backgroundColor: THEME.bg },
  side: { background: THEME.bg, borderRight: `1px solid ${THEME.border}`, padding: '30px', display: 'flex', flexDirection: 'column' },
  logo: { fontWeight: 900, fontSize: '0.9rem', letterSpacing: '3px', marginBottom: '40px', display:'flex', alignItems:'center', gap:'10px', color: THEME.accent },
  trendItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', fontSize: '0.75rem', cursor: 'pointer', color: THEME.textMuted },
  main: { background: THEME.bg, overflowY: 'auto' },
  back: { background: 'none', border: 'none', color: THEME.textMuted, cursor: 'pointer', display:'flex', alignItems:'center', marginBottom:'10px' },
  empty: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  footer: { gridColumn: '1 / 3', background: THEME.bg, borderTop: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', padding: '0 50px' },
  fLeft: { flex: 1 },
  fCenter: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' },
  playBtn: { width: '60px', height: '60px', borderRadius: '50%', background: THEME.accent, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  fRight: { flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer' },
  volumeSlider: { width: '100px', accentColor: THEME.accent }
};