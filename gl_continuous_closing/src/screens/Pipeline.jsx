import { useGLStore } from '../store/useGLStore'
import LiveFeed from '../components/LiveFeed'

function FlowBox({ title, sub, color, items, stat, statLabel, statColor }) {
  return (
    <div className={`rounded-xl border-2 ${color} bg-slate-900 p-5 flex flex-col gap-3 min-w-0`}>
      <div>
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </div>
      <ul className="space-y-1">
        {items.map(item => (
          <li key={item} className="text-xs text-slate-300 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-slate-500 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
      {stat != null && (
        <div className={`mt-auto pt-3 border-t border-slate-700 text-center`}>
          <p className={`text-xl font-bold ${statColor}`}>{stat}</p>
          <p className="text-xs text-slate-500">{statLabel}</p>
        </div>
      )}
    </div>
  )
}

function Arrow({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-1 shrink-0">
      <div className="flex flex-col items-center">
        <div className="w-0.5 h-6 bg-slate-600" />
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-slate-500" />
      </div>
      {label && <span className="text-xs text-slate-600 text-center max-w-[80px] text-center">{label}</span>}
    </div>
  )
}

const BEFORE_STEPS = [
  { color: 'bg-slate-700', label: 'PeopleSoft posts transactions', icon: '📋' },
  { color: 'bg-slate-700', label: 'Month-end arrives (Day 1)', icon: '📅' },
  { color: 'bg-yellow-900', label: 'Finance scrambles to close AP, AR, Assets', icon: '😰' },
  { color: 'bg-orange-900', label: 'Load trial balance to FCCS', icon: '⬆️' },
  { color: 'bg-red-900', label: 'Discover intercompany mismatch on Day 5', icon: '🚨' },
  { color: 'bg-red-900', label: 'Fix, re-post, reload — delay close by 2 days', icon: '🔁' },
]

const AFTER_STEPS = [
  { color: 'bg-slate-700', label: 'PeopleSoft posts transactions', icon: '📋' },
  { color: 'bg-blue-900', label: 'AI agents validate instantly on Day 1', icon: '🤖' },
  { color: 'bg-blue-900', label: 'Exception routed to owner — fixed same day', icon: '✉️' },
  { color: 'bg-blue-900', label: 'Oracle ADB receives clean, validated data', icon: '🗄️' },
  { color: 'bg-green-900', label: 'FCCS consolidation runs cleanly on Day 4', icon: '✅' },
  { color: 'bg-green-900', label: 'Board reports published — 2 days earlier', icon: '📊' },
]

export default function Pipeline() {
  const { totalJournalsToday, exceptionsOpen, criticalCount, readinessScore, issuesCaughtBeforeEPM, setActiveScreen } = useGLStore()

  return (
    <div className="p-5 space-y-6 overflow-y-auto h-full">

      {/* Hero statement */}
      <div className="bg-gradient-to-r from-oracle-red/20 to-slate-900 border border-oracle-red/30 rounded-xl p-5">
        <p className="text-xs text-oracle-red uppercase tracking-widest font-semibold mb-1">Continuous Close for General Ledger</p>
        <h2 className="text-lg font-bold text-white mb-2">
          PeopleSoft is your system of record. Oracle Cloud EPM is your close engine. AI agents bridge the two.
        </h2>
        <p className="text-sm text-slate-300 max-w-4xl">
          Today, finance teams discover data quality problems <span className="text-red-400 font-semibold">on Day 5 of close</span> — after
          loading to FCCS, running consolidations, and failing reconciliations. This platform continuously validates financial data as it flows
          from PeopleSoft, so Oracle EPM always receives clean, pre-reconciled data and close becomes predictable.
        </p>
      </div>

      {/* Architecture flow */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Solution Architecture</p>
        <div className="flex items-stretch gap-0">
          <FlowBox
            title="PeopleSoft ERP"
            sub="System of record · Operational transactions"
            color="border-blue-600"
            items={['General Ledger', 'Accounts Payable', 'Accounts Receivable', 'Asset Management', 'Purchasing', 'Payroll']}
            stat={totalJournalsToday.toLocaleString()}
            statLabel="Journals this period"
            statColor="text-blue-400"
          />
          <Arrow label="Trial Balance · Journals · Metadata" />
          <FlowBox
            title="Continuous Close AI Platform"
            sub="Oracle ADB lakehouse · Intelligent middleware"
            color="border-oracle-red"
            items={['Journal Validation Agent', 'Balance Validation Agent', 'Reconciliation Agent', 'Anomaly Detection Agent', 'Close Readiness Agent']}
            stat={`${issuesCaughtBeforeEPM} issues`}
            statLabel="Caught before EPM today"
            statColor="text-oracle-red"
          />
          <Arrow label="Clean validated data" />
          <FlowBox
            title="Oracle Cloud EPM"
            sub="System of record · Planning · Close · Reporting"
            color="border-oracle-red"
            items={['Financial Consolidation & Close (FCCS)', 'Account Reconciliation (ARCS)', 'Enterprise Data Management (EDM)', 'Narrative Reporting', 'Planning & Forecasting', 'Tax Reporting']}
            stat={`${readinessScore}%`}
            statLabel="Close readiness"
            statColor="text-green-400"
          />
        </div>
      </div>

      {/* Before vs After */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Before vs After</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 rounded-xl border border-red-900/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">😰</span>
              <p className="text-sm font-semibold text-red-400">Without AI Agents — Reactive Close</p>
            </div>
            <div className="space-y-1.5">
              {BEFORE_STEPS.map((s, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${s.color}`}>
                  <span className="text-base shrink-0">{s.icon}</span>
                  <span className="text-xs text-slate-200">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center">
              <span className="text-xs text-red-400 font-semibold">Close takes 7+ days · Problems found on Day 5</span>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl border border-green-900/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🤖</span>
              <p className="text-sm font-semibold text-green-400">With AI Agents — Continuous Close</p>
            </div>
            <div className="space-y-1.5">
              {AFTER_STEPS.map((s, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${s.color}`}>
                  <span className="text-base shrink-0">{s.icon}</span>
                  <span className="text-xs text-slate-200">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center">
              <span className="text-xs text-green-400 font-semibold">Close completes in 4 days · Problems found on Day 1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Value summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { v: `${issuesCaughtBeforeEPM}`, l: 'Issues caught before EPM', c: 'text-oracle-red', bg: 'bg-oracle-red/10 border-oracle-red/30' },
          { v: '3 days', l: 'Faster close cycle', c: 'text-green-400', bg: 'bg-green-900/20 border-green-900/40' },
          { v: '100%', l: 'Journals validated continuously', c: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-900/40' },
          { v: `${readinessScore}%`, l: 'Live close readiness score', c: 'text-white', bg: 'bg-slate-800 border-slate-600' },
        ].map(item => (
          <div key={item.l} className={`rounded-xl border p-4 ${item.bg} text-center`}>
            <p className={`text-2xl font-bold ${item.c}`}>{item.v}</p>
            <p className="text-xs text-slate-400 mt-1">{item.l}</p>
          </div>
        ))}
      </div>

      {/* Navigation shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { screen: 'peoplesoft', icon: '📋', label: 'PeopleSoft Hub', desc: 'Operational transactions & GL balances' },
          { screen: 'agents',     icon: '🤖', label: 'AI Agent Engine', desc: 'Validation pipeline & exception inbox' },
          { screen: 'epm',        icon: '☁️', label: 'Oracle EPM',      desc: 'FCCS · ARCS · Close Manager · Narrative' },
          { screen: 'cockpit',    icon: '🎯', label: 'Close Cockpit',   desc: 'Executive readiness & close progress' },
        ].map(item => (
          <button
            key={item.screen}
            onClick={() => setActiveScreen(item.screen)}
            className="text-left bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-xl p-4 transition-all group"
          >
            <div className="text-xl mb-2">{item.icon}</div>
            <p className="text-sm font-semibold text-white group-hover:text-oracle-red transition-colors">{item.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
          </button>
        ))}
      </div>

      {/* Live feed */}
      <LiveFeed maxHeight="h-48" />
    </div>
  )
}
