import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Radio, Video, ArrowLeft, Tv, Users, MessageSquare, AlertCircle } from 'lucide-react';
import './Live.css';

const SOCKET_URL = '';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function Live() {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem('th_user') || 'null');

  const [mode,        setMode]        = useState('browse');
  const [liveRooms,   setLiveRooms]   = useState([]);
  const [activeRoom,  setActiveRoom]  = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [chat,        setChat]        = useState([]);
  const [chatInput,   setChatInput]   = useState('');
  const [goLiveForm,  setGoLiveForm]  = useState({ title: '', category: 'Music' });
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const socketRef      = useRef(null);
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStream    = useRef(null);
  const peers          = useRef({});
  const peerRef        = useRef(null);
  const chatEndRef     = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('live-rooms-update', setLiveRooms);
    socket.on('viewer-count',      setViewerCount);
    socket.on('chat-history',      setChat);
    socket.on('chat-message', msg  => setChat(prev => [...prev, msg]));

    socket.on('live-ended', () => {
      setMode('browse');
      setActiveRoom(null);
      setChat([]);
      setCameraReady(false);
      stopStream();
    });

    socket.on('viewer-joined', async ({ viewerId }) => {
      if (!localStream.current) return;
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peers.current[viewerId] = pc;
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current);
      });
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) socket.emit('webrtc-ice', { to: viewerId, candidate });
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc-offer', { to: viewerId, offer });
    });

    socket.on('webrtc-offer', async ({ from, offer }) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerRef.current = pc;
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) socket.emit('webrtc-ice', { to: from, candidate });
      };
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-answer', { to: from, answer });
    });

    socket.on('webrtc-answer', async ({ from, answer }) => {
      const pc = peers.current[from];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('webrtc-ice', async ({ from, candidate }) => {
      const pc = peers.current[from] || peerRef.current;
      if (pc) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      }
    });

    socket.on('room-not-found', () => {
      setError('Room not found or stream ended.');
      setMode('browse');
    });

    fetch(`${SOCKET_URL}/api/live/rooms`)
      .then(r => r.json())
      .then(setLiveRooms)
      .catch(() => {});

    return () => {
      socket.disconnect();
      stopStream();
    };
  }, []);

  useEffect(() => {
    if (mode === 'host' && localStream.current) {
      const trySetVideo = (attempts = 0) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream.current;
          localVideoRef.current.muted     = true;
          localVideoRef.current.play()
            .then(() => { setCameraReady(true); })
            .catch(err => console.error('Play error:', err));
        } else if (attempts < 10) {
          setTimeout(() => trySetVideo(attempts + 1), 100);
        }
      };
      setTimeout(() => trySetVideo(), 200);
    }
  }, [mode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const stopStream = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }
    Object.values(peers.current).forEach(pc => pc.close());
    peers.current = {};
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    setCameraReady(false);
  };

  const handleGoLive = async () => {
    if (!user)                    { navigate('/login'); return; }
    if (!goLiveForm.title.trim()) { setError('Title required!'); return; }
    setLoading(true);
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      });
      localStream.current = stream;
      socketRef.current.emit('go-live', {
        hostId: socketRef.current.id, hostName: user.username,
        title: goLiveForm.title, category: goLiveForm.category,
      });
      setActiveRoom(socketRef.current.id);
      setViewerCount(0);
      setChat([]);
      setMode('host');
    } catch (err) {
      if (err.name === 'NotReadableError') {
        setError('Camera already in use!');
      } else if (err.name === 'NotAllowedError') {
        setError('Camera permission denied!');
      } else if (err.name === 'NotFoundError') {
        setError('Camera not found!');
      } else {
        setError('Camera error: ' + err.message);
      }
    }
    setLoading(false);
  };

  const handleJoinRoom = (room) => {
    if (!user) { navigate('/login'); return; }
    setActiveRoom(room.roomId);
    setMode('watch');
    setChat([]);
    setError('');
    socketRef.current.emit('join-room', { roomId: room.roomId, viewerName: user.username });
  };

  const handleEndLive = () => {
    socketRef.current.emit('end-live', { roomId: activeRoom });
    stopStream();
    setMode('browse');
    setActiveRoom(null);
    setChat([]);
  };

  const handleLeaveRoom = () => {
    stopStream();
    setMode('browse');
    setActiveRoom(null);
    setChat([]);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeRoom) return;
    socketRef.current.emit('chat-message', {
      roomId: activeRoom, sender: user?.username || 'Guest', message: chatInput.trim(),
    });
    setChatInput('');
  };

  const CATEGORIES = ['Music','Dance','Comedy','Poetry','Acting','Instrumental','Rap','Other'];

  return (
    <div className="live-page">

      <header className="live-topbar">
        <button className="live-back-btn" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="live-topbar-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          TALENT<span className="live-logo-accent">HUB</span>
        </div>
        <div className="live-topbar-badge" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="live-dot" /> LIVE
        </div>
        {user && (
          <div className="live-topbar-user">
            <div className="live-topbar-avatar">{user.username?.[0]?.toUpperCase()}</div>
            <span>{user.username}</span>
          </div>
        )}
      </header>

      {error && <div className="live-error" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '20px auto', maxWidth: '1000px' }}><AlertCircle size={16} /> {error}</div>}

      {mode === 'browse' && (
        <div className="live-browse" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>

          {/* Premium Page Hero */}
          <div className="th-page-hero">
            <div className="th-page-hero-text">
              <h1 className="th-page-hero-title">LIVE <span>STAGE</span></h1>
              <p className="th-page-hero-subtitle">Watch top creators streaming live, interact via real-time chat, and show your support instantly.</p>
            </div>
            <div className="th-page-hero-img-wrap" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '50%', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Radio size={36} className="hs-spin-animation" />
            </div>
          </div>

          <div className="live-go-live-section">
            <div className="live-go-live-card th-premium-card-redesign" style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div className="live-go-live-icon" style={{ display: 'inline-flex', background: 'rgba(139, 92, 246, 0.08)', color: '#8b5cf6', padding: '14px', borderRadius: '50%', marginBottom: '16px' }}>
                <Video size={28} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Go Live</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginBottom: '24px' }}>Share your talent with the world in real-time!</p>

              {/* ✅ COMING SOON BANNER */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(236,72,153,0.03))',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚀</div>
                <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>
                  Coming Soon!
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6 }}>
                  Live streaming feature is currently under active development.<br />
                  Stay tuned — it will be launched very soon! ✨
                </div>
              </div>

              <div className="live-form" style={{ maxWidth: '400px', margin: '0 auto' }}>
                <input
                  className="live-input"
                  placeholder="Performance title..."
                  value={goLiveForm.title}
                  onChange={e => setGoLiveForm(p => ({ ...p, title: e.target.value }))}
                  disabled
                  style={{ opacity: 0.5, cursor: 'not-allowed', width: '100%', marginBottom: '12px' }}
                />
                <select
                  className="live-select"
                  value={goLiveForm.category}
                  onChange={e => setGoLiveForm(p => ({ ...p, category: e.target.value }))}
                  disabled
                  style={{ opacity: 0.5, cursor: 'not-allowed', width: '100%', marginBottom: '16px', borderRadius: '30px' }}
                >
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <button
                  className="live-go-btn"
                  disabled={true}
                  style={{ opacity: 0.6, cursor: 'not-allowed', background: '#333', width: '100%' }}
                >
                  🚀 Coming Soon
                </button>
              </div>
            </div>
          </div>

          <div className="live-rooms-section" style={{ marginTop: '40px' }}>
            <h2 className="live-rooms-title" style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="live-dot" /> Live Now
              <span className="live-rooms-count" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '12px', padding: '3px 10px', borderRadius: '20px' }}>{liveRooms.length} streams</span>
            </h2>

            {liveRooms.length === 0 ? (
              <div className="th-empty-state-illustrated">
                <div className="th-empty-state-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444' }}>
                  <Tv size={32} />
                </div>
                <h3>No one is live right now</h3>
                <p>There are no active streams on the Live Stage at the moment. Keep an eye out for upcoming performance alerts!</p>
              </div>
            ) : (
              <div className="live-rooms-grid">
                {liveRooms.map(room => (
                  <div key={room.roomId} className="live-room-card th-premium-card-redesign" onClick={() => handleJoinRoom(room)}>
                    <div className="live-room-thumb">
                      <div className="live-room-placeholder-gradient">
                        <Radio size={24} color="#fff" className="hs-spin-animation" />
                      </div>
                      <span className="live-room-badge">🔴 LIVE</span>
                      <span className="live-room-category">{room.category}</span>
                    </div>
                    <div className="live-room-info" style={{ padding: '16px' }}>
                      <h3 className="live-room-title-text" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{room.title}</h3>
                      <div className="live-room-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span>@{room.hostName}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={12} /> {viewerCount} viewing</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'host' && (
        <div className="live-studio">
          <div className="live-video-container">
            <video ref={localVideoRef} className="live-video" autoPlay playsInline />
            <div className="live-video-overlay">
              <span className="live-studio-badge">🔴 HOSTING</span>
              <span className="live-studio-title">{goLiveForm.title}</span>
              <span className="live-studio-viewers">👁 {viewerCount} viewers</span>
            </div>
          </div>
          <div className="live-sidebar">
            <div className="live-chat-header">Live Chat</div>
            <div className="live-chat-messages">
              {chat.map((msg, i) => (
                <div key={i} className="live-chat-msg">
                  <span className="live-chat-sender">{msg.sender}:</span>
                  <span className="live-chat-text">{msg.message}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form className="live-chat-input-row" onSubmit={handleSendChat}>
              <input
                className="live-chat-input"
                placeholder="Chat message..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
              />
              <button type="submit" className="live-chat-send-btn">Send</button>
            </form>
            <button className="live-end-btn" onClick={handleEndLive}>End Live</button>
          </div>
        </div>
      )}

      {mode === 'watch' && (
        <div className="live-studio">
          <div className="live-video-container">
            <video ref={remoteVideoRef} className="live-video" autoPlay playsInline />
            <div className="live-video-overlay">
              <span className="live-studio-badge">🔴 LIVE</span>
              <span className="live-studio-viewers">👁 {viewerCount} viewing</span>
            </div>
          </div>
          <div className="live-sidebar">
            <div className="live-chat-header">Live Chat</div>
            <div className="live-chat-messages">
              {chat.map((msg, i) => (
                <div key={i} className="live-chat-msg">
                  <span className="live-chat-sender">{msg.sender}:</span>
                  <span className="live-chat-text">{msg.message}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form className="live-chat-input-row" onSubmit={handleSendChat}>
              <input
                className="live-chat-input"
                placeholder="Say something..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
              />
              <button type="submit" className="live-chat-send-btn">Send</button>
            </form>
            <button className="live-end-btn" onClick={handleLeaveRoom}>Leave Room</button>
          </div>
        </div>
      )}
    </div>
  );
}