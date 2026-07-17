import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  "Submitting help request... ✨"
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
  const navigate = useNavigate();
  const [type, setType] = useState('Poem');
  const [language, setLanguage] = useState('Hinglish');
  const [mood, setMood] = useState('Romantic');
  const [writing, setWriting] = useState('');
  const [context, setContext] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');

  // AI Content Generation States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiError, setAiError] = useState('');

  const handleAiGenerate = async () => {
    if (!writing.trim()) {
      setError("Apni writing yahan paste kijiye pehle!");
      return;
    }

    const token = localStorage.getItem('th_token');
    if (!token) {
      setError("Please login first to use AI Generator!");
      navigate('/login');
      return;
    }

    setAiLoading(true);
    setAiError("");
    setAiResponse("");
    setError("");

    const promptText = `Provide a creative extension/improvement for my writing.
Type: ${type}
Language: ${language}
Mood: ${mood}
Current Writing:
"${writing.trim()}"

Instructions/Context:
"${context.trim() || 'Improve flow and continue'}"

Return ONLY the completed/extended creative writing content. Do not include introductory notes, explanations, or quotes. Keep it natural and engaging.`;

    try {
      const res = await fetch(`${API}/api/creative/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: promptText })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'AI generation failed');
      }

      setAiResponse(data.text);
      // Scroll to result
      setTimeout(() => {
        const resultElement = document.getElementById('cs-ai-result-section');
        if (resultElement) {
          resultElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err) {
      console.error('Gemini generate error:', err);
      setAiError(err.message || 'Failed to connect to Gemini. Please verify your API Key.');
    } finally {
      setAiLoading(false);
    }
  };

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
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleHelpSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!writing.trim()) {
      setError("Apni adhuri writing yahan paste kijiye!");
      return;
    }

    const token = localStorage.getItem('th_token');
    if (!token) {
      setError("Please login first to submit a help request!");
      navigate('/login');
      return;
    }

    setLoading(true);
    setError("");
    setSubmitted(false);

    try {
      const res = await fetch(`${API}/api/help-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type,
          language,
          mood,
          writing: writing.trim(),
          context: context.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Help request submission failed');
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Help Request submission error:', err);
      setError(err.message || 'Failed to submit help request. Please try again!');
    } finally {
      setLoading(false);
    }
  };

  const applyInspiration = (ins) => {
    setType(ins.type);
    setLanguage(ins.language);
    setMood(ins.mood);
    setWriting(ins.writing);
    setContext(ins.context);
    setError("");
    setSubmitted(false);
    // Smooth scroll to form inputs
    const formElement = document.getElementById('cs-form-section');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="cs-page">
      {/* Glow effects for modern aesthetics */}
      <div className="cs-bg-glow-1" />
      <div className="cs-bg-glow-2" />

      {/* HERO SECTION */}
      <div className="cs-hero">
        <div className="cs-hero-badge">✨ Help Request</div>
        <h1 className="cs-hero-title">Creative Studio</h1>
        <p className="cs-hero-sub">Apni adhuri writing complete karwao Owner se</p>
      </div>

      <div className="cs-container">
        <div className="cs-main" id="cs-form-section">
          
          {loading ? (
            /* LOADING STATE */
            <div className="cs-card cs-loading-card">
              <div className="cs-spinner-container">
                <div className="cs-glow-spinner"></div>
              </div>
              <h3 className="cs-loading-title">AI aur Owner aapki writing dekh rahe hai...</h3>
              
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
          ) : submitted ? (
            /* SUCCESS CONFIRMATION STATE */
            <div className="cs-result-wrapper">
              <div className="cs-card cs-result-card cs-success-card" style={{ textAlign: 'center', padding: '50px 24px' }}>
                <div style={{ fontSize: '54px', marginBottom: '20px' }}>🙏</div>
                <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '14px', color: '#c084fc' }}>
                  Aapki request submit ho gayi!
                </h2>
                <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.75)', marginBottom: '32px', lineHeight: '1.6' }}>
                  Owner jald hi aapki help karega 🙏
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '350px', margin: '0 auto' }}>
                  <button className="cs-submit-btn" style={{ marginTop: 0 }} onClick={() => navigate('/my-requests')}>
                    📋 View My Requests
                  </button>
                  <button className="cs-try-again-btn" style={{ marginTop: 0 }} onClick={() => { setSubmitted(false); setWriting(''); setContext(''); }}>
                    ✍️ Submit Another Request
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* INPUT FORM */
            <form className="cs-form" onSubmit={handleHelpSubmit}>
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
                  placeholder="Apni adhuri shayari, geet, rap ya kahani likho... Owner aage poora karega."
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

                {aiLoading && (
                  <div className="cs-ai-loading-container" style={{ marginTop: '20px', padding: '16px', background: 'rgba(124, 58, 237, 0.05)', border: '1px dashed rgba(124, 58, 237, 0.3)', borderRadius: '8px', textAlign: 'center' }}>
                    <div className="cs-glow-spinner" style={{ width: '30px', height: '30px', margin: '0 auto 10px', border: '3px solid rgba(124, 58, 237, 0.1)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <span style={{ fontSize: '13px', color: '#a78bfa' }}>🪄 Gemini AI is processing your writing...</span>
                  </div>
                )}

                {aiError && (
                  <div className="cs-error-msg" style={{ marginTop: '16px' }}>
                    ⚠️ AI Error: {aiError}
                  </div>
                )}

                {aiResponse && (
                  <div id="cs-ai-result-section" className="cs-ai-result-card" style={{
                    marginTop: '24px',
                    padding: '20px',
                    background: 'rgba(124, 58, 237, 0.08)',
                    border: '1px solid rgba(124, 58, 237, 0.3)',
                    borderRadius: '12px',
                    position: 'relative'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        🪄 Gemini AI Suggestion
                      </span>
                      <span style={{ fontSize: '18px' }}>✨</span>
                    </div>
                    <p style={{
                      whiteSpace: 'pre-wrap',
                      fontSize: '15px',
                      lineHeight: '1.6',
                      color: '#f3f4f6',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.05)',
                      fontStyle: 'italic'
                    }}>
                      {aiResponse}
                    </p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setWriting(aiResponse);
                          setAiResponse('');
                        }}
                        style={{
                          flex: 1,
                          padding: '10px',
                          background: '#7c3aed',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                      >
                        ✓ Apply to Textbox
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(aiResponse);
                          alert('Copied to clipboard!');
                        }}
                        style={{
                          padding: '10px 16px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#e5e7eb',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        📋 Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiResponse('')}
                        style={{
                          padding: '10px 16px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '8px',
                          color: '#f87171',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        ✕ Dismiss
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button type="submit" className="cs-submit-btn" style={{ flex: 1, marginTop: 0 }}>
                    ✨ Submit to Owner
                  </button>
                  <button
                    type="button"
                    onClick={handleAiGenerate}
                    className="cs-submit-btn"
                    style={{
                      flex: 1,
                      marginTop: 0,
                      background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    disabled={aiLoading}
                  >
                    {aiLoading ? '🪄 Generating...' : '🪄 Generate with AI'}
                  </button>
                </div>
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
                  <h4>Submit Request</h4>
                  <p>Click submit to send your writing to the Owner</p>
                </div>
              </div>
              <div className="cs-step-item">
                <div className="cs-step-badge">3</div>
                <div className="cs-step-info">
                  <h4>Get Help</h4>
                  <p>View owner's custom response on My Requests</p>
                </div>
              </div>
            </div>
            
            <button 
              className="cs-try-again-btn" 
              style={{ width: '100%', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => navigate('/my-requests')}
            >
              📋 View My Requests
            </button>
          </div>

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