import { useState, useEffect } from 'react'
import sqlcl from '../services/sqlcl'
import { Users, Search, Calendar } from 'lucide-react'

export default function SuppliersView({ selectedSupplier, onSelectSupplier, onSelectInvoice }) {
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!selectedSupplier) {
      loadSuppliers()
    } else {
      loadSupplierInvoices()
    }
  }, [selectedSupplier])

  const loadSuppliers = async () => {
    try {
      setLoading(true)
      const data = await sqlcl.getTopSuppliers(20)
      setSuppliers(data || [])
    } catch (err) {
      console.error('Error loading suppliers:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadSupplierInvoices = async () => {
    try {
      setLoading(true)
      const data = await sqlcl.getSupplierInvoices(selectedSupplier)
      setInvoices(data || [])
    } catch (err) {
      console.error('Error loading invoices:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount, currency) => {
    const num = parseFloat(amount)
    if (isNaN(num)) return 'N/A'
    
    const formatted = num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    
    return `${formatted} ${currency}`
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return dateStr
    }
  }

  const filteredSuppliers = suppliers.filter(s => 
    (s.VENDOR_NAME || s.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (selectedSupplier) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{selectedSupplier}</h2>
            <p className="text-gray-600 mt-1">Outstanding invoices</p>
          </div>
          <button
            onClick={() => onSelectSupplier(null)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Back to Suppliers
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            {invoices.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No outstanding invoices</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Outstanding
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Days Old
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((invoice, idx) => {
                      const daysOld = parseInt(invoice.DAYS_OLD || invoice.days_old || 0)
                      const ageColor = daysOld > 365 ? 'text-red-600' : daysOld > 180 ? 'text-orange-600' : 'text-gray-900'
                      
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {invoice.INVOICE_NUM || invoice.invoice_num}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatDate(invoice.INVOICE_DATE || invoice.invoice_date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {formatCurrency(
                              invoice.INVOICE_AMOUNT || invoice.invoice_amount,
                              invoice.INVOICE_CURRENCY_CODE || invoice.invoice_currency_code
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                            {formatCurrency(
                              invoice.OUTSTANDING_AMOUNT || invoice.outstanding_amount,
                              invoice.INVOICE_CURRENCY_CODE || invoice.invoice_currency_code
                            )}
                          </td>
                          <td className={`px-4 py-3 text-sm font-semibold text-right ${ageColor}`}>
                            {daysOld}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => onSelectInvoice(invoice.INVOICE_NUM || invoice.invoice_num)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              View Details
                            </button>
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Suppliers</h2>
        <p className="text-gray-600 mt-1">Browse suppliers with outstanding payments</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Suppliers List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          {filteredSuppliers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No suppliers found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier Name
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSuppliers.map((supplier, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {supplier.VENDOR_NAME || supplier.vendor_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {supplier.CURRENCY || supplier.currency}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {supplier.INVOICE_COUNT || supplier.invoice_count}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                        {formatCurrency(
                          supplier.OUTSTANDING_AMOUNT || supplier.outstanding_amount,
                          supplier.CURRENCY || supplier.currency
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => onSelectSupplier(supplier.VENDOR_NAME || supplier.vendor_name)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Invoices
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
