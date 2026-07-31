import React, { useState, useEffect } from 'react';
import InvoiceDetailsPage from './InvoiceDetailsPage';

const SERVER_HOST = import.meta.env.VITE_SERVER_HOST || 'http://localhost:4001';

const APManagerDashboard = () => {
  const [analysisResults, setAnalysisResults] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, approved, review, investigate, hold
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAnalysisResults();
  }, []);

  const loadAnalysisResults = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${SERVER_HOST}/api/manager/analysis-results`);
      const data = await response.json();
      
      if (data.success) {
        setAnalysisResults(data.results || []);
      }
    } catch (error) {
      console.error('Error loading analysis results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceClick = (invoice) => {
    setSelectedInvoice(invoice);
  };

  const handleCloseDetails = () => {
    setSelectedInvoice(null);
    loadAnalysisResults(); // Refresh data
  };

  const getStatusBadge = (status) => {
    const badges = {
      'AUTO_APPROVE': 'bg-green-100 text-green-800 border-green-300',
      'APPROVED': 'bg-green-100 text-green-800 border-green-300',
      'REVIEW': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'INVESTIGATE': 'bg-red-100 text-red-800 border-red-300',
      'HOLD': 'bg-gray-100 text-gray-800 border-gray-300',
      'SUBMITTED': 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return badges[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'AUTO_APPROVE': '✅',
      'APPROVED': '✅',
      'REVIEW': '⚠️',
      'INVESTIGATE': '🚨',
      'HOLD': '⏸️',
      'SUBMITTED': '📤'
    };
    return icons[status] || '❓';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const filteredInvoices = analysisResults.filter(invoice => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'approved' && (invoice.status === 'AUTO_APPROVE' || invoice.status === 'APPROVED' || invoice.status === 'SUBMITTED')) ||
                         (filter === 'review' && invoice.status === 'REVIEW') ||
                         (filter === 'investigate' && invoice.status === 'INVESTIGATE') ||
                         (filter === 'hold' && invoice.status === 'HOLD');
    
    const matchesSearch = !searchTerm || 
                         invoice.invoiceNum?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.vendorName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: analysisResults.length,
    approved: analysisResults.filter(i => i.status === 'AUTO_APPROVE' || i.status === 'APPROVED' || i.status === 'SUBMITTED').length,
    review: analysisResults.filter(i => i.status === 'REVIEW').length,
    investigate: analysisResults.filter(i => i.status === 'INVESTIGATE').length,
    hold: analysisResults.filter(i => i.status === 'HOLD').length,
    totalAmount: analysisResults.reduce((sum, i) => sum + (i.amount || 0), 0),
    approvedAmount: analysisResults.filter(i => i.status === 'AUTO_APPROVE' || i.status === 'APPROVED' || i.status === 'SUBMITTED').reduce((sum, i) => sum + (i.amount || 0), 0),
    pendingAmount: analysisResults.filter(i => i.status === 'REVIEW' || i.status === 'INVESTIGATE').reduce((sum, i) => sum + (i.amount || 0), 0)
  };

  if (selectedInvoice) {
    return <InvoiceDetailsPage invoice={selectedInvoice} onClose={handleCloseDetails} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">AP Manager Dashboard</h1>
          <p className="text-indigo-100">Deep Research Agent - Invoice Analysis Results</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="text-sm font-medium text-gray-600">Total Invoices</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="mt-1 text-sm text-gray-500">{formatCurrency(stats.totalAmount)}</div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="text-sm font-medium text-gray-600">Approved</div>
            <div className="mt-2 text-3xl font-bold text-green-600">{stats.approved}</div>
            <div className="mt-1 text-sm text-gray-500">{formatCurrency(stats.approvedAmount)}</div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
            <div className="text-sm font-medium text-gray-600">Need Review</div>
            <div className="mt-2 text-3xl font-bold text-yellow-600">{stats.review}</div>
            <div className="mt-1 text-sm text-gray-500">{formatCurrency(stats.pendingAmount)}</div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
            <div className="text-sm font-medium text-gray-600">Investigate</div>
            <div className="mt-2 text-3xl font-bold text-red-600">{stats.investigate}</div>
            <div className="mt-1 text-sm text-gray-500">High Priority</div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-gray-500">
            <div className="text-sm font-medium text-gray-600">On Hold</div>
            <div className="mt-2 text-3xl font-bold text-gray-600">{stats.hold}</div>
            <div className="mt-1 text-sm text-gray-500">Pending Action</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'approved'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Approved ({stats.approved})
              </button>
              <button
                onClick={() => setFilter('review')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'review'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Review ({stats.review})
              </button>
              <button
                onClick={() => setFilter('investigate')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'investigate'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Investigate ({stats.investigate})
              </button>
              <button
                onClick={() => setFilter('hold')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'hold'
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Hold ({stats.hold})
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search invoice or vendor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <svg
                  className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              <button
                onClick={loadAnalysisResults}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <div className="text-gray-600">Loading analysis results...</div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <div className="text-gray-600 text-lg">No invoices found</div>
              <div className="text-gray-500 text-sm mt-2">
                Run Deep Research analysis to see results here
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Age (Days)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Analysis Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleInvoiceClick(invoice)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-indigo-600 hover:text-indigo-900">
                            {invoice.invoiceNum}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{invoice.vendorName || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(invoice.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{invoice.daysOld || 0}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusBadge(
                            invoice.status
                          )}`}
                        >
                          {getStatusIcon(invoice.status)} {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.analysisDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInvoiceClick(invoice);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center space-x-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Footer */}
        {!loading && filteredInvoices.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-center text-sm">
              <div className="text-gray-600">
                Showing {filteredInvoices.length} of {stats.total} invoices
              </div>
              <div className="text-gray-900 font-semibold">
                Total Amount: {formatCurrency(filteredInvoices.reduce((sum, i) => sum + (i.amount || 0), 0))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default APManagerDashboard;
