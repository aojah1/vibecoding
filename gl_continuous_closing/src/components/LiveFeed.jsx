import { useEffect } from 'react'
import { useGLStore } from '../store/useGLStore'

const TYPE_STYLE = {
  ingest: 'text-blue-400',
  pass:   'text-green-400',
  alert:  'text-red-400',
}

const TYPE_PREFIX = {
  ingest: '↓ INGEST',
  pass:   '✓ PASS  ',
  alert:  '⚠ ALERT ',
}

export default function LiveFeed({ maxHeight = 'h-52' }) {
  const { feed, pushFeed } = useGLStore()

  useEffect(() => {
    const t = setInterval(pushFeed, 2400)
    return () => clearInterval(t)
  }, [pushFeed])

  return (
    <div className={`bg-slate-900 rounded-xl border border-slate-700 flex flex-col ${maxHeight}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700 shrink-0">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
          Live Pipeline Feed — PeopleSoft → AI Agents → Oracle ADB
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5 font-mono text-xs">
        {feed.length === 0 && (
          <p className="text-slate-600 text-center py-6">Waiting for events…</p>
        )}
        {feed.map(item => (
          <div key={item.key} className="flex gap-2 leading-relaxed">
            <span className="text-slate-600 shrink-0 tabular-nums">{item.ts}</span>
            <span className={`shrink-0 font-bold ${TYPE_STYLE[item.type]}`}>{TYPE_PREFIX[item.type]}</span>
            <span className="text-slate-500 shrink-0">[{item.src}]</span>
            <span className="text-slate-300">{item.msg}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
