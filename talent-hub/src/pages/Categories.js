import React, { useState, useEffect } from 'react';
import { Feather, Palette, Sparkles, Compass, ArrowLeft } from 'lucide-react';
import { MusicianIcon, DancerIcon, ComedianIcon } from '../components/PerformerIcons';
import API from '../config';
import './Categories.css';

const CATEGORY_META = {
  Music:   { icon: MusicianIcon,  custom: true,  color: '#7c3aed', glow: '#c4b5fd', desc: 'Songs, covers, and original compositions' },
  Dance:   { icon: DancerIcon,    custom: true,  color: '#ec4899', glow: '#fda4af', desc: 'Classical, contemporary, and freestyle moves' },
  Comedy:  { icon: ComedianIcon,  custom: true,  color: '#f59e0b', glow: '#fdba74', desc: 'Stand-up, skits, and funny performances' },
  Poetry:  { icon: Feather,       custom: false, color: '#06b6d4', desc: 'Spoken word, shayari, and literary art' },
  Art:     { icon: Palette,       custom: false, color: '#10b981', desc: 'Visual art, sketching, and creative work' },
  Other:   { icon: Sparkles,      custom: false, color: '#8b5cf6', desc: 'Unique talents that defy categories' },
};

function CategoryIcon({ meta, size, active }) {
  const IconComponent = meta.icon;
  if (meta.custom) return <IconComponent size={size} accent={meta.color} glow={meta.glow} active={active} />;
  return <IconComponent size={size} />;
}

export default function Categories() {
  const [selected,    setSelected]    = useState(null);
  const [videos,      setVideos]      = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [stats,       setStats]       = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [visible,     setVisible]     = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => { fetchCategoryStats(); }, []);
  useEffect(() => { if (selected) fetchVideosByCategory(selected); }, [selected]);

  const fetchCategoryStats = async () => {
    try {
      const res  = await fetch(`${API}/api/videos/category-stats`);
      const data = await res.json();
      setStats(data || {});
    } catch {}
  };

  const fetchVideosByCategory = async (cat) => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/videos?category=${cat}`);
      const data = await res.json();
      setVideos(data.videos || data || []);
    } catch { setVideos([]); }
    finally   { setLoading(false); }
  };

  const formatViews = (n) => {
    if (!n) return '0';
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  /* ── DETAIL VIEW ── */
  if (selected) {
    const meta = CATEGORY_META[selected];
    return (
      <div className="categories-page">
        <button className="back-btn" onClick={() => { setSelected(null); setVideos([]); }}>
          <ArrowLeft size={15} /> Back to Categories
        </button>

        <div className={`cat-detail-hero ${visible ? 'visible' : ''}`} style={{ '--cat-color': meta.color }}>
          <div className="cat-detail-hero-icon" style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}33` }}>
            <CategoryIcon meta={meta} size={32} active={true} />
          </div>
          <div>
            <h1 className="cat-detail-title">
              {selected} <span style={{ color: meta.color }}>Performances</span>
            </h1>
            <p className="cat-detail-sub">{meta.desc}</p>
          </div>
        </div>

        {loading ? (
          <div className="video-grid">
            {[1,2,3,4,5,6].map(i => <div key={i} className="video-skeleton" />)}
          </div>
        ) : videos.length === 0 ? (
          <div className="cat-empty">
            <div className="cat-empty-icon" style={{ background: `${meta.color}15`, color: meta.color }}>
              <CategoryIcon meta={meta} size={28} active={false} />
            </div>
            <h3>No videos yet in {selected}</h3>
            <p>Be the first creator to upload in this category!</p>
            <button className="cat-upload-btn" style={{ background: meta.color }} onClick={() => window.location.href = '/upload'}>
              Upload Performance
            </button>
          </div>
        ) : (
          <div className="video-grid">
            {videos.map(video => (
              <div key={video._id} className="video-card-cat" onClick={() => window.location.href = `/video/${video._id}`}>
                <div className="video-thumb">
                  <video src={video.videoUrl || video.url} muted preload="metadata" />
                  <div className="video-overlay"><span className="play-circle">▶</span></div>
                  <span className="view-count">👁 {formatViews(video.views)}</span>
                </div>
                <div className="video-info-cat">
                  <p className="video-title-cat">{video.title}</p>
                  <span className="video-uploader">@{video.uploader?.username || 'unknown'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── MAIN GRID ── */
  return (
    <div className="categories-page">

      {/* Compact animated hero */}
      <div className={`cat-hero ${visible ? 'visible' : ''}`}>
        <div className="cat-hero-left">
          <div className="cat-hero-badge">
            <Compass size={12} /> Explore Categories
          </div>
          <h1 className="cat-hero-title">
            Find Your <span>Flavour</span> of Talent
          </h1>
          <p className="cat-hero-sub">
            Discover amazing performances across every art form.
          </p>
        </div>
        <div className="cat-hero-icon-wrap">
          <Compass size={28} className="cat-hero-compass" />
        </div>
      </div>

      {/* Category cards */}
      <div className="categories-grid">
        {Object.entries(CATEGORY_META).map(([name, meta], idx) => {
          const isHovered = hoveredCard === name;
          return (
            <div
              key={name}
              className={`category-card ${visible ? 'visible' : ''}`}
              style={{ '--cat-color': meta.color, '--delay': `${idx * 60}ms` }}
              onClick={() => setSelected(name)}
              onMouseEnter={() => setHoveredCard(name)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Top accent line */}
              <div className="cat-top-line" />

              {/* Icon */}
              <div
                className="cat-icon-wrap"
                style={{
                  background:  `linear-gradient(135deg, ${meta.color}28, ${meta.color}0a)`,
                  border:      `1px solid ${meta.color}40`,
                  boxShadow:   isHovered ? `0 0 22px ${meta.color}55` : 'none',
                }}
              >
                <CategoryIcon meta={meta} size={36} active={isHovered} />
              </div>

              <h2 className="cat-name">{name}</h2>
              <p className="cat-desc">{meta.desc}</p>

              <div className="cat-footer">
                <span className="cat-count" style={{ color: meta.color, background: `${meta.color}15` }}>
                  {stats[name] ?? '–'} videos
                </span>
                <span className="cat-arrow" style={{ color: isHovered ? meta.color : undefined }}>→</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}