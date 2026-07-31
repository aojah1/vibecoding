import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'

export default function DriverApp() {
  const {
    fuelLevel, setFuelLevel, estimatedRange,
    tripSignal, setTripSignal, destination, setDestination,
    routeShared, setRouteShared,
    bids, startBidRequest, acceptBid, acceptedBid, carStatus,
    TRIP_SIGNALS, setActiveScreen,
  } = useAppStore()

  const [tab, setTab] = useState('trip')
  const [shareLocation, setShareLocation] = useState(false)
  const [shareStatus, setShareStatus] = useState(true)

  const fuelColor = fuelLevel > 50 ? 'bg-green-500' : fuelLevel > 25 ? 'bg-amber-500' : 'bg-red-500'
  const canRequest = fuelLevel <= 40 && tripSignal && routeShared && carStatus === 'driving'

  return (
    <div className="h-full flex justify-center items-start py-6 px-4 bg-slate-950 overflow-y-auto">
      {/* Mobile phone frame */}
      <div className="w-full max-w-sm bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden">
        {/* Phone status bar */}
        <div className="bg-slate-800 px-5 py-2 flex items-center justify-between">
          <span className="text-xs text-white font-medium">9:41 AM</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-white">⛽ gas_agents</span>
          </div>
          <div className="flex items-center gap-1 text-white text-xs">
            <span>●●●●</span>
            <span>WiFi</span>
            <span>🔋</span>
          </div>
        </div>

        {/* App header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-bold text-lg">gas_agents</div>
              <div className="text-amber-100 text-xs">Driver Dashboard</div>
            </div>
            <div className="text-right">
              <div className="text-white font-bold text-xl">{fuelLevel}%</div>
              <div className="text-amber-100 text-xs">{estimatedRange} mi range</div>
            </div>
          </div>
          {/* Fuel bar */}
          <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${fuelColor}`}
              initial={false}
              animate={{ width: `${fuelLevel}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-slate-700">
          {['trip', 'fuel', 'bids'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors relative ${
                tab === t ? 'text-amber-400' : 'text-slate-400'
              }`}
            >
              {t}
              {t === 'bids' && bids.length > 0 && (
                <span className="absolute top-1.5 right-4 w-4 h-4 bg-amber-500 text-slate-900 text-xs font-bold rounded-full flex items-center justify-center">
                  {bids.length}
                </span>
              )}
              {tab === t && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
              )}
            </button>
          ))}
        </div>

        <div className="p-5 min-h-96">
          <AnimatePresence mode="wait">
            {/* TRIP TAB */}
            {tab === 'trip' && (
              <motion.div key="trip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-4">
                  <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">Select Trip Type</div>
                  <div className="grid grid-cols-1 gap-2">
                    {TRIP_SIGNALS.map((signal) => (
                      <button
                        key={signal.id}
                        onClick={() => setTripSignal(signal)}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          tripSignal?.id === signal.id
                            ? 'bg-amber-500/10 border-amber-400 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <span className="text-2xl">{signal.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{signal.label}</div>
                          <div className="text-xs text-slate-400">{signal.defaultDest}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          signal.urgency === 'high' ? 'bg-red-500/20 text-red-400' :
                          signal.urgency === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {signal.urgency}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {tripSignal && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">Destination</div>
                    <input
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* FUEL TAB */}
            {tab === 'fuel' && (
              <motion.div key="fuel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-5">
                  <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">Current Fuel Level</div>
                  <div className="text-center mb-3">
                    <span className={`text-4xl font-bold ${fuelLevel <= 25 ? 'text-red-400' : fuelLevel <= 40 ? 'text-amber-400' : 'text-green-400'}`}>
                      {fuelLevel}%
                    </span>
                    <div className="text-slate-400 text-sm mt-1">≈ {estimatedRange} miles remaining</div>
                  </div>
                  <input
                    type="range" min="5" max="100" value={fuelLevel}
                    onChange={(e) => setFuelLevel(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>5%</span><span>50%</span><span>100%</span>
                  </div>
                </div>

                {fuelLevel <= 40 && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-3 mb-4"
                  >
                    <div className="text-amber-400 font-semibold text-sm">⚠️ Fuel Alert</div>
                    <div className="text-slate-300 text-xs mt-1">
                      You have {estimatedRange} miles of range. Consider requesting bids now.
                    </div>
                  </motion.div>
                )}

                <div className="space-y-3">
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Sharing Preferences</div>
                  {[
                    { label: 'Share Route Corridor', value: routeShared, set: setRouteShared, desc: 'Stations see your general route path' },
                    { label: 'Share Live Location', value: shareLocation, set: setShareLocation, desc: 'More precise but reduces privacy' },
                    { label: 'Share Trip Status', value: shareStatus, set: setShareStatus, desc: 'Stations see urgency level' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-3 bg-slate-800 rounded-xl">
                      <div>
                        <div className="text-white text-sm font-medium">{item.label}</div>
                        <div className="text-slate-400 text-xs">{item.desc}</div>
                      </div>
                      <button
                        onClick={() => item.set(!item.value)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${item.value ? 'bg-amber-500' : 'bg-slate-700'}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.value ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* BIDS TAB */}
            {tab === 'bids' && (
              <motion.div key="bids" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {bids.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-3">📡</div>
                    <div className="text-slate-400 text-sm mb-4">
                      {carStatus === 'requesting' ? 'Broadcasting to stations...' : 'No active bids yet'}
                    </div>
                    {canRequest && carStatus === 'driving' && (
                      <button
                        onClick={() => { startBidRequest(); setTab('bids') }}
                        className="bg-amber-500 text-slate-900 font-bold px-6 py-3 rounded-xl text-sm shadow-lg shadow-amber-500/20"
                      >
                        Request Bids Now
                      </button>
                    )}
                    {!canRequest && carStatus === 'driving' && (
                      <div className="text-xs text-slate-500">
                        {!tripSignal && '• Set a trip signal\n'}
                        {fuelLevel > 40 && '• Fuel must be below 40%\n'}
                        {!routeShared && '• Enable route sharing in Fuel tab'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                      {acceptedBid ? 'Accepted Offer' : `${bids.length} Offers — Best Match First`}
                    </div>
                    {bids.map((bid, i) => (
                      <motion.div
                        key={bid.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => carStatus === 'bid_received' && acceptBid(bid)}
                        className={`p-4 rounded-xl border transition-all ${
                          acceptedBid?.id === bid.id
                            ? 'bg-green-500/10 border-green-400'
                            : i === 0
                            ? 'bg-amber-500/5 border-amber-400/50 cursor-pointer hover:bg-amber-500/10'
                            : 'bg-slate-800 border-slate-700 cursor-pointer hover:border-slate-500'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            {i === 0 && !acceptedBid && (
                              <span className="text-xs bg-amber-500 text-slate-900 font-bold px-2 py-0.5 rounded-full mb-1 inline-block">
                                Best Offer
                              </span>
                            )}
                            <div className="font-bold text-white text-sm">{bid.stationName}</div>
                            <div className="text-xs text-slate-400">{bid.distance} mi · {bid.detour > 0 ? `+${bid.detour} mi detour` : 'On your route'}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-400">${bid.bidPrice}</div>
                            <div className="text-xs text-slate-500 line-through">${bid.publicPrice}/gal</div>
                            <div className="text-xs text-green-400">-${bid.discount} off</div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <span className="text-xs bg-slate-700 text-amber-400 px-2 py-1 rounded-lg">🎁 {bid.offer}</span>
                          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-lg">⏱ {bid.waitTime} min wait</span>
                          <span className="text-xs bg-slate-700 text-blue-400 px-2 py-1 rounded-lg">🤖 Score: {bid.score}</span>
                        </div>
                        {acceptedBid?.id === bid.id && (
                          <div className="mt-2 text-green-400 text-xs font-semibold">✅ Stop added to navigation</div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom CTA */}
        <div className="px-5 pb-5">
          {canRequest && carStatus === 'driving' && tab !== 'bids' && (
            <button
              onClick={() => { startBidRequest(); setTab('bids') }}
              className="w-full py-3.5 bg-amber-500 text-slate-900 font-bold rounded-2xl text-sm shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all"
            >
              ⚡ Request Fuel Bids
            </button>
          )}
          {!canRequest && carStatus === 'driving' && (
            <div className="w-full py-3 text-center text-slate-500 text-xs">
              {!tripSignal ? 'Select a trip signal to enable bidding' :
               fuelLevel > 40 ? `Bidding activates below 40% fuel` :
               !routeShared ? 'Enable route sharing to start bidding' : ''}
            </div>
          )}
          {carStatus === 'accepted' && (
            <div className="w-full py-3 text-center text-green-400 font-semibold text-sm">
              ✅ Heading to {acceptedBid?.stationName}
            </div>
          )}
          {carStatus === 'fueling' && (
            <div className="w-full py-3 text-center text-amber-400 font-semibold text-sm animate-pulse">
              ⛽ Fueling in progress...
            </div>
          )}
          {carStatus === 'complete' && (
            <div className="w-full py-3 text-center text-green-400 font-semibold text-sm">
              ✅ Fuel complete — Back on route!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
