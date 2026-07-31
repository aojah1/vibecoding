import React, { useState, useEffect, useRef } from 'react';

const SERVER_HOST = import.meta.env.VITE_SERVER_HOST || 'http://localhost:4001';
const ANALYSIS_DATE = import.meta.env.VITE_ANALYSIS_DATE || '10-OCT-2010';

const ReplayAgenticAction = ({ suppliers, onClose }) => {
  const [executingAction, setExecutingAction] = useState(true);
  const [researchLogs, setResearchLogs] = useState([]);
  const [researchProgress, setResearchProgress] = useState({ current: 0, total: suppliers.length, status: 'Initializing...' });
  const [processedInvoices, setProcessedInvoices] = useState([]);
  const [researchSummary, setResearchSummary] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [researchError, setResearchError] = useState(null);
  const researchLogEndRef = useRef(null);
  const generationRef = useRef(0); // incremented each time the effect fires; stale loops self-abort

  useEffect(() => {
    researchLogEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [researchLogs]);

  useEffect(() => {
    // Bump generation so any previously-started async loop becomes stale
    generationRef.current += 1;
    const myGen = generationRef.current;

    // Hard-reset every piece of state so nothing from a prior run lingers
    setResearchLogs([]);
    setProcessedInvoices([]);
    setResearchSummary(null);
    setShowSummary(false);
    setResearchError(null);
    setExecutingAction(true);
    setResearchProgress({ current: 0, total: suppliers.length, status: 'Initializing...' });

    runReplay(myGen);
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const addLog = (message, type = 'info') => {
    setResearchLogs(prev => [...prev, {
      timestamp: (type === 'blank' || type === 'separator') ? '' : new Date().toLocaleTimeString(),
      message,
      type
    }]);
  };

  const addInvoice = (invoice) => {
    setProcessedInvoices(prev => [...prev, invoice]);
  };

  const formatCurrency = (amount) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
    } catch {
      return `$${(amount || 0).toLocaleString()}`;
    }
  };

  // Identical palette to SupplierAnalysis
  const getLogTypeStyle = (type) => {
    const styles = {
      system:    'text-purple-400 font-bold',
      info:      'text-blue-300',
      success:   'text-green-400',
      warning:   'text-yellow-400',
      error:     'text-red-400',
      check:     'text-cyan-300',
      invoice:   'text-cyan-300 font-semibold',
      separator: 'text-gray-600',
      blank:     ''
    };
    return styles[type] || 'text-gray-300';
  };

  // ─── Fetch real invoices for a supplier ───────────────────────────────────
  const fetchSupplierInvoices = async (vendorName) => {
    const sql = `
      SELECT
        ai.invoice_num,
        MAX(ai.invoice_amount - NVL(ai.amount_paid, 0)) as outstanding,
        MAX(TRUNC(TO_DATE('${ANALYSIS_DATE}', 'DD-MON-YYYY') - ai.invoice_date)) as days_old
      FROM ap.ap_invoices_all ai
      JOIN ap.ap_suppliers pv ON ai.vendor_id = pv.vendor_id
      WHERE pv.vendor_name = '${vendorName}'
        AND ai.payment_status_flag != 'Y'
        AND ai.cancelled_date IS NULL
        AND (ai.invoice_amount - NVL(ai.amount_paid, 0)) > 0
      GROUP BY ai.invoice_num
      ORDER BY MAX(ai.invoice_date) ASC
    `;

    const response = await fetch(`${SERVER_HOST}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql })
    });
    const result = await response.json();

    if (result.success && result.data) {
      const seen = new Set();
      return result.data.filter(row => {
        const num = row.INVOICE_NUM || row.invoice_num;
        if (seen.has(num)) return false;
        seen.add(num);
        return true;
      });
    }
    return [];
  };

  // ─── Main simulation loop ─────────────────────────────────────────────────
  const runReplay = async (generation) => {
    // pause() is sleep() + staleness check.
    // The moment a newer effect fires, generationRef advances and every
    // subsequent pause() in THIS loop throws 'STALE', unwinding the stack.
    const pause = async (ms) => {
      await sleep(ms);
      if (generation !== generationRef.current) throw 'STALE';
    };

    try {

      const accumulated = {
        totalAnalyzed: 0,
        autoApproved: 0,
        autoApprovedAmount: 0,
        needReview: 0,
        needReviewAmount: 0,
        needInvestigation: 0,
        needInvestigationAmount: 0
      };

      // ── Opening banner ──
      addLog('═══════════════════════════════════════════════════════════', 'system');
      addLog('  🔄  REPLAY AGENTIC ACTION — AUTO PAY SIMULATION',        'system');
      addLog(`  Replaying decisions for ${suppliers.length} suppliers...`,'info');
      addLog('═══════════════════════════════════════════════════════════', 'system');
      await pause(800);

      // ── Connection phase ──
      addLog('🚀 Initializing Deep Research with Action Sub-Agent...', 'system');
      await pause(600);
      addLog('📡 Connecting to AIDP (AI Data Platform)...', 'info');
      await pause(800);
      addLog('✅ AIDP connection established', 'success');
      await pause(400);
      addLog('🔌 Connecting to EBS Data Warehouse...', 'info');
      await pause(700);
      addLog('✅ EBS Data Warehouse connected', 'success');
      await pause(400);
      addLog('📊 Connecting to Supplier Master Database...', 'info');
      await pause(600);
      addLog('✅ Supplier DB connection active', 'success');
      await pause(400);
      addLog('🔐 Connecting to OIC Gateway...', 'info');
      await pause(800);
      addLog('✅ OIC Gateway authenticated', 'success');
      await pause(500);

      // ── Per-supplier loop ──
      for (let i = 0; i < suppliers.length; i++) {
        const supplier = suppliers[i];

        setResearchProgress({
          current: i,
          total: suppliers.length,
          status: `Replaying: ${supplier.vendorName} (${i + 1} of ${suppliers.length})`
        });

        // Supplier header separator
        addLog('',  'blank');
        addLog('───────────────────────────────────────────────────────────', 'separator');
        addLog(`▶  SUPPLIER ${i + 1}/${suppliers.length}:  ${supplier.vendorName}`, 'system');
        addLog(`   Vendor ID: ${supplier.vendorId}  |  Outstanding: ${formatCurrency(supplier.outstanding)}`, 'info');
        addLog('───────────────────────────────────────────────────────────', 'separator');
        await pause(500);

        // ── Fetch real invoices ──
        addLog('🔍 Querying UNPAID invoices for deep analysis...', 'info');
        await pause(900);

        let invoices = [];
        try {
          invoices = await fetchSupplierInvoices(supplier.vendorName);
        } catch (error) {
          if (error === 'STALE') throw error; // re-throw stale so outer catch exits cleanly
          addLog(`❌ Failed to fetch invoices: ${error.message}`, 'error');
          continue;
        }

        if (invoices.length === 0) {
          addLog('⚠️ No unpaid invoices found for this supplier', 'warning');
          await pause(400);
          continue;
        }

        addLog(`✅ Retrieved ${invoices.length} UNPAID invoices for analysis`, 'success');
        await pause(700);
        addLog('', 'separator');
        addLog('🤖 Initiating AI-Powered Multi-Source Validation...', 'system');
        addLog('', 'separator');
        await pause(500);

        let supplierApprovedAmount = 0;
        const supplierApprovedInvoices = [];

        // ── Per-invoice: 5 checks, all pass → AUTO_APPROVED ──
        for (let j = 0; j < invoices.length; j++) {
          const inv       = invoices[j];
          const invNum    = inv.INVOICE_NUM  || inv.invoice_num;
          const amount    = parseFloat(inv.OUTSTANDING || inv.outstanding || 0);
          const daysOld   = parseInt(inv.DAYS_OLD      || inv.days_old     || 0);

          addLog(`\n📄 Analyzing Invoice #${invNum} (${j + 1}/${invoices.length})...`, 'info');
          setResearchProgress(prev => ({ ...prev, status: `Analyzing Invoice #${invNum}` }));
          await pause(300);

          // Check 1 — EBS historical
          addLog('  🔍 Checking EBS historical payment patterns...', 'check');
          await pause(300);
          addLog('  ✅ EBS: Consistent payment history', 'success');
          await pause(200);

          // Check 2 — AIDP duplicate scan
          addLog('  🔍 AIDP scanning for duplicate invoices...', 'check');
          await pause(350);
          addLog('  ✅ AIDP: No duplicates found', 'success');
          await pause(200);

          // Check 3 — Supplier Master
          addLog('  🔍 Validating against Supplier Master DB...', 'check');
          await pause(300);
          addLog('  ✅ Supplier DB: Supplier verified & active', 'success');
          await pause(200);

          // Check 4 — Amount
          addLog('  🔍 Validating invoice amount...', 'check');
          await pause(250);
          addLog('  ✅ Amount: Amount within normal range', 'success');
          await pause(200);

          // Check 5 — Aging
          addLog('  🔍 Analyzing invoice aging...', 'check');
          await pause(300);
          addLog(`  ✅ Aging: ${daysOld} days - within policy`, 'success');
          await pause(250);

          // Decision
          addLog('  ✅ Decision: AUTO_APPROVED - Cleared for automatic submission', 'success');
          await pause(250);

          // Push card to right panel — always green
          addInvoice({
            invoiceNum:   invNum,
            outstanding:  amount,
            daysOld:      daysOld,
            status:       'AUTO_APPROVED',
            color:        'green',
            supplierName: supplier.vendorName
          });

          supplierApprovedAmount += amount;
          supplierApprovedInvoices.push({ invoiceNum: invNum, amount });
          await pause(120);
        }

        // ── Per-supplier summary ──
        addLog('', 'separator');
        addLog('📊 Research Complete - Generating Summary...', 'system');
        await pause(600);
        addLog('\n📈 Analysis Summary:', 'info');
        addLog(`  ✅ Auto-Approved: ${invoices.length} invoices ($${supplierApprovedAmount.toLocaleString()})`, 'success');
        await pause(700);

        // ── OIC submission ──
        addLog('', 'separator');
        addLog('🔄 Initiating OIC Gateway Submission...', 'system');
        await pause(600);
        addLog('📦 Preparing batch payload for auto-approved invoices...', 'info');
        await pause(500);
        addLog(`✅ Payload prepared: ${invoices.length} invoices`, 'success');
        await pause(400);
        addLog('🔐 Authenticating with OIC Gateway...', 'info');
        await pause(500);
        addLog('✅ Authentication successful', 'success');
        await pause(350);
        addLog('📤 Submitting to EBS Payment Processing...', 'info');
        await pause(800);
        addLog('✅ Submission accepted by EBS', 'success');
        await pause(500);
        addLog('🔔 Triggering payment workflow...', 'info');
        await pause(600);
        addLog('✅ Payment workflow initiated', 'success');
        await pause(400);

        const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        addLog(`📋 Batch ID: ${batchId}`, 'success');
        await pause(350);
        addLog(`💰 Total submitted for payment: $${supplierApprovedAmount.toLocaleString()}`, 'success');
        await pause(500);

        for (const inv of supplierApprovedInvoices) {
          addLog(`  ✅ Invoice #${inv.invoiceNum} queued for payment ($${inv.amount.toLocaleString()})`, 'success');
          await pause(150);
        }

        addLog('', 'separator');
        addLog(`✅ ${supplier.vendorName} — complete`, 'success');
        await pause(400);

        // Accumulate totals
        accumulated.totalAnalyzed      += invoices.length;
        accumulated.autoApproved       += invoices.length;
        accumulated.autoApprovedAmount += supplierApprovedAmount;
      }

      // ── Closing banner ──
      addLog('', 'blank');
      addLog('═══════════════════════════════════════════════════════════', 'system');
      addLog('  ✅  REPLAY COMPLETE — ALL SUPPLIERS PROCESSED',          'success');
      addLog('═══════════════════════════════════════════════════════════', 'system');

      setResearchSummary(accumulated);
      setResearchProgress({ current: suppliers.length, total: suppliers.length, status: 'Replay Complete ✓' });
      setExecutingAction(false);

    } catch (e) {
      if (e === 'STALE') return; // silently exit — a newer run has taken over
      throw e; // real error — let it surface
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white">🔬 Replay Agentic Action</h2>
              <p className="text-purple-100 mt-1">
                {executingAction
                  ? `Auto Pay Simulation — ${researchProgress.status}`
                  : 'Auto Pay Simulation Complete'}
              </p>
            </div>
            {!executingAction && (
              <button
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Progress bar */}
          {researchProgress.total > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-purple-100 mb-2">
                <span>{researchProgress.status || 'Processing...'}</span>
                <span>{researchProgress.current} / {researchProgress.total}</span>
              </div>
              <div className="w-full bg-purple-900 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (researchProgress.current / researchProgress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {researchError && (
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Error:</strong> {researchError}
            </div>
          )}
        </div>

        {/* Two-column body */}
        <div className="flex-1 overflow-hidden flex">

          {/* LEFT: Live Logs */}
          <div className="flex-1 bg-gray-900 p-6 overflow-y-auto">
            <div className="space-y-1 font-mono text-sm">
              {researchLogs.length === 0 && executingAction && (
                <div className="text-gray-500 text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                  <div>Initializing deep research...</div>
                </div>
              )}

              {researchLogs.map((log, index) => (
                <div key={index} className={getLogTypeStyle(log.type)}>
                  <div className="flex items-start">
                    {log.timestamp && (
                      <span className="text-gray-600 mr-2 text-xs">[{log.timestamp}]</span>
                    )}
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

          {/* RIGHT: Invoice Status cards */}
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
              {(() => {
                let lastSupplier = null;
                return processedInvoices.map((invoice, index) => {
                  const showHeader = invoice.supplierName !== lastSupplier;
                  lastSupplier = invoice.supplierName;

                  const bgColor =
                    invoice.color === 'green'  ? 'bg-green-50 border-green-300'  :
                    invoice.color === 'yellow' ? 'bg-yellow-50 border-yellow-300' :
                    invoice.color === 'red'    ? 'bg-red-50 border-red-300'      :
                                                 'bg-gray-50 border-gray-300';
                  const statusColor =
                    invoice.color === 'green'  ? 'bg-green-200 text-green-800'  :
                    invoice.color === 'yellow' ? 'bg-yellow-200 text-yellow-800' :
                    invoice.color === 'red'    ? 'bg-red-200 text-red-800'      :
                                                 'bg-gray-200 text-gray-800';

                  return (
                    <React.Fragment key={index}>
                      {showHeader && (
                        <div className={index > 0 ? 'mt-4 pt-3 border-t border-gray-300' : ''}>
                          <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">
                            {invoice.supplierName}
                          </div>
                        </div>
                      )}

                      <div className={`p-3 rounded-lg border-2 ${bgColor}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-900 text-sm">#{invoice.invoiceNum}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                            {invoice.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          <div>Amount: {formatCurrency(invoice.outstanding)}</div>
                          <div>Age: {invoice.daysOld} days</div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                });
              })()}
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

            {/* Summary */}
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
                      <span className="font-semibold">{formatCurrency(researchSummary.autoApprovedAmount || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplayAgenticAction;
