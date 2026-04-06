/**
 * POProgressBar – Reusable component showing PO invoicing and payment progress.
 * Displays two stacked bars: one for invoiced % and one for paid %.
 *
 * Props:
 *   po  – purchase order object with { totalAmount, totalInvoicedAmount, totalPaidAmount, status }
 *   compact – if true, renders a minimal single-bar version (for list rows)
 */

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n ?? 0);

const STATUS_COLORS = {
  OPEN:               { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200"   },
  PARTIALLY_INVOICED: { bg: "bg-amber-50",  text: "text-amber-700", border: "border-amber-200"   },
  FULLY_INVOICED:     { bg: "bg-orange-50", text: "text-orange-700",border: "border-orange-200"  },
  CLOSED:             { bg: "bg-emerald-50",text: "text-emerald-700",border: "border-emerald-200" },
};

export function StatusBadge({ status }) {
  const cfg = STATUS_COLORS[status] || STATUS_COLORS.OPEN;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {status?.replace("_", " ") || "OPEN"}
    </span>
  );
}

export default function POProgressBar({ po, compact = false }) {
  const total    = Number(po?.totalAmount         || 0);
  const invoiced = Number(po?.totalInvoicedAmount || 0);
  const paid     = Number(po?.totalPaidAmount     || 0);

  const invoicedPct = total > 0 ? Math.min(100, (invoiced / total) * 100) : 0;
  const paidPct     = total > 0 ? Math.min(100, (paid     / total) * 100) : 0;

  if (compact) {
    return (
      <div className="flex flex-col gap-0.5 min-w-[120px]">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-400 font-medium">Invoiced</span>
          <span className="text-slate-600 font-bold">{invoicedPct.toFixed(0)}%</span>
        </div>
        <div className="relative h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-amber-400 transition-all duration-500"
            style={{ width: `${invoicedPct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-700">PO Progress</p>
        <StatusBadge status={po?.status} />
      </div>

      {/* Invoiced bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-slate-500">Invoiced</span>
          <span className="text-[11px] font-black text-amber-700">
            {fmt(invoiced)} / {fmt(total)} ({invoicedPct.toFixed(1)}%)
          </span>
        </div>
        <div className="relative h-2.5 w-full rounded-full overflow-hidden bg-slate-200">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
            style={{
              width: `${invoicedPct}%`,
              background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
            }}
          />
        </div>
      </div>

      {/* Paid bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-slate-500">Paid</span>
          <span className="text-[11px] font-black text-emerald-700">
            {fmt(paid)} / {fmt(total)} ({paidPct.toFixed(1)}%)
          </span>
        </div>
        <div className="relative h-2.5 w-full rounded-full overflow-hidden bg-slate-200">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
            style={{
              width: `${paidPct}%`,
              background: "linear-gradient(90deg, #10b981, #34d399)",
            }}
          />
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { label: "Total",     value: fmt(total),            color: "text-slate-700" },
          { label: "Remaining", value: fmt(Math.max(0, total - invoiced)), color: "text-amber-700" },
          { label: "Unpaid",    value: fmt(Math.max(0, total - paid)),     color: "text-rose-600"  },
        ].map((row) => (
          <div key={row.label} className="rounded-lg bg-white border border-slate-100 px-2 py-1.5 text-center">
            <p className="text-[11px] font-black tabular-nums truncate" style={{ color: "inherit" }}>
              <span className={row.color}>{row.value}</span>
            </p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wide mt-0.5">{row.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
