import React, { useState } from 'react';
import './CreativeStudio.css';

const MOODS = ['Romantic 💕', 'Sad 😢', 'Happy 😊', 'Motivational 🔥', 'Patriotic 🇮🇳', 'Spiritual 🙏', 'Funny 😄', 'Angry 😤'];
const LANGUAGES = ['Hindi', 'English', 'Hinglish'];
const TYPES = [
  { id: 'shayari',   label: '📝 Shayari',     desc: '2-4 line beautiful shayari' },
  { id: 'ghazal',    label: '🌹 Ghazal',       desc: 'Traditional ghazal with radif' },
  { id: 'song',      label: '🎵 Song Lyrics',  desc: 'Full song with chorus & verses' },
  { id: 'rap',       label: '🎤 Rap Lyrics',   desc: 'Desi rap with flow & rhymes' },
  { id: 'poem',      label: '✍️ Poem',         desc: 'Free verse or rhyming poem' },
  { id: 'caption',   label: '📸 Caption',      desc: 'Social media caption with hashtags' },
];

export default function CreativeStudio() {
  const [type,     setType]     = useState('shayari');
  const [mood,     setMood]     = useState('Romantic 💕');
  const [language, setLanguage] = useState('Hindi');
  const [topic,    setTopic]    = useState('');
  const [result,   setResult]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [copied,   setCopied]   = useState(false);
  const [history,  setHistory]  = useState([]);

  const generate = async () => {
    if (!topic.trim()) { setError('Topic zaroor likho!'); return; }
    setLoading(true);
    setError('');
    setResult('');

    const selectedType = TYPES.find(t => t.id === type);

    const prompt = `You are a creative Indian poet and lyricist. Write a ${selectedType.label} in ${language} language.

Topic/Theme: ${topic}
Mood: ${mood}
Type: ${selectedType.desc}

Rules:
- Write ONLY the creative content, no explanations
- Make it emotional and relatable
- Use beautiful metaphors
- If Hindi/Hinglish, use Devanagari or Roman Hindi naturally
- For shayari: write 2-4 lines with deep meaning
- For song: include [Verse 1], [Chorus], [Verse 2] sections
- For rap: include flow, rhymes, desi touch
- For ghazal: follow maqta and radif format
- Make it original and creative

Write now:`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'YOUR_ANTHROPIC_API_KEY',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
        }),
      });
       const data = await res.json();
       const text = data.content?.[0]?.text || '';
      setResult(text);
      setHistory(prev => [{ type: selectedType.label, mood, language, topic, result: text, time: new Date() }, ...prev.slice(0, 4)]);
    } catch {
      setError('Generation failed. Please try again!');
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'My Creative Writing', text: result });
    } else {
      handleCopy();
    }
  };

  return (
    <div className="cs-page">
      <div className="cs-hero">
        <div className="cs-hero-glow" />
        <div className="cs-hero-content">
          <div className="cs-hero-badge">✦ AI POWERED</div>
          <h1 className="cs-hero-title">Creative Studio</h1>
          <p className="cs-hero-sub">Shayari, Songs, Rap — AI se likho apne dil ki baat</p>
        </div>
      </div>

      <div className="cs-container">
        <div className="cs-main">

          {/* Type Selection */}
          <div className="cs-card">
            <div className="cs-card-title">🎭 Kya likhna hai?</div>
            <div className="cs-type-grid">
              {TYPES.map(t => (
                <button
                  key={t.id}
                  className={`cs-type-btn${type === t.id ? ' active' : ''}`}
                  onClick={() => setType(t.id)}
                >
                  <span className="cs-type-label">{t.label}</span>
                  <span className="cs-type-desc">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="cs-card">
            <div className="cs-card-title">⚙️ Settings</div>
            <div className="cs-settings-row">
              <div className="cs-setting">
                <label>🌐 Language</label>
                <div className="cs-pill-group">
                  {LANGUAGES.map(l => (
                    <button
                      key={l}
                      className={`cs-pill${language === l ? ' active' : ''}`}
                      onClick={() => setLanguage(l)}
                    >{l}</button>
                  ))}
                </div>
              </div>
              <div className="cs-setting">
                <label>🎭 Mood</label>
                <div className="cs-pill-group cs-mood-group">
                  {MOODS.map(m => (
                    <button
                      key={m}
                      className={`cs-pill${mood === m ? ' active' : ''}`}
                      onClick={() => setMood(m)}
                    >{m}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Topic Input */}
          <div className="cs-card">
            <div className="cs-card-title">💭 Topic / Idea</div>
            <textarea
              className="cs-textarea"
              placeholder="Apna topic likho... jaise: 'pehli mohabbat', 'dil ka dard', 'sapno ki duniya', 'dosti', 'zindagi ke rang'..."
              value={topic}
              onChange={e => { setTopic(e.target.value); setError(''); }}
              rows={3}
            />
            {error && <div className="cs-error">⚠️ {error}</div>}
            <button
              className="cs-generate-btn"
              onClick={generate}
              disabled={loading}
            >
              {loading ? (
                <><span className="cs-spinner" /> Likh raha hoon...</>
              ) : (
                <>✨ Generate {TYPES.find(t => t.id === type)?.label}</>
              )}
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className="cs-card cs-result-card">
              <div className="cs-result-header">
                <div className="cs-result-title">✨ Aapki Creation</div>
                <div className="cs-result-actions">
                  <button className="cs-action-btn" onClick={handleCopy}>
                    {copied ? '✅ Copied!' : '📋 Copy'}
                  </button>
                  <button className="cs-action-btn" onClick={handleShare}>
                    📤 Share
                  </button>
                  <button className="cs-action-btn" onClick={generate}>
                    🔄 Regenerate
                  </button>
                </div>
              </div>
              <div className="cs-result-text">{result}</div>
              <div className="cs-result-meta">
                <span>{TYPES.find(t => t.id === type)?.label}</span>
                <span>•</span>
                <span>{mood}</span>
                <span>•</span>
                <span>{language}</span>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="cs-sidebar">
          <div className="cs-card">
            <div className="cs-card-title">💡 Tips</div>
            <div className="cs-tips">
              <div className="cs-tip">🎯 Topic specific rakho — "pehli mulaqat ka dard" better than "love"</div>
              <div className="cs-tip">🔄 Pasand nahi aaya? Regenerate karo!</div>
              <div className="cs-tip">📝 Result ko edit karke apna bana sakte ho</div>
              <div className="cs-tip">🎵 Song ke liye Hinglish best rehti hai</div>
              <div className="cs-tip">💕 Mood sahi choose karo — result aur better hoga</div>
            </div>
          </div>

          {history.length > 0 && (
            <div className="cs-card">
              <div className="cs-card-title">📚 Recent</div>
              <div className="cs-history">
                {history.map((h, i) => (
                  <div key={i} className="cs-history-item" onClick={() => setResult(h.result)}>
                    <div className="cs-history-type">{h.type}</div>
                    <div className="cs-history-topic">{h.topic}</div>
                    <div className="cs-history-meta">{h.mood} • {h.language}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="cs-card cs-inspiration-card">
            <div className="cs-card-title">🌟 Inspiration</div>
            <div className="cs-inspiration-list">
              {['Pehli mohabbat 💕', 'Dil ka dard 😢', 'Maa ki yaad 🤍', 'Dosti ki raah 🤝', 'Sapno ki duniya ✨', 'Watan se pyaar 🇮🇳'].map(ins => (
                <button key={ins} className="cs-inspiration-btn" onClick={() => setTopic(ins.replace(/[💕😢🤍🤝✨🇮🇳]/g, '').trim())}>
                  {ins}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}