import { create } from 'zustand'

// ── Entities ──────────────────────────────────────────────────────────────────
export const ENTITIES = [
  { id: 'E01', name: 'Company A – North America', region: 'NOAM', currency: 'USD', closeProgress: 75, riskScore: 18 },
  { id: 'E02', name: 'Company B – EMEA Holdings', region: 'EMEA', currency: 'EUR', closeProgress: 60, riskScore: 62 },
  { id: 'E03', name: 'Company C – APAC Finance', region: 'APAC', currency: 'JPY', closeProgress: 45, riskScore: 38 },
  { id: 'E04', name: 'Latin America SA',          region: 'LATAM', currency: 'BRL', closeProgress: 10, riskScore: 91 },
  { id: 'E00', name: 'Corporate (Consolidated)',  region: 'CORP',  currency: 'USD', closeProgress: 0,  riskScore: 0  },
]

// ── PeopleSoft modules ────────────────────────────────────────────────────────
export const PS_MODULES = [
  { id: 'GL', name: 'General Ledger',       icon: '📒', txCount: 1482, status: 'active'  },
  { id: 'AP', name: 'Accounts Payable',     icon: '📤', txCount: 347,  status: 'closed'  },
  { id: 'AR', name: 'Accounts Receivable',  icon: '📥', txCount: 218,  status: 'active'  },
  { id: 'AM', name: 'Asset Management',     icon: '🏭', txCount: 89,   status: 'active'  },
  { id: 'PO', name: 'Purchasing',           icon: '🛒', txCount: 156,  status: 'active'  },
  { id: 'PY', name: 'Payroll',              icon: '💰', txCount: 42,   status: 'posted'  },
]

// ── PeopleSoft transactions (the story examples + more) ───────────────────────
export const PS_TRANSACTIONS = [
  {
    id: 'TXN-AP-0041', module: 'AP', type: 'Vendor Invoice',
    description: 'Steel supply Q2 – Manufacturing plant',
    party: 'ABC Steel Corp', amount: 250000,
    debit: 'Raw Materials Inventory', credit: 'Accounts Payable',
    costCenter: 'Manufacturing', entity: 'E01', date: '2025-06-27', status: 'posted', agentStatus: 'validated',
  },
  {
    id: 'TXN-AR-0019', module: 'AR', type: 'Customer Receipt',
    description: 'Q2 product order payment',
    party: 'Customer XYZ Industries', amount: 480000,
    debit: 'Cash & Equivalents', credit: 'Accounts Receivable',
    costCenter: 'Sales – NOAM', entity: 'E01', date: '2025-06-27', status: 'posted', agentStatus: 'validated',
  },
  {
    id: 'TXN-GL-0088', module: 'GL', type: 'Payroll Journal',
    description: 'June 2025 payroll – all departments',
    party: 'Payroll System', amount: 1240000,
    debit: 'Salary & Wages Expense', credit: 'Cash & Equivalents',
    costCenter: 'All Departments', entity: 'E01', date: '2025-06-28', status: 'posted', agentStatus: 'validated',
  },
  {
    id: 'TXN-AM-0012', module: 'AM', type: 'Asset Depreciation',
    description: 'Manufacturing equipment Q2 depreciation',
    party: 'Fixed Assets System', amount: 87500,
    debit: 'Depreciation Expense', credit: 'Accumulated Depreciation',
    costCenter: 'Manufacturing', entity: 'E01', date: '2025-06-28', status: 'posted', agentStatus: 'validated',
  },
  {
    id: 'TXN-GL-0091', module: 'GL', type: 'Revenue Recognition',
    description: 'Product revenue recognition – June',
    party: 'Revenue Engine', amount: 3200000,
    debit: 'Deferred Revenue', credit: 'Revenue – Products',
    costCenter: 'Finance', entity: 'E01', date: '2025-06-28', status: 'posted', agentStatus: 'validated',
  },
  {
    id: 'TXN-GL-0092', module: 'GL', type: 'Inventory Adjustment',
    description: 'Physical count variance – Warehouse B',
    party: 'Inventory System', amount: 42300,
    debit: 'Inventory Write-down', credit: 'Inventory',
    costCenter: 'Operations', entity: 'E02', date: '2025-06-28', status: 'posted', agentStatus: 'exception',
  },
  {
    id: 'TXN-GL-0094', module: 'GL', type: 'Intercompany Transfer',
    description: 'Management fee allocation – E01 → E02',
    party: 'Corporate Treasury', amount: 320000,
    debit: 'Intercompany Receivable', credit: 'Intercompany Payable',
    costCenter: 'Corporate', entity: 'E01', date: '2025-06-29', status: 'pending', agentStatus: 'exception',
  },
  {
    id: 'TXN-AP-0043', module: 'AP', type: 'Vendor Invoice',
    description: 'IT services contract renewal',
    party: 'TechServ Ltd', amount: 175000,
    debit: 'IT Expense', credit: 'Accounts Payable',
    costCenter: 'Technology', entity: 'E02', date: '2025-06-29', status: 'posted', agentStatus: 'validated',
  },
  {
    id: 'TXN-AR-0024', module: 'AR', type: 'Customer Invoice',
    description: 'Q2 product shipment – EMEA customer',
    party: 'Eurotech GmbH', amount: 680000,
    debit: 'Accounts Receivable', credit: 'Revenue – Products',
    costCenter: 'Sales – EMEA', entity: 'E02', date: '2025-06-29', status: 'posted', agentStatus: 'validated',
  },
  {
    id: 'TXN-GL-0097', module: 'GL', type: 'FX Revaluation',
    description: 'EUR/USD end-of-period revaluation',
    party: 'Treasury System', amount: 145000,
    debit: 'FX Gain / Loss', credit: 'Cash – EUR',
    costCenter: 'Treasury', entity: 'E02', date: '2025-06-29', status: 'flagged', agentStatus: 'exception',
  },
  {
    id: 'TXN-PY-0007', module: 'PY', type: 'Payroll Journal',
    description: 'EMEA payroll June 2025 – EUR',
    party: 'Global Payroll Provider', amount: 890000,
    debit: 'Salary & Wages Expense', credit: 'Accrued Payroll',
    costCenter: 'All EMEA Departments', entity: 'E02', date: '2025-06-29', status: 'posted', agentStatus: 'validated',
  },
  {
    id: 'TXN-AM-0015', module: 'AM', type: 'Asset Disposal',
    description: 'Obsolete equipment write-off – Plant 3',
    party: 'Fixed Assets System', amount: 63000,
    debit: 'Asset Disposal Loss', credit: 'Fixed Assets',
    costCenter: 'Manufacturing', entity: 'E03', date: '2025-06-29', status: 'posted', agentStatus: 'validated',
  },
  {
    id: 'TXN-PO-0031', module: 'PO', type: 'Purchase Order',
    description: 'Raw material procurement Q3 forward order',
    party: 'Global Metals Inc', amount: 1800000,
    debit: 'Raw Materials Inventory', credit: 'Accounts Payable',
    costCenter: 'Procurement', entity: 'E03', date: '2025-06-29', status: 'pending', agentStatus: 'validated',
  },
]

// ── AI Agents ─────────────────────────────────────────────────────────────────
export const AGENTS = [
  {
    id: 'A01', name: 'Journal Validation Agent', icon: '📋', status: 'running',
    processed: 1482, passed: 1474, failed: 8,
    description: 'Validates debit = credit, account coding, approval status, and posting cutoff for every journal entering from PeopleSoft.',
    rulesChecked: ['Debit = Credit balance', 'Posting period cutoff', 'Approval workflow complete', 'Valid account code'],
  },
  {
    id: 'A02', name: 'Balance Validation Agent', icon: '⚖️', status: 'running',
    processed: 946, passed: 939, failed: 7,
    description: 'Verifies trial balance integrity, account-level variances, and period-over-period thresholds before data loads to Oracle FCCS.',
    rulesChecked: ['Trial balance integrity', 'Variance < 5% threshold', 'Period-over-period check', 'Currency consistency'],
  },
  {
    id: 'A03', name: 'Reconciliation Agent', icon: '🔄', status: 'running',
    processed: 304, passed: 298, failed: 6,
    description: 'Matches GL balances against subledgers and bank statements. Pre-populates Oracle ARCS with comparison data.',
    rulesChecked: ['GL vs subledger match', 'Bank statement match', 'Intercompany match', 'Prior period rollforward'],
  },
  {
    id: 'A04', name: 'Anomaly Detection Agent', icon: '🔍', status: 'running',
    processed: 1737, passed: 1723, failed: 14,
    description: 'Uses statistical models to flag unusual amounts, duplicates, late postings, and unauthorized journal entries.',
    rulesChecked: ['Unusual amount (3σ)', 'Duplicate detection', 'Unauthorized entry', 'Round-number test'],
  },
  {
    id: 'A05', name: 'Close Readiness Agent', icon: '✅', status: 'running',
    processed: 22, passed: 18, failed: 4,
    description: 'Scores each entity\'s readiness to submit to Oracle FCCS. Predicts estimated close date based on open items.',
    rulesChecked: ['All reconciliations complete', 'Intercompany matched', 'Controller approved', 'FCCS trial balance loaded'],
  },
]

// ── Exceptions (caught by agents BEFORE reaching EPM) ─────────────────────────
const INITIAL_EXCEPTIONS = [
  {
    id: 'EX-001', agentId: 'A04', agentName: 'Anomaly Detection Agent', severity: 'critical',
    title: 'Intercompany Imbalance – E01 / E02',
    description: 'E01 records $320K intercompany receivable (TXN-GL-0094). Counterpart payable in E02 is missing. FCCS intercompany elimination will fail.',
    txnId: 'TXN-GL-0094', entity: 'E01', entityName: 'Company A – North America',
    status: 'open', owner: 'Corporate Accounting', detectedAt: '2025-06-29 08:14',
    recommendation: 'Post matching intercompany payable in E02 (Debit Intercompany Expense / Credit Intercompany Payable $320,000). Re-run Reconciliation Agent after correction.',
    epmImpact: 'FCCS consolidation will fail — intercompany eliminations cannot complete with unmatched balance.',
  },
  {
    id: 'EX-002', agentId: 'A03', agentName: 'Reconciliation Agent', severity: 'high',
    title: 'Cash Reconciliation Variance – E01',
    description: 'PeopleSoft GL Cash: $15,432,998. Bank Statement: $15,430,102. Unreconciled difference: $2,896.',
    txnId: null, entity: 'E01', entityName: 'Company A – North America',
    status: 'in_review', owner: 'Treasury Ops', detectedAt: '2025-06-29 07:55',
    recommendation: 'Investigate outstanding checks or unrecorded bank fees. Ensure difference is cleared before ARCS approval.',
    epmImpact: 'ARCS Cash reconciliation approval will be blocked until variance is explained and resolved.',
  },
  {
    id: 'EX-003', agentId: 'A04', agentName: 'Anomaly Detection Agent', severity: 'high',
    title: 'FX Revaluation Anomaly – E02',
    description: 'EUR/USD revaluation gain $145,000 exceeds 3σ of prior 6-month average ($18,400). Possible rate source error.',
    txnId: 'TXN-GL-0097', entity: 'E02', entityName: 'Company B – EMEA Holdings',
    status: 'open', owner: 'EMEA Finance', detectedAt: '2025-06-29 09:02',
    recommendation: 'Validate FX rate against treasury system source (Reuters/Bloomberg). Confirm methodology with treasury controller.',
    epmImpact: 'FCCS currency translation will be materially misstated. Consolidated FX line will be overstated by ~$127K.',
  },
  {
    id: 'EX-004', agentId: 'A02', agentName: 'Balance Validation Agent', severity: 'medium',
    title: 'Inventory Variance Exceeds Threshold – E02',
    description: 'Inventory account balance variance of $42,300 (5.8%) exceeds 5% tolerance after physical count adjustment.',
    txnId: 'TXN-GL-0092', entity: 'E02', entityName: 'Company B – EMEA Holdings',
    status: 'in_review', owner: 'EMEA Finance', detectedAt: '2025-06-29 08:31',
    recommendation: 'Review physical count documentation and confirm write-down approval chain. Validate against WMS system.',
    epmImpact: 'FCCS COGS will be understated. Planning actuals vs budget variance will be overstated for E02.',
  },
  {
    id: 'EX-005', agentId: 'A05', agentName: 'Close Readiness Agent', severity: 'medium',
    title: 'E04 Not Ready for FCCS Submission',
    description: 'Latin America SA: 4 open reconciliations, 0 close tasks complete. Close deadline is 3 days away. Predicted submit date: Day 9 (2 days late).',
    txnId: null, entity: 'E04', entityName: 'Latin America SA',
    status: 'open', owner: 'LATAM Finance', detectedAt: '2025-06-29 06:00',
    recommendation: 'Escalate to LATAM Finance Controller. Prioritize AP close and payroll posting. Assign additional resource if needed.',
    epmImpact: 'FCCS consolidation will be incomplete — E04 represents ~8% of consolidated revenue.',
  },
  {
    id: 'EX-006', agentId: 'A01', agentName: 'Journal Validation Agent', severity: 'low',
    title: 'Late Posting – E03 Asset Disposal',
    description: 'Asset disposal TXN-AM-0015 posted June 29 after the AP cutoff for June period. Flagged for controller review.',
    txnId: 'TXN-AM-0015', entity: 'E03', entityName: 'Company C – APAC Finance',
    status: 'resolved', owner: 'APAC Finance', detectedAt: '2025-06-29 07:10',
    recommendation: 'Confirmed as in-period transaction. Cutoff rule exception approved by controller — no action required.',
    epmImpact: 'None — exception reviewed and approved by APAC Finance Controller.',
  },
]

// ── FCCS Consolidation ────────────────────────────────────────────────────────
export const FCCS_ENTITIES = [
  { id: 'E01', name: 'Company A – North America', revenue: 12000000, expenses: 9200000, currency: 'USD', fxRate: 1.0,    status: 'submitted'   },
  { id: 'E02', name: 'Company B – EMEA',          revenue: 8600000,  expenses: 6800000, currency: 'EUR', fxRate: 1.08,   status: 'submitted'   },
  { id: 'E03', name: 'Company C – APAC',          revenue: 4100000,  expenses: 3400000, currency: 'JPY', fxRate: 0.0067, status: 'in_progress' },
  { id: 'E04', name: 'Latin America SA',          revenue: 2100000,  expenses: 1900000, currency: 'BRL', fxRate: 0.19,   status: 'not_started' },
]

export const FCCS_ELIMINATIONS = [
  { description: 'Intercompany Sales Elimination',  amount: -1200000, status: 'pending'  },
  { description: 'Intercompany Loan Elimination',   amount: -320000,  status: 'blocked'  },
  { description: 'Currency Translation Adjustment', amount: -420000,  status: 'complete' },
  { description: 'Minority Interest Adjustment',    amount: -180000,  status: 'complete' },
]

// ── ARCS Reconciliations ──────────────────────────────────────────────────────
export const ARCS_RECS = [
  { id: 'REC-001', account: 'Cash & Equivalents',    glBalance: 15432998, systemBalance: 15430102, systemLabel: 'Bank Statement', diff: 2896,   status: 'in_progress', preparer: 'J. Smith',    entity: 'E01', dueDate: '2025-07-03' },
  { id: 'REC-002', account: 'Accounts Receivable',   glBalance: 8234500,  systemBalance: 8234500,  systemLabel: 'AR Subledger',   diff: 0,      status: 'complete',    preparer: 'M. Johnson',  entity: 'E01', dueDate: '2025-07-03' },
  { id: 'REC-003', account: 'Accounts Payable',      glBalance: 4102344,  systemBalance: 4102344,  systemLabel: 'AP Subledger',   diff: 0,      status: 'complete',    preparer: 'R. Garcia',   entity: 'E01', dueDate: '2025-07-03' },
  { id: 'REC-004', account: 'Inventory',             glBalance: 9841200,  systemBalance: 9798900,  systemLabel: 'WMS System',     diff: 42300,  status: 'in_progress', preparer: 'K. Lee',      entity: 'E02', dueDate: '2025-07-03' },
  { id: 'REC-005', account: 'Fixed Assets – Net',    glBalance: 24500000, systemBalance: 24437000, systemLabel: 'Asset Register', diff: 63000,  status: 'open',        preparer: 'T. Wang',     entity: 'E03', dueDate: '2025-07-04' },
  { id: 'REC-006', account: 'Payroll Accruals',      glBalance: 1240000,  systemBalance: 1240000,  systemLabel: 'Payroll System', diff: 0,      status: 'complete',    preparer: 'S. Patel',    entity: 'E01', dueDate: '2025-07-02' },
]

// ── Close Manager Tasks ───────────────────────────────────────────────────────
export const CLOSE_TASKS = [
  { day: 1, task: 'Close Accounts Payable',             owner: 'AP Team',               module: 'AP',   status: 'complete',    completedAt: 'Jun 27, 5:02 PM' },
  { day: 2, task: 'Run Asset Depreciation',             owner: 'Fixed Assets',           module: 'AM',   status: 'complete',    completedAt: 'Jun 28, 9:15 AM' },
  { day: 3, task: 'Post Payroll Journals',              owner: 'Payroll Team',           module: 'PY',   status: 'complete',    completedAt: 'Jun 28, 4:30 PM' },
  { day: 4, task: 'Complete Account Reconciliations',   owner: 'Corporate Accounting',   module: 'ARCS', status: 'in_progress', completedAt: null },
  { day: 5, task: 'Controller & Management Review',     owner: 'Finance Controller',     module: 'FCCS', status: 'not_started', completedAt: null },
  { day: 6, task: 'FCCS Consolidation Run',             owner: 'Consolidations Team',    module: 'FCCS', status: 'not_started', completedAt: null },
  { day: 7, task: 'Publish Narrative Reports',          owner: 'Financial Reporting',    module: 'NR',   status: 'not_started', completedAt: null },
]

// ── Readiness trend ────────────────────────────────────────────────────────────
export const TREND = [
  { day: 'Mon', score: 61, exceptions: 18 },
  { day: 'Tue', score: 68, exceptions: 14 },
  { day: 'Wed', score: 74, exceptions: 11 },
  { day: 'Thu', score: 79, exceptions: 9  },
  { day: 'Fri', score: 85, exceptions: 7  },
  { day: 'Sat', score: 88, exceptions: 6  },
  { day: 'Sun', score: 94, exceptions: 5  },
]

// ── Live feed messages ────────────────────────────────────────────────────────
export const FEED_MSGS = [
  { src: 'PeopleSoft AP', type: 'ingest', msg: 'TXN-AP-0044 ingested — Vendor invoice $312,000 (ABC Steel) posted to Manufacturing' },
  { src: 'Journal Validation', type: 'pass', msg: 'TXN-AP-0044 ✓ — Debit=Credit, approval confirmed, cutoff verified' },
  { src: 'PeopleSoft AR', type: 'ingest', msg: 'TXN-AR-0025 ingested — Customer receipt $95,000 from Delta Corp' },
  { src: 'Balance Validation', type: 'pass', msg: 'E01 trial balance integrity check passed — all 412 accounts within threshold' },
  { src: 'Reconciliation', type: 'pass', msg: 'E01 AP subledger matched GL — Δ $0 — ARCS auto-updated' },
  { src: 'Anomaly Detection', type: 'alert', msg: 'E02 FX gain anomaly — $145K exceeds 3σ threshold — EX-003 created → EMEA Finance' },
  { src: 'PeopleSoft GL', type: 'ingest', msg: 'TXN-GL-0099 ingested — Revenue recognition $880,000 — Deferred Revenue → Revenue' },
  { src: 'Journal Validation', type: 'pass', msg: 'TXN-GL-0099 ✓ — All 4 validation rules passed — cleared for ADB lakehouse' },
  { src: 'Close Readiness', type: 'alert', msg: 'E04 readiness score: 12% — 4 open reconciliations — escalation recommended' },
  { src: 'Oracle ADB', type: 'ingest', msg: 'Lakehouse sync — 47 validated journals written to GL_JOURNALS_CANONICAL' },
  { src: 'Reconciliation', type: 'alert', msg: 'Cash variance $2,896 in E01 — EX-002 updated → Treasury Ops (in review)' },
  { src: 'Close Readiness', type: 'pass', msg: 'E01 readiness score updated: 75% — 2 reconciliations outstanding' },
  { src: 'PeopleSoft AM', type: 'ingest', msg: 'TXN-AM-0016 ingested — Depreciation run complete for Q2 assets' },
  { src: 'FCCS Connector', type: 'pass', msg: 'E01 trial balance loaded to Oracle FCCS — 412 accounts, 3 currencies' },
  { src: 'Anomaly Detection', type: 'pass', msg: 'Duplicate scan complete — 1,737 transactions checked — 0 duplicates found' },
]

// ── Store ──────────────────────────────────────────────────────────────────────
export const useGLStore = create((set, get) => {
  const exceptions = [...INITIAL_EXCEPTIONS]
  const openCount = exceptions.filter(e => e.status !== 'resolved').length

  return {
    activeScreen: 'pipeline',
    setActiveScreen: s => set({ activeScreen: s }),

    entities: ENTITIES,
    psModules: PS_MODULES,
    psTransactions: PS_TRANSACTIONS,
    agents: AGENTS,
    exceptions,
    fccsEntities: FCCS_ENTITIES,
    fccsEliminations: FCCS_ELIMINATIONS,
    arcsRecs: ARCS_RECS,
    closeTasks: CLOSE_TASKS,
    trend: TREND,

    // kpis
    readinessScore: 85,
    totalJournalsToday: PS_TRANSACTIONS.length + 1469,
    exceptionsOpen: openCount,
    exceptionsResolved: exceptions.filter(e => e.status === 'resolved').length,
    criticalCount: exceptions.filter(e => e.severity === 'critical' && e.status !== 'resolved').length,
    issuesCaughtBeforeEPM: openCount,

    // selected state
    selectedTxn: null,
    setSelectedTxn: txn => set({ selectedTxn: txn }),

    selectedEx: null,
    setSelectedEx: ex => set({ selectedEx: ex }),

    // exception actions
    resolveException: id => set(state => {
      const exceptions = state.exceptions.map(e => e.id === id ? { ...e, status: 'resolved' } : e)
      const openCount = exceptions.filter(e => e.status !== 'resolved').length
      return {
        exceptions,
        exceptionsOpen: openCount,
        exceptionsResolved: exceptions.filter(e => e.status === 'resolved').length,
        criticalCount: exceptions.filter(e => e.severity === 'critical' && e.status !== 'resolved').length,
        readinessScore: Math.min(99, state.readinessScore + 2),
        issuesCaughtBeforeEPM: openCount,
      }
    }),

    // live feed
    feed: [],
    feedIdx: 0,
    pushFeed: () => set(state => {
      const idx = state.feedIdx % FEED_MSGS.length
      const m = FEED_MSGS[idx]
      const ts = new Date().toLocaleTimeString('en-US', { hour12: false })
      return {
        feed: [{ ...m, ts, key: Date.now() }, ...state.feed].slice(0, 35),
        feedIdx: idx + 1,
      }
    }),

    // EPM active tab
    epmTab: 'fccs',
    setEpmTab: t => set({ epmTab: t }),

    // PS active module filter
    psModuleFilter: 'ALL',
    setPsModuleFilter: m => set({ psModuleFilter: m }),
  }
})
