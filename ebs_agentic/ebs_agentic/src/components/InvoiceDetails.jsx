import { useState, useEffect } from 'react'
import sqlcl from '../services/sqlcl'
import { FileText, ArrowLeft } from 'lucide-react'

export default function InvoiceDetails({ invoice, onBack }) {
  const [loading, setLoading] = useState(false)
  const [details, setDetails] = useState(null)

  useEffect(() => {
    if (invoice) {
      loadInvoiceDetails()
    }
  }, [invoice])

  const loadInvoiceDetails = async () => {
    try {
      setLoading(true)
      const data = await sqlcl.getInvoiceDetails(invoice)
      if (data && data.length > 0) {
        setDetails(data[0])
      }
    } catch (err) {
      console.error('Error loading invoice details:', err)
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
    
    return `${currency} ${formatted}`
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice details...</p>
        </div>
      </div>
    )
  }

  if (!details) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <p className="text-gray-500 text-center">No invoice details available</p>
        <button
          onClick={onBack}
          className="mt-4 mx-auto block px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invoice Details</h2>
          <p className="text-gray-600 mt-1">{details.INVOICE_NUM || details.invoice_num}</p>
        </div>
      </div>

      {/* Invoice Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Invoice Information</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Invoice Number</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {details.INVOICE_NUM || details.invoice_num}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Invoice Date</p>
              <p className="mt-1 text-lg text-gray-900">
                {formatDate(details.INVOICE_DATE || details.invoice_date)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Invoice Amount</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {formatCurrency(
                  details.INVOICE_AMOUNT || details.invoice_amount,
                  details.INVOICE_CURRENCY_CODE || details.invoice_currency_code
                )}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Amount Paid</p>
              <p className="mt-1 text-lg text-green-600 font-semibold">
                {formatCurrency(
                  details.AMOUNT_PAID || details.amount_paid || 0,
                  details.INVOICE_CURRENCY_CODE || details.invoice_currency_code
                )}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Payment Status</p>
              <p className="mt-1">
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                  (details.PAYMENT_STATUS_FLAG || details.payment_status_flag) === 'Y'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {(details.PAYMENT_STATUS_FLAG || details.payment_status_flag) === 'Y' ? 'Paid' : 'Not Paid'}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Invoice Type</p>
              <p className="mt-1 text-lg text-gray-900">
                {details.INVOICE_TYPE_LOOKUP_CODE || details.invoice_type_lookup_code}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Source</p>
              <p className="mt-1 text-lg text-gray-900">
                {details.SOURCE || details.source}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Description</p>
              <p className="mt-1 text-gray-900">
                {details.DESCRIPTION || details.description || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-purple-50">
          <h3 className="text-lg font-semibold text-gray-900">Vendor Information</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Vendor Name</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {details.VENDOR_NAME || details.vendor_name}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Vendor ID</p>
              <p className="mt-1 text-lg text-gray-900">
                {details.VENDOR_ID || details.vendor_id}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Vendor Site</p>
              <p className="mt-1 text-lg text-gray-900">
                {details.VENDOR_SITE_CODE || details.vendor_site_code || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> This invoice is from an EBS instance with data as of October 2010. 
          For complete PO and receipt details, additional queries would be needed.
        </p>
      </div>
    </div>
  )
}
