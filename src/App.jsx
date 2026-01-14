import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Radio, Volume2, Upload, ChevronLeft, Activity, Orbit, Search, Layers, Star, Disc, Share2, Zap, SignalHigh, Trash2 } from 'lucide-react';
import Hls from 'hls.js';

// --- THEME & BRANDING ---
const THEME = {
  bg: '#0A0A0B',
  surface: '#121214',
  border: '#1F1F22',
  accent: '#DFFF00', 
  text: '#FFFFFF',
  textMuted: '#6B6B76',
  danger: '#FF0033'
};

export default function PulseOS() {
  // --- CORE STATE ---
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

  // --- 1. PRELOAD ENGINE (Ensures folders show up on first load) ---
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
              if (line.startsWith('#EXTINF:')) {
                currentName = line.split(',')[1] || "NODE";
              } else if (line.startsWith('http')) {
                stations.push({ 
                  id: Math.random().toString(36).substr(2, 9), 
                  name: currentName.trim(), 
                  url: line.trim() 
                });
                currentName = "";
              }
            });

            if (stations.length > 0) {
              preloadedFolders.push({
                id: `pre-${fileName}`,
                name: fileName.toUpperCase().replace('.M3U', ''),
                stations,
                listeners: Math.floor(Math.random() * 500) + 100
              });
            }
          } catch (e) { console.error("PRELOAD_FAIL:", fileName); }
        }
        if (preloadedFolders.length > 0) setFolders(preloadedFolders);
      }
    };
    preloadM3UFiles();
  }, []);

  // --- 2. GLOBAL HANDLERS (Recorder & Errors) ---
  useEffect(() => {
    audioRef.current.crossOrigin = "anonymous";
    audioRef.current.volume = volume;

    const handleError = () => {
      setMetadata("SIGNAL_LOST_404");
      setIsLoading(false);
      setIsPlaying(false);
    };

    audioRef.current.addEventListener('error', handleError);
    return () => audioRef.current.removeEventListener('error', handleError);
  }, []);

  const toggleRecord = () => {
    if (isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      if (!isPlaying) return alert("SIGNAL_REQUIRED: Start a stream to record.");
      try {
        const stream = audioRef.current.captureStream ? audioRef.current.captureStream() : audioRef.current.mozCaptureStream();
        mediaRecorderRef.current = new MediaRecorder(stream);
        chunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `PULSE_REC_${current?.name || 'SIGNAL'}.webm`;
          a.click();
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) { alert("SECURITY_BLOCKED: HTTPS or CORS required."); }
    }
  };

  // --- 3. PERSISTENCE & ACTIONS ---
  useEffect(() => {
    localStorage.setItem('pulse_v4_lib', JSON.stringify(folders));
    localStorage.setItem('pulse_favs', JSON.stringify(favorites));
  }, [folders, favorites]);

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n');
      const stations = [];
      let name = "";
      lines.forEach(l => {
        if (l.startsWith('#EXTINF:')) name = l.split(',')[1];
        else if (l.startsWith('http')) {
          stations.push({ id: Math.random().toString(36).substr(2, 9), name: name.trim() || 'NODE', url: l.trim() });
          name = "";
        }
      });
      setFolders([...folders, { id: Date.now().toString(), name: file.name.toUpperCase().replace('.M3U', ''), stations, listeners: Math.floor(Math.random() * 100) }]);
    };
    reader.readAsText(file);
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
        setMetadata("LIVE_SIGNAL");
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

  return (
    <div style={s.app}>
      <style>{`
        body { background: ${THEME.bg}; margin: 0; font-family: 'JetBrains Mono', monospace; color: white; overflow: hidden; }
        .row-item { border-bottom: 1px solid ${THEME.border}; display: flex; align-items: center; justify-content: space-between; padding: 14px 10px; cursor: pointer; transition: 0.2s; }
        .row-item:hover { background: ${THEME.surface}; }
        .trend-badge { font-size: 9px; color: ${THEME.accent}; border: 1px solid ${THEME.accent}; padding: 1px 5px; border-radius: 4px; display: flex; align-items: center; gap: 4px; }
        .del-btn { opacity: 0.3; transition: 0.2s; cursor: pointer; }
        .del-btn:hover { opacity: 1; color: ${THEME.danger}; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .loading { animation: spin 2s linear infinite; }
      `}</style>

      {/* SIDEBAR */}
      <aside style={s.side}>
        <div style={s.logo}><Zap size={16} fill={THEME.accent}/> PULSE_OS</div>
        <div style={{flex: 1, overflowY: 'auto'}}>
          <p style={s.label}>SAVED_NODES</p>
          <button onClick={() => setActiveFolder({id:'favs', name:'FAVORITES', stations: favorites})} style={{...s.navBtn, color: activeFolder?.id === 'favs' ? THEME.accent : THEME.textMuted}}>
            <Star size={14} fill={activeFolder?.id === 'favs' ? THEME.accent : 'none'}/> FAVORITES
          </button>
          
          <p style={{...s.label, marginTop: '30px'}}>SIGNAL_DIRECTORIES</p>
          {folders.map(f => (
            <div key={f.id} onClick={() => setActiveFolder(f)} style={{...s.trendItem, color: activeFolder?.id === f.id ? THEME.accent : THEME.textMuted}}>
              <div style={{display:'flex', alignItems:'center', gap:'10px'}}><Layers size={14}/> {f.name}</div>
              <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                <div className="trend-badge"><Activity size={8} /> {f.listeners}</div>
                <Trash2 size={12} className="del-btn" onClick={(e) => { e.stopPropagation(); setFolders(folders.filter(fol => fol.id !== f.id)); }}/>
              </div>
            </div>
          ))}
        </div>
        <label style={s.import}><Upload size={14}/> UPLOAD M3U <input type="file" hidden onChange={handleImport} accept=".m3u,.m3u8"/></label>
      </aside>

      {/* MAIN */}
      <main style={s.main}>
        {activeFolder ? (
          <div style={{padding: '40px'}}>
            <button onClick={() => setActiveFolder(null)} style={s.back}><ChevronLeft size={16}/> BACK_TO_ROOT</button>
            <div style={s.header}>
              <h1 style={s.title}>{activeFolder.name}</h1>
              <div style={s.search}><Search size={16}/><input placeholder="FILTER_SIGNAL..." onChange={e => setSearch(e.target.value)} style={s.input}/></div>
            </div>
            {activeFolder.stations.filter(st => st.name.toLowerCase().includes(search.toLowerCase())).map(st => (
              <div key={st.id} onClick={() => playStation(st)} className="row-item">
                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                  {current?.id === st.id && isPlaying ? <SignalHigh size={16} color={THEME.accent}/> : <Radio size={16} color={THEME.textMuted}/>}
                  <span style={{fontWeight: 600, color: current?.id === st.id ? THEME.accent : 'white'}}>{st.name}</span>
                </div>
                <Star size={14} onClick={(e) => { e.stopPropagation(); setFavorites(prev => prev.find(f => f.id === st.id) ? prev.filter(f => f.id !== st.id) : [...prev, st]); }} fill={favorites.find(f => f.id === st.id) ? THEME.accent : 'none'} color={THEME.textMuted} style={{cursor:'pointer'}}/>
              </div>
            ))}
          </div>
        ) : (
          <div style={s.empty}>
            <Orbit size={100} color={isPlaying ? THEME.accent : THEME.border} className={isLoading ? 'loading' : ''}/>
            <div style={{textAlign: 'center', marginTop: '30px'}}>
              <h1 style={{letterSpacing: '8px', fontWeight: 900}}>PULSE_OS</h1>
              <p style={{color: THEME.textMuted, fontSize: '0.6rem'}}>NEP_RADIO // M3U_ENGINE_V4</p>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer style={s.footer}>
        <div style={s.fLeft}>
          <div style={{fontSize: '0.6rem', color: isPlaying ? THEME.accent : THEME.textMuted, fontWeight: 800, display:'flex', alignItems:'center', gap:'5px'}}>
             <span style={{width:'6px', height:'6px', borderRadius:'50%', background: isPlaying ? THEME.accent : THEME.textMuted, boxShadow: isPlaying ? `0 0 8px ${THEME.accent}` : 'none'}}/>
             {isPlaying ? '● LIVE' : '○ IDLE'}
          </div>
          <div style={{fontWeight: 900, fontSize: '1.2rem'}}>{current ? current.name.toUpperCase() : 'SYSTEM_IDLE'}</div>
          <div style={{fontSize: '0.6rem', marginTop: '4px', fontWeight:700, color: metadata.includes('LOST') ? THEME.danger : (metadata.includes('LIVE') ? THEME.accent : THEME.textMuted)}}>
            {metadata}
          </div>
        </div>
        <div style={s.fCenter}>
          <div style={{display:'flex', alignItems:'center', gap:'25px'}}>
            <button onClick={() => current && playStation(current)} style={s.playBtn}>
              {isLoading ? <Orbit size={24} className="loading"/> : isPlaying ? <Pause size={24} fill="black"/> : <Play size={24} fill="black"/>}
            </button>
            <button onClick={toggleRecord} style={{...s.iconBtn, color: isRecording ? THEME.danger : THEME.textMuted}}>
              <Disc size={24} className={isRecording ? 'loading' : ''}/>
            </button>
          </div>
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
  side: { background: THEME.bg, borderRight: `1px solid ${THEME.border}`, padding: '30px', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  logo: { fontWeight: 900, fontSize: '0.9rem', letterSpacing: '3px', marginBottom: '40px', display:'flex', alignItems:'center', gap:'10px', color: THEME.accent },
  label: { fontSize: '0.6rem', color: THEME.textMuted, fontWeight: 800, marginBottom: '15px' },
  navBtn: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left', width: '100%' },
  trendItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' },
  import: { border: `1px dashed ${THEME.border}`, padding: '15px', textAlign: 'center', fontSize: '0.65rem', borderRadius: '4px', cursor: 'pointer', marginTop: 'auto', color: THEME.textMuted },
  main: { background: THEME.bg, overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  title: { fontSize: '3rem', fontWeight: 900, margin: 0, letterSpacing: '-3px' },
  back: { background: 'none', border: 'none', color: THEME.textMuted, fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', display:'flex', alignItems:'center', gap:'5px', marginBottom:'10px' },
  search: { background: THEME.bg, padding: '8px 15px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '10px', border: `1px solid ${THEME.border}` },
  input: { background: 'none', border: 'none', color: 'white', outline: 'none', fontSize: '0.75rem', width: '150px' },
  empty: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  footer: { gridColumn: '1 / 3', background: THEME.bg, borderTop: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', padding: '0 50px' },
  fLeft: { flex: 1 },
  fCenter: { flex: 1, display: 'flex', justifyContent: 'center' },
  playBtn: { width: '64px', height: '64px', borderRadius: '50%', background: THEME.accent, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  fRight: { flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: THEME.textMuted },
  volumeSlider: { width: '100px', accentColor: THEME.accent, cursor: 'pointer', opacity: 0.6 }
};