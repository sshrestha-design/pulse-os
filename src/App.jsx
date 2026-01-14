import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Radio, Volume2, Upload, ChevronLeft, Activity, Orbit, Search, Layers, Star, Disc, Share2, Zap, SignalHigh, Trash2 } from 'lucide-react';
import Hls from 'hls.js';

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
    const data = saved ? JSON.parse(saved) : [{ id: 'core-1', name: 'SYSTEM_CORE', stations: [], count: 0 }];
    return data.map(f => ({ ...f, listeners: f.listeners || Math.floor(Math.random() * 500) + 50 }));
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

  const audioRef = useRef(new Audio());
  const hlsRef = useRef(null);

  // --- PERSISTENCE & SYNC ---
  useEffect(() => {
    localStorage.setItem('pulse_v4_lib', JSON.stringify(folders));
    localStorage.setItem('pulse_favs', JSON.stringify(favorites));
  }, [folders, favorites]);

  useEffect(() => {
    audioRef.current.crossOrigin = "anonymous";
    audioRef.current.volume = volume;

    const params = new URLSearchParams(window.location.search);
    const sharedSignal = params.get('signal');
    if (sharedSignal) {
      try {
        const decoded = JSON.parse(atob(sharedSignal));
        setTimeout(() => playStation({ id: 'uplink-' + Date.now(), ...decoded }), 1200);
      } catch (e) { console.error("DECODE_ERROR"); }
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFolders(prev => prev.map(f => ({
        ...f,
        listeners: Math.max(10, f.listeners + (Math.random() > 0.5 ? 2 : -2))
      })));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { audioRef.current.volume = volume; }, [volume]);

  // --- LIBRARY ACTIONS ---
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
      setFolders([...folders, { 
        id: Date.now().toString(), 
        name: file.name.toUpperCase().replace('.M3U', ''), 
        stations, 
        listeners: Math.floor(Math.random() * 100) 
      }]);
    };
    reader.readAsText(file);
  };

  const deleteFolder = (id, e) => {
    e.stopPropagation();
    if (id === 'core-1') return;
    if (window.confirm("TERMINATE_DIRECTORY?")) {
      setFolders(prev => prev.filter(f => f.id !== id));
      if (activeFolder?.id === id) setActiveFolder(null);
    }
  };

  const deleteStation = (stationId, e) => {
    e.stopPropagation();
    setFolders(prev => prev.map(f => {
      if (f.id === activeFolder.id) {
        const updated = f.stations.filter(st => st.id !== stationId);
        setActiveFolder({...f, stations: updated});
        return { ...f, stations: updated };
      }
      return f;
    }));
  };

  // --- PLAYBACK ENGINE ---
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
      audioRef.current.play().then(() => { setIsPlaying(true); setIsLoading(false); }).catch(() => setIsLoading(false));
    };

    if (station.url.includes('m3u8') && Hls.isSupported()) {
      hlsRef.current = new Hls();
      hlsRef.current.loadSource(station.url);
      hlsRef.current.attachMedia(audioRef.current);
      hlsRef.current.on(Hls.Events.FRAG_CHANGED, (_, d) => setMetadata(d.frag.title?.toUpperCase() || "LIVE_SIGNAL"));
      hlsRef.current.on(Hls.Events.MANIFEST_PARSED, onReady);
    } else {
      audioRef.current.src = station.url;
      setMetadata("LIVE_SIGNAL");
      onReady();
    }
    setCurrent(station);
  };

  const shareStation = async () => {
    if (!current) return;
    const encoded = btoa(JSON.stringify({ name: current.name, url: current.url }));
    const shareUrl = `${window.location.origin}${window.location.pathname}?signal=${encoded}`;
    if (navigator.share) await navigator.share({ title: 'PulseOS', url: shareUrl });
    else { navigator.clipboard.writeText(shareUrl); alert("LINK_COPIED"); }
  };

  return (
    <div style={s.app}>
      <style>{`
        body { background: ${THEME.bg}; margin: 0; font-family: 'Inter', sans-serif; color: white; overflow: hidden; }
        .row-item { border-bottom: 1px solid ${THEME.border}; display: flex; align-items: center; justify-content: space-between; padding: 14px 10px; cursor: pointer; transition: 0.2s; }
        .row-item:hover { background: ${THEME.surface}; }
        .trend-badge { font-size: 9px; color: ${THEME.accent}; border: 1px solid ${THEME.accent}; padding: 1px 5px; border-radius: 4px; display: flex; align-items: center; gap: 4px; }
        .del-btn { opacity: 0.3; transition: 0.2s; }
        .del-btn:hover { opacity: 1; color: ${THEME.danger}; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .loading { animation: spin 1s linear infinite; }
      `}</style>

      {/* SIDEBAR */}
      <aside style={s.side}>
        <div style={s.logo}><Zap size={16} fill={THEME.accent}/> PULSE_OS</div>
        <div style={{flex: 1, overflowY: 'auto'}}>
          <p style={s.label}>SAVED</p>
          <button onClick={() => setActiveFolder({id:'favs', name:'FAVORITES', stations: favorites})} style={{...s.navBtn, color: activeFolder?.id === 'favs' ? THEME.accent : THEME.textMuted}}>
            <Star size={14} fill={activeFolder?.id === 'favs' ? THEME.accent : 'none'}/> FAVS
          </button>
          
          <p style={{...s.label, marginTop: '30px'}}>TRENDING_NODES</p>
          {[...folders].sort((a,b)=>b.listeners-a.listeners).map(f => (
            <div key={f.id} onClick={() => setActiveFolder(f)} style={{...s.trendItem, color: activeFolder?.id === f.id ? THEME.accent : THEME.textMuted}}>
              <div style={{display:'flex', alignItems:'center', gap:'10px', overflow:'hidden'}}><Layers size={14} style={{flexShrink:0}}/> <span style={{whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden'}}>{f.name}</span></div>
              <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                <div className="trend-badge">{f.listeners}</div>
                {f.id !== 'core-1' && <Trash2 size={12} className="del-btn" onClick={(e) => deleteFolder(f.id, e)}/>}
              </div>
            </div>
          ))}
        </div>
        <label style={s.import}><Upload size={14}/> IMPORT_M3U <input type="file" hidden onChange={handleImport} accept=".m3u,.m3u8"/></label>
      </aside>

      {/* MAIN */}
      <main style={s.main}>
        {activeFolder ? (
          <div style={{padding: '40px'}}>
            <button onClick={() => setActiveFolder(null)} style={s.back}><ChevronLeft size={16}/> ROOT</button>
            <div style={s.header}>
              <h1 style={s.title}>{activeFolder.name}</h1>
              <div style={s.search}><Search size={16}/><input placeholder="FILTER..." onChange={e => setSearch(e.target.value)} style={s.input}/></div>
            </div>
            {activeFolder.stations.filter(st => st.name.toLowerCase().includes(search.toLowerCase())).map(st => (
              <div key={st.id} onClick={() => playStation(st)} className="row-item">
                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                  {current?.id === st.id && isPlaying ? <SignalHigh size={16} color={THEME.accent}/> : <Radio size={16} color={THEME.textMuted}/>}
                  <span style={{fontWeight: 600, color: current?.id === st.id ? THEME.accent : 'white'}}>{st.name}</span>
                </div>
                <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                   <Star size={14} onClick={(e) => { e.stopPropagation(); setFavorites(prev => prev.find(f => f.id === st.id) ? prev.filter(f => f.id !== st.id) : [...prev, st]); }} fill={favorites.find(f => f.id === st.id) ? THEME.accent : 'none'} color={THEME.textMuted}/>
                   <Trash2 size={14} className="del-btn" onClick={(e) => deleteStation(st.id, e)}/>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={s.empty}>
            <Orbit size={80} color={isPlaying ? THEME.accent : THEME.border} className={isLoading ? 'loading' : ''}/>
            <p style={{color: THEME.textMuted, marginTop: '20px', fontSize: '0.6rem', letterSpacing: '2px'}}>AWAITING_UPLINK</p>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer style={s.footer}>
        <div style={s.fLeft}>
          <div style={{fontSize: '0.6rem', color: THEME.accent, fontWeight: 800}}>{isPlaying ? '● LIVE' : '○ IDLE'}</div>
          <div style={{fontWeight: 900, fontSize: '1.2rem'}}>{current ? current.name : 'SYSTEM_IDLE'}</div>
          <div style={{fontSize: '0.6rem', color: THEME.textMuted, marginTop: '4px'}}>{metadata}</div>
        </div>
        <div style={s.fCenter}>
          <div style={{display:'flex', alignItems:'center', gap:'25px'}}>
            <button onClick={shareStation} style={s.iconBtn}><Share2 size={24}/></button>
            <button onClick={() => current && playStation(current)} style={s.playBtn}>
              {isLoading ? <Orbit size={24} className="loading"/> : isPlaying ? <Pause size={24} fill="black"/> : <Play size={24} fill="black"/>}
            </button>
            <button style={s.iconBtn}><Disc size={24}/></button>
          </div>
        </div>
        <div style={s.fRight}>
          <Volume2 size={16} color={THEME.textMuted}/>
          <input type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} style={{width: '100px', accentColor: THEME.accent}}/>
        </div>
      </footer>
    </div>
  );
}

const s = {
  app: { height: '100vh', display: 'grid', gridTemplateColumns: '220px 1fr', gridTemplateRows: '1fr 110px' },
  side: { background: THEME.bg, borderRight: `1px solid ${THEME.border}`, padding: '25px', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  logo: { fontWeight: 900, fontSize: '0.8rem', letterSpacing: '2px', marginBottom: '40px', display:'flex', alignItems:'center', gap:'8px' },
  label: { fontSize: '0.6rem', color: THEME.textMuted, fontWeight: 800, marginBottom: '15px' },
  navBtn: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left', width: '100%', color: THEME.textMuted },
  trendItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' },
  import: { border: `1px dashed ${THEME.border}`, padding: '12px', textAlign: 'center', fontSize: '0.65rem', borderRadius: '4px', cursor: 'pointer', marginTop: 'auto', color: THEME.textMuted },
  main: { background: THEME.bg, overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  title: { fontSize: '2.5rem', fontWeight: 900, margin: 0, letterSpacing: '-2px' },
  back: { background: 'none', border: 'none', color: THEME.textMuted, fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', display:'flex', alignItems:'center', gap:'5px', marginBottom:'10px' },
  search: { background: THEME.surface, padding: '8px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '10px', border: `1px solid ${THEME.border}` },
  input: { background: 'none', border: 'none', color: 'white', outline: 'none', fontSize: '0.8rem' },
  empty: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  footer: { gridColumn: '1 / 3', background: THEME.bg, borderTop: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', padding: '0 40px' },
  fLeft: { flex: 1 },
  fCenter: { flex: 1, display: 'flex', justifyContent: 'center' },
  playBtn: { width: '60px', height: '60px', borderRadius: '50%', background: THEME.accent, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  fRight: { flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: THEME.textMuted }
};