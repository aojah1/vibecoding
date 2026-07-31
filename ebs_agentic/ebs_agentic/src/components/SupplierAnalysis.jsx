import React, { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const SERVER_HOST = import.meta.env.VITE_SERVER_HOST || 'http://localhost:4001';

const normalizeText = (value) => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (typeof v === 'string') return v;
        if (v && typeof v === 'object') return v.text || v.content || '';
        return '';
      })
      .join('')
      .trim();
  }
  if (value && typeof value === 'object') return value.text || value.content || '';
  return '';
};

const normalizeAnalysisPayload = (payload) => {
  const base = payload?.analysis ? payload.analysis : payload;
  return {
    ...base,
    insights: normalizeText(base?.insights)
  };
};

const SupplierAnalysis = ({ supplier, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [executingAction, setExecutingAction] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [showActionResult, setShowActionResult] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Streaming states
  const [thoughtLog, setThoughtLog] = useState([]);
  const [streamingInsights, setStreamingInsights] = useState('');
  const logEndRef = useRef(null);

  // Deep Research Agent states
  const [showDeepResearch, setShowDeepResearch] = useState(false);
  const [researchLogs, setResearchLogs] = useState([]);
  const [researchProgress, setResearchProgress] = useState({ current: 0, total: 0, status: '' });
  const [processedInvoices, setProcessedInvoices] = useState([]);
  const [researchSummary, setResearchSummary] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [researchError, setResearchError] = useState(null);
  const researchLogEndRef = useRef(null);

  useEffect(() => {
    loadAnalysisStreaming();
  }, [supplier]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thoughtLog, streamingInsights]);

  useEffect(() => {
    researchLogEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [researchLogs]);

  const loadAnalysisStreaming = async () => {
    try {
      setLoading(true);
      setThoughtLog([]);
      setStreamingInsights('');
      
      const response = await fetch(`${SERVER_HOST}/api/analyze-supplier-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          vendorName: supplier.name,
          vendorId: supplier.id 
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = '';
      let fullInsights = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          const [eventLine, dataLine] = line.split('\n');
          if (!eventLine.startsWith('event:') || !dataLine.startsWith('data:')) continue;

          const event = eventLine.slice(7).trim();
          const data = JSON.parse(dataLine.slice(6));

          if (event === 'thought') {
            setThoughtLog(prev => [...prev, { type: 'thought', message: data.message, timestamp: new Date() }]);
          } else if (event === 'ai-stream') {
            fullInsights += normalizeText(data.text);
            setStreamingInsights(fullInsights);
            setThoughtLog(prev => {
              const lastLog = prev[prev.length - 1];
              if (lastLog && lastLog.type === 'ai-streaming') {
                return prev.slice(0, -1).concat([{ ...lastLog, text: fullInsights }]);
              } else {
                return [...prev, { type: 'ai-streaming', text: fullInsights, timestamp: new Date() }];
              }
            });
          } else if (event === 'complete') {
            const normalized = normalizeAnalysisPayload(data);
            // Fallback: if backend final payload missed insights text,
            // use what we already accumulated from ai-stream chunks.
            if (!normalized.insights && fullInsights) {
              normalized.insights = fullInsights;
            }
            setAnalysis(normalized);
            setLoading(false);
            setThoughtLog(prev => [...prev, { type: 'success', message: '✅ Analysis complete!', timestamp: new Date() }]);
          } else if (event === 'error') {
            console.error('Stream error:', data.message);
            setLoading(false);
          }
        }
      }

    } catch (error) {
      console.error('Error loading analysis:', error);
      setLoading(false);
      setThoughtLog(prev => [...prev, { type: 'error', message: `❌ Error: ${error.message}`, timestamp: new Date() }]);
    }
  };

  const handleActionClick = (action) => {
    setSelectedAction(action);
    setShowConfirmation(true);
  };

  const handleExecuteAction = async () => {
    setShowConfirmation(false);
    setShowDeepResearch(true);
    setExecutingAction(true);
    setResearchLogs([]);
    setProcessedInvoices([]);
    setResearchProgress({ current: 0, total: 0, status: '' });
    setResearchSummary(null);
    setShowSummary(false);
    setResearchError(null);

    // Route to the appropriate endpoint based on action type
    const endpoint = selectedAction?.type === 'negotiate'
      ? `${SERVER_HOST}/api/negotiate-payment-terms`
      : `${SERVER_HOST}/api/deep-research-action`;

    try {
      console.log('Starting deep research for:', supplier.name, '| Endpoint:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName: supplier.name,
          vendorId: supplier.id,
          action: selectedAction
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Stream complete');
          break;
        }

        try {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const [eventLine, dataLine] = line.split('\n');
              if (!eventLine || !dataLine) continue;
              if (!eventLine.startsWith('event:') || !dataLine.startsWith('data:')) continue;

              const event = eventLine.slice(7).trim();
              const dataStr = dataLine.slice(6);
              
              let data;
              try {
                data = JSON.parse(dataStr);
              } catch (parseError) {
                console.error('JSON parse error:', parseError, 'Data:', dataStr);
                continue;
              }

              if (event === 'log') {
                setResearchLogs(prev => [...prev, {
                  timestamp: data.timestamp || new Date().toLocaleTimeString(),
                  message: data.message || '',
                  type: data.type || 'info'
                }]);
              } else if (event === 'progress') {
                setResearchProgress({
                  current: data.current || 0,
                  total: data.total || 0,
                  status: data.status || ''
                });
              } else if (event === 'invoice') {
                setProcessedInvoices(prev => [...prev, {
                  invoiceNum: data.invoiceNum || 'Unknown',
                  outstanding: data.amount || 0,
                  daysOld: data.daysOld || 0,
                  status: data.status || 'UNKNOWN',
                  color: data.statusColor || 'gray'
                }]);
              } else if (event === 'complete') {
                console.log('Complete event received:', data);
                if (data.success && data.summary) {
                  setResearchSummary(data.summary);
                } else if (!data.success) {
                  setResearchError(data.error || 'Unknown error');
                }
                setExecutingAction(false);
              } else if (event === 'error') {
                console.error('Stream error event:', data);
                setResearchError(data.message || 'Unknown error');
                setExecutingAction(false);
              }
            } catch (lineError) {
              console.error('Error processing line:', lineError, 'Line:', line);
            }
          }
        } catch (bufferError) {
          console.error('Error processing buffer:', bufferError);
        }
      }

    } catch (error) {
      console.error('Error executing deep research:', error);
      setExecutingAction(false);
      setResearchError(error.message);
      setResearchLogs(prev => [...prev, { 
        message: `❌ Error: ${error.message}`, 
        type: 'error',
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  };

  const formatCurrency = (amount) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount || 0);
    } catch (error) {
      return `$${(amount || 0).toLocaleString()}`;
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      high: 'bg-red-100 text-red-800 border-red-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[severity] || colors.medium;
  };

  const getLogTypeStyle = (type) => {
    const styles = {
      system: 'text-purple-400 font-bold',
      info: 'text-blue-300',
      success: 'text-green-400',
      warning: 'text-yellow-400',
      error: 'text-red-400',
      check: 'text-cyan-300',
      invoice: 'text-cyan-300 font-semibold',
      separator: 'text-gray-600',
      blank: ''
    };
    return styles[type] || 'text-gray-300';
  };

  const getActionIcon = (actionType) => {
    const icons = {
      payment: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      dispute: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      hold: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      negotiate: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      schedule: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    };
    return icons[actionType] || icons.payment;
  };

  // Show chain of thought while loading initial analysis
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-white">{supplier.name}</h2>
                <p className="text-blue-100 mt-1">AI Analysis in Progress...</p>
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

          <div className="flex-1 overflow-y-auto bg-gray-900 p-6">
            <div className="space-y-2 font-mono text-sm">
              {thoughtLog.map((log, index) => (
                <div 
                  key={index}
                  className={`${
                    log.type === 'thought' ? 'text-blue-300' :
                    log.type === 'ai-streaming' ? 'text-green-300' :
                    log.type === 'success' ? 'text-green-400 font-bold' :
                    log.type === 'error' ? 'text-red-400' :
                    'text-gray-300'
                  }`}
                >
                  {log.type === 'ai-streaming' ? (
                    <div className="bg-gray-800 p-4 rounded-lg mt-2 mb-2 border-l-4 border-green-500">
                      <div className="text-green-400 font-bold mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Claude's Analysis:
                      </div>
                      <div className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {log.text}
                        <span className="inline-block w-2 h-4 bg-green-400 ml-1 animate-pulse"></span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start">
                      <span className="text-gray-500 mr-2">[{log.timestamp?.toLocaleTimeString()}]</span>
                      <span>{log.message}</span>
                    </div>
                  )}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show Deep Research Agent
  if (showDeepResearch) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className={`bg-gradient-to-r ${selectedAction?.type === 'negotiate' ? 'from-teal-600 to-cyan-600' : 'from-purple-600 to-indigo-600'} p-6`}>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {selectedAction?.type === 'negotiate' ? '🤝 Negotiate Payment Terms Agent' : '🔬 Negotiate - Deep Research Agent with Action'}
                </h2>
                <p className={`${selectedAction?.type === 'negotiate' ? 'text-teal-100' : 'text-purple-100'} mt-1`}>
                  {supplier.name} - {selectedAction?.type === 'negotiate' ? 'Payment Terms Negotiation' : 'Unpaid Invoice Analysis'}
                </p>
              </div>
              {!executingAction && (
                <button
                  onClick={() => {
                    setShowDeepResearch(false);
                    if (researchSummary) {
                      setActionResult(researchSummary);
                      setShowActionResult(false);
                    }
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Progress Bar */}
            {researchProgress.total > 0 && (
              <div className="mt-4">
                <div className={`flex justify-between text-sm ${selectedAction?.type === 'negotiate' ? 'text-teal-100' : 'text-purple-100'} mb-2`}>
                  <span>{researchProgress.status || 'Processing...'}</span>
                  <span>{researchProgress.current} / {researchProgress.total}</span>
                </div>
                <div className={`w-full ${selectedAction?.type === 'negotiate' ? 'bg-teal-900' : 'bg-purple-900'} rounded-full h-2`}>
                  <div
                    className="bg-white h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (researchProgress.current / researchProgress.total) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Display */}
            {researchError && (
              <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong>Error:</strong> {researchError}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden flex">
            {/* Left: Live Logs */}
            <div className="flex-1 bg-gray-900 p-6 overflow-y-auto">
              <div className="space-y-1 font-mono text-sm">
                {researchLogs.length === 0 && executingAction && (
                  <div className="text-gray-500 text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <div>Initializing deep research...</div>
                  </div>
                )}
                
                {researchLogs.map((log, index) => (
                  <div 
                    key={index}
                    className={getLogTypeStyle(log.type)}
                  >
                    <div className="flex items-start">
                      <span className="text-gray-600 mr-2 text-xs">
                        [{log.timestamp}]
                      </span>
                      <span className="flex-1">{log.message}</span>
                    </div>
                  </div>
                ))}
                
                {executingAction && researchLogs.length > 0 && (
                  <div className="flex items-center text-green-400 animate-pulse mt-2">
                    <span className="inline-block w-2 h-4 bg-green-400 mr-2"></span>
                    Processing...
                  </div>
                )}
                
                <div ref={researchLogEndRef} />
              </div>
            </div>

            {/* Right: Invoice Status */}
            <div className="w-96 bg-gray-100 p-6 overflow-y-auto border-l-2 border-gray-300">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Status</h3>
              
              {processedInvoices.length === 0 && !researchError && (
                <div className="text-center text-gray-500 mt-8">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="text-sm">
                    {executingAction ? 'Waiting for invoices...' : 'No invoices processed'}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {processedInvoices.map((invoice, index) => {
                  const bgColor = invoice.color === 'green' ? 'bg-green-50 border-green-300' :
                                 invoice.color === 'yellow' ? 'bg-yellow-50 border-yellow-300' :
                                 invoice.color === 'red' ? 'bg-red-50 border-red-300' :
                                 'bg-gray-50 border-gray-300';
                  
                  const statusColor = invoice.color === 'green' ? 'bg-green-200 text-green-800' :
                                     invoice.color === 'yellow' ? 'bg-yellow-200 text-yellow-800' :
                                     invoice.color === 'red' ? 'bg-red-200 text-red-800' :
                                     'bg-gray-200 text-gray-800';

                  return (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg border-2 ${bgColor}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900 text-sm">
                          #{invoice.invoiceNum}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                          {invoice.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        <div>Amount: {formatCurrency(invoice.outstanding)}</div>
                        <div>Age: {invoice.daysOld} days</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* View Summary Button */}
              {researchSummary && !showSummary && (
                <div className="mt-6 pt-4 border-t-2 border-gray-300 text-center">
                  <button
                    onClick={() => setShowSummary(true)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105"
                  >
                    📊 View Research Summary
                  </button>
                </div>
              )}

              {/* Summary Stats */}
              {researchSummary && showSummary && (
                <div className="mt-6 pt-4 border-t-2 border-gray-300">
                  <h4 className="font-semibold text-gray-900 mb-3">Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Analyzed:</span>
                      <span className="font-semibold">{researchSummary.totalAnalyzed || 0}</span>
                    </div>
                    <div className="flex justify-between text-green-700">
                      <span>✓ Approved:</span>
                      <span className="font-semibold">{researchSummary.autoApproved || 0}</span>
                    </div>
                    <div className="flex justify-between text-yellow-700">
                      <span>⚠ Review:</span>
                      <span className="font-semibold">{researchSummary.needReview || 0}</span>
                    </div>
                    <div className="flex justify-between text-red-700">
                      <span>🚨 Investigate:</span>
                      <span className="font-semibold">{researchSummary.needInvestigation || 0}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-300">
                      <div className="flex justify-between text-green-700">
                        <span>Approved $:</span>
                        <span className="font-semibold">
                          {formatCurrency(researchSummary.autoApprovedAmount || 0)}
                        </span>
                      </div>
                      {researchSummary.batchId && (
                        <div className="text-xs text-gray-600 mt-1">
                          Batch: {researchSummary.batchId}
                        </div>
                      )}
                    </div>
                    {researchSummary.negotiatedTerms && (
                      <div className="pt-2 border-t border-gray-300">
                        <div className="flex justify-between text-teal-700">
                          <span>Terms:</span>
                          <span className="font-semibold text-xs">
                            {researchSummary.negotiatedTerms}
                          </span>
                        </div>
                        {researchSummary.relationshipHealth && (
                          <div className="flex justify-between mt-1">
                            <span className="text-gray-600">Health:</span>
                            <span className={`font-semibold text-xs ${
                              researchSummary.relationshipHealth === 'GOOD' ? 'text-green-700' :
                              researchSummary.relationshipHealth === 'FAIR' ? 'text-yellow-700' :
                              'text-red-700'
                            }`}>
                              {researchSummary.relationshipHealth}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    {researchSummary.agreementDetails && (
                      <div className="pt-2 border-t border-gray-300">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Agreement:</span>
                          <span className="font-semibold text-xs text-indigo-700">
                            {researchSummary.agreementDetails.agreementId}
                          </span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-gray-600">Status:</span>
                          <span className="font-semibold text-xs text-amber-600">
                            {researchSummary.agreementDetails.status === 'PENDING_SIGNATURES' ? '⏳ Pending Signatures' : researchSummary.agreementDetails.status}
                          </span>
                        </div>
                      </div>
                    )}
                    {researchSummary.communicationPlan && (
                      <div className="pt-2 border-t border-gray-300">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Channel:</span>
                          <span className="font-semibold text-xs text-blue-700">
                            {researchSummary.communicationPlan.channel === 'PHONE' ? '📞 Phone' : '✉️ Email'}
                          </span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-gray-600">Next:</span>
                          <span className="font-semibold text-xs text-gray-700">
                            {researchSummary.communicationPlan.nextAction}
                          </span>
                        </div>
                      </div>
                    )}
                    {researchSummary.categories && (
                      <div className="pt-2 border-t border-gray-300">
                        <div className="text-xs text-gray-600 mb-1">Categories:</div>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          {researchSummary.categories.urgentCritical > 0 && (
                            <span className="text-red-700">🔴 Urgent: {researchSummary.categories.urgentCritical}</span>
                          )}
                          {researchSummary.categories.strategicPartners > 0 && (
                            <span className="text-green-700">🟢 Strategic: {researchSummary.categories.strategicPartners}</span>
                          )}
                          {researchSummary.categories.standardVendors > 0 && (
                            <span className="text-yellow-700">🟡 Standard: {researchSummary.categories.standardVendors}</span>
                          )}
                          {researchSummary.categories.negotiable > 0 && (
                            <span className="text-blue-700">🔵 Negotiable: {researchSummary.categories.negotiable}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  // Rest of the component for showing final analysis results...
  // (Keeping existing code for displaying analysis, charts, actions, etc.)
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-7xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white">{supplier.name}</h2>
              <p className="text-blue-100 mt-1">AI-Powered Supplier Analysis (UNPAID Invoices Only)</p>
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

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
              <div className="text-sm font-medium text-red-600">Total Outstanding</div>
              <div className="mt-2 text-2xl font-bold text-red-700">
                {formatCurrency(analysis.summary?.totalOutstanding)}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-600">UNPAID Invoices</div>
              <div className="mt-2 text-2xl font-bold text-blue-700">
                {analysis.summary?.invoiceCount || 0}
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
              <div className="text-sm font-medium text-orange-600">Avg Days Old</div>
              <div className="mt-2 text-2xl font-bold text-orange-700">
                {Math.round(analysis.summary?.avgDaysOld || 0)}
              </div>
            </div>
            <div className={`bg-gradient-to-br rounded-lg p-4 border ${
              analysis.summary?.riskLevel === 'high' 
                ? 'from-red-50 to-red-100 border-red-200'
                : analysis.summary?.riskLevel === 'medium'
                ? 'from-yellow-50 to-yellow-100 border-yellow-200'
                : 'from-green-50 to-green-100 border-green-200'
            }`}>
              <div className="text-sm font-medium text-gray-700">Risk Level</div>
              <div className={`mt-2 text-2xl font-bold uppercase ${
                analysis.summary?.riskLevel === 'high' ? 'text-red-700' :
                analysis.summary?.riskLevel === 'medium' ? 'text-yellow-700' :
                'text-green-700'
              }`}>
                {analysis.summary?.riskLevel || 'N/A'}
              </div>
            </div>
          </div>

          {/* AI Insights */}
          {analysis.insights && (
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mb-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-purple-100 rounded-lg p-2">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Insights (UNPAID Invoices Only)</h3>
                  <p className="text-gray-700 whitespace-pre-line">{analysis.insights}</p>
                </div>
              </div>
            </div>
          )}

          {/* Charts */}
          {analysis.charts && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {analysis.charts.agingDistribution && analysis.charts.agingDistribution.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Aging Distribution</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={analysis.charts.agingDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {analysis.charts.agingDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {analysis.charts.invoiceBreakdown && analysis.charts.invoiceBreakdown.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Amount Distribution</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analysis.charts.invoiceBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip formatter={(value) => value.toLocaleString()} />
                      <Bar dataKey="count" fill="#3b82f6" name="Invoices" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Recommended Actions */}
          {analysis.recommendedActions && analysis.recommendedActions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recommended Actions</h3>
                <span className="text-sm text-gray-500">Deep research with human review</span>
              </div>
              
              <div className="space-y-4">
                {analysis.recommendedActions.map((action, index) => (
                  <div 
                    key={index}
                    className={`border-2 rounded-lg p-4 ${getSeverityColor(action.priority)} transition-all hover:shadow-md`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {getActionIcon(action.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{action.title}</h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${
                            action.priority === 'high' ? 'bg-red-200 text-red-800' :
                            action.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                            'bg-green-200 text-green-800'
                          }`}>
                            {action.priority} Priority
                          </span>
                        </div>
                        <p className="text-gray-700 mb-3">{action.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Estimated Impact:</span> {action.impact}
                          </div>
                          <button
                            onClick={() => handleActionClick(action)}
                            disabled={executingAction}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            <span>{action.type === 'negotiate' ? 'Negotiate Payment Terms' : 'Deep Research & Execute'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Result - View Summary Button */}
          {actionResult && !showDeepResearch && !showActionResult && (
            <div className="mb-6 text-center">
              <button
                onClick={() => setShowActionResult(true)}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:from-green-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
              >
                📊 View Research Summary
              </button>
            </div>
          )}

          {/* Action Result Summary */}
          {actionResult && !showDeepResearch && showActionResult && (
            <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-6 mb-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 bg-green-100 rounded-full p-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-green-900 mb-3">Deep Research Complete</h4>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="text-sm text-gray-600">Total Analyzed</div>
                      <div className="text-2xl font-bold text-gray-900">{actionResult.totalAnalyzed || 0}</div>
                    </div>
                    <div className="bg-green-100 rounded-lg p-3 border border-green-300">
                      <div className="text-sm text-green-700">Auto-Approved</div>
                      <div className="text-2xl font-bold text-green-800">{actionResult.autoApproved || 0}</div>
                      <div className="text-xs text-green-600">{formatCurrency(actionResult.autoApprovedAmount)}</div>
                    </div>
                    <div className="bg-yellow-100 rounded-lg p-3 border border-yellow-300">
                      <div className="text-sm text-yellow-700">Needs Review</div>
                      <div className="text-2xl font-bold text-yellow-800">{actionResult.needReview || 0}</div>
                      <div className="text-xs text-yellow-600">{formatCurrency(actionResult.needReviewAmount)}</div>
                    </div>
                    <div className="bg-red-100 rounded-lg p-3 border border-red-300">
                      <div className="text-sm text-red-700">Needs Investigation</div>
                      <div className="text-2xl font-bold text-red-800">{actionResult.needInvestigation || 0}</div>
                      <div className="text-xs text-red-600">{formatCurrency(actionResult.needInvestigationAmount)}</div>
                    </div>
                  </div>

                  {actionResult.autoApproved > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-green-200 mb-3">
                      <h5 className="font-semibold text-green-900 mb-2">✅ Approved Invoices Submitted to EBS</h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• {actionResult.autoApproved} invoices submitted via OIC Gateway</li>
                        <li>• Total amount: {formatCurrency(actionResult.autoApprovedAmount)}</li>
                        {actionResult.batchId && <li>• Batch ID: {actionResult.batchId}</li>}
                      </ul>
                    </div>
                  )}

                  {actionResult.needInvestigation > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-red-200">
                      <h5 className="font-semibold text-red-900 mb-2">⚠️ Invoices Flagged for Investigation</h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• {actionResult.needInvestigation} invoices require manual review</li>
                        <li>• Total amount: {formatCurrency(actionResult.needInvestigationAmount)}</li>
                        {actionResult.reportId && <li>• Report: {actionResult.reportId}</li>}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simple Confirmation Dialog */}
      {showConfirmation && selectedAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedAction.type === 'negotiate' ? 'Initiate Payment Negotiation?' : 'Initiate Deep Research?'}
            </h3>
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                {selectedAction.type === 'negotiate'
                  ? 'This will start a multi-phase negotiation process for aged invoices:'
                  : 'This will start a deep research analysis of UNPAID invoices using:'}
              </p>
              <div className={`border-2 rounded-lg p-4 ${getSeverityColor(selectedAction.priority)}`}>
                <h4 className="font-semibold text-gray-900 mb-2">{selectedAction.title}</h4>
                <p className="text-gray-700 text-sm mb-3">{selectedAction.description}</p>
              </div>

              {selectedAction.type === 'negotiate' ? (
                <div className="mt-4 bg-teal-50 border border-teal-200 rounded-lg p-3">
                  <p className="text-sm text-teal-800">
                    <strong>Negotiate Payment Terms Agent will:</strong>
                  </p>
                  <ul className="text-sm text-teal-700 mt-2 space-y-1">
                    <li>• <strong>Phase 1:</strong> Internal Assessment — Cash flow analysis, situation evaluation, invoice categorization</li>
                    <li>• <strong>Phase 2:</strong> Preparation — Gather leverage points, develop negotiation strategy</li>
                    <li>• <strong>Phase 3:</strong> Supplier Outreach — Phone script + comprehensive email with full analysis</li>
                  </ul>
                </div>
              ) : (
                <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-sm text-purple-800">
                    <strong>Deep Research Agent will:</strong>
                  </p>
                  <ul className="text-sm text-purple-700 mt-2 space-y-1">
                    <li>• Query AIDP and multiple data sources</li>
                    <li>• Analyze each UNPAID invoice individually</li>
                    <li>• Flag issues for investigation (red)</li>
                    <li>• Auto-approve clean invoices (green)</li>
                    <li>• Submit approved invoices to EBS via OIC</li>
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                className={`px-4 py-2 bg-gradient-to-r ${
                  selectedAction.type === 'negotiate'
                    ? 'from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700'
                    : 'from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                } text-white rounded-lg transition-colors`}
              >
                {selectedAction.type === 'negotiate' ? 'Start Negotiation Process' : 'Start Deep Research'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierAnalysis;
