import { useEffect, useState } from 'react';
import { getClientByIdApi } from '../apis/clientApi';
import {
  X, User, Phone, Mail, Globe, MapPin, Hash,
  CreditCard, Building2, CheckCircle, XCircle,
} from 'lucide-react';

/* ── helpers ──────────────────────────────────────────── */
const F = ({ label, value, mono }) => {
  const has = value !== null && value !== undefined && String(value).trim() !== '';
  return (
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      {has
        ? <p className={`text-xs font-semibold text-slate-800 break-words ${mono ? 'font-mono' : ''}`}>{value}</p>
        : <p className="text-xs text-slate-300 italic">—</p>
      }
    </div>
  );
};

const Section = ({ title, icon: Icon, accent, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100"
      style={{ background: 'linear-gradient(90deg,#f8fafc 0%,#eff6ff 100%)' }}>
      <div className="w-1 h-5 rounded-full shrink-0" style={{ background: accent }} />
      <Icon size={13} className="text-slate-500" />
      <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{title}</p>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

/* ── component ────────────────────────────────────────── */
const ClientDetailsModal = ({ isOpen, onClose, clientId }) => {
  const [client,  setClient]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!isOpen || !clientId) return;
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await getClientByIdApi(clientId);
        setClient(res.data);
      } catch (err) {
        setError('Failed to load client details');
        console.error(err);
      } finally { setLoading(false); }
    })();
  }, [isOpen, clientId]);

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!isOpen) return null;

  const taxFields = [
    { label: 'PAN',           key: 'panNumber' },
    { label: 'GST',           key: 'gstNumber' },
    { label: 'Tax ID Type',   key: 'taxIdentifierType' },
    { label: 'Tax ID Number', key: 'taxIdentificationNumber' },
    { label: 'EIN',           key: 'einNumber' },
    { label: 'SSN',           key: 'ssnNumber' },
    { label: 'VAT',           key: 'vatNumber' },
    { label: 'Company No.',   key: 'companyNumber' },
    { label: 'National ID',   key: 'nationalIdNumber' },
  ].filter(f => client?.[f.key] && String(client[f.key]).trim() !== '');

  const initial = (client?.clientName || '?')[0].toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl bg-slate-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="sticky top-0 z-10 rounded-t-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4"
            style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#60a5fa 100%)' }}>

            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white font-black text-base shrink-0">
                {loading ? '…' : initial}
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white tracking-tight leading-tight">
                  {loading ? 'Loading…' : (client?.clientName || 'Client Details')}
                </h2>
                {client?.clientCode && (
                  <p className="text-blue-200 text-[11px] font-mono mt-0.5">#{client.clientCode}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Active badge */}
              {client?.isActive !== undefined && (
                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${
                  client.isActive
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {client.isActive
                    ? <><CheckCircle size={10} /> Active</>
                    : <><XCircle size={10} /> Inactive</>}
                </span>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="p-5 space-y-4">

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Loading client details…</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <XCircle size={32} className="text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
            </div>
          )}

          {client && !loading && !error && (
            <>
              {/* Quick stat strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Payment Terms', value: client.paymentTerms || '—',  g: 'linear-gradient(135deg,#1e3a8a,#2563eb)', blob: '#93c5fd' },
                  { label: 'Country',       value: client.clientCountry || '—', g: 'linear-gradient(135deg,#064e3b,#059669)', blob: '#6ee7b7' },
                  { label: 'State',         value: client.clientState || '—',   g: 'linear-gradient(135deg,#78350f,#d97706)', blob: '#fde68a' },
                  { label: 'Status',        value: client.isActive ? 'Active' : 'Inactive', g: client.isActive ? 'linear-gradient(135deg,#064e3b,#059669)' : 'linear-gradient(135deg,#1f2937,#374151)', blob: '#d1fae5' },
                ].map((s, i) => (
                  <div key={i} className="relative overflow-hidden rounded-2xl p-3.5 shadow-md group cursor-default"
                    style={{ background: s.g }}>
                    <div className="absolute -top-4 -right-4 w-14 h-10 rounded-full opacity-25 blur-xl"
                      style={{ background: `radial-gradient(ellipse,${s.blob},transparent)` }} />
                    <div className="absolute top-0 right-8 w-px h-full bg-white/15 rotate-12 scale-y-150" />
                    <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-0.5 relative z-10">{s.label}</p>
                    <p className="text-xs font-black text-white leading-tight relative z-10 truncate">{s.value}</p>
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  </div>
                ))}
              </div>

              {/* Basic Info */}
              <Section title="Basic Information" icon={User} accent="linear-gradient(180deg,#2563eb,#60a5fa)">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <F label="Client Name"    value={client.clientName} />
                  <F label="Client Code"    value={client.clientCode} mono />
                  <F label="Payment Terms"  value={client.paymentTerms} />
                  <F label="Remarks"        value={client.remarks} />
                </div>
              </Section>

              {/* Contact Details */}
              <Section title="Contact Details" icon={Phone} accent="linear-gradient(180deg,#059669,#34d399)">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <F label="Contact Person"   value={client.contactPerson} />
                  <F label="Phone"            value={client.contactNumber} />
                  <F label="Alt Phone"        value={client.altContactNumber} />
                  <F label="Email"            value={client.email} />
                  <F label="Website"          value={client.website} />
                </div>
              </Section>

              {/* Address */}
              <Section title="Address" icon={MapPin} accent="linear-gradient(180deg,#d97706,#fbbf24)">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <F label="Address" value={client.clientAddress} />
                  </div>
                  <F label="City"       value={client.clientCity} />
                  <F label="State"      value={client.clientState} />
                  <F label="Country"    value={client.clientCountry} />
                  <F label="State Code" value={client.stateCode} />
                  <F label="PIN Code"   value={client.pinCode} />
                </div>
              </Section>

              {/* Tax Information */}
              <Section title="Tax Information" icon={CreditCard} accent="linear-gradient(180deg,#7c3aed,#a78bfa)">
                {taxFields.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {taxFields.map(f => (
                      <F key={f.key} label={f.label} value={client[f.key]} mono />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-300 italic">No tax information available</p>
                )}
              </Section>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailsModal;