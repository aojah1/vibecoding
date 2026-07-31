import { motion, AnimatePresence } from 'framer-motion'

const STATION_POSITIONS = [
  { id: 1, x: 62, y: 42, brand: 'EXXON' },
  { id: 2, x: 78, y: 28, brand: 'Shell' },
  { id: 3, x: 45, y: 58, brand: 'BP' },
  { id: 4, x: 82, y: 60, brand: 'Chev' },
]

const BRAND_COLORS = {
  EXXON: '#EF4444',
  Shell: '#F59E0B',
  BP: '#10B981',
  Chev: '#3B82F6',
}

export default function RadarMap({ bids, carStatus, acceptedBid }) {
  const bidStationIds = bids.map((b) => b.stationId)

  return (
    <div className="relative w-full aspect-square max-w-xs mx-auto">
      {/* Map background */}
      <svg viewBox="0 0 120 120" className="w-full h-full">
        {/* Road grid */}
        <rect width="120" height="120" fill="#1e293b" rx="12" />
        {/* Roads */}
        <line x1="0" y1="50" x2="120" y2="50" stroke="#334155" strokeWidth="3" />
        <line x1="0" y1="70" x2="120" y2="70" stroke="#334155" strokeWidth="3" />
        <line x1="60" y1="0" x2="60" y2="120" stroke="#334155" strokeWidth="3" />
        <line x1="30" y1="0" x2="30" y2="120" stroke="#334155" strokeWidth="2" strokeDasharray="4 3" />
        <line x1="90" y1="0" x2="90" y2="120" stroke="#334155" strokeWidth="2" strokeDasharray="4 3" />
        {/* Route corridor highlight */}
        <rect x="54" y="0" width="12" height="120" fill="#F59E0B" opacity="0.08" />
        <rect x="0" y="44" width="120" height="12" fill="#F59E0B" opacity="0.08" />

        {/* Stations */}
        {STATION_POSITIONS.map((s) => {
          const hasBid = bidStationIds.includes(s.id)
          const isAccepted = acceptedBid?.stationId === s.id
          const color = BRAND_COLORS[s.brand]
          return (
            <g key={s.id}>
              {hasBid && !isAccepted && (
                <circle cx={s.x} cy={s.y} r="8" fill={color} opacity="0.15">
                  <animate attributeName="r" values="6;14;6" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              {isAccepted && (
                <circle cx={s.x} cy={s.y} r="10" fill="#10B981" opacity="0.3">
                  <animate attributeName="r" values="8;16;8" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                cx={s.x} cy={s.y} r="5"
                fill={isAccepted ? '#10B981' : hasBid ? color : '#475569'}
                stroke={isAccepted ? '#ffffff' : 'none'}
                strokeWidth="1.5"
              />
              <text x={s.x} y={s.y - 7} textAnchor="middle" fill="white" fontSize="4" fontWeight="bold">
                {s.brand}
              </text>
            </g>
          )
        })}

        {/* Car position */}
        <g transform="translate(60, 50)">
          <circle r="6" fill="#F59E0B" />
          <text textAnchor="middle" y="1.5" fill="#0F172A" fontSize="6">🚗</text>
        </g>

        {/* Radar sweep when requesting */}
        {carStatus === 'requesting' && (
          <circle cx="60" cy="50" r="30" fill="none" stroke="#F59E0B" strokeWidth="1" opacity="0.4">
            <animate attributeName="r" values="10;55;10" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1">
        {Object.entries(BRAND_COLORS).map(([brand, color]) => (
          <div key={brand} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-xs text-slate-400">{brand}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
