import { useState, useRef, useEffect } from 'react'
import { useGLStore } from '../store/useGLStore'
import { FCCS_ENTITIES, FCCS_ELIMINATIONS, ARCS_RECS, CLOSE_TASKS } from '../store/useGLStore'
import { Send, Sparkles } from 'lucide-react'

// ── Suggested questions ───────────────────────────────────────────────────────
const SUGGESTED = [
  { label: 'Are all journals posted?',              icon: '📋' },
  { label: 'Have subsidiaries submitted results?',  icon: '🏢' },
  { label: 'Have intercompany balances matched?',   icon: '🔄' },
  { label: 'Are accounts reconciled?',              icon: '⚖️' },
  { label: 'Can we consolidate?',                   icon: '✅' },
  { label: 'What is our consolidated revenue?',     icon: '💰' },
  { label: 'Which entities are at risk?',           icon: '⚠️' },
  { label: 'What is blocking close?',               icon: '🚨' },
]

// ── Status pill ───────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  ready:   { label: 'Ready',   cls: 'bg-green-900/60 text-green-300 border-green-800'   },
  partial: { label: 'Partial', cls: 'bg-yellow-900/60 text-yellow-300 border-yellow-800' },
  blocked: { label: 'Blocked', cls: 'bg-red-900/60 text-red-300 border-red-800'         },
}

function StatusPill({ status }) {
  const c = STATUS_CONFIG[status]
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-bold border uppercase tracking-widest ${c.cls}`}>
      {c.label}
    </span>
  )
}

// ── Response detail row ───────────────────────────────────────────────────────
function DataRow({ label, value, status }) {
  const icon = status === 'ok' ? '✓' : status === 'warn' ? '⚠' : status === 'block' ? '✗' : '•'
  const cls  = status === 'ok' ? 'text-green-400' : status === 'warn' ? 'text-yellow-400' : status === 'block' ? 'text-red-400' : 'text-slate-400'
  return (
    <div className="flex items-start gap-2.5 py-1.5 border-b border-slate-700/50 last:border-0">
      <span className={`text-sm font-bold shrink-0 mt-0.5 w-4 ${cls}`}>{icon}</span>
      <span className="text-xs text-slate-400 w-48 shrink-0">{label}</span>
      <span className={`text-xs font-semibold ${cls} flex-1`}>{value}</span>
    </div>
  )
}

// ── Response engine (deterministic, data-driven) ──────────────────────────────
function generateResponse(raw, storeData) {
  const q = raw.toLowerCase().trim()
  const { psTransactions, exceptions, agents, readinessScore } = storeData

  const pendingTxns   = psTransactions.filter(t => t.status === 'pending')
  const flaggedTxns   = psTransactions.filter(t => t.agentStatus === 'exception')
  const openEx        = exceptions.filter(e => e.status !== 'resolved')
  const criticalEx    = openEx.filter(e => e.severity === 'critical')
  const icException   = exceptions.find(e => e.id === 'EX-001')
  const icBlocked     = icException && icException.status !== 'resolved'

  const fccsNotReady  = FCCS_ENTITIES.filter(e => e.status !== 'submitted')
  const openRecs      = ARCS_RECS.filter(r => r.status !== 'complete')
  const completedTasks = CLOSE_TASKS.filter(t => t.status === 'complete').length
  const totalRevenue  = FCCS_ENTITIES.reduce((s, e) => s + e.revenue, 0)
  const consolidatedRev = totalRevenue - 1200000 - 420000
  const consolidatedExp = FCCS_ENTITIES.reduce((s, e) => s + e.expenses, 0)
  const netIncome     = consolidatedRev - consolidatedExp

  // ── 1. Are all journals posted? ─────────────────────────────────────────────
  if (q.includes('journal') || q.includes('posted')) {
    const totalJournals = psTransactions.reduce((s, m) => s, 0) + 1469
    const journalAgent  = agents.find(a => a.id === 'A01')
    const allPosted     = pendingTxns.length === 0 && journalAgent.failed === 0
    return {
      status: pendingTxns.length > 0 ? 'partial' : journalAgent.failed > 0 ? 'partial' : 'ready',
      summary: pendingTxns.length > 0
        ? `Not fully. ${pendingTxns.length} journal${pendingTxns.length > 1 ? 's' : ''} still pending approval. ${journalAgent.failed} validation exceptions detected.`
        : journalAgent.failed > 0
        ? `Journals posted, but ${journalAgent.failed} failed AI validation checks and require review before FCCS load.`
        : 'Yes — all journals are posted and have passed AI validation.',
      rows: [
        { label: 'Total journals this period',       value: (1482).toLocaleString(),                     status: 'ok'    },
        { label: 'Passed Journal Validation Agent',  value: `${journalAgent.passed.toLocaleString()} / ${journalAgent.processed.toLocaleString()}`, status: 'ok' },
        { label: 'Validation failures',              value: `${journalAgent.failed} journals`,            status: journalAgent.failed > 0 ? 'warn' : 'ok' },
        { label: 'Pending approval (unapproved)',    value: pendingTxns.length > 0 ? `${pendingTxns.length} pending: ${pendingTxns.map(t => t.id).join(', ')}` : 'None outstanding', status: pendingTxns.length > 0 ? 'warn' : 'ok' },
        { label: 'Late / post-cutoff postings',      value: '1 flagged (TXN-AM-0015) — exception approved by controller', status: 'ok' },
        { label: 'Cleared for Oracle ADB',           value: '1,474 journals — ready for FCCS load',      status: 'ok'    },
      ],
      insight: pendingTxns.length > 0
        ? `TXN-GL-0094 (Intercompany Transfer $320K) is pending approval. This must be approved before the trial balance loads to FCCS — it is also linked to critical exception EX-001.`
        : `Journal Validation Agent has continuously monitored all ${(1482).toLocaleString()} journals as they arrived from PeopleSoft. No manual review of journals is needed before FCCS load.`,
      actions: pendingTxns.length > 0
        ? ['Approve TXN-GL-0094 in PeopleSoft — or reject and reverse', 'Resolve EX-001 intercompany imbalance before FCCS load']
        : [],
    }
  }

  // ── 2. Subsidiaries submitted? ──────────────────────────────────────────────
  if (q.includes('subsidiar') || q.includes('submitted') || q.includes('entities') || q.includes('submit')) {
    const submitted   = FCCS_ENTITIES.filter(e => e.status === 'submitted')
    const inProgress  = FCCS_ENTITIES.filter(e => e.status === 'in_progress')
    const notStarted  = FCCS_ENTITIES.filter(e => e.status === 'not_started')
    const allDone     = notStarted.length === 0 && inProgress.length === 0
    return {
      status: allDone ? 'ready' : notStarted.length > 0 ? 'blocked' : 'partial',
      summary: allDone
        ? 'Yes — all entities have submitted results to Oracle FCCS.'
        : `No — ${submitted.length} of ${FCCS_ENTITIES.length} entities submitted. ${inProgress.length > 0 ? `${inProgress.length} in progress.` : ''} ${notStarted.length > 0 ? `${notStarted.length} not started — at risk.` : ''}`,
      rows: FCCS_ENTITIES.map(e => ({
        label: `${e.name} (${e.currency})`,
        value: e.status === 'submitted'   ? `Submitted — $${(e.revenue / 1e6).toFixed(1)}M revenue` :
               e.status === 'in_progress' ? 'In Progress — trial balance load underway' :
                                            'Not Started — deadline risk: 3 days remaining',
        status: e.status === 'submitted' ? 'ok' : e.status === 'in_progress' ? 'warn' : 'block',
      })),
      insight: notStarted.length > 0
        ? `Latin America SA (E04) represents ~${Math.round(2100000 / totalRevenue * 100)}% of consolidated revenue. Close Readiness Agent has flagged it as high-risk with a predicted submission date of Jul 4 — 2 days after the consolidation deadline.`
        : inProgress.length > 0
        ? `Company C (APAC) is loading its trial balance now. All E03 validation checks passed — submission is expected within the next few hours.`
        : 'All subsidiaries have submitted clean, AI-validated trial balances to Oracle FCCS.',
      actions: notStarted.length > 0
        ? ['Escalate E04 to LATAM Finance Controller — exception EX-005 active', 'Consider requesting a 2-day extension for E04 or running FCCS consolidation without E04 initially']
        : [],
    }
  }

  // ── 3. Intercompany balanced? ───────────────────────────────────────────────
  if (q.includes('intercompan') || q.includes('matched') || q.includes('ic balance') || q.includes('eliminations')) {
    const blockedElims = FCCS_ELIMINATIONS.filter(e => e.status === 'blocked')
    return {
      status: icBlocked ? 'blocked' : 'ready',
      summary: icBlocked
        ? 'No — intercompany balances do not match. 1 critical exception is blocking FCCS eliminations.'
        : 'Yes — all intercompany balances are matched and FCCS eliminations can proceed.',
      rows: [
        { label: 'E01 Intercompany Receivable',  value: '$320,000 (Company A → Company B)',               status: icBlocked ? 'block' : 'ok' },
        { label: 'E02 Intercompany Payable',      value: icBlocked ? '$0 — counterpart entry MISSING' : '$320,000 — matched', status: icBlocked ? 'block' : 'ok' },
        { label: 'FCCS Elimination: IC Sales',   value: '$1,200,000 — elimination pending',               status: 'warn'  },
        { label: 'FCCS Elimination: IC Loan',    value: icBlocked ? '$320,000 — BLOCKED by EX-001' : '$320,000 — eliminated', status: icBlocked ? 'block' : 'ok' },
        { label: 'Currency Translation Adj.',    value: '$420,000 — complete',                            status: 'ok'    },
        { label: 'Minority Interest Adjustment', value: '$180,000 — complete',                            status: 'ok'    },
      ],
      insight: icBlocked
        ? `AI Anomaly Detection Agent identified the mismatch at 08:14 this morning — 4 hours before the FCCS load window. Without continuous validation, this would have been discovered when FCCS consolidation failed on Day 5. The fix is a single journal entry in PeopleSoft E02.`
        : `All intercompany transactions between E01, E02, E03, and E04 are matched. FCCS will be able to complete all 4 eliminations automatically.`,
      actions: icBlocked
        ? ['Post journal in PeopleSoft E02: DR Intercompany Expense / CR Intercompany Payable $320,000', 'Re-run Reconciliation Agent after posting to confirm match', 'FCCS IC Loan elimination will auto-clear once match is confirmed']
        : [],
    }
  }

  // ── 4. Are accounts reconciled? ────────────────────────────────────────────
  if (q.includes('reconcil') || q.includes('arcs') || q.includes('rec ')) {
    const complete    = ARCS_RECS.filter(r => r.status === 'complete')
    const outstanding = ARCS_RECS.filter(r => r.status !== 'complete')
    const totalVar    = outstanding.reduce((s, r) => s + r.diff, 0)
    return {
      status: outstanding.length === 0 ? 'ready' : outstanding.length <= 2 ? 'partial' : 'partial',
      summary: outstanding.length === 0
        ? 'Yes — all account reconciliations are complete and approved in Oracle ARCS.'
        : `Partially. ${complete.length} of ${ARCS_RECS.length} reconciliations complete. ${outstanding.length} outstanding with a combined variance of $${totalVar.toLocaleString()}.`,
      rows: ARCS_RECS.map(r => ({
        label: `${r.account} (${r.entity})`,
        value: r.diff === 0
          ? `$${r.glBalance.toLocaleString()} — matched vs ${r.systemLabel}`
          : `GL $${r.glBalance.toLocaleString()} vs ${r.systemLabel} $${r.systemBalance.toLocaleString()} — Δ $${r.diff.toLocaleString()}`,
        status: r.status === 'complete' ? 'ok' : r.diff > 50000 ? 'block' : 'warn',
      })),
      insight: outstanding.length > 0
        ? `Reconciliation Agent automatically pre-populated all 6 ARCS reconciliations with GL vs source system comparisons. The 3 outstanding items total $${totalVar.toLocaleString()} in variance — all assigned to preparers. Without AI, this comparison would have taken 2–3 days of manual work.`
        : 'All ARCS reconciliations are signed off. Controller approval is the next step before FCCS consolidation run.',
      actions: outstanding.map(r =>
        r.diff > 0
          ? `${r.account} (${r.entity}): Investigate $${r.diff.toLocaleString()} variance — assigned to ${r.preparer}`
          : `${r.account}: Complete in-progress review`
      ),
    }
  }

  // ── 5. Can we consolidate? ──────────────────────────────────────────────────
  if (q.includes('consolidat') || q.includes('can we close') || q.includes('ready')) {
    const blockers = []
    if (pendingTxns.length > 0)      blockers.push(`${pendingTxns.length} journal(s) pending approval`)
    if (icBlocked)                   blockers.push('Intercompany imbalance E01/E02 blocking eliminations (EX-001)')
    if (fccsNotReady.length > 0)     blockers.push(`${fccsNotReady.length} entities not yet submitted to FCCS (${fccsNotReady.map(e => e.id).join(', ')})`)
    if (openRecs.length > 0)         blockers.push(`${openRecs.length} account reconciliations outstanding in ARCS`)
    if (criticalEx.length > 1)       blockers.push(`${criticalEx.length} critical exceptions unresolved`)

    return {
      status: blockers.length === 0 ? 'ready' : blockers.length <= 1 ? 'partial' : 'blocked',
      summary: blockers.length === 0
        ? 'Yes — all pre-consolidation checks passed. FCCS consolidation can be initiated now.'
        : blockers.length === 1
        ? `Almost. 1 blocker remains before FCCS consolidation: ${blockers[0]}.`
        : `Not yet. ${blockers.length} items must be resolved before Oracle FCCS can run a clean consolidation.`,
      rows: [
        { label: 'Journals validated & posted',        value: agents.find(a => a.id === 'A01').failed === 0 ? 'All clear' : `${agents.find(a => a.id === 'A01').failed} validation failures`, status: agents.find(a => a.id === 'A01').failed === 0 ? 'ok' : 'warn' },
        { label: 'Entity submissions to FCCS',         value: `${FCCS_ENTITIES.filter(e => e.status === 'submitted').length} of ${FCCS_ENTITIES.length} submitted`,        status: fccsNotReady.length === 0 ? 'ok' : fccsNotReady.length === 1 ? 'warn' : 'block' },
        { label: 'Intercompany eliminations',          value: icBlocked ? 'BLOCKED — E01/E02 mismatch (EX-001)' : 'All eliminations ready',                                  status: icBlocked ? 'block' : 'ok'  },
        { label: 'Account reconciliations (ARCS)',     value: `${ARCS_RECS.filter(r => r.status === 'complete').length} of ${ARCS_RECS.length} complete — ${openRecs.length} outstanding`,   status: openRecs.length === 0 ? 'ok' : openRecs.length <= 2 ? 'warn' : 'block' },
        { label: 'AI exception clearance',             value: `${openEx.length} open exceptions — ${criticalEx.length} critical`,                                             status: criticalEx.length > 0 ? 'block' : openEx.length > 0 ? 'warn' : 'ok' },
        { label: 'Close Manager progress',             value: `${completedTasks} of ${CLOSE_TASKS.length} tasks complete (Day ${completedTasks} of 7)`,                       status: completedTasks >= 5 ? 'ok' : 'warn' },
        { label: 'FX rates & currency translation',    value: 'EUR/USD anomaly EX-003 under review — may affect translated amounts',                                         status: 'warn' },
        { label: 'Controller approval',                value: 'Not started — Day 5 task pending resolution of above',                                                        status: 'warn' },
      ],
      insight: blockers.length > 0
        ? `Resolving EX-001 (intercompany) and closing E04's 4 open reconciliations are the critical path items. With AI agents continuously monitoring, these were surfaced on Day 1 rather than discovered when the FCCS consolidation run failed. Estimated FCCS readiness: Jul 1 if all items resolved today.`
        : 'All pre-consolidation gates have been cleared. Oracle FCCS can be initiated — estimated runtime 45 minutes for full 5-entity consolidation with currency translation.',
      actions: blockers,
    }
  }

  // ── 6. Consolidated revenue ─────────────────────────────────────────────────
  if (q.includes('revenue') || q.includes('financial') || q.includes('income') || q.includes('profit')) {
    return {
      status: fccsNotReady.length > 0 ? 'partial' : 'ready',
      summary: fccsNotReady.length > 0
        ? `Preliminary consolidated revenue is $${(consolidatedRev / 1e6).toFixed(1)}M (${fccsNotReady.length} entities not yet submitted — figure may change).`
        : `Consolidated revenue is $${(consolidatedRev / 1e6).toFixed(1)}M with net income of $${(netIncome / 1e6).toFixed(1)}M.`,
      rows: [
        ...FCCS_ENTITIES.map(e => ({
          label: `${e.name} revenue`,
          value: `$${(e.revenue / 1e6).toFixed(1)}M (${e.currency})`,
          status: e.status === 'submitted' ? 'ok' : e.status === 'in_progress' ? 'warn' : 'block',
        })),
        { label: 'Gross revenue (sum)',               value: `$${(totalRevenue / 1e6).toFixed(1)}M`,                          status: 'ok'   },
        { label: 'IC Sales Elimination',              value: '-$1.2M',                                                        status: 'warn' },
        { label: 'Currency Translation Adj.',         value: '-$0.4M',                                                        status: 'ok'   },
        { label: 'Consolidated revenue (net)',        value: `$${(consolidatedRev / 1e6).toFixed(1)}M`,                       status: 'ok'   },
        { label: 'Consolidated expenses',             value: `$${(consolidatedExp / 1e6).toFixed(1)}M`,                       status: 'ok'   },
        { label: 'Net income',                        value: `$${(netIncome / 1e6).toFixed(1)}M (${Math.round(netIncome / consolidatedRev * 100)}% margin)`, status: 'ok' },
      ],
      insight: `Revenue grew approximately 11.1% quarter-over-quarter. North America remains the largest contributor at $${(12 / (consolidatedRev / 1e6) * 100).toFixed(0)}% of consolidated revenue. EMEA revaluation anomaly (EX-003) may affect the FX translation line — confirm before publishing board package.`,
      actions: fccsNotReady.length > 0
        ? [`Submit ${fccsNotReady.map(e => e.name).join(', ')} to FCCS to finalize numbers`]
        : ['Review FX translation adjustment once EX-003 is resolved', 'Generate Narrative Report for board package'],
    }
  }

  // ── 7. Which entities at risk? ─────────────────────────────────────────────
  if (q.includes('risk') || q.includes('at risk') || q.includes('entity') || q.includes('late') || q.includes('entities')) {
    const highRisk = [
      { name: 'Latin America SA (E04)',          risk: 91, reason: 'Not started — 0% close tasks, 4 open reconciliations. Predicted submit date Jul 4 (2 days late).' },
      { name: 'Company B – EMEA (E02)',          risk: 62, reason: 'FX revaluation anomaly EX-003 open. IC payable EX-001 missing. 2 reconciliations outstanding.' },
      { name: 'Company C – APAC (E03)',          risk: 38, reason: '45% close progress. 1 open reconciliation (Fixed Assets Δ $63K). On track but tight.' },
      { name: 'Company A – North America (E01)', risk: 18, reason: '75% progress. Cash variance Δ $2,896 under review. Lowest risk entity.' },
    ]
    return {
      status: 'partial',
      summary: '1 entity (E04) is at high risk of missing the close deadline. 1 entity (E02) has material exceptions requiring resolution.',
      rows: highRisk.map(e => ({
        label: e.name,
        value: e.reason,
        status: e.risk > 70 ? 'block' : e.risk > 40 ? 'warn' : 'ok',
      })),
      insight: 'Close Readiness Agent scores each entity daily using open task count, reconciliation status, and exception severity. E04 risk score of 91 triggers automatic escalation. Without AI monitoring, E04 status would not have been visible until Day 5 when the FCCS consolidation run failed.',
      actions: [
        'Escalate E04 to LATAM Finance Controller — EX-005 active',
        'Resolve EX-001 and EX-003 in E02 before FCCS load',
        'Monitor E03 Fixed Assets reconciliation daily',
      ],
    }
  }

  // ── 8. What is blocking close? ─────────────────────────────────────────────
  if (q.includes('block') || q.includes('blocking') || q.includes('prevent') || q.includes('stopping')) {
    return {
      status: 'blocked',
      summary: `${openEx.length} open AI exceptions are blocking FCCS consolidation. ${criticalEx.length} are critical — FCCS will fail if not resolved.`,
      rows: openEx.map(ex => ({
        label: `${ex.id} — ${ex.severity.toUpperCase()}`,
        value: `${ex.title} → ${ex.epmImpact}`,
        status: ex.severity === 'critical' ? 'block' : ex.severity === 'high' ? 'warn' : 'warn',
      })),
      insight: 'All blockers were detected by AI agents in the first 3 hours of the close period — not discovered during the FCCS run. This is the core value of continuous close: exceptions surface on Day 1, not Day 5.',
      actions: openEx.map(ex => `${ex.id}: ${ex.recommendation.split('.')[0]}`),
    }
  }

  // ── Default ─────────────────────────────────────────────────────────────────
  return {
    status: 'partial',
    summary: `I have EPM data available for the June 2025 close period. Try asking: "Are all journals posted?", "Can we consolidate?", or "What is blocking close?"`,
    rows: [
      { label: 'Journals processed',     value: '1,482 validated by AI agents',       status: 'ok'   },
      { label: 'Exceptions open',        value: `${openEx.length} (${criticalEx.length} critical)`, status: criticalEx.length > 0 ? 'block' : 'warn' },
      { label: 'Close readiness',        value: `${readinessScore}%`,                 status: readinessScore >= 90 ? 'ok' : 'warn' },
      { label: 'FCCS submissions',       value: `${FCCS_ENTITIES.filter(e => e.status === 'submitted').length} of 4 entities`, status: fccsNotReady.length === 0 ? 'ok' : 'warn' },
      { label: 'ARCS reconciliations',  value: `${ARCS_RECS.filter(r => r.status === 'complete').length} of 6 complete`, status: openRecs.length === 0 ? 'ok' : 'warn' },
    ],
    insight: null,
    actions: [],
  }
}

// ── Timestamp ─────────────────────────────────────────────────────────────────
function now() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EPMNaturalLanguage() {
  const storeData = useGLStore()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  function submit(question) {
    const q = question.trim()
    if (!q) return
    setInput('')
    const userMsg = { role: 'user', text: q, ts: now(), id: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setThinking(true)

    // Simulate a brief thinking delay
    setTimeout(() => {
      const response = generateResponse(q, storeData)
      setMessages(prev => [...prev, { role: 'ai', ...response, question: q, ts: now(), id: Date.now() + 1 }])
      setThinking(false)
    }, 800)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input) }
  }

  return (
    <div className="flex flex-col h-full">

      {/* Context banner */}
      <div className="bg-gradient-to-r from-oracle-red/10 to-transparent border-b border-oracle-red/20 px-5 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-oracle-red" />
          <p className="text-xs text-slate-300">
            <span className="text-oracle-red font-semibold">Ask EPM</span> — Natural language queries over AI-validated, consolidated Oracle EPM data.
            All answers are derived from live FCCS, ARCS, and Close Manager data for the <span className="text-white font-semibold">June 2025</span> close period.
          </p>
        </div>
      </div>

      {/* Suggested questions */}
      {messages.length === 0 && (
        <div className="px-5 py-5 shrink-0">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Finance is asking — click to ask</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SUGGESTED.map(s => (
              <button
                key={s.label}
                onClick={() => submit(s.label)}
                className="flex items-start gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-oracle-red/50 rounded-xl px-3 py-3 text-xs text-left transition-all group"
              >
                <span className="text-lg shrink-0">{s.icon}</span>
                <span className="text-slate-300 group-hover:text-white transition-colors">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation thread */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {messages.map(msg => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-lg">
                  <div className="bg-oracle-red rounded-2xl rounded-tr-sm px-4 py-2.5">
                    <p className="text-sm text-white">{msg.text}</p>
                  </div>
                  <p className="text-xs text-slate-600 text-right mt-1">{msg.ts}</p>
                </div>
              </div>
            )
          }

          // AI response
          return (
            <div key={msg.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm shrink-0 mt-1">
                <Sparkles size={14} className="text-oracle-red" />
              </div>
              <div className="flex-1 min-w-0 space-y-3">

                {/* Header */}
                <div className="flex items-center gap-2">
                  <StatusPill status={msg.status} />
                  <p className="text-xs text-slate-500">{msg.ts} · Oracle EPM · June 2025 close</p>
                </div>

                {/* Summary */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                  <p className="text-sm text-white font-semibold leading-relaxed">{msg.summary}</p>
                </div>

                {/* Data rows */}
                {msg.rows && msg.rows.length > 0 && (
                  <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3">
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Supporting Data from Oracle EPM</p>
                    {msg.rows.map((row, i) => (
                      <DataRow key={i} {...row} />
                    ))}
                  </div>
                )}

                {/* AI Insight */}
                {msg.insight && (
                  <div className="bg-oracle-red/10 border border-oracle-red/20 rounded-xl px-4 py-3">
                    <p className="text-xs text-oracle-red font-semibold uppercase tracking-widest mb-1">
                      <Sparkles size={10} className="inline mr-1" />AI Insight
                    </p>
                    <p className="text-sm text-slate-300 leading-relaxed italic">{msg.insight}</p>
                  </div>
                )}

                {/* Recommended actions */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="bg-amber-900/20 border border-amber-800/30 rounded-xl px-4 py-3">
                    <p className="text-xs text-amber-400 font-semibold uppercase tracking-widest mb-2">Recommended Actions</p>
                    <ul className="space-y-1.5">
                      {msg.actions.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-amber-200">
                          <span className="text-amber-500 shrink-0 font-bold mt-0.5">{i + 1}.</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quick follow-ups */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SUGGESTED.filter(s => s.label.toLowerCase() !== msg.question.toLowerCase()).slice(0, 3).map(s => (
                    <button
                      key={s.label}
                      onClick={() => submit(s.label)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}

        {/* Thinking indicator */}
        {thinking && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-oracle-red" />
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-oracle-red animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-oracle-red animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-oracle-red animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-xs text-slate-500 ml-1">Querying Oracle EPM data…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700 px-5 py-4 shrink-0 bg-slate-900">
        {messages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {SUGGESTED.slice(0, 4).map(s => (
              <button
                key={s.label}
                onClick={() => submit(s.label)}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-500 hover:text-white transition-colors"
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything about the June 2025 close period — journals, reconciliations, intercompany, consolidation readiness…"
            rows={2}
            className="flex-1 bg-slate-800 border border-slate-700 focus:border-oracle-red rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none resize-none transition-colors"
          />
          <button
            onClick={() => submit(input)}
            disabled={!input.trim() || thinking}
            className="w-11 h-11 rounded-xl bg-oracle-red hover:bg-oracle-redlight disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-2">Press Enter to send · Shift+Enter for new line · Powered by Oracle ADB + validated EPM data</p>
      </div>
    </div>
  )
}
