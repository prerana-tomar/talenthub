import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Compass, Search, Calendar, Heart, Flame } from 'lucide-react';
import VideoCard from '../components/VideoCard';
import API from '../config';
import './Explore.css';

const CATEGORIES = ['All', 'Music', 'Dance', 'Singing', 'Rap', 'Comedy', 'Acting', 'Instrumental', 'Poetry', 'Other'];
const SORT_OPTIONS = [
  { value: 'newest',  label: 'Newest',    Icon: Calendar },
  { value: 'popular', label: 'Popular',   Icon: Flame    },
  { value: 'likes',   label: 'Most Liked',Icon: Heart    },
];

export default function Explore() {
  const [videos,      setVideos]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [category,    setCategory]    = useState('All');
  const [sort,        setSort]        = useState('newest');
  const [search,      setSearch]      = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page,        setPage]        = useState(1);
  const [total,       setTotal]       = useState(0);
  const [hasMore,     setHasMore]     = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const user  = JSON.parse(localStorage.getItem('th_user') || 'null');
  const LIMIT = 12;

  // Hero entry animation
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

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
      if (category !== 'All')  url += `&category=${encodeURIComponent(category)}`;
      if (search.trim())        url += `&q=${encodeURIComponent(search.trim())}`;

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

  return (
    <div className="explore-page">

      {/* ── COMPACT ANIMATED HERO ── */}
      <div className={`explore-hero ${heroVisible ? 'visible' : ''}`}>
        <div className="explore-hero-left">
          <div className="explore-hero-badge">
            <Compass size={13} />
            Explore Talent
          </div>
          <h1 className="explore-hero-title">
            Find Your Next <span>Favourite</span>
          </h1>
          <p className="explore-hero-sub">
            Discover India's best singers, dancers, poets and creators.
          </p>
        </div>

        <form className="explore-search-form" onSubmit={handleSearch}>
          <div className="explore-search-wrap">
            <Search size={15} className="explore-search-icon" />
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

      {/* ── FILTERS ── */}
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
          {SORT_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              className={`explore-sort-btn ${sort === value ? 'active' : ''}`}
              onClick={() => { setSort(value); setPage(1); }}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── RESULTS INFO ── */}
      {!loading && (
        <div className="explore-results-info">
          {search && <span>Results for "<strong>{search}</strong>" — </span>}
          <span>{total} video{total !== 1 ? 's' : ''} found</span>
        </div>
      )}

      {/* ── VIDEOS ── */}
      {loading && videos.length === 0 ? (
        <div className="explore-grid">
          {[1,2,3,4,5,6].map(i => <div key={i} className="explore-skeleton" />)}
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
              : 'No videos in this category yet. Be the first to upload!'}
          </p>
          <button className="th-empty-state-cta-btn" onClick={() => navigate('/upload')}>
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
                onClick={() => fetchVideos(page + 1, false)}
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