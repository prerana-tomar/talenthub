import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Video, Play, UploadCloud, Film, Download, Share2, Scissors, Check, Sparkles, RefreshCw } from 'lucide-react';
import API from '../config';
import './HighlightStudio.css';

const VIBES = ['Epic', 'High Energy', 'Emotional', 'Comedy'];
const REEL_COUNTS = [1, 2, 3, 5];
const DURATIONS = [15, 30, 60];

const LOADING_STEPS = [
  { name: 'Uploading Performance', detail: 'Saving video file to server uploads...' },
  { name: 'AI Performance Analysis', detail: 'Gemini is scanning for emotional peaks & energy changes...' },
  { name: 'Generating Highlight Clips', detail: 'Creating custom video bounds and scorecards...' }
];

const HighlightStudio = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [masterVideoUrl, setMasterVideoUrl] = useState('');
  const [serverVideoPath, setServerVideoPath] = useState('');
  const [duration, setDuration] = useState(0);
  const [config, setConfig] = useState({ vibe: 'Epic', reelCount: 1, clipDuration: 15, instructions: '' });
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isReslicing, setIsReslicing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');
  const [reels, setReels] = useState([]);
  const [activeReel, setActiveReel] = useState(null);
  const [isPlayingHighlight, setIsPlayingHighlight] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    return () => {
      if (videoUrl && videoUrl.startsWith('blob:')) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  useEffect(() => {
    let interval;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev < 2 ? prev + 1 : prev));
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const processVideoFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) { setError('Sirf video files (.mp4, .mov, .webm) allowed hain!'); return; }
    if (file.size > 500 * 1024 * 1024) { setError('File size 500MB se zyada nahi honi chahiye!'); return; }
    setReels([]); setActiveReel(null); setIsPlayingHighlight(false);
    setError(''); setServerVideoPath('');
    setVideoFile(file);
    const localUrl = URL.createObjectURL(file);
    setVideoUrl(localUrl); setMasterVideoUrl(localUrl);
    const tempVideo = document.createElement('video');
    tempVideo.src = localUrl;
    tempVideo.onloadedmetadata = () => setDuration(Math.floor(tempVideo.duration));
  };

  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = ()    => setIsDragging(false);
  const handleDrop      = (e)   => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) processVideoFile(file); };
  const handleFileChange = (e)  => { const file = e.target.files?.[0]; if (file) processVideoFile(file); };
  const triggerFileSelect = ()  => fileInputRef.current?.click();

  const handleGenerate = () => {
    if (!videoFile) { setError('Kripya pehle ek video select karein!'); return; }
    const token = localStorage.getItem('th_token');
    if (!token) { setError('Please login first!'); navigate('/login'); return; }
    setLoading(true); setLoadingStep(0); setError('');
    setReels([]); setActiveReel(null); setIsPlayingHighlight(false);
    setIsUploading(true); setUploadProgress(0);

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('duration', duration);
    formData.append('reelCount', config.reelCount);
    formData.append('options', JSON.stringify({ vibe: config.vibe, clipDuration: config.clipDuration, instructions: config.instructions.trim() }));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API}/api/highlights/generate`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      setIsUploading(false); setUploadProgress(100);
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) {
          setReels(data.reels || []);
          if (data.videoPath) {
            setServerVideoPath(data.videoPath);
            const fullServerUrl = `${API}/uploads/highlights/${data.videoPath}`;
            setVideoUrl(fullServerUrl); setMasterVideoUrl(fullServerUrl);
          }
        } else { setError(data.error || 'Failed to generate highlights.'); }
      } catch { setError('Server response parsing error.'); }
      finally { setLoading(false); }
    };
    xhr.onerror = () => { setIsUploading(false); setError('Network error.'); setLoading(false); };
    xhr.send(formData);
  };

  const playReel = (reel) => {
    setActiveReel(reel); setIsPlayingHighlight(true);
    if (videoRef.current) { videoRef.current.currentTime = reel.startTime; videoRef.current.play(); }
    setTrimStart(reel.startTime); setTrimEnd(reel.endTime);
  };

  const stopClip = () => {
    setIsPlayingHighlight(false); setActiveReel(null);
    if (videoRef.current) videoRef.current.pause();
  };

  const handleReslice = async () => {
    if (!activeReel || !serverVideoPath) return;
    setIsReslicing(true); setError('');
    const token = localStorage.getItem('th_token');
    try {
      const res = await fetch(`${API}/api/highlights/reslice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ videoPath: serverVideoPath, startTime: trimStart, endTime: trimEnd, reelId: activeReel.id })
      });
      const data = await res.json();
      if (res.ok) {
        setReels(prev => prev.map(r => r.id === activeReel.id
          ? { ...r, startTime: trimStart, endTime: trimEnd, timeRange: `${formatSec(trimStart)} - ${formatSec(trimEnd)}`, score: data.newScore || r.score, reason: data.newReason || r.reason }
          : r
        ));
        const updatedReel = { ...activeReel, startTime: trimStart, endTime: trimEnd, timeRange: `${formatSec(trimStart)} - ${formatSec(trimEnd)}` };
        setActiveReel(updatedReel); playReel(updatedReel);
        alert('Clip trimmed & regenerated successfully!');
      } else { setError(data.error || 'Failed to reslice.'); }
    } catch { setError('Connection error.'); }
    finally { setIsReslicing(false); }
  };

  const handleShare = () => {
    if (!serverVideoPath) return;
    const shareUrl = `${window.location.origin}/video-player?src=${encodeURIComponent(videoUrl)}`;
    navigator.clipboard.writeText(shareUrl).then(() => alert('Link copied!')).catch(() => alert('Failed to copy.'));
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = activeReel ? `${activeReel.title.replace(/\s+/g, '_')}.mp4` : 'highlight.mp4';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const formatSec = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms   = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="hs-page">

      {/* ── COMPACT ANIMATED HERO ── */}
      <div className={`hs-hero ${heroVisible ? 'visible' : ''}`}>
        <div className="hs-hero-left">
          <div className="hs-hero-badge">
            <Cpu size={12} /> AI Highlight Studio
          </div>
          <h1 className="hs-hero-title">
            Generate <span>AI Highlights</span>
          </h1>
          <p className="hs-hero-sub">
            Let Gemini scan your video to auto-extract high-energy highlights and epic reactions.
          </p>
        </div>
        <div className="hs-hero-icon">
          <Cpu size={26} className="hs-spin-animation" />
        </div>
      </div>

      <div className="hs-body">
        {/* LEFT PANEL */}
        <div className="hs-left th-premium-card-redesign" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" style={{ display: 'none' }} />

          <div
            className={`hs-upload-zone ${isDragging ? 'hs-upload-zone--dragging' : ''}`}
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            onClick={triggerFileSelect} style={{ borderStyle: 'dashed' }}
          >
            <div style={{ display: 'inline-flex', background: 'rgba(139,92,246,0.08)', padding: 12, borderRadius: '50%', marginBottom: 10, color: '#8b5cf6' }}>
              <UploadCloud size={24} />
            </div>
            {videoFile ? (
              <div>
                <strong>Video Selected</strong>
                <p style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }}>{videoFile.name}</p>
              </div>
            ) : (
              <div><strong>Drop Video Here</strong><p>or Click to Browse file</p></div>
            )}
          </div>

          <div className="hs-section">
            <span className="hs-section-title">Select Performance Vibe</span>
            <div className="hs-btn-group">
              {VIBES.map(v => (
                <button key={v} type="button" className={`hs-option-btn ${config.vibe === v ? 'active' : ''}`} onClick={() => setConfig(prev => ({ ...prev, vibe: v }))}>{v}</button>
              ))}
            </div>
          </div>

          <div className="hs-section">
            <span className="hs-section-title">Number of Reels</span>
            <div className="hs-btn-group">
              {REEL_COUNTS.map(count => (
                <button key={count} type="button" className={`hs-option-btn ${config.reelCount === count ? 'active' : ''}`} onClick={() => setConfig(prev => ({ ...prev, reelCount: count }))}>{count} Reel{count !== 1 ? 's' : ''}</button>
              ))}
            </div>
          </div>

          <div className="hs-section">
            <span className="hs-section-title">Target Duration</span>
            <div className="hs-btn-group">
              {DURATIONS.map(d => (
                <button key={d} type="button" className={`hs-option-btn ${config.clipDuration === d ? 'active' : ''}`} onClick={() => setConfig(prev => ({ ...prev, clipDuration: d }))}>{d}s Clips</button>
              ))}
            </div>
          </div>

          <div className="hs-section">
            <span className="hs-section-title">Special Instructions (Optional)</span>
            <textarea
              style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '13px', resize: 'none', fontFamily: 'inherit' }}
              rows="3"
              placeholder="Jaise: 'Dance floor drop highlights do', 'Only fast beats'..."
              value={config.instructions}
              onChange={e => setConfig(prev => ({ ...prev, instructions: e.target.value }))}
            />
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: '13px', display: 'flex', gap: 4, alignItems: 'center' }}>⚠️ {error}</div>}

          <button type="button" className="hs-generate-btn" disabled={loading || !videoFile} onClick={handleGenerate}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <RefreshCw size={14} className="hs-spin-animation" /> Processing...
              </span>
            ) : '✨ Generate AI Highlights'}
          </button>
        </div>

        {/* RIGHT PANEL */}
        <div className="hs-right">
          {loading ? (
            <div className="hs-analysis th-premium-card-redesign" style={{ padding: '24px' }}>
              <span className="hs-section-title" style={{ marginBottom: 16, display: 'block' }}>AI HIGHLIGHT GENERATION STEPS</span>
              {LOADING_STEPS.map((step, idx) => {
                let status = 'wait';
                let stepPercent = 0;
                if (idx === 0) {
                  if (isUploading) { status = 'active'; stepPercent = uploadProgress; }
                  else if (uploadProgress === 100) { status = 'done'; stepPercent = 100; }
                } else if (idx === 1) {
                  if (!isUploading && loadingStep === 1) { status = 'active'; stepPercent = 50; }
                  else if (loadingStep > 1) { status = 'done'; stepPercent = 100; }
                } else if (idx === 2) {
                  if (!isUploading && loadingStep === 2) { status = 'active'; stepPercent = 75; }
                  else if (loadingStep > 2) { status = 'done'; stepPercent = 100; }
                }
                return (
                  <div key={idx} className={`hs-step ${status === 'active' ? 'hs-step--active' : ''} ${status === 'done' ? 'hs-step--done' : ''}`}>
                    <div className="hs-step-icon">{status === 'done' ? <Check size={14} /> : idx + 1}</div>
                    <div className="hs-step-info">
                      <div className="hs-step-name" style={{ fontWeight: 600 }}>{step.name}{status === 'active' && idx === 0 && ` (${uploadProgress}%)`}</div>
                      <div className="hs-step-detail">{step.detail}</div>
                      <div className="hs-progress">
                        <div className="hs-progress-fill" style={{ width: `${stepPercent}%`, transition: 'width 0.2s ease', background: 'linear-gradient(90deg, #7c3aed, #ec4899)' }} />
                      </div>
                    </div>
                    <span className={`hs-step-status hs-step-status--${status}`} style={{ fontSize: 11, fontWeight: 600 }}>
                      {status === 'done' ? 'Completed' : status === 'active' ? 'Processing' : 'Pending'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : reels.length > 0 ? (
            <>
              <div className="hs-video-preview th-premium-card-redesign">
                <video ref={videoRef} src={videoUrl} className="hs-video" controls style={{ maxHeight: '420px', width: '100%', objectFit: 'contain', display: 'block' }} />
                {isPlayingHighlight && activeReel && (
                  <div className="hs-now-playing" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(124,58,237,0.1)' }}>
                    <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Film size={14} color="#a78bfa" /> Playing: <strong>{activeReel.title}</strong> ({activeReel.timeRange})</span>
                    <button type="button" className="hs-stop-btn" onClick={stopClip}>Stop Clip</button>
                  </div>
                )}
              </div>

              <div className="hs-reels">
                <span className="hs-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Sparkles size={14} color="#ec4899" /> Generated AI Reels <span className="hs-reels-hint">(Click to play)</span>
                </span>
                <div className="hs-reels-grid">
                  {reels.map(r => (
                    <div key={r.id} className={`hs-reel-card th-premium-card-redesign ${activeReel?.id === r.id ? 'hs-reel-card--active' : ''}`} onClick={() => playReel(r)}>
                      <div className="hs-reel-thumb" style={{ background: r.gradient }}>
                        <span className="hs-score-badge">⭐ {r.score}% Vibe</span>
                        <span className="hs-reel-dur-badge">{r.endTime - r.startTime}s</span>
                        <div className="hs-play-overlay"><span className="hs-play-btn"><Play size={14} fill="#fff" /></span></div>
                      </div>
                      <div className="hs-reel-info">
                        <div className="hs-reel-title">{r.title}</div>
                        <div className="hs-reel-meta">{r.timeRange}</div>
                        <p style={{ fontSize: '11px', color: '#8b859e', margin: '4px 0 0', lineHeight: 1.4 }}>{r.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {activeReel && (
                <div className="hs-trim-editor th-premium-card-redesign" style={{ padding: 20, marginBottom: 20 }}>
                  <div className="hs-trim-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}><Scissors size={14} /> Adjust Trim: "{activeReel.title}"</div>
                  <div className="hs-trim-slider-row">
                    <div className="hs-trim-slider-wrap">
                      <label>Start: </label>
                      <input type="range" min="0" max={duration} step="0.5" value={trimStart} onChange={e => setTrimStart(parseFloat(e.target.value))} />
                      <span>{formatSec(trimStart)}</span>
                    </div>
                    <div className="hs-trim-slider-wrap">
                      <label>End: </label>
                      <input type="range" min="0" max={duration} step="0.5" value={trimEnd} onChange={e => setTrimEnd(parseFloat(e.target.value))} />
                      <span>{formatSec(trimEnd)}</span>
                    </div>
                  </div>
                  <div className="hs-trim-actions">
                    <button type="button" className="hs-trim-btn hs-trim-btn--cancel" onClick={() => { setTrimStart(activeReel.startTime); setTrimEnd(activeReel.endTime); }}>Reset</button>
                    <button type="button" className="hs-trim-btn hs-trim-btn--primary" disabled={isReslicing || trimStart >= trimEnd} onClick={handleReslice} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isReslicing ? <RefreshCw size={12} className="hs-spin-animation" /> : <Check size={12} />}
                      {isReslicing ? 'Re-cutting...' : 'Regenerate Clip'}
                    </button>
                  </div>
                </div>
              )}

              <div className="hs-export-bar" style={{ gap: '10px', flexWrap: 'wrap' }}>
                <button type="button" className="hs-exp-btn" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={handleShare}><Share2 size={14} /> Share Link</button>
                <button type="button" className="hs-exp-btn" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={handleDownload}><Download size={14} /> Download Active</button>
              </div>
            </>
          ) : (
            <div className="hs-video-preview th-premium-card-redesign" style={{ border: 'none', background: 'transparent' }}>
              {videoUrl ? (
                <video src={videoUrl} className="hs-video" controls style={{ maxHeight: '420px', width: '100%', objectFit: 'contain', borderRadius: 16, display: 'block' }} />
              ) : (
                <div className="th-empty-state-illustrated" style={{ margin: 0, maxWidth: 'none' }}>
                  <div className="th-empty-state-icon-wrapper" style={{ background: 'rgba(139,92,246,0.08)', color: '#8B5CF6' }}>
                    <Video size={32} />
                  </div>
                  <h3>No Video Loaded</h3>
                  <p>Choose or drop a performance video in the left panel to analyze and generate AI highlight clips.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HighlightStudio;