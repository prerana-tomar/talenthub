import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Cpu, Video, Play, Pause, UploadCloud, Film, Download, 
  Scissors, Sparkles, RefreshCw, Trash2, Plus, Image, 
  Sliders, AlertTriangle, FileVideo, RotateCcw 
} from 'lucide-react';
import API from '../config';
import './HighlightStudio.css';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

const PRESET_VIBES = [
  { name: 'Epic', color: '#7c3aed' },
  { name: 'Emotional', color: '#3b82f6' },
  { name: 'Funny', color: '#f97316' },
  { name: 'High Energy', color: '#f43f5e' },
  { name: 'Comedy', color: '#f59e0b' }
];

export default function HighlightStudio() {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const ffmpegRef = useRef(null);

  // FFmpeg related states
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [ffmpegError, setFfmpegError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);

  // Video details states
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoName, setVideoName] = useState('');
  const [videoSize, setVideoSize] = useState('');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Manual trim tool states
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  // Thumbnail states
  const [capturedThumbnail, setCapturedThumbnail] = useState('');

  // Highlight Moments states
  const [highlights, setHighlights] = useState([]);
  const [activeHighlightId, setActiveHighlightId] = useState(null);
  const [newHighlightLabel, setNewHighlightLabel] = useState('Epic');

  // CSS Visual Filters (Preview Only)
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  // Backend videos integration states
  const [myVideos, setMyVideos] = useState([]);
  const [myVideosLoading, setMyVideosLoading] = useState(false);
  const [myVideosError, setMyVideosError] = useState('');

  // 1. Initial Load of FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        setFfmpegLoading(true);
        setFfmpegError('');
        const ffmpeg = new FFmpeg();
        
        ffmpeg.on('log', ({ message }) => {
          console.log('FFmpeg logic log:', message);
        });
        
        ffmpeg.on('progress', ({ progress }) => {
          setProcessProgress(Math.round(progress * 100));
        });

        // Use single-threaded core loaded from stable jsdelivr CDN (UMD build)
        const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        ffmpegRef.current = ffmpeg;
        setFfmpegReady(true);
      } catch (err) {
        console.error('Failed to load FFmpeg.wasm:', err);
        setFfmpegError('This browser environment does not support WebAssembly or ESM core. Video previews, filters, and manual tagging will work, but FFmpeg trimming exports are disabled.');
      } finally {
        setFfmpegLoading(false);
      }
    };

    loadFFmpeg();
  }, []);

  // Format full URL to handle relative backend URLs
  const getFullVideoUrl = useCallback((url) => {
    if (!url) return '';
    if (url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${API}${url.startsWith('/') ? '' : '/'}${url}`;
  }, []);

  // 2. Fetch User's uploaded videos from backend
  const fetchMyVideos = useCallback(async () => {
    const token = localStorage.getItem('th_token');
    if (!token) {
      setMyVideosError('Please login to load your uploaded videos.');
      return;
    }

    setMyVideosLoading(true);
    setMyVideosError('');

    try {
      const res = await fetch(`${API}/api/videos/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`Server returned code ${res.status}`);
      }

      const data = await res.json();
      setMyVideos(Array.isArray(data) ? data : (data.videos || []));
    } catch (err) {
      console.error('Fetch my videos failed:', err);
      setMyVideosError('Could not fetch videos from backend. Offline or invalid session.');
    } finally {
      setMyVideosLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyVideos();
  }, [fetchMyVideos]);

  // Clean up Object URL
  useEffect(() => {
    return () => {
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // Playback control
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  };

  // Video processing & Validation
  const validateAndProcessFile = (file) => {
    if (!file) return;

    const validFormats = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    const ext = file.name.split('.').pop().toLowerCase();
    const isFormatValid = validFormats.includes(file.type) || ['mp4', 'webm', 'mov'].includes(ext);

    if (!isFormatValid) {
      alert('Unsupported file format. Please upload MP4, WebM, or MOV.');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      alert('File size exceeds the 500MB limit.');
      return;
    }

    // Reset editor
    setVideoFile(file);
    setVideoName(file.name);
    setVideoSize((file.size / (1024 * 1024)).toFixed(1) + ' MB');

    const localUrl = URL.createObjectURL(file);
    setVideoUrl(localUrl);
    setHighlights([]);
    setCapturedThumbnail('');
    setActiveHighlightId(null);
    setIsPlaying(false);

    // Reset filters
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  // Drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndProcessFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) validateAndProcessFile(file);
  };

  const loadDemoVideo = () => {
    setVideoFile(null);
    setVideoName('talent_hub_demo_performance.mp4');
    setVideoSize('2.1 MB');
    
    // Stable public video link
    setVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
    setHighlights([]);
    setCapturedThumbnail('');
    setActiveHighlightId(null);
    setIsPlaying(false);

    // Reset filters
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  const handleLoadBackendVideo = (video) => {
    setVideoFile(null);
    setVideoName(video.title || 'Backend Video');
    setVideoSize('Remote Stream');
    
    const fullUrl = getFullVideoUrl(video.url || video.videoUrl);
    setVideoUrl(fullUrl);
    setHighlights([]);
    setCapturedThumbnail('');
    setActiveHighlightId(null);
    setIsPlaying(false);

    // Reset filters
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  // Metadata loaded (duration)
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const d = videoRef.current.duration;
    if (d && !isNaN(d)) {
      setDuration(d);
      setTrimStart(0);
      setTrimEnd(d);
    }
  };

  // Handle trim updates on slider dragging
  const handleStartSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    const safeVal = Math.min(val, trimEnd - 0.2);
    setTrimStart(safeVal);
    if (videoRef.current) {
      videoRef.current.currentTime = safeVal;
    }
  };

  const handleEndSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    const safeVal = Math.max(val, trimStart + 0.2);
    setTrimEnd(safeVal);
    if (videoRef.current) {
      videoRef.current.currentTime = safeVal;
    }
  };

  // Time update listener (handles trim bounding and highlighting loops)
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const current = video.currentTime;
    setCurrentTime(current);

    // Determine current active boundary
    let start = trimStart;
    let end = trimEnd;

    if (activeHighlightId) {
      const activeH = highlights.find(h => h.id === activeHighlightId);
      if (activeH) {
        start = activeH.startTime;
        end = activeH.endTime;
      }
    }

    if (current >= end) {
      video.currentTime = start;
      if (activeHighlightId) {
        video.play().catch(() => {});
      }
    } else if (current < start) {
      video.currentTime = start;
    }
  };

  // Reset sliders to full video duration
  const resetTrimRange = () => {
    setTrimStart(0);
    setTrimEnd(duration);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  // Canvas Frame Capture
  const captureFrame = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/png');
      setCapturedThumbnail(dataUrl);
    } catch (err) {
      console.error('Frame capture failed:', err);
      alert('Frame capture failed. Note: Remote videos must allow CORS. Ensure crossOrigin="anonymous" is loaded.');
    }
  };

  const downloadThumbnail = () => {
    if (!capturedThumbnail) return;
    const a = document.createElement('a');
    a.href = capturedThumbnail;
    a.download = `${videoName.replace(/\.[^/.]+$/, '')}_thumbnail.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Add Highlight moments
  const addHighlight = () => {
    if (trimStart >= trimEnd) {
      alert('Trim start must be less than trim end.');
      return;
    }

    const newH = {
      id: Date.now().toString(),
      label: newHighlightLabel || 'Epic',
      startTime: trimStart,
      endTime: trimEnd
    };

    setHighlights(prev => [...prev, newH]);
  };

  const deleteHighlight = (id, e) => {
    e.stopPropagation();
    if (activeHighlightId === id) {
      setActiveHighlightId(null);
    }
    setHighlights(prev => prev.filter(h => h.id !== id));
  };

  const playHighlight = (h) => {
    setActiveHighlightId(h.id);
    if (videoRef.current) {
      videoRef.current.currentTime = h.startTime;
      videoRef.current.play().catch(() => {});
    }
  };

  const stopHighlightPreview = () => {
    setActiveHighlightId(null);
  };

  // In-Browser Trim and Export via FFmpeg.wasm
  const exportClip = async (start, end, label) => {
    if (!ffmpegReady || !ffmpegRef.current) {
      alert('FFmpeg browser compiler is not loaded or unsupported on this browser.');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessProgress(0);
      const ffmpeg = ffmpegRef.current;

      let fileData;
      if (videoFile) {
        fileData = new Uint8Array(await videoFile.arrayBuffer());
      } else if (videoUrl) {
        const response = await fetch(videoUrl);
        const blob = await response.blob();
        fileData = new Uint8Array(await blob.arrayBuffer());
      } else {
        throw new Error('No video loaded');
      }

      const fileExt = videoName.split('.').pop() || 'mp4';
      const inputName = `input.${fileExt}`;
      const outputName = `output.${fileExt}`;

      // Write video to FFmpeg virtual storage
      await ffmpeg.writeFile(inputName, fileData);

      const startStr = start.toFixed(3);
      const durationStr = (end - start).toFixed(3);

      // Fast seek stream copy
      await ffmpeg.exec([
        '-ss', startStr,
        '-i', inputName,
        '-t', durationStr,
        '-c', 'copy',
        outputName
      ]);

      // Read output file
      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data.buffer], { type: videoFile ? videoFile.type : 'video/mp4' });
      const exportUrl = URL.createObjectURL(blob);

      // Trigger browser download
      const cleanLabel = label ? label.replace(/\s+/g, '_') : 'trimmed';
      const a = document.createElement('a');
      a.href = exportUrl;
      a.download = `${videoName.replace(/\.[^/.]+$/, '')}_${cleanLabel}_${start.toFixed(0)}-${end.toFixed(0)}.${fileExt}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Cleanup FFmpeg virtual files
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch (err) {
      console.error('FFmpeg export failed:', err);
      alert('In-browser processing failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Render helpers
  const formatSec = (seconds) => {
    if (isNaN(seconds) || seconds === null) return '0:00.0';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const getVibeColor = (label) => {
    const vibe = PRESET_VIBES.find(v => v.name.toLowerCase() === label.toLowerCase());
    return vibe ? vibe.color : '#a78bfa';
  };

  return (
    <div className="hs-page">
      
      {/* FFmpeg Loading State */}
      {ffmpegLoading && (
        <div className="hs-ffmpeg-loader-overlay">
          <div className="hs-ffmpeg-loader-content">
            <RefreshCw className="hs-spin-animation" size={32} />
            <h3>Initializing Highlight Studio Compiler</h3>
            <p>Downloading web-assembly libraries (approx. 24MB)... This happens only once.</p>
          </div>
        </div>
      )}

      {/* FFmpeg Trim Progress Overlay */}
      {isProcessing && (
        <div className="hs-ffmpeg-loader-overlay">
          <div className="hs-ffmpeg-loader-content">
            <Cpu className="hs-pulse-animation" size={32} />
            <h3>Trimming Video in Browser</h3>
            <p>Running FFmpeg.wasm stream copy... No data leaves your machine!</p>
            <div className="hs-export-progress-bar">
              <div className="hs-export-progress-fill" style={{ width: `${processProgress}%` }}></div>
            </div>
            <span className="hs-export-progress-text">{processProgress}% processed</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="hs-hero visible">
        <div className="hs-hero-left">
          <div className="hs-hero-badge">
            <Cpu size={12} /> Browser Highlight Studio
          </div>
          <h1 className="hs-hero-title">
            Creative <span>Highlight Workspace</span>
          </h1>
          <p className="hs-hero-sub">
            Trim video clips, capture frame thumbnails, and export highlight moments in-browser. Zero server latency.
          </p>
        </div>
        <div className="hs-hero-icon">
          <Film size={26} className="hs-pulse-animation" />
        </div>
      </div>

      {/* Error alert for unsupported browsers */}
      {ffmpegError && (
        <div className="hs-warning-banner">
          <AlertTriangle size={18} />
          <span>{ffmpegError}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="hs-body">
        
        {/* Left Column Controls */}
        <div className="hs-left th-premium-card-redesign" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Video Upload Dropzone */}
          <div className="hs-section">
            <span className="hs-section-title">Upload Video</span>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="video/mp4, video/webm, video/quicktime" 
              style={{ display: 'none' }} 
            />
            <div 
              className="hs-upload-zone"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="hs-upload-icon-wrap">
                <UploadCloud size={22} />
              </div>
              <strong>Select Video File</strong>
              <p>Drag & drop MP4, WebM, or MOV here (Max 500MB)</p>
            </div>

            <button 
              type="button" 
              className="hs-demo-btn"
              onClick={loadDemoVideo}
            >
              ⚡ Load Demo Video
            </button>
          </div>

          {/* User Videos from Backend */}
          <div className="hs-section">
            <div className="hs-section-header">
              <span className="hs-section-title">My Uploaded Videos</span>
              <button 
                type="button" 
                onClick={fetchMyVideos} 
                className="hs-refresh-btn" 
                title="Reload uploads"
              >
                <RefreshCw size={12} className={myVideosLoading ? 'hs-spin-animation' : ''} />
              </button>
            </div>
            
            {myVideosLoading ? (
              <div className="hs-small-loader"><RefreshCw size={14} className="hs-spin-animation" /> Fetching uploads...</div>
            ) : myVideosError ? (
              <div className="hs-small-error">{myVideosError}</div>
            ) : myVideos.length === 0 ? (
              <div className="hs-small-empty">No uploaded videos found. Upload a video on TalentHub first!</div>
            ) : (
              <div className="hs-backend-video-list">
                {myVideos.map(vid => (
                  <div 
                    key={vid._id} 
                    className="hs-backend-video-item"
                    onClick={() => handleLoadBackendVideo(vid)}
                  >
                    <div className="hs-item-thumb">
                      <FileVideo size={16} />
                    </div>
                    <div className="hs-item-info">
                      <span className="hs-item-title" title={vid.title}>{vid.title}</span>
                      <span className="hs-item-cat">{vid.category || 'Other'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Visual CSS Filters */}
          <div className="hs-section">
            <div className="hs-section-header">
              <span className="hs-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={12} /> Visual Filters (Preview Only)
              </span>
              {(brightness !== 100 || contrast !== 100 || saturation !== 100) && (
                <button 
                  className="hs-filter-reset"
                  onClick={() => { setBrightness(100); setContrast(100); setSaturation(100); }}
                >
                  <RotateCcw size={10} /> Reset
                </button>
              )}
            </div>

            <div className="hs-filter-sliders">
              <div className="hs-filter-slider-item">
                <div className="hs-filter-slider-label">
                  <span>Brightness</span>
                  <span>{brightness}%</span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="150" 
                  value={brightness} 
                  onChange={e => setBrightness(parseInt(e.target.value))} 
                />
              </div>

              <div className="hs-filter-slider-item">
                <div className="hs-filter-slider-label">
                  <span>Contrast</span>
                  <span>{contrast}%</span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="150" 
                  value={contrast} 
                  onChange={e => setContrast(parseInt(e.target.value))} 
                />
              </div>

              <div className="hs-filter-slider-item">
                <div className="hs-filter-slider-label">
                  <span>Saturation</span>
                  <span>{saturation}%</span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="150" 
                  value={saturation} 
                  onChange={e => setSaturation(parseInt(e.target.value))} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column Workspace */}
        <div className="hs-right">
          
          {videoUrl ? (
            <>
              {/* HTML5 Player Container */}
              <div className="hs-video-preview th-premium-card-redesign">
                <div className="hs-player-wrapper">
                  <video 
                    ref={videoRef}
                    src={videoUrl}
                    crossOrigin="anonymous"
                    className="hs-video-tag"
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    style={{
                      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
                    }}
                  />
                  <div className="hs-player-custom-controls">
                    <button 
                      type="button" 
                      onClick={togglePlay}
                      className="hs-play-pause-btn"
                    >
                      {isPlaying ? <Pause size={18} fill="#fff" /> : <Play size={18} fill="#fff" />}
                    </button>
                    <div className="hs-player-time-indicator">
                      {formatSec(currentTime)} / {formatSec(duration)}
                    </div>
                  </div>
                </div>

                {/* Video Info Strip */}
                <div className="hs-video-info-strip">
                  <div className="hs-strip-left">
                    <span className="hs-strip-name" title={videoName}>{videoName}</span>
                    <span className="hs-strip-size">{videoSize}</span>
                  </div>
                  <button 
                    className="hs-strip-download" 
                    onClick={() => exportClip(trimStart, trimEnd, 'trimmed')}
                    disabled={!ffmpegReady || isProcessing}
                    title="Export currently trimmed section"
                  >
                    <Download size={14} /> Download Trimmed MP4
                  </button>
                </div>

                {/* Active Highlight Marker Info */}
                {activeHighlightId && (
                  <div className="hs-active-highlight-banner">
                    <span className="hs-pulse-dot"></span>
                    <span>
                      Previewing Moment: <strong>{highlights.find(h => h.id === activeHighlightId)?.label}</strong> (
                      {formatSec(highlights.find(h => h.id === activeHighlightId)?.startTime)} - {formatSec(highlights.find(h => h.id === activeHighlightId)?.endTime)})
                    </span>
                    <button 
                      className="hs-stop-preview-btn"
                      onClick={stopHighlightPreview}
                    >
                      Exit Preview
                    </button>
                  </div>
                )}
              </div>

              {/* Trim dual range tools */}
              <div className="hs-trim-editor th-premium-card-redesign" style={{ padding: '20px' }}>
                <div className="hs-trim-header">
                  <div className="hs-trim-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <Scissors size={14} color="#7c3aed" /> Select Manual Trim Range
                  </div>
                  <button className="hs-trim-reset-btn" onClick={resetTrimRange}>Reset to Full Video</button>
                </div>

                <div className="hs-trim-sliders-block">
                  <div className="hs-slider-row">
                    <div className="hs-slider-meta">
                      <span>Trim Start</span>
                      <strong>{formatSec(trimStart)}</strong>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max={duration || 100}
                      step="0.1"
                      value={trimStart}
                      onChange={handleStartSliderChange}
                    />
                  </div>

                  <div className="hs-slider-row">
                    <div className="hs-slider-meta">
                      <span>Trim End</span>
                      <strong>{formatSec(trimEnd)}</strong>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max={duration || 100}
                      step="0.1"
                      value={trimEnd}
                      onChange={handleEndSliderChange}
                    />
                  </div>
                </div>

                <div className="hs-trim-bounds-info">
                  Total selected duration: <strong>{formatSec(trimEnd - trimStart)}</strong>
                </div>
              </div>

              {/* Grid of Sub-workspaces (Thumbnail Capture & Highlight Clips) */}
              <div className="hs-sub-grid">
                
                {/* Canvas Thumbnail Generator */}
                <div className="hs-thumbnail-box th-premium-card-redesign">
                  <span className="hs-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Image size={14} color="#7c3aed" /> Thumbnail Generator
                  </span>
                  <p className="hs-section-sub">Capture frame from video player at current timestamp.</p>
                  
                  <div className="hs-thumb-canvas-area">
                    {capturedThumbnail ? (
                      <div className="hs-thumb-preview-card">
                        <img src={capturedThumbnail} alt="Thumbnail preview" />
                        <button 
                          className="hs-thumb-download-btn"
                          onClick={downloadThumbnail}
                        >
                          <Download size={12} /> Save PNG
                        </button>
                      </div>
                    ) : (
                      <div className="hs-thumb-placeholder">
                        <Image size={24} style={{ opacity: 0.3 }} />
                        <span>No frame captured yet</span>
                      </div>
                    )}
                  </div>

                  <button 
                    type="button" 
                    className="hs-capture-btn"
                    onClick={captureFrame}
                  >
                    📸 Capture Current Frame ({formatSec(currentTime)})
                  </button>
                </div>

                {/* Highlight Moments Marker */}
                <div className="hs-highlights-box th-premium-card-redesign">
                  <span className="hs-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} color="#7c3aed" /> Highlight Moments
                  </span>
                  <p className="hs-section-sub">Add custom moments based on the trim range above.</p>

                  <div className="hs-highlight-creator">
                    <span className="hs-creator-subtitle">Select Moment Vibe:</span>
                    <div className="hs-vibe-presets">
                      {PRESET_VIBES.map(v => (
                        <button
                          key={v.name}
                          type="button"
                          className={`hs-vibe-pill ${newHighlightLabel === v.name ? 'active' : ''}`}
                          style={{
                            '--vibe-color': v.color,
                            borderColor: newHighlightLabel === v.name ? v.color : 'rgba(255,255,255,0.05)'
                          }}
                          onClick={() => setNewHighlightLabel(v.name)}
                        >
                          {v.name}
                        </button>
                      ))}
                    </div>

                    <div className="hs-custom-label-row">
                      <input 
                        type="text" 
                        placeholder="Or type custom label..."
                        value={newHighlightLabel}
                        onChange={e => setNewHighlightLabel(e.target.value)}
                      />
                      <button 
                        type="button" 
                        onClick={addHighlight}
                        className="hs-add-h-btn"
                      >
                        <Plus size={14} /> Add Clip
                      </button>
                    </div>
                  </div>

                  {/* Highlights List */}
                  <div className="hs-highlights-list-section">
                    <span className="hs-list-title">Saved Highlight Clips ({highlights.length})</span>
                    {highlights.length === 0 ? (
                      <div className="hs-h-empty">Select a range, tag it, and add it above to create highlights list.</div>
                    ) : (
                      <div className="hs-h-list">
                        {highlights.map(h => (
                          <div 
                            key={h.id} 
                            className={`hs-h-item ${activeHighlightId === h.id ? 'active' : ''}`}
                            onClick={() => playHighlight(h)}
                          >
                            <div className="hs-h-left">
                              <span 
                                className="hs-h-badge"
                                style={{ backgroundColor: getVibeColor(h.label) }}
                              >
                                {h.label}
                              </span>
                              <span className="hs-h-time">
                                {formatSec(h.startTime)} - {formatSec(h.endTime)} ({formatSec(h.endTime - h.startTime)})
                              </span>
                            </div>
                            <div className="hs-h-actions">
                              <button 
                                className="hs-h-action-btn hs-h-export"
                                onClick={(e) => { e.stopPropagation(); exportClip(h.startTime, h.endTime, h.label); }}
                                disabled={!ffmpegReady || isProcessing}
                                title="Export highlight clip as MP4"
                              >
                                <Download size={11} />
                              </button>
                              <button 
                                className="hs-h-action-btn hs-h-delete"
                                onClick={(e) => deleteHighlight(h.id, e)}
                                title="Remove highlight"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </>
          ) : (
            /* Empty State when no video is loaded */
            <div className="hs-video-preview th-premium-card-redesign" style={{ border: 'none', background: 'transparent' }}>
              <div className="th-empty-state-illustrated" style={{ margin: 0, maxWidth: 'none', padding: '80px 20px' }}>
                <div className="th-empty-state-icon-wrapper" style={{ background: 'rgba(124, 58, 237, 0.08)', color: '#7c3aed' }}>
                  <Video size={36} />
                </div>
                <h3>No Video Workspace Loaded</h3>
                <p>Drag in a performance video, upload one, select from your profile, or load our quick demo video to test editing features.</p>
                <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button className="hs-empty-cta-btn" onClick={() => fileInputRef.current?.click()}>
                    Upload Video
                  </button>
                  <button className="hs-empty-cta-btn hs-demo-cta" onClick={loadDemoVideo}>
                    Load Demo Video
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}