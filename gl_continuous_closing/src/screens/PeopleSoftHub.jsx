import { useGLStore } from '../store/useGLStore'
import StatusBadge from '../components/StatusBadge'
import { X } from 'lucide-react'

const MODULE_COLORS = {
  GL: 'bg-slate-700 text-slate-200',
  AP: 'bg-blue-900/60 text-blue-300',
  AR: 'bg-green-900/60 text-green-300',
  AM: 'bg-purple-900/60 text-purple-300',
  PO: 'bg-orange-900/60 text-orange-300',
  PY: 'bg-pink-900/60 text-pink-300',
}

const AGENT_STATUS = {
  validated: { label: '✓ Validated', cls: 'text-green-400' },
  exception: { label: '⚠ Exception', cls: 'text-red-400' },
  pending:   { label: '○ Pending',   cls: 'text-slate-500' },
}

const GL_BALANCES = [
  { account: 'Cash & Equivalents',           balance: 15432998, entity: 'E01', prior: 14980000 },
  { account: 'Accounts Receivable',          balance: 8234500,  entity: 'E01', prior: 7980000  },
  { account: 'Inventory',                    balance: 9841200,  entity: 'E01', prior: 9600000  },
  { account: 'Fixed Assets – Net',           balance: 24500000, entity: 'E01', prior: 25200000 },
  { account: 'Accounts Payable',             balance: 4102344,  entity: 'E01', prior: 4380000  },
  { account: 'Salary & Wages Expense',       balance: 1240000,  entity: 'E01', prior: 1210000  },
  { account: 'Revenue – Products',           balance: 12000000, entity: 'E01', prior: 10800000 },
  { account: 'Intercompany Receivable',      balance: 320000,   entity: 'E01', prior: 0        },
]

export default function PeopleSoftHub() {
  const { psModules, psTransactions, psModuleFilter, setPsModuleFilter, selectedTxn, setSelectedTxn, exceptions } = useGLStore()

  const filtered = psModuleFilter === 'ALL'
    ? psTransactions
    : psTransactions.filter(t => t.module === psModuleFilter)

  const txnExceptions = selectedTxn
    ? exceptions.filter(e => e.txnId === selectedTxn.id)
    : []

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: module sidebar + transaction table */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-700">

        {/* Module pills */}
        <div className="flex items-center gap-2 p-3 border-b border-slate-700 bg-slate-900 overflow-x-auto">
          <button
            onClick={() => setPsModuleFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${psModuleFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            All Modules ({psTransactions.length})
          </button>
          {psModules.map(m => (
            <button
              key={m.id}
              onClick={() => setPsModuleFilter(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors ${psModuleFilter === m.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              <span>{m.icon}</span>
              <span>{m.id}</span>
              <span className="opacity-60">({psTransactions.filter(t => t.module === m.id).length})</span>
            </button>
          ))}
        </div>

        {/* Transaction table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900 z-10">
              <tr className="text-xs text-slate-500 uppercase">
                <th className="text-left px-4 py-2.5">Transaction</th>
                <th className="text-left px-4 py-2.5">Module</th>
                <th className="text-left px-4 py-2.5">Party</th>
                <th className="text-right px-4 py-2.5">Amount</th>
                <th className="text-left px-4 py-2.5">Entity</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">AI Check</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => {
                const ag = AGENT_STATUS[tx.agentStatus]
                return (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTxn(tx)}
                    className={`border-t border-slate-700/50 cursor-pointer transition-colors ${selectedTxn?.id === tx.id ? 'bg-slate-700/60' : 'hover:bg-slate-700/30'}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-blue-400">{tx.id}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{tx.type}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${MODULE_COLORS[tx.module]}`}>{tx.module}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300 max-w-[160px] truncate">{tx.party}</td>
                    <td className="px-4 py-3 text-right text-xs text-slate-200 font-mono tabular-nums">
                      ${tx.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{tx.entity}</td>
                    <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                    <td className={`px-4 py-3 text-xs font-semibold ${ag.cls}`}>{ag.label}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: detail panel OR GL balance snapshot */}
      {selectedTxn ? (
        <div className="w-96 shrink-0 overflow-y-auto bg-slate-900 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <div>
              <p className="font-mono text-blue-400 text-sm font-bold">{selectedTxn.id}</p>
              <p className="text-xs text-slate-500 mt-0.5">{selectedTxn.type} · {selectedTxn.date}</p>
            </div>
            <button onClick={() => setSelectedTxn(null)} className="text-slate-500 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-5">
            <div className="flex gap-2">
              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${MODULE_COLORS[selectedTxn.module]}`}>
                {selectedTxn.module}
              </span>
              <StatusBadge status={selectedTxn.status} />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Description</p>
              <p className="text-sm text-white">{selectedTxn.description}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Counterparty</p>
              <p className="text-sm text-slate-200">{selectedTxn.party}</p>
            </div>

            {/* Journal entry */}
            <div className="space-y-1">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Journal Entry</p>
              <div className="bg-slate-800 rounded-lg border border-slate-700 divide-y divide-slate-700">
                <div className="flex justify-between items-center px-4 py-2.5 text-xs">
                  <span className="text-green-400 font-semibold">DR {selectedTxn.debit}</span>
                  <span className="text-slate-200 font-mono tabular-nums">${selectedTxn.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5 text-xs">
                  <span className="text-orange-400 font-semibold pl-4">CR {selectedTxn.credit}</span>
                  <span className="text-slate-200 font-mono tabular-nums">${selectedTxn.amount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <p className="text-slate-500 uppercase tracking-widest">Cost Center</p>
                <p className="text-slate-200">{selectedTxn.costCenter}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-500 uppercase tracking-widest">Entity</p>
                <p className="text-slate-200">{selectedTxn.entity}</p>
              </div>
            </div>

            {/* Agent status */}
            <div className={`rounded-lg px-4 py-3 text-sm font-semibold ${
              selectedTxn.agentStatus === 'validated'
                ? 'bg-green-900/30 border border-green-800 text-green-300'
                : selectedTxn.agentStatus === 'exception'
                ? 'bg-red-900/30 border border-red-800 text-red-300'
                : 'bg-slate-800 border border-slate-700 text-slate-400'
            }`}>
              {selectedTxn.agentStatus === 'validated' && '✓ AI Validation Passed — Cleared for Oracle ADB'}
              {selectedTxn.agentStatus === 'exception' && '⚠ AI Validation Failed — Exception Created'}
              {selectedTxn.agentStatus === 'pending'   && '○ AI Validation Pending…'}
            </div>

            {/* Linked exceptions */}
            {txnExceptions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-widest">Linked Exceptions</p>
                {txnExceptions.map(ex => (
                  <div key={ex.id} className="bg-red-900/20 border border-red-900/40 rounded-lg p-3 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-oracle-red font-bold">{ex.id}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold uppercase ${
                        ex.severity === 'critical' ? 'bg-red-900 text-red-300' : 'bg-orange-900 text-orange-300'
                      }`}>{ex.severity}</span>
                    </div>
                    <p className="text-red-300 font-semibold">{ex.title}</p>
                    <p className="text-slate-400">{ex.epmImpact}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* GL balance snapshot when no transaction selected */
        <div className="w-96 shrink-0 overflow-y-auto bg-slate-900 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-700">
            <p className="text-xs text-slate-500 uppercase tracking-widest">PeopleSoft GL</p>
            <p className="text-sm font-semibold text-white">Trial Balance — E01 North America · Jun 2025</p>
          </div>
          <div className="divide-y divide-slate-800">
            {GL_BALANCES.map(row => {
              const chg = ((row.balance - row.prior) / row.prior * 100)
              return (
                <div key={row.account} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 truncate">{row.account}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-200 font-mono tabular-nums">${(row.balance / 1000000).toFixed(2)}M</p>
                    <p className={`text-xs tabular-nums ${chg >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                      {chg >= 0 ? '+' : ''}{chg.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="p-5 border-t border-slate-700 mt-auto">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Select a transaction to view journal details and AI validation results
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
