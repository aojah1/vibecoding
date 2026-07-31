import { useState, useEffect } from 'react'
import { ArrowLeft, FileText } from 'lucide-react'

const SERVER_HOST = import.meta.env.VITE_SERVER_HOST || 'http://localhost:4001';
const ANALYSIS_DATE = import.meta.env.VITE_ANALYSIS_DATE || '10-OCT-2010';

export default function AutoPaidSupplierDetail({ supplier, onBack, onSelectInvoice }) {
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState([])

  useEffect(() => {
    loadSupplierInvoices()
  }, [supplier])

  const executeQuery = async (sql) => {
    try {
      const response = await fetch(`${SERVER_HOST}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      })
      return await response.json()
    } catch (error) {
      console.error('Query error:', error)
      return { success: false, error: error.message }
    }
  }

  const loadSupplierInvoices = async () => {
    try {
      setLoading(true)

      const sql = `
        SELECT
          ai.invoice_num,
          ai.invoice_id,
          ai.invoice_amount,
          ai.amount_paid,
          ai.invoice_amount - NVL(ai.amount_paid, 0) as outstanding_amount,
          ai.invoice_date,
          TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date) as days_old,
          ai.invoice_currency_code,
          ai.invoice_type_lookup_code,
          ai.description
        FROM ap.ap_invoices_all ai
        WHERE ai.vendor_id = ${supplier.vendorId}
          AND ai.payment_status_flag != 'Y'
          AND ai.cancelled_date IS NULL
          AND (ai.invoice_amount - NVL(ai.amount_paid, 0)) > 0
        ORDER BY (ai.invoice_amount - NVL(ai.amount_paid, 0)) ASC
      `

      const result = await executeQuery(sql)
      if (result.success) {
        const formatted = result.data.map(inv => ({
          invoiceNum: inv.INVOICE_NUM || inv.invoice_num,
          invoiceId: inv.INVOICE_ID || inv.invoice_id,
          invoiceAmount: parseFloat(inv.INVOICE_AMOUNT || inv.invoice_amount || 0),
          amountPaid: parseFloat(inv.AMOUNT_PAID || inv.amount_paid || 0),
          outstanding: parseFloat(inv.OUTSTANDING_AMOUNT || inv.outstanding_amount || 0),
          invoiceDate: inv.INVOICE_DATE || inv.invoice_date,
          daysOld: parseInt(inv.DAYS_OLD || inv.days_old || 0),
          currency: inv.INVOICE_CURRENCY_CODE || inv.invoice_currency_code || 'USD',
          invoiceType: inv.INVOICE_TYPE_LOOKUP_CODE || inv.invoice_type_lookup_code || '',
          description: inv.DESCRIPTION || inv.description || ''
        }))
        setInvoices(formatted)
      }
    } catch (error) {
      console.error('Error loading supplier invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
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

  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.outstanding, 0)
  const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + inv.invoiceAmount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading auto-paid invoices...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Back + Title */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Auto Paid Invoices</h2>
          <p className="text-gray-500 mt-0.5">Agent-processed invoices for this supplier</p>
        </div>
      </div>

      {/* Supplier + Summary Card */}
      <div className="bg-white rounded-lg shadow-sm border border-green-200">
        <div className="px-6 py-4 border-b border-green-200 bg-green-50">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-4">
              <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-900">{supplier.vendorName}</h3>
              <p className="text-sm text-green-700">Vendor ID: {supplier.vendorId}</p>
            </div>
          </div>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 divide-x divide-green-100">
          <div className="p-5 text-center">
            <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Total Invoices</div>
            <div className="text-2xl font-bold text-green-700">{invoices.length}</div>
          </div>
          <div className="p-5 text-center">
            <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Total Invoice Amt</div>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(totalInvoiceAmount)}</div>
          </div>
          <div className="p-5 text-center">
            <div className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Total Outstanding</div>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(totalOutstanding)}</div>
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-lg shadow-sm border border-green-200">
        <div className="px-6 py-4 border-b border-green-200 bg-green-50 flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-base font-semibold text-green-900">Invoice Listing</h3>
          </div>
          <span className="text-xs font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} &bull; Sorted by lowest outstanding
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-green-50 border-b border-green-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-green-700 uppercase tracking-wider">#</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-green-700 uppercase tracking-wider">Invoice #</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-green-700 uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-green-700 uppercase tracking-wider">Type</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-green-700 uppercase tracking-wider">Invoice Amt</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-green-700 uppercase tracking-wider">Outstanding</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-green-700 uppercase tracking-wider">Days Old</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-green-700 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-500 text-sm">
                    No auto-paid invoices found for this supplier
                  </td>
                </tr>
              )}
              {invoices.map((invoice, index) => (
                <tr key={invoice.invoiceNum} className="border-b border-gray-100 hover:bg-green-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{invoice.invoiceNum}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(invoice.invoiceDate)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{invoice.invoiceType || '—'}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">{formatCurrency(invoice.invoiceAmount)}</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-green-700">{formatCurrency(invoice.outstanding)}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">{invoice.daysOld}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => onSelectInvoice(invoice.invoiceNum)}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors inline-flex items-center space-x-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
