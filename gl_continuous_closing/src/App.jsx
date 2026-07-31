import { useGLStore } from './store/useGLStore'
import Pipeline      from './screens/Pipeline'
import PeopleSoftHub from './screens/PeopleSoftHub'
import AgentEngine   from './screens/AgentEngine'
import OracleEPM     from './screens/OracleEPM'
import CloseCockpit  from './screens/CloseCockpit'
import './index.css'

const NAV = [
  { id: 'pipeline',    label: 'Architecture',    icon: '🗺️',  desc: 'The story'          },
  { id: 'peoplesoft',  label: 'PeopleSoft Hub',  icon: '📋',  desc: 'Source transactions' },
  { id: 'agents',      label: 'AI Agent Engine', icon: '🤖',  desc: 'Validation pipeline' },
  { id: 'epm',         label: 'Oracle EPM',       icon: '☁️',  desc: 'FCCS · ARCS · Close' },
  { id: 'cockpit',     label: 'Close Cockpit',   icon: '🎯',  desc: 'Executive view'      },
]

export default function App() {
  const { activeScreen, setActiveScreen, exceptionsOpen, criticalCount, readinessScore } = useGLStore()

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">

      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-700 px-5 py-2.5 flex items-center justify-between sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-7 h-7 rounded bg-oracle-red flex items-center justify-center font-bold text-white text-xs">GL</div>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-white leading-tight">Continuous Close</h1>
            <p className="text-xs text-slate-500">PeopleSoft ERP · Oracle Cloud EPM · AI Agent Platform</p>
          </div>
        </div>

        <nav className="flex gap-0.5 bg-slate-800 p-1 rounded-xl">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeScreen === item.id
                  ? 'bg-oracle-red text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <span>{item.icon}</span>
              <span className="hidden md:inline">{item.label}</span>
              {item.id === 'agents' && exceptionsOpen > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                  {exceptionsOpen > 9 ? '9+' : exceptionsOpen}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {criticalCount > 0 && (
            <div
              className="hidden sm:flex items-center gap-1.5 bg-red-900/40 border border-red-800 rounded-lg px-2.5 py-1 cursor-pointer"
              onClick={() => setActiveScreen('agents')}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-300 font-medium">{criticalCount} Critical Block{criticalCount > 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="hidden md:flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-slate-400">FY2025 Q2 · Jun 2025 · {readinessScore}% Ready</span>
          </div>
        </div>
      </header>

      {/* Screen */}
      <main className="flex-1 overflow-hidden">
        {activeScreen === 'pipeline'   && <Pipeline />}
        {activeScreen === 'peoplesoft' && <PeopleSoftHub />}
        {activeScreen === 'agents'     && <AgentEngine />}
        {activeScreen === 'epm'        && <OracleEPM />}
        {activeScreen === 'cockpit'    && <CloseCockpit />}
      </main>
    </div>
  )
}
