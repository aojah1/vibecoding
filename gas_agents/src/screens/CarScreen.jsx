import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import FuelGauge from '../components/FuelGauge'
import RadarMap from '../components/RadarMap'

const STATUS_LABELS = {
  driving: { text: 'En Route', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30' },
  requesting: { text: 'Broadcasting RFQ...', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30' },
  bid_received: { text: 'Bids Received', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' },
  accepted: { text: 'Stop Added to Route', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' },
  fueling: { text: 'Fueling in Progress', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30' },
  complete: { text: 'Fueling Complete', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' },
}

export default function CarScreen() {
  const {
    fuelLevel, estimatedRange, bids, carStatus, acceptedBid,
    startBidRequest, acceptBid, resetSimulation, tripSignal, setActiveScreen
  } = useAppStore()

  const status = STATUS_LABELS[carStatus]
  const topBid = bids[0]

  return (
    <div className="h-full bg-slate-950 p-4 overflow-y-auto">
      {/* HUD Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${status.bg}`}>
            {carStatus === 'requesting' && (
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            )}
            {(carStatus === 'bid_received' || carStatus === 'accepted' || carStatus === 'complete') && (
              <span className="w-2 h-2 bg-green-400 rounded-full" />
            )}
            <span className={status.color}>{status.text}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-slate-400 text-xs">Destination</div>
          <div className="text-white text-sm font-medium">
            {tripSignal?.defaultDest || 'No Trip Set'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Fuel & Speed */}
        <div className="flex flex-col gap-4">
          <div className="hud-panel">
            <FuelGauge level={fuelLevel} />
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-900 rounded-lg p-2">
                <div className="text-lg font-bold text-white">{estimatedRange} mi</div>
                <div className="text-xs text-slate-400">Est. Range</div>
              </div>
              <div className="bg-slate-900 rounded-lg p-2">
                <div className="text-lg font-bold text-white">67 mph</div>
                <div className="text-xs text-slate-400">Speed</div>
              </div>
            </div>
          </div>

          {/* Trip info */}
          <div className="hud-panel">
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">Trip Signal</div>
            {tripSignal ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl">{tripSignal.icon}</span>
                <div>
                  <div className="text-white font-medium text-sm">{tripSignal.label}</div>
                  <div className={`text-xs ${
                    tripSignal.urgency === 'high' ? 'text-red-400' :
                    tripSignal.urgency === 'medium' ? 'text-amber-400' : 'text-green-400'
                  }`}>
                    {tripSignal.urgency.toUpperCase()} urgency
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setActiveScreen('driver')}
                className="w-full text-center text-sm text-slate-400 hover:text-amber-400 transition-colors py-2"
              >
                Set trip in Driver App →
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {carStatus === 'driving' && (
              <button
                onClick={startBidRequest}
                disabled={fuelLevel > 40}
                className="w-full py-3 rounded-xl font-bold text-sm bg-amber-500 text-slate-900 hover:bg-amber-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
              >
                {fuelLevel > 40 ? `Request Bids (fuel too high)` : '⚡ Request Fuel Bids'}
              </button>
            )}
            {(carStatus === 'complete' || carStatus === 'fueling') && (
              <button
                onClick={resetSimulation}
                className="w-full py-3 rounded-xl font-bold text-sm bg-slate-700 text-white hover:bg-slate-600 transition-all"
              >
                Reset Demo
              </button>
            )}
          </div>
        </div>

        {/* Center: Radar Map */}
        <div className="hud-panel flex flex-col">
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">Station Radar</div>
          <RadarMap bids={bids} carStatus={carStatus} acceptedBid={acceptedBid} />
          <div className="mt-3 text-center text-xs text-slate-500">
            {carStatus === 'requesting' && 'Broadcasting request to stations on route...'}
            {carStatus === 'bid_received' && `${bids.length} bid${bids.length !== 1 ? 's' : ''} received`}
            {carStatus === 'accepted' && `Routing to ${acceptedBid?.stationName}`}
            {carStatus === 'driving' && 'Scanning route corridor'}
            {carStatus === 'fueling' && 'At pump — charging wallet...'}
            {carStatus === 'complete' && 'Tank full — back on route'}
          </div>
        </div>

        {/* Right: Bid Notifications */}
        <div className="hud-panel flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Incoming Bids</div>
            {bids.length > 0 && (
              <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                {bids.length} offers
              </span>
            )}
          </div>

          <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
            <AnimatePresence>
              {bids.length === 0 && carStatus !== 'requesting' && (
                <div className="flex-1 flex items-center justify-center text-slate-600 text-sm text-center py-8">
                  Bids will appear here when you broadcast a fuel request
                </div>
              )}
              {carStatus === 'requesting' && bids.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl mb-2">📡</div>
                    <div className="text-slate-400 text-sm">Broadcasting to stations...</div>
                  </div>
                </div>
              )}
              {bids.map((bid) => (
                <motion.div
                  key={bid.id}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`bid-card ${acceptedBid?.id === bid.id ? 'border-green-400 bg-green-400/5' : ''}`}
                  onClick={() => carStatus === 'bid_received' && acceptBid(bid)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-white text-sm">{bid.stationName}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{bid.distance} mi away · {bid.detour > 0 ? `+${bid.detour} mi detour` : 'On route'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 font-bold text-lg">${bid.bidPrice}</div>
                      <div className="text-xs text-slate-500 line-through">${bid.publicPrice}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-1 flex-wrap">
                      <span className="text-xs bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded">
                        🎁 {bid.offer}
                      </span>
                      <span className="text-xs bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                        ⏱ {bid.waitTime} min
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-8 h-1.5 bg-slate-700 rounded-full">
                        <div className="h-full bg-green-400 rounded-full" style={{ width: `${bid.score}%` }} />
                      </div>
                      <span className="text-xs text-green-400">{bid.score}</span>
                    </div>
                  </div>
                  {acceptedBid?.id === bid.id && (
                    <div className="mt-2 text-xs text-green-400 font-medium">✓ Accepted — Added to route</div>
                  )}
                  {carStatus === 'bid_received' && acceptedBid?.id !== bid.id && (
                    <div className="mt-2 text-xs text-slate-500">Tap to accept this offer</div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Wallet status */}
          {(carStatus === 'fueling' || carStatus === 'complete') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 bg-green-400/10 border border-green-400/30 rounded-lg p-3"
            >
              <div className="text-xs text-green-400 font-semibold mb-1">
                {carStatus === 'fueling' ? '💳 Car Wallet — Processing...' : '✅ Payment Complete'}
              </div>
              {acceptedBid && (
                <div className="text-xs text-slate-300">
                  {carStatus === 'complete'
                    ? `Charged $${(acceptedBid.bidPrice * 9.2).toFixed(2)} · Saved $${(acceptedBid.discount * 9.2).toFixed(2)}`
                    : `Pre-authorized at $${acceptedBid.bidPrice}/gal`}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom speed/nav bar mockup */}
      <div className="mt-4 bg-slate-900 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
        <div className="flex gap-6 text-center">
          <div><div className="text-white font-bold">14 min</div><div className="text-xs text-slate-400">ETA</div></div>
          <div><div className="text-white font-bold">8.3 mi</div><div className="text-xs text-slate-400">Remaining</div></div>
          <div><div className="text-white font-bold">I-285 N</div><div className="text-xs text-slate-400">Route</div></div>
        </div>
        <div className="text-xs text-slate-500">Waze Navigation Layer</div>
        <div className="text-right">
          <div className="text-white font-bold">72°F</div>
          <div className="text-xs text-slate-400">Atlanta, GA</div>
        </div>
      </div>
    </div>
  )
}
