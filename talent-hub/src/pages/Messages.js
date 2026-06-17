import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import './Messages.css';

const API    = '/api';
const SOCKET = '';

export default function Messages() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('th_token');
  const me    = JSON.parse(localStorage.getItem('th_user') || 'null');

  const [conversations, setConversations]   = useState([]);
  const [activeConv,    setActiveConv]      = useState(null); // { userId, username }
  const [messages,      setMessages]        = useState([]);
  const [newMsg,        setNewMsg]          = useState('');
  const [loading,       setLoading]         = useState(true);
  const [msgLoading,    setMsgLoading]      = useState(false);
  const [sending,       setSending]         = useState(false);
  const [searchQuery,   setSearchQuery]     = useState('');
  const [searchUsers,   setSearchUsers]     = useState([]);
  const [searching,     setSearching]       = useState(false);
  const [onlineUsers,   setOnlineUsers]     = useState(new Set());

  const socketRef  = useRef(null);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  // ── Socket.io setup ───────────────────────────────────
  useEffect(() => {
    if (!token || !me) { navigate('/login'); return; }

    const socket = io(SOCKET, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('user-online', { userId: me._id });
    });

    socket.on('online-users', (users) => {
      setOnlineUsers(new Set(users));
    });

    socket.on('user-online',  ({ userId }) => setOnlineUsers(prev => new Set([...prev, userId])));
    socket.on('user-offline', ({ userId }) => setOnlineUsers(prev => { const s = new Set(prev); s.delete(userId); return s; }));

    socket.on('new-message', (msg) => {
      // If message is for active conversation, add it
      setMessages(prev => {
        const alreadyExists = prev.some(m => m._id === msg._id);
        if (alreadyExists) return prev;
        return [...prev, msg];
      });

      // Update conversation list
      setConversations(prev => {
        const exists = prev.find(c => c.userId === msg.sender._id?.toString() || c.userId === msg.sender);
        if (exists) {
          return prev.map(c =>
            (c.userId === msg.sender._id?.toString() || c.userId === msg.sender)
              ? { ...c, lastMsg: msg.text, lastTime: msg.createdAt, unread: c.unread + 1 }
              : c
          );
        }
        return [{
          userId:   msg.sender._id || msg.sender,
          username: msg.senderName || 'Unknown',
          lastMsg:  msg.text,
          lastTime: msg.createdAt,
          unread:   1,
        }, ...prev];
      });
    });

    socket.on('message-sent', (msg) => {
      setMessages(prev => {
        const alreadyExists = prev.some(m => m._id === msg._id);
        if (alreadyExists) return prev;
        return [...prev, msg];
      });
      setSending(false);
    });

    return () => { socket.disconnect(); };
  }, [token]);

  // ── Fetch conversations ───────────────────────────────
  useEffect(() => {
    fetchConversations();
  }, []);

  // ── Handle startChat from Saved page ─────────────────
  useEffect(() => {
    if (location.state?.startChat) {
      const p = location.state.startChat;
      openConversation({ userId: p._id, username: p.username });
    }
  }, [location.state]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch { setConversations([]); }
    setLoading(false);
  };

  const openConversation = useCallback(async (conv) => {
    setActiveConv(conv);
    setMsgLoading(true);
    setMessages([]);
    setSearchQuery('');
    setSearchUsers([]);

    // Mark as read in UI
    setConversations(prev => prev.map(c =>
      c.userId === conv.userId ? { ...c, unread: 0 } : c
    ));

    // Join socket room
    if (socketRef.current) {
      socketRef.current.emit('join-dm', {
        myId:    me._id,
        otherId: conv.userId,
      });
    }

    try {
      const res  = await fetch(`${API}/messages/${conv.userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch { setMessages([]); }
    setMsgLoading(false);

    // Add to conversations if not already there
    setConversations(prev => {
      const exists = prev.find(c => c.userId === conv.userId);
      if (!exists) return [{ ...conv, lastMsg: '', lastTime: new Date(), unread: 0 }, ...prev];
      return prev;
    });

    setTimeout(() => inputRef.current?.focus(), 100);
  }, [me, token]);

  // ── Auto scroll to bottom ─────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Search users ──────────────────────────────────────
  useEffect(() => {
    if (searchQuery.trim().length < 1) { setSearchUsers([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res  = await fetch(`${API}/messages/users/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setSearchUsers(Array.isArray(data) ? data : []);
      } catch { setSearchUsers([]); }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Send message ──────────────────────────────────────
  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConv || sending) return;
    const text = newMsg.trim();
    setNewMsg('');
    setSending(true);

    // Optimistic UI
    const optimistic = {
      _id:       `opt-${Date.now()}`,
      sender:    { _id: me._id, username: me.username },
      receiver:  { _id: activeConv.userId, username: activeConv.username },
      text,
      createdAt: new Date().toISOString(),
      optimistic: true,
    };
    setMessages(prev => [...prev, optimistic]);

    // Update conversation list
    setConversations(prev => prev.map(c =>
      c.userId === activeConv.userId
        ? { ...c, lastMsg: text, lastTime: new Date().toISOString() }
        : c
    ));

    // Send via socket
    if (socketRef.current?.connected) {
      socketRef.current.emit('send-dm', {
        senderId:   me._id,
        senderName: me.username,
        receiverId: activeConv.userId,
        text,
        token,
      });
    } else {
      // REST fallback
      try {
        const res = await fetch(`${API}/messages/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ receiverId: activeConv.userId, text }),
        });
        const msg = await res.json();
        setMessages(prev => prev.map(m => m._id === optimistic._id ? msg : m));
      } catch {}
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const deleteConversation = async (userId) => {
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await fetch(`${API}/messages/conversation/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(prev => prev.filter(c => c.userId !== userId));
      if (activeConv?.userId === userId) { setActiveConv(null); setMessages([]); }
    } catch {}
  };

  const formatTime = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const now  = new Date();
    const diff = (now - date) / 1000;
    if (diff < 60)     return 'now';
    if (diff < 3600)   return `${Math.floor(diff/60)}m`;
    if (diff < 86400)  return `${Math.floor(diff/3600)}h`;
    if (diff < 604800) return `${Math.floor(diff/86400)}d`;
    return date.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
  };

  const formatMsgTime = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12: true });
  };

  const isOnline = (userId) => onlineUsers.has(userId?.toString());

  if (!me) return null;

  return (
    <div className="msg-page">

      {/* ── LEFT: Conversations ── */}
      <div className="msg-sidebar">
        <div className="msg-sidebar-header">
          <h2 className="msg-sidebar-title">💬 Messages</h2>
          <span className="msg-conv-count">{conversations.length}</span>
        </div>

        {/* Search */}
        <div className="msg-search-wrap">
          <input
            className="msg-search"
            placeholder="🔍 Search or start new chat..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="msg-search-clear" onClick={() => { setSearchQuery(''); setSearchUsers([]); }}>✕</button>
          )}
        </div>

        {/* Search results */}
        {searchUsers.length > 0 && (
          <div className="msg-search-results">
            <div className="msg-search-label">Start new chat:</div>
            {searchUsers.map(u => (
              <div
                key={u._id}
                className="msg-search-user"
                onClick={() => {
                  openConversation({ userId: u._id, username: u.username });
                  setSearchQuery(''); setSearchUsers([]);
                }}
              >
                <div className="msg-search-avatar">{u.username[0].toUpperCase()}</div>
                <span>{u.username}</span>
                {isOnline(u._id) && <span className="msg-online-dot" />}
              </div>
            ))}
          </div>
        )}

        {/* Conversation list */}
        <div className="msg-conv-list">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="msg-conv-skeleton" />)
          ) : conversations.length === 0 && !searchQuery ? (
            <div className="msg-no-conv">
              <div style={{fontSize:40,marginBottom:10}}>💬</div>
              <p>No conversations yet</p>
              <span>Search for a user above to start chatting</span>
            </div>
          ) : conversations.map(conv => (
            <div
              key={conv.userId}
              className={`msg-conv-item${activeConv?.userId === conv.userId ? ' active' : ''}`}
              onClick={() => openConversation(conv)}
            >
              <div className="msg-conv-avatar-wrap">
                <div className="msg-conv-avatar">{conv.username?.[0]?.toUpperCase() || '?'}</div>
                {isOnline(conv.userId) && <span className="msg-online-indicator" />}
              </div>
              <div className="msg-conv-info">
                <div className="msg-conv-name">{conv.username}</div>
                <div className="msg-conv-last">{conv.lastMsg?.slice(0,35)}{conv.lastMsg?.length > 35 ? '...' : ''}</div>
              </div>
              <div className="msg-conv-right">
                <div className="msg-conv-time">{formatTime(conv.lastTime)}</div>
                {conv.unread > 0 && <div className="msg-unread-badge">{conv.unread}</div>}
              </div>
              <button
                className="msg-delete-conv"
                onClick={e => { e.stopPropagation(); deleteConversation(conv.userId); }}
                title="Delete conversation"
              >🗑</button>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Chat window ── */}
      <div className="msg-chat">
        {!activeConv ? (
          <div className="msg-no-chat">
            <div className="msg-no-chat-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Choose from existing chats or search for someone new</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="msg-chat-header">
              <button className="msg-back-btn" onClick={() => setActiveConv(null)}>←</button>
              <div className="msg-chat-avatar-wrap">
                <div className="msg-chat-avatar">{activeConv.username?.[0]?.toUpperCase()}</div>
                {isOnline(activeConv.userId) && <span className="msg-online-indicator" />}
              </div>
              <div className="msg-chat-info">
                <div className="msg-chat-name">{activeConv.username}</div>
                <div className="msg-chat-status">
                  {isOnline(activeConv.userId) ? '🟢 Online' : '⚫ Offline'}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="msg-messages">
              {msgLoading ? (
                <div className="msg-loading">
                  <div className="msg-spinner" />
                  <span>Loading messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="msg-empty-chat">
                  <div style={{fontSize:40,marginBottom:10}}>👋</div>
                  <p>Say hi to <strong>{activeConv.username}</strong>!</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => {
                    const isMine = msg.sender?._id === me._id || msg.sender === me._id;
                    const showAvatar = !isMine && (i === 0 || messages[i-1]?.sender?._id !== msg.sender?._id);
                    return (
                      <div key={msg._id} className={`msg-bubble-wrap ${isMine ? 'mine' : 'theirs'}`}>
                        {!isMine && showAvatar && (
                          <div className="msg-bubble-avatar">
                            {activeConv.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                        {!isMine && !showAvatar && <div className="msg-bubble-avatar-spacer" />}
                        <div className={`msg-bubble ${isMine ? 'msg-mine' : 'msg-theirs'} ${msg.optimistic ? 'msg-optimistic' : ''}`}>
                          <span className="msg-text">{msg.text}</span>
                          <span className="msg-time">{formatMsgTime(msg.createdAt)}</span>
                          {isMine && <span className="msg-read">{msg.read ? '✓✓' : '✓'}</span>}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="msg-input-wrap">
              <textarea
                ref={inputRef}
                className="msg-input"
                placeholder={`Message ${activeConv.username}...`}
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={1000}
              />
              <button
                className="msg-send-btn"
                onClick={sendMessage}
                disabled={!newMsg.trim() || sending}
              >
                {sending ? '⏳' : '➤'}
              </button>
            </div>
            <div className="msg-input-hint">Enter to send · Shift+Enter for new line</div>
          </>
        )}
      </div>
    </div>
  );
}
