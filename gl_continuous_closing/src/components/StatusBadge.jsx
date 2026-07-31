const MAP = {
  open:      'bg-red-900/60 text-red-300',
  in_review: 'bg-blue-900/60 text-blue-300',
  resolved:  'bg-green-900/60 text-green-300',
  posted:    'bg-green-900/60 text-green-300',
  pending:   'bg-yellow-900/60 text-yellow-300',
  flagged:   'bg-red-900/60 text-red-300',
  running:   'bg-green-900/60 text-green-300',
  idle:      'bg-slate-700 text-slate-400',
}

const LABELS = {
  in_review: 'In Review',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MAP[status] || 'bg-slate-700 text-slate-400'}`}>
      {LABELS[status] || status}
    </span>
  )
}
