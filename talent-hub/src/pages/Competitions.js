import './competitions.css';
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy, Users, Award, Search, ShieldCheck, Gift, Globe, Lock, Star,
  Medal, Youtube, Instagram, Twitter, Bell, Sparkles, CheckCircle2, Calendar
} from "lucide-react";
import API from "../config";

// ── constants ────────────────────────────────────────────────────────────────
const ACCENT = {
  orange: "#ff6b35", green: "#00c896", blue: "#4facfe",
  gold: "#f5a623", pink: "#f472b6", red: "#ff4d6d",
};
const RANK_COLORS = ["#f5c518", "#c0c0c0", "#cd7f32"]; // gold, silver, bronze
const AVATAR_BG = {
  orange: ["#c24d1a", "#7a3010", "#4a1a06"],
  green:  ["#00a07a", "#007558", "#004d3a"],
  blue:   ["#185fa5", "#0c447c", "#073060"],
  gold:   ["#b87a10", "#7a5200", "#4a3200"],
  pink:   ["#993370", "#6b2350", "#4a1830"],
  red:    ["#a32d2d", "#6e1f1f", "#4a1414"],
};

function PlatformIcon({ platform, size = 11 }) {
  if (platform === "instagram") return <Instagram size={size} />;
  if (platform === "twitter")   return <Twitter size={size} />;
  return <Youtube size={size} />;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const getEmptyQuote = (category) => {
  const quotes = {
    Singing: "Duniya sunna chahti hai aapki awaaz. Pehle enter karo.",
    Dance: "Dance floor khali hai — pehla move aapka hai!",
    Rap: "Desi rap ka pehla naam aap ho sakte ho.",
    Comedy: "Yahan abhi koi nahi hansa — pehle aap hasaao!",
    Acting: "Acting Arena mein abhi tak koi audition nahi hua.",
    Instrumental: "Abhi stage khali hai — pehla kadam aapka intezaar kar raha hai.",
    Poetry: "Alfaaz aapke, awaz aapki, stage khali hai."
  };
  return quotes[category] || "Be the first to join this competition and make history!";
};

// ── sub-components ───────────────────────────────────────────────────────────

function EmptyTP({ quote, color, isEnded }) {
  const accentColor = ACCENT[color] || color || "#ff6b35";
  return (
    <div style={styles.tpBox}>
      <div style={styles.tpHeader}>
        {isEnded ? (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Trophy size={11} color="#ffb800" /> Final Winners</span>
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Award size={11} color={accentColor} /> Top Performers</span>
        )}
      </div>
      <div style={styles.emptyState}>
        <div style={{ display: "inline-flex", background: `${accentColor}10`, padding: 9, borderRadius: "50%", marginBottom: 8 }}>
          <Star size={18} color={accentColor} style={{ opacity: 0.8 }} />
        </div>
        <div style={styles.emptyQuote}>"{quote}"</div>
        {!isEnded && (
          <div style={{ fontSize: 10.5, fontWeight: 600, color: accentColor }}>
            Pehle bano — leaderboard aapka intezaar kar raha hai!
          </div>
        )}
      </div>
    </div>
  );
}

function PerformersList({ performers, color, isEnded }) {
  const accentColor = ACCENT[color] || color || "#ff6b35";
  return (
    <div style={styles.tpBox}>
      <div style={styles.tpHeader}>
        {isEnded ? (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Trophy size={11} color="#ffb800" /> Final Winners</span>
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Award size={11} color={accentColor} /> Top Performers</span>
        )}
      </div>
      {performers.slice(0, 3).map((p, i) => {
        const bg = (AVATAR_BG[color] || AVATAR_BG.blue)[i] || "#7c3aed";
        const initials = p.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
        const scoreCol = i === 0 ? accentColor : "#8b87a8";
        return (
          <div key={i} style={{ ...styles.performerRow, borderBottom: i < performers.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
            <span style={{ width: 16, display: "flex", justifyContent: "center", flexShrink: 0 }}>
              {isEnded && RANK_COLORS[i] ? (
                <Medal size={13} color={RANK_COLORS[i]} />
              ) : (
                <span style={{ fontSize: 10, color: "#555" }}>{i + 1}</span>
              )}
            </span>
            <div style={{ ...styles.pAvatar, background: bg }}>{initials || "P"}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.pName}>{p.name}</div>
              <div style={styles.pChannel}>
                <PlatformIcon platform={p.platform} /> {p.channel || `@${p.name.replace(/\s+/g, '').toLowerCase()}`}
              </div>
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: scoreCol, flexShrink: 0 }}>
              {isEnded ? ["Winner", "2nd", "3rd"][i] : (p.score ? p.score + " ★" : "Joined")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TopPerformers({ comp }) {
  if (comp.status === "ended") {
    if (comp.winners && comp.winners.length > 0) {
      return <PerformersList performers={comp.winners} color={comp.color} isEnded={true} />;
    }
    return <EmptyTP quote="Is competition ke winners abhi announce nahi hue." color={comp.color} isEnded={true} />;
  }

  if (comp.status === "active") {
    if (!comp.participants || comp.participants.length === 0) {
      return <EmptyTP quote={getEmptyQuote(comp.category)} color={comp.color} isEnded={false} />;
    }

    const performers = comp.participants.map((p, idx) => ({
      name: p.username || "User",
      channel: `@${p.username || "user"}`,
      platform: "youtube",
      score: (4.9 - idx * 0.1).toFixed(1),
      channelUrl: "#"
    }));
    return <PerformersList performers={performers} color={comp.color} isEnded={false} />;
  }

  return <EmptyTP quote={getEmptyQuote(comp.category)} color={comp.color} isEnded={false} />;
}

function ProgressBar({ comp, joined }) {
  const maxParts = comp.maxParticipants || comp.total || 100;
  const pct = maxParts > 0 ? Math.min(100, Math.round((joined / maxParts) * 100)) : 0;
  const isFull = pct === 100;
  const col = ACCENT[comp.color] || comp.color || "#ff6b35";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={styles.progressMeta}>
        <span style={{ fontSize: 11, color: "#8b87a8" }}>{joined}/{maxParts} joined</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: isFull ? col : "#f0edf8" }}>
          {isFull ? "Full" : pct + "%"}
        </span>
      </div>
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: pct + "%", background: col }} />
      </div>
    </div>
  );
}

function CompCard({ comp, joined, onRegister, registeringId }) {
  const accentColor = ACCENT[comp.color] || comp.color || "#ff6b35";

  const statusBadge =
    comp.status === "active" ? (
      <span style={{ ...styles.badge, background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>
        <span style={{ ...styles.statusDot, background: "#10b981" }} /> Active
      </span>
    ) : comp.status === "ended" ? (
      <span style={{ ...styles.badge, background: "rgba(139,135,168,0.1)", color: "#8b87a8", border: "1px solid rgba(139,135,168,0.2)" }}>
        <Trophy size={10} /> Ended
      </span>
    ) : (
      <span style={{ ...styles.badge, background: "rgba(255,107,53,0.1)", color: "#ff6b35", border: "1px solid rgba(255,107,53,0.2)" }}>
        <span style={{ ...styles.statusDot, background: "#ff6b35" }} /> Upcoming
      </span>
    );

  const levelBadge = (
    <span style={{ ...styles.badge, background: "rgba(79,172,254,0.1)", color: "#4facfe", border: "1px solid rgba(79,172,254,0.2)" }}>
      {comp.difficulty || "Open"}
    </span>
  );

  const calLabel = comp.status === "ended" ? "Ended" : comp.status === "active" ? "Ends" : "Starts";
  const displayDate = comp.status === "upcoming" ? comp.startDate : comp.deadline;

  // Set action button fields dynamically
  let btnLabel = "Coming Soon";
  let BtnIcon = Bell;
  let btnColor = accentColor;
  let btnTxt = "#fff";
  let isActionEnabled = false;

  if (comp.status === "active") {
    btnLabel = "Join Now";
    BtnIcon = Sparkles;
    btnColor = "#00c896";
    isActionEnabled = true;
  } else if (comp.status === "ended") {
    btnLabel = "Winners";
    BtnIcon = Trophy;
    btnColor = "#4facfe";
  }

  // Check if current user is registered
  const user = JSON.parse(localStorage.getItem("th_user") || "null");
  const myId = user?.id || user?._id;
  const isRegistered = comp.participants?.some(p => {
    const id = p._id || p;
    return id.toString() === (myId || "").toString();
  });

  if (comp.status === "active" && isRegistered) {
    btnLabel = "Registered";
    BtnIcon = CheckCircle2;
    btnColor = "#10b981";
    isActionEnabled = false;
  }

  return (
    <div style={{ ...styles.card, borderTop: `3px solid ${accentColor}` }} className="comp-card th-premium-card-redesign">
      <div style={styles.cardHeader}>
        <div style={{ ...styles.cardEmoji, background: `${accentColor}10`, color: accentColor }}>
          <Trophy size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={styles.cardBadges}>{statusBadge}{levelBadge}</div>
          <div style={styles.cardTitle}>{comp.name || comp.title}</div>
        </div>
        <div style={{ fontSize: 10.5, color: "#8b87a8", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
          <Calendar size={11} /> {calLabel}: {formatDate(displayDate)}
        </div>
      </div>
      <div style={styles.cardMeta}>
        {(comp.tags || []).map(t => (
          <span key={t} style={{ ...styles.metaTag, borderColor: accentColor + "33", color: accentColor, background: `${accentColor}08` }}>{t}</span>
        ))}
      </div>
      <p style={styles.cardDesc}>{comp.description || comp.desc}</p>

      <TopPerformers comp={comp} />

      {comp.status === "ended" && (
        <div style={{ fontSize: 9.5, fontWeight: 600, color: "#8b87a8", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
          <Users size={10} /> PARTICIPATION
        </div>
      )}

      <ProgressBar comp={comp} joined={joined} />

      <div style={styles.cardActions}>
        <button
          style={{ ...styles.btnP, background: btnColor, color: btnTxt }}
          disabled={!isActionEnabled || registeringId === comp._id}
          onClick={() => isActionEnabled && onRegister(comp._id)}
        >
          <BtnIcon size={13} /> {registeringId === comp._id ? "Joining..." : btnLabel}
        </button>
        <button style={styles.btnS}>Details →</button>
      </div>
    </div>
  );
}

// ── main page ────────────────────────────────────────────────────────────────
export default function CompetitionsPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("th_token");

  const [competitions, setCompetitions] = useState([]);
  const [stats, setStats] = useState({ total_participants: 0, active_count: 0 });
  const [activeFilter, setActiveFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [registeringId, setRegisteringId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCompetitions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/competitions`);
      const data = await res.json();
      if (res.ok) {
        setCompetitions(data || []);
      }
    } catch (err) {
      console.error("Error fetching competitions:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/api/auth/count`);
      const data = await res.json();
      if (res.ok) {
        setStats(prev => ({
          ...prev,
          total_participants: data.count || 0
        }));
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  useEffect(() => {
    fetchCompetitions();
    fetchStats();
  }, []);

  const handleRegister = async (compId) => {
    if (!token) {
      alert("Please login first to participate in competitions!");
      navigate("/login");
      return;
    }

    setRegisteringId(compId);
    try {
      const res = await fetch(`${API}/api/competitions/${compId}/register`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Registered successfully!");
        fetchCompetitions(); // Reload to refresh progress fills and lists
      } else {
        alert(data.error || data.message || "Failed to register.");
      }
    } catch (err) {
      alert("Network error. Please try again.");
    } finally {
      setRegisteringId(null);
    }
  };

  // derived state filters
  const activeCount = competitions.filter(c => c.status === "active").length;
  const totalParticipants = stats.total_participants || competitions.reduce((sum, c) => sum + (c.participants?.length || 0), 0);

  const filtered = competitions.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase()) ||
                          c.description?.toLowerCase().includes(search.toLowerCase());

    const matchesCat = activeFilter === "All" || c.category === activeFilter;

    let matchesStatus = true;
    if (statusFilter !== "All") {
      matchesStatus = c.status === statusFilter.toLowerCase();
    }

    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <div style={styles.page}>
      <style>{`
        body { background: #0f0e17; }
        .comp-card { transition: transform .3s ease, border-color .3s ease, box-shadow .3s ease !important; }
        .comp-card:hover { transform: translateY(-3px) !important; }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:.9} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
      `}</style>

      <div style={styles.wrap}>
        {/* Premium Page Hero */}
        <div className="th-page-hero">
          <div className="th-page-hero-text">
            <h1 className="th-page-hero-title">COMPETE. PERFORM. <span>WIN.</span></h1>
            <p className="th-page-hero-subtitle">Showcase your talent, join active challenges, perform on the virtual stage, and win ultimate glory and rewards.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600 }}>
                <span style={styles.liveDot} />
                <span style={{ color: "#00c896" }}>
                  {activeCount} Active Now
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: "#B8B8C5", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <Users size={13} color="#8b87a8" /> {totalParticipants.toLocaleString()} Participants
              </div>
            </div>
          </div>
          <div className="th-page-hero-img-wrap" style={{ background: "rgba(245,166,35,0.1)", color: "#f5a623", borderRadius: "50%", width: "60px", height: "60px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Trophy size={28} />
          </div>
        </div>

        {/* FILTERS */}
        <div style={styles.filterRow}>
          <div style={{ position: "relative", flex: "0 0 220px" }}>
            <span style={styles.searchIcon}><Search size={13} color="#8b87a8" /></span>
            <input
              style={styles.searchInput}
              placeholder="Search competitions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span style={styles.filterLabel}>Category:</span>
          <div style={styles.filterGroup}>
            {["All","Singing","Dance","Rap","Comedy","Acting","Instrumental","Poetry"].map(f => (
              <button key={f}
                className={activeFilter === f ? "fbActive" : "fb"}
                style={{ border: "1px solid rgba(139,92,246,0.15)", outline: "none" }}
                onClick={() => setActiveFilter(f)}>{f}</button>
            ))}
          </div>
          <div style={styles.dividerV} />
          <span style={styles.filterLabel}>Status:</span>
          <div style={styles.filterGroup}>
            {["All","Active","Upcoming","Ended"].map(f => (
              <button key={f}
                className={statusFilter === f ? "fbActive" : "fb"}
                style={{ border: "1px solid rgba(139,92,246,0.15)", outline: "none" }}
                onClick={() => setStatusFilter(f)}>{f}</button>
            ))}
          </div>
        </div>

        {/* Challenge list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "70px 20px" }}>
            <div className="admin-spinner" style={{ width: 36, height: 36, border: "3px solid rgba(167, 139, 250, 0.15)", borderLeftColor: "#a78bfa", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
            <p style={{ color: "#8b87a8" }}>Loading competitions...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="th-empty-state-illustrated">
            <div className="th-empty-state-icon-wrapper" style={{ color: "#f5a623", background: "rgba(245,166,35,0.1)", borderColor: "rgba(245,166,35,0.2)" }}>
              <Trophy size={28} />
            </div>
            <h3>No competitions found</h3>
            <p>We couldn't find any challenges matching your filters. Try selecting another category or typing different keywords.</p>
            <button className="th-empty-state-cta-btn" onClick={() => { setActiveFilter("All"); setStatusFilter("All"); setSearch(""); }}>
              Reset Filters
            </button>
          </div>
        ) : (
          <div style={styles.cardsGrid}>
            {filtered.map(comp => (
              <CompCard
                key={comp._id}
                comp={comp}
                joined={comp.participants?.length || 0}
                onRegister={handleRegister}
                registeringId={registeringId}
              />
            ))}
          </div>
        )}

        {/* FOOTER */}
        <div style={styles.footerStrip}>
          {[
            { icon: <ShieldCheck size={18} color="#a78bfa" />, color: "rgba(167,139,250,.1)", title: "Fair Play",       sub: "Transparent judging & fair evaluation" },
            { icon: <Gift size={18} color="#ff6b35" />, color: "rgba(255,107,53,.1)",  title: "Exciting Rewards", sub: "Win recognition for your talent" },
            { icon: <Globe size={18} color="#4facfe" />, color: "rgba(79,172,254,.1)",  title: "Open for All",     sub: "Anyone can participate from anywhere" },
            { icon: <Lock size={18} color="#00c896" />, color: "rgba(0,200,150,.1)",   title: "Safe & Secure",    sub: "Your data and identity are protected" },
          ].map((item, index) => (
            <div key={index} style={styles.fi}>
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
  page:         { minHeight: "100vh", paddingBottom: 32, fontFamily: "'Poppins', sans-serif", color: "#f0edf8" },
  wrap:         { maxWidth: 1200, margin: "0 auto", padding: "28px 20px 32px" },
  liveDot:      { display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#00c896", animation: "pulse 1.5s infinite", flexShrink: 0 },
  statusDot:    { display: "inline-block", width: 6, height: 6, borderRadius: "50%" },
  filterRow:    { display: "flex", alignItems: "center", gap: 10, margin: "18px 0 24px", flexWrap: "wrap" },
  searchIcon:   { position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center" },
  searchInput:  { width: "100%", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px 8px 30px", fontSize: 12.5, color: "#f0edf8", fontFamily: "'Poppins', sans-serif", outline: "none" },
  filterLabel:  { fontSize: 11.5, color: "#8b87a8", fontWeight: 500, whiteSpace: "nowrap" },
  filterGroup:  { display: "flex", gap: 5, flexWrap: "wrap" },
  dividerV:     { width: 1, height: 22, background: "#2e2a45" },
  cardsGrid:    { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 },
  card:         { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 18, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", transition: "all 0.3s ease" },
  cardHeader:   { display: "flex", alignItems: "flex-start", gap: 11, marginBottom: 11 },
  cardEmoji:    { width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardBadges:   { display: "flex", gap: 5, marginBottom: 5, flexWrap: "wrap" },
  badge:        { padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 },
  cardTitle:    { fontSize: 15.5, fontWeight: 700, color: "#f0edf8", lineHeight: 1.25 },
  cardMeta:     { display: "flex", gap: 5, marginBottom: 9, flexWrap: "wrap" },
  metaTag:      { padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 500, border: "1px solid" },
  cardDesc:     { fontSize: 12, color: "#8b87a8", lineHeight: 1.55, marginBottom: 12, flexGrow: 1 },
  tpBox:        { borderRadius: 8, padding: "10px 12px", marginBottom: 12, border: "1px solid var(--border)", background: "rgba(255, 255, 255, 0.01)" },
  tpHeader:     { fontSize: 9.5, fontWeight: 600, color: "#8b87a8", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  emptyState:   { textAlign: "center", padding: "6px 6px" },
  emptyQuote:   { fontSize: 12, color: "#8b87a8", lineHeight: 1.55, fontStyle: "italic", marginBottom: 5 },
  performerRow: { display: "flex", alignItems: "center", gap: 9, padding: "5px 0", animation: "fadeIn .35s ease" },
  pAvatar:      { width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0, color: "#fff" },
  pName:        { fontSize: 11.5, fontWeight: 600, color: "#f0edf8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  pChannel:     { fontSize: 10.5, color: "#4facfe", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 3, textDecoration: "none" },
  progressMeta: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  progressBar:  { height: 5, background: "rgba(0,0,0,0.2)", borderRadius: 99, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 99, transition: "width .6s ease" },
  cardActions:  { display: "flex", gap: 8, marginTop: "auto" },
  btnP:         { flex: 1, padding: "9px 0", borderRadius: 8, border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "'Poppins', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  btnS:         { padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)", color: "#8b87a8", fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "'Poppins', sans-serif" },
  footerStrip:  { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 22px", marginTop: 30, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 },
  fi:           { display: "flex", alignItems: "flex-start", gap: 11 },
  fiIcon:       { width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  fiTitle:      { fontSize: 12.5, fontWeight: 600, color: "#f0edf8", marginBottom: 2 },
  fiSub:        { fontSize: 11, color: "#8b87a8", lineHeight: 1.5 },
};