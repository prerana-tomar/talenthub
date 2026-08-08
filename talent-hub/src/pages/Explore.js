import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Compass, Search, Calendar, Heart, Flame } from 'lucide-react';
import VideoCard from '../components/VideoCard';
import API from '../config';
import './Explore.css';

const CATEGORIES = ['All', 'Music', 'Dance', 'Singing', 'Rap', 'Comedy', 'Acting', 'Instrumental', 'Poetry', 'Other'];
const SORT_OPTIONS = [
  { value: 'newest',  label: '🕐 Newest' },
  { value: 'popular', label: '🔥 Popular' },
  { value: 'likes',   label: '❤️ Most Liked' },
];

export default function Explore() {
  const [videos, setVideos]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [category, setCategory]   = useState('All');
  const [sort, setSort]           = useState('newest');
  const [search, setSearch]       = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [hasMore, setHasMore]     = useState(false);

  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();
  const user = JSON.parse(localStorage.getItem('th_user') || 'null');
  const LIMIT = 12;

  // Read search from URL
  useEffect(() => {
    const q = searchParams.get('search') || '';
    setSearch(q);
    setSearchInput(q);
  }, [searchParams]);

  useEffect(() => {
    fetchVideos(1, true);
  }, [category, sort, search]);

  const fetchVideos = async (pageNum = 1, reset = false) => {
    setLoading(true);
    try {
      let url = `${API}/api/videos/search?sort=${sort}&page=${pageNum}&limit=${LIMIT}`;
      if (category !== 'All') url += `&category=${category}`;
      if (search.trim())      url += `&q=${encodeURIComponent(search.trim())}`;

      const res  = await fetch(url);
      const data = await res.json();

      const list  = data.videos || (Array.isArray(data) ? data : []);
      const count = data.total  || list.length;

      setTotal(count);
      setVideos(prev => reset ? list : [...prev, ...list]);
      setPage(pageNum);
      setHasMore(pageNum * LIMIT < count);
    } catch {
      if (reset) setVideos([]);
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleLoadMore = () => {
    fetchVideos(page + 1, false);
  };

  return (
    <div className="explore-page">

      {/* Premium Hero Section */}
      <div className="th-page-hero">
        <div className="th-page-hero-text">
          <h1 className="th-page-hero-title">EXPLORE <span>TALENT</span></h1>
          <p className="th-page-hero-subtitle">Discover India's best singers, dancers, poets and creators.</p>
          
          {/* Search bar inside Hero Section */}
          <form className="explore-search-form" onSubmit={handleSearch} style={{ width: '100%', maxWidth: '520px', marginTop: '16px' }}>
            <div className="explore-search-wrap">
              <Search size={18} className="explore-search-icon" />
              <input
                type="text"
                className="explore-search-input"
                placeholder="Search performers, songs, categories..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  type="button"
                  className="explore-search-clear"
                  onClick={() => { setSearchInput(''); setSearch(''); }}
                >✕</button>
              )}
            </div>
            <button type="submit" className="explore-search-btn">Search</button>
          </form>
        </div>
        <div className="th-page-hero-img-wrap" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', borderRadius: '50%', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Compass size={36} />
        </div>
      </div>

      {/* Filters */}
      <div className="explore-filters">
        <div className="explore-categories">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`explore-cat-btn ${category === cat ? 'active' : ''}`}
              onClick={() => { setCategory(cat); setPage(1); }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="explore-sort">
          {SORT_OPTIONS.map(opt => {
            const getIcon = (val) => {
              if (val === 'newest') return <Calendar size={13} style={{ marginRight: '6px' }} />;
              if (val === 'popular') return <Flame size={13} style={{ marginRight: '6px' }} />;
              if (val === 'likes') return <Heart size={13} style={{ marginRight: '6px' }} />;
              return null;
            };
            const labelText = opt.label.replace(/^[^\s]+\s+/, ''); // strip emoji
            return (
              <button
                key={opt.value}
                className={`explore-sort-btn ${sort === opt.value ? 'active' : ''}`}
                onClick={() => { setSort(opt.value); setPage(1); }}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                {getIcon(opt.value)}
                {labelText}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <div className="explore-results-info">
          {search && <span>Results for "<strong>{search}</strong>" — </span>}
          <span>{total} video{total !== 1 ? 's' : ''} found</span>
        </div>
      )}

      {/* Videos */}
      {loading && videos.length === 0 ? (
        <div className="explore-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="explore-skeleton" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="th-empty-state-illustrated">
          <div className="th-empty-state-icon-wrapper">
            <Compass size={32} />
          </div>
          <h3>No videos found</h3>
          <p>
            {search
              ? `No results for "${search}". Try different keywords or browse another category.`
              : 'No videos in this category yet. Be the first to upload your performance!'}
          </p>
          <button
            className="th-empty-state-cta-btn"
            onClick={() => navigate('/upload')}
          >
            Upload Performance
          </button>
        </div>
      ) : (
        <>
          <div className="explore-grid">
            {videos.map(video => (
              <VideoCard
                key={video._id}
                video={video}
                currentUserId={user?._id}
                onDelete={(id) => setVideos(prev => prev.filter(v => v._id !== id))}
              />
            ))}
          </div>

          {hasMore && (
            <div className="explore-load-more">
              <button
                className="explore-load-btn"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
