import React, { useState, useEffect } from 'react';
import API from '../config';
import './CreativeStudio.css';

const TYPES = [
  { id: 'Poem', label: '✍️ Poem', desc: 'Rhyming or free verse poetry' },
  { id: 'Shayari', label: '📝 Shayari', desc: 'Heart touching Urdu/Hindi couplets' },
  { id: 'Song', label: '🎵 Song', desc: 'Verses and choruses' },
  { id: 'Rap', label: '🎤 Rap', desc: 'Rhythmic flow and beats' },
  { id: 'Script', label: '🎬 Script', desc: 'Dialogues and scene setups' },
  { id: 'Caption', label: '📸 Caption', desc: 'Punchy social media captions' }
];

const LANGUAGES = ['Hindi', 'English', 'Hinglish'];

const MOODS = [
  { name: 'Romantic 💕', value: 'Romantic' },
  { name: 'Sad 😢', value: 'Sad' },
  { name: 'Happy 😊', value: 'Happy' },
  { name: 'Motivational 🔥', value: 'Motivational' },
  { name: 'Spiritual 🙏', value: 'Spiritual' },
  { name: 'Funny 😄', value: 'Funny' }
];

const LOADING_STEPS = [
  "Reading your writing... 📖",
  "Analyzing style... 🧠",
  "Completing it... ✨"
];

const INSPIRATIONS = [
  {
    title: "Romantic Shayari (Hindi)",
    type: "Shayari",
    language: "Hindi",
    mood: "Romantic",
    writing: "Mohabbat ki raah mein mile the do musafir...",
    context: "Kuch gehra aur lajawab likho jise sunkar maza aa jaye."
  },
  {
    title: "Sad Poem (Hinglish)",
    type: "Poem",
    language: "Hinglish",
    mood: "Sad",
    writing: "Wo purani dosti, wo beete hue lamhe...\nAb sirf yaadon mein hi bache hain hum...",
    context: "Dono dosto ki doori aur dard ko thoda sa badhao."
  },
  {
    title: "Motivational Rap (Hinglish)",
    type: "Rap",
    language: "Hinglish",
    mood: "Motivational",
    writing: "Zindagi ki race mein thakna nahi hai...\nGirna hai par rukna nahi hai...",
    context: "Aggressive flow aur fast rhymes add karo."
  },
  {
    title: "Happy Song (English)",
    type: "Song",
    language: "English",
    mood: "Happy",
    writing: "Sunshine on my face, walking down the street...\nNothing can slow me down today...",
    context: "Make it a catchy, upbeat chorus for a pop song."
  },
  {
    title: "Funny Caption (Hinglish)",
    type: "Caption",
    language: "Hinglish",
    mood: "Funny",
    writing: "Dieting pe hoon bolke biryani mangwa li...",
    context: "Social media par post karne ke liye kuch hilarious caption do."
  }
];

export default function CreativeStudio() {
  const [type, setType] = useState('Poem');
  const [language, setLanguage] = useState('Hinglish');
  const [mood, setMood] = useState('Romantic');
  const [writing, setWriting] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Load history from localStorage
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('creative_studio_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Clear localStorage on mount to avoid historical schema issues
  useEffect(() => {
    localStorage.removeItem('creative_studio_history');
  }, []);

  // Loading steps rotation
  useEffect(() => {
    let interval;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev < 2 ? prev + 1 : prev));
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleAssist = async (e) => {
    if (e) e.preventDefault();
    if (!writing.trim()) {
      setError("Apni adhuri writing yahan paste kijiye!");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`${API}/api/creative/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          language,
          mood,
          writing,
          context
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'AI request failed');
      }

      setResult({ completedWriting: data.text, tips: [] });

      // Save to recent history
      const newHistoryItem = {
        id: Date.now(),
        type,
        language,
        mood,
        writing,
        context,
        completedWriting: data.text,
        tips: data.tips || []
      };

      setHistory(prev => {
        const updated = [newHistoryItem, ...prev].slice(0, 3);
        localStorage.setItem('creative_studio_history', JSON.stringify(updated));
        return updated;
      });

    } catch (err) {
      console.error('Assist API Error:', err);
      setError(err.message || 'Generation failed. Please try again!');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.completedWriting);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!result) return;
    if (navigator.share) {
      navigator.share({
        title: `My Completed ${type}`,
        text: result.completedWriting
      }).catch(err => console.log('Share error:', err));
    } else {
      handleCopy();
      alert('Content copied to clipboard for sharing!');
    }
  };

  const handleTryAgain = () => {
    setResult(null);
    setError("");
    setWriting("");
    setContext("");
  };

  const applyInspiration = (ins) => {
    setType(ins.type);
    setLanguage(ins.language);
    setMood(ins.mood);
    setWriting(ins.writing);
    setContext(ins.context);
    setError("");
    setResult(null);
    // Smooth scroll to form inputs
    const formElement = document.getElementById('cs-form-section');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const loadHistoryItem = (item) => {
    setType(item.type);
    setLanguage(item.language);
    setMood(item.mood);
    setWriting(item.writing);
    setContext(item.context);
    setResult({
      completedWriting: item.completedWriting,
      tips: item.tips
    });
    setError("");
    // Smooth scroll to results
    const resultElement = document.getElementById('cs-result-section');
    if (resultElement) {
      resultElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="cs-page">
      {/* Glow effects for modern aesthetics */}
      <div className="cs-bg-glow-1" />
      <div className="cs-bg-glow-2" />

      {/* HERO SECTION */}
      <div className="cs-hero">
        <div className="cs-hero-badge">✨ Creative Studio</div>
        <h1 className="cs-hero-title">Creative Studio</h1>
        <p className="cs-hero-sub">Apni adhuri writing complete karwao AI se</p>
      </div>

      <div className="cs-container">
        <div className="cs-main" id="cs-form-section">
          
          {/* If result is ready, display it, otherwise display form or loading */}
          {loading ? (
            /* LOADING STATE */
            <div className="cs-card cs-loading-card">
              <div className="cs-spinner-container">
                <div className="cs-glow-spinner"></div>
              </div>
              <h3 className="cs-loading-title">AI aapki writing dekh rahi hai...</h3>
              
              <div className="cs-progress-steps">
                {LOADING_STEPS.map((step, idx) => (
                  <div 
                    key={idx} 
                    className={`cs-progress-step ${loadingStep === idx ? 'active' : ''} ${loadingStep > idx ? 'completed' : ''}`}
                  >
                    <span className="cs-step-dot"></span>
                    <span className="cs-step-text">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : result ? (
            /* RESULT SECTION */
            <div className="cs-result-wrapper" id="cs-result-section">
              <div className="cs-card cs-result-card">
                <div className="cs-result-header">
                  <span className="cs-result-tag">✨ Completed Writing ({type})</span>
                  <div className="cs-result-actions">
                    <button className="cs-action-btn cs-copy-btn" onClick={handleCopy}>
                      {copied ? '✅ Copied!' : '📋 Copy'}
                    </button>
                    <button className="cs-action-btn" onClick={handleShare}>
                      📤 Share
                    </button>
                    <button className="cs-action-btn" onClick={() => handleAssist()}>
                      🔄 Regenerate
                    </button>
                  </div>
                </div>
                <div className="cs-result-text-area">
                  <p className="cs-completed-text">{result.completedWriting}</p>
                </div>
                
                <div className="cs-result-meta">
                  <span>Language: <strong>{language}</strong></span>
                  <span>•</span>
                  <span>Mood: <strong>{mood}</strong></span>
                </div>
              </div>

              {/* TIPS SECTION */}
              <div className="cs-card cs-tips-card">
                <h3 className="cs-tips-title">💡 Writing Tips</h3>
                <div className="cs-tips-list">
                  {result.tips && result.tips.length > 0 ? (
                    result.tips.map((tip, index) => (
                      <div key={index} className="cs-tip-item">
                        <span className="cs-tip-num">0{index + 1}</span>
                        <p className="cs-tip-body">{tip}</p>
                      </div>
                    ))
                  ) : (
                    <p className="cs-no-tips">AI has finished completing your writing. Keep practicing!</p>
                  )}
                </div>
              </div>

              <button className="cs-try-again-btn" onClick={handleTryAgain}>
                ✍️ Try with New Writing
              </button>
            </div>
          ) : (
            /* INPUT FORM */
            <form className="cs-form" onSubmit={handleAssist}>
              {/* Type selector */}
              <div className="cs-card">
                <label className="cs-input-label">📝 Kya likhna chahte ho? (Writing Type)</label>
                <div className="cs-grid-selector">
                  {TYPES.map(t => (
                    <button
                      type="button"
                      key={t.id}
                      className={`cs-select-card ${type === t.id ? 'active' : ''}`}
                      onClick={() => setType(t.id)}
                    >
                      <span className="cs-select-emoji">{t.label.split(' ')[0]}</span>
                      <span className="cs-select-name">{t.id}</span>
                      <span className="cs-select-desc">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language and Mood */}
              <div className="cs-card cs-settings-card">
                <div className="cs-settings-grid">
                  <div className="cs-setting-item">
                    <label className="cs-input-label">🌐 Language Selector</label>
                    <div className="cs-pills-selector">
                      {LANGUAGES.map(l => (
                        <button
                          type="button"
                          key={l}
                          className={`cs-pill-btn ${language === l ? 'active' : ''}`}
                          onClick={() => setLanguage(l)}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="cs-setting-item">
                    <label className="cs-input-label">🎭 Mood & Vibe Selector</label>
                    <div className="cs-pills-selector">
                      {MOODS.map(m => (
                        <button
                          type="button"
                          key={m.value}
                          className={`cs-pill-btn ${mood === m.value ? 'active' : ''}`}
                          onClick={() => setMood(m.value)}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Textareas */}
              <div className="cs-card">
                <label className="cs-input-label" htmlFor="writing-input">
                  ✍️ Apni writing yahan paste karo (Adhuri bhi chalegi)
                </label>
                <textarea
                  id="writing-input"
                  className="cs-main-textarea"
                  placeholder="Apni adhuri shayari, geet, rap ya kahani likho... AI aage poora karega."
                  rows="6"
                  value={writing}
                  onChange={(e) => {
                    setWriting(e.target.value);
                    if (error) setError("");
                  }}
                  required
                />

                <label className="cs-input-label cs-spacing-top" htmlFor="context-input">
                  💡 Aur kya chahiye? (Optional instructions)
                </label>
                <textarea
                  id="context-input"
                  className="cs-context-textarea"
                  placeholder="Jaise: 'Aakhri line mein ek twist do', 'Dard thoda aur badhao', 'Hindi shabdo ka zyaada use karo'..."
                  rows="3"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                />

                {error && <div className="cs-error-msg">⚠️ {error}</div>}

                <button type="submit" className="cs-submit-btn">
                  ✨ Complete My Writing
                </button>
              </div>
            </form>
          )}

        </div>

        {/* SIDEBAR */}
        <aside className="cs-sidebar">
          {/* How it works */}
          <div className="cs-card cs-sidebar-card">
            <h3 className="cs-sidebar-title">⚡ How It Works</h3>
            <div className="cs-steps-list">
              <div className="cs-step-item">
                <div className="cs-step-badge">1</div>
                <div className="cs-step-info">
                  <h4>Paste Writing</h4>
                  <p>Type/paste writing, choose mood & language</p>
                </div>
              </div>
              <div className="cs-step-item">
                <div className="cs-step-badge">2</div>
                <div className="cs-step-info">
                  <h4>AI Analyzes</h4>
                  <p>AI scans style, meter & context clues</p>
                </div>
              </div>
              <div className="cs-step-item">
                <div className="cs-step-badge">3</div>
                <div className="cs-step-info">
                  <h4>Get Results</h4>
                  <p>Receive your completed draft + tips</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent History */}
          {history.length > 0 && (
            <div className="cs-card cs-sidebar-card">
              <h3 className="cs-sidebar-title">📚 Recent History</h3>
              <div className="cs-history-list">
                {history.map(item => (
                  <div key={item.id} className="cs-history-card-item" onClick={() => loadHistoryItem(item)}>
                    <div className="cs-hist-top">
                      <span className="cs-hist-type">{item.type}</span>
                      <span className="cs-hist-mood">{item.mood}</span>
                    </div>
                    <p className="cs-hist-preview">{(item.completedWriting || '').slice(0, 75)}...</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inspiration Examples */}
          <div className="cs-card cs-sidebar-card">
            <h3 className="cs-sidebar-title">🌟 Click to Try (Inspirations)</h3>
            <div className="cs-inspire-list">
              {INSPIRATIONS.map((ins, index) => (
                <button
                  key={index}
                  type="button"
                  className="cs-inspire-item-btn"
                  onClick={() => applyInspiration(ins)}
                >
                  <span className="cs-inspire-dot">✦</span>
                  <div className="cs-inspire-content">
                    <h5>{ins.title}</h5>
                    <p>"{ins.writing.slice(0, 40)}..."</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}