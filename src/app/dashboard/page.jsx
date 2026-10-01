"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  FileText,
  Layers3,
  Mail,
  Menu,
  Package,
  Plus,
  Search,
  Settings2,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const NAV = [
  ["overview", "Overview", BarChart3],
  ["invoice", "Invoices", FileText],
  ["clients", "Customers", Users],
  ["items", "Services", Package],
];
const STATUSES = ["all", "paid", "sent", "overdue", "draft", "cancelled"];
const money = (value, currency = "GBP") =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
const date = (value) =>
  value
    ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "-";
const statusClass = {
  paid: "status-paid",
  sent: "status-sent",
  overdue: "status-overdue",
  draft: "status-draft",
  cancelled: "status-cancelled",
};
const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12
    ? "Good morning"
    : hour < 18
      ? "Good afternoon"
      : "Good evening";
};

export default function DashboardPage() {
  const router = useRouter();
  const [view, setView] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [services, setServices] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all(
      ["/api/clients", "/api/invoices", "/api/items"].map((url) =>
        fetch(url).then(async (response) => {
          if (!response.ok)
            throw new Error(`Unable to load ${url.split("/").pop()}`);
          return response.json();
        }),
      ),
    )
      .then(([clients, invoiceData, items]) => {
        if (!active) return;
        setUsers(Array.isArray(clients) ? clients : []);
        setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
        setServices(Array.isArray(items) ? items : []);
      })
      .catch((fetchError) => active && setError(fetchError.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);
  const activeInvoices = invoices.filter(
    (invoice) => !["draft", "cancelled"].includes(invoice.status),
  );
  const metrics = useMemo(
    () => ({
      billed: activeInvoices.reduce(
        (sum, invoice) => sum + Number(invoice.total || 0),
        0,
      ),
      paid: invoices
        .filter((invoice) => invoice.status === "paid")
        .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
      overdue: invoices
        .filter((invoice) => invoice.status === "overdue")
        .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
    }),
    [invoices],
  );
  const filteredInvoices = invoices.filter((invoice) => {
    const term = query.toLowerCase();
    return (
      (status === "all" || invoice.status === status) &&
      (!term ||
        [
          invoice.invoiceNumber,
          invoice.customerName,
          invoice.customerEmail,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(term),
        ))
    );
  });
  const filteredUsers = users.filter((user) => {
    const term = query.toLowerCase();
    return (
      !term ||
      [user.name, user.email, user.customerId].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term),
      )
    );
  });
  const filteredServices = services.filter(
    (service) =>
      !query || service.name.toLowerCase().includes(query.toLowerCase()),
  );
  if (loading)
    return (
      <Shell>
        <div className="loading-state">
          <div className="loading-mark">
            <Layers3 className="h-5 w-5" />
          </div>
          <p>Preparing your UK delivery workspace...</p>
        </div>
      </Shell>
    );
  if (error)
    return (
      <Shell>
        <div className="error-state">
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </Shell>
    );
  return (
    <Shell>
      <div className="workspace-shell">
        <button
          type="button"
          className="mobile-menu-toggle"
          aria-label="Open navigation menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
        {mobileMenuOpen && (
          <button
            type="button"
            className="mobile-menu-backdrop"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        <aside
          className={`workspace-sidebar${mobileMenuOpen ? " mobile-menu-open" : ""}`}
        >
          <div className="brand-lockup">
            <span className="brand-mark">
              <Layers3 className="h-5 w-5" />
            </span>
            <span>
              <strong>ParcelFlow</strong>
              <small>UK delivery billing</small>
            </span>
            <button
              type="button"
              className="mobile-menu-close"
              aria-label="Close navigation menu"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="sidebar-label">Workspace</div>
          <nav className="sidebar-nav">
            {NAV.map(([id, label, Icon]) => (
              <button
                type="button"
                key={id}
                onClick={() => {
                  setView(id);
                  setQuery("");
                  setStatus("all");
                  setMobileMenuOpen(false);
                }}
                className={view === id ? "active" : ""}
              >
                <Icon className="h-4 w-4" />
                {label}
                {id === "invoices" && (
                  <span className="nav-count">{invoices.length}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-label">Shortcuts</div>
            <Link
              href="/dashboard/invoice"
              className="flex items-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Plus className="h-4 w-4" />
              New invoice
            </Link>
            <Link
              href="/dashboard/clients"
              className="flex items-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Users className="h-4 w-4" />
              New customer
            </Link>
            <Link
              href="/dashboard/items"
              className="flex items-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Package className="h-4 w-4" />
              New delivery service
            </Link>
          </div>
          <div className="sidebar-footer">
            <div className="avatar">PF</div>
            <div>
              <strong>Operations workspace</strong>
              <small>UK operations desk</small>
            </div>
            <Settings2 className="ml-auto h-4 w-4 text-white/40" />
          </div>
        </aside>
        <main className="workspace-main">
          <header className="workspace-header">
            <div>
              <p className="eyebrow">UK delivery operations</p>
              <h1>
                {view === "overview"
                  ? `${greeting()}, here is the pulse.`
                  : NAV.find(([id]) => id === view)?.[1]}
              </h1>
            </div>
            <div className="header-actions">
              <div className="search-box">
                <Search className="h-4 w-4" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search workspace"
                />
              </div>
              <Link
                href={`/dashboard/${view}`}
                className="primary-action"
              >
                <Plus className="h-4 w-4" />
                Create {view}
              </Link>
            </div>
          </header>
          {view === "overview" && (
            <Overview
              invoices={invoices}
              users={users}
              services={services}
              metrics={metrics}
              router={router}
              setView={setView}
            />
          )}
          {view === "invoices" && (
            <Invoices
              invoices={filteredInvoices}
              status={status}
              setStatus={setStatus}
              router={router}
            />
          )}
          {view === "clients" && (
            <Customers
              users={filteredUsers}
              router={router}
            />
          )}
          {view === "catalog" && <Services services={filteredServices} />}
        </main>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return <main className="app-canvas">{children}</main>;
}
function Overview({ invoices, users, services, metrics, router, setView }) {
  const recent = invoices.slice(0, 5);
  const health = ["paid", "sent", "overdue", "draft"].map((status) => ({
    status,
    count: invoices.filter((invoice) => invoice.status === status).length,
  }));
  return (
    <div className="overview-content">
      <section className="metric-grid">
        <Metric
          icon={WalletCards}
          label="Active billing"
          value={money(metrics.billed)}
          detail="Sent, paid, and overdue invoices"
          tone="mint"
        />
        <Metric
          icon={CheckCircle2}
          label="Collected"
          value={money(metrics.paid)}
          detail="Paid invoices to date"
          tone="blue"
        />
        <Metric
          icon={TrendingUp}
          label="Overdue"
          value={money(metrics.overdue)}
          detail="Requires attention"
          tone="coral"
        />
        <Metric
          icon={Users}
          label="Customers"
          value={users.length}
          detail={`${services.length} delivery services`}
          tone="gold"
        />
      </section>
      <section className="overview-grid">
        <div className="surface chart-surface">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Six month view</p>
              <h2>Revenue movement</h2>
            </div>
            <TrendingUp className="heading-icon h-4 w-4" />
          </div>
          <RevenueChart invoices={invoices} />
        </div>
        <div className="surface health-surface">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Portfolio</p>
              <h2>Invoice health</h2>
            </div>
            <span className="health-total">{invoices.length}</span>
          </div>
          <div className="health-list">
            {health.map(({ status, count }) => (
              <div key={status} className="health-row">
                <div>
                  <span className={`status-dot dot-${status}`} />
                  {status}
                  <strong>{count}</strong>
                </div>
                <div className="health-track">
                  <span
                    className={`track-${status}`}
                    style={{
                      width: `${invoices.length ? Math.max(4, (count / invoices.length) * 100) : 4}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="text-action"
            onClick={() => setView("invoices")}
          >
            View all invoices <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </section>
      <section className="surface recent-surface">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Latest activity</p>
            <h2>Recent invoices</h2>
          </div>
          <button
            type="button"
            className="text-action"
            onClick={() => setView("invoices")}
          >
            See all <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
        <InvoiceTable invoices={recent} router={router} />
      </section>
    </div>
  );
}
function Metric({ icon: Icon, label, value, detail, tone }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="metric-label">{label}</p>
      <strong className="metric-value">{value}</strong>
      <span className="metric-detail">{detail}</span>
    </div>
  );
}
function RevenueChart({ invoices }) {
  const points = Array.from({ length: 6 }, (_, index) => {
    const month = new Date();
    month.setMonth(month.getMonth() - (5 - index), 1);
    return {
      label: month.toLocaleDateString("en-GB", { month: "short" }),
      key: `${month.getFullYear()}-${month.getMonth()}`,
      total: invoices
        .filter(
          (invoice) =>
            ["paid", "sent", "overdue"].includes(invoice.status) &&
            new Date(invoice.issueDate).getFullYear() === month.getFullYear() &&
            new Date(invoice.issueDate).getMonth() === month.getMonth(),
        )
        .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
    };
  });
  const max = Math.max(...points.map((point) => point.total), 1);
  const line = points
    .map(
      (point, index) => `${(index / 5) * 100},${88 - (point.total / max) * 66}`,
    )
    .join(" ");
  return (
    <div className="chart-wrap">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="revenue-chart"
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#e9795d" stopOpacity=".25" />
            <stop offset="1" stopColor="#e9795d" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[22, 44, 66, 88].map((lineY) => (
          <line
            key={lineY}
            x1="0"
            x2="100"
            y1={lineY}
            y2={lineY}
            stroke="#dfe4df"
            strokeWidth=".6"
          />
        ))}
        <polygon points={`0,88 ${line} 100,88`} fill="url(#chart-fill)" />
        <polyline
          points={line}
          fill="none"
          stroke="#d7654d"
          strokeWidth="1.8"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((point, index) => (
          <circle
            key={point.key}
            cx={(index / 5) * 100}
            cy={88 - (point.total / max) * 66}
            r="1.8"
            fill="#fffdf8"
            stroke="#d7654d"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="chart-labels">
        {points.map((point) => (
          <span key={point.key}>{point.label}</span>
        ))}
      </div>
    </div>
  );
}
function Invoices({ invoices, status, setStatus, router }) {
  return (
    <section className="page-section">

      <div className="filter-row">
        {STATUSES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStatus(option)}
            className={status === option ? "filter-active" : ""}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="surface table-surface">
        <InvoiceTable invoices={invoices} router={router} />
      </div>
    </section>
  );
}
function Customers({ users, router }) {
  return (
    <section className="page-section">
      <div className="customer-grid">
        {users.map((user) => (
          <button
            type="button"
            key={user._id || user.customerId}
            onClick={() => router.push(`/dashboard/clients/${user.customerId}`)}
            className="customer-card"
          >
            <div className="customer-avatar">
              {user.name
                ?.split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div className="customer-info">
              <strong>{user.name}</strong>
              <span>{user.customerId}</span>
              <small>
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </small>
            </div>
            <ChevronRight className="customer-arrow h-4 w-4" />
          </button>
        ))}
        {!users.length && <Empty text="No customers match your search." />}
      </div>
    </section>
  );
}
function Services({ services }) {
  return (
    <section className="page-section">
      
      <div className="catalog-grid">
        {services.map((service) => (
          <article key={service._id} className="catalog-card">
            <div className="catalog-symbol">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3>{service.name}</h3>
              <p>Standard delivery charge</p>
            </div>
            <strong>{money(service.defaultPrice)}</strong>
            <span className="tax-pill">{service.taxRate || 0}% VAT</span>
          </article>
        ))}
        {!services.length && (
          <Empty text="No delivery services match your search." />
        )}
      </div>
    </section>
  );
}
function InvoiceTable({ invoices, router }) {
  if (!invoices.length) return <Empty text="No invoices to show yet." />;
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Customer</th>
            <th>Issued</th>
            <th>Due</th>
            <th>Status</th>
            <th className="align-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr
              key={invoice._id}
              onClick={() =>
                router.push(
                  `/dashboard/invoice/${encodeURIComponent(invoice.invoiceNumber)}`,
                )
              }
            >
              <td>
                <strong className="invoice-code">
                  {invoice.invoiceNumber}
                </strong>
              </td>
              <td>
                <strong>{invoice.customerName}</strong>
                <small>{invoice.customerEmail}</small>
              </td>
              <td>{date(invoice.issueDate)}</td>
              <td>{date(invoice.dueDate)}</td>
              <td>
                <span
                  className={`status-pill ${statusClass[invoice.status] || "status-draft"}`}
                >
                  {invoice.status}
                </span>
              </td>
              <td className="align-right">
                <strong>{money(invoice.total, invoice.currency)}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Empty({ text }) {
  return (
    <div className="empty-state">
      <Package className="h-7 w-7" />
      <p>{text}</p>
    </div>
  );
}
