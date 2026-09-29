'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, Plus, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const money = (value) => Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

export default function NewInvoicePage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ user: '', invoiceNumber: `INV-${Date.now().toString().slice(-6)}`, dueDate: '', status: 'draft', paymentMethod: 'upi', discount: 0, notes: '' });
  const [lines, setLines] = useState([{ item: '', quantity: 1 }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all(['/api/clients', '/api/items'].map((url) => fetch(url).then((response) => response.json())))
      .then(([clients, catalog]) => { setUsers(clients); setItems(catalog); })
      .catch(() => setError('Unable to load customers and items'));
  }, []);

  const customer = users.find((user) => String(user._id) === String(form.user));
  const availableItems = items.filter((item) => item.isActive !== false);
  const priceFor = (item) => customer?.itemPrices?.find((entry) => String(entry.item) === String(item?._id))?.price ?? item?.defaultPrice ?? 0;
  const totals = useMemo(() => lines.reduce((result, line) => {
    const item = availableItems.find((entry) => String(entry._id) === String(line.item));
    const amount = Number(priceFor(item)) * Number(line.quantity || 0);
    result.subtotal += amount;
    result.tax += amount * Number(item?.taxRate || 0) / 100;
    return result;
  }, { subtotal: 0, tax: 0 }), [lines, availableItems, customer]);
  const total = totals.subtotal + totals.tax - Number(form.discount || 0);
  const updateForm = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const updateLine = (index, name, value) => setLines(lines.map((line, lineIndex) => lineIndex === index ? { ...line, [name]: value } : line));
  const selectCustomer = (event) => { setForm({ ...form, user: event.target.value }); setLines([{ item: '', quantity: 1 }]); };

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const response = await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, items: lines }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create invoice');
      router.push('/dashboard');
    } catch (submitError) { setError(submitError.message); } finally { setSaving(false); }
  }

  return <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:px-6 md:px-10"><div className="mx-auto max-w-5xl"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-teal-700"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link><header className="mt-7 border-b border-slate-300 pb-6"><p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Billing workspace</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Create invoice</h1><p className="mt-2 text-sm text-slate-600">Saved customer prices are applied automatically to every line.</p></header><form onSubmit={submit} className="mt-7 grid gap-6 lg:grid-cols-[1fr_320px]"><div className="space-y-6"><section className="border border-slate-300 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 border-b border-slate-200 pb-4"><FileText className="h-5 w-5 text-teal-700" /><h2 className="font-semibold text-slate-950">Invoice details</h2></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Customer" name="user" value={form.user} onChange={selectCustomer} required as="select"><option value="">Select customer</option>{users.map((user) => <option key={user._id} value={user._id}>{user.name} ({user.customerId})</option>)}</Field><Field label="Invoice number" name="invoiceNumber" value={form.invoiceNumber} onChange={updateForm} required /><Field label="Due date" name="dueDate" type="date" value={form.dueDate} onChange={updateForm} required /><Field label="Payment method" name="paymentMethod" value={form.paymentMethod} onChange={updateForm} as="select">{['cash', 'card', 'bank_transfer', 'upi', 'other'].map((method) => <option key={method} value={method}>{method.replace('_', ' ')}</option>)}</Field></div></section><section className="border border-slate-300 bg-white p-5 shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 pb-4"><h2 className="font-semibold text-slate-950">Items</h2><button type="button" onClick={() => setLines([...lines, { item: '', quantity: 1 }])} className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700"><Plus className="h-4 w-4" /> Add item</button></div><div className="mt-4 space-y-3">{lines.map((line, index) => { const item = availableItems.find((entry) => String(entry._id) === String(line.item)); return <div key={`${index}-${line.item}`} className="grid gap-3 border-b border-slate-200 pb-4 sm:grid-cols-[1fr_110px_130px_40px] sm:items-end"><Field label="Item" value={line.item} onChange={(event) => updateLine(index, 'item', event.target.value)} required as="select"><option value="">Select item</option>{availableItems.map((option) => <option key={option._id} value={option._id}>{option.name}</option>)}</Field><Field label="Quantity" type="number" min="1" step="1" value={line.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} required /><div className="text-sm"><p className="text-slate-500">Price</p><p className="mt-2 font-semibold text-slate-950">{money(priceFor(item))}</p><p className="text-xs text-slate-500">{item?.taxRate || 0}% tax</p></div><button type="button" title="Remove item" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, lineIndex) => lineIndex !== index))} className="mb-1 p-2 text-slate-500 hover:text-rose-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></div>; })}</div></section><section className="border border-slate-300 bg-white p-5 shadow-sm"><div className="grid gap-4 sm:grid-cols-2"><Field label="Discount" name="discount" type="number" min="0" step="0.01" value={form.discount} onChange={updateForm} /><Field label="Notes" name="notes" value={form.notes} onChange={updateForm} /></div></section></div><aside className="h-fit border border-slate-300 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Invoice summary</p><div className="mt-6 space-y-4 text-sm"><Summary label="Subtotal" value={totals.subtotal} /><Summary label="Tax" value={totals.tax} /><Summary label="Discount" value={form.discount} /><div className="border-t border-slate-200 pt-4"><Summary label="Total" value={total} strong /></div></div>{error && <p className="mt-6 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<button type="submit" disabled={saving || !form.user} className="mt-7 inline-flex w-full items-center justify-center gap-2 bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Create invoice'}</button></aside></form></div></main>;
}

function Field({ label, as, children, ...props }) { const Component = as || 'input'; return <label className="block text-sm text-slate-700">{label}<Component {...props} className="mt-2 w-full border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-teal-600">{children}</Component></label>; }
function Summary({ label, value, strong }) { return <div className={strong ? 'flex justify-between text-base font-bold text-slate-950' : 'flex justify-between text-slate-600'}><span>{label}</span><span className={strong ? 'text-teal-700' : 'text-slate-950'}>{money(value)}</span></div>; }