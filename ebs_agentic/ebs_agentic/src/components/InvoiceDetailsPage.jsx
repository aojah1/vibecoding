import React, { useState } from 'react';

const SERVER_HOST = import.meta.env.VITE_SERVER_HOST || 'http://localhost:4001';

const InvoiceDetailsPage = ({ invoice, onClose }) => {
  const [processing, setProcessing] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getCheckIcon = (status) => {
    if (status === 'pass') {
      return <span className="text-green-500 text-xl">✅</span>;
    } else if (status === 'review') {
      return <span className="text-yellow-500 text-xl">⚠️</span>;
    } else if (status === 'flag') {
      return <span className="text-red-500 text-xl">🚨</span>;
    }
    return <span className="text-gray-500 text-xl">❓</span>;
  };

  const handleApprove = async () => {
    setShowConfirmation(false);
    setProcessing(true);
    setActionResult(null);

    try {
      const response = await fetch(`${SERVER_HOST}/api/manager/approve-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNum: invoice.invoiceNum,
          invoiceId: invoice.invoiceId,
          amount: invoice.amount,
          vendorName: invoice.vendorName
        })
      });

      const data = await response.json();

      if (data.success) {
        setActionResult({
          type: 'success',
          message: 'Invoice approved and submitted to OIC Gateway',
          details: data.details
        });

        // Update invoice status
        invoice.status = 'SUBMITTED';
        
        // Auto-close after 3 seconds
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setActionResult({
          type: 'error',
          message: data.error || 'Failed to approve invoice'
        });
      }
    } catch (error) {
      console.error('Error approving invoice:', error);
      setActionResult({
        type: 'error',
        message: error.message
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleHold = async () => {
    setShowConfirmation(false);
    setProcessing(true);
    setActionResult(null);

    try {
      const response = await fetch(`${SERVER_HOST}/api/manager/hold-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNum: invoice.invoiceNum,
          invoiceId: invoice.invoiceId,
          vendorName: invoice.vendorName
        })
      });

      const data = await response.json();

      if (data.success) {
        setActionResult({
          type: 'success',
          message: 'Invoice placed on hold',
          details: data.details
        });

        // Update invoice status
        invoice.status = 'HOLD';
        
        // Auto-close after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setActionResult({
          type: 'error',
          message: data.error || 'Failed to hold invoice'
        });
      }
    } catch (error) {
      console.error('Error holding invoice:', error);
      setActionResult({
        type: 'error',
        message: error.message
      });
    } finally {
      setProcessing(false);
    }
  };

  const openConfirmation = (action) => {
    setConfirmAction(action);
    setShowConfirmation(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      'AUTO_APPROVE': 'bg-green-100 text-green-800 border-green-300',
      'APPROVED': 'bg-green-100 text-green-800 border-green-300',
      'REVIEW': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'INVESTIGATE': 'bg-red-100 text-red-800 border-red-300',
      'HOLD': 'bg-gray-100 text-gray-800 border-gray-300',
      'SUBMITTED': 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const canTakeAction = invoice.status === 'REVIEW' || invoice.status === 'INVESTIGATE';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Invoice Details</h1>
              <p className="text-indigo-100">Deep Research Analysis Results</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Invoice Summary Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm font-medium text-gray-600">Invoice Number</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">#{invoice.invoiceNum}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Vendor</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{invoice.vendorName || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Outstanding Amount</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(invoice.amount)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Status</div>
              <div className="mt-1">
                <span className={`px-4 py-2 inline-flex text-sm font-semibold rounded-full border ${getStatusColor(invoice.status)}`}>
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
            <div>
              <div className="text-sm font-medium text-gray-600">Age (Days)</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{invoice.daysOld || 0} days</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Recommendation</div>
              <div className="mt-1 text-sm text-gray-700">{invoice.recommendation || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Analysis Date</div>
              <div className="mt-1 text-sm text-gray-700">
                {invoice.analysisDate ? new Date(invoice.analysisDate).toLocaleString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Checks */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Multi-Source Validation Results
          </h2>

          {invoice.checks && invoice.checks.length > 0 ? (
            <div className="space-y-4">
              {invoice.checks.map((check, index) => (
                <div
                  key={index}
                  className={`border-l-4 p-4 rounded-r-lg ${
                    check.status === 'pass' ? 'border-green-500 bg-green-50' :
                    check.status === 'review' ? 'border-yellow-500 bg-yellow-50' :
                    check.status === 'flag' ? 'border-red-500 bg-red-50' :
                    'border-gray-500 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      {getCheckIcon(check.status)}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{check.source}</div>
                      <div className="mt-1 text-sm text-gray-700">{check.message}</div>
                      <div className="mt-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          check.status === 'pass' ? 'bg-green-200 text-green-800' :
                          check.status === 'review' ? 'bg-yellow-200 text-yellow-800' :
                          check.status === 'flag' ? 'bg-red-200 text-red-800' :
                          'bg-gray-200 text-gray-800'
                        }`}>
                          {check.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No validation checks available
            </div>
          )}
        </div>

        {/* Action Result */}
        {actionResult && (
          <div className={`rounded-lg p-6 mb-6 border-2 ${
            actionResult.type === 'success'
              ? 'bg-green-50 border-green-300'
              : 'bg-red-50 border-red-300'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {actionResult.type === 'success' ? (
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <h3 className={`text-lg font-semibold ${
                  actionResult.type === 'success' ? 'text-green-900' : 'text-red-900'
                }`}>
                  {actionResult.message}
                </h3>
                {actionResult.details && (
                  <div className="mt-2 text-sm text-gray-700">
                    {actionResult.details.batchId && (
                      <div>Batch ID: <span className="font-mono">{actionResult.details.batchId}</span></div>
                    )}
                    {actionResult.details.timestamp && (
                      <div>Timestamp: {new Date(actionResult.details.timestamp).toLocaleString()}</div>
                    )}
                    {actionResult.details.reason && (
                      <div>Reason: {actionResult.details.reason}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {canTakeAction && !actionResult && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Available Actions</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Approve Button */}
              <div className="border-2 border-green-300 rounded-lg p-6 bg-green-50">
                <div className="flex items-start mb-4">
                  <svg className="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-green-900">Approve & Submit</h3>
                    <p className="mt-1 text-sm text-green-700">
                      Approve this invoice and submit to OIC Gateway for payment processing.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => openConfirmation('approve')}
                  disabled={processing}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {processing ? 'Processing...' : 'Approve Invoice'}
                </button>
              </div>

              {/* Hold Button */}
              <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50">
                <div className="flex items-start mb-4">
                  <svg className="w-8 h-8 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">Place on Hold</h3>
                    <p className="mt-1 text-sm text-gray-700">
                      Place this invoice on hold for further investigation or documentation.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => openConfirmation('hold')}
                  disabled={processing}
                  className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {processing ? 'Processing...' : 'Place on Hold'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Already Processed */}
        {!canTakeAction && !actionResult && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Invoice Status: {invoice.status}</h3>
                <p className="mt-1 text-sm text-blue-700">
                  {invoice.status === 'AUTO_APPROVE' || invoice.status === 'APPROVED' || invoice.status === 'SUBMITTED'
                    ? 'This invoice has been approved and submitted for payment.'
                    : invoice.status === 'HOLD'
                    ? 'This invoice is currently on hold.'
                    : 'No further action required at this time.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {confirmAction === 'approve' ? 'Confirm Approval' : 'Confirm Hold'}
            </h3>
            
            <div className="mb-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-600">Invoice #</div>
                <div className="text-lg font-bold text-gray-900">{invoice.invoiceNum}</div>
                <div className="text-sm text-gray-600 mt-2">Amount</div>
                <div className="text-lg font-bold text-gray-900">{formatCurrency(invoice.amount)}</div>
              </div>

              {confirmAction === 'approve' ? (
                <p className="text-gray-700">
                  This will approve the invoice and submit it to the OIC Gateway for payment processing. 
                  The payment will be scheduled and the vendor will be notified.
                </p>
              ) : (
                <p className="text-gray-700">
                  This will place the invoice on hold. No payment will be processed until the hold is removed 
                  and the invoice is re-approved.
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setConfirmAction(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction === 'approve' ? handleApprove : handleHold}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  confirmAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {confirmAction === 'approve' ? 'Approve & Submit' : 'Place on Hold'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetailsPage;
