import React, { useState, useEffect } from 'react';
import { Feather, Palette, Sparkles, Compass, ArrowLeft } from 'lucide-react';
import { MusicianIcon, DancerIcon, ComedianIcon } from '../components/PerformerIcons';
import API from '../config';
import './Categories.css';

// custom: true => our own illustrated SVG icon (accepts size, accent, glow, active)
// custom: false => lucide-react icon (accepts size only, colored via CSS)
const CATEGORY_META = {
  Music: { icon: MusicianIcon, custom: true, color: '#7c3aed', glow: '#c4b5fd', desc: 'Songs, covers, and original compositions' },
  Dance: { icon: DancerIcon, custom: true, color: '#ec4899', glow: '#fda4af', desc: 'Classical, contemporary, and freestyle moves' },
  Comedy: { icon: ComedianIcon, custom: true, color: '#f59e0b', glow: '#fdba74', desc: 'Stand-up, skits, and funny performances' },
  Poetry: { icon: Feather, custom: false, color: '#06b6d4', desc: 'Spoken word, shayari, and literary art' },
  Art: { icon: Palette, custom: false, color: '#10b981', desc: 'Visual art, sketching, and creative work' },
  Other: { icon: Sparkles, custom: false, color: '#8b5cf6', desc: 'Unique talents that defy categories' },
};

// Renders either a custom illustrated icon or a lucide icon depending on category meta
function CategoryIcon({ meta, size, active }) {
  const IconComponent = meta.icon;
  if (meta.custom) {
    return <IconComponent size={size} accent={meta.color} glow={meta.glow} active={active} />;
  }
  return <IconComponent size={size} />;
}

const Categories = () => {
  const [selected, setSelected] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    fetchCategoryStats();
  }, []);

  useEffect(() => {
    if (selected) fetchVideosByCategory(selected);
  }, [selected]);

  const fetchCategoryStats = async () => {
    try {
      const res = await fetch(`${API}/api/videos/category-stats`);
      const data = await res.json();
      setStats(data || {});
    } catch {
      // Silently fail if endpoint doesn't exist
    }
  };

  const fetchVideosByCategory = async (cat) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/videos?category=${cat}`);
      const data = await res.json();
      setVideos(data.videos || data || []);
    } catch (err) {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const formatViews = (n) => {
    if (!n) return '0';
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  if (selected) {
    const meta = CATEGORY_META[selected];
    return (
      <div className="categories-page">
        <button
          className="back-btn"
          onClick={() => { setSelected(null); setVideos([]); }}
          style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={16} /> Back to Categories
        </button>

        {/* Premium Page Hero */}
        <div className="th-page-hero">
          <div className="th-page-hero-text">
            <h1 className="th-page-hero-title">{selected.toUpperCase()} <span>PERFORMANCES</span></h1>
            <p className="th-page-hero-subtitle">{meta.desc}</p>
          </div>
          <div
            className="th-page-hero-img-wrap"
            style={{
              background: `${meta.color}15`,
              color: meta.color,
              borderRadius: '50%',
              width: '80px',
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${meta.color}33`
            }}
          >
            <CategoryIcon meta={meta} size={36} active={true} />
          </div>
        </div>

        {loading ? (
          <div className="video-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="video-skeleton" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="th-empty-state-illustrated">
            <div className="th-empty-state-icon-wrapper" style={{ background: `${meta.color}15`, color: meta.color, borderColor: `${meta.color}33` }}>
              <CategoryIcon meta={meta} size={32} active={false} />
            </div>
            <h3>No videos yet in {selected}</h3>
            <p>Be the first creator to upload in this category and showcase your talent to India!</p>
            <button className="th-empty-state-cta-btn" onClick={() => window.location.href = '/upload'}>
              Upload Performance
            </button>
          </div>
        ) : (
          <div className="video-grid">
            {videos.map((video) => (
              <div
                key={video._id}
                className="video-card-cat th-premium-card-redesign"
                onClick={() => window.location.href = `/video/${video._id}`}
              >
                <div className="video-thumb">
                  <video src={`${video.videoUrl}`} muted />
                  {!video.thumbnailUrl && (
                    <div className="video-thumb-placeholder-gradient">
                      <div className="play-icon-overlay">▶</div>
                    </div>
                  )}
                  <div className="video-overlay">
                    <span className="play-icon">▶</span>
                  </div>
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

  return (
    <div className="categories-page">
      {/* Premium Page Hero */}
      <div className="th-page-hero">
        <div className="th-page-hero-text">
          <h1 className="th-page-hero-title">EXPLORE <span>CATEGORIES</span></h1>
          <p className="th-page-hero-subtitle">Discover amazing performances across every art form. Find your flavor of talent today.</p>
        </div>
        <div className="th-page-hero-img-wrap" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6', borderRadius: '50%', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Compass size={36} style={{ margin: 'auto' }} />
        </div>
      </div>

      <div className="categories-grid">
        {Object.entries(CATEGORY_META).map(([name, meta]) => {
          const isHovered = hoveredCard === name;
          return (
            <div
              key={name}
              className="category-card th-premium-card-redesign"
              style={{ '--cat-color': meta.color }}
              onClick={() => setSelected(name)}
              onMouseEnter={() => setHoveredCard(name)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="cat-glow" style={{ background: meta.color }} />
              <div
                className="cat-icon"
                style={{
                  background: `${meta.color}15`,
                  color: meta.color,
                  padding: '12px',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  marginBottom: '16px',
                  border: `1px solid ${meta.color}25`
                }}
              >
                <CategoryIcon meta={meta} size={24} active={isHovered} />
              </div>
              <h2 className="cat-name">{name}</h2>
              <p className="cat-desc">{meta.desc}</p>
              <div className="cat-footer">
                <span className="cat-count" style={{ color: meta.color, background: `${meta.color}15` }}>
                  {stats[name] ?? '–'} videos
                </span>
                <span className="cat-arrow">→</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Categories;