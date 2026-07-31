import { useGLStore } from '../store/useGLStore'
import KpiCard from '../components/KpiCard'
import ReadinessGauge from '../components/ReadinessGauge'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'

const ENTITY_TASKS = [
  { entity: 'Company A – North America', region: 'NOAM', progress: 75, openRecs: 1, openEx: 1, riskScore: 18, estClose: 'Jun 30' },
  { entity: 'Company B – EMEA Holdings', region: 'EMEA', progress: 60, openRecs: 2, openEx: 2, riskScore: 62, estClose: 'Jul 1'  },
  { entity: 'Company C – APAC Finance',  region: 'APAC', progress: 45, openRecs: 1, openEx: 0, riskScore: 38, estClose: 'Jul 2'  },
  { entity: 'Latin America SA',          region: 'LATAM', progress: 10, openRecs: 4, openEx: 1, riskScore: 91, estClose: 'Jul 4'  },
]

const CONTROL_SUMMARY = [
  { name: 'Debit=Credit',        passed: 1474, failed: 8  },
  { name: 'Balance Variance',    passed: 939,  failed: 7  },
  { name: 'Reconciliation',      passed: 298,  failed: 6  },
  { name: 'Anomaly Detection',   passed: 1723, failed: 14 },
  { name: 'Readiness',           passed: 18,   failed: 4  },
]

export default function CloseCockpit() {
  const {
    readinessScore, totalJournalsToday, exceptionsOpen, exceptionsResolved,
    criticalCount, issuesCaughtBeforeEPM, trend, exceptions, setActiveScreen,
  } = useGLStore()

  const topExceptions = [...exceptions]
    .filter(e => e.status !== 'resolved')
    .sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.severity] - { critical: 0, high: 1, medium: 2, low: 3 }[b.severity]))
    .slice(0, 4)

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full">

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="flex items-center justify-center bg-slate-800 rounded-xl border border-slate-700 p-3">
          <ReadinessGauge score={readinessScore} />
        </div>
        <KpiCard label="Journals Processed" value={totalJournalsToday.toLocaleString()} sub="PeopleSoft — this period"   icon="📋" color="text-blue-300" />
        <KpiCard label="Issues Caught Early" value={issuesCaughtBeforeEPM}              sub="Before reaching Oracle EPM"  icon="🤖" color="text-oracle-red" />
        <KpiCard label="Open Exceptions"     value={exceptionsOpen}                     sub="Require resolution"           icon="🚨" color={exceptionsOpen > 3 ? 'text-red-400' : 'text-yellow-300'} />
        <KpiCard label="Critical Blocks"     value={criticalCount}                      sub="Will block FCCS consolidation" icon="🔴" color={criticalCount > 0 ? 'text-red-400' : 'text-green-400'} />
        <KpiCard label="Resolved Today"      value={exceptionsResolved}                 sub="By finance teams"             icon="✅" color="text-green-400" />
      </div>

      {/* Trend + Entity risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Close Readiness Score — This Week</p>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C74634" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#C74634" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis domain={[50, 100]} stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                       labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#f97316' }} />
              <Area type="monotone" dataKey="score" stroke="#C74634" fill="url(#rGrad)" strokeWidth={2} dot={{ fill: '#C74634', r: 3 }} name="Readiness %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Agent Control Summary</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={CONTROL_SUMMARY} layout="vertical">
              <XAxis type="number" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={110} stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              <Bar dataKey="failed" name="Failed" radius={[0, 3, 3, 0]}>
                {CONTROL_SUMMARY.map((e, i) => (
                  <Cell key={i} fill={e.failed > 10 ? '#C74634' : e.failed > 5 ? '#f97316' : '#eab308'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Entity status table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <p className="text-xs text-slate-400 uppercase tracking-widest">Entity Close Status</p>
          <button onClick={() => setActiveScreen('epm')} className="text-xs text-oracle-red hover:text-oracle-redlight transition-colors">
            View in Oracle EPM →
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 uppercase">
              <th className="text-left px-5 py-2.5">Entity</th>
              <th className="text-left px-5 py-2.5">Close Progress</th>
              <th className="text-right px-5 py-2.5">Open Recs</th>
              <th className="text-right px-5 py-2.5">Open Exceptions</th>
              <th className="text-left px-5 py-2.5">Risk</th>
              <th className="text-left px-5 py-2.5">Est. Submit</th>
            </tr>
          </thead>
          <tbody>
            {ENTITY_TASKS.map(e => (
              <tr key={e.entity} className="border-t border-slate-700/50">
                <td className="px-5 py-3">
                  <p className="text-sm text-slate-200">{e.entity}</p>
                  <p className="text-xs text-slate-500">{e.region}</p>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-700 rounded-full">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${e.progress}%`,
                          background: e.progress >= 70 ? '#22c55e' : e.progress >= 40 ? '#f97316' : '#ef4444',
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-8 text-right">{e.progress}%</span>
                  </div>
                </td>
                <td className={`px-5 py-3 text-right text-sm font-bold ${e.openRecs > 1 ? 'text-orange-400' : e.openRecs > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {e.openRecs}
                </td>
                <td className={`px-5 py-3 text-right text-sm font-bold ${e.openEx > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {e.openEx}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1.5 bg-slate-700 rounded-full">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${e.riskScore}%`,
                          background: e.riskScore > 70 ? '#ef4444' : e.riskScore > 40 ? '#f97316' : '#22c55e',
                        }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${e.riskScore > 70 ? 'text-red-400' : e.riskScore > 40 ? 'text-orange-400' : 'text-green-400'}`}>
                      {e.riskScore}
                    </span>
                  </div>
                </td>
                <td className={`px-5 py-3 text-sm ${e.riskScore > 70 ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>
                  {e.estClose}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Priority exceptions */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <p className="text-xs text-slate-400 uppercase tracking-widest">
            AI Exception Priority Queue — <span className="text-oracle-red">{issuesCaughtBeforeEPM} blocking Oracle EPM</span>
          </p>
          <button onClick={() => setActiveScreen('agents')} className="text-xs text-oracle-red hover:text-oracle-redlight transition-colors">
            Manage Exceptions →
          </button>
        </div>
        <div className="divide-y divide-slate-700/50">
          {topExceptions.map(ex => (
            <div key={ex.id} className="flex items-center gap-4 px-5 py-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                ex.severity === 'critical' ? 'bg-red-900 text-red-300' :
                ex.severity === 'high' ? 'bg-orange-900 text-orange-300' : 'bg-yellow-900 text-yellow-300'
              }`}>{ex.severity}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate">{ex.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{ex.epmImpact}</p>
              </div>
              <span className="text-xs text-slate-500 shrink-0">{ex.owner}</span>
            </div>
          ))}
          {topExceptions.length === 0 && (
            <div className="px-5 py-6 text-center text-green-400 text-sm">
              ✓ No blocking exceptions — FCCS consolidation can proceed
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
