export default function KpiCard({ label, value, sub, color = 'text-white', bg = 'bg-slate-800', icon }) {
  return (
    <div className={`${bg} rounded-xl p-4 flex flex-col gap-1 border border-slate-700`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 uppercase tracking-widest">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <span className={`text-3xl font-bold ${color}`}>{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  )
}
