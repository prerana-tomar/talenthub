import { useState, useEffect } from "react";

// ── constants ────────────────────────────────────────────────────────────────
const ACCENT = {
  orange: "#ff6b35", green: "#00c896", blue: "#4facfe",
  gold: "#f5a623", pink: "#f472b6", red: "#ff4d6d",
};
const RANKS = ["🥇", "🥈", "🥉"];
const AVATAR_BG = {
  orange: ["#c24d1a", "#7a3010", "#4a1a06"],
  green:  ["#00a07a", "#007558", "#004d3a"],
  blue:   ["#185fa5", "#0c447c", "#073060"],
  gold:   ["#b87a10", "#7a5200", "#4a3200"],
  pink:   ["#993370", "#6b2350", "#4a1830"],
  red:    ["#a32d2d", "#6e1f1f", "#4a1414"],
};
const PLATFORM_ICON = {
  youtube: "🎬", instagram: "📸", twitter: "🐦",
};

function futureMs(days, hours = 0, mins = 0, secs = 0) {
  return Date.now() + ((days * 86400) + (hours * 3600) + (mins * 60) + secs) * 1000;
}
function pastMs(days) {
  return Date.now() - days * 86400 * 1000;
}

const COMPETITIONS = [
  {
    id: "comp_1", color: "orange", emoji: "🎸",
    title: "Instrumental Showdown", status: "upcoming", level: "Open",
    tags: ["Any Instrument", "Any Genre", "2–5 min"], tagColor: "orange",
    desc: "Any instrument, any genre. Classical sitar to electric guitar — express yourself without words.",
    targetMs: futureMs(43, 5, 43, 32), cdLabel: "STARTS IN", total: 60,
    btnLabel: "🔔 Coming Soon", btnColor: "#ff6b35", btnTxt: "#fff",
    emptyQuotes: [
      "Abhi stage khali hai — pehla kadam aapka intezaar kar raha hai.",
      "Pehla performer legend ban jaata hai. Kya aap taiyaar hain?",
      "History yaad karti hai unhe jo pehle uthte hain. 🎸",
    ],
  },
  {
    id: "comp_2", color: "green", emoji: "🎤",
    title: "Singing Sensation", status: "active", level: "Open",
    tags: ["Solo/Duet", "Any Language", "3–5 min"], tagColor: "green",
    desc: "Sing your heart out — any language, any style. Bollywood, classical, folk, or original. Soul wins.",
    targetMs: futureMs(6, 14, 22, 8), cdLabel: "ENDS IN", total: 200,
    btnLabel: "✨ Join Now", btnColor: "#00c896", btnTxt: "#fff",
    emptyQuotes: [
      "Duniya sunna chahti hai aapki awaaz. Sirf enter karo.",
      "Pehla participant hamesha yaad kiya jaata hai. 🎤",
    ],
  },
  {
    id: "comp_3", color: "blue", emoji: "🎭",
    title: "Acting Arena", status: "ended", level: "Intermediate",
    tags: ["Monologue/Scene", "Any Theme", "3–6 min"], tagColor: "blue",
    desc: "Monologue, scene, or dialogue — bring your character to life. Emotional depth wins.",
    targetMs: pastMs(5), cdLabel: "", total: 200,
    btnLabel: "🏆 See Winners", btnColor: "#4facfe", btnTxt: "#fff",
    emptyQuotes: [
      "Is competition ke winners abhi announce nahi hue.",
      "Results bahut jaldi aayenge — bane rahe!",
    ],
  },
  {
    id: "comp_4", color: "gold", emoji: "😂",
    title: "Comedy Night", status: "upcoming", level: "Open",
    tags: ["Stand-up/Skit", "Clean Content", "2–5 min"], tagColor: "gold",
    desc: "Make India laugh! Stand-up, skit, or improvised comedy. Keep it clean and creative.",
    targetMs: futureMs(28, 5, 43, 32), cdLabel: "STARTS IN", total: 80,
    btnLabel: "🔔 Coming Soon", btnColor: "#f5a623", btnTxt: "#1a1000",
    emptyQuotes: [
      "Yahan abhi koi nahi hansa — pehle aap hasaao!",
      "Empty leaderboard = pehla spot guarantee. 😂",
    ],
  },
  {
    id: "comp_5", color: "pink", emoji: "💃",
    title: "Dance Battle", status: "active", level: "Open",
    tags: ["Solo/Group", "Any Style", "1–3 min"], tagColor: "pink",
    desc: "Hip-hop to Kathak — let your feet do the talking. Any style, any energy. Own the stage.",
    targetMs: futureMs(2, 18, 5, 44), cdLabel: "ENDS IN", total: 150,
    btnLabel: "✨ Join Now", btnColor: "#f472b6", btnTxt: "#fff",
    emptyQuotes: ["Dance floor khali hai — pehla move aapka hai! 💃"],
  },
  {
    id: "comp_6", color: "red", emoji: "🎙️",
    title: "Rap Cypher", status: "upcoming", level: "Open",
    tags: ["Original Lyrics", "Hindi/English", "1–3 min"], tagColor: "red",
    desc: "Spit bars, tell your story. Original lyrics only. Hindi, English, or both — desi rap ki asli takkar.",
    targetMs: futureMs(15, 9, 30, 17), cdLabel: "STARTS IN", total: 100,
    btnLabel: "🔔 Coming Soon", btnColor: "#ff4d6d", btnTxt: "#fff",
    emptyQuotes: [
      "Teri awaaz ka intezaar hai — stage khula hai. 🎙️",
      "Desi rap ka pehla naam aap ho sakte ho is competition mein.",
    ],
  },
];

// ── REAL BACKEND API ─────────────────────────────────────────────────────────
// Replace BASE_URL with your actual backend URL
const BASE_URL = "https://talenthub-w1cc.onrender.com";

async function fetchStats() {
  try {
    const [userRes, vidRes] = await Promise.all([
      fetch(`${BASE_URL}/api/auth/count`),
      fetch(`${BASE_URL}/api/videos`),
    ]);
    const userData = await userRes.json();
    const vidData  = await vidRes.json();

    return {
      total_participants: userData.count || 0,
      active_count: 2,
      competitions: {
        comp_1: { joined: 120 },
        comp_2: { joined: 340 },
        comp_3: { joined: 500 },
        comp_4: { joined: 45  },
        comp_5: { joined: 280 },
        comp_6: { joined: 60  },
      }
    };
  } catch {
    return {
      total_participants: 0,
      active_count: 0,
      competitions: {}
    };
  }
}

async function fetchPerformers(compId) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `Return ONLY a JSON array of top 3 performers for competition "${compId}".
Rules:
- comp_1 (upcoming): return []
- comp_2 (active singing): return 3 Indian performers
- comp_3 (ended acting): return 3 Indian performers
- comp_4 (upcoming comedy): return []
- comp_5 (active dance): return 3 Indian performers
- comp_6 (upcoming rap): return []
Each object: {"name":"Full Name","channel":"@handle","platform":"youtube","score":4.8,"channelUrl":"#"}
Return ONLY the JSON array, no markdown.`
        }]
      })
    });
    const data  = await res.json();
    const text  = data.content?.map(b => b.type === 'text' ? b.text : '').join('') || '[]';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return [];
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, "0"); }

function calcCountdown(targetMs) {
  const diff = Math.max(0, targetMs - Date.now());
  const totalSec = Math.floor(diff / 1000);
  return {
    d: Math.floor(totalSec / 86400),
    h: Math.floor((totalSec % 86400) / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
  };
}

// ── sub-components ───────────────────────────────────────────────────────────
function Countdown({ comp }) {
  const [cd, setCd] = useState(calcCountdown(comp.targetMs));
  useEffect(() => {
    if (comp.status === "ended") return;
    const id = setInterval(() => setCd(calcCountdown(comp.targetMs)), 1000);
    return () => clearInterval(id);
  }, [comp]);
  if (comp.status === "ended") return null;
  const col = ACCENT[comp.color];
  return (
    <div>
      <div style={styles.cdLabel}>⏱ {comp.cdLabel}</div>
      <div style={styles.countdown}>
        {[["d","Days"],["h","Hrs"],["m","Mins"],["s","Secs"]].map(([k, label]) => (
          <div key={k} style={styles.cBox}>
            <div style={{ ...styles.cNum, color: col }}>{pad(cd[k])}</div>
            <div style={styles.cUnit}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonTP() {
  return (
    <div style={styles.tpBox}>
      <div style={styles.tpHeader}>⭐ Top Performers</div>
      {[0,1,2].map(i => (
        <div key={i} style={{ ...styles.skRow, borderBottom: i < 2 ? "1px solid #2e2a45" : "none" }}>
          <div style={styles.skCircle} />
          <div style={{ flex: 1 }}>
            <div style={{ ...styles.skLine, width: "70%", marginBottom: 5 }} />
            <div style={{ ...styles.skLine, width: "50%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}


function EmptyTP({ quotes, color, isEnded }) {
  const safeQuotes = Array.isArray(quotes) ? quotes : [];
  const q = safeQuotes.length ? safeQuotes[Math.floor(Math.random() * safeQuotes.length)] : "";


  return (
    <div style={styles.tpBox}>
      <div style={styles.tpHeader}>{isEnded ? "🏆 Final Winners" : "⭐ Top Performers"}</div>
      <div style={styles.emptyState}>
        <div style={{ fontSize: 26, marginBottom: 8, opacity: 0.6 }}>{isEnded ? "🏁" : "🌟"}</div>
        <div style={styles.emptyQuote}>"{q}"</div>
        {!isEnded && (
          <div style={{ fontSize: 11, fontWeight: 600, color: ACCENT[color] || "#ff6b35" }}>
            Pehle bano — leaderboard aapka intezaar kar raha hai!
          </div>
        )}
      </div>
    </div>
  );
}

function PerformersList({ performers, color, isEnded }) {
  return (
    <div style={styles.tpBox}>
      <div style={styles.tpHeader}>{isEnded ? "🏆 Final Winners" : "⭐ Top Performers"}</div>
      {performers.slice(0, 3).map((p, i) => {
        const bg = (AVATAR_BG[color] || AVATAR_BG.blue)[i];
        const initials = p.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
        const icon = PLATFORM_ICON[p.platform] || "🎬";
        const label = isEnded ? ["Winner","2nd","3rd"][i] : p.score + " ★";
        const scoreCol = i === 0 ? ACCENT[color] : "#8b87a8";
        return (
          <div key={i} style={{ ...styles.performerRow, borderBottom: i < performers.length - 1 ? "1px solid #2e2a45" : "none" }}>
            <span style={{ fontSize: 14, width: 18, textAlign: "center", flexShrink: 0 }}>{RANKS[i]}</span>
            <div style={{ ...styles.pAvatar, background: bg }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.pName}>{p.name}</div>
              <a href={p.channelUrl || "#"} target="_blank" rel="noreferrer" style={styles.pChannel}>
                {icon} {p.channel}
              </a>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: scoreCol, flexShrink: 0 }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function TopPerformers({ comp }) {
  const [state, setState] = useState("loading");
  const [performers, setPerformers] = useState([]);

  useEffect(() => {
    fetchPerformers(comp.id)
      .then(data => {
        if (!data || data.length === 0) setState("empty");
        else { setPerformers(data); setState("data"); }
      })
      .catch(() => setState("empty"));
  }, [comp.id]);

  if (state === "loading") return <SkeletonTP />;
  if (state === "empty") return <EmptyTP quotes={comp.emptyQuotes} color={comp.color} isEnded={comp.status === "ended"} />;
  return <PerformersList performers={performers} color={comp.color} isEnded={comp.status === "ended"} />;
}

function ProgressBar({ comp, joined }) {
  if (joined === null) {
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={styles.progressMeta}>
          <span style={{ ...styles.skLine, width: 80, display: "inline-block" }} />
          <span style={{ ...styles.skLine, width: 32, display: "inline-block" }} />
        </div>
        <div style={{ height: 5, borderRadius: 99, background: "#2e2a45", animation: "shimmer 1.4s infinite" }} />
      </div>
    );
  }
  const pct = comp.total > 0 ? Math.round((joined / comp.total) * 100) : 0;
  const isFull = pct === 100;
  const col = ACCENT[comp.color];
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={styles.progressMeta}>
        <span style={{ fontSize: 12, color: "#8b87a8" }}>{joined}/{comp.total} joined</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: isFull ? col : "#f0edf8" }}>
          {isFull ? "Full" : pct + "%"}
        </span>
      </div>
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: pct + "%", background: col }} />
      </div>
    </div>
  );
}

function CompCard({ comp, joined }) {
  const accentColor = ACCENT[comp.color];

  const statusBadge =
    comp.status === "active" ? (
      <span style={{ ...styles.badge, background: "rgba(0,200,150,.15)", color: "#00c896", border: "1px solid rgba(0,200,150,.3)" }}>🟢 Active</span>
    ) : comp.status === "ended" ? (
      <span style={{ ...styles.badge, background: "rgba(139,135,168,.15)", color: "#8b87a8", border: "1px solid rgba(139,135,168,.3)" }}>🏁 Ended</span>
    ) : (
      <span style={{ ...styles.badge, background: "rgba(255,107,53,.15)", color: "#ff6b35", border: "1px solid rgba(255,107,53,.3)" }}>⏳ Upcoming</span>
    );

  const levelBadge =
    comp.status === "ended" ? (
      <span style={{ ...styles.badge, background: "#231f35", color: "#8b87a8", border: "1px solid #2e2a45" }}>{comp.level}</span>
    ) : (
      <span style={{ ...styles.badge, background: "rgba(79,172,254,.15)", color: "#4facfe", border: "1px solid rgba(79,172,254,.3)" }}>Open</span>
    );

  const calLabel = comp.status === "ended" ? "Ended" : comp.cdLabel === "ENDS IN" ? "Ends in" : "Starts in";

  return (
    <div style={styles.card} className={`comp-card comp-card-${comp.color}`}>
      <div style={styles.cardHeader}>
        <div style={styles.cardEmoji}>{comp.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={styles.cardBadges}>{statusBadge}{levelBadge}</div>
          <div style={styles.cardTitle}>{comp.title}</div>
        </div>
        <div style={{ fontSize: 12, color: "#8b87a8", whiteSpace: "nowrap" }}>📅 {calLabel}</div>
      </div>
      <div style={styles.cardMeta}>
        {comp.tags.map(t => (
          <span key={t} style={{ ...styles.metaTag, borderColor: accentColor + "66", color: accentColor }}>{t}</span>
        ))}
      </div>
      <p style={styles.cardDesc}>{comp.desc}</p>
      <TopPerformers comp={comp} />
      <Countdown comp={comp} />
      {comp.status === "ended" && (
        <div style={{ fontSize: 10, fontWeight: 600, color: "#8b87a8", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
          👥 PARTICIPATION
        </div>
      )}
      <ProgressBar comp={comp} joined={joined} />
      <div style={styles.cardActions}>
        <button style={{ ...styles.btnP, background: comp.btnColor, color: comp.btnTxt }}>{comp.btnLabel}</button>
        <button style={styles.btnS}>Details →</button>
      </div>
    </div>
  );
}

// ── main page ────────────────────────────────────────────────────────────────
export default function CompetitionsPage() {
  const [stats, setStats] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() =>
        setStats({ total_participants: null, active_count: null, competitions: {} })
      );
  }, []);

  const totalParticipants = stats?.total_participants;
  const activeCount = stats?.active_count;

  const filtered = COMPETITIONS.filter(c => {
    const matchCat =
      activeFilter === "All" ||
      c.title.toLowerCase().includes(activeFilter.toLowerCase()) ||
      c.tags.some(t => t.toLowerCase().includes(activeFilter.toLowerCase()));
    const matchStatus =
      statusFilter === "All" ||
      (statusFilter === "Active" && c.status === "active") ||
      (statusFilter === "Upcoming" && c.status === "upcoming") ||
      (statusFilter === "Ended" && c.status === "ended");
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchStatus && matchSearch;
  });

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;600;700;800&family=Poppins:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f0e17; }
        .comp-card { transition: transform .2s, border-color .2s; }
        .comp-card:hover { transform: translateY(-3px); border-color: #a78bfa !important; }
        .comp-card-orange::before { background: #ff6b35; }
        .comp-card-green::before  { background: #00c896; }
        .comp-card-blue::before   { background: #4facfe; }
        .comp-card-gold::before   { background: #f5a623; }
        .comp-card-pink::before   { background: #f472b6; }
        .comp-card-red::before    { background: #ff4d6d; }
        .comp-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0;
          height: 3px; border-radius: 14px 14px 0 0;
        }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:.9} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
      `}</style>

      {/* NAV */}
      <nav style={styles.nav}>
        <div style={styles.navLogo}>⚡ TalentHive</div>
        <div style={styles.navLinks}>
          {["Competitions", "My Competitions", "Bookmarks"].map((l, i) => (
            <a key={l} style={{ ...styles.navLink, ...(i === 0 ? styles.navLinkActive : {}) }}>{l}</a>
          ))}
        </div>
        <div style={styles.navRight}>
          <div style={styles.liveBadge}>
            <span style={styles.liveDot} />
            {activeCount != null ? activeCount : "…"} Active Now
          </div>
          <div style={styles.statChip}>
            👥 {totalParticipants != null ? totalParticipants.toLocaleString() : "…"} Participants
          </div>
          <div style={styles.notifBtn}>🔔</div>
          <div style={styles.avatarNav}>AK</div>
        </div>
      </nav>

      <div style={styles.wrap}>
        {/* HERO */}
        <div style={styles.hero}>
          <div style={styles.heroLeft}>
            <div style={styles.trophyIcon}>🏆</div>
            <div>
              <div style={styles.heroTitle}>Competitions</div>
              <div style={styles.heroSub}>Showcase your talent. Compete. Win. Shine.</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500 }}>
              <span style={styles.liveDot} />
              <span style={{ color: "#00c896" }}>
                {activeCount != null ? activeCount : "…"} Active
              </span>
            </div>
            <div style={{ fontSize: 13, color: "#8b87a8" }}>
              👥 {totalParticipants != null ? totalParticipants.toLocaleString() : "…"} Participants
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <div style={styles.filterRow}>
          <div style={{ position: "relative", flex: "0 0 240px" }}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              style={styles.searchInput}
              placeholder="Search competitions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span style={styles.filterLabel}>Category:</span>
          <div style={styles.filterGroup}>
            {["All","Singing","Dance","Rap","Comedy","Acting","Instrumental"].map(f => (
              <button key={f}
                style={{ ...styles.fb, ...(activeFilter === f ? styles.fbActive : {}) }}
                onClick={() => setActiveFilter(f)}>{f}</button>
            ))}
          </div>
          <div style={styles.dividerV} />
          <span style={styles.filterLabel}>Status:</span>
          <div style={styles.filterGroup}>
            {["All","Active","Upcoming","Ended"].map(f => (
              <button key={f}
                style={{ ...styles.fb, ...(statusFilter === f ? styles.fbActive : {}) }}
                onClick={() => setStatusFilter(f)}>{f}</button>
            ))}
          </div>
        </div>

        {/* CARDS */}
        <div style={styles.cardsGrid}>
          {filtered.map(comp => (
            <CompCard
              key={comp.id}
              comp={comp}
              joined={stats?.competitions?.[comp.id]?.joined ?? null}
            />
          ))}
        </div>

        {/* FOOTER */}
        <div style={styles.footerStrip}>
          {[
            { icon: "🛡️", color: "rgba(167,139,250,.15)", title: "Fair Play",       sub: "Transparent judging & fair evaluation" },
            { icon: "🎁", color: "rgba(255,107,53,.15)",  title: "Exciting Rewards", sub: "Win recognition for your talent" },
            { icon: "🌐", color: "rgba(79,172,254,.15)",  title: "Open for All",     sub: "Anyone can participate from anywhere" },
            { icon: "🔒", color: "rgba(0,200,150,.15)",   title: "Safe & Secure",    sub: "Your data and identity are protected" },
          ].map(item => (
            <div key={item.title} style={styles.fi}>
              <div style={{ ...styles.fiIcon, background: item.color }}>{item.icon}</div>
              <div>
                <div style={styles.fiTitle}>{item.title}</div>
                <div style={styles.fiSub}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── styles ───────────────────────────────────────────────────────────────────
const styles = {
  page:         { background: "#0f0e17", minHeight: "100vh", paddingBottom: 40, fontFamily: "'Poppins', sans-serif", color: "#f0edf8" },
  wrap:         { maxWidth: 1200, margin: "0 auto", padding: "0 20px 40px" },
  nav:          { background: "rgba(15,14,23,0.95)", borderBottom: "1px solid #2e2a45", padding: "0 24px", display: "flex", alignItems: "center", height: 56, position: "sticky", top: 0, zIndex: 100 },
  navLogo:      { fontFamily: "'Baloo 2', cursive", fontSize: 18, fontWeight: 800, color: "#ff6b35", marginRight: 28 },
  navLinks:     { display: "flex", gap: 4 },
  navLink:      { padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "#8b87a8", cursor: "pointer", border: "none", background: "none", textDecoration: "none" },
  navLinkActive:{ background: "rgba(255,107,53,.15)", color: "#ff6b35" },
  navRight:     { marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 },
  liveBadge:    { display: "flex", alignItems: "center", gap: 6, background: "rgba(0,200,150,.1)", border: "1px solid rgba(0,200,150,.3)", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, color: "#00c896" },
  liveDot:      { display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#00c896", animation: "pulse 1.5s infinite", flexShrink: 0 },
  statChip:     { display: "flex", alignItems: "center", gap: 6, background: "#231f35", border: "1px solid #2e2a45", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#8b87a8" },
  notifBtn:     { width: 34, height: 34, borderRadius: "50%", background: "#231f35", border: "1px solid #2e2a45", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  avatarNav:    { width: 34, height: 34, borderRadius: "50%", background: "#a78bfa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 },
  hero:         { padding: "32px 0 20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  heroLeft:     { display: "flex", alignItems: "center", gap: 18 },
  trophyIcon:   { width: 56, height: 56, background: "#ff6b35", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 },
  heroTitle:    { fontFamily: "'Baloo 2', cursive", fontSize: 32, fontWeight: 800, color: "#f0edf8", lineHeight: 1.1 },
  heroSub:      { fontSize: 13, color: "#8b87a8", marginTop: 4 },
  filterRow:    { display: "flex", alignItems: "center", gap: 12, margin: "20px 0 24px", flexWrap: "wrap" },
  searchIcon:   { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 14 },
  searchInput:  { width: "100%", background: "#231f35", border: "1px solid #2e2a45", borderRadius: 8, padding: "9px 12px 9px 36px", fontSize: 13, color: "#f0edf8", fontFamily: "'Poppins', sans-serif", outline: "none" },
  filterLabel:  { fontSize: 12, color: "#8b87a8", fontWeight: 500, whiteSpace: "nowrap" },
  filterGroup:  { display: "flex", gap: 6, flexWrap: "wrap" },
  fb:           { padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, border: "1px solid #2e2a45", background: "#231f35", color: "#8b87a8", cursor: "pointer", fontFamily: "'Poppins', sans-serif", transition: "all .15s" },
  fbActive:     { background: "#a78bfa", borderColor: "#a78bfa", color: "#fff" },
  dividerV:     { width: 1, height: 24, background: "#2e2a45" },
  cardsGrid:    { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 },
  card:         { background: "#1e1b2e", border: "1px solid #2e2a45", borderRadius: 14, padding: 20, position: "relative", overflow: "hidden", cursor: "pointer" },
  cardHeader:   { display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 },
  cardEmoji:    { width: 48, height: 48, borderRadius: 12, background: "#231f35", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 },
  cardBadges:   { display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" },
  badge:        { padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
  cardTitle:    { fontFamily: "'Baloo 2', cursive", fontSize: 18, fontWeight: 700, color: "#f0edf8", lineHeight: 1.2 },
  cardMeta:     { display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  metaTag:      { padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, border: "1px solid", background: "transparent" },
  cardDesc:     { fontSize: 12.5, color: "#8b87a8", lineHeight: 1.6, marginBottom: 14 },
  tpBox:        { borderRadius: 8, padding: "12px 14px", marginBottom: 14, border: "1px solid #2e2a45", background: "#231f35" },
  tpHeader:     { fontSize: 10, fontWeight: 600, color: "#8b87a8", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  skRow:        { display: "flex", alignItems: "center", gap: 10, padding: "7px 0" },
  skCircle:     { width: 28, height: 28, borderRadius: "50%", background: "#2e2a45", flexShrink: 0, animation: "shimmer 1.4s infinite" },
  skLine:       { height: 8, borderRadius: 4, background: "#2e2a45", animation: "shimmer 1.4s infinite", display: "block" },
  emptyState:   { textAlign: "center", padding: "14px 10px" },
  emptyQuote:   { fontSize: 12.5, color: "#8b87a8", lineHeight: 1.6, fontStyle: "italic", marginBottom: 6 },
  performerRow: { display: "flex", alignItems: "center", gap: 10, padding: "6px 0", animation: "fadeIn .35s ease" },
  pAvatar:      { width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, color: "#fff" },
  pName:        { fontSize: 12, fontWeight: 600, color: "#f0edf8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  pChannel:     { fontSize: 11, color: "#4facfe", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 3, textDecoration: "none" },
  cdLabel:      { fontSize: 10, fontWeight: 600, color: "#8b87a8", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  countdown:    { display: "flex", gap: 8, marginBottom: 14 },
  cBox:         { background: "#231f35", border: "1px solid #2e2a45", borderRadius: 8, padding: "6px 10px", textAlign: "center", minWidth: 48 },
  cNum:         { fontFamily: "'Baloo 2', cursive", fontSize: 18, fontWeight: 800, lineHeight: 1 },
  cUnit:        { fontSize: 9, color: "#8b87a8", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 2 },
  progressMeta: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  progressBar:  { height: 5, background: "#1a1826", borderRadius: 99, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 99, transition: "width .6s ease" },
  cardActions:  { display: "flex", gap: 10 },
  btnP:         { flex: 1, padding: "9px 0", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  btnS:         { padding: "9px 16px", borderRadius: 8, border: "1px solid #2e2a45", background: "#231f35", color: "#8b87a8", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Poppins', sans-serif" },
  footerStrip:  { background: "#1a1826", border: "1px solid #2e2a45", borderRadius: 14, padding: "20px 24px", marginTop: 28, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 },
  fi:           { display: "flex", alignItems: "flex-start", gap: 12 },
  fiIcon:       { width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 },
  fiTitle:      { fontSize: 13, fontWeight: 600, color: "#f0edf8", marginBottom: 2 },
  fiSub:        { fontSize: 11.5, color: "#8b87a8", lineHeight: 1.5 },
};
