import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

  // Video source states
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [masterVideoUrl, setMasterVideoUrl] = useState('');
  const [serverVideoPath, setServerVideoPath] = useState('');
  const [duration, setDuration] = useState(0);

  // Parameters merged into a single state object
  const [config, setConfig] = useState({
    vibe: 'Epic',
    reelCount: 1,
    clipDuration: 15,
    instructions: ''
  });

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);

  // Upload Progress Tracking
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Trim sliders & reslicing states
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isReslicing, setIsReslicing] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');
  const [reels, setReels] = useState([]);
  const [activeReel, setActiveReel] = useState(null);
  const [isPlayingHighlight, setIsPlayingHighlight] = useState(false);

  // Clean local URL on unmount
  useEffect(() => {
    return () => {
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // Loading step simulation
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

  // Helper for processing video files (validation & load)
  const processVideoFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Sirf video files (.mp4, .mov, .webm) allowed hain!');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setError('File size 500MB se zyada nahi honi chahiye!');
      return;
    }

    // Reset old states
    setReels([]);
    setActiveReel(null);
    setIsPlayingHighlight(false);
    setError('');
    setServerVideoPath('');

    setVideoFile(file);
    const localUrl = URL.createObjectURL(file);
    setVideoUrl(localUrl);
    setMasterVideoUrl(localUrl);

    // Extract duration
    const tempVideo = document.createElement('video');
    tempVideo.src = localUrl;
    tempVideo.onloadedmetadata = () => {
      setDuration(Math.floor(tempVideo.duration));
    };
  };

  // Drag and drop event handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Drag leave handler
  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Drop handler
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processVideoFile(file);
    }
  };

  // Handle Video Selection via Browse Click
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processVideoFile(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Generate Highlights Handler (using XHR for upload progress tracking)
  const handleGenerate = () => {
    if (!videoFile) {
      setError('Kripya pehle ek video select karein!');
      return;
    }

    const token = localStorage.getItem('th_token');
    if (!token) {
      setError('Please login first to generate highlights!');
      navigate('/login');
      return;
    }

    setLoading(true);
    setLoadingStep(0);
    setError('');
    setReels([]);
    setActiveReel(null);
    setIsPlayingHighlight(false);
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('duration', duration);
    formData.append('reelCount', config.reelCount);
    formData.append('options', JSON.stringify({
      vibe: config.vibe,
      clipDuration: config.clipDuration,
      instructions: config.instructions.trim()
    }));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API}/api/highlights/generate`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    // Track real file upload progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      setUploadProgress(100);

      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) {
          setReels(data.reels || []);
          if (data.videoPath) {
            setServerVideoPath(data.videoPath);
            const fullServerUrl = `${API}/uploads/highlights/${data.videoPath}`;
            setVideoUrl(fullServerUrl);
            setMasterVideoUrl(fullServerUrl);
          }
          setLoading(false);
        } else {
          throw new Error(data.message || 'Highlight generation failed.');
        }
      } catch (err) {
        console.error('Highlight error:', err);
        setError(err.message || 'Failed to parse server response.');
        setLoading(false);
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setLoading(false);
      setError('Network error during highlight generation upload.');
    };

    xhr.send(formData);
  };

  // Auto-play/load when source videoUrl changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      if (isPlayingHighlight) {
        // Delay play briefly to allow media element source buffer binding
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => console.log('Autoplay deferred:', e));
        }
      }
    }
  }, [videoUrl, isPlayingHighlight]);

  const playReel = (reel) => {
    if (!videoRef.current) return;
    setActiveReel(reel);
    setIsPlayingHighlight(true);
    setTrimStart(reel.startTime);
    setTrimEnd(reel.endTime);
    // Swap the source url to point to the new physically cut sliced video file!
    setVideoUrl(`${API}${reel.url}`);
  };

  const stopClip = () => {
    setIsPlayingHighlight(false);
    setActiveReel(null);
    // Restore the full length master video source url
    setVideoUrl(masterVideoUrl);
  };

  const handleDownload = () => {
    if (activeReel) {
      // Download the active sliced highlight video file!
      window.open(`${API}${activeReel.url}`, '_blank');
    } else if (videoUrl) {
      // Download the full master video!
      window.open(videoUrl, '_blank');
    }
  };

  // ZIP download handler
  const handleDownloadAll = async () => {
    const token = localStorage.getItem('th_token');
    if (!token) return;

    try {
      const response = await fetch(`${API}/api/highlights/download-zip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reels })
      });

      if (!response.ok) throw new Error('ZIP download failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ai-reels.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('ZIP download failed: ' + err.message);
    }
  };

  // Reslicing individual clip handler
  const handleReslice = async () => {
    if (!activeReel || !serverVideoPath) return;

    const token = localStorage.getItem('th_token');
    if (!token) return;

    setIsReslicing(true);
    try {
      const response = await fetch(`${API}/api/highlights/reslice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          videoPath: serverVideoPath,
          startTime: trimStart,
          endTime: trimEnd,
          reelId: activeReel.id,
          ffmpegOptions: activeReel.ffmpegOptions || []
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Reslice failed');

      // Update current active reel state
      const updatedReel = {
        ...activeReel,
        url: data.url,
        startTime: trimStart,
        endTime: trimEnd,
        timeRange: `${formatSec(trimStart)} – ${formatSec(trimEnd)}`
      };
      
      setActiveReel(updatedReel);
      
      // Update reels list
      setReels(prev => prev.map(r => r.id === activeReel.id ? updatedReel : r));
      
      // Update preview player
      setVideoUrl(`${API}${data.url}`);

      alert('Clip resliced successfully!');
    } catch (err) {
      alert('Failed to reslice clip: ' + err.message);
    } finally {
      setIsReslicing(false);
    }
  };

  const handleShare = () => {
    if (activeReel) {
      const shareUrl = `${window.location.origin}/highlight-studio?reel=${activeReel.id}&video=${encodeURIComponent(videoUrl)}`;
      navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Page link copied to clipboard!');
    }
  };

  const formatSec = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="hs-page">
      <div className="hs-header">
        <h1 className="hs-title">🎬 AI Highlight Studio</h1>
        <p className="hs-subtitle">Upload performance video and generate automatic peak moments & social reels.</p>
      </div>

      <div className="hs-body">
        {/* LEFT PANEL: CONFIG */}
        <div className="hs-left">
          <div 
            className={`hs-upload-zone ${isDragging ? 'dragging' : ''}`} 
            onClick={triggerFileSelect}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <span className="hs-upload-icon">⬆</span>
            <strong>{videoFile ? videoFile.name : 'Select Performance Video'}</strong>
            <p>{videoFile ? `${(videoFile.size / (1024 * 1024)).toFixed(1)} MB` : 'Drag & drop or browse files'}</p>
            {duration > 0 && <span className="hs-dur-badge">Length: {formatSec(duration)}</span>}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="video/*"
              onChange={handleFileChange}
            />
          </div>

          <div className="hs-section">
            <span className="hs-section-title">Select Vibe & Style</span>
            <div className="hs-btn-group">
              {VIBES.map(v => (
                <button
                  key={v}
                  type="button"
                  className={`hs-option-btn ${config.vibe === v ? 'active' : ''}`}
                  onClick={() => setConfig(prev => ({ ...prev, vibe: v }))}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="hs-section">
            <span className="hs-section-title">Number of Reels</span>
            <div className="hs-btn-group">
              {REEL_COUNTS.map(count => (
                <button
                  key={count}
                  type="button"
                  className={`hs-option-btn ${config.reelCount === count ? 'active' : ''}`}
                  onClick={() => setConfig(prev => ({ ...prev, reelCount: count }))}
                >
                  {count} Reels
                </button>
              ))}
            </div>
          </div>

          <div className="hs-section">
            <span className="hs-section-title">Reel Target Duration</span>
            <div className="hs-btn-group">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  className={`hs-option-btn ${config.clipDuration === d ? 'active' : ''}`}
                  onClick={() => setConfig(prev => ({ ...prev, clipDuration: d }))}
                >
                  {d}s Clips
                </button>
              ))}
            </div>
          </div>

          <div className="hs-section">
            <span className="hs-section-title">Special Instructions (Optional)</span>
            <textarea
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '10px',
                color: '#fff',
                fontSize: '13px',
                resize: 'none',
                fontFamily: 'inherit'
              }}
              rows="3"
              placeholder="Jaise: 'Dance floor drop point highlights do', 'Only fast beats'..."
              value={config.instructions}
              onChange={e => setConfig(prev => ({ ...prev, instructions: e.target.value }))}
            />
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>⚠️ {error}</div>}

          <button
            type="button"
            className="hs-generate-btn"
            disabled={loading || !videoFile}
            onClick={handleGenerate}
          >
            {loading ? 'Processing Highlights...' : '✨ Generate AI Highlights'}
          </button>
        </div>

        {/* RIGHT PANEL: PLAYER AND HIGHLIGHTS */}
        <div className="hs-right">
          {loading ? (
            /* LOADING STATE - STEPS AND PROGRESS */
            <div className="hs-analysis">
              <span className="hs-section-title">AI HIGHLIGHT GENERATION STEPS</span>
              {LOADING_STEPS.map((step, idx) => {
                let status = 'wait';
                let stepPercent = 0;
                
                if (idx === 0) {
                  // Uploading Performance Step
                  if (isUploading) {
                    status = 'active';
                    stepPercent = uploadProgress;
                  } else if (uploadProgress === 100) {
                    status = 'done';
                    stepPercent = 100;
                  }
                } else if (idx === 1) {
                  // AI Analysis Step
                  if (!isUploading && loadingStep === 1) {
                    status = 'active';
                    stepPercent = 50;
                  } else if (loadingStep > 1) {
                    status = 'done';
                    stepPercent = 100;
                  }
                } else if (idx === 2) {
                  // Slicing Clips Step
                  if (!isUploading && loadingStep === 2) {
                    status = 'active';
                    stepPercent = 75;
                  } else if (loadingStep > 2) {
                    status = 'done';
                    stepPercent = 100;
                  }
                }

                return (
                  <div key={idx} className={`hs-step ${status === 'active' ? 'hs-step--active' : ''} ${status === 'done' ? 'hs-step--done' : ''}`}>
                    <div className="hs-step-icon">
                       {status === 'done' ? '✓' : status === 'active' ? '⚙' : idx + 1}
                    </div>
                    <div className="hs-step-info">
                      <div className="hs-step-name">
                        {step.name} 
                        {status === 'active' && idx === 0 && ` (${uploadProgress}%)`}
                      </div>
                      <div className="hs-step-detail">{step.detail}</div>
                      <div className="hs-progress">
                        <div
                          className="hs-progress-fill"
                          style={{
                            width: `${stepPercent}%`,
                            transition: 'width 0.2s ease'
                          }}
                        />
                      </div>
                    </div>
                    <span className={`hs-step-status hs-step-status--${status}`}>
                      {status === 'done' ? 'Completed' : status === 'active' ? 'Processing' : 'Pending'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : reels.length > 0 ? (
            /* REELS GENERATED AND READY */
            <>
              <div className="hs-video-preview">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="hs-video"
                  controls
                  style={{ maxHeight: '420px', width: '100%', objectFit: 'contain' }}
                />
                {isPlayingHighlight && activeReel && (
                  <div className="hs-now-playing">
                    🎬 Playing AI Reel: <strong>{activeReel.title}</strong> ({activeReel.timeRange})
                    <button type="button" className="hs-stop-btn" onClick={stopClip}>Stop Clip</button>
                  </div>
                )}
              </div>

              <div className="hs-reels">
                <span className="hs-section-title">
                  ✨ Generated AI Reels <span className="hs-reels-hint">(Click card to play specific clip)</span>
                </span>
                <div className="hs-reels-grid">
                  {reels.map(r => (
                    <div
                      key={r.id}
                      className={`hs-reel-card ${activeReel?.id === r.id ? 'hs-reel-card--active' : ''}`}
                      onClick={() => playReel(r)}
                    >
                      <div className="hs-reel-thumb" style={{ background: r.gradient }}>
                        <span className="hs-score-badge">⭐ {r.score}% Vibe</span>
                        <span className="hs-reel-dur-badge">{r.endTime - r.startTime}s</span>
                        <div className="hs-play-overlay">
                          <span className="hs-play-btn">▶</span>
                        </div>
                      </div>
                      <div className="hs-reel-info">
                        <div className="hs-reel-title">{r.title}</div>
                        <div className="hs-reel-meta">{r.timeRange}</div>
                        <p style={{ fontSize: '11px', color: '#8b859e', margin: '4px 0 0', lineHeight: 1.4 }}>
                          {r.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {activeReel && (
                /* Trim Adjustment Panel for Selected Reel */
                <div className="hs-trim-editor">
                  <div className="hs-trim-title">🛠️ Adjust Highlights Trim: "{activeReel.title}"</div>
                  <div className="hs-trim-slider-row">
                    <div className="hs-trim-slider-wrap">
                      <label>Start: </label>
                      <input
                        type="range"
                        min="0"
                        max={duration}
                        step="0.5"
                        value={trimStart}
                        onChange={(e) => setTrimStart(parseFloat(e.target.value))}
                      />
                      <span>{formatSec(trimStart)}</span>
                    </div>
                    <div className="hs-trim-slider-wrap">
                      <label>End: </label>
                      <input
                        type="range"
                        min="0"
                        max={duration}
                        step="0.5"
                        value={trimEnd}
                        onChange={(e) => setTrimEnd(parseFloat(e.target.value))}
                      />
                      <span>{formatSec(trimEnd)}</span>
                    </div>
                  </div>
                  <div className="hs-trim-actions">
                    <button 
                      type="button" 
                      className="hs-trim-btn hs-trim-btn--cancel" 
                      onClick={() => {
                        setTrimStart(activeReel.startTime);
                        setTrimEnd(activeReel.endTime);
                      }}
                    >
                      Reset
                    </button>
                    <button 
                      type="button" 
                      className="hs-trim-btn hs-trim-btn--primary" 
                      disabled={isReslicing || trimStart >= trimEnd}
                      onClick={handleReslice}
                    >
                      {isReslicing ? 'Re-cutting clip...' : '💾 Regenerate Clip'}
                    </button>
                  </div>
                </div>
              )}

              <div className="hs-export-bar" style={{ gap: '10px', flexWrap: 'wrap' }}>
                <button type="button" className="hs-exp-btn" style={{ flex: 1 }} onClick={handleShare}>
                  🔗 Share Link
                </button>
                <button type="button" className="hs-exp-btn" style={{ flex: 1 }} onClick={handleDownload}>
                  📥 Download Active Clip
                </button>
                {reels.length > 1 && (
                  <button type="button" className="hs-exp-btn hs-exp-btn--primary" style={{ flex: 1.5 }} onClick={handleDownloadAll}>
                    📦 Download All (ZIP)
                  </button>
                )}
              </div>
            </>
          ) : (
            /* EMPTY STATE */
            <div className="hs-video-preview">
              {videoUrl ? (
                <video
                  src={videoUrl}
                  className="hs-video"
                  controls
                  style={{ maxHeight: '420px', width: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div className="hs-empty">
                  <div className="hs-empty-icon">📹</div>
                  <h3>No Video Loaded</h3>
                  <p>Choose or drop a performance video in the left config area to get started.</p>
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
