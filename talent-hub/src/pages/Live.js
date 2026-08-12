import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Radio, Video, ArrowLeft, Tv, Users, AlertCircle } from 'lucide-react';
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
  const [heroVisible, setHeroVisible] = useState(false);

  const socketRef      = useRef(null);
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStream    = useRef(null);
  const peers          = useRef({});
  const peerRef        = useRef(null);
  const chatEndRef     = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('live-rooms-update', setLiveRooms);
    socket.on('viewer-count',      setViewerCount);
    socket.on('chat-history',      setChat);
    socket.on('chat-message', msg  => setChat(prev => [...prev, msg]));

    socket.on('live-ended', () => {
      setMode('browse'); setActiveRoom(null); setChat([]); setCameraReady(false); stopStream();
    });

    socket.on('viewer-joined', async ({ viewerId }) => {
      if (!localStream.current) return;
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peers.current[viewerId] = pc;
      localStream.current.getTracks().forEach(track => pc.addTrack(track, localStream.current));
      pc.onicecandidate = ({ candidate }) => { if (candidate) socket.emit('webrtc-ice', { to: viewerId, candidate }); };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc-offer', { to: viewerId, offer });
    });

    socket.on('webrtc-offer', async ({ from, offer }) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerRef.current = pc;
      pc.ontrack = (event) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]; };
      pc.onicecandidate = ({ candidate }) => { if (candidate) socket.emit('webrtc-ice', { to: from, candidate }); };
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
      if (pc) { try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {} }
    });

    socket.on('room-not-found', () => { setError('Room not found or stream ended.'); setMode('browse'); });

    fetch(`${SOCKET_URL}/api/live/rooms`).then(r => r.json()).then(setLiveRooms).catch(() => {});

    return () => { socket.disconnect(); stopStream(); };
  }, []);

  useEffect(() => {
    if (mode === 'host' && localStream.current) {
      const trySetVideo = (attempts = 0) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream.current;
          localVideoRef.current.muted     = true;
          localVideoRef.current.play().then(() => setCameraReady(true)).catch(() => {});
        } else if (attempts < 10) {
          setTimeout(() => trySetVideo(attempts + 1), 100);
        }
      };
      setTimeout(() => trySetVideo(), 200);
    }
  }, [mode]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  const stopStream = () => {
    if (localStream.current) { localStream.current.getTracks().forEach(t => t.stop()); localStream.current = null; }
    Object.values(peers.current).forEach(pc => pc.close());
    peers.current = {};
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    setCameraReady(false);
  };

  const handleGoLive = async () => {
    if (!user) { navigate('/login'); return; }
    if (!goLiveForm.title.trim()) { setError('Title required!'); return; }
    setLoading(true); setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: true,
      });
      localStream.current = stream;
      socketRef.current.emit('go-live', { hostId: socketRef.current.id, hostName: user.username, title: goLiveForm.title, category: goLiveForm.category });
      setActiveRoom(socketRef.current.id); setViewerCount(0); setChat([]); setMode('host');
    } catch (err) {
      if (err.name === 'NotReadableError') setError('Camera already in use!');
      else if (err.name === 'NotAllowedError') setError('Camera permission denied!');
      else if (err.name === 'NotFoundError') setError('Camera not found!');
      else setError('Camera error: ' + err.message);
    }
    setLoading(false);
  };

  const handleJoinRoom = (room) => {
    if (!user) { navigate('/login'); return; }
    setActiveRoom(room.roomId); setMode('watch'); setChat([]); setError('');
    socketRef.current.emit('join-room', { roomId: room.roomId, viewerName: user.username });
  };

  const handleEndLive = () => {
    socketRef.current.emit('end-live', { roomId: activeRoom });
    stopStream(); setMode('browse'); setActiveRoom(null); setChat([]);
  };

  const handleLeaveRoom = () => {
    stopStream(); setMode('browse'); setActiveRoom(null); setChat([]);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeRoom) return;
    socketRef.current.emit('chat-message', { roomId: activeRoom, sender: user?.username || 'Guest', message: chatInput.trim() });
    setChatInput('');
  };

  const CATEGORIES = ['Music','Dance','Comedy','Poetry','Acting','Instrumental','Rap','Other'];

  return (
    <div className="live-page">

      <header className="live-topbar">
        <button className="live-back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={15} /> Back
        </button>
        <div className="live-topbar-logo" onClick={() => navigate('/')}>
          TALENT<span className="live-logo-accent">HUB</span>
        </div>
        <div className="live-topbar-badge">
          <span className="live-dot" /> LIVE
        </div>
        {user && (
          <div className="live-topbar-user">
            <div className="live-topbar-avatar">{user.username?.[0]?.toUpperCase()}</div>
            <span>{user.username}</span>
          </div>
        )}
      </header>

      {error && (
        <div className="live-error">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {mode === 'browse' && (
        <div className="live-browse">

          {/* ── COMPACT ANIMATED HERO ── */}
          <div className={`live-hero ${heroVisible ? 'visible' : ''}`}>
            <div className="live-hero-left">
              <div className="live-hero-badge">
                <span className="live-dot" /> Live Stage
              </div>
              <h1 className="live-hero-title">
                Watch <span>Live</span> Performances
              </h1>
              <p className="live-hero-sub">
                Interact via real-time chat and show your support instantly.
              </p>
              <div className="live-hero-stats">
                <span><strong>{liveRooms.length}</strong> streams live</span>
                <span className="live-hero-dot">·</span>
                <span>Real-time WebRTC</span>
              </div>
            </div>
            <div className="live-hero-icon">
              <Radio size={26} className="live-radio-spin" />
            </div>
          </div>

          {/* ── GO LIVE CARD ── */}
          <div className="live-go-live-section">
            <div className="live-go-live-card">
              <div className="live-go-live-top">
                <div className="live-go-live-iconwrap">
                  <Video size={22} />
                </div>
                <div>
                  <h2>Go Live</h2>
                  <p>Share your talent with the world in real-time!</p>
                </div>
              </div>

              <div className="live-coming-soon">
                <div style={{ fontSize: 28, marginBottom: 6 }}>🚀</div>
                <div className="live-coming-title">Coming Soon!</div>
                <div className="live-coming-sub">
                  Live streaming is under active development.<br />
                  Stay tuned — launching very soon! ✨
                </div>
              </div>

              <div className="live-form">
                <input
                  className="live-input"
                  placeholder="Performance title..."
                  value={goLiveForm.title}
                  onChange={e => setGoLiveForm(p => ({ ...p, title: e.target.value }))}
                  disabled
                />
                <select
                  className="live-select"
                  value={goLiveForm.category}
                  onChange={e => setGoLiveForm(p => ({ ...p, category: e.target.value }))}
                  disabled
                >
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <button className="live-go-btn" disabled>🚀 Coming Soon</button>
              </div>
            </div>
          </div>

          {/* ── LIVE ROOMS ── */}
          <div className="live-rooms-section">
            <h2 className="live-rooms-title">
              <span className="live-dot" /> Live Now
              <span className="live-rooms-count">{liveRooms.length} streams</span>
            </h2>

            {liveRooms.length === 0 ? (
              <div className="live-empty">
                <div className="live-empty-icon"><Tv size={28} /></div>
                <h3>No one is live right now</h3>
                <p>There are no active streams at the moment. Keep an eye out for upcoming performances!</p>
              </div>
            ) : (
              <div className="live-rooms-grid">
                {liveRooms.map(room => (
                  <div key={room.roomId} className="live-room-card" onClick={() => handleJoinRoom(room)}>
                    <div className="live-room-thumb">
                      <div className="live-room-gradient">
                        <Radio size={22} color="#fff" className="live-radio-spin" />
                      </div>
                      <span className="live-room-badge">🔴 LIVE</span>
                      <span className="live-room-category">{room.category}</span>
                    </div>
                    <div className="live-room-info">
                      <h3 className="live-room-title-text">{room.title}</h3>
                      <div className="live-room-meta">
                        <span>@{room.hostName}</span>
                        <span><Users size={11} /> {viewerCount} viewing</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* HOST MODE */}
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
              <input className="live-chat-input" placeholder="Chat message..." value={chatInput} onChange={e => setChatInput(e.target.value)} />
              <button type="submit" className="live-chat-send-btn">Send</button>
            </form>
            <button className="live-end-btn" onClick={handleEndLive}>End Live</button>
          </div>
        </div>
      )}

      {/* WATCH MODE */}
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
              <input className="live-chat-input" placeholder="Say something..." value={chatInput} onChange={e => setChatInput(e.target.value)} />
              <button type="submit" className="live-chat-send-btn">Send</button>
            </form>
            <button className="live-end-btn" onClick={handleLeaveRoom}>Leave Room</button>
          </div>
        </div>
      )}
    </div>
  );
}