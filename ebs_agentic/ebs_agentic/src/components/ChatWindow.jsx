import { useState, useEffect, useRef } from 'react'
import sqlcl from '../services/sqlcl'
import { MessageSquare, Send, Sparkles, X, Code, BarChart3, Loader2 } from 'lucide-react'

export default function ChatWindow({ isOpen, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const suggestedQuestions = [
    "What are the top 10 suppliers with outstanding payments?",
    "Show me aging analysis for Industrial Dressler",
    "How many invoices are on hold?",
    "What is the total outstanding amount?",
    "Show me invoices over 1 year old",
    "Which hold types have the most active holds?"
  ]

  const handleSend = async (questionText = null) => {
    const question = questionText || input.trim()
    if (!question || isLoading) return

    // Add user message
    const userMessage = { role: 'user', content: question, timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Execute query via SQLcl with Anthropic API
      const response = await sqlcl.executeNaturalLanguageQuery(question)
      
      // Add AI response
      const aiMessage = {
        role: 'assistant',
        content: response.text || 'Query executed successfully',
        data: response.data,
        sql: response.sql,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      // Add error message
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.message}`,
        error: true,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sparkles className="h-6 w-6 text-white" />
              <div>
                <h2 className="text-xl font-bold text-white">AI Assistant</h2>
                <p className="text-sm text-blue-100">Ask questions about your AP data</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Start a Conversation
              </h3>
              <p className="text-gray-600 mb-8">
                Ask me anything about your Accounts Payable data
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="text-left p-4 rounded-lg bg-white border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start space-x-2">
                      <Sparkles className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{q}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`mb-4 ${msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-4 ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : msg.error
                  ? 'bg-red-50 border border-red-200 text-red-900'
                  : 'bg-white border border-gray-200 shadow-sm'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center space-x-2 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-semibold text-gray-500">AI Assistant</span>
                  </div>
                )}
                
                <div className="whitespace-pre-wrap text-sm">{msg.content}</div>

                {/* Display data table if available */}
                {msg.data && msg.data.length > 0 && (
                  <div className="mt-4">
                    <DataTable data={msg.data} />
                  </div>
                )}

                {/* Display SQL query if available */}
                {msg.sql && (
                  <details className="mt-3">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 flex items-center space-x-1">
                      <Code className="h-3 w-3" />
                      <span>View SQL Query</span>
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto">
                      {msg.sql}
                    </pre>
                  </details>
                )}

                <div className="text-xs opacity-60 mt-2">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <span className="text-sm text-gray-600">Analyzing your question...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-white rounded-b-lg">
          <div className="flex space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your AP data..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 font-medium"
            >
              <Send className="h-5 w-5" />
              <span>Send</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}

// Data Table Component
function DataTable({ data }) {
  if (!data || data.length === 0) return null

  const columns = Object.keys(data[0])
  const numericColumns = columns.filter(col => 
    data.some(row => !isNaN(parseFloat(row[col])))
  )

  return (
    <div className="mt-3 rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto max-h-96">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    numericColumns.includes(col) ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    className={`px-4 py-3 text-sm text-gray-900 ${
                      numericColumns.includes(col) ? 'text-right font-medium' : 'text-left'
                    }`}
                  >
                    {formatValue(row[col], numericColumns.includes(col))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > 10 && (
        <div className="px-4 py-2 bg-gray-50 text-xs text-gray-600 text-center border-t">
          Showing {data.length} rows
        </div>
      )}
    </div>
  )
}

function formatValue(value, isNumeric) {
  if (value === null || value === undefined || value === '') return '-'
  
  if (isNumeric) {
    const num = parseFloat(value)
    if (!isNaN(num)) {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      })
    }
  }
  
  return value
}
