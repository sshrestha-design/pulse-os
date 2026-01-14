import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Radio, Volume2, Upload, ChevronLeft, Activity, Orbit, Search, Layers, Star, Disc, Share2, Zap, SignalHigh, Trash2, Menu, X } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const audioRef = useRef(new Audio());
  const hlsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // --- 1. PRELOAD ENGINE (Ensures folders appear on first load) ---
  useEffect(() => {
    const preloadM3UFiles = async () => {
      // Logic: Only preload if the library is empty
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

  // --- 2. AUDIO & SIGNAL STATUS HANDLING ---
  useEffect(() => {
    audioRef.current.crossOrigin = "anonymous";
    audioRef.current.volume = volume;

    const handleError = () => {
      setMetadata("SIGNAL_LOST_404");
      setIsLoading(false);
      setIsPlaying(false);
    };

    audioRef.current.addEventListener('error', handleError);

    // Deep Link Logic (Sharing)
    const params = new URLSearchParams(window.location.search);
    const sharedSignal = params.get('signal');
    if (sharedSignal) {
      try {
        const decoded = JSON.parse(atob(sharedSignal));
        setTimeout(() => playStation({ id: 'shared-' + Date.now(), ...decoded }), 1200);
      } catch (e) { console.error("DECODE_FAIL"); }
    }

    return () => audioRef.current.removeEventListener('error', handleError);
  }, []);

  // --- 3. RECORDER ENGINE ---
  const toggleRecord = () => {
    if (isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      if (!isPlaying) return alert("SIGNAL_REQUIRED: Connect to a stream first.");
      try {
        const stream = audioRef.current.captureStream ? audioRef.current.captureStream() : audioRef.current.mozCaptureStream();
        mediaRecorderRef.current = new MediaRecorder(stream);
        chunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `PULSE_REC_${current?.name || 'SIGNAL'}.webm`; a.click();
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) { alert("SECURITY_BLOCKED: HTTPS or CORS required."); }
    }
  };

  // --- 4. PERSISTENCE & SIMULATED DATA ---
  useEffect(() => {
    localStorage.setItem('pulse_v4_lib', JSON.stringify(folders));
    localStorage.setItem('pulse_favs', JSON.stringify(favorites));
  }, [folders, favorites]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFolders(prev => prev.map(f => ({
        ...f,
        listeners: Math.max(10, f.listeners + (Math.random() > 0.5 ? 2 : -2))
      })));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // --- ACTIONS ---
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
    if (window.innerWidth < 768) setIsMobileMenuOpen(false);
  };

  const shareStation = () => {
    if (!current) return;
    const encoded = btoa(JSON.stringify({ name: current.name, url: current.url }));
    const shareUrl = `${window.location.origin}${window.location.pathname}?signal=${encoded}`;
    navigator.clipboard.writeText(shareUrl);
    alert("SIGNAL_LINK_COPIED");
  };

  return (
    <div className="app-container">
      <style>{`
        :root { --sidebar-width: 280px; --footer-height: 120px; }
        body { background: ${THEME.bg}; margin: 0; font-family: 'JetBrains Mono', monospace; color: white; overflow: hidden; }
        
        .app-container { 
          height: 100vh; 
          display: grid; 
          grid-template-columns: var(--sidebar-width) 1fr; 
          grid-template-rows: 1fr var(--footer-height); 
        }

        /* RESPONSIVE BREAKPOINTS */
        @media (max-width: 768px) {
          .app-container { 
            grid-template-columns: 1fr; 
            grid-template-rows: 60px 1fr 140px; 
          }
          .sidebar { 
            position: fixed; top: 0; left: 0; bottom: 0; z-index: 100;
            width: 80% !important; transform: translateX(-100%); 
            transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: ${THEME.bg}; 
            box-shadow: 20px 0 50px rgba(0,0,0,0.8);
          }
          .sidebar.open { transform: translateX(0); }
          .mobile-header { display: flex !important; }
          .footer { padding: 0 20px !important; flex-direction: column; justify-content: center; gap: 8px; }
          .f-right { display: none !important; }
          .f-left { text-align: center; }
          .main-title { font-size: 2.2rem !important; }
          .f-center { transform: scale(0.9); }
        }

        .mobile-header { 
          display: none; height: 60px; border-bottom: 1px solid ${THEME.border}; 
          align-items: center; padding: 0 20px; justify-content: space-between; background: ${THEME.bg};
        }

        .sidebar { border-right: 1px solid ${THEME.border}; padding: 30px; display: flex; flex-direction: column; overflow-y: auto; }
        .main-content { overflow-y: auto; background: ${THEME.bg}; }
        
        .row-item { border-bottom: 1px solid ${THEME.border}; display: flex; align-items: center; justify-content: space-between; padding: 14px 10px; cursor: pointer; transition: 0.2s; }
        .row-item:hover { background: ${THEME.surface}; }
        
        .trend-badge { font-size: 9px; color: ${THEME.accent}; border: 1px solid ${THEME.accent}; padding: 1px 5px; border-radius: 4px; display: flex; align-items: center; gap: 4px; }
        .del-btn { opacity: 0.3; transition: 0.2s; cursor: pointer; }
        .del-btn:hover { opacity: 1; color: ${THEME.danger}; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .loading { animation: spin 2s linear infinite; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${THEME.border}; }
      `}</style>

      {/* MOBILE TOP BAR */}
      <header className="mobile-header">
        <button onClick={() => setIsMobileMenuOpen(true)} style={s.iconBtn}><Menu /></button>
        <div style={{color: THEME.accent, fontWeight: 900, letterSpacing: 2}}>PULSE_OS</div>
        <div style={{width: 24}} />
      </header>

      {/* SIDEBAR */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 40}}>
           <div style={s.logo}><Zap size={16} fill={THEME.accent}/> PULSE_OS</div>
           {isMobileMenuOpen && <button onClick={() => setIsMobileMenuOpen(false)} style={s.iconBtn}><X /></button>}
        </div>
        
        <div style={{flex: 1}}>
          <p style={s.label}>SAVED_NODES</p>
          <button onClick={() => {setActiveFolder({id:'favs', name:'FAVORITES', stations: favorites}); setIsMobileMenuOpen(false);}} style={{...s.navBtn, color: activeFolder?.id === 'favs' ? THEME.accent : THEME.textMuted}}>
            <Star size={14} fill={activeFolder?.id === 'favs' ? THEME.accent : 'none'}/> FAVORITES
          </button>

          <p style={{...s.label, marginTop: 30}}>SIGNAL_DIRECTORIES</p>
          {folders.map(f => (
            <div key={f.id} onClick={() => {setActiveFolder(f); setIsMobileMenuOpen(false);}} style={{...s.trendItem, color: activeFolder?.id === f.id ? THEME.accent : THEME.textMuted}}>
              <div style={{display:'flex', alignItems:'center', gap:10}}><Layers size={14}/> {f.name}</div>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <div className="trend-badge"><Activity size={8} /> {f.listeners}</div>
                <Trash2 size={12} className="del-btn" onClick={(e) => { e.stopPropagation(); setFolders(folders.filter(fol => fol.id !== f.id)); }}/>
              </div>
            </div>
          ))}
        </div>
        <label style={s.import}><Upload size={14}/> UPLOAD M3U <input type="file" hidden onChange={handleImport} accept=".m3u,.m3u8"/></label>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {activeFolder ? (
          <div style={{padding: 'clamp(20px, 5vw, 40px)'}}>
            <button onClick={() => setActiveFolder(null)} style={s.back}><ChevronLeft size={16}/> BACK_TO_ROOT</button>
            <div style={s.header}>
              <h1 className="main-title" style={s.title}>{activeFolder.name}</h1>
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
              <h1 style={{letterSpacing: '8px', fontWeight: 900, fontSize: '2rem'}}>PULSE_OS</h1>
              <p style={{color: THEME.textMuted, fontSize: '0.6rem', letterSpacing: 2}}>NEP_RADIO // M3U_ENGINE_V4</p>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="footer" style={s.footer}>
        <div className="f-left" style={s.fLeft}>
          <div style={{fontSize: '0.6rem', color: isPlaying ? THEME.accent : THEME.textMuted, fontWeight: 800, display:'flex', alignItems:'center', gap:'5px'}}>
             <span style={{width:'6px', height:'6px', borderRadius:'50%', background: isPlaying ? THEME.accent : THEME.textMuted, boxShadow: isPlaying ? `0 0 8px ${THEME.accent}` : 'none'}}/>
             {isPlaying ? '● LIVE' : '○ IDLE'}
          </div>
          <div style={{fontWeight: 900, fontSize: 'clamp(1rem, 4vw, 1.2rem)'}}>{current ? current.name.toUpperCase() : 'SYSTEM_IDLE'}</div>
          <div style={{fontSize: '0.6rem', marginTop: '4px', fontWeight:700, color: metadata.includes('LOST') ? THEME.danger : (metadata.includes('LIVE') ? THEME.accent : THEME.textMuted)}}>
            {metadata}
          </div>
        </div>

        <div className="f-center" style={s.fCenter}>
          <div style={{display:'flex', alignItems:'center', gap:'25px'}}>
            <button onClick={shareStation} style={s.iconBtn}><Share2 size={24}/></button>
            <button onClick={() => current && playStation(current)} style={s.playBtn}>
              {isLoading ? <Orbit size={24} className="loading"/> : isPlaying ? <Pause size={24} fill="black"/> : <Play size={24} fill="black"/>}
            </button>
            <button onClick={toggleRecord} style={{...s.iconBtn, color: isRecording ? THEME.danger : THEME.textMuted}}>
              <Disc size={24} className={isRecording ? 'loading' : ''}/>
            </button>
          </div>
        </div>

        <div className="f-right" style={s.fRight}>
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
  logo: { fontWeight: 900, fontSize: '0.9rem', letterSpacing: '3px', display:'flex', alignItems:'center', gap:'10px', color: THEME.accent },
  label: { fontSize: '0.6rem', color: THEME.textMuted, fontWeight: 800, marginBottom: '15px' },
  navBtn: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left', width: '100%' },
  trendItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' },
  import: { border: `1px dashed ${THEME.border}`, padding: '15px', textAlign: 'center', fontSize: '0.65rem', borderRadius: '4px', cursor: 'pointer', marginTop: 'auto', color: THEME.textMuted },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '30px' },
  title: { fontSize: '3rem', fontWeight: 900, margin: 0, letterSpacing: '-3px' },
  back: { background: 'none', border: 'none', color: THEME.textMuted, fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', display:'flex', alignItems:'center', gap:'5px', marginBottom:'10px' },
  search: { background: THEME.bg, padding: '8px 15px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '10px', border: `1px solid ${THEME.border}`, flex: 1, maxWidth: '300px' },
  input: { background: 'none', border: 'none', color: 'white', outline: 'none', fontSize: '0.75rem', width: '100%' },
  empty: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  fLeft: { flex: 1 },
  fCenter: { flex: 1, display: 'flex', justifyContent: 'center' },
  fRight: { flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px' },
  playBtn: { width: '64px', height: '64px', borderRadius: '50%', background: THEME.accent, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: THEME.textMuted },
  volumeSlider: { width: '100px', accentColor: THEME.accent, cursor: 'pointer', opacity: 0.6 }
};