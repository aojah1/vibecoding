import { useGLStore } from '../store/useGLStore'
import SeverityBadge from '../components/SeverityBadge'
import StatusBadge from '../components/StatusBadge'
import { CheckCircle, X, ChevronRight } from 'lucide-react'

const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

export default function AgentEngine() {
  const { agents, exceptions, selectedEx, setSelectedEx, resolveException, issuesCaughtBeforeEPM } = useGLStore()

  const sortedEx = [...exceptions].sort((a, b) => {
    if (a.status === 'resolved' && b.status !== 'resolved') return 1
    if (a.status !== 'resolved' && b.status === 'resolved') return -1
    return SEV_ORDER[a.severity] - SEV_ORDER[b.severity]
  })

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-700">

        {/* Agent cards */}
        <div className="p-4 border-b border-slate-700 bg-slate-900 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500 uppercase tracking-widest">Active AI Agents — PeopleSoft Ingestion Pipeline</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400">All agents running</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {agents.map(agent => {
              const pct = Math.round((agent.passed / agent.processed) * 100)
              return (
                <div key={agent.id} className="bg-slate-800 rounded-xl border border-slate-700 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-lg">{agent.icon}</span>
                    <span className="text-xs text-green-400 font-semibold">● Live</span>
                  </div>
                  <p className="text-xs font-semibold text-white leading-tight">{agent.name}</p>
                  <div className="mt-2 flex justify-between text-xs">
                    <span className="text-slate-500">{agent.processed.toLocaleString()} checked</span>
                    <span className={`font-bold ${agent.failed > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {agent.failed} failed
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-slate-700">
                    <div className="h-1 rounded-full bg-oracle-red" style={{ width: `${100 - pct}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{pct}% pass rate</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Exception inbox */}
        <div className="px-4 py-2 border-b border-slate-700 bg-slate-900 shrink-0 flex items-center justify-between">
          <p className="text-xs text-slate-500 uppercase tracking-widest">
            Exception Inbox —{' '}
            <span className="text-oracle-red font-semibold">
              {issuesCaughtBeforeEPM} issues caught before Oracle EPM
            </span>
          </p>
          <span className="text-xs text-slate-600">Click a row to view details →</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900 z-10">
              <tr className="text-xs text-slate-500 uppercase">
                <th className="text-left px-4 py-2.5">ID</th>
                <th className="text-left px-4 py-2.5">Severity</th>
                <th className="text-left px-4 py-2.5">Issue</th>
                <th className="text-left px-4 py-2.5">Agent</th>
                <th className="text-left px-4 py-2.5">Entity</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Owner</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {sortedEx.map(ex => (
                <tr
                  key={ex.id}
                  onClick={() => setSelectedEx(ex)}
                  className={`border-t border-slate-700/50 cursor-pointer transition-colors ${
                    selectedEx?.id === ex.id ? 'bg-slate-700/60' : 'hover:bg-slate-700/30'
                  } ${ex.status === 'resolved' ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-oracle-red">{ex.id}</td>
                  <td className="px-4 py-3"><SeverityBadge severity={ex.severity} /></td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="text-xs text-slate-200 font-semibold truncate">{ex.title}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 truncate max-w-[120px]">{ex.agentName.replace(' Agent', '')}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{ex.entity}</td>
                  <td className="px-4 py-3"><StatusBadge status={ex.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-400">{ex.owner}</td>
                  <td className="px-4 py-3 text-slate-600"><ChevronRight size={14} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      {selectedEx ? (
        <div className="w-[420px] shrink-0 overflow-y-auto bg-slate-900 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <div>
              <p className="font-mono text-oracle-red text-sm font-bold">{selectedEx.id}</p>
              <p className="text-xs text-slate-500 mt-0.5">Detected {selectedEx.detectedAt}</p>
            </div>
            <button onClick={() => setSelectedEx(null)} className="text-slate-500 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-5 flex-1">
            <div className="flex gap-2 flex-wrap">
              <SeverityBadge severity={selectedEx.severity} />
              <StatusBadge status={selectedEx.status} />
              <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">{selectedEx.agentName}</span>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Issue</p>
              <p className="text-sm text-white font-semibold leading-snug">{selectedEx.title}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Description</p>
              <p className="text-sm text-slate-300 leading-relaxed">{selectedEx.description}</p>
            </div>

            {selectedEx.txnId && (
              <div className="space-y-1">
                <p className="text-xs text-slate-500 uppercase tracking-widest">Source Transaction</p>
                <p className="font-mono text-sm text-blue-400">{selectedEx.txnId}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <p className="text-slate-500 uppercase tracking-widest">Entity</p>
                <p className="text-slate-200">{selectedEx.entityName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-500 uppercase tracking-widest">Owner</p>
                <p className="text-slate-200">{selectedEx.owner}</p>
              </div>
            </div>

            <div className="bg-amber-900/20 border border-amber-800/40 rounded-lg p-4 space-y-1">
              <p className="text-xs text-amber-400 font-semibold uppercase tracking-widest">AI Recommendation</p>
              <p className="text-sm text-amber-200 leading-relaxed">{selectedEx.recommendation}</p>
            </div>

            <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-4 space-y-1">
              <p className="text-xs text-red-400 font-semibold uppercase tracking-widest">Oracle EPM Impact</p>
              <p className="text-sm text-red-200 leading-relaxed">{selectedEx.epmImpact}</p>
            </div>
          </div>

          {selectedEx.status !== 'resolved' && (
            <div className="p-5 border-t border-slate-700 shrink-0">
              <button
                onClick={() => resolveException(selectedEx.id)}
                className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <CheckCircle size={16} />
                Mark Resolved — Remove from EPM Impact List
              </button>
              <p className="text-center text-xs text-slate-600 mt-2">Resolving will update close readiness score</p>
            </div>
          )}
        </div>
      ) : (
        <div className="w-[420px] shrink-0 flex flex-col items-center justify-center gap-3 text-slate-600 bg-slate-900">
          <span className="text-4xl">🤖</span>
          <p className="text-sm">Select an exception to view AI analysis and EPM impact</p>
        </div>
      )}
    </div>
  )
}
