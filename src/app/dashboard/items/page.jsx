'use client';

import { useState } from 'react';
import { ArrowLeft, Package, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewItemPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', defaultPrice: '', taxRate: '0' });
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  async function submit(event) { event.preventDefault(); setSaving(true); setError(''); try { const response = await fetch('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to create item'); router.push('/dashboard'); } catch (submitError) { setError(submitError.message); } finally { setSaving(false); } }
  return <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:px-6 md:px-10"><div className="mx-auto max-w-2xl"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-teal-700"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link><header className="mt-7 border-b border-slate-300 pb-6"><p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Catalog workspace</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Add item</h1><p className="mt-2 text-sm text-slate-600">Set the default price and tax used for new customers.</p></header><form onSubmit={submit} className="mt-7 border border-slate-300 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 border-b border-slate-200 pb-4"><Package className="h-5 w-5 text-teal-700" /><h2 className="font-semibold text-slate-950">Item details</h2></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Item name" name="name" value={form.name} onChange={update} required /><Field label="Default price" name="defaultPrice" type="number" min="0" step="0.01" value={form.defaultPrice} onChange={update} required /><Field label="Tax rate (%)" name="taxRate" type="number" min="0" max="100" step="0.01" value={form.taxRate} onChange={update} /></div>{error && <p className="mt-5 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<button type="submit" disabled={saving} className="mt-5 inline-flex items-center gap-2 bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save item'}</button></form></div></main>;
}

function Field({ label, ...props }) { return <label className="block text-sm text-slate-700">{label}<input {...props} className="mt-2 w-full border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-teal-600" /></label>; }