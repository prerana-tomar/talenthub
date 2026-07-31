import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './VideoEditor.css';

// Curated royalty-free fallback tracks (hosted locally to prevent CORS and ISP network blocks)
const FALLBACK_MUSIC = [
  { id: '1', name: '🎵 Acoustic Calm', url: '/music/acoustic_calm.mp3', artist: 'SoundHelix (Acoustic Guitar)' },
  { id: '2', name: '🎵 Lo-Fi Chill Beat', url: '/music/lofi_chill.mp3', artist: 'SoundHelix (Calm Beats)' },
  { id: '3', name: '🎵 Cinematic Vibe', url: '/music/cinematic_vibe.mp3', artist: 'SoundHelix (Orchestral)' },
  { id: '4', name: '🎵 Smooth Jazz', url: '/music/smooth_jazz.mp3', artist: 'SoundHelix (Saxophone)' },
  { id: '5', name: '🎵 Upbeat Rhythm', url: '/music/upbeat_rhythm.mp3', artist: 'SoundHelix (Energetic)' },
];

export default function VideoEditor() {
  const navigate = useNavigate();

  // Video States
  const [videoFile, setVideoFile] = useState(null);
  const [videoSrc, setVideoSrc] = useState('');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Trimmer States
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  // Filter States
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);

  // Crop / Aspect Ratio States (9:16, 1:1, 16:9, original)
  const [aspectRatio, setAspectRatio] = useState('original');

  // Text Overlay States
  const [textOverlays, setTextOverlays] = useState([]);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [newText, setNewText] = useState('New Text');
  const textColor = '#ffffff';
  const textSize = 24;

  // Background Music States
  const [pixabayKey, setPixabayKey] = useState('');
  const [musicSearch, setMusicSearch] = useState('');
  const [musicTracks, setMusicTracks] = useState(FALLBACK_MUSIC);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [musicMuted, setMusicMuted] = useState(false);

  // Original Video Audio States
  const [videoVolume, setVideoVolume] = useState(1.0);
  const [videoMuted, setVideoMuted] = useState(false);

  // Export Quality State
  const [exportQuality, setExportQuality] = useState('high');

  // Tabs for the settings panel
  const [activeTab, setActiveTab] = useState('trim'); // trim, filters, text, music

  // Video Rendering States
  const [renderingVideo, setRenderingVideo] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);

  // Refs
  const videoRef = useRef(null);
  const musicAudioRef = useRef(null);
  const exportMusicAudioRef = useRef(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0, elementX: 0, elementY: 0 });

  // Reusable AudioContext and source node refs to avoid duplicate connection exceptions
  const audioCtxRef = useRef(null);
  const videoSourceNodeRef = useRef(null);
  const videoGainNodeRef = useRef(null);
  const musicSourceNodeRef = useRef(null);
  const musicGainNodeRef = useRef(null);
  const audioStreamDestRef = useRef(null);

  // Revoke blob URL on cleanup
  useEffect(() => {
    return () => {
      if (videoSrc) URL.revokeObjectURL(videoSrc);
    };
  }, [videoSrc]);

  // Synchronize Original Video Volume in Preview
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = videoMuted ? 0 : videoVolume;
      videoRef.current.muted = videoMuted;
    }
  }, [videoVolume, videoMuted]);

  // Synchronize Background Music with Video Play/Pause and Seek
  useEffect(() => {
    if (!musicAudioRef.current) return;
    const musicAudio = musicAudioRef.current;

    musicAudio.volume = musicMuted ? 0 : musicVolume;

    if (isPlaying && selectedMusic) {
      if (videoRef.current) {
        musicAudio.currentTime = Math.max(0, videoRef.current.currentTime - startTime);
      }
      musicAudio.play().catch((err) => {
        console.warn("Preview audio playback failed:", err);
      });
    } else {
      musicAudio.pause();
    }
  }, [isPlaying, selectedMusic, musicVolume, musicMuted, startTime]);

  // Handle Video Meta Load
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    setDuration(dur);
    setStartTime(0);
    setEndTime(dur);
  };

  // Video Time Update (Handles trimming auto-loop/pause)
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Sync preview music currentTime with video elapsed time
    if (musicAudioRef.current && isPlaying && selectedMusic) {
      const targetTime = time - startTime;
      const drift = Math.abs(musicAudioRef.current.currentTime - targetTime);
      if (drift > 0.3) {
        musicAudioRef.current.currentTime = Math.max(0, targetTime);
      }
    }

    // Trim loop guard: if current time goes past the trimmed end time
    if (time >= endTime) {
      videoRef.current.currentTime = startTime;
      if (musicAudioRef.current) {
        musicAudioRef.current.currentTime = 0;
      }
      if (!videoRef.current.loop) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  // File Upload Handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (videoSrc) URL.revokeObjectURL(videoSrc);
      setVideoFile(file);
      setVideoSrc(URL.createObjectURL(file));
      setIsPlaying(false);
      setSelectedMusic(null);
    }
  };

  // Play / Pause Video
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      // Seek back if we are near the end
      if (videoRef.current.currentTime >= endTime || videoRef.current.currentTime < startTime) {
        videoRef.current.currentTime = startTime;
      }
      if (musicAudioRef.current && selectedMusic) {
        musicAudioRef.current.currentTime = Math.max(0, videoRef.current.currentTime - startTime);
      }
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Trimmer Sliders change
  const handleTrimChange = (type, val) => {
    if (!videoRef.current) return;
    const value = parseFloat(val);
    if (type === 'start') {
      const clampedVal = Math.min(value, endTime - 0.5);
      setStartTime(clampedVal);
      videoRef.current.currentTime = clampedVal;
    } else if (type === 'end') {
      const clampedVal = Math.max(value, startTime + 0.5);
      setEndTime(clampedVal);
    }
  };

  // CSS Filter resets
  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
  };

  // Text Overlay Add
  const addTextOverlay = () => {
    const newOverlay = {
      id: Date.now().toString(),
      text: newText,
      color: textColor,
      fontSize: textSize,
      x: 50, // default center percent
      y: 50,
      rotation: 0,
      fontFamily: 'Poppins, sans-serif'
    };
    setTextOverlays([...textOverlays, newOverlay]);
    setSelectedTextId(newOverlay.id);
  };

  // Text Overlay Delete
  const removeTextOverlay = (id) => {
    setTextOverlays(textOverlays.filter(t => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  // Text property updates
  const updateSelectedText = (key, value) => {
    setTextOverlays(textOverlays.map(t => {
      if (t.id === selectedTextId) {
        return { ...t, [key]: value };
      }
      return t;
    }));
  };

  // Draggable Text logic using pointer events (unifies mouse and touch)
  const handlePointerDown = (e, item) => {
    e.preventDefault();
    setSelectedTextId(item.id);
    const box = containerRef.current.getBoundingClientRect();
    
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      elementX: (item.x / 100) * box.width,
      elementY: (item.y / 100) * box.height
    };

    const handlePointerMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - dragStartPos.current.x;
      const deltaY = moveEvent.clientY - dragStartPos.current.y;

      let newXPixels = dragStartPos.current.elementX + deltaX;
      let newYPixels = dragStartPos.current.elementY + deltaY;

      // Convert to percent
      let newXPercent = (newXPixels / box.width) * 100;
      let newYPercent = (newYPixels / box.height) * 100;

      // Clamp within boundaries
      newXPercent = Math.max(0, Math.min(100, newXPercent));
      newYPercent = Math.max(0, Math.min(100, newYPercent));

      setTextOverlays(prev => prev.map(t => {
        if (t.id === item.id) {
          return { ...t, x: newXPercent, y: newYPercent };
        }
        return t;
      }));
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Pixabay Music Fetch
  const searchPixabayMusic = async () => {
    if (!pixabayKey) {
      alert("Please enter a Pixabay API Key in the settings first!");
      return;
    }
    setMusicLoading(true);
    try {
      const query = encodeURIComponent(musicSearch || 'lofi');
      const url = `https://pixabay.com/api/music/?key=${pixabayKey}&q=${query}&page=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.hits && data.hits.length > 0) {
        const tracks = data.hits.map(h => ({
          id: h.id.toString(),
          name: h.title,
          url: h.audio,
          artist: h.tags || 'Pixabay Creator'
        }));
        setMusicTracks(tracks);
      } else {
        alert("No music tracks found on Pixabay for this query.");
      }
    } catch (err) {
      alert("Pixabay API fetch failed. Showing fallbacks instead.");
      setMusicTracks(FALLBACK_MUSIC);
    } finally {
      setMusicLoading(false);
    }
  };

  // Trigger file selection for local tracks
  const handleMusicSelect = (track) => {
    setSelectedMusic(track);
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
    }
    if (exportMusicAudioRef.current) {
      exportMusicAudioRef.current.pause();
    }
  };

  // Capture Actual Edited Video using Canvas CaptureStream and MediaRecorder
  const handleExportVideo = async () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    setIsPlaying(false);
    videoEl.pause();
    
    setRenderingVideo(true);
    setRenderProgress(0);

    // Create rendering Canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Aspect ratio dimensions
    let targetWidth = videoEl.videoWidth;
    let targetHeight = videoEl.videoHeight;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = videoEl.videoWidth;
    let sourceHeight = videoEl.videoHeight;

    if (aspectRatio === '9:16') {
      targetWidth = videoEl.videoHeight * (9 / 16);
      targetHeight = videoEl.videoHeight;
      sourceX = (videoEl.videoWidth - targetWidth) / 2;
      sourceWidth = targetWidth;
    } else if (aspectRatio === '1:1') {
      const minDim = Math.min(videoEl.videoWidth, videoEl.videoHeight);
      targetWidth = minDim;
      targetHeight = minDim;
      sourceX = (videoEl.videoWidth - minDim) / 2;
      sourceY = (videoEl.videoHeight - minDim) / 2;
      sourceWidth = minDim;
      sourceHeight = minDim;
    } else if (aspectRatio === '16:9') {
      targetHeight = videoEl.videoWidth * (9 / 16);
      targetWidth = videoEl.videoWidth;
      sourceY = (videoEl.videoHeight - targetHeight) / 2;
      sourceHeight = targetHeight;
    }

    // Export Quality Clamping (Max Dimension)
    let maxDim = 1080;
    if (exportQuality === 'medium') maxDim = 720;
    if (exportQuality === 'low') maxDim = 480;

    if (targetWidth > maxDim || targetHeight > maxDim) {
      const scale = maxDim / Math.max(targetWidth, targetHeight);
      targetWidth = Math.round(targetWidth * scale);
      targetHeight = Math.round(targetHeight * scale);
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Start video at trim start time
    videoEl.currentTime = startTime;
    videoEl.muted = false; // Must be false so AudioContext receives the audio stream

    // Prepare audio track nodes using refs to prevent duplicate connection exceptions
    let audioCtx = audioCtxRef.current;
    let audioStreamDest = audioStreamDestRef.current;
    let videoSourceNode = videoSourceNodeRef.current;
    let videoGainNode = videoGainNodeRef.current;
    let musicSourceNode = musicSourceNodeRef.current;
    let musicGainNode = musicGainNodeRef.current;

    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = audioCtx;
      }

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      if (!audioStreamDest) {
        audioStreamDest = audioCtx.createMediaStreamDestination();
        audioStreamDestRef.current = audioStreamDest;
      }

      if (!videoSourceNode) {
        videoSourceNode = audioCtx.createMediaElementSource(videoEl);
        videoSourceNodeRef.current = videoSourceNode;
        
        videoGainNode = audioCtx.createGain();
        videoGainNodeRef.current = videoGainNode;
        
        videoSourceNode.connect(videoGainNode);
        videoGainNode.connect(audioStreamDest);
      }

      // Update original video volume for export
      if (videoGainNode) {
        videoGainNode.gain.value = videoMuted ? 0 : videoVolume;
      }

      if (selectedMusic && exportMusicAudioRef.current) {
        const exportMusicAudio = exportMusicAudioRef.current;
        exportMusicAudio.currentTime = 0;
        exportMusicAudio.volume = musicMuted ? 0 : musicVolume;
        exportMusicAudio.muted = false;

        if (!musicSourceNode) {
          musicSourceNode = audioCtx.createMediaElementSource(exportMusicAudio);
          musicSourceNodeRef.current = musicSourceNode;

          musicGainNode = audioCtx.createGain();
          musicGainNodeRef.current = musicGainNode;

          musicSourceNode.connect(musicGainNode);
          musicGainNode.connect(audioStreamDest);
        }

        if (musicGainNode) {
          musicGainNode.gain.value = musicMuted ? 0 : musicVolume;
        }
      } else if (musicGainNode) {
        // Silence music if no track selected
        musicGainNode.gain.value = 0;
      }
    } catch (e) {
      console.warn("Audio Context setup failed (likely CORS or audio source already connected):", e);
    }

    // Capture Canvas Stream at 30 FPS
    const canvasStream = canvas.captureStream(30);
    const mixedTracks = [...canvasStream.getVideoTracks()];

    if (audioStreamDest) {
      mixedTracks.push(...audioStreamDest.stream.getAudioTracks());
    }

    const recordStream = new MediaStream(mixedTracks);

    // Setup MediaRecorder
    let mediaRecorder;
    const recordedChunks = [];
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];

    // Determine target video bits per second based on quality
    let bitsPerSecond = 5000000; // 5 Mbps (High)
    if (exportQuality === 'medium') bitsPerSecond = 2500000; // 2.5 Mbps
    if (exportQuality === 'low') bitsPerSecond = 1000000; // 1 Mbps

    let selectedMimeType = '';
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        try {
          mediaRecorder = new MediaRecorder(recordStream, { mimeType: type, videoBitsPerSecond: bitsPerSecond });
          selectedMimeType = type;
          break;
        } catch (e) {}
      }
    }

    if (!mediaRecorder) {
      mediaRecorder = new MediaRecorder(recordStream, { videoBitsPerSecond: bitsPerSecond });
      selectedMimeType = mediaRecorder.mimeType || 'video/webm';
    }

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const isMp4 = selectedMimeType.includes('mp4');
      const ext = isMp4 ? 'mp4' : 'webm';
      const blob = new Blob(recordedChunks, { type: isMp4 ? 'video/mp4' : 'video/webm' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${videoFile?.name?.replace(/\.[^/.]+$/, "") || 'edited'}_edited.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Do NOT close audioCtx to allow persistent reuse on subsequent exports.
      // Simply reset values.

      // Restore states
      videoEl.muted = videoMuted;
      videoEl.volume = videoMuted ? 0 : videoVolume;
      videoEl.currentTime = startTime;
      videoEl.pause();
      if (exportMusicAudioRef.current) {
        exportMusicAudioRef.current.pause();
      }
      setIsPlaying(false);
      setRenderingVideo(false);
      setRenderProgress(0);
    };

    // Draw loop function
    let animationFrameId;
    const drawFrame = () => {
      if (videoEl.currentTime >= endTime) {
        cancelAnimationFrame(animationFrameId);
        mediaRecorder.stop();
        return;
      }

      // Calculate progress percentage
      const elapsed = videoEl.currentTime - startTime;
      const total = endTime - startTime;
      const progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
      setRenderProgress(progressPercent);

      // Draw frame to canvas applying filters
      if (ctx.filter !== undefined) {
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;
      }

      ctx.drawImage(
        videoEl,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, targetWidth, targetHeight
      );

      if (ctx.filter !== undefined) {
        ctx.filter = 'none';
      }

      // Draw text overlays on top of the canvas
      textOverlays.forEach(overlay => {
        ctx.save();
        ctx.fillStyle = overlay.color;
        const containerBox = containerRef.current.getBoundingClientRect();
        const scaleFactor = targetWidth / containerBox.width;
        const finalFontSize = overlay.fontSize * scaleFactor;

        // Set font family dynamically
        ctx.font = `bold ${finalFontSize}px ${overlay.fontFamily || 'Poppins, sans-serif'}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const xPos = (overlay.x / 100) * targetWidth;
        const yPos = (overlay.y / 100) * targetHeight;

        // Translate and Rotate canvas around the text center
        ctx.translate(xPos, yPos);
        ctx.rotate(((overlay.rotation || 0) * Math.PI) / 180);

        // Draw multi-line text lines relative to origin 0,0
        const lines = (overlay.text || '').split('\n');
        lines.forEach((line, index) => {
          ctx.fillText(
            line,
            0,
            index * finalFontSize * 1.25 - ((lines.length - 1) * finalFontSize * 0.6)
          );
        });

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(drawFrame);
    };

    // Wait slightly to make sure video seeked
    setTimeout(() => {
      mediaRecorder.start();
      videoEl.play();
      if (exportMusicAudioRef.current && selectedMusic) {
        exportMusicAudioRef.current.play().catch((err) => {
          console.warn("Export music audio playback failed:", err);
        });
      }
      drawFrame();
    }, 500);
  };

  // Capture Frame and Export/Download as Image
  const handleExportFrame = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    // Create export Canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Handle aspect ratios
    let targetWidth = videoEl.videoWidth;
    let targetHeight = videoEl.videoHeight;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = videoEl.videoWidth;
    let sourceHeight = videoEl.videoHeight;

    if (aspectRatio === '9:16') {
      targetWidth = videoEl.videoHeight * (9 / 16);
      targetHeight = videoEl.videoHeight;
      sourceX = (videoEl.videoWidth - targetWidth) / 2;
      sourceWidth = targetWidth;
    } else if (aspectRatio === '1:1') {
      const minDim = Math.min(videoEl.videoWidth, videoEl.videoHeight);
      targetWidth = minDim;
      targetHeight = minDim;
      sourceX = (videoEl.videoWidth - minDim) / 2;
      sourceY = (videoEl.videoHeight - minDim) / 2;
      sourceWidth = minDim;
      sourceHeight = minDim;
    } else if (aspectRatio === '16:9') {
      targetHeight = videoEl.videoWidth * (9 / 16);
      targetWidth = videoEl.videoWidth;
      sourceY = (videoEl.videoHeight - targetHeight) / 2;
      sourceHeight = targetHeight;
    }

    // Set canvas dimensions
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Apply filters to context if supported
    if (ctx.filter !== undefined) {
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;
    }

    // Draw video frame to canvas
    ctx.drawImage(
      videoEl,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, targetWidth, targetHeight
    );

    // Disable filter for drawing overlay text
    if (ctx.filter !== undefined) {
      ctx.filter = 'none';
    }

    // Draw text overlays relative to canvas size
    textOverlays.forEach(overlay => {
      ctx.save();
      ctx.fillStyle = overlay.color;
      // Scale font size according to the canvas width compared to preview container
      const containerBox = containerRef.current.getBoundingClientRect();
      const scaleFactor = targetWidth / containerBox.width;
      const finalFontSize = overlay.fontSize * scaleFactor;

      // Set font family dynamically
      ctx.font = `bold ${finalFontSize}px ${overlay.fontFamily || 'Poppins, sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Compute actual position on canvas
      const xPos = (overlay.x / 100) * targetWidth;
      const yPos = (overlay.y / 100) * targetHeight;

      // Translate and Rotate canvas around the text center
      ctx.translate(xPos, yPos);
      ctx.rotate(((overlay.rotation || 0) * Math.PI) / 180);

      // Draw multi-line text lines relative to origin 0,0
      const lines = (overlay.text || '').split('\n');
      lines.forEach((line, index) => {
        ctx.fillText(
          line,
          0,
          index * finalFontSize * 1.25 - ((lines.length - 1) * finalFontSize * 0.6)
        );
      });

      ctx.restore();
    });

    // Trigger download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${videoFile?.name?.replace(/\.[^/.]+$/, "") || 'talenthub'}_thumbnail.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeTextOverlayObj = textOverlays.find(t => t.id === selectedTextId);

  return (
    <div className="ve-page">
      {/* Hidden music elements */}
      <audio ref={musicAudioRef} src={selectedMusic?.url || ''} loop />
      <audio ref={exportMusicAudioRef} src={selectedMusic?.url || ''} loop crossOrigin="anonymous" />

      {/* Rendering Video Progress Modal */}
      {renderingVideo && (
        <div className="ve-render-modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 5, 10, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(12px)'
        }}>
          <div style={{
            background: '#110c1f',
            border: '1.5px solid rgba(139, 92, 246, 0.3)',
            padding: '36px 30px',
            borderRadius: '24px',
            textAlign: 'center',
            width: '90%',
            maxWidth: '400px',
            boxShadow: '0 15px 50px rgba(0,0,0,0.6)'
          }}>
            <div className="ve-empty-icon" style={{ fontSize: '48px', animation: 'spin 3s linear infinite', marginBottom: '8px' }}>💿</div>
            <h3 style={{ margin: '16px 0 8px', fontSize: '1.25rem', fontWeight: 700 }}>Rendering Video</h3>
            <p style={{ color: '#8b8b9c', fontSize: '0.85rem', margin: '0 0 24px', lineHeight: 1.5 }}>Applying filters, aspect ratios, overlays, and mixing background audio track...</p>
            
            {/* Progress bar */}
            <div style={{ background: 'rgba(255,255,255,0.06)', height: '10px', borderRadius: '99px', overflow: 'hidden', marginBottom: '14px' }}>
              <div style={{ width: `${renderProgress}%`, height: '100%', background: 'linear-gradient(90deg, #7c3aed, #ec4899)', borderRadius: '99px', transition: 'width 0.1s linear' }} />
            </div>
            <div style={{ fontSize: '0.82rem', color: '#a78bfa', fontWeight: 800 }}>{renderProgress}% Completed</div>
          </div>
        </div>
      )}

      {/* Editor Header */}
      <header className="ve-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="ve-back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1 className="ve-header-title">Studio <span>Video Editor</span></h1>
        </div>
        {videoFile && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="ve-export-btn" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)' }} onClick={handleExportVideo} disabled={renderingVideo}>
              {renderingVideo ? `Rendering ${renderProgress}%` : '🎬 Export Video'}
            </button>
            <button className="ve-export-btn" onClick={handleExportFrame} disabled={renderingVideo}>
              📸 Export Thumbnail
            </button>
          </div>
        )}
      </header>

      <div className="ve-body">
        {/* LEFT: Viewport & Timeline */}
        <div className="ve-left-col">
          {videoSrc ? (
            <div className="ve-workspace-area">
              {/* Aspect Ratio Viewport Container */}
              <div 
                ref={containerRef}
                className={`ve-viewport aspect-${aspectRatio.replace(':', '-')}`}
              >
                <video
                  ref={videoRef}
                  src={videoSrc}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onClick={togglePlay}
                  crossOrigin="anonymous"
                  style={{
                    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`
                  }}
                />

                {/* Render Text Overlays on Top */}
                {textOverlays.map(item => (
                  <div
                    key={item.id}
                    className={`ve-text-overlay-item ${selectedTextId === item.id ? 'active' : ''}`}
                    style={{
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      color: item.color,
                      fontSize: `${item.fontSize}px`,
                      fontFamily: item.fontFamily || 'Poppins, sans-serif',
                      transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`,
                      whiteSpace: 'pre-wrap',
                      textAlign: 'center'
                    }}
                    onPointerDown={(e) => handlePointerDown(e, item)}
                  >
                    {item.text}
                    {selectedTextId === item.id && (
                      <button
                        className="ve-text-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTextOverlay(item.id);
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Trimmer Timeline Widget */}
              <div className="ve-timeline-widget">
                <div className="ve-time-display">
                  <span>Current: {currentTime.toFixed(1)}s</span>
                  <span>Trim: {startTime.toFixed(1)}s - {endTime.toFixed(1)}s</span>
                  <span>Duration: {(endTime - startTime).toFixed(1)}s</span>
                </div>

                {/* Trimmer Multi-Range Track */}
                <div className="ve-trimmer-controls">
                  <div className="ve-trim-slider-wrap">
                    <label>Start: </label>
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      step="0.1"
                      value={startTime}
                      onChange={(e) => handleTrimChange('start', e.target.value)}
                    />
                  </div>
                  <div className="ve-trim-slider-wrap">
                    <label>End: </label>
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      step="0.1"
                      value={endTime}
                      onChange={(e) => handleTrimChange('end', e.target.value)}
                    />
                  </div>
                </div>

                {/* Main Playback Bar */}
                <div className="ve-play-row">
                  <button className="ve-play-btn" onClick={togglePlay}>
                    {isPlaying ? '⏸ Pause' : '▶ Play'}
                  </button>
                  <div className="ve-playback-progress">
                    <div 
                      className="ve-playback-fill" 
                      style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Upload Empty State */
            <div className="ve-empty-state" onClick={() => fileInputRef.current.click()}>
              <div className="ve-empty-icon">🎬</div>
              <h3>Select a video to edit</h3>
              <p>Drag and drop or click here to upload your performance (.mp4, .mov, .webm)</p>
              <button className="ve-upload-cta">Browse Video</button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {/* RIGHT: Controls Panels */}
        <div className="ve-right-col">
          {/* Controls Tabs */}
          <div className="ve-tab-buttons">
            <button 
              className={`ve-tab-btn ${activeTab === 'trim' ? 'active' : ''}`}
              onClick={() => setActiveTab('trim')}
            >
              📐 Fit & Trim
            </button>
            <button 
              className={`ve-tab-btn ${activeTab === 'filters' ? 'active' : ''}`}
              onClick={() => setActiveTab('filters')}
            >
              🎨 Filters
            </button>
            <button 
              className={`ve-tab-btn ${activeTab === 'text' ? 'active' : ''}`}
              onClick={() => setActiveTab('text')}
            >
              ✍️ Overlays
            </button>
            <button 
              className={`ve-tab-btn ${activeTab === 'music' ? 'active' : ''}`}
              onClick={() => setActiveTab('music')}
            >
              🎵 Audio
            </button>
          </div>

          <div className="ve-tab-content">
            {/* TAB 1: Aspect Ratio & Trimmer */}
            {activeTab === 'trim' && (
              <div className="ve-trim-panel">
                <h3>Aspect Ratio Crop</h3>
                <p className="ve-panel-help">Choose a format for cropping the layout preview viewport.</p>
                <div className="ve-ratio-grid">
                  {['original', '9:16', '1:1', '16:9'].map(ratio => (
                    <button
                      key={ratio}
                      className={`ve-ratio-btn ${aspectRatio === ratio ? 'active' : ''}`}
                      onClick={() => setAspectRatio(ratio)}
                    >
                      {ratio === 'original' ? 'Original' : ratio === '9:16' ? '📱 9:16 Reels' : ratio === '1:1' ? '🟩 1:1 Square' : '🖥️ 16:9 YouTube'}
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: '24px' }}>
                  <h3>Export Video Quality</h3>
                  <p className="ve-panel-help">Select the resolution and bitrate of the output video.</p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    {[
                      { key: 'low', label: 'Low (480p)' },
                      { key: 'medium', label: 'Medium (720p)' },
                      { key: 'high', label: 'High (Source)' }
                    ].map(q => (
                      <button
                        key={q.key}
                        className={`ve-ratio-btn ${exportQuality === q.key ? 'active' : ''}`}
                        onClick={() => setExportQuality(q.key)}
                        style={{ flex: 1, padding: '10px 4px', fontSize: '0.78rem' }}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <h3>Video Source info</h3>
                  <div className="ve-info-card">
                    <div>Filename: <span style={{ color: '#fff' }}>{videoFile?.name || 'N/A'}</span></div>
                    <div>Duration: <span style={{ color: '#fff' }}>{duration.toFixed(1)}s</span></div>
                    <div>File Size: <span style={{ color: '#fff' }}>{videoFile ? `${(videoFile.size / 1024 / 1024).toFixed(1)} MB` : 'N/A'}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Visual Filters */}
            {activeTab === 'filters' && (
              <div className="ve-filters-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3>CSS Visual Filters</h3>
                  <button className="ve-reset-btn" onClick={resetFilters}>Reset</button>
                </div>

                <div className="ve-filter-control">
                  <div className="ve-filter-label">
                    <span>Brightness</span>
                    <span>{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value))}
                  />
                </div>

                <div className="ve-filter-control">
                  <div className="ve-filter-label">
                    <span>Contrast</span>
                    <span>{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={contrast}
                    onChange={(e) => setContrast(parseInt(e.target.value))}
                  />
                </div>

                <div className="ve-filter-control">
                  <div className="ve-filter-label">
                    <span>Saturation</span>
                    <span>{saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={saturation}
                    onChange={(e) => setSaturation(parseInt(e.target.value))}
                  />
                </div>

                <div className="ve-filter-control">
                  <div className="ve-filter-label">
                    <span>Blur</span>
                    <span>{blur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={blur}
                    onChange={(e) => setBlur(parseInt(e.target.value))}
                  />
                </div>
              </div>
            )}

            {/* TAB 3: Text Overlays */}
            {activeTab === 'text' && (
              <div className="ve-text-panel">
                <h3>Add Text Overlay</h3>
                <div className="ve-text-input-row" style={{ flexDirection: 'column', gap: '8px' }}>
                  <textarea
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="Enter overlay text (Enter key for next line)..."
                    className="ve-text-input"
                    rows="2"
                    style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                  />
                  <button className="ve-add-text-btn" style={{ padding: '10px 16px', width: '100%' }} onClick={addTextOverlay}>
                    ➕ Add Text Overlay
                  </button>
                </div>

                {activeTextOverlayObj ? (
                  <div className="ve-text-editor-box" style={{ marginTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4>Edit Selected Text</h4>
                      <button 
                        className="ve-reset-btn" 
                        style={{ color: '#f43f5e' }}
                        onClick={() => removeTextOverlay(selectedTextId)}
                      >
                        Delete
                      </button>
                    </div>

                    <div className="ve-filter-control" style={{ marginTop: '12px' }}>
                      <div className="ve-filter-label">
                        <span>Text Content</span>
                      </div>
                      <textarea
                        value={activeTextOverlayObj.text}
                        onChange={(e) => updateSelectedText('text', e.target.value)}
                        className="ve-text-input"
                        rows="2"
                        style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div className="ve-filter-control">
                      <div className="ve-filter-label">
                        <span>Font Family</span>
                      </div>
                      <select
                        value={activeTextOverlayObj.fontFamily || 'Poppins, sans-serif'}
                        onChange={(e) => updateSelectedText('fontFamily', e.target.value)}
                        className="ve-text-input"
                        style={{ width: '100%', height: '40px', background: '#090610' }}
                      >
                        <option value="Poppins, sans-serif">Poppins (Sans-serif)</option>
                        <option value="'Playfair Display', serif">Playfair Display (Serif)</option>
                        <option value="'Courier New', monospace">Courier New (Monospace)</option>
                        <option value="Pacifico, cursive">Pacifico (Cursive)</option>
                        <option value="Impact, sans-serif">Impact (Bold Impact)</option>
                      </select>
                    </div>

                    <div className="ve-filter-control">
                      <div className="ve-filter-label">
                        <span>Rotation</span>
                        <span>{activeTextOverlayObj.rotation || 0}°</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={activeTextOverlayObj.rotation || 0}
                        onChange={(e) => updateSelectedText('rotation', parseInt(e.target.value))}
                      />
                    </div>

                    <div className="ve-filter-control">
                      <div className="ve-filter-label">
                        <span>Font Size</span>
                        <span>{activeTextOverlayObj.fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="12"
                        max="64"
                        value={activeTextOverlayObj.fontSize}
                        onChange={(e) => updateSelectedText('fontSize', parseInt(e.target.value))}
                      />
                    </div>

                    <div className="ve-filter-control">
                      <div className="ve-filter-label">
                        <span>Color</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {['#ffffff', '#ffed4a', '#ff4d4d', '#4ade80', '#60a5fa', '#c084fc', '#f472b6'].map(color => (
                          <button
                            key={color}
                            onClick={() => updateSelectedText('color', color)}
                            style={{
                              backgroundColor: color,
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              border: activeTextOverlayObj.color === color ? '2px solid #fff' : '1.5px solid rgba(255,255,255,0.2)',
                              cursor: 'pointer'
                            }}
                          />
                        ))}
                        <input
                          type="color"
                          value={activeTextOverlayObj.color}
                          onChange={(e) => updateSelectedText('color', e.target.value)}
                          style={{
                            border: 'none',
                            background: 'none',
                            width: '26px',
                            height: '26px',
                            cursor: 'pointer'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#475569', fontSize: '0.85rem', marginTop: '16px', textAlign: 'center' }}>
                    Click on any text overlay on the video to customize its size, color, or content. Drag text directly to position it.
                  </p>
                )}

                {textOverlays.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    <h4>Text Layers list</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                      {textOverlays.map(item => (
                        <div 
                          key={item.id} 
                          className={`ve-layer-item ${selectedTextId === item.id ? 'active' : ''}`}
                          onClick={() => setSelectedTextId(item.id)}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            "{item.text}"
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeTextOverlay(item.id); }}
                            style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}
                          >
                            🗑
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Background Music */}
            {activeTab === 'music' && (
              <div className="ve-music-panel">
                <h3>Original Video Volume</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', marginBottom: '24px', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Volume:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={videoVolume}
                    onChange={(e) => setVideoVolume(parseFloat(e.target.value))}
                    style={{ flex: 1, accentColor: '#8B5CF6' }}
                  />
                  <button
                    onClick={() => setVideoMuted(!videoMuted)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '15px'
                    }}
                  >
                    {videoMuted ? '🔇' : '🔊'}
                  </button>
                  <span style={{ fontSize: '12px', color: '#94a3b8', minWidth: '35px', textAlign: 'right' }}>
                    {Math.round(videoVolume * 100)}%
                  </span>
                </div>

                <h3>Background Music</h3>
                <p className="ve-panel-help">Search free royalty-free tracks via Pixabay API.</p>

                <div className="ve-pixabay-key-row">
                  <input
                    type="password"
                    placeholder="Pixabay API Key (Optional)..."
                    value={pixabayKey}
                    onChange={(e) => setPixabayKey(e.target.value)}
                    className="ve-text-input"
                    style={{ fontSize: '12px' }}
                  />
                </div>

                <div className="ve-text-input-row" style={{ marginTop: '10px' }}>
                  <input
                    type="text"
                    placeholder="Search music e.g. lofi, electronic..."
                    value={musicSearch}
                    onChange={(e) => setMusicSearch(e.target.value)}
                    className="ve-text-input"
                  />
                  <button className="ve-add-text-btn" onClick={searchPixabayMusic}>
                    🔍 Find
                  </button>
                </div>

                {selectedMusic && (
                  <div className="ve-music-selected-card" style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 600 }}>SELECTED AUDIO</div>
                        <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>{selectedMusic.name}</div>
                      </div>
                      <button 
                        onClick={() => setSelectedMusic(null)}
                        style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        Remove
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>Volume:</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={musicVolume}
                        onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                        style={{ flex: 1, accentColor: '#8B5CF6' }}
                      />
                      <button
                        onClick={() => setMusicMuted(!musicMuted)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '15px'
                        }}
                      >
                        {musicMuted ? '🔇' : '🔊'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="ve-tracks-list" style={{ marginTop: '20px' }}>
                  <h4>Available Music Tracks</h4>
                  {musicLoading ? (
                    <p style={{ textAlign: 'center', padding: '20px 0', color: '#64748b' }}>Searching tracks...</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                      {musicTracks.map(track => (
                        <div 
                          key={track.id} 
                          className={`ve-track-row ${selectedMusic?.id === track.id ? 'active' : ''}`}
                          onClick={() => handleMusicSelect(track)}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {track.name}
                            </span>
                            <span style={{ color: '#64748b', fontSize: '0.68rem' }}>
                              {track.artist}
                            </span>
                          </div>
                          <span style={{ fontSize: '12px' }}>
                            {selectedMusic?.id === track.id ? '✅ Active' : '➕ Select'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
