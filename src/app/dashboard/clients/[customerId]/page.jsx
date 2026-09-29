'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Mail, MapPin, Printer, Save, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

const STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
const date = (value) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value)) : 'Not provided';
const money = (value, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0));
const statusClass = { draft: 'border-slate-300 bg-slate-100 text-slate-600', sent: 'border-sky-200 bg-sky-50 text-sky-700', paid: 'border-emerald-200 bg-emerald-50 text-emerald-700', overdue: 'border-rose-200 bg-rose-50 text-rose-700', cancelled: 'border-slate-200 bg-slate-50 text-slate-400' };

export default function CustomerPage() {
  const { customerId } = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [prices, setPrices] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingInvoice, setUpdatingInvoice] = useState('');

  useEffect(() => {
    if (!customerId) return;
    Promise.all([fetch(`/api/clients/${encodeURIComponent(customerId)}`).then((response) => response.json()), fetch('/api/items').then((response) => response.json())]).then(([profile, items]) => {
      if (profile.error) throw new Error(profile.error);
      setCustomer(profile);
      setCatalog(items);
      setPrices(Object.fromEntries((profile.itemPrices || []).map((entry) => [String(entry.item), String(entry.price)])));
    }).catch((fetchError) => setError(fetchError.message));
  }, [customerId]);

  async function updateInvoiceStatus(invoiceNumber, status) {
    setUpdatingInvoice(invoiceNumber); setError('');
    try {
      const response = await fetch(`/api/invoices/${encodeURIComponent(invoiceNumber)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      const updated = await response.json();
      if (!response.ok) throw new Error(updated.error || 'Unable to update invoice status');
      setCustomer((current) => ({ ...current, invoices: current.invoices.map((invoice) => invoice.invoiceNumber === invoiceNumber ? { ...invoice, status: updated.status } : invoice) }));
    } catch (statusError) { setError(statusError.message); } finally { setUpdatingInvoice(''); }
  }

  async function savePrices() {
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(customerId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemPrices: catalog.map((item) => { const itemId = String(item._id); return { item: itemId, price: Number(prices[itemId] ?? item.defaultPrice ?? 0) }; }) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update prices');
      setCustomer((current) => ({ ...current, itemPrices: data.itemPrices }));
    } catch (saveError) { setError(saveError.message); } finally { setSaving(false); }
  }

  if (error && !customer) return <main className="min-h-screen bg-slate-100 p-6 text-rose-700">{error}</main>;
  if (!customer) return <main className="min-h-screen bg-slate-100 p-6 text-slate-600">Loading customer...</main>;
  const address = customer.addresses?.[0];

  return <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:px-6 md:px-10"><div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-teal-700"><ArrowLeft className="h-4 w-4" /> Back to customers</button><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><Printer className="h-4 w-4" /> Print invoices</button></div><header className="mt-7 border-b border-slate-300 pb-7"><p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Customer workspace</p><div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-bold text-slate-950">{customer.name}</h1><div className="mt-2 flex flex-wrap gap-5 text-sm text-slate-600"><span className="inline-flex items-center gap-2"><Mail className="h-4 w-4 text-teal-700" />{customer.email}</span><span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4 text-teal-700" />{customer.customerId}</span></div></div><p className="text-sm text-slate-600">{customer.invoices?.length || 0} invoice{customer.invoices?.length === 1 ? '' : 's'}</p></div></header><section className="mt-7 grid gap-6 xl:grid-cols-[340px_1fr]"><aside className="space-y-6"><section className="border border-slate-300 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 border-b border-slate-200 pb-4"><MapPin className="h-5 w-5 text-teal-700" /><h2 className="font-semibold text-slate-950">Billing address</h2></div>{address ? <div className="mt-4 space-y-2 text-sm text-slate-600"><p className="font-semibold text-slate-950">{address.fullName}</p><p>{address.addressLine}</p><p>{address.city}, {address.state}</p><p>{address.postalCode}, {address.country}</p><p>{address.mobile}</p></div> : <p className="mt-4 text-sm text-slate-500">No address recorded.</p>}</section><section className="border border-slate-300 bg-white shadow-sm"><div className="border-b border-slate-200 p-5"><h2 className="font-semibold text-slate-950">Customer item prices</h2><p className="mt-1 text-sm text-slate-600">These prices are used on future invoices.</p></div><div className="divide-y divide-slate-200">{catalog.length ? catalog.map((item) => { const itemId = String(item._id); const currentPrice = prices[itemId] ?? String(item.defaultPrice ?? ''); const changed = Number(currentPrice) !== Number(item.defaultPrice); return <label key={itemId} className="block p-4"><span className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-800"><span>{item.name}</span>{changed && <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Custom</span>}</span><span className="mt-1 block text-xs text-slate-500">Default {money(item.defaultPrice)} · {item.taxRate || 0}% tax</span><span className="mt-2 flex items-center border border-slate-300 bg-slate-50"><span className="px-3 text-sm text-slate-500">INR</span><input type="number" min="0" step="0.01" value={currentPrice} onChange={(event) => setPrices({ ...prices, [itemId]: event.target.value })} className="w-full border-l border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-teal-600" /></span></label>; }) : <p className="p-5 text-sm text-slate-500">Add catalog items to assign customer prices.</p>}</div>{error && <p className="px-5 pt-4 text-sm text-rose-700">{error}</p>}<div className="p-5"><button type="button" onClick={savePrices} disabled={saving || !catalog.length} className="inline-flex w-full items-center justify-center gap-2 bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Saving prices...' : 'Save customer prices'}</button></div></section></aside><div className="space-y-5"><div className="flex items-end justify-between border-b border-slate-300 pb-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Billing history</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Manage invoices</h2></div><Link href="/dashboard/invoice" className="text-sm font-semibold text-teal-700 hover:text-teal-900">Create invoice</Link></div>{customer.invoices?.length ? customer.invoices.map((invoice) => <InvoiceCard key={invoice._id} invoice={invoice} updating={updatingInvoice === invoice.invoiceNumber} onStatusChange={updateInvoiceStatus} />) : <div className="border border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No invoices recorded for this customer.</div>}</div></section></div></main>;
}

function InvoiceCard({ invoice, updating, onStatusChange }) {
  return <article className="border border-slate-300 bg-white shadow-sm"><div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-3"><h3 className="font-bold text-slate-950">{invoice.invoiceNumber}</h3><span className={`border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass[invoice.status] || statusClass.draft}`}>{invoice.status}</span></div><div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500"><span>Issued {date(invoice.issueDate)}</span><span>Due {date(invoice.dueDate)}</span></div></div><div className="flex items-center gap-2"><label className="sr-only" htmlFor={`status-${invoice.invoiceNumber}`}>Invoice status</label><select id={`status-${invoice.invoiceNumber}`} value={invoice.status} disabled={updating} onChange={(event) => onStatusChange(invoice.invoiceNumber, event.target.value)} className="border border-slate-300 bg-white px-3 py-2 text-xs font-semibold capitalize text-slate-700 outline-none focus:border-teal-600">{STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select><Link href={`/dashboard/invoice/${encodeURIComponent(invoice.invoiceNumber)}`} title="Open invoice" className="inline-flex items-center gap-2 border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-teal-600 hover:text-teal-700"><ExternalLink className="h-3.5 w-3.5" /> Open</Link></div></div><div className="overflow-x-auto px-5"><table className="w-full min-w-125 text-left text-sm"><thead className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="py-3">Item</th><th className="py-3 text-right">Qty</th><th className="py-3 text-right">Price</th><th className="py-3 text-right">Tax</th><th className="py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{(invoice.items || []).map((item) => <tr key={item._id}><td className="py-3 font-medium text-slate-800">{item.name}</td><td className="py-3 text-right text-slate-500">{item.quantity}</td><td className="py-3 text-right text-slate-500">{money(item.unitPrice, invoice.currency)}</td><td className="py-3 text-right text-slate-500">{item.taxRate || 0}%</td><td className="py-3 text-right font-semibold text-slate-900">{money(item.amount, invoice.currency)}</td></tr>)}</tbody></table></div><div className="grid gap-2 border-t border-slate-200 p-5 text-sm sm:ml-auto sm:max-w-xs"><TotalRow label="Subtotal" value={invoice.subtotal} currency={invoice.currency} /><TotalRow label="Tax" value={invoice.taxTotal} currency={invoice.currency} /><TotalRow label="Discount" value={invoice.discount} currency={invoice.currency} /><TotalRow label="Total" value={invoice.total} currency={invoice.currency} strong /></div></article>;
}

function TotalRow({ label, value, currency, strong }) { return <div className={`flex justify-between ${strong ? 'border-t border-slate-300 pt-3 text-base font-bold text-slate-950' : 'text-slate-500'}`}><span>{label}</span><span className={strong ? 'text-teal-700' : 'text-slate-900'}>{money(value, currency)}</span></div>; }