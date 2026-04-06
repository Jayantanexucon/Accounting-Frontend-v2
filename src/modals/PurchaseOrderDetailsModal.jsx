import React from "react";
import dayjs from "dayjs";
import {
  X, ShoppingCart, User, Package, Calendar, Truck,
  CreditCard, Banknote, FileText, CheckCircle, Clock,
  Check, X as XIcon, Home, Mail, Globe, MapPin,
  Download, Pencil, Trash2,
} from "lucide-react";

const formatDate = (d) => d ? dayjs(d).format("DD MMM YYYY") : "—";
const calculateTotalTax = (po) =>
  ((po.totalCGSTAmount||0)+(po.totalSGSTAmount||0)+(po.totalIGSTAmount||0)).toFixed(2);

const STATUS_MAP = {
  draft:             { label:"Draft",             cls:"bg-slate-100 text-slate-600 border-slate-200" },
  issued:            { label:"Issued",            cls:"bg-blue-100 text-blue-700 border-blue-200" },
  acknowledged:      { label:"Acknowledged",      cls:"bg-violet-100 text-violet-700 border-violet-200" },
  partially_received:{ label:"Partial",           cls:"bg-amber-100 text-amber-700 border-amber-200" },
  fully_received:    { label:"Received",          cls:"bg-emerald-100 text-emerald-700 border-emerald-200" },
  cancelled:         { label:"Cancelled",         cls:"bg-red-100 text-red-700 border-red-200" },
  closed:            { label:"Closed",            cls:"bg-slate-100 text-slate-600 border-slate-200" },
};

const canCreateInvoice = (status) =>
  !["FULLY_INVOICED", "Fully Invoiced", "CLOSED", "Closed"].includes(status);

const getDeliveryStatus = (d) => {
  const diff = dayjs(d).diff(dayjs(),"day");
  if (diff<0)  return { text:"Overdue",  cls:"bg-red-50 text-red-600 border-red-200" };
  if (diff<=3) return { text:"Due Soon", cls:"bg-amber-50 text-amber-600 border-amber-200" };
  return             { text:"On Track", cls:"bg-emerald-50 text-emerald-600 border-emerald-200" };
};

const Field = ({ label, value, mono }) => (
  <div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
    <p className={`text-xs font-semibold text-slate-800 ${mono?"font-mono":""}`}>{value||"—"}</p>
  </div>
);

const Section = ({ title, icon: Icon, accent, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100"
      style={{ background:"linear-gradient(90deg,#f8fafc 0%,#eff6ff 100%)" }}>
      <div className="w-1 h-5 rounded-full shrink-0" style={{ background: accent }} />
      <Icon size={13} className="text-slate-500" />
      <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{title}</p>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const PurchaseOrderDetailsModal = ({
  open, onClose, purchaseOrder,
  onEdit, onDelete, onDownloadPDF, onDownloadWord, onEmail, onMarkReceived,
}) => {
  if (!open || !purchaseOrder) return null;

  const status   = STATUS_MAP[purchaseOrder.status] || STATUS_MAP.draft;
  const delivery = getDeliveryStatus(purchaseOrder.deliveryDate);
  const totalTax = calculateTotalTax(purchaseOrder);
  const currency = purchaseOrder.currency || "INR";
  const fmt      = (n) => `${currency} ${(n||0).toFixed(2)}`;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 pt-8">
        <div className="relative bg-slate-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          onClick={(e)=>e.stopPropagation()}>

          {/* Header */}
          <div className="sticky top-0 z-10 rounded-t-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4"
              style={{ background:"linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#60a5fa 100%)" }}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl border border-white/25">
                  <ShoppingCart size={16} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-extrabold text-white tracking-tight">
                      {purchaseOrder.poNumber || "Purchase Order"}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${status.cls}`}>{status.label}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${delivery.cls}`}>{delivery.text}</span>
                  </div>
                  <p className="text-blue-200 text-[11px] mt-0.5">
                    PO Date: {formatDate(purchaseOrder.poDate)} · Delivery: {formatDate(purchaseOrder.deliveryDate)}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label:"Total Amount",  value:fmt(purchaseOrder.totalAmount),       g:"linear-gradient(135deg,#1e3a8a,#2563eb)", blob:"#93c5fd" },
                { label:"Taxable Value", value:fmt(purchaseOrder.totalTaxableValue), g:"linear-gradient(135deg,#064e3b,#059669)", blob:"#6ee7b7" },
                { label:"Total Tax",     value:`${currency} ${totalTax}`,             g:"linear-gradient(135deg,#78350f,#d97706)", blob:"#fde68a" },
                { label:"Payment Terms", value:purchaseOrder.paymentTerms||"—",      g:"linear-gradient(135deg,#312e81,#7c3aed)", blob:"#c4b5fd" },
              ].map((s,i)=>(
                <div key={i} className="relative overflow-hidden rounded-2xl p-4 shadow-md group cursor-default" style={{background:s.g}}>
                  <div className="absolute -top-4 -right-4 w-16 h-12 rounded-full opacity-25 blur-xl"
                    style={{background:`radial-gradient(ellipse,${s.blob},transparent)`}} />
                  <div className="absolute top-0 right-10 w-px h-full bg-white/15 rotate-12 scale-y-150" />
                  <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1 relative z-10">{s.label}</p>
                  <p className="text-sm font-black text-white leading-tight relative z-10">{s.value}</p>
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                </div>
              ))}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Section title="Order Info" icon={Calendar} accent="linear-gradient(180deg,#2563eb,#60a5fa)">
                <div className="space-y-3">
                  <Field label="PO Number"     value={purchaseOrder.poNumber} mono />
                  <Field label="PO Date"       value={formatDate(purchaseOrder.poDate)} />
                  <Field label="Delivery Date" value={formatDate(purchaseOrder.deliveryDate)} />
                  <Field label="Payment Terms" value={purchaseOrder.paymentTerms} />
                  <Field label="Reference"     value={purchaseOrder.poreferencevalue} />
                  <Field label="Items"         value={`${purchaseOrder.items?.length||0} line items`} />
                </div>
              </Section>
              <Section title="Client Details" icon={User} accent="linear-gradient(180deg,#7c3aed,#a78bfa)">
                <div className="space-y-3">
                  <Field label="Name"       value={purchaseOrder.client?.name||purchaseOrder.vendor?.name} />
                  <Field label="Address"    value={purchaseOrder.client?.address||purchaseOrder.vendor?.address} />
                  <Field label="GSTIN"      value={purchaseOrder.client?.GSTIN||purchaseOrder.vendor?.GSTIN} mono />
                  <Field label="State Code" value={purchaseOrder.client?.stateCode||purchaseOrder.vendor?.stateCode} />
                </div>
              </Section>
              <Section title="Deliver To" icon={Truck} accent="linear-gradient(180deg,#059669,#34d399)">
                <div className="space-y-3">
                  <Field label="Name"    value={purchaseOrder.deliverTo?.name} />
                  <Field label="Address" value={purchaseOrder.deliverTo?.address} />
                  <Field label="GSTIN"   value={purchaseOrder.deliverTo?.GSTIN} mono />
                  <Field label="State"   value={purchaseOrder.deliverTo?.stateCode} />
                </div>
              </Section>
            </div>

            {/* Items table */}
            {purchaseOrder.items && purchaseOrder.items.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100"
                  style={{background:"linear-gradient(90deg,#f8fafc 0%,#eff6ff 100%)"}}>
                  <div className="w-1 h-5 rounded-full" style={{background:"linear-gradient(180deg,#1e3a8a,#60a5fa)"}} />
                  <Package size={13} className="text-slate-500" />
                  <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Items & Services</p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                    style={{background:"linear-gradient(135deg,#1e3a8a,#2563eb)"}}>{purchaseOrder.items.length}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{background:"linear-gradient(90deg,#f1f5f9 0%,#dbeafe 100%)"}}>
                        {["#","Description","HSN/SAC","Qty","Rate","Taxable Value","GST %","Total"].map(h=>(
                          <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchaseOrder.items.map((item,i)=>(
                        <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">{i+1}</td>
                          <td className="px-4 py-3"><p className="font-semibold text-slate-800">{item.description}</p></td>
                          <td className="px-4 py-3"><span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{item.hsnSac||"—"}</span></td>
                          <td className="px-4 py-3 font-bold text-slate-700 tabular-nums">{item.quantity}</td>
                          <td className="px-4 py-3 tabular-nums text-slate-700">{currency} {(item.rate||0).toFixed(2)}</td>
                          <td className="px-4 py-3 tabular-nums text-slate-700">{currency} {(item.taxableValue||0).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-black">{item.gstRate}%</span>
                          </td>
                          <td className="px-4 py-3 font-black text-slate-900 tabular-nums">{currency} {(item.total||0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{background:"linear-gradient(90deg,#f1f5f9 0%,#dbeafe 100%)"}}>
                        <td colSpan={4} className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Totals</td>
                        <td className="px-4 py-3 font-black text-slate-700 tabular-nums">{fmt(purchaseOrder.totalTaxableValue)}</td>
                        <td colSpan={2} className="px-4 py-3"></td>
                        <td className="px-4 py-3 font-black text-blue-700 tabular-nums text-sm">{fmt(purchaseOrder.totalAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Tax + Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Section title="Tax Breakdown" icon={Banknote} accent="linear-gradient(180deg,#d97706,#fbbf24)">
                <div className="space-y-2">
                  {[
                    { l:"Taxable Value", v:fmt(purchaseOrder.totalTaxableValue) },
                    { l:"CGST",          v:fmt(purchaseOrder.totalCGSTAmount) },
                    { l:"SGST",          v:fmt(purchaseOrder.totalSGSTAmount) },
                    { l:"IGST",          v:fmt(purchaseOrder.totalIGSTAmount) },
                  ].map(r=>(
                    <div key={r.l} className="flex justify-between py-1 border-b border-slate-100 last:border-0">
                      <span className="text-xs text-slate-500">{r.l}</span>
                      <span className="text-xs font-semibold text-slate-700 tabular-nums">{r.v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Total</span>
                    <span className="text-base font-black text-blue-700 tabular-nums">{fmt(purchaseOrder.totalAmount)}</span>
                  </div>
                </div>
              </Section>
              <Section title="Additional Info" icon={FileText} accent="linear-gradient(180deg,#7c3aed,#a78bfa)">
                <div className="space-y-3">
                  {purchaseOrder.notes && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notes</p>
                      <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100 italic">"{purchaseOrder.notes}"</p>
                    </div>
                  )}
                  <Field label="Currency"  value={currency} />
                  {purchaseOrder.poreferencevalue && <Field label="Reference" value={purchaseOrder.poreferencevalue} mono />}
                  <Field label="Signature" value={purchaseOrder.withSignature?"Included":"Not included"} />
                </div>
              </Section>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 rounded-b-2xl flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {onEdit && (
                <button onClick={()=>onEdit(purchaseOrder)} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all">
                  <Pencil size={11}/> Edit PO
                </button>
              )}
              {onDownloadPDF && (
                <button onClick={()=>onDownloadPDF(purchaseOrder)} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all">
                  <Download size={11}/> PDF
                </button>
              )}
              {purchaseOrder?._id && canCreateInvoice(purchaseOrder.status) && (
                <button
                  onClick={() => {
                    window.location.href = `/master-data/manual-invoice?poId=${purchaseOrder._id}`;
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-all"
                >
                  <FileText size={11}/> Create Invoice
                </button>
              )}
              {onDownloadWord && (
                <button onClick={()=>onDownloadWord(purchaseOrder)} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all">
                  <Download size={11}/> Word
                </button>
              )}
              {onEmail && (
                <button onClick={()=>onEmail(purchaseOrder)} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all">
                  <Mail size={11}/> Email
                </button>
              )}
              {onMarkReceived && (
                <button onClick={()=>onMarkReceived(purchaseOrder)} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all">
                  <CheckCircle size={11}/> Mark Received
                </button>
              )}
              {onDelete && (
                <button onClick={()=>onDelete(purchaseOrder)} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-red-500 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-all">
                  <Trash2 size={11}/> Delete
                </button>
              )}
            </div>
            <button onClick={onClose} className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all">Close</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PurchaseOrderDetailsModal;
