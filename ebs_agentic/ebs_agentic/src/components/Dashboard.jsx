import React, { useState, useEffect, useRef } from 'react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import ReplayAgenticAction from './ReplayAgenticAction';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const SERVER_HOST = import.meta.env.VITE_SERVER_HOST || 'http://localhost:4001';
const ANALYSIS_DATE = import.meta.env.VITE_ANALYSIS_DATE || '10-OCT-2010';

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

const Dashboard = ({ onSelectInvoice, onSelectAutoPaidSupplier }) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [stats, setStats] = useState({
    totalSuppliers: 0,
    totalOutstanding: 0,
    totalInvoices: 0,
    avgDaysOutstanding: 0
  });
  const [topSuppliers, setTopSuppliers] = useState([]);
  const [autoPaidInvoices, setAutoPaidInvoices] = useState([]);
  const [showReplay, setShowReplay] = useState(false);

  // ─── Batch Deep Research state ───
  const [showBatchProgress, setShowBatchProgress] = useState(false);
  const [batchStatus, setBatchStatus] = useState([]);          // per-supplier { status, result }
  const [batchCurrentIndex, setBatchCurrentIndex] = useState(-1);
  const batchRunningRef = useRef(false);

  // ─── Collapsible panels ───
  const [expandedSupplier, setExpandedSupplier] = useState(null);
  const supplierPanelRefs = useRef([]);

  // ─── Deep Research & Execute flow (runs from an action inside a panel) ───
  const [deepResearchState, setDeepResearchState] = useState(null);
  // shape: { supplierIndex, action, phase:'confirm'|'running'|'done', logs:[], progress:{}, invoices:[], summary:null, error:null }

  useEffect(() => { loadDashboardData(); }, []);

  // Auto-close progress modal when batch finishes
  useEffect(() => {
    if (batchStatus.length > 0 && batchStatus.every(s => s.status === 'complete' || s.status === 'error')) {
      setShowBatchProgress(false);
    }
  }, [batchStatus]);

  // ─── Queries ───
  const executeQuery = async (sql) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const res = await fetch(`${SERVER_HOST}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
        signal: controller.signal
      });
      return await res.json();
    } catch (e) {
      if (e.name === 'AbortError') {
        console.error('Query timed out (45 s)');
        return { success: false, error: 'Request timed out — backend may be unreachable.' };
      }
      console.error('Query error:', e);
      return { success: false, error: e.message };
    } finally {
      clearTimeout(timeout);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setLoadError(null);

      // Fire all three queries in parallel so a single hanging backend
      // doesn't serialise the timeouts (max 15 s total, not 45 s).
      const [statsResult, suppResult, apResult] = await Promise.all([
        executeQuery(`
          SELECT
            COUNT(DISTINCT pv.vendor_id) as total_suppliers,
            SUM(ai.invoice_amount - NVL(ai.amount_paid, 0)) as total_outstanding,
            COUNT(ai.invoice_id) as total_invoices,
            AVG(TRUNC(TO_DATE('${ANALYSIS_DATE}','DD-MON-YYYY') - ai.invoice_date)) as avg_days
          FROM ap.ap_invoices_all ai
          JOIN ap.ap_suppliers pv ON ai.vendor_id = pv.vendor_id
          WHERE ai.payment_status_flag != 'Y' AND ai.cancelled_date IS NULL
        `),
        executeQuery(`
          SELECT pv.vendor_name, pv.vendor_id,
            COUNT(ai.invoice_id) as invoice_count,
            SUM(ai.invoice_amount - NVL(ai.amount_paid,0)) as outstanding_amount,
            AVG(TRUNC(TO_DATE('${ANALYSIS_DATE}','DD-MON-YYYY') - ai.invoice_date)) as avg_days_old
          FROM ap.ap_invoices_all ai
          JOIN ap.ap_suppliers pv ON ai.vendor_id = pv.vendor_id
          WHERE ai.payment_status_flag != 'Y' AND ai.cancelled_date IS NULL
          GROUP BY pv.vendor_name, pv.vendor_id
          ORDER BY SUM(ai.invoice_amount - NVL(ai.amount_paid,0)) DESC
          FETCH FIRST 5 ROWS ONLY
        `),
        executeQuery(`
          SELECT pv.vendor_name, pv.vendor_id,
            COUNT(ai.invoice_id) as invoice_count,
            SUM(ai.invoice_amount - NVL(ai.amount_paid,0)) as outstanding_amount,
            AVG(TRUNC(TO_DATE('${ANALYSIS_DATE}','DD-MON-YYYY') - ai.invoice_date)) as avg_days_old
          FROM ap.ap_invoices_all ai
          JOIN ap.ap_suppliers pv ON ai.vendor_id = pv.vendor_id
          WHERE ai.payment_status_flag != 'Y' AND ai.cancelled_date IS NULL
            AND (ai.invoice_amount - NVL(ai.amount_paid,0)) > 0
          GROUP BY pv.vendor_name, pv.vendor_id
          ORDER BY SUM(ai.invoice_amount - NVL(ai.amount_paid,0)) ASC
          FETCH FIRST 5 ROWS ONLY
        `)
      ]);

      if (statsResult.success && statsResult.data.length > 0) {
        const d = statsResult.data[0];
        setStats({
          totalSuppliers:     parseInt(d.TOTAL_SUPPLIERS || d.total_suppliers || 0),
          totalOutstanding:   parseFloat(d.TOTAL_OUTSTANDING || d.total_outstanding || 0),
          totalInvoices:      parseInt(d.TOTAL_INVOICES || d.total_invoices || 0),
          avgDaysOutstanding: parseFloat(d.AVG_DAYS || d.avg_days || 0)
        });
      }

      if (suppResult.success) {
        setTopSuppliers(suppResult.data.map(s => ({
          name: s.VENDOR_NAME || s.vendor_name,
          id:   s.VENDOR_ID   || s.vendor_id,
          invoiceCount: parseInt(s.INVOICE_COUNT || s.invoice_count || 0),
          outstanding:  parseFloat(s.OUTSTANDING_AMOUNT || s.outstanding_amount || 0),
          avgDaysOld:   parseFloat(s.AVG_DAYS_OLD || s.avg_days_old || 0)
        })));
      }

      if (apResult.success) {
        setAutoPaidInvoices(apResult.data.map(r => ({
          vendorName:   r.VENDOR_NAME   || r.vendor_name,
          vendorId:     r.VENDOR_ID     || r.vendor_id,
          invoiceCount: parseInt(r.INVOICE_COUNT || r.invoice_count || 0),
          outstanding:  parseFloat(r.OUTSTANDING_AMOUNT || r.outstanding_amount || 0),
          avgDaysOld:   parseFloat(r.AVG_DAYS_OLD || r.avg_days_old || 0)
        })));
      }

      // If every query failed, surface the first error so the user sees what went wrong
      if (!statsResult.success && !suppResult.success && !apResult.success) {
        throw new Error(statsResult.error || suppResult.error || apResult.error || 'All queries failed');
      }
    } catch (e) {
      console.error('Error loading dashboard:', e);
      setLoadError(e.message || 'Unknown error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // ─── Stream one supplier's analysis ───
  const analyseOneSupplier = async (supplier) => {
    const res = await fetch(`${SERVER_HOST}/api/analyze-supplier-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorName: supplier.name, vendorId: supplier.id })
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        const [eventLine, dataLine] = line.split('\n');
        if (!eventLine?.startsWith('event:') || !dataLine?.startsWith('data:')) continue;
        const event = eventLine.slice(7).trim();
        const data  = JSON.parse(dataLine.slice(6));
        if (event === 'complete') return data;
        if (event === 'error')    throw new Error(data.message || 'Stream error');
      }
    }
    throw new Error('Stream ended without complete event');
  };

  // ─── Batch: sequential analysis of all top-5 ───
  const runBatchResearch = async () => {
    if (batchRunningRef.current) return;
    batchRunningRef.current = true;
    setExpandedSupplier(null);
    setBatchStatus(topSuppliers.map(() => ({ status: 'pending', result: null })));
    setBatchCurrentIndex(0);

    for (let i = 0; i < topSuppliers.length; i++) {
      setBatchCurrentIndex(i);
      setBatchStatus(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'analyzing' } : s));
      try {
        const result = await analyseOneSupplier(topSuppliers[i]);
        setBatchStatus(prev => prev.map((s, idx) => idx === i ? { status: 'complete', result } : s));
      } catch (err) {
        console.error(`Batch failed for ${topSuppliers[i].name}:`, err);
        setBatchStatus(prev => prev.map((s, idx) => idx === i ? { status: 'error', result: null } : s));
      }
    }
    setBatchCurrentIndex(-1);
    batchRunningRef.current = false;
  };

  // ─── Deep Research & Execute (from a panel action) ───
  const startDeepResearch = (supplierIndex, action) => {
    setDeepResearchState({
      supplierIndex, action, phase: 'confirm',
      logs: [], progress: { current: 0, total: 0, status: '' },
      invoices: [], summary: null, error: null
    });
  };

  const executeDeepResearch = async () => {
    const { supplierIndex, action } = deepResearchState;
    const supplier = topSuppliers[supplierIndex];

    setDeepResearchState(prev => ({
      ...prev, phase: 'running',
      logs: [], invoices: [], summary: null, error: null, showSummary: false,
      progress: { current: 0, total: 0, status: '' }
    }));

    try {
      const endpoint = action?.type === 'negotiate'
        ? `${SERVER_HOST}/api/negotiate-payment-terms`
        : `${SERVER_HOST}/api/deep-research-action`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorName: supplier.name, vendorId: supplier.id, action })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const [eventLine, dataLine] = line.split('\n');
          if (!eventLine?.startsWith('event:') || !dataLine?.startsWith('data:')) continue;
          const event = eventLine.slice(7).trim();
          let data;
          try { data = JSON.parse(dataLine.slice(6)); } catch { continue; }

          if (event === 'log') {
            setDeepResearchState(prev => ({
              ...prev,
              logs: [...prev.logs, {
                timestamp: data.timestamp || new Date().toLocaleTimeString(),
                message: data.message || '',
                type: data.type || 'info'
              }]
            }));
          } else if (event === 'progress') {
            setDeepResearchState(prev => ({
              ...prev,
              progress: { current: data.current || 0, total: data.total || 0, status: data.status || '' }
            }));
          } else if (event === 'invoice') {
            setDeepResearchState(prev => ({
              ...prev,
              invoices: [...prev.invoices, {
                invoiceNum: data.invoiceNum || 'Unknown',
                outstanding: data.amount || 0,
                daysOld: data.daysOld || 0,
                status: data.status || 'UNKNOWN',
                color: data.statusColor || 'gray'
              }]
            }));
          } else if (event === 'complete') {
            setDeepResearchState(prev => ({
              ...prev, phase: 'done',
              summary: data.success ? data.summary : null,
              error: data.success ? null : (data.error || 'Unknown error')
            }));
          } else if (event === 'error') {
            setDeepResearchState(prev => ({ ...prev, phase: 'done', error: data.message || 'Unknown error' }));
          }
        }
      }
    } catch (e) {
      console.error('Deep research error:', e);
      setDeepResearchState(prev => ({ ...prev, phase: 'done', error: e.message }));
    }
  };

  // ─── Helpers ───
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  const formatCompact = (amount) => {
    const n = Math.abs(amount || 0);
    const sign = amount < 0 ? '-' : '';
    if (n >= 1e9)  return `${sign}${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6)  return `${sign}${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3)  return `${sign}${(n / 1e3).toFixed(2)}K`;
    return `${sign}${n.toFixed(2)}`;
  };

  const batchComplete = batchStatus.length > 0 && batchStatus.every(s => s.status === 'complete' || s.status === 'error');
  const batchRunning  = batchStatus.length > 0 && !batchComplete;
  const hasResults    = batchStatus.some(s => s.status === 'complete');

  const scrollToPanel = (index) => {
    setTimeout(() => {
      supplierPanelRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const getLogColor = (type) => ({
    system:'text-purple-400 font-bold', info:'text-blue-300', success:'text-green-400',
    warning:'text-yellow-400', error:'text-red-400', check:'text-cyan-300',
    invoice:'text-cyan-300 font-semibold', separator:'text-gray-600'
  }[type] || 'text-gray-300');

  // ─── Loading / Error ───
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Dashboard failed to load</h2>
          <p className="text-gray-500 mb-1">{loadError}</p>
          <p className="text-sm text-gray-400 mb-6">
            Make sure the backend server is running on {SERVER_HOST}
          </p>
          <button
            onClick={loadDashboardData}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER ───
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl text-gray-900">Invoice Automation</h1>
          <p className="text-sm text-gray-500 mt-1">Analysis Date: {ANALYSIS_DATE}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="space-y-6">

          {/* ─── Summary Cards ─── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label:'Total Suppliers',      value: stats.totalSuppliers.toLocaleString(),           cls:'text-gray-900' },
              { label:'Total Outstanding',    value: formatCompact(stats.totalOutstanding),          cls:'text-red-600' },
              { label:'Total Invoices',       value: stats.totalInvoices.toLocaleString(),            cls:'text-gray-900' },
              { label:'Avg Days Outstanding', value: Math.round(stats.avgDaysOutstanding).toString(), cls:'text-orange-600' }
            ].map(c => (
              <div key={c.label} className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-500">{c.label}</div>
                <div className={`mt-2 text-3xl font-bold ${c.cls}`}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* ─── Top 5 Suppliers – collapsible research panels ─── */}
          <div className="bg-white rounded-lg shadow">
            {/* Panel header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Top 5 Suppliers by Outstanding Amount</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {hasResults
                      ? 'Deep Research complete — expand each supplier to view the full analysis'
                      : 'Click "Deep Research Agent" to run AI-powered analysis on all suppliers'}
                  </p>
                </div>
                <button
                  onClick={() => { setShowBatchProgress(true); runBatchResearch(); }}
                  disabled={topSuppliers.length === 0 || batchRunning}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg
                             hover:from-red-700 hover:to-orange-700 transition-all shadow-sm
                             flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>{hasResults ? 'Re-run Research' : 'Deep Research Agent'}</span>
                </button>
              </div>
            </div>

            {/* Supplier rows */}
            <div className="divide-y divide-gray-100">
              {topSuppliers.length === 0 && (
                <div className="text-center py-10 text-gray-500">No supplier data loaded. Check backend connection.</div>
              )}

              {topSuppliers.map((supplier, index) => {
                const status     = batchStatus[index];
                const isExpanded = expandedSupplier === index;
                const result     = status?.result;
                const summary    = result?.summary;
                const insights   = normalizeText(result?.insights);
                const actions    = result?.recommendedActions;
                const agingData  = result?.charts?.agingDistribution;
                const breakdownData = result?.charts?.invoiceBreakdown;

                const badge = !status
                  ? { bg:'bg-gray-100', text:'text-gray-500', label:'Not analysed' }
                  : status.status === 'complete'  ? { bg:'bg-green-100',  text:'text-green-700',  label:'Analysed' }
                  : status.status === 'error'     ? { bg:'bg-red-100',    text:'text-red-700',    label:'Error' }
                  : status.status === 'analyzing' ? { bg:'bg-blue-100',   text:'text-blue-700',   label:'Analysing…' }
                  :                                 { bg:'bg-gray-100',   text:'text-gray-500',   label:'Pending' };

                return (
                  <div key={supplier.id} ref={el => supplierPanelRefs.current[index] = el}>

                    {/* ── Row header (always visible) ── */}
                    <button
                      onClick={() => {
                        if (status?.status !== 'complete') return;
                        const next = isExpanded ? null : index;
                        setExpandedSupplier(next);
                        if (next !== null) scrollToPanel(next);
                      }}
                      className={`w-full flex items-center justify-between px-6 py-4 text-left transition-colors
                        ${status?.status === 'complete' ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-center min-w-0">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700 font-bold text-xs mr-3 flex-shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-3 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
                              {status?.status === 'analyzing' && (
                                <svg className="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                </svg>
                              )}
                              {badge.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {supplier.invoiceCount} invoices • Avg {Math.round(supplier.avgDaysOld)} days old
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 flex-shrink-0 ml-4">
                        <div className="text-lg font-bold text-red-600">{formatCurrency(supplier.outstanding)}</div>
                        {status?.status === 'complete' && (
                          <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </div>
                    </button>

                    {/* ── Expanded body ── */}
                    {isExpanded && status?.status === 'complete' && result && (
                      <div className="border-t border-gray-100 bg-gray-50 pb-6">

                        {/* Metric tiles */}
                        {summary && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 pt-5">
                            <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
                              <div className="text-sm font-medium text-red-600">Total Outstanding</div>
                              <div className="mt-1 text-2xl font-bold text-red-700">{formatCurrency(summary.totalOutstanding)}</div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                              <div className="text-sm font-medium text-blue-600">UNPAID Invoices</div>
                              <div className="mt-1 text-2xl font-bold text-blue-700">{summary.invoiceCount}</div>
                            </div>
                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
                              <div className="text-sm font-medium text-orange-600">Avg Days Old</div>
                              <div className="mt-1 text-2xl font-bold text-orange-700">{Math.round(summary.avgDaysOld)}</div>
                            </div>
                            <div className={`bg-gradient-to-br border rounded-lg p-4 ${
                              summary.riskLevel === 'high'   ? 'from-red-50 to-red-100 border-red-200' :
                              summary.riskLevel === 'medium' ? 'from-yellow-50 to-yellow-100 border-yellow-200' :
                                                               'from-green-50 to-green-100 border-green-200'
                            }`}>
                              <div className="text-sm font-medium text-gray-700">Risk Level</div>
                              <div className={`mt-1 text-2xl font-bold uppercase ${
                                summary.riskLevel === 'high'   ? 'text-red-700' :
                                summary.riskLevel === 'medium' ? 'text-yellow-700' : 'text-green-700'
                              }`}>{summary.riskLevel}</div>
                            </div>
                          </div>
                        )}

                        {/* AI Insights */}
                        {insights && (
                          <div className="px-6 pt-5">
                            <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 bg-purple-100 rounded-lg p-2">
                                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                  </svg>
                                </div>
                                <div>
                                  <h4 className="text-lg font-semibold text-gray-900 mb-2">AI Insights</h4>
                                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">{insights}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Charts row: Aging Pie + Invoice Breakdown Bar */}
                        {(agingData?.length > 0 || breakdownData?.length > 0) && (
                          <div className="px-6 pt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                            {agingData?.length > 0 && (
                              <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <h4 className="text-lg font-semibold text-gray-900 mb-3">Aging Distribution</h4>
                                <ResponsiveContainer width="100%" height={230}>
                                  <PieChart>
                                    <Pie data={agingData} cx="50%" cy="50%" labelLine={false}
                                      label={({ name, percent }) => `${name} (${(percent*100).toFixed(0)}%)`}
                                      outerRadius={75} dataKey="value">
                                      {agingData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={v => formatCurrency(v)} />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                            {breakdownData?.length > 0 && (
                              <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <h4 className="text-lg font-semibold text-gray-900 mb-3">Invoice Amount Distribution</h4>
                                <ResponsiveContainer width="100%" height={230}>
                                  <BarChart data={breakdownData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="range" />
                                    <YAxis />
                                    <Tooltip formatter={v => v.toLocaleString()} />
                                    <Bar dataKey="count" fill="#3b82f6" name="Invoices" />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Recommended Actions with Deep Research & Execute */}
                        {actions?.length > 0 && (
                          <div className="px-6 pt-5">
                            <div className="bg-white border border-gray-200 rounded-lg p-6">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-semibold text-gray-900">Recommended Actions</h4>
                                <span className="text-sm text-gray-500">Deep research with human review</span>
                              </div>
                              <div className="space-y-4">
                                {actions.map((action, ai) => {
                                  const pBg =
                                    action.priority === 'high'   ? 'bg-red-100 text-red-800 border-red-300' :
                                    action.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                                                   'bg-green-100 text-green-800 border-green-300';
                                  const pBadge =
                                    action.priority === 'high'   ? 'bg-red-200 text-red-800' :
                                    action.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                                                                   'bg-green-200 text-green-800';
                                  return (
                                    <div key={ai} className={`border-2 rounded-lg p-4 ${pBg}`}>
                                      <div className="flex items-start justify-between mb-2">
                                        <h5 className="font-semibold text-gray-900">{action.title}</h5>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${pBadge}`}>
                                          {action.priority} Priority
                                        </span>
                                      </div>
                                      <p className="text-gray-700 mb-3">{action.description}</p>
                                      <div className="flex items-center justify-between">
                                        {action.impact && (
                                          <span className="text-sm text-gray-600">
                                            <span className="font-medium">Est. Impact:</span> {action.impact}
                                          </span>
                                        )}
                                        <button
                                          onClick={() => startDeepResearch(index, action)}
                                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg
                                                     hover:from-purple-700 hover:to-indigo-700 transition-colors
                                                     flex items-center space-x-2 text-sm"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                          </svg>
                                          <span>{action.type === 'negotiate' ? 'Negotiate Payment Terms' : 'Deep Research & Execute'}</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Result summary (shown after a deep research completes) */}
                        {deepResearchState?.supplierIndex === index && deepResearchState?.phase === 'done' && deepResearchState?.showSummary && deepResearchState?.summary && (
                          <div className="px-6 pt-5">
                            <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-6">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 bg-green-100 rounded-full p-2">
                                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-green-900 mb-3">Deep Research Complete</h5>
                                  <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-white rounded-lg p-3 border border-green-200">
                                      <div className="text-sm text-gray-600">Total Analyzed</div>
                                      <div className="text-xl font-bold text-gray-900">{deepResearchState.summary.totalAnalyzed || 0}</div>
                                    </div>
                                    <div className="bg-green-100 rounded-lg p-3 border border-green-300">
                                      <div className="text-sm text-green-700">Auto-Approved</div>
                                      <div className="text-xl font-bold text-green-800">{deepResearchState.summary.autoApproved || 0}</div>
                                      <div className="text-xs text-green-600">{formatCurrency(deepResearchState.summary.autoApprovedAmount)}</div>
                                    </div>
                                    <div className="bg-yellow-100 rounded-lg p-3 border border-yellow-300">
                                      <div className="text-sm text-yellow-700">Needs Review</div>
                                      <div className="text-xl font-bold text-yellow-800">{deepResearchState.summary.needReview || 0}</div>
                                      <div className="text-xs text-yellow-600">{formatCurrency(deepResearchState.summary.needReviewAmount)}</div>
                                    </div>
                                    <div className="bg-red-100 rounded-lg p-3 border border-red-300">
                                      <div className="text-sm text-red-700">Needs Investigation</div>
                                      <div className="text-xl font-bold text-red-800">{deepResearchState.summary.needInvestigation || 0}</div>
                                      <div className="text-xs text-red-600">{formatCurrency(deepResearchState.summary.needInvestigationAmount)}</div>
                                    </div>
                                  </div>
                                  {deepResearchState.summary.autoApproved > 0 && (
                                    <div className="bg-white rounded-lg p-3 border border-green-200 mb-2">
                                      <p className="font-semibold text-green-900 text-sm mb-1">✅ Approved Invoices Submitted to EBS</p>
                                      <ul className="text-sm text-gray-700 space-y-0.5">
                                        <li>• {deepResearchState.summary.autoApproved} invoices via OIC Gateway</li>
                                        <li>• Total: {formatCurrency(deepResearchState.summary.autoApprovedAmount)}</li>
                                        {deepResearchState.summary.batchId && <li>• Batch ID: {deepResearchState.summary.batchId}</li>}
                                      </ul>
                                    </div>
                                  )}
                                  {deepResearchState.summary.needInvestigation > 0 && (
                                    <div className="bg-white rounded-lg p-3 border border-red-200">
                                      <p className="font-semibold text-red-900 text-sm mb-1">⚠️ Flagged for Investigation</p>
                                      <ul className="text-sm text-gray-700 space-y-0.5">
                                        <li>• {deepResearchState.summary.needInvestigation} invoices require manual review</li>
                                        <li>• Total: {formatCurrency(deepResearchState.summary.needInvestigationAmount)}</li>
                                        {deepResearchState.summary.reportId && <li>• Report: {deepResearchState.summary.reportId}</li>}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Invoices Auto Paid by the Agent ─── */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Invoices Auto Paid by the Agent
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Click "Audit" to see all auto-paid invoices</p>
                </div>
                <button
                  onClick={() => setShowReplay(true)}
                  disabled={autoPaidInvoices.length === 0}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg
                             hover:from-purple-700 hover:to-indigo-700 transition-all shadow-sm
                             flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-5.196-3A1 1 0 008 9.056v5.888a1 1 0 001.552.894l5.196-3a1 1 0 000-1.664z" />
                  </svg>
                  <span>Replay Agentic Action</span>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {autoPaidInvoices.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No auto-paid supplier data loaded. Check backend connection.</div>
                )}
                {autoPaidInvoices.map((supplier, index) => (
                  <div key={supplier.vendorId}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-green-300 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-semibold text-sm mr-3">
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{supplier.vendorName}</h3>
                          <p className="text-sm text-gray-500">
                            {supplier.invoiceCount} invoices &bull; Avg {Math.round(supplier.avgDaysOld)} days old
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-lg font-bold text-green-700">{formatCurrency(supplier.outstanding)}</div>
                      <button
                        onClick={() => onSelectAutoPaidSupplier && onSelectAutoPaidSupplier({ vendorName: supplier.vendorName, vendorId: supplier.vendorId })}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-all shadow-sm flex items-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span>Audit</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
           BATCH PROGRESS MODAL – visible only while batch is running
         ═══════════════════════════════════════════════════════════ */}
      {showBatchProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Deep Research Agent
                  </h2>
                  <p className="text-orange-100 mt-1">
                    {batchRunning
                      ? `Analysing supplier ${batchCurrentIndex + 1} of ${topSuppliers.length}…`
                      : 'All suppliers analysed. Expand panels on the dashboard to view results.'}
                  </p>
                </div>
                {!batchRunning && (
                  <button onClick={() => setShowBatchProgress(false)}
                    className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {batchStatus.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-orange-100 mb-1.5">
                    <span>{batchStatus.filter(s => s.status === 'complete').length} of {batchStatus.length} complete</span>
                    <span>{Math.round((batchStatus.filter(s => s.status === 'complete').length / batchStatus.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-red-900 rounded-full h-2.5">
                    <div className="bg-white h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${(batchStatus.filter(s => s.status === 'complete').length / batchStatus.length) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {topSuppliers.map((supplier, index) => {
                  const st = batchStatus[index];
                  if (!st) return null;
                  const sBadge = {
                    pending:   { bg:'bg-gray-100',  text:'text-gray-600',  label:'Pending',    border:'border-gray-200' },
                    analyzing: { bg:'bg-blue-100',  text:'text-blue-700',  label:'Analysing…', border:'border-blue-300' },
                    complete:  { bg:'bg-green-100', text:'text-green-700', label:'Complete',   border:'border-green-300' },
                    error:     { bg:'bg-red-100',   text:'text-red-700',   label:'Error',      border:'border-red-300' }
                  }[st.status];

                  return (
                    <div key={supplier.id}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 ${sBadge.border} ${st.status === 'analyzing' ? 'ring-2 ring-blue-300' : ''}`}>
                      <div className="flex items-center">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700 font-bold text-xs mr-3">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{supplier.name}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(supplier.outstanding)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${sBadge.bg} ${sBadge.text}`}>
                          {st.status === 'analyzing' && (
                            <svg className="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          )}
                          {sBadge.label}
                        </span>
                        {st.status === 'complete' && (
                          <button
                            onClick={() => { setShowBatchProgress(false); setExpandedSupplier(index); scrollToPanel(index); }}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                            View Analysis →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
           DEEP RESEARCH & EXECUTE – confirmation + live-log modal
         ═══════════════════════════════════════════════════════════ */}
      {deepResearchState && (deepResearchState.phase === 'confirm' || deepResearchState.phase === 'running' || (deepResearchState.phase === 'done' && !deepResearchState.showSummary)) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
            style={{ maxWidth: deepResearchState.phase === 'confirm' ? '32rem' : '72rem' }}>

            {/* ── Confirmation phase ── */}
            {deepResearchState.phase === 'confirm' && (
              <>
                <div className={`px-6 py-5 border-b border-gray-200 bg-gradient-to-r ${
                  deepResearchState.action.type === 'negotiate'
                    ? 'from-teal-600 to-cyan-600' : 'from-purple-600 to-indigo-600'
                } rounded-t-lg`}>
                  <h3 className="text-xl font-bold text-white">
                    {deepResearchState.action.type === 'negotiate' ? 'Initiate Payment Negotiation?' : 'Initiate Deep Research?'}
                  </h3>
                  <p className={`${deepResearchState.action.type === 'negotiate' ? 'text-teal-100' : 'text-purple-100'} mt-0.5 text-sm`}>
                    {topSuppliers[deepResearchState.supplierIndex]?.name}
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-gray-700">
                    {deepResearchState.action.type === 'negotiate'
                      ? 'This will start a multi-phase negotiation process for aged invoices:'
                      : 'This will start a deep research analysis of UNPAID invoices using:'}
                  </p>
                  <div className={`border-2 rounded-lg p-4 ${
                    deepResearchState.action.priority === 'high'   ? 'bg-red-100 border-red-300' :
                    deepResearchState.action.priority === 'medium' ? 'bg-yellow-100 border-yellow-300' :
                                                                     'bg-green-100 border-green-300'
                  }`}>
                    <h4 className="font-semibold text-gray-900 mb-1">{deepResearchState.action.title}</h4>
                    <p className="text-gray-700 text-sm">{deepResearchState.action.description}</p>
                  </div>
                  {deepResearchState.action.type === 'negotiate' ? (
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                      <p className="text-sm text-teal-800 font-semibold">Negotiate Payment Terms Agent will:</p>
                      <ul className="text-sm text-teal-700 mt-2 space-y-1">
                        <li>• <strong>Phase 1:</strong> Internal Assessment — Cash flow analysis, situation evaluation, invoice categorization</li>
                        <li>• <strong>Phase 2:</strong> Preparation — Gather leverage points, develop negotiation strategy</li>
                        <li>• <strong>Phase 3:</strong> Supplier Outreach — Phone script + comprehensive email with full analysis</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-sm text-purple-800 font-semibold">Deep Research Agent will:</p>
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
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50 rounded-b-lg">
                  <button onClick={() => setDeepResearchState(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                    Cancel
                  </button>
                  <button onClick={executeDeepResearch}
                    className={`px-5 py-2 bg-gradient-to-r ${
                      deepResearchState.action.type === 'negotiate'
                        ? 'from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700'
                        : 'from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                    } text-white rounded-lg transition-colors font-medium`}>
                    {deepResearchState.action.type === 'negotiate' ? 'Start Negotiation Process' : 'Start Deep Research'}
                  </button>
                </div>
              </>
            )}

            {/* ── Running phase – live logs + invoice sidebar ── */}
            {(deepResearchState.phase === 'running' || (deepResearchState.phase === 'done' && !deepResearchState.showSummary)) && (
              <>
                <div className={`bg-gradient-to-r ${deepResearchState.action?.type === 'negotiate' ? 'from-teal-600 to-cyan-600' : 'from-purple-600 to-indigo-600'} p-6`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center">
                        <span className="mr-2">{deepResearchState.action?.type === 'negotiate' ? '🤝' : '🔬'}</span>
                        {deepResearchState.action?.type === 'negotiate' ? 'Negotiate Payment Terms Agent' : 'Deep Research Agent with Action'}
                      </h3>
                      <p className={`${deepResearchState.action?.type === 'negotiate' ? 'text-teal-100' : 'text-purple-100'} mt-0.5 text-sm`}>
                        {topSuppliers[deepResearchState.supplierIndex]?.name} – {deepResearchState.action?.type === 'negotiate' ? 'Payment Terms Negotiation' : 'Unpaid Invoice Analysis'}
                      </p>
                    </div>
                    {deepResearchState.phase === 'done' && (
                      <button onClick={() => setDeepResearchState(null)}
                        className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {deepResearchState.progress.total > 0 && (
                    <div className="mt-4">
                      <div className={`flex justify-between text-sm ${deepResearchState.action?.type === 'negotiate' ? 'text-teal-100' : 'text-purple-100'} mb-1.5`}>
                        <span>{deepResearchState.progress.status || 'Processing…'}</span>
                        <span>{deepResearchState.progress.current} / {deepResearchState.progress.total}</span>
                      </div>
                      <div className={`w-full ${deepResearchState.action?.type === 'negotiate' ? 'bg-teal-900' : 'bg-purple-900'} rounded-full h-2`}>
                        <div className="bg-white h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (deepResearchState.progress.current / deepResearchState.progress.total) * 100)}%` }} />
                      </div>
                    </div>
                  )}
                  {deepResearchState.error && (
                    <div className="mt-3 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
                      <strong>Error:</strong> {deepResearchState.error}
                    </div>
                  )}
                </div>

                <div className="flex-1 flex overflow-hidden">
                  {/* Live logs */}
                  <div className="flex-1 bg-gray-900 p-5 overflow-y-auto">
                    <div className="space-y-1 font-mono text-sm">
                      {deepResearchState.logs.length === 0 && (
                        <div className="text-gray-500 text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-3"></div>
                          Initializing deep research…
                        </div>
                      )}
                      {deepResearchState.logs.map((log, i) => (
                        <div key={i} className={getLogColor(log.type)}>
                          <span className="text-gray-600 mr-2 text-xs">[{log.timestamp}]</span>
                          <span>{log.message}</span>
                        </div>
                      ))}
                      {deepResearchState.phase === 'running' && (
                        <div className="flex items-center text-green-400 animate-pulse mt-1">
                          <span className="inline-block w-2 h-4 bg-green-400 mr-2"></span>
                          Processing…
                        </div>
                      )}
                      {deepResearchState.phase === 'done' && !deepResearchState.showSummary && (
                        <div className="mt-4 text-center">
                          <button
                            onClick={() => setDeepResearchState(prev => ({ ...prev, showSummary: true }))}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105"
                          >
                            📊 View Research Summary
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Invoice status sidebar */}
                  <div className="w-80 bg-gray-100 p-5 overflow-y-auto border-l border-gray-300">
                    <h4 className="text-base font-semibold text-gray-900 mb-3">Invoice Status</h4>
                    {deepResearchState.invoices.length === 0 && (
                      <div className="text-center text-gray-500 mt-6">
                        <svg className="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="text-sm">Waiting for invoices…</div>
                      </div>
                    )}
                    <div className="space-y-2">
                      {deepResearchState.invoices.map((inv, i) => {
                        const cBg  = inv.color === 'green' ? 'bg-green-50 border-green-300' :
                                     inv.color === 'yellow'? 'bg-yellow-50 border-yellow-300' :
                                     inv.color === 'red'   ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-300';
                        const cSt  = inv.color === 'green' ? 'bg-green-200 text-green-800' :
                                     inv.color === 'yellow'? 'bg-yellow-200 text-yellow-800' :
                                     inv.color === 'red'   ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-800';
                        return (
                          <div key={i} className={`p-3 rounded-lg border-2 ${cBg}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-gray-900 text-sm">#{inv.invoiceNum}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cSt}`}>{inv.status}</span>
                            </div>
                            <div className="text-xs text-gray-600">
                              <div>Amount: {formatCurrency(inv.outstanding)}</div>
                              <div>Age: {inv.daysOld} days</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
           DEEP RESEARCH – done phase (close button visible)
         ═══════════════════════════════════════════════════════════ */}
      {deepResearchState?.phase === 'done' && deepResearchState?.showSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white">🔬 Deep Research Complete</h3>
                  <p className="text-purple-100 mt-0.5 text-sm">{topSuppliers[deepResearchState.supplierIndex]?.name}</p>
                </div>
                <button onClick={() => setDeepResearchState(null)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {deepResearchState.error ? (
                <div className="bg-red-50 border border-red-300 rounded-lg p-4 text-red-700">
                  <strong>Error:</strong> {deepResearchState.error}
                </div>
              ) : deepResearchState.summary ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="text-sm text-gray-600">Total Analyzed</div>
                      <div className="text-2xl font-bold text-gray-900">{deepResearchState.summary.totalAnalyzed || 0}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="text-sm text-green-700">Auto-Approved</div>
                      <div className="text-2xl font-bold text-green-800">{deepResearchState.summary.autoApproved || 0}</div>
                      <div className="text-xs text-green-600">{formatCurrency(deepResearchState.summary.autoApprovedAmount)}</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <div className="text-sm text-yellow-700">Needs Review</div>
                      <div className="text-2xl font-bold text-yellow-800">{deepResearchState.summary.needReview || 0}</div>
                      <div className="text-xs text-yellow-600">{formatCurrency(deepResearchState.summary.needReviewAmount)}</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <div className="text-sm text-red-700">Needs Investigation</div>
                      <div className="text-2xl font-bold text-red-800">{deepResearchState.summary.needInvestigation || 0}</div>
                      <div className="text-xs text-red-600">{formatCurrency(deepResearchState.summary.needInvestigationAmount)}</div>
                    </div>
                  </div>

                  {deepResearchState.summary.autoApproved > 0 && (
                    <div className="bg-green-50 border border-green-300 rounded-lg p-4">
                      <p className="font-semibold text-green-900 mb-2">✅ Approved Invoices Submitted to EBS</p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• {deepResearchState.summary.autoApproved} invoices submitted via OIC Gateway</li>
                        <li>• Total amount: {formatCurrency(deepResearchState.summary.autoApprovedAmount)}</li>
                        {deepResearchState.summary.batchId && <li>• Batch ID: {deepResearchState.summary.batchId}</li>}
                      </ul>
                    </div>
                  )}
                  {deepResearchState.summary.needInvestigation > 0 && (
                    <div className="bg-red-50 border border-red-300 rounded-lg p-4">
                      <p className="font-semibold text-red-900 mb-2">⚠️ Invoices Flagged for Investigation</p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• {deepResearchState.summary.needInvestigation} invoices require manual review</li>
                        <li>• Total amount: {formatCurrency(deepResearchState.summary.needInvestigationAmount)}</li>
                        {deepResearchState.summary.reportId && <li>• Report: {deepResearchState.summary.reportId}</li>}
                      </ul>
                    </div>
                  )}

                  <button onClick={() => setDeepResearchState(null)}
                    className="w-full mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                    Close — results are saved in the supplier panel below
                  </button>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">No results available.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Replay Agentic Action Modal */}
      {showReplay && (
        <ReplayAgenticAction suppliers={autoPaidInvoices} onClose={() => setShowReplay(false)} />
      )}
    </div>
  );
};

export default Dashboard;
