import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { useAppStore } from '../store/useAppStore'

const HOUR_DATA = [
  { hour: '6am', bids: 3, won: 2, revenue: 280 },
  { hour: '7am', bids: 8, won: 6, revenue: 740 },
  { hour: '8am', bids: 14, won: 10, revenue: 1210 },
  { hour: '9am', bids: 11, won: 8, revenue: 980 },
  { hour: '10am', bids: 6, won: 4, revenue: 510 },
  { hour: '11am', bids: 5, won: 3, revenue: 390 },
  { hour: '12pm', bids: 9, won: 7, revenue: 870 },
  { hour: '1pm', bids: 12, won: 9, revenue: 1050 },
  { hour: '2pm', bids: 7, won: 5, revenue: 620 },
  { hour: '3pm', bids: 19, won: 14, revenue: 1840, current: true },
]

const PRICE_HISTORY = [
  { time: '6am', billboard: 3.89, bid: 3.89 },
  { time: '8am', billboard: 3.89, bid: 3.72 },
  { time: '10am', billboard: 3.89, bid: 3.81 },
  { time: '12pm', billboard: 3.89, bid: 3.68 },
  { time: '2pm', billboard: 3.89, bid: 3.65 },
  { time: 'Now', billboard: 3.89, bid: 3.61 },
]

const OFFERS = ['Free Espresso', 'Car Wash ($5 off)', 'Loyalty Points x2', '10¢/gal coupon', 'Free Air/Water']

export default function StationConsole() {
  const { stationBidRequests, stationStats, acceptedBid, carStatus } = useAppStore()

  const [bidPrice, setBidPrice] = useState(3.65)
  const [selectedOffer, setSelectedOffer] = useState('Free Espresso')
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [sentBids, setSentBids] = useState([])

  const publicPrice = 3.89
  const discount = (publicPrice - bidPrice).toFixed(2)
  const winProbability = Math.min(95, Math.max(10, Math.round(((publicPrice - bidPrice) / publicPrice) * 400 + 50)))

  const runAI = () => {
    setAiLoading(true)
    setAiSuggestion(null)
    setTimeout(() => {
      setAiSuggestion({
        price: 3.61,
        offer: '10¢/gal coupon',
        reason: 'High traffic hour (3pm), 2 competitors bidding $3.65+. Dropping to $3.61 with a coupon increases win probability by 34%. You have 8 idle pumps.',
        winProb: 89,
      })
      setAiLoading(false)
    }, 1800)
  }

  const sendBid = () => {
    const bid = {
      id: Date.now(),
      price: bidPrice,
      offer: selectedOffer,
      sentAt: new Date().toLocaleTimeString(),
      status: 'sent',
    }
    setSentBids((prev) => [bid, ...prev])
  }

  const applyAI = () => {
    if (aiSuggestion) {
      setBidPrice(aiSuggestion.price)
      setSelectedOffer(aiSuggestion.offer)
    }
  }

  return (
    <div className="h-full bg-slate-950 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">EXXON Mobil #1247</h2>
          <p className="text-slate-400 text-sm">I-285 & Roswell Rd · Atlanta, GA</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-400 text-sm font-medium">Console Live</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Bids Won Today', value: stationStats.won + sentBids.filter(b => b.status === 'won').length, color: 'text-green-400', icon: '🏆' },
          { label: 'Bids Lost', value: stationStats.lost, color: 'text-red-400', icon: '❌' },
          { label: 'Revenue Today', value: `$${stationStats.revenue.toLocaleString()}`, color: 'text-amber-400', icon: '💰' },
          { label: 'Avg Discount', value: `${(stationStats.avgDiscount * 100).toFixed(0)}¢/gal`, color: 'text-blue-400', icon: '📉' },
        ].map((s) => (
          <div key={s.label} className="hud-panel text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Bid Composer */}
        <div className="flex flex-col gap-4">
          <div className="hud-panel">
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">Bid Composer</div>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">Your Bid Price</span>
                <span className="text-green-400 font-bold text-lg">${bidPrice.toFixed(2)}/gal</span>
              </div>
              <input
                type="range" min={3.40} max={3.88} step={0.01}
                value={bidPrice}
                onChange={(e) => setBidPrice(parseFloat(e.target.value))}
                className="w-full accent-amber-400"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>$3.40 (max discount)</span>
                <span>$3.88 (min)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4 text-center text-sm">
              <div className="bg-slate-900 rounded-lg p-2">
                <div className="text-slate-400 text-xs">Billboard</div>
                <div className="text-white font-bold">${publicPrice}</div>
              </div>
              <div className="bg-slate-900 rounded-lg p-2">
                <div className="text-slate-400 text-xs">Discount</div>
                <div className="text-green-400 font-bold">-${discount}</div>
              </div>
              <div className="bg-slate-900 rounded-lg p-2 col-span-2">
                <div className="text-slate-400 text-xs mb-1">Win Probability</div>
                <div className="h-2 bg-slate-700 rounded-full">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-500"
                    style={{ width: `${winProbability}%` }}
                  />
                </div>
                <div className="text-green-400 font-bold mt-1">{winProbability}%</div>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-xs text-slate-400 mb-2">Attach Offer</div>
              <div className="flex flex-col gap-1.5">
                {OFFERS.map((o) => (
                  <button
                    key={o}
                    onClick={() => setSelectedOffer(o)}
                    className={`text-left text-sm px-3 py-2 rounded-lg border transition-all ${
                      selectedOffer === o
                        ? 'bg-amber-500/10 border-amber-400 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    🎁 {o}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={sendBid}
              className="w-full py-2.5 bg-green-500 text-white font-bold rounded-xl text-sm hover:bg-green-400 transition-all shadow-lg shadow-green-500/20"
            >
              Send Bid — ${bidPrice.toFixed(2)} + {selectedOffer}
            </button>
          </div>

          {/* AI Pricing Engine */}
          <div className="hud-panel bg-gradient-to-b from-slate-800 to-slate-900 border-blue-500/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🤖</span>
              <div className="text-xs text-blue-400 font-semibold uppercase tracking-wide">AI Pricing Engine</div>
            </div>

            {!aiSuggestion && !aiLoading && (
              <button
                onClick={runAI}
                className="w-full py-2.5 bg-blue-500/20 border border-blue-400/40 text-blue-300 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-all"
              >
                Generate AI Recommendation
              </button>
            )}

            {aiLoading && (
              <div className="text-center py-4">
                <div className="text-blue-400 text-sm animate-pulse">Analyzing market conditions...</div>
                <div className="text-xs text-slate-500 mt-1">Checking competitor bids · Traffic · Pump capacity</div>
              </div>
            )}

            <AnimatePresence>
              {aiSuggestion && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-3 mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-blue-300 font-bold text-lg">${aiSuggestion.price}/gal</span>
                      <span className="text-green-400 font-bold">{aiSuggestion.winProb}% win</span>
                    </div>
                    <div className="text-xs text-amber-400 mb-1">🎁 {aiSuggestion.offer}</div>
                    <div className="text-xs text-slate-400 leading-relaxed">{aiSuggestion.reason}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={applyAI}
                      className="flex-1 py-2 bg-blue-500 text-white font-bold rounded-lg text-xs hover:bg-blue-400 transition-all"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setAiSuggestion(null)}
                      className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-600 transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center: Charts */}
        <div className="flex flex-col gap-4">
          <div className="hud-panel">
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">Bids Won vs Lost by Hour</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={HOUR_DATA} barGap={2}>
                <XAxis dataKey="hour" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Bar dataKey="won" fill="#10B981" radius={[3, 3, 0, 0]} name="Won" />
                <Bar dataKey="bids" fill="#334155" radius={[3, 3, 0, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="hud-panel">
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Price: Billboard vs Bid</div>
            <div className="text-xs text-slate-500 mb-3">Private bid stays below billboard</div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={PRICE_HISTORY}>
                <XAxis dataKey="time" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[3.5, 4.0]} tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v, n) => [`$${v}`, n]}
                />
                <Line dataKey="billboard" stroke="#EF4444" strokeWidth={2} dot={false} name="Billboard" strokeDasharray="4 2" />
                <Line dataKey="bid" stroke="#10B981" strokeWidth={2.5} dot={{ fill: '#10B981', r: 3 }} name="Bid Price" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1"><span className="w-4 h-0.5 bg-red-400 inline-block" style={{borderTop: '2px dashed #EF4444', display:'inline-block', height:0}} />Billboard</div>
              <div className="flex items-center gap-1"><span className="w-4 h-0.5 bg-green-400 inline-block" />Private Bid</div>
            </div>
          </div>
        </div>

        {/* Right: Incoming Requests */}
        <div className="hud-panel flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Incoming Car Requests</div>
            {stationBidRequests.length > 0 && (
              <span className="text-xs bg-green-400/20 text-green-400 border border-green-400/30 px-2 py-0.5 rounded-full">
                {stationBidRequests.length} live
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            <AnimatePresence>
              {stationBidRequests.length === 0 && (
                <div className="text-center py-8 text-slate-600 text-sm">
                  Waiting for driver requests on your corridor...
                </div>
              )}
              {stationBidRequests.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded-xl border ${
                    acceptedBid?.stationId === 1 && req.stationId === 1
                      ? 'bg-green-400/10 border-green-400'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-white text-sm font-medium">🚗 Vehicle RFQ</div>
                      <div className="text-slate-400 text-xs">{req.received?.toLocaleTimeString()}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      acceptedBid?.stationId === 1
                        ? 'bg-green-400/20 text-green-400'
                        : 'bg-amber-400/20 text-amber-400'
                    }`}>
                      {acceptedBid?.stationId === 1 ? 'WON ✓' : 'Active'}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                      {req.distance} mi away
                    </span>
                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                      I-285 N corridor
                    </span>
                  </div>
                  {acceptedBid?.stationId === 1 && (
                    <div className="mt-2 text-xs text-green-400 font-medium">
                      Customer accepted @ ${req.bidPrice}/gal — ETA 4 min
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Sent bids history */}
            {sentBids.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Bids Sent</div>
                {sentBids.map((b) => (
                  <div key={b.id} className="p-2 bg-slate-900 rounded-lg border border-slate-800 mb-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-white font-medium">${b.price.toFixed(2)} + {b.offer}</span>
                      <span className="text-slate-500">{b.sentAt}</span>
                    </div>
                    <div className="text-xs text-amber-400 mt-0.5">Broadcast to corridor</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pump status */}
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="text-xs text-slate-400 mb-2">Pump Status</div>
            <div className="grid grid-cols-4 gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-6 rounded text-xs flex items-center justify-center font-bold ${
                    i < 3 ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    i === 3 && carStatus === 'fueling' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' :
                    'bg-slate-800 text-slate-600 border border-slate-700'
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-2 text-xs text-slate-500">
              <span><span className="text-green-400">■</span> In use</span>
              <span><span className="text-amber-400">■</span> Reserved</span>
              <span><span className="text-slate-600">■</span> Open</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
