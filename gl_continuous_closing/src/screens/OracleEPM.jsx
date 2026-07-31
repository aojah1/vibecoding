import { useGLStore } from '../store/useGLStore'
import { FCCS_ENTITIES, FCCS_ELIMINATIONS, ARCS_RECS, CLOSE_TASKS } from '../store/useGLStore'
import EPMNaturalLanguage from './EPMNaturalLanguage'

const FCCS_STATUS_STYLE = {
  submitted:    'bg-green-900/60 text-green-300',
  in_progress:  'bg-yellow-900/60 text-yellow-300',
  not_started:  'bg-slate-700 text-slate-400',
}

const TASK_STATUS = {
  complete:    { dot: 'bg-green-400',  text: 'text-green-400',  label: 'Complete'     },
  in_progress: { dot: 'bg-yellow-400', text: 'text-yellow-400', label: 'In Progress'  },
  not_started: { dot: 'bg-slate-600',  text: 'text-slate-500',  label: 'Not Started'  },
}

const REC_STATUS = {
  complete:    { cls: 'text-green-400',  label: 'Complete'    },
  in_progress: { cls: 'text-yellow-400', label: 'In Progress' },
  open:        { cls: 'text-red-400',    label: 'Open'        },
}

const ELIM_STATUS = {
  complete: 'text-green-400',
  pending:  'text-yellow-400',
  blocked:  'text-red-400',
}

const NARRATIVES = [
  {
    type: 'Q2 Board Package',
    generated: '2025-06-29 10:15 AM',
    excerpt: 'Revenue increased 11.1% quarter-over-quarter to $26.8M consolidated, driven primarily by North America product sales (+$1.2M) and EMEA growth (+$0.6M). Operating expenses rose 3.2% to $21.3M. Net income of $5.5M represents a 25.9% operating margin.',
  },
  {
    type: 'Controller Close Summary',
    generated: '2025-06-29 09:45 AM',
    excerpt: 'Close is 85% complete. Three reconciliations are outstanding: Cash (Δ $2,896), Inventory (Δ $42,300), and Fixed Assets (Δ $63,000). Two AI-detected exceptions require resolution before FCCS consolidation can proceed: intercompany imbalance E01/E02 and FX revaluation anomaly in E02.',
  },
  {
    type: 'Daily Finance Operations',
    generated: '2025-06-29 07:00 AM',
    excerpt: 'Overnight batch completed: 1,482 journals validated, 8 exceptions created. E01 trial balance is clean and ready for FCCS load. E02 and E03 have open items pending controller review. E04 is at risk of missing close deadline — escalation initiated to LATAM Finance Controller.',
  },
]

const TABS = [
  { id: 'fccs',      label: 'FCCS',          sub: 'Financial Consolidation & Close' },
  { id: 'arcs',      label: 'ARCS',          sub: 'Account Reconciliation'          },
  { id: 'close',     label: 'Close Manager', sub: 'Task tracking'                  },
  { id: 'narrative', label: 'Narrative',     sub: 'AI-generated reports'           },
  { id: 'nl',        label: '✦ Ask EPM',     sub: 'Natural language finance Q&A'   },
]

export default function OracleEPM() {
  const { epmTab, setEpmTab, exceptions } = useGLStore()

  const blockedElims = FCCS_ELIMINATIONS.filter(e => e.status === 'blocked').length
  const notSubmitted = FCCS_ENTITIES.filter(e => e.status !== 'submitted').length
  const totalRevenue = FCCS_ENTITIES.reduce((s, e) => s + e.revenue, 0)
  const consolidatedRevenue = totalRevenue - 1200000 - 420000
  const consolidatedExpenses = FCCS_ENTITIES.reduce((s, e) => s + e.expenses, 0)
  const netIncome = consolidatedRevenue - consolidatedExpenses
  const completedTasks = CLOSE_TASKS.filter(t => t.status === 'complete').length
  const closeProgress = Math.round((completedTasks / CLOSE_TASKS.length) * 100)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700 px-5 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-oracle-red flex items-center justify-center text-white font-bold text-xs">O</div>
            <div>
              <p className="text-sm font-bold text-white">Oracle Cloud EPM</p>
              <p className="text-xs text-slate-500">Financial Consolidation · Reconciliation · Close Management · Narrative Reporting</p>
            </div>
          </div>
          {blockedElims > 0 && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-800/40 rounded-lg px-3 py-1.5 text-xs text-red-300">
              <span>⚠</span>
              <span>{blockedElims} elimination{blockedElims > 1 ? 's' : ''} blocked by AI exception</span>
            </div>
          )}
        </div>

        {/* Module tabs */}
        <div className="flex gap-1 mt-3">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setEpmTab(t.id)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                epmTab === t.id ? 'bg-oracle-red text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {t.label}
              <span className="ml-1 opacity-60 hidden sm:inline">— {t.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content — NL tab gets its own full-height container; others scroll with padding */}
      <div className={`flex-1 overflow-hidden ${epmTab === 'nl' ? 'flex flex-col' : 'overflow-y-auto p-5'}`}>

        {/* FCCS */}
        {epmTab === 'fccs' && (
          <div className="space-y-5">
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Consolidated Revenue',  v: `$${(consolidatedRevenue / 1e6).toFixed(1)}M`, c: 'text-green-400' },
                { label: 'Consolidated Expenses', v: `$${(consolidatedExpenses / 1e6).toFixed(1)}M`, c: 'text-orange-400' },
                { label: 'Net Income',             v: `$${(netIncome / 1e6).toFixed(1)}M`,            c: 'text-white' },
                { label: 'Entities Not Submitted', v: notSubmitted,                                    c: notSubmitted > 0 ? 'text-red-400' : 'text-green-400' },
              ].map(k => (
                <div key={k.label} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-widest">{k.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${k.c}`}>{k.v}</p>
                </div>
              ))}
            </div>

            {/* Entity submissions */}
            <div className="bg-slate-800 rounded-xl border border-slate-700">
              <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Entity Submissions to FCCS</p>
                <p className="text-xs text-slate-500">Revenue contribution per entity</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase">
                    <th className="text-left px-5 py-2.5">Entity</th>
                    <th className="text-left px-5 py-2.5">Currency</th>
                    <th className="text-right px-5 py-2.5">Revenue (Local)</th>
                    <th className="text-right px-5 py-2.5">Revenue (USD)</th>
                    <th className="text-right px-5 py-2.5">Expenses (USD)</th>
                    <th className="text-left px-5 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {FCCS_ENTITIES.map(e => (
                    <tr key={e.id} className="border-t border-slate-700/50">
                      <td className="px-5 py-3 text-sm text-slate-200">{e.name}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">{e.currency}</td>
                      <td className="px-5 py-3 text-right text-xs font-mono tabular-nums text-slate-400">
                        ${(e.revenue / e.fxRate / 1e6).toFixed(2)}M {e.currency}
                      </td>
                      <td className="px-5 py-3 text-right text-xs font-mono tabular-nums text-slate-200">
                        ${(e.revenue / 1e6).toFixed(1)}M
                      </td>
                      <td className="px-5 py-3 text-right text-xs font-mono tabular-nums text-slate-400">
                        ${(e.expenses / 1e6).toFixed(1)}M
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FCCS_STATUS_STYLE[e.status]}`}>
                          {e.status === 'not_started' ? 'Not Started' : e.status === 'in_progress' ? 'In Progress' : 'Submitted'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Eliminations */}
            <div className="bg-slate-800 rounded-xl border border-slate-700">
              <div className="px-5 py-3 border-b border-slate-700">
                <p className="text-sm font-semibold text-white">Consolidation Adjustments & Eliminations</p>
                <p className="text-xs text-slate-500 mt-0.5">FCCS automatically performs these — requires clean source data</p>
              </div>
              <div className="divide-y divide-slate-700">
                {FCCS_ELIMINATIONS.map(elim => (
                  <div key={elim.description} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm text-slate-200">{elim.description}</p>
                      {elim.status === 'blocked' && (
                        <p className="text-xs text-red-400 mt-0.5">⚠ Blocked — EX-001 intercompany mismatch must be resolved first</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-slate-300">${(Math.abs(elim.amount) / 1000).toFixed(0)}K</p>
                      <p className={`text-xs font-semibold ${ELIM_STATUS[elim.status]}`}>{elim.status}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Consolidated totals */}
              <div className="border-t border-slate-600 bg-slate-700/30 px-5 py-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest">Gross Revenue</p>
                    <p className="text-lg font-bold text-slate-300">${(totalRevenue / 1e6).toFixed(1)}M</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest">Eliminations</p>
                    <p className="text-lg font-bold text-red-400">-${((1200000 + 420000 + 180000 + 320000) / 1e6).toFixed(1)}M</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-widest">Consolidated Revenue</p>
                    <p className="text-lg font-bold text-green-400">${(consolidatedRevenue / 1e6).toFixed(1)}M</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ARCS */}
        {epmTab === 'arcs' && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                { l: 'Total Reconciliations', v: ARCS_RECS.length, c: 'text-white' },
                { l: 'Complete',     v: ARCS_RECS.filter(r => r.status === 'complete').length,    c: 'text-green-400' },
                { l: 'Outstanding',  v: ARCS_RECS.filter(r => r.status !== 'complete').length,    c: 'text-orange-400' },
              ].map(k => (
                <div key={k.l} className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-widest">{k.l}</p>
                  <p className={`text-3xl font-bold mt-1 ${k.c}`}>{k.v}</p>
                </div>
              ))}
            </div>

            <div className="bg-slate-800 rounded-xl border border-slate-700">
              <div className="px-5 py-3 border-b border-slate-700">
                <p className="text-sm font-semibold text-white">Account Reconciliation Status — Oracle ARCS</p>
                <p className="text-xs text-slate-500 mt-0.5">AI Reconciliation Agent pre-populates comparison data before human review</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase">
                    <th className="text-left px-5 py-2.5">Account</th>
                    <th className="text-right px-5 py-2.5">GL Balance</th>
                    <th className="text-left px-5 py-2.5">Source</th>
                    <th className="text-right px-5 py-2.5">Source Balance</th>
                    <th className="text-right px-5 py-2.5">Variance</th>
                    <th className="text-left px-5 py-2.5">Preparer</th>
                    <th className="text-left px-5 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ARCS_RECS.map(rec => {
                    const st = REC_STATUS[rec.status]
                    return (
                      <tr key={rec.id} className="border-t border-slate-700/50">
                        <td className="px-5 py-3">
                          <p className="text-sm text-slate-200">{rec.account}</p>
                          <p className="text-xs text-slate-500">{rec.entity}</p>
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-slate-200">
                          ${rec.glBalance.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-500">{rec.systemLabel}</td>
                        <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-slate-200">
                          ${rec.systemBalance.toLocaleString()}
                        </td>
                        <td className={`px-5 py-3 text-right font-mono text-xs tabular-nums font-bold ${rec.diff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {rec.diff === 0 ? '—' : `$${rec.diff.toLocaleString()}`}
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-400">{rec.preparer}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-semibold ${st.cls}`}>{st.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Cash rec highlight */}
            <div className="bg-slate-800 rounded-xl border border-yellow-800/40 p-5">
              <p className="text-xs text-yellow-400 font-semibold uppercase tracking-widest mb-3">Highlighted — Cash Reconciliation (AI Exception EX-002)</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-slate-900 rounded-lg py-4">
                  <p className="text-xs text-slate-500 uppercase tracking-widest">PeopleSoft GL</p>
                  <p className="text-xl font-bold text-slate-200 mt-1 font-mono">$15,432,998</p>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-400">≠</p>
                    <p className="text-xs text-red-400 mt-1">Δ $2,896</p>
                  </div>
                </div>
                <div className="bg-slate-900 rounded-lg py-4">
                  <p className="text-xs text-slate-500 uppercase tracking-widest">Bank Statement</p>
                  <p className="text-xl font-bold text-slate-200 mt-1 font-mono">$15,430,102</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3 text-center">AI Reconciliation Agent surfaced this difference automatically. Owner: Treasury Ops (In Review)</p>
            </div>
          </div>
        )}

        {/* Close Manager */}
        {epmTab === 'close' && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                { l: 'Tasks Complete', v: `${completedTasks} / ${CLOSE_TASKS.length}`, c: 'text-white' },
                { l: 'Close Progress', v: `${closeProgress}%`, c: 'text-green-400' },
                { l: 'Days Remaining', v: '3', c: 'text-orange-400' },
              ].map(k => (
                <div key={k.l} className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-widest">{k.l}</p>
                  <p className={`text-3xl font-bold mt-1 ${k.c}`}>{k.v}</p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 uppercase tracking-widest">Overall Close Progress</p>
                <p className="text-sm font-bold text-white">{closeProgress}%</p>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-oracle-red to-orange-500 transition-all duration-700"
                  style={{ width: `${closeProgress}%` }}
                />
              </div>
            </div>

            {/* Task tracker */}
            <div className="bg-slate-800 rounded-xl border border-slate-700">
              <div className="px-5 py-3 border-b border-slate-700">
                <p className="text-sm font-semibold text-white">Oracle Close Manager — June 2025 Close Schedule</p>
              </div>
              <div className="divide-y divide-slate-700">
                {CLOSE_TASKS.map(task => {
                  const st = TASK_STATUS[task.status]
                  return (
                    <div key={task.day} className={`flex items-center gap-4 px-5 py-4 ${task.status === 'not_started' ? 'opacity-60' : ''}`}>
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                        D{task.day}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium">{task.task}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Owner: {task.owner} · Module: {task.module}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                          <span className={`text-xs font-semibold ${st.text}`}>{st.label}</span>
                        </div>
                        {task.completedAt && (
                          <p className="text-xs text-slate-600 mt-0.5">{task.completedAt}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Narrative Reporting */}
        {epmTab === 'narrative' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-oracle-red/10 to-slate-900 border border-oracle-red/20 rounded-xl p-4">
              <p className="text-xs text-oracle-red font-semibold uppercase tracking-widest mb-1">Oracle Narrative Reporting</p>
              <p className="text-sm text-slate-300">AI-generated financial narratives eliminate manual copy-paste from FCCS into board packages. Reports update automatically as close progresses.</p>
            </div>
            {NARRATIVES.map((n, i) => (
              <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{n.type}</p>
                  <p className="text-xs text-slate-500">Generated: {n.generated}</p>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed italic">"{n.excerpt}"</p>
                <button className="text-xs text-oracle-red hover:text-oracle-redlight transition-colors">
                  View full report →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Natural Language Query */}
        {epmTab === 'nl' && <EPMNaturalLanguage />}
      </div>
    </div>
  )
}
