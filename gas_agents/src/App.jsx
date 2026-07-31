import { useAppStore } from './store/useAppStore'
import CarScreen from './screens/CarScreen'
import DriverApp from './screens/DriverApp'
import StationConsole from './screens/StationConsole'
import './index.css'

const NAV = [
  { id: 'car', label: 'Car Screen', icon: '🚗' },
  { id: 'driver', label: 'Driver App', icon: '📱' },
  { id: 'station', label: 'Station Console', icon: '⛽' },
]

export default function App() {
  const { activeScreen, setActiveScreen } = useAppStore()

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top nav bar */}
      <header className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⛽</span>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">gas_agents</h1>
            <p className="text-xs text-slate-400">AI-Powered Fuel Bidding Network</p>
          </div>
        </div>

        <nav className="flex gap-1 bg-slate-800 p-1 rounded-xl">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeScreen === item.id
                  ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <span>{item.icon}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-slate-400">Live Demo</span>
        </div>
      </header>

      {/* Screen content */}
      <main className="flex-1 overflow-hidden">
        {activeScreen === 'car' && <CarScreen />}
        {activeScreen === 'driver' && <DriverApp />}
        {activeScreen === 'station' && <StationConsole />}
      </main>
    </div>
  )
}
