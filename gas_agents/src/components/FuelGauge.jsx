export default function FuelGauge({ level }) {
  const pct = Math.min(100, Math.max(0, level))
  const angle = -135 + (pct / 100) * 270
  const color = pct > 50 ? '#10B981' : pct > 25 ? '#F59E0B' : '#EF4444'

  return (
    <div className="relative flex flex-col items-center">
      <svg width="160" height="120" viewBox="0 0 160 120">
        {/* Background arc */}
        <path
          d="M 20 110 A 60 60 0 1 1 140 110"
          fill="none"
          stroke="#334155"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Colored arc */}
        <path
          d="M 20 110 A 60 60 0 1 1 140 110"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * 220} 220`}
          style={{ transition: 'stroke-dasharray 1s ease, stroke 0.5s' }}
        />
        {/* Needle */}
        <line
          x1="80" y1="80"
          x2={80 + 50 * Math.cos((angle * Math.PI) / 180)}
          y2={80 + 50 * Math.sin((angle * Math.PI) / 180)}
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ transition: 'all 1s ease' }}
        />
        <circle cx="80" cy="80" r="5" fill={color} />
        {/* Labels */}
        <text x="14" y="125" fill="#64748B" fontSize="10" fontWeight="bold">E</text>
        <text x="141" y="125" fill="#64748B" fontSize="10" fontWeight="bold">F</text>
      </svg>
      <div className="text-center -mt-2">
        <div className="text-3xl font-bold" style={{ color }}>{pct}%</div>
        <div className="text-xs text-slate-400 mt-1">Fuel Level</div>
      </div>
    </div>
  )
}
