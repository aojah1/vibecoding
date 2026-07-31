import { useState, useEffect } from 'react'
import sqlcl from '../services/sqlcl'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Clock } from 'lucide-react'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function AgingAnalysis({ supplier, onSelectSupplier }) {
  const [loading, setLoading] = useState(false)
  const [agingData, setAgingData] = useState([])
  const [supplierName, setSupplierName] = useState(supplier || 'Industrial Dressler')

  useEffect(() => {
    if (supplierName) {
      loadAgingData()
    }
  }, [supplierName])

  const loadAgingData = async () => {
    try {
      setLoading(true)
      const data = await sqlcl.getSupplierAging(supplierName)
      setAgingData(data || [])
    } catch (err) {
      console.error('Error loading aging data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount, currency) => {
    const num = parseFloat(amount)
    if (isNaN(num)) return 'N/A'
    
    const formatted = num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
    
    return `${formatted} ${currency}`
  }

  // Group data by aging bucket
  const groupedData = agingData.reduce((acc, item) => {
    const bucket = item.AGING_BUCKET || item.aging_bucket
    const existing = acc.find(d => d.bucket === bucket)
    
    if (existing) {
      existing.amount += parseFloat(item.OUTSTANDING_AMOUNT || item.outstanding_amount || 0)
      existing.count += parseInt(item.INVOICE_COUNT || item.invoice_count || 0)
    } else {
      acc.push({
        bucket,
        amount: parseFloat(item.OUTSTANDING_AMOUNT || item.outstanding_amount || 0),
        count: parseInt(item.INVOICE_COUNT || item.invoice_count || 0),
        currency: item.INVOICE_CURRENCY_CODE || item.invoice_currency_code
      })
    }
    
    return acc
  }, [])

  // Sort by aging order
  const bucketOrder = ['0-30 Days', '31-60 Days', '61-90 Days', '91-180 Days', '181-365 Days', 'Over 1 Year']
  groupedData.sort((a, b) => bucketOrder.indexOf(a.bucket) - bucketOrder.indexOf(b.bucket))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading aging analysis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Aging Analysis</h2>
          <p className="text-gray-600 mt-1">Invoice aging breakdown for {supplierName}</p>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Enter supplier name"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={loadAgingData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Analyze
          </button>
        </div>
      </div>

      {agingData.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <p className="text-gray-500 text-center">No aging data available for this supplier</p>
        </div>
      ) : (
        <>
          {/* Bar Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Outstanding Amount by Aging Bucket</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={groupedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => value.toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })}
                />
                <Legend />
                <Bar dataKey="amount" fill="#3b82f6" name="Outstanding Amount" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Count Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={groupedData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.bucket}: ${entry.count}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {groupedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Detailed Breakdown</h3>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aging Bucket
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Currency
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice Count
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Outstanding Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {agingData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {item.AGING_BUCKET || item.aging_bucket}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.INVOICE_CURRENCY_CODE || item.invoice_currency_code}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {item.INVOICE_COUNT || item.invoice_count}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                          {formatCurrency(
                            item.OUTSTANDING_AMOUNT || item.outstanding_amount,
                            item.INVOICE_CURRENCY_CODE || item.invoice_currency_code
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
