// Performer Icons — import individually or all at once
// Usage: import { MusicianIcon, DancerIcon } from '../components/PerformerIcons'

function Sparkle({ x, y, size = 6, accent, opacity = 0.8 }) {
  const h = size / 2, q = size / 4
  return (
    <path
      d={`M${x},${y - h} L${x + q},${y - q} L${x + h},${y} L${x + q},${y + q} L${x},${y + h} L${x - q},${y + q} L${x - h},${y} L${x - q},${y - q} Z`}
      fill={accent} opacity={opacity}
    />
  )
}

function Dot({ cx, cy, r = 1.5, accent, opacity = 0.9 }) {
  return <circle cx={cx} cy={cy} r={r} fill={accent} opacity={opacity} />
}

// ── Musician ────────────────────────────────────────────────────────────────
export function MusicianIcon({ accent = "#a78bfa", glow = "#e879f9", active = false, size = 52, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" className={className}>
      <ellipse cx="22" cy="34" rx="13" ry="11" fill={accent} opacity="0.07" />
      <ellipse cx="22" cy="36" rx="9" ry="8" fill={accent} opacity="0.18" stroke={accent} strokeWidth="1.2" />
      <ellipse cx="22" cy="27" rx="7" ry="6.5" fill={accent} opacity="0.22" stroke={accent} strokeWidth="1.2" />
      <rect x="14.5" y="30" width="15" height="4" fill="#080810" opacity="0.6" />
      <circle cx="22" cy="34" r="3" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.7" />
      <circle cx="22" cy="34" r="1" fill={accent} opacity="0.5" />
      <rect x="26" y="10" width="3.5" height="17" rx="1.5" transform="rotate(-18 26 10)" fill={accent} opacity="0.55" />
      <rect x="34" y="5" width="6" height="4" rx="1.5" transform="rotate(-18 34 5)" fill={accent} opacity="0.8" />
      {[15, 19, 23].map((y, i) => <circle key={i} cx={28 + (i - 1) * 0.5} cy={y} r="0.8" fill={accent} opacity="0.6" />)}
      {[27.5, 29, 30.5].map((x, i) => <line key={i} x1={x - i * 0.3} y1="10" x2={x - i * 0.3} y2="23" stroke={accent} strokeWidth="0.7" opacity="0.6" />)}
      <polygon points="43,16 46,20 43,24 40,20" fill={glow} opacity="0.9" />
      <line x1="38" y1="20" x2="33" y2="20" stroke={glow} strokeWidth="1" opacity="0.5" strokeDasharray="1.5 2" />
      <Sparkle x={42} y={9} size={5} accent={accent} opacity={active ? 0.9 : 0.5} />
      <Dot cx={46} cy={26} r={1.2} accent={glow} />
      <line x1="8" y1="8" x2="16" y2="24" stroke={accent} strokeWidth="0.8" opacity="0.2" />
    </svg>
  )
}

// ── Dancer ──────────────────────────────────────────────────────────────────
export function DancerIcon({ accent = "#f472b6", glow = "#fda4af", active = false, size = 52, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" className={className}>
      <ellipse cx="26" cy="48" rx="14" ry="3" fill={accent} opacity="0.12" />
      <circle cx="28" cy="8" r="4.5" fill={accent} opacity="0.85" />
      <path d="M32 6 Q38 4 36 10" stroke={accent} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M27 12 Q24 18 22 22" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <path d="M18 24 Q14 30 10 34 Q16 30 22 32 Q24 38 26 44 Q28 38 32 34 Q36 30 42 32 Q38 29 34 24 Z" fill={accent} opacity="0.2" stroke={accent} strokeWidth="1" />
      <path d="M24 26 Q32 22 40 18" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M21 26 Q18 34 14 44" stroke={accent} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <circle cx="41" cy="17" r="2" fill={accent} />
      <circle cx="13" cy="45" r="2" fill={accent} opacity="0.8" />
      <path d="M25 14 Q16 8 10 5" stroke={accent} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M28 16 Q36 18 44 22" stroke={accent} strokeWidth="2.2" strokeLinecap="round" />
      <Sparkle x={10} y={5} size={6} accent={glow} opacity={active ? 1 : 0.6} />
      <Sparkle x={44} y={22} size={5} accent={accent} opacity={active ? 0.9 : 0.5} />
      <Dot cx={6} cy={18} r={1.2} accent={glow} opacity={0.7} />
      <Dot cx={46} cy={10} r={0.9} accent={accent} opacity={0.6} />
    </svg>
  )
}

// ── Comedian ────────────────────────────────────────────────────────────────
export function ComedianIcon({ accent = "#fbbf24", glow = "#fdba74", active = false, size = 52, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" className={className}>
      <path d="M26 0 L18 20 L34 20 Z" fill={accent} opacity="0.06" />
      <circle cx="22" cy="12" r="6" fill={accent} opacity="0.8" />
      <path d="M18 14 Q22 18 26 14" stroke="#080810" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="20" cy="11" r="1.2" fill="#080810" />
      <circle cx="24" cy="11" r="1.2" fill="#080810" />
      <circle cx="20.6" cy="10.5" r="0.5" fill="white" opacity="0.9" />
      <circle cx="24.6" cy="10.5" r="0.5" fill="white" opacity="0.9" />
      <ellipse cx="30" cy="8" rx="1.2" ry="2" fill={glow} opacity="0.7" />
      <path d="M22 18 Q20 24 18 30" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <path d="M21 20 Q12 14 8 9" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="8" cy="8" r="2.5" fill={accent} opacity="0.9" />
      <path d="M21 22 Q28 24 32 28" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="34" cy="31" rx="3.5" ry="5" fill={accent} opacity="0.25" stroke={accent} strokeWidth="1.5" />
      {[28, 30, 32].map((y) => <line key={y} x1="31" y1={y} x2="37" y2={y} stroke={accent} strokeWidth="0.8" opacity="0.5" />)}
      <path d="M34 36 Q36 40 32 46" stroke={accent} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.4" />
      <path d="M18 30 Q14 38 12 46" stroke={accent} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <path d="M20 32 Q22 40 20 46" stroke={accent} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <path d="M8 2 Q16 2 16 8 Q16 14 8 14 L6 17 L5 14 Q-2 14 -2 8 Q-2 2 8 2 Z" transform="translate(4,0)" fill={accent} opacity="0.18" stroke={accent} strokeWidth="1" />
      <text x="15" y="12" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill={accent} opacity="0.95">HA!</text>
      <Sparkle x={44} y={14} size={5} accent={glow} opacity={active ? 0.8 : 0.4} />
    </svg>
  )
}

// ── Magician ────────────────────────────────────────────────────────────────
export function MagicianIcon({ accent = "#34d399", glow = "#a7f3d0", active = false, size = 52, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" className={className}>
      <ellipse cx="26" cy="28" rx="18" ry="16" fill={accent} opacity="0.05" />
      <ellipse cx="26" cy="10" rx="4" ry="3" fill={glow} opacity="0.8" />
      <ellipse cx="23" cy="5" rx="1.5" ry="4" fill={glow} opacity="0.7" />
      <ellipse cx="29" cy="5" rx="1.5" ry="4" fill={glow} opacity="0.7" />
      <ellipse cx="23" cy="5" rx="0.7" ry="2.8" fill={accent} opacity="0.5" />
      <ellipse cx="29" cy="5" rx="0.7" ry="2.8" fill={accent} opacity="0.5" />
      <circle cx="27" cy="10" r="0.8" fill="#080810" />
      <line x1="26" y1="13" x2="26" y2="18" stroke={glow} strokeWidth="1.5" strokeDasharray="1.5 2" opacity="0.6" />
      <rect x="16" y="20" width="20" height="18" rx="2" fill={accent} opacity="0.2" stroke={accent} strokeWidth="1.5" />
      <rect x="11" y="36" width="30" height="5" rx="2.5" fill={accent} opacity="0.5" stroke={accent} strokeWidth="1" />
      <rect x="16" y="32" width="20" height="3.5" fill={glow} opacity="0.3" />
      <line x1="8" y1="42" x2="36" y2="18" stroke={accent} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <circle cx="36" cy="18" r="3" fill={glow} opacity="0.9" />
      <circle cx="8" cy="42" r="2" fill={accent} opacity="0.6" />
      <Sparkle x={36} y={18} size={8} accent={glow} opacity={active ? 0.9 : 0.5} />
      <Sparkle x={8} y={14} size={6} accent={accent} opacity={0.7} />
      <Dot cx={44} cy={30} r={1.5} accent={glow} />
      <Dot cx={10} cy={28} r={1} accent={glow} opacity={0.5} />
      <path d="M16 41 Q8 46 6 50 L20 50 Z" fill={accent} opacity="0.15" />
      <path d="M36 41 Q44 46 46 50 L32 50 Z" fill={accent} opacity="0.15" />
    </svg>
  )
}

// ── DJ ──────────────────────────────────────────────────────────────────────
export function DJIcon({ accent = "#60a5fa", glow = "#93c5fd", active = false, size = 52, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" className={className}>
      <path d="M14 16 Q14 6 26 6 Q38 6 38 16" stroke={accent} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <rect x="11" y="15" width="6" height="8" rx="3" fill={accent} opacity="0.7" />
      <rect x="35" y="15" width="6" height="8" rx="3" fill={accent} opacity="0.7" />
      <circle cx="26" cy="36" r="13" fill={accent} opacity="0.1" stroke={accent} strokeWidth="1.5" />
      <circle cx="26" cy="36" r="5" fill={accent} opacity="0.15" />
      <circle cx="26" cy="36" r="2" fill={accent} opacity="0.6" />
      <circle cx="26" cy="36" r="1" fill={glow} />
      {[7, 11].map((r) => <circle key={r} cx="26" cy="36" r={r} fill="none" stroke={accent} strokeWidth="0.6" opacity="0.3" />)}
      <path d="M36 24 Q40 28 37 34" stroke={accent} strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="36" cy="24" r="2.5" fill={accent} opacity="0.7" />
      <path d="M13 28 Q9 32 13 36" stroke={accent} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M9 25 Q4 31 9 37" stroke={accent} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M5 22 Q-1 30 5 38" stroke={glow} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.4" />
      <circle cx="26" cy="36" r="13" fill="none" stroke={glow} strokeWidth="1" opacity={active ? 0.4 : 0} strokeDasharray="3 4" />
      <Sparkle x={44} y={10} size={6} accent={glow} opacity={active ? 0.9 : 0.4} />
      <Dot cx={8} cy={12} r={1.2} accent={accent} opacity={0.6} />
    </svg>
  )
}

// ── Fire Performer ──────────────────────────────────────────────────────────
export function FirePerformerIcon({ accent = "#fb923c", glow = "#fde68a", active = false, size = 52, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" className={className}>
      <path d="M8 40 Q18 10 26 26 Q34 42 44 12" stroke={accent} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" strokeDasharray="3 2" />
      <ellipse cx="8" cy="40" rx="6" ry="7" fill={glow} opacity="0.25" />
      <path d="M5 46 Q8 38 11 42 Q8 36 12 38 Q8 32 8 34 Q4 38 5 46 Z" fill={glow} opacity="0.7" />
      <path d="M6 46 Q8 41 9 43 Q8 38 10 40 Q8 36 8 37 Q5 40 6 46 Z" fill={accent} opacity="0.5" />
      <ellipse cx="44" cy="12" rx="6" ry="7" fill={glow} opacity="0.25" />
      <path d="M41 18 Q44 10 47 14 Q44 8 48 10 Q44 4 44 6 Q40 10 41 18 Z" fill={glow} opacity="0.7" />
      <path d="M42 18 Q44 13 45 15 Q44 10 46 12 Q44 8 44 9 Q41 12 42 18 Z" fill={accent} opacity="0.5" />
      <circle cx="26" cy="24" r="4" fill={accent} opacity="0.85" />
      <path d="M26 28 L26 36" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 30 Q16 34 8 40" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <path d="M28 30 Q36 20 44 12" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <path d="M25 36 Q21 42 18 48" stroke={accent} strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
      <path d="M27 36 Q31 42 34 48" stroke={accent} strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
      <Dot cx={12} cy={32} r={active ? 1.2 : 1} accent={glow} opacity={active ? 0.9 : 0.5} />
      <Dot cx={40} cy={6} r={active ? 1.5 : 1.2} accent={glow} opacity={active ? 0.8 : 0.4} />
      <Sparkle x={26} y={14} size={5} accent={glow} opacity={active ? 0.7 : 0.3} />
    </svg>
  )
}

// ── Acrobat ──────────────────────────────────────────────────────────────────
export function AcrobatIcon({ accent = "#f9a8d4", glow = "#c084fc", active = false, size = 52, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" className={className}>
      <path d="M26 0 L14 52 L38 52 Z" fill={accent} opacity="0.04" />
      <line x1="16" y1="4" x2="20" y2="18" stroke={accent} strokeWidth="1.5" opacity="0.5" />
      <line x1="36" y1="4" x2="32" y2="18" stroke={accent} strokeWidth="1.5" opacity="0.5" />
      <line x1="18" y1="18" x2="34" y2="18" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <line x1="10" y1="4" x2="42" y2="4" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="21" y1="18" x2="20" y2="22" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="31" y1="18" x2="32" y2="22" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 22 Q26 20 32 22" stroke={accent} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="26" cy="20" r="3.5" fill={accent} opacity="0.9" />
      <path d="M22 24 Q14 26 6 28" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M30 24 Q38 26 46 28" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="5" cy="28" rx="2.5" ry="1.5" fill={accent} transform="rotate(-10 5 28)" />
      <ellipse cx="47" cy="28" rx="2.5" ry="1.5" fill={accent} transform="rotate(10 47 28)" />
      <path d="M20 24 Q12 34 16 44 Q20 36 18 50" stroke={glow} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M32 24 Q40 34 36 44 Q32 36 34 50" stroke={glow} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
      <Sparkle x={6} y={22} size={5} accent={glow} opacity={active ? 0.9 : 0.5} />
      <Sparkle x={46} y={22} size={5} accent={accent} opacity={active ? 0.9 : 0.5} />
      <Dot cx={26} cy={34} r={1.5} accent={glow} opacity={0.6} />
      <path d="M10 40 Q26 30 42 40" stroke={accent} strokeWidth="1" strokeDasharray="2 3" fill="none" opacity="0.25" />
    </svg>
  )
}