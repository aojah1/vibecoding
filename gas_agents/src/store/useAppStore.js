import { create } from 'zustand'

const STATIONS = [
  { id: 1, name: 'EXXON Mobil #1247', brand: 'EXXON', distance: 1.2, detour: 0, publicPrice: 3.89, lat: 33.749, lng: -84.388, amenities: ['Coffee', 'Car Wash', 'Restrooms'] },
  { id: 2, name: 'Shell Express', brand: 'Shell', distance: 2.8, detour: 0.4, publicPrice: 3.95, lat: 33.753, lng: -84.372, amenities: ['Espresso', 'ATM'] },
  { id: 3, name: 'BP Connect', brand: 'BP', distance: 3.5, detour: 0.7, publicPrice: 3.79, lat: 33.741, lng: -84.401, amenities: ['Coffee', 'Snacks', 'Loyalty Points'] },
  { id: 4, name: 'Chevron Extra', brand: 'Chevron', distance: 4.1, detour: 1.2, publicPrice: 3.92, lat: 33.758, lng: -84.365, amenities: ['Car Wash', 'Air Pump'] },
]

const TRIP_SIGNALS = [
  { id: 'airport', label: 'Airport Run', icon: '✈️', urgency: 'high', defaultDest: 'Hartsfield-Jackson Airport' },
  { id: 'school', label: 'School Pickup', icon: '🏫', urgency: 'medium', defaultDest: 'Lincoln Middle School' },
  { id: 'weekend', label: 'Weekend Drive', icon: '🌄', urgency: 'low', defaultDest: 'Blue Ridge, GA' },
  { id: 'commute', label: 'Daily Commute', icon: '🏙️', urgency: 'medium', defaultDest: 'Downtown Atlanta' },
  { id: 'errand', label: 'Quick Errand', icon: '🛒', urgency: 'low', defaultDest: 'Costco Kennesaw' },
]

export const useAppStore = create((set, get) => ({
  // Navigation
  activeScreen: 'car',

  // Driver state
  fuelLevel: 28,
  fuelCapacity: 14,
  tripSignal: null,
  destination: '',
  routeShared: false,
  estimatedRange: 98,

  // Bids state
  bids: [],
  activeBidRequest: false,
  acceptedBid: null,

  // Station console state
  stationBidRequests: [],
  stationStats: { won: 12, lost: 7, revenue: 1840, avgDiscount: 0.18 },
  activeBid: { stationId: 1, price: 3.65, offer: 'Free Espresso', status: 'composing' },

  // Simulation
  simulationRunning: false,
  carStatus: 'driving',  // driving | requesting | bid_received | accepted | fueling | complete

  setActiveScreen: (screen) => set({ activeScreen: screen }),

  setFuelLevel: (level) => set({
    fuelLevel: level,
    estimatedRange: Math.round(level * 3.5),
  }),

  setTripSignal: (signal) => set({
    tripSignal: signal,
    destination: signal?.defaultDest || '',
  }),

  setDestination: (dest) => set({ destination: dest }),
  setRouteShared: (val) => set({ routeShared: val }),

  startBidRequest: () => {
    const { stations } = get()
    set({ activeBidRequest: true, bids: [], carStatus: 'requesting' })

    // Simulate bids arriving over time
    STATIONS.forEach((station, i) => {
      setTimeout(() => {
        const discount = (Math.random() * 0.35 + 0.1).toFixed(2)
        const bidPrice = (station.publicPrice - parseFloat(discount)).toFixed(2)
        const offer = station.amenities[Math.floor(Math.random() * station.amenities.length)]
        const waitTime = Math.floor(Math.random() * 8) + 2

        const bid = {
          id: station.id,
          stationId: station.id,
          stationName: station.name,
          brand: station.brand,
          publicPrice: station.publicPrice,
          bidPrice: parseFloat(bidPrice),
          discount: parseFloat(discount),
          offer,
          waitTime,
          distance: station.distance,
          detour: station.detour,
          score: Math.floor(Math.random() * 30 + 70),
          amenities: station.amenities,
          timestamp: new Date(),
        }

        set((state) => ({
          bids: [...state.bids, bid].sort((a, b) => b.score - a.score),
          carStatus: 'bid_received',
          stationBidRequests: [
            { ...bid, incoming: true, received: new Date() },
            ...state.stationBidRequests,
          ],
        }))
      }, (i + 1) * 1200)
    })
  },

  acceptBid: (bid) => {
    set({ acceptedBid: bid, carStatus: 'accepted' })
    setTimeout(() => set({ carStatus: 'fueling' }), 2000)
    setTimeout(() => set({ carStatus: 'complete', fuelLevel: 100, estimatedRange: 350 }), 5000)
  },

  resetSimulation: () => set({
    bids: [],
    activeBidRequest: false,
    acceptedBid: null,
    carStatus: 'driving',
    fuelLevel: 28,
    estimatedRange: 98,
    tripSignal: null,
    routeShared: false,
  }),

  STATIONS,
  TRIP_SIGNALS,
}))
