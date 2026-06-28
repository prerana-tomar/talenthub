import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Following.css';

const API = 'https://talenthub-w1cc.onrender.com/api/auth';

export default function Following() {
  const navigate = useNavigate();
  const token = localStorage.getItem('th_token');
  const me    = JSON.parse(localStorage.getItem('th_user') || 'null');

  const [activeTab,   setActiveTab]   = useState('following');
  const [following,   setFollowing]   = useState([]);
  const [followers,   setFollowers]   = useState([]);
  const [allUsers,    setAllUsers]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState('');
  const [search,      setSearch]      = useState('');
  const [followingIds, setFollowingIds] = useState(new Set());

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [fwRes, frRes, usRes] = await Promise.all([
        fetch(`${API}/following`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/followers`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/users`,     { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const fw = await fwRes.json();
      const fr = await frRes.json();
      const us = await usRes.json();

      const fwArr = Array.isArray(fw) ? fw : [];
      const frArr = Array.isArray(fr) ? fr : [];
      const usArr = Array.isArray(us) ? us : [];

      setFollowing(fwArr);
      setFollowers(frArr);
      setAllUsers(usArr);

      // Build set of IDs I follow
      const ids = new Set(fwArr.map(u => u._id?.toString() || u.toString()));
      setFollowingIds(ids);
    } catch {}
    setLoading(false);
  };

  const handleFollow = async (userId, username) => {
    if (!token) { navigate('/login'); return; }
    try {
      const res  = await fetch(`${API}/follow/${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        if (data.following) {
          setFollowingIds(prev => new Set([...prev, userId]));
          // Add to following list
          const user = allUsers.find(u => u._id === userId) ||
                       followers.find(u => u._id === userId);
          if (user) setFollowing(prev => [...prev, user]);
          showToast(`✅ Following ${username}`);
        } else {
          setFollowingIds(prev => { const s = new Set(prev); s.delete(userId); return s; });
          setFollowing(prev => prev.filter(u => u._id !== userId));
          showToast(`➖ Unfollowed ${username}`);
        }
      }
    } catch { showToast('❌ Error'); }
  };

  const fmt = (n) => {
    if (!n) return '0';
    if (n >= 1000) return `${(n/1000).toFixed(1)}K`;
    return n.toString();
  };

  // Filter for discover tab
  const discoverUsers = allUsers.filter(u => {
    const notMe      = u._id !== me?._id && u._id !== me?.id;
    const matchSearch = !search || u.username?.toLowerCase().includes(search.toLowerCase());
    return notMe && matchSearch;
  });

  const filteredFollowing = following.filter(u =>
    !search || u.username?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredFollowers = followers.filter(u =>
    !search || u.username?.toLowerCase().includes(search.toLowerCase())
  );

  const UserCard = ({ user, showFollowBack = false }) => {
    const uid       = user._id?.toString();
    const isFollowing_ = followingIds.has(uid);

    return (
      <div className="fw-user-card">
        <div className="fw-user-avatar">
          {user.username?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="fw-user-info">
          <div className="fw-user-name">{user.username}</div>
          {user.bio && (
            <div className="fw-user-bio">{user.bio.slice(0,70)}{user.bio.length>70?'...':''}</div>
          )}
          <div className="fw-user-meta">
            {user.category && <span className="fw-cat-tag">{user.category}</span>}
            <span>👥 {fmt(user.followers?.length || 0)} followers</span>
          </div>
        </div>
        <div className="fw-user-actions">
          <button
            className={`fw-follow-btn${isFollowing_ ? ' following' : ''}`}
            onClick={() => handleFollow(uid, user.username)}
          >
            {isFollowing_ ? '✓ Following' : showFollowBack ? '↩ Follow Back' : '+ Follow'}
          </button>
          <button
            className="fw-msg-btn"
            onClick={() => navigate('/messages', { state: { startChat: { _id: uid, username: user.username } } })}
            title="Send message"
          >💬</button>
        </div>
      </div>
    );
  };

  return (
    <div className="fw-page">
      {toast && <div className="fw-toast">{toast}</div>}

      {/* Header */}
      <div className="fw-header">
        <div>
          <h1 className="fw-title">👥 My Network</h1>
          <p className="fw-sub">People you follow and your followers</p>
        </div>
        <button className="fw-find-btn" onClick={() => setActiveTab('discover')}>
          🔍 Find Performers
        </button>
      </div>

      {/* Stats */}
      <div className="fw-stats">
        <div className={`fw-stat-box${activeTab==='following'?' active':''}`} onClick={() => setActiveTab('following')}>
          <div className="fw-stat-val">{following.length}</div>
          <div className="fw-stat-label">FOLLOWING</div>
        </div>
        <div className={`fw-stat-box${activeTab==='followers'?' active':''}`} onClick={() => setActiveTab('followers')}>
          <div className="fw-stat-val">{followers.length}</div>
          <div className="fw-stat-label">FOLLOWERS</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="fw-tabs">
        {[
          { id:'following', label:`Following (${following.length})` },
          { id:'followers', label:`Followers (${followers.length})` },
          { id:'discover',  label:'🔍 Discover' },
        ].map(t => (
          <button
            key={t.id}
            className={`fw-tab${activeTab===t.id?' active':''}`}
            onClick={() => setActiveTab(t.id)}
          >{t.label}</button>
        ))}
      </div>

      {/* Search */}
      <div className="fw-search-wrap">
        <input
          className="fw-search"
          placeholder="🔍 Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button className="fw-search-clear" onClick={() => setSearch('')}>✕</button>}
      </div>

      {/* Content */}
      {loading ? (
        <div className="fw-list">
          {[1,2,3].map(i => <div key={i} className="fw-skeleton" />)}
        </div>
      ) : (
        <>
          {/* FOLLOWING TAB */}
          {activeTab === 'following' && (
            filteredFollowing.length === 0 ? (
              <div className="fw-empty">
                <div className="fw-empty-icon">🔍</div>
                <h3>{search ? 'No results found' : 'Not following anyone yet'}</h3>
                <p>{search ? 'Try a different name' : 'Explore and follow talented performers!'}</p>
                {!search && (
                  <button className="fw-explore-btn" onClick={() => setActiveTab('discover')}>
                    🌟 Discover Performers
                  </button>
                )}
              </div>
            ) : (
              <div className="fw-list">
                {filteredFollowing.map(u => <UserCard key={u._id} user={u} />)}
              </div>
            )
          )}

          {/* FOLLOWERS TAB */}
          {activeTab === 'followers' && (
            filteredFollowers.length === 0 ? (
              <div className="fw-empty">
                <div className="fw-empty-icon">👥</div>
                <h3>{search ? 'No results found' : 'No followers yet'}</h3>
                <p>{search ? 'Try a different name' : 'Upload performances to gain followers!'}</p>
                {!search && (
                  <button className="fw-explore-btn" onClick={() => navigate('/upload')}>
                    ⬆ Upload Performance
                  </button>
                )}
              </div>
            ) : (
              <div className="fw-list">
                {filteredFollowers.map(u => (
                  <UserCard
                    key={u._id}
                    user={u}
                    showFollowBack={!followingIds.has(u._id?.toString())}
                  />
                ))}
              </div>
            )
          )}

          {/* DISCOVER TAB */}
          {activeTab === 'discover' && (
            discoverUsers.length === 0 ? (
              <div className="fw-empty">
                <div className="fw-empty-icon">🌟</div>
                <h3>{search ? 'No performers found' : 'No performers yet'}</h3>
                <p>Be the first to join TalentHub!</p>
              </div>
            ) : (
              <div className="fw-list">
                {discoverUsers.map(u => <UserCard key={u._id} user={u} />)}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
