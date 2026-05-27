import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import './Live.css';

const SOCKET_URL = 'https://talenthub-w1cc.onrender.com';

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

  // ── SOCKET SETUP ──
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

    // Host — viewer joined, send offer
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

    // Viewer — receive offer
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

  // ✅ Camera ko mode change hone ke BAAD set karo
  useEffect(() => {
    if (mode === 'host' && localStream.current) {
      const trySetVideo = (attempts = 0) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream.current;
          localVideoRef.current.muted     = true;
          localVideoRef.current.play()
            .then(() => {
              console.log('✅ Camera working!');
              setCameraReady(true);
            })
            .catch(err => console.error('Play error:', err));
        } else if (attempts < 10) {
          // DOM mount nahi hua — 100ms baad retry
          setTimeout(() => trySetVideo(attempts + 1), 100);
        }
      };
      setTimeout(() => trySetVideo(), 200);
    }
  }, [mode]);

  // Chat auto scroll
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

  // ── GO LIVE ──
  const handleGoLive = async () => {
    if (!user)                    { navigate('/login'); return; }
    if (!goLiveForm.title.trim()) { setError('Title required!'); return; }

    setLoading(true);
    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:      { ideal: 1280 },
          height:     { ideal: 720 },
          facingMode: 'user',
        },
        audio: true,
      });

      console.log('✅ Stream got:', stream.getTracks());
      localStream.current = stream;

      socketRef.current.emit('go-live', {
        hostId:   socketRef.current.id,
        hostName: user.username,
        title:    goLiveForm.title,
        category: goLiveForm.category,
      });

      setActiveRoom(socketRef.current.id);
      setViewerCount(0);
      setChat([]);
      setMode('host'); // ← last mein — useEffect trigger karega
    } catch (err) {
      console.error('Camera error:', err.name, err.message);
      if (err.name === 'NotReadableError') {
        setError('❌ Camera already in use! Zoom/Teams/OBS band karo phir try karo.');
      } else if (err.name === 'NotAllowedError') {
        setError('❌ Camera permission denied! Browser mein Allow karo.');
      } else if (err.name === 'NotFoundError') {
        setError('❌ Camera not found! Check karo camera connected hai.');
      } else if (err.name === 'OverconstrainedError') {
        // Retry with basic constraints
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          localStream.current = stream;
          socketRef.current.emit('go-live', {
            hostId:   socketRef.current.id,
            hostName: user.username,
            title:    goLiveForm.title,
            category: goLiveForm.category,
          });
          setActiveRoom(socketRef.current.id);
          setViewerCount(0);
          setChat([]);
          setMode('host');
        } catch (e2) {
          setError('❌ Camera error: ' + e2.message);
        }
      } else {
        setError('❌ Camera error: ' + err.message);
      }
    }
    setLoading(false);
  };

  // ── JOIN ROOM ──
  const handleJoinRoom = (room) => {
    if (!user) { navigate('/login'); return; }
    setActiveRoom(room.roomId);
    setMode('watch');
    setChat([]);
    setError('');

    socketRef.current.emit('join-room', {
      roomId:     room.roomId,
      viewerName: user.username,
    });
  };

  // ── END LIVE ──
  const handleEndLive = () => {
    socketRef.current.emit('end-live', { roomId: activeRoom });
    stopStream();
    setMode('browse');
    setActiveRoom(null);
    setChat([]);
  };

  // ── LEAVE ROOM ──
  const handleLeaveRoom = () => {
    stopStream();
    setMode('browse');
    setActiveRoom(null);
    setChat([]);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  // ── SEND CHAT ──
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeRoom) return;
    socketRef.current.emit('chat-message', {
      roomId:  activeRoom,
      sender:  user?.username || 'Guest',
      message: chatInput.trim(),
    });
    setChatInput('');
  };

  const CATEGORIES = ['Music','Dance','Comedy','Poetry','Acting','Instrumental','Rap','Other'];

  return (
    <div className="live-page">

      {/* TOPBAR */}
      <header className="live-topbar">
        <button className="live-back-btn" onClick={() => navigate('/')}>← Back</button>
        <div className="live-topbar-logo" onClick={() => navigate('/')}>
          TALENT<span>HUB</span>
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

      {/* ERROR */}
      {error && <div className="live-error">⚠️ {error}</div>}

      {/* ── BROWSE MODE ── */}
      {mode === 'browse' && (
        <div className="live-browse">
          <div className="live-go-live-section">
            <div className="live-go-live-card">
              <div className="live-go-live-icon">🎥</div>
              <h2>Go Live</h2>
              <p>Share your talent with the world in real-time!</p>
              <div className="live-form">
                <input
                  className="live-input"
                  placeholder="Performance title..."
                  value={goLiveForm.title}
                  onChange={e => setGoLiveForm(p => ({ ...p, title: e.target.value }))}
                />
                <select
                  className="live-select"
                  value={goLiveForm.category}
                  onChange={e => setGoLiveForm(p => ({ ...p, category: e.target.value }))}
                >
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <button
                  className="live-go-btn"
                  onClick={handleGoLive}
                  disabled={loading}
                >
                  {loading ? '⏳ Starting...' : '🔴 Go Live Now'}
                </button>
              </div>
            </div>
          </div>

          <div className="live-rooms-section">
            <h2 className="live-rooms-title">
              🔴 Live Now
              <span className="live-rooms-count">{liveRooms.length} streams</span>
            </h2>

            {liveRooms.length === 0 ? (
              <div className="live-empty">
                <div className="live-empty-icon">📡</div>
                <h3>No one is live right now</h3>
                <p>Be the first to go live and share your talent!</p>
              </div>
            ) : (
              <div className="live-rooms-grid">
                {liveRooms.map(room => (
                  <div key={room.roomId} className="live-room-card">
                    <div className="live-room-preview">
                      <div className="live-room-placeholder">🎭</div>
                      <div className="live-room-badge">
                        <span className="live-dot" /> LIVE
                      </div>
                      <div className="live-room-viewers">
                        👁 {room.viewers} watching
                      </div>
                    </div>
                    <div className="live-room-info">
                      <div className="live-room-title">{room.title}</div>
                      <div className="live-room-host">
                        <div className="live-room-host-avatar">
                          {room.hostName?.[0]?.toUpperCase()}
                        </div>
                        <span>{room.hostName}</span>
                        <span className="live-room-cat">{room.category}</span>
                      </div>
                      <button
                        className="live-join-btn"
                        onClick={() => handleJoinRoom(room)}
                      >
                        ▶ Join Stream
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HOST MODE ── */}
      {mode === 'host' && (
        <div className="live-stream-layout">
          <div className="live-stream-main">

            <div className="live-stream-header">
              <div className="live-stream-status">
                <span className="live-dot" /> LIVE
              </div>
              <div className="live-stream-title">{goLiveForm.title}</div>
              <div className="live-stream-viewers">👁 {viewerCount} viewers</div>
              <button className="live-end-btn" onClick={handleEndLive}>
                ⏹ End Stream
              </button>
            </div>

            <div className="live-video-wrap">
              {/* ✅ Camera loading state */}
              {!cameraReady && (
                <div className="live-camera-loading">
                  <div className="live-camera-spinner" />
                  <p>Starting camera...</p>
                </div>
              )}
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="live-video"
                style={{ display: cameraReady ? 'block' : 'none' }}
              />
              <div className="live-video-label">You (Host)</div>
            </div>

            <div className="live-stream-stats">
              <div className="live-stat">👁 {viewerCount} watching</div>
              <div className="live-stat">💬 {chat.length} messages</div>
              <div className="live-stat">🎭 {goLiveForm.category}</div>
            </div>
          </div>

          <div className="live-chat">
            <div className="live-chat-header">💬 Live Chat</div>
            <div className="live-chat-messages">
              {chat.length === 0 ? (
                <div className="live-chat-empty">No messages yet...</div>
              ) : (
                chat.map(msg => (
                  <div key={msg.id} className="live-chat-msg">
                    <span className="live-chat-sender">{msg.sender}</span>
                    <span className="live-chat-text">{msg.message}</span>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <form className="live-chat-form" onSubmit={handleSendChat}>
              <input
                className="live-chat-input"
                placeholder="Say something..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
              />
              <button type="submit" className="live-chat-send">↑</button>
            </form>
          </div>
        </div>
      )}

      {/* ── WATCH MODE ── */}
      {mode === 'watch' && (
        <div className="live-stream-layout">
          <div className="live-stream-main">

            <div className="live-stream-header">
              <button className="live-back-btn" onClick={handleLeaveRoom}>← Leave</button>
              <div className="live-stream-status">
                <span className="live-dot" /> LIVE
              </div>
              <div className="live-stream-viewers">👁 {viewerCount} watching</div>
            </div>

            <div className="live-video-wrap">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="live-video"
              />
              <div className="live-video-label">Live Stream</div>
            </div>
          </div>

          <div className="live-chat">
            <div className="live-chat-header">💬 Live Chat</div>
            <div className="live-chat-messages">
              {chat.length === 0 ? (
                <div className="live-chat-empty">No messages yet...</div>
              ) : (
                chat.map(msg => (
                  <div key={msg.id} className={`live-chat-msg${msg.sender === user?.username ? ' own' : ''}`}>
                    <span className="live-chat-sender">{msg.sender}</span>
                    <span className="live-chat-text">{msg.message}</span>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <form className="live-chat-form" onSubmit={handleSendChat}>
              <input
                className="live-chat-input"
                placeholder="Say something..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
              />
              <button type="submit" className="live-chat-send">↑</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
