import { useState, useEffect } from 'react'
import sqlcl from '../services/sqlcl'
import { AlertCircle } from 'lucide-react'

export default function HoldsView() {
  const [loading, setLoading] = useState(false)
  const [holds, setHolds] = useState([])

  useEffect(() => {
    loadHolds()
  }, [])

  const loadHolds = async () => {
    try {
      setLoading(true)
      const data = await sqlcl.getHoldStatistics()
      setHolds(data || [])
    } catch (err) {
      console.error('Error loading holds:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading holds data...</p>
        </div>
      </div>
    )
  }

  const totalHolds = holds.reduce((sum, h) => sum + parseInt(h.HOLD_COUNT || h.hold_count || 0), 0)
  const totalActive = holds.reduce((sum, h) => sum + parseInt(h.ACTIVE_HOLDS || h.active_holds || 0), 0)
  const totalReleased = holds.reduce((sum, h) => sum + parseInt(h.RELEASED_HOLDS || h.released_holds || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Invoice Holds</h2>
        <p className="text-gray-600 mt-1">Overview of all invoice hold types</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-12 w-12 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Holds</p>
              <p className="text-2xl font-bold text-gray-900">{totalHolds.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-12 w-12 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Holds</p>
              <p className="text-2xl font-bold text-orange-600">{totalActive.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-12 w-12 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Released Holds</p>
              <p className="text-2xl font-bold text-green-600">{totalReleased.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Holds Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Hold Types Breakdown</h3>
        </div>
        <div className="p-6">
          {holds.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hold data available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hold Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Count
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Active
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Released
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Release Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {holds.map((hold, idx) => {
                    const total = parseInt(hold.HOLD_COUNT || hold.hold_count || 0)
                    const released = parseInt(hold.RELEASED_HOLDS || hold.released_holds || 0)
                    const releaseRate = total > 0 ? ((released / total) * 100).toFixed(1) : 0
                    
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {hold.HOLD_LOOKUP_CODE || hold.hold_lookup_code}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {total.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-orange-600 text-right">
                          {parseInt(hold.ACTIVE_HOLDS || hold.active_holds || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-600 text-right">
                          {released.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {releaseRate}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
