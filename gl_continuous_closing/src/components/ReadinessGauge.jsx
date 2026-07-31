export default function ReadinessGauge({ score }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = score >= 90 ? '#22c55e' : score >= 70 ? '#eab308' : '#ef4444'

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#1e293b" strokeWidth="12" />
        <circle
          cx="70" cy="70" r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="70" y="66" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" fontFamily="system-ui">
          {score}%
        </text>
        <text x="70" y="86" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="system-ui">
          Ready to Close
        </text>
      </svg>
    </div>
  )
}
