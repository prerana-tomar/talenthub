import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import VideoCard from '../components/VideoCard';
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
      let url = `https://talenthub-w1cc.onrender.com/api/videos/search?sort=${sort}&page=${pageNum}&limit=${LIMIT}`;
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

      {/* Header */}
      <div className="explore-header">
        <div>
          <h1>🔍 Explore</h1>
          <p>Discover amazing talent from across India</p>
        </div>
      </div>

      {/* Search bar */}
      <form className="explore-search-form" onSubmit={handleSearch}>
        <div className="explore-search-wrap">
          <span className="explore-search-icon">🔍</span>
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
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`explore-sort-btn ${sort === opt.value ? 'active' : ''}`}
              onClick={() => { setSort(opt.value); setPage(1); }}
            >
              {opt.label}
            </button>
          ))}
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
        <div className="explore-empty">
          <div className="explore-empty-icon">🎬</div>
          <h3>No videos found</h3>
          <p>
            {search
              ? `No results for "${search}". Try different keywords.`
              : 'No videos in this category yet. Be the first to upload!'}
          </p>
          <button
            className="explore-upload-btn"
            onClick={() => navigate('/upload')}
          >
            ⬆ Upload Performance
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
