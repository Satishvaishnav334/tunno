'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Printer, Save } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

const STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
const date = (value) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value)) : 'Not provided';
const money = (value, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0));

export default function InvoicePage() {
  const { invoiceNumber } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState(null);
  const [status, setStatus] = useState('draft');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!invoiceNumber) return; fetch(`/api/invoices/${encodeURIComponent(invoiceNumber)}`).then((response) => response.json()).then((data) => { if (data.error) throw new Error(data.error); setInvoice(data); setStatus(data.status); }).catch((fetchError) => setError(fetchError.message)); }, [invoiceNumber]);

  async function saveStatus() {
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/invoices/${encodeURIComponent(invoiceNumber)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update invoice status');
      setInvoice(data);
    } catch (saveError) { setError(saveError.message); } finally { setSaving(false); }
  }

  if (error && !invoice) return <main className="min-h-screen bg-slate-100 p-6 text-rose-700">{error}</main>;
  if (!invoice) return <main className="min-h-screen bg-slate-100 p-6 text-slate-600">Loading invoice...</main>;
  return <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:px-6 md:px-10"><div className="mx-auto max-w-4xl"><div className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-teal-700"><ArrowLeft className="h-4 w-4" /> Back</button><div className="flex items-center gap-2"><select aria-label="Invoice status" value={status} onChange={(event) => setStatus(event.target.value)} className="border border-slate-300 bg-white px-3 py-2 text-sm font-semibold capitalize text-slate-700 outline-none focus:border-teal-600">{STATUSES.map((option) => <option key={option} value={option}>{option}</option>)}</select><button type="button" onClick={saveStatus} disabled={saving || status === invoice.status} className="inline-flex items-center gap-2 bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Saving' : 'Save status'}</button><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><Printer className="h-4 w-4" /> Print</button></div></div>{error && <p className="mt-4 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<article className="mt-7 border border-slate-300 bg-white p-6 shadow-sm sm:p-10"><div className="flex flex-col gap-6 border-b-2 border-slate-900 pb-7 sm:flex-row sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-700">Invoice</p><h1 className="mt-2 text-3xl font-bold text-slate-950">{invoice.invoiceNumber}</h1></div><div className="text-sm sm:text-right"><p className="font-semibold uppercase text-slate-500">{invoice.status}</p><p className="mt-2 text-slate-600">Issued {date(invoice.issueDate)}</p><p className="text-slate-600">Due {date(invoice.dueDate)}</p></div></div><div className="grid gap-6 border-b border-slate-200 py-7 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Billed to</p><p className="mt-2 font-semibold text-slate-950">{invoice.customerName}</p><p className="text-sm text-slate-600">{invoice.customerEmail}</p><p className="mt-2 text-sm text-slate-600">{invoice.billingAddress?.addressLine}, {invoice.billingAddress?.city}</p><p className="text-sm text-slate-600">{invoice.billingAddress?.state}, {invoice.billingAddress?.postalCode}</p></div><div className="sm:text-right"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Payment method</p><p className="mt-2 text-sm capitalize text-slate-700">{invoice.paymentMethod?.replace('_', ' ') || 'Not specified'}</p></div></div><div className="mt-7 overflow-x-auto"><table className="w-full min-w-125 text-left text-sm"><thead className="border-b-2 border-slate-900 text-xs uppercase tracking-widest text-slate-500"><tr><th className="pb-3">Description</th><th className="pb-3 text-right">Qty</th><th className="pb-3 text-right">Price</th><th className="pb-3 text-right">Tax</th><th className="pb-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-200">{invoice.items.map((item) => <tr key={item._id}><td className="py-4 font-medium text-slate-950">{item.name}</td><td className="py-4 text-right text-slate-600">{item.quantity}</td><td className="py-4 text-right text-slate-600">{money(item.unitPrice, invoice.currency)}</td><td className="py-4 text-right text-slate-600">{item.taxRate || 0}%</td><td className="py-4 text-right font-semibold text-slate-950">{money(item.amount, invoice.currency)}</td></tr>)}</tbody></table></div><div className="mt-7 ml-auto max-w-xs space-y-3 text-sm"><Row label="Subtotal" value={invoice.subtotal} currency={invoice.currency} /><Row label="Tax" value={invoice.taxTotal} currency={invoice.currency} /><Row label="Discount" value={invoice.discount} currency={invoice.currency} /><Row label="Total" value={invoice.total} currency={invoice.currency} strong /></div>{invoice.notes && <p className="mt-8 border-t border-slate-200 pt-5 text-sm text-slate-600">{invoice.notes}</p>}</article></div></main>;
}

function Row({ label, value, currency, strong }) { return <div className={`flex justify-between ${strong ? 'border-t border-slate-300 pt-3 text-base font-bold' : 'text-slate-600'}`}><span>{label}</span><span className={strong ? 'text-teal-700' : 'text-slate-950'}>{money(value, currency)}</span></div>; }