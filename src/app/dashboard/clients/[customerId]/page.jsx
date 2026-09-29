'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, CircleDollarSign, ExternalLink, FileText, Mail, MapPin, Package, Pencil, Phone, Printer, Save, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

const STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
const money = (value, currency = 'GBP') => new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0));
const date = (value) => value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value)) : 'Not provided';
const initials = (name) => String(name || 'PF').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

export default function CustomerPage() {
  const { customerId } = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [services, setServices] = useState([]);
  const [rates, setRates] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState('');

  useEffect(() => {
    if (!customerId) return;
    Promise.all([
      fetch(`/api/clients/${encodeURIComponent(customerId)}`).then((response) => response.json()),
      fetch('/api/items').then((response) => response.json()),
    ]).then(([profile, catalog]) => {
      if (profile.error) throw new Error(profile.error);
      setCustomer(profile);
      setServices(catalog);
      setRates(Object.fromEntries((profile.itemPrices || []).map((entry) => [String(entry.item), String(entry.price)])));
    }).catch((fetchError) => setError(fetchError.message));
  }, [customerId]);

  async function saveRates() {
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(customerId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemPrices: services.map((service) => ({ item: String(service._id), price: Number(rates[String(service._id)] ?? service.defaultPrice ?? 0) })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update service rates');
      setCustomer((current) => ({ ...current, itemPrices: data.itemPrices }));
    } catch (saveError) { setError(saveError.message); } finally { setSaving(false); }
  }

  async function changeStatus(invoiceNumber, status) {
    setUpdating(invoiceNumber); setError('');
    try {
      const response = await fetch(`/api/invoices/${encodeURIComponent(invoiceNumber)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update invoice status');
      setCustomer((current) => ({ ...current, invoices: current.invoices.map((invoice) => invoice.invoiceNumber === invoiceNumber ? { ...invoice, status: data.status } : invoice) }));
    } catch (statusError) { setError(statusError.message); } finally { setUpdating(''); }
  }

  if (error && !customer) return <main className="min-h-screen bg-slate-100 p-6 text-rose-700">{error}</main>;
  if (!customer) return <main className="min-h-screen bg-slate-100 p-6 text-slate-600">Loading customer...</main>;

  const address = customer.addresses?.[0];
  const invoices = customer.invoices || [];
  const outstanding = invoices.filter((invoice) => ['sent', 'overdue'].includes(invoice.status)).reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
  const paid = invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
  const customRates = services.filter((service) => Number(rates[String(service._id)]) !== Number(service.defaultPrice));

  return <main className="customer-canvas"><div className="customer-page"><div className="customer-topbar"><button type="button" onClick={() => router.back()} className="back-link"><ArrowLeft className="h-4 w-4" /> Back to customers</button><div className="topbar-actions"><button type="button" onClick={() => window.print()} className="quiet-action"><Printer className="h-4 w-4" /> Print</button><Link href="/dashboard/invoice" className="customer-primary"><FileText className="h-4 w-4" /> New invoice</Link></div></div><section className="customer-hero"><div className="hero-identity"><div className="hero-avatar">{initials(customer.name)}</div><div><p className="customer-kicker">Customer account</p><h1>{customer.name}</h1><div className="hero-meta"><span><Mail className="h-4 w-4" />{customer.email}</span><span><UserRound className="h-4 w-4" />{customer.customerId}</span></div></div></div><div className="hero-status"><span className="live-dot" />Account active<small>UK delivery customer</small></div></section><section className="customer-stats"><Stat icon={FileText} label="Invoices" value={invoices.length} detail="All billing documents" /><Stat icon={CircleDollarSign} label="Outstanding" value={money(outstanding)} detail="Sent and overdue" tone="coral" /><Stat icon={Check} label="Collected" value={money(paid)} detail="Paid invoices" tone="mint" /><Stat icon={Package} label="Custom rates" value={customRates.length} detail={`of ${services.length} services`} tone="gold" /></section><div className="customer-layout"><aside className="customer-rail"><section className="profile-card"><div className="card-title"><MapPin className="h-4 w-4" /><h2>Billing address</h2></div>{address ? <div className="address-copy"><strong>{address.fullName}</strong><span>{address.addressLine}</span><span>{address.city}, {address.state}</span><span>{address.postalCode}, {address.country}</span><span><Phone className="h-3.5 w-3.5" />{address.mobile}</span></div> : <p className="muted-copy">No address recorded.</p>}</section><section className="rate-book"><div className="rate-book-header"><div><p className="customer-kicker">Pricebook</p><h2>Service rates</h2><p>Set the GBP charge this customer sees on future invoices.</p></div><div className="rate-count">{customRates.length}<small>custom</small></div></div><div className="rate-list">{services.map((service) => <RateRow key={service._id} service={service} value={rates[String(service._id)] ?? String(service.defaultPrice ?? '')} onChange={(value) => setRates({ ...rates, [String(service._id)]: value })} />)}</div>{error && <p className="rate-error">{error}</p>}<button type="button" onClick={saveRates} disabled={saving || !services.length} className="save-rates"><Save className="h-4 w-4" />{saving ? 'Saving changes...' : 'Save service rates'}</button></section></aside><section className="billing-column"><div className="billing-heading"><div><p className="customer-kicker">Account activity</p><h2>Invoice history</h2><p>Manage delivery billing and update invoice status.</p></div><Link href="/dashboard/invoice" className="text-link">Create invoice <ArrowUpRight className="h-4 w-4" /></Link></div>{invoices.length ? <div className="invoice-stack">{invoices.map((invoice) => <InvoiceCard key={invoice._id} invoice={invoice} updating={updating === invoice.invoiceNumber} onStatusChange={changeStatus} />)}</div> : <div className="empty-invoices"><FileText className="h-8 w-8" /><h3>No invoices yet</h3><p>Create the first delivery invoice for this customer.</p><Link href="/dashboard/invoice" className="customer-primary">Create invoice</Link></div>}</section></div></div></main>;
}

function Stat({ icon: Icon, label, value, detail, tone = 'blue' }) { return <div className="customer-stat"><span className={`stat-icon ${tone}`}><Icon className="h-4 w-4" /></span><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></div>; }
function RateRow({ service, value, onChange }) { const changed = Number(value) !== Number(service.defaultPrice); return <label className="rate-row"><span className="service-icon"><Package className="h-4 w-4" /></span><span className="rate-service"><strong>{service.name}</strong><small>Standard {money(service.defaultPrice)} · {service.taxRate || 0}% VAT</small></span>{changed && <span className="custom-tag">Custom</span>}<span className="rate-input"><span>£</span><input type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} aria-label={`${service.name} customer rate`} /></span></label>; }
function InvoiceCard({ invoice, updating, onStatusChange }) { return <article className="invoice-card"><div className="invoice-card-head"><div><div className="invoice-title-row"><strong>{invoice.invoiceNumber}</strong><span className={`status-pill status-${invoice.status}`}>{invoice.status}</span></div><p>Issued {date(invoice.issueDate)} <i /> Due {date(invoice.dueDate)}</p></div><div className="invoice-actions"><select aria-label="Invoice status" value={invoice.status} disabled={updating} onChange={(event) => onStatusChange(invoice.invoiceNumber, event.target.value)}>{STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select><Link href={`/dashboard/invoice/${encodeURIComponent(invoice.invoiceNumber)}`} title="Open invoice"><ExternalLink className="h-4 w-4" /></Link></div></div><div className="invoice-lines">{(invoice.items || []).map((item) => <div className="invoice-line" key={item._id}><span><strong>{item.name}</strong><small>{item.quantity} × {money(item.unitPrice, invoice.currency)} · {item.taxRate || 0}% VAT</small></span><b>{money(item.amount, invoice.currency)}</b></div>)}</div><div className="invoice-total"><span>Subtotal <b>{money(invoice.subtotal, invoice.currency)}</b></span><span>VAT <b>{money(invoice.taxTotal, invoice.currency)}</b></span><span className="total-line">Total <strong>{money(invoice.total, invoice.currency)}</strong></span></div></article>; }