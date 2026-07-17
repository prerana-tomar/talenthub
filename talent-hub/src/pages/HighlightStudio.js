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
  const [duration, setDuration] = useState(0);

  // Parameters
  const [vibe, setVibe] = useState('Epic');
  const [reelCount, setReelCount] = useState(1);
  const [clipDuration, setClipDuration] = useState(15);
  const [instructions, setInstructions] = useState('');

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

  // Handle Video Selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Sirf video files (.mp4, .mov, .webm) allowed hain!');
      return;
    }

    // Reset old states
    setReels([]);
    setActiveReel(null);
    setIsPlayingHighlight(false);
    setError('');

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

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Generate Highlights Handler
  const handleGenerate = async () => {
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

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('duration', duration);
    formData.append('reelCount', reelCount);
    formData.append('options', JSON.stringify({
      vibe,
      clipDuration,
      instructions: instructions.trim()
    }));

    try {
      const response = await fetch(`${API}/api/highlights/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Highlight generation failed.');
      }

      setReels(data.reels);
      // Update video player to point to the server file path for confirmation
      if (data.videoPath) {
        const fullServerUrl = `${API}/uploads/highlights/${data.videoPath}`;
        setVideoUrl(fullServerUrl);
        setMasterVideoUrl(fullServerUrl);
      }
    } catch (err) {
      console.error('Highlight error:', err);
      setError(err.message || 'Server error while generating highlights.');
    } finally {
      setLoading(false);
    }
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
          <div className="hs-upload-zone" onClick={triggerFileSelect}>
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
                  className={`hs-option-btn ${vibe === v ? 'active' : ''}`}
                  onClick={() => setVibe(v)}
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
                  className={`hs-option-btn ${reelCount === count ? 'active' : ''}`}
                  onClick={() => setReelCount(count)}
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
                  className={`hs-option-btn ${clipDuration === d ? 'active' : ''}`}
                  onClick={() => setClipDuration(d)}
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
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
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
                if (loadingStep === idx) status = 'active';
                if (loadingStep > idx) status = 'done';

                return (
                  <div key={idx} className={`hs-step ${status === 'active' ? 'hs-step--active' : ''} ${status === 'done' ? 'hs-step--done' : ''}`}>
                    <div className="hs-step-icon">
                      {status === 'done' ? '✓' : status === 'active' ? '⚙' : idx + 1}
                    </div>
                    <div className="hs-step-info">
                      <div className="hs-step-name">{step.name}</div>
                      <div className="hs-step-detail">{step.detail}</div>
                      <div className="hs-progress">
                        <div
                          className="hs-progress-fill"
                          style={{
                            width: status === 'done' ? '100%' : status === 'active' ? '50%' : '0%',
                            transition: 'width 2s ease'
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

              <div className="hs-export-bar">
                <button type="button" className="hs-exp-btn" onClick={handleShare}>
                  🔗 Share Reel Link
                </button>
                <button type="button" className="hs-exp-btn hs-exp-btn--primary" onClick={handleDownload}>
                  📥 Download Full Video
                </button>
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
