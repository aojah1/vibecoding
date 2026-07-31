const MAP = {
  critical: 'bg-red-900 text-red-300 border border-red-700',
  high:     'bg-orange-900 text-orange-300 border border-orange-700',
  medium:   'bg-yellow-900 text-yellow-300 border border-yellow-700',
  low:      'bg-slate-700 text-slate-300 border border-slate-600',
}

export default function SeverityBadge({ severity }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${MAP[severity] || MAP.low}`}>
      {severity}
    </span>
  )
}
