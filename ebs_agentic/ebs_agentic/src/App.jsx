import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import SuppliersView from './components/SuppliersView'
import InvoiceDetails from './components/InvoiceDetails'
import AgingAnalysis from './components/AgingAnalysis'
import HoldsView from './components/HoldsView'
import ChatWindow from './components/ChatWindow'
import APManagerDashboard from './components/APManagerDashboard';
import AutoPaidSupplierDetail from './components/AutoPaidSupplierDetail';
import { Home, Users, FileText, Clock, AlertCircle, MessageSquare, Settings, Key, Database } from 'lucide-react'
import sqlcl from './services/sqlcl'

function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [selectedAutoPaidSupplier, setSelectedAutoPaidSupplier] = useState(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  
  // Configuration state
  const [apiKey, setApiKey] = useState('')
  const [tempApiKey, setTempApiKey] = useState('')
  const [showSetup, setShowSetup] = useState(false)

  // Load saved config on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('anthropic_api_key')

    if (savedApiKey) {
      setApiKey(savedApiKey)
      setTempApiKey(savedApiKey)
      sqlcl.setApiKey(savedApiKey)
    } else {
      // Show setup on first load if API key not configured
      setShowSetup(true)
    }
  }, [])

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'suppliers', label: 'Suppliers', icon: Users },
    { id: 'holds', label: 'Invoice Holds', icon: AlertCircle },
    { id: 'aging', label: 'Aging Analysis', icon: Clock },
  ]

  const handleSaveConfig = async () => {
    const trimmedKey = tempApiKey.trim()

    try {
      // Save API key
      if (trimmedKey) {
        setApiKey(trimmedKey)
        localStorage.setItem('anthropic_api_key', trimmedKey)
        await sqlcl.setApiKey(trimmedKey)
      }

      setSettingsOpen(false)
      setShowSetup(false)
      alert('Configuration saved successfully!')
    } catch (error) {
      alert(`Error saving configuration: ${error.message}`)
    }
  }

  const handleClearConfig = () => {
    if (confirm('Clear API key configuration?')) {
      setApiKey('')
      setTempApiKey('')
      localStorage.removeItem('anthropic_api_key')
      alert('Configuration cleared')
    }
  }

  const isDashboardVisible = activeView === 'dashboard' && !selectedInvoice && !selectedAutoPaidSupplier;

  const renderView = () => {
    return (
      <>
        {/* Dashboard is always mounted — hidden via CSS when not active so it never remounts/refetches */}
        <div style={{ display: isDashboardVisible ? 'block' : 'none' }}>
          <Dashboard onSelectSupplier={setSelectedSupplier} onSelectInvoice={setSelectedInvoice} onSelectAutoPaidSupplier={setSelectedAutoPaidSupplier} />
        </div>

        {/* Sub-detail views */}
        {selectedInvoice && (
          <InvoiceDetails
            invoice={selectedInvoice}
            onBack={() => setSelectedInvoice(null)}
          />
        )}
        {selectedAutoPaidSupplier && !selectedInvoice && (
          <AutoPaidSupplierDetail
            supplier={selectedAutoPaidSupplier}
            onBack={() => setSelectedAutoPaidSupplier(null)}
            onSelectInvoice={setSelectedInvoice}
          />
        )}

        {/* Other sidebar views — only when no detail view is open */}
        {!selectedInvoice && !selectedAutoPaidSupplier && activeView === 'suppliers' && (
          <SuppliersView
            selectedSupplier={selectedSupplier}
            onSelectSupplier={setSelectedSupplier}
            onSelectInvoice={setSelectedInvoice}
          />
        )}
        {!selectedInvoice && !selectedAutoPaidSupplier && activeView === 'holds' && (
          <HoldsView />
        )}
        {!selectedInvoice && !selectedAutoPaidSupplier && activeView === 'aging' && (
          <AgingAnalysis
            supplier={selectedSupplier}
            onSelectSupplier={setSelectedSupplier}
          />
        )}
      </>
    )
  }

  const isConfigured = !!apiKey

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  EBS AP Analytics Dashboard
                </h1>
                <p className="text-sm text-gray-500">
                  Accounts Payable Analysis - As of October 10, 2010
                  {isConfigured && <span className="ml-2 text-green-600">• AI Powered ✨</span>}
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  const width = 800
                  const height = 600
                  const left = (window.screen.width / 2) - (width / 2)
                  const top = (window.screen.height / 2) - (height / 2)
                  window.open(
                    'http://170.9.246.199:8503/',
                    'AI Assistant',
                    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`
                  )
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                <MessageSquare className="h-5 w-5" />
                <span className="hidden sm:inline">AI Assistant</span>
              </button>

              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm min-h-screen border-r border-gray-200">
          <nav className="mt-5 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id)
                    if (item.id !== 'suppliers') {
                      setSelectedSupplier(null)
                    }
                  }}
                  className={`
                    w-full flex items-center px-4 py-3 mb-2 rounded-lg text-sm font-medium transition-colors
                    ${activeView === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </button>
              )
            })}
          </nav>

          {selectedSupplier && (
            <div className="mt-6 px-4 py-3 bg-blue-50 mx-2 rounded-lg">
              <p className="text-xs font-semibold text-gray-600 mb-1">
                Selected Supplier
              </p>
              <p className="text-sm font-medium text-blue-900 truncate">
                {selectedSupplier}
              </p>
              <button
                onClick={() => setSelectedSupplier(null)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800"
              >
                Clear selection
              </button>
            </div>
          )}

          {/* Status Indicators */}
          <div className="mt-6 mx-2 space-y-3">
            {/* API Status */}
            <div className="px-4 py-3 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <Key className="h-4 w-4 text-purple-600" />
                <p className="text-xs font-semibold text-gray-700">API Key</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${apiKey ? 'bg-green-500' : 'bg-red-500'}`} />
                <p className="text-xs text-gray-600">
                  {apiKey ? 'Configured' : 'Not set'}
                </p>
              </div>
            </div>

            {/* Database Status */}
            <div className="px-4 py-3 rounded-lg bg-gradient-to-br from-green-50 to-teal-50 border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <Database className="h-4 w-4 text-green-600" />
                <p className="text-xs font-semibold text-gray-700">Database</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <p className="text-xs text-gray-600">
                  Pre-configured on server
                </p>
              </div>
            </div>

            {!isConfigured && (
              <button
                onClick={() => setSettingsOpen(true)}
                className="w-full px-3 py-2 text-xs bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors font-medium"
              >
                ⚠️ Configure API Key
              </button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {renderView()}
          </div>
        </main>
      </div>

      {/* Chat Window */}
      <ChatWindow isOpen={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Settings Modal */}
      {(settingsOpen || showSetup) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl my-8">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-lg">
              <h2 className="text-xl font-bold text-white">
                {isConfigured ? 'Settings' : 'Setup Required'}
              </h2>
              <p className="text-sm text-blue-100 mt-1">
                Configure API key and database connection
              </p>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Anthropic API Key Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anthropic API Key *
                </label>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get your API key from <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.anthropic.com</a>
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-semibold mb-2">📌 Note:</p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Backend server must be running (port 4001)</li>
                  <li>Database connection is pre-configured on the server</li>
                </ul>
              </div>

              {isConfigured && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-900 flex items-center">
                    <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                    API Key configured
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-between bg-gray-50 rounded-b-lg">
              <div>
                {isConfigured && (
                  <button
                    onClick={handleClearConfig}
                    className="px-4 py-2 text-red-600 hover:text-red-800 font-medium transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="flex space-x-3">
                {isConfigured && (
                  <button
                    onClick={() => {
                      setSettingsOpen(false)
                      setShowSetup(false)
                    }}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleSaveConfig}
                  disabled={!tempApiKey.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
