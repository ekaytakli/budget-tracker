import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import api from "../api/axios";
import { message } from "../api/errors";
import "./Workspace.css";
import "./LedgerTheme.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);
const money = (value) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
    value || 0,
  );
const dateText = (value) =>
  value
    ? new Intl.DateTimeFormat("tr-TR").format(new Date(`${value}T12:00:00`))
    : "—";
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const roles = {
  ADMIN: "Yönetici",
  ACCOUNTANT: "Muhasebe",
  VIEWER: "Görüntüleme",
  USER: "Kullanıcı",
};
const kinds = {
  CUSTOMER: "Müşteri",
  SUPPLIER: "Tedarikçi",
  BOTH: "Müşteri / Tedarikçi",
};
const tabs = [
  ["overview", "Genel bakış", "◫"],
  ["ledger", "Hesap hareketleri", "⇄"],
  ["reports", "Dönem raporları", "▥"],
  ["parties", "Cari hesaplar", "▦"],
  ["categories", "Kategoriler", "▤"],
  ["audit", "İşlem geçmişi", "◷"],
  ["users", "Ekip ve yetkiler", "♙"],
];
const blankFilters = {
  q: "",
  start: "",
  end: "",
  type: "",
  categoryId: "",
  counterpartyId: "",
  status: "",
  includeCancelled: false,
};
const freshEntry = () => ({
  type: "EXPENSE",
  amount: "",
  date: localToday(),
  description: "",
  categoryId: "",
  counterpartyId: "",
  documentNumber: "",
  department: "",
  dueDate: "",
  paymentStatus: "PAID",
});
const toParams = (filters) =>
  Object.fromEntries(
    Object.entries(filters).filter(
      ([, v]) => v !== "" && v !== false && v != null,
    ),
  );

function Field({ label, children, wide = false }) {
  const id = useId();
  return (
    <div className={`ws-field ${wide ? "wide" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {typeof children === "function" ? children(id) : children}
    </div>
  );
}
function Modal({ title, onClose, children, busy }) {
  const dialog = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    return () => node.close();
  }, []);
  return (
    <dialog
      className="ws-dialog"
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header>
        <div>
          <span className="eyebrow">ŞİRKET FİNANS</span>
          <h2 id={titleId}>{title}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Pencereyi kapat"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
function Metric({ label, value, hint, tone = "" }) {
  return (
    <article className={`ws-metric ${tone}`}>
      <span>{label}</span>
      <strong>{money(value)}</strong>
      <small>{hint}</small>
    </article>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [me, setMe] = useState(null);
  const [summary, setSummary] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [entries, setEntries] = useState({
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
  });
  const [categories, setCategories] = useState([]);
  const [parties, setParties] = useState([]);
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState({ content: [], number: 0, totalPages: 0 });
  const [auditPage, setAuditPage] = useState(0);
  const [draft, setDraft] = useState({ ...blankFilters });
  const [request, setRequest] = useState({
    filters: { ...blankFilters },
    page: 0,
  });
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const canWrite = me && ["ADMIN", "ACCOUNTANT"].includes(me.role);
  const isAdmin = me?.role === "ADMIN";
  const refresh = useCallback(() => setRevision((x) => x + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const config = { signal: controller.signal };
    // Synchronise request status with the external API request.
    /* oxlint-disable react/set-state-in-effect */
    setLoading(true);
    setError("");
    /* oxlint-enable react/set-state-in-effect */
    const params = toParams(request.filters);
    Promise.all([
      api.get("/users/me", config),
      api.get("/company/transactions", {
        ...config,
        params: { ...params, page: request.page, size: 30 },
      }),
      api.get("/company/summary", { ...config, params }),
      api.get("/company/categories", config),
      api.get("/company/counterparties", config),
      api.get("/company/reports", { ...config, params }),
    ])
      .then(([u, t, s, c, p, reports]) => {
        if (controller.signal.aborted) return;
        if (t.data.totalPages > 0 && request.page >= t.data.totalPages) {
          setRequest((r) => ({ ...r, page: t.data.totalPages - 1 }));
          return;
        }
        setMe(u.data);
        setEntries(t.data);
        setSummary(s.data);
        setCategories(c.data);
        setParties(p.data);
        setPeriods(reports.data);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [request, revision]);

  useEffect(() => {
    if (!isAdmin || !["audit", "users"].includes(tab)) return;
    const controller = new AbortController();
    const url = tab === "audit" ? "/company/audit" : "/users";
    api
      .get(url, {
        signal: controller.signal,
        params: tab === "audit" ? { page: auditPage } : {},
      })
      .then((r) => {
        if (!controller.signal.aborted) {
          if (tab === "audit") setAudit(r.data);
          else setUsers(r.data);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      });
    return () => controller.abort();
  }, [tab, isAdmin, auditPage, revision]);

  function open(kind, value) {
    setFormError("");
    if (kind === "entry")
      setForm(
        value
          ? {
              ...value,
              amount: String(value.amount),
              counterpartyId: value.counterpartyId || "",
              documentNumber: value.documentNumber || "",
              department: value.department || "",
              dueDate: value.dueDate || "",
              description: value.description || "",
            }
          : freshEntry(),
      );
    if (kind === "party")
      setForm({
        name: "",
        taxNumber: "",
        email: "",
        phone: "",
        kind: "CUSTOMER",
      });
    if (kind === "category") setForm({ name: "", type: "EXPENSE" });
    if (kind === "user") setForm({ username: "", email: "", password: "" });
    if (kind === "password")
      setForm({ currentPassword: "", newPassword: "", confirmation: "" });
    if (kind === "cancel")
      setForm({ id: value.id, version: value.version, reason: "" });
    setModal(kind);
  }
  const change = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError("");
    try {
      if (modal === "entry") {
        const payload = {
          ...form,
          categoryId: Number(form.categoryId),
          counterpartyId: form.counterpartyId
            ? Number(form.counterpartyId)
            : null,
          dueDate: form.dueDate || null,
        };
        if (form.id) await api.put(`/company/transactions/${form.id}`, payload);
        else await api.post("/company/transactions", payload);
      }
      if (modal === "party") await api.post("/company/counterparties", form);
      if (modal === "category") await api.post("/company/categories", form);
      if (modal === "user") await api.post("/users", form);
      if (modal === "password") {
        if (form.newPassword !== form.confirmation)
          throw new Error("Parola tekrarı eşleşmiyor.");
        await api.post("/users/me/password", {
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        });
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        navigate("/login");
        return;
      }
      if (modal === "cancel")
        await api.post(`/company/transactions/${form.id}/cancel`, {
          reason: form.reason,
          version: form.version,
        });
      setModal(null);
      setNotice("Kayıt başarıyla kaydedildi.");
      refresh();
    } catch (e) {
      setFormError(e.response || e.request ? message(e) : e.message);
    } finally {
      setSaving(false);
    }
  }
  async function setRole(id, role, active) {
    setSaving(true);
    setError("");
    try {
      await api.patch(`/users/${id}/role`, { role, active });
      setNotice("Kullanıcı yetkisi güncellendi.");
      refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setSaving(false);
    }
  }
  async function exportCsv() {
    setExporting(true);
    setError("");
    try {
      const response = await api.get("/company/export", {
        params: toParams(request.filters),
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hesap-kayitlari-${localToday()}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      if (e.response?.data instanceof Blob) {
        try {
          const data = JSON.parse(await e.response.data.text());
          setError(data.message || "Dışa aktarma başarısız.");
        } catch {
          setError("Dışa aktarma başarısız.");
        }
      } else setError(message(e));
    } finally {
      setExporting(false);
    }
  }
  function applyFilters(e) {
    e.preventDefault();
    if (draft.start && draft.end && draft.start > draft.end) {
      setError("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
      return;
    }
    setRequest({ filters: { ...draft }, page: 0 });
  }
  const visibleTabs = tabs.filter(
    ([key]) => !["users", "audit"].includes(key) || isAdmin,
  );
  const title = tabs.find(([key]) => key === tab)?.[1];
  const pendingCount = Object.entries(toParams(request.filters)).length;
  function showPending(type) {
    const filters = {
      ...request.filters,
      type,
      status: "PENDING",
      categoryId: "",
      includeCancelled: false,
    };
    setDraft(filters);
    setRequest({ filters, page: 0 });
    setTab("ledger");
  }
  const chart = {
    labels: ["Gelir", "Gider"],
    datasets: [
      {
        label: "Kaydedilen toplam",
        data: [summary?.income || 0, summary?.expense || 0],
        backgroundColor: "#dfd9cd",
        borderRadius: 0,
      },
      {
        label: "Tahsil / Ödeme",
        data: [summary?.received || 0, summary?.paid || 0],
        backgroundColor: ["#343f38", "#d3532e"],
        borderRadius: 0,
      },
    ],
  };

  return (
    <div className="workspace">
      <aside className="ws-sidebar">
        <a className="ws-brand" href="/dashboard">
          <span className="brand-symbol">bt.</span>
          <span>
            budget<span className="brand-light">tracker</span>
          </span>
        </a>
        <nav aria-label="Ana menü">
          {visibleTabs.map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? "selected" : ""}
              aria-current={tab === key ? "page" : undefined}
              onClick={() => {
                setTab(key);
                setError("");
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <details className="ws-account">
          <summary>{me?.username || "Hesabım"}</summary>
          <div className="ws-account-menu">
            <small>{roles[me?.role] || "Oturum kontrolü"}</small>
            <button className="ws-button" onClick={() => open("password")}>
              Parola değiştir
            </button>
            <button
              className="ws-button"
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("username");
                navigate("/login");
              }}
            >
              Çıkış
            </button>
          </div>
        </details>
      </aside>
      <main className="ws-main">
        <div className="ws-content">
          <div className="ws-heading">
            <div>
              <h1>{title}</h1>
              <p className="ws-heading-context">
                {pendingCount ? "Seçili filtrelere göre şirket kayıtları" : "Şirketinizin ortak finans çalışma alanı"}
              </p>
            </div>
            <div className="ws-actions">
              <button
                className="ws-button"
                onClick={refresh}
                disabled={loading}
              >
                ↻ Yenile
              </button>
              {canWrite && (
                <button
                  className="ws-button primary"
                  onClick={() =>
                    open(
                      tab === "parties"
                        ? "party"
                        : tab === "categories"
                          ? "category"
                          : tab === "users"
                            ? "user"
                            : "entry",
                    )
                  }
                >
                  ＋{" "}
                  {tab === "parties"
                    ? "Cari hesap"
                    : tab === "categories"
                      ? "Kategori"
                      : tab === "users"
                        ? "Ekip üyesi"
                        : "Yeni işlem"}
                </button>
              )}
            </div>
          </div>
          {error && (
            <div role="alert" className="ws-alert error">
              {error}{" "}
              {summary && "Ekrandaki veriler son başarılı yüklemeye aittir."}
              <button onClick={() => setError("")} aria-label="Uyarıyı kapat">
                ×
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="ws-alert success">
              {notice}
              <button
                onClick={() => setNotice("")}
                aria-label="Bildirimi kapat"
              >
                ×
              </button>
            </div>
          )}
          {loading && (
            <div className="ws-loading" role="status">
              Kayıtlar güncelleniyor…
            </div>
          )}
          {!loading && error && !summary && (
            <div className="ws-panel ws-empty">
              <h3>Kayıtlar yüklenemedi</h3>
              <p>Bağlantı sağlandığında finansal bilgileriniz burada görünecek.</p>
              <button className="ws-button" onClick={refresh}>Tekrar dene</button>
            </div>
          )}

          {["overview", "ledger", "reports"].includes(tab) && (
            <>
              <details className="ws-filter-disclosure ws-panel">
                <summary>Filtreler <span>{pendingCount ? `${pendingCount} filtre aktif` : "Tüm kayıtlar"}</span></summary>
                <form
                className="ws-filters ws-panel"
                onSubmit={applyFilters}
                aria-label="Kayıt filtreleri"
              >
                <div className="filter-fields">
                  <Field label="Arama">
                    {(id) => (
                      <input
                        id={id}
                        placeholder="Belge, açıklama, departman…"
                        maxLength={100}
                        value={draft.q}
                        onChange={(e) =>
                          setDraft({ ...draft, q: e.target.value })
                        }
                      />
                    )}
                  </Field>
                  <Field label="Başlangıç">
                    {(id) => (
                      <input
                        id={id}
                        type="date"
                        value={draft.start}
                        onChange={(e) =>
                          setDraft({ ...draft, start: e.target.value })
                        }
                      />
                    )}
                  </Field>
                  <Field label="Bitiş">
                    {(id) => (
                      <input
                        id={id}
                        type="date"
                        value={draft.end}
                        onChange={(e) =>
                          setDraft({ ...draft, end: e.target.value })
                        }
                      />
                    )}
                  </Field>
                  <Field label="İşlem türü">
                    {(id) => (
                      <select
                        id={id}
                        value={draft.type}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            type: e.target.value,
                            categoryId: "",
                          })
                        }
                      >
                        <option value="">Tüm türler</option>
                        <option value="INCOME">Gelir</option>
                        <option value="EXPENSE">Gider</option>
                      </select>
                    )}
                  </Field>
                  <Field label="Kategori">
                    {(id) => (
                      <select
                        id={id}
                        value={draft.categoryId}
                        onChange={(e) =>
                          setDraft({ ...draft, categoryId: e.target.value })
                        }
                      >
                        <option value="">Tüm kategoriler</option>
                        {categories
                          .filter((c) => !draft.type || c.type === draft.type)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    )}
                  </Field>
                  <Field label="Cari hesap">
                    {(id) => (
                      <select
                        id={id}
                        value={draft.counterpartyId}
                        onChange={(e) =>
                          setDraft({ ...draft, counterpartyId: e.target.value })
                        }
                      >
                        <option value="">Tüm cariler</option>
                        {parties.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                  <Field label="Ödeme durumu">
                    {(id) => (
                      <select
                        id={id}
                        value={draft.status}
                        onChange={(e) =>
                          setDraft({ ...draft, status: e.target.value })
                        }
                      >
                        <option value="">Tüm durumlar</option>
                        <option value="PAID">Tahsil edildi / Ödendi</option>
                        <option value="PENDING">Bekliyor</option>
                      </select>
                    )}
                  </Field>
                  <div className="filter-buttons">
                    <button
                      className="ws-button primary"
                      type="submit"
                      disabled={loading}
                    >
                      Uygula
                    </button>
                    <button
                      className="ws-button"
                      type="button"
                      onClick={() => {
                        setDraft({ ...blankFilters });
                        setRequest({ filters: { ...blankFilters }, page: 0 });
                      }}
                    >
                      Temizle
                    </button>
                  </div>
                </div>
                <label className="ws-checkbox">
                  <input
                    type="checkbox"
                    checked={draft.includeCancelled}
                    onChange={(e) =>
                      setDraft({ ...draft, includeCancelled: e.target.checked })
                    }
                  />{" "}
                  İptal edilenleri listede göster
                </label>
              </form>
              </details>
              {summary && (
                <>
                  <div className="ws-metrics">
                    <Metric
                      label="Toplam gelir"
                      value={summary.income}
                      hint="Tahsil edilmiş + bekleyen"
                      tone="green"
                    />
                    <Metric
                      label="Toplam gider"
                      value={summary.expense}
                      hint="Ödenmiş + bekleyen"
                      tone="orange"
                    />
                    <Metric
                      label="Net gelir − gider"
                      value={summary.net}
                      hint="Nakit bakiyesi değildir"
                    />
                    <Metric
                      label="Net nakit hareketi"
                      value={summary.cashBalance}
                      hint="Tahsilat − ödeme · Açılış bakiyesi hariç"
                      tone="dark"
                    />
                  </div>
                  {tab === "overview" && (
                    <div className="ws-pending-links" aria-label="Bekleyen işlemler">
                      <button onClick={() => showPending("INCOME")} disabled={loading}>
                        <span>Bekleyen alacak <strong className="positive">{money(summary.receivable)}</strong></span>
                        <span aria-hidden="true">→</span>
                      </button>
                      <button onClick={() => showPending("EXPENSE")} disabled={loading}>
                        <span>Bekleyen borç <strong className="negative">{money(summary.payable)}</strong></span>
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  )}
                  {tab === "overview" && (
                    <details className="ws-overview-details">
                      <summary>Grafik ve ödeme detayları</summary>
                      <div className="ws-overview-grid">
                      <section className="ws-panel">
                        <div className="panel-title">
                          <div>
                            <h2>Gelir ve gider dengesi</h2>
                            <p>
                              {pendingCount
                                ? "Uygulanan filtrelere göre"
                                : "Tüm kayıtlar üzerinden"}{" "}
                              · Türk lirası
                            </p>
                          </div>
                          <span className="ws-chip">TRY</span>
                        </div>
                        <div className="ws-chart">
                          <Bar
                            data={chart}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  position: "bottom",
                                  labels: { usePointStyle: true, padding: 20 },
                                },
                              },
                              scales: {
                                x: { grid: { display: false } },
                                y: {
                                  beginAtZero: true,
                                  ticks: {
                                    callback: (v) =>
                                      new Intl.NumberFormat("tr-TR", {
                                        notation: "compact",
                                      }).format(v),
                                  },
                                  border: { display: false },
                                },
                              },
                            }}
                          />
                        </div>
                      </section>
                      <section className="ws-panel obligations">
                        <div className="panel-title">
                          <div>
                            <h2>Tahsilat ve ödemeler</h2>
                            <p>Bekleyen kayıtların toplamı</p>
                          </div>
                          <span aria-hidden="true">◷</span>
                        </div>
                        <div>
                          <span>Bekleyen alacak</span>
                          <strong className="positive">
                            {money(summary.receivable)}
                          </strong>
                        </div>
                        <div>
                          <span>Bekleyen borç</span>
                          <strong>{money(summary.payable)}</strong>
                        </div>
                        <div className="overdue">
                          <span>Vadesi geçen toplam</span>
                          <strong>{money(summary.overdue)}</strong>
                          <small>Ödenmemiş gelir ve giderler birlikte</small>
                        </div>
                        <p className="muted">
                          İptal edilen kayıtlar hesaplamaya katılmaz.
                        </p>
                      </section>
                    </div>
                    </details>
                  )}
                </>
              )}
              <section className="ws-panel ledger-panel">
                <div className="panel-title">
                  <div>
                    <h2>
                      {tab === "overview"
                        ? "Son hesap hareketleri"
                        : "Hesap hareketleri"}{" "}
                      <span className="count-badge">
                        {entries.totalElements}
                      </span>
                    </h2>
                    <p>
                      Belge, cari hesap ve ödeme durumu birlikte takip edilir.
                    </p>
                  </div>
                  <button
                    className="ws-button"
                    onClick={exportCsv}
                    disabled={loading || exporting}
                  >
                    {exporting ? "Hazırlanıyor…" : "↓ CSV indir"}
                  </button>
                </div>
                <div className="ws-table-wrap">
                  <table className={`ws-table ${entries.content.length ? "" : "ws-table-empty"}`}>
                    <thead>
                      <tr>
                        <th>Tarih / Belge</th>
                        <th>İşlem / Cari hesap</th>
                        <th>Kategori</th>
                        <th>Durum / Vade</th>
                        <th className="number">Tutar</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.content.map((e) => (
                        <tr
                          key={e.id}
                          className={e.cancelled ? "cancelled" : ""}
                        >
                          <td>
                            <strong>{dateText(e.date)}</strong>
                            <small>
                              {e.documentNumber ||
                                `#${String(e.id).padStart(5, "0")}`}
                            </small>
                          </td>
                          <td>
                            <strong>
                              {e.description ||
                                (e.type === "INCOME"
                                  ? "Gelir kaydı"
                                  : "Gider kaydı")}
                            </strong>
                            <small>
                              {e.counterpartyName || "Cari hesap yok"}
                              {e.department ? ` · ${e.department}` : ""}
                            </small>
                          </td>
                          <td>
                            <span className="category-tag">
                              {e.categoryName}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`status-pill ${e.cancelled ? "cancelled" : e.paymentStatus === "PAID" ? "paid" : "pending"}`}
                            >
                              {e.cancelled
                                ? "İptal"
                                : e.paymentStatus === "PAID"
                                  ? e.type === "INCOME"
                                    ? "Tahsil edildi"
                                    : "Ödendi"
                                  : "Bekliyor"}
                            </span>
                            {e.dueDate && (
                              <small
                                className={
                                  !e.cancelled &&
                                  e.paymentStatus === "PENDING" &&
                                  e.dueDate < localToday()
                                    ? "negative"
                                    : ""
                                }
                              >
                                {dateText(e.dueDate)}
                              </small>
                            )}
                          </td>
                          <td
                            className={`number ${e.type === "INCOME" ? "positive" : "negative"}`}
                          >
                            <strong>
                              {e.type === "INCOME" ? "+" : "−"}
                              {money(e.amount)}
                            </strong>
                          </td>
                          <td>
                            {canWrite && !e.cancelled ? (
                              <div className="row-actions">
                                <button onClick={() => open("entry", e)}>
                                  Düzenle
                                </button>
                                <button
                                  className="negative"
                                  onClick={() => open("cancel", e)}
                                >
                                  İptal et
                                </button>
                              </div>
                            ) : (
                              <span
                                className="muted"
                                title={e.cancellationReason || ""}
                              >
                                {e.cancelled
                                  ? e.cancellationReason
                                  : "Salt okunur"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {!entries.content.length && !loading && !error && (
                        <tr>
                          <td colSpan="6">
                            <div className="ws-empty">
                              <span>⇄</span>
                              <h3>{pendingCount ? "Filtrelere uygun hareket yok" : "Henüz bir hareket yok"}</h3>
                              <p>
                                {pendingCount
                                  ? "Filtrelerinizi genişletin veya temizleyin."
                                  : "İlk gelir veya gider kaydınızı ekleyerek başlayın."}
                              </p>
                              {pendingCount ? (
                                <button className="ws-button" onClick={() => {
                                  setDraft({ ...blankFilters });
                                  setRequest({ filters: { ...blankFilters }, page: 0 });
                                }}>Filtreleri temizle</button>
                              ) : canWrite && (
                                <button
                                  className="ws-button primary"
                                  onClick={() => open("entry")}
                                >
                                  ＋ İlk işlemi ekle
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="ws-pagination">
                  <span>
                    {entries.totalElements} kayıt · Sayfa{" "}
                    {entries.totalPages ? request.page + 1 : 0} /{" "}
                    {entries.totalPages}
                  </span>
                  <div>
                    <button
                      className="ws-button"
                      disabled={loading || request.page === 0}
                      onClick={() =>
                        setRequest((r) => ({ ...r, page: r.page - 1 }))
                      }
                    >
                      ← Önceki
                    </button>
                    <button
                      className="ws-button"
                      disabled={
                        loading || request.page + 1 >= entries.totalPages
                      }
                      onClick={() =>
                        setRequest((r) => ({ ...r, page: r.page + 1 }))
                      }
                    >
                      Sonraki →
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}

          {tab === "parties" && (
            <section className="ws-panel">
              <div className="panel-title">
                <div>
                  <h2>
                    Müşteri ve tedarikçiler{" "}
                    <span className="count-badge">{parties.length}</span>
                  </h2>
                  <p>
                    Bakiyeler tüm iptal edilmemiş bekleyen kayıtlardan
                    hesaplanır.
                  </p>
                </div>
              </div>
              <div className="ws-table-wrap">
                <table className="ws-table">
                  <thead>
                    <tr>
                      <th>Ünvan / Vergi no</th>
                      <th>Tür</th>
                      <th>İletişim</th>
                      <th className="number">Alacak</th>
                      <th className="number">Borç</th>
                      <th>Ekstre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parties.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.name}</strong>
                          <small>{p.taxNumber || "Vergi no girilmedi"}</small>
                        </td>
                        <td>{kinds[p.kind]}</td>
                        <td>
                          {p.email || "—"}
                          <small>{p.phone}</small>
                        </td>
                        <td className="number positive">
                          {money(p.receivable)}
                        </td>
                        <td className="number negative">{money(p.payable)}</td>
                        <td>
                          <button
                            className="ws-button"
                            onClick={() => {
                              const filters = {
                                ...blankFilters,
                                counterpartyId: String(p.id),
                              };
                              setDraft(filters);
                              setRequest({ filters, page: 0 });
                              setTab("ledger");
                            }}
                          >
                            Hareketleri gör →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!parties.length && (
                <div className="ws-empty">
                  <h3>Cari hesap ekleyin</h3>
                  <p>
                    Müşteri ve tedarikçi bazında alacak ve borçlarınızı takip
                    edin.
                  </p>
                </div>
              )}
            </section>
          )}
          {tab === "categories" && (
            <section className="ws-panel">
              <div className="panel-title">
                <div>
                  <h2>Gelir ve gider kategorileri</h2>
                  <p>
                    İşlem türüne uygun kategoriler kayıt sırasında otomatik
                    süzülür.
                  </p>
                </div>
              </div>
              <div className="ws-category-grid">
                {["INCOME", "EXPENSE"].map((type) => (
                  <div key={type}>
                    <h3>
                      {type === "INCOME"
                        ? "Gelir kategorileri"
                        : "Gider kategorileri"}
                    </h3>
                    {categories
                      .filter((c) => c.type === type)
                      .map((c) => (
                        <div className="category-item" key={c.id}>
                          <span
                            className={`category-dot ${type === "INCOME" ? "green" : "orange"}`}
                          />
                          {c.name}
                          <small>#{c.id}</small>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </section>
          )}
          {tab === "users" && isAdmin && (
            <section className="ws-panel">
              <div className="panel-title">
                <div>
                  <h2>Ekip erişimi</h2>
                  <p>
                    Tüm üyeler aynı şirket kayıtlarını görür. Yeni üyeler salt
                    görüntüleme yetkisiyle oluşturulur.
                  </p>
                </div>
              </div>
              <div className="ws-table-wrap">
                <table className="ws-table">
                  <thead>
                    <tr>
                      <th>Kullanıcı</th>
                      <th>E-posta</th>
                      <th>Yetki</th>
                      <th>Erişim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.username}</strong>
                          {u.id === me.id && <small>Bu sizsiniz</small>}
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <select
                            aria-label={`${u.username} yetkisi`}
                            value={u.role}
                            disabled={saving}
                            onChange={(e) => setRole(u.id, e.target.value)}
                          >
                            {Object.entries(roles).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <span
                            className={`status-pill ${u.active ? "paid" : "cancelled"}`}
                          >
                            {u.active ? "Aktif" : "Devre dışı"}
                          </span>{" "}
                          <button
                            className="ws-button"
                            disabled={saving}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `${u.username} hesabının erişimi değiştirilsin mi?`,
                                )
                              )
                                setRole(u.id, u.role, !u.active);
                            }}
                          >
                            {u.active ? "Devre dışı bırak" : "Etkinleştir"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="permission-note">
                Yönetici: ekip ve geçmiş dahil tüm işlemler. Muhasebe: kayıt
                ekleme, düzenleme ve iptal. Görüntüleme: listeleme ve rapor
                indirme.
              </p>
            </section>
          )}
          {tab === "audit" && isAdmin && (
            <section className="ws-panel">
              <div className="panel-title">
                <div>
                  <h2>Değişiklik geçmişi</h2>
                  <p>
                    Kayıt ve değişiklik geçmişi aynı veritabanı işlemi içinde
                    saklanır. Eski kayıtların geçiş öncesi geçmişi bulunmaz.
                  </p>
                </div>
              </div>
              <div className="audit-list">
                {audit.content.map((a) => (
                  <article key={a.id}>
                    <div className="audit-marker">◷</div>
                    <div>
                      <strong>{a.actor}</strong>{" "}
                      <span className="ws-chip">
                        {{
                          CREATE: "Oluşturdu",
                          UPDATE: "Düzenledi",
                          CANCEL: "İptal etti",
                          ROLE_CHANGE: "Yetki değiştirdi",
                          PASSWORD_CHANGE: "Parola değiştirdi",
                        }[a.action] || a.action}
                      </span>
                      <p>
                        {
                          {
                            TRANSACTION: "İşlem",
                            COUNTERPARTY: "Cari hesap",
                            CATEGORY: "Kategori",
                            USER: "Kullanıcı",
                          }[a.entityType]
                        }{" "}
                        #{a.entityId} ·{" "}
                        {new Date(a.occurredAt).toLocaleString("tr-TR")}
                      </p>
                      <details>
                        <summary>Değişiklik ayrıntıları</summary>
                        <dl>
                          <dt>Önce</dt>
                          <dd>{a.beforeValue || "—"}</dd>
                          <dt>Sonra</dt>
                          <dd>{a.afterValue || "—"}</dd>
                        </dl>
                      </details>
                    </div>
                  </article>
                ))}
                {!audit.content.length && (
                  <div className="ws-empty">
                    Henüz bir değişiklik kaydı yok.
                  </div>
                )}
              </div>
              <div className="ws-pagination">
                <span>
                  Sayfa {audit.totalPages ? auditPage + 1 : 0} /{" "}
                  {audit.totalPages}
                </span>
                <div>
                  <button
                    className="ws-button"
                    disabled={auditPage === 0}
                    onClick={() => setAuditPage((p) => p - 1)}
                  >
                    ← Önceki
                  </button>
                  <button
                    className="ws-button"
                    disabled={auditPage + 1 >= audit.totalPages}
                    onClick={() => setAuditPage((p) => p + 1)}
                  >
                    Sonraki →
                  </button>
                </div>
              </div>
            </section>
          )}
          {tab === "reports" && (
            <section className="ws-panel">
              <div className="panel-title">
                <div>
                  <h2>Aylık dönem karşılaştırması</h2>
                  <p>
                    İşlem tarihine ve aktif filtrelere göre kayıt bulunan son 24
                    ay. İptaller hariçtir.
                  </p>
                </div>
              </div>
              {periods.length > 0 ? (
                <>
                  <div className="ws-chart">
                    <Bar
                      data={{
                        labels: periods.map((p) => p.period),
                        datasets: [
                          {
                            label: "Gelir",
                            data: periods.map((p) => p.income),
                            backgroundColor: "#117c70",
                            borderRadius: 4,
                          },
                          {
                            label: "Gider",
                            data: periods.map((p) => p.expense),
                            backgroundColor: "#e38f61",
                            borderRadius: 4,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true } },
                        plugins: { legend: { position: "bottom" } },
                      }}
                    />
                  </div>
                  <div className="ws-table-wrap">
                    <table className="ws-table">
                      <thead>
                        <tr>
                          <th>Dönem</th>
                          <th className="number">Gelir</th>
                          <th className="number">Gider</th>
                          <th className="number">Tahsil edilmiş</th>
                          <th className="number">Ödenmiş</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periods.map((p) => (
                          <tr key={p.period}>
                            <td>{p.period}</td>
                            <td className="number positive">
                              {money(p.income)}
                            </td>
                            <td className="number negative">
                              {money(p.expense)}
                            </td>
                            <td className="number">{money(p.received)}</td>
                            <td className="number">{money(p.paid)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="ws-empty">
                  Seçilen filtrelerde raporlanacak kayıt yok.
                </div>
              )}
            </section>
          )}
          <footer className="ws-footer">
            <span>Budget Tracker · Şirket Finans</span>
            <span>Tek şirket · TRY · Gelir, gider ve cari takip</span>
          </footer>
        </div>
      </main>

      {modal && (
        <Modal
          title={
            modal === "entry"
              ? form.id
                ? "İşlemi düzenle"
                : "Yeni hesap hareketi"
              : modal === "party"
                ? "Yeni cari hesap"
                : modal === "category"
                  ? "Yeni kategori"
                  : modal === "user"
                    ? "Yeni ekip üyesi"
                    : modal === "password"
                      ? "Parolayı değiştir"
                      : "İşlemi iptal et"
          }
          busy={saving}
          onClose={() => setModal(null)}
        >
          <form onSubmit={submit}>
            {formError && (
              <div role="alert" className="ws-alert error">
                {formError}
              </div>
            )}
            <div className="ws-form-grid">
              {modal === "password" && (
                <>
                  <Field label="Mevcut parola *" wide>
                    {(id) => (
                      <input
                        id={id}
                        type="password"
                        autoComplete="current-password"
                        required
                        value={form.currentPassword}
                        onChange={(e) =>
                          change("currentPassword", e.target.value)
                        }
                      />
                    )}
                  </Field>
                  <Field label="Yeni parola *" wide>
                    {(id) => (
                      <input
                        id={id}
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={12}
                        maxLength={72}
                        value={form.newPassword}
                        onChange={(e) => change("newPassword", e.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="Yeni parola tekrar *" wide>
                    {(id) => (
                      <input
                        id={id}
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={12}
                        maxLength={72}
                        value={form.confirmation}
                        onChange={(e) => change("confirmation", e.target.value)}
                      />
                    )}
                  </Field>
                  <p className="form-help wide">
                    Parola değişince tüm açık oturumlar sonlanır. Yeni
                    parolanızla tekrar giriş yapmanız gerekir.
                  </p>
                </>
              )}
              {modal === "entry" && (
                <>
                  <Field label="İşlem türü *">
                    {(id) => (
                      <select
                        id={id}
                        value={form.type}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            type: e.target.value,
                            categoryId: "",
                          }))
                        }
                      >
                        <option value="EXPENSE">Gider</option>
                        <option value="INCOME">Gelir</option>
                      </select>
                    )}
                  </Field>
                  <Field label="Tutar (TRY) *">
                    {(id) => (
                      <input
                        id={id}
                        type="number"
                        min="0.01"
                        max="9999999999.99"
                        step="0.01"
                        value={form.amount}
                        onChange={(e) => change("amount", e.target.value)}
                        required
                        placeholder="0,00"
                      />
                    )}
                  </Field>
                  <Field label="İşlem tarihi *">
                    {(id) => (
                      <input
                        id={id}
                        type="date"
                        value={form.date}
                        onChange={(e) => change("date", e.target.value)}
                        required
                      />
                    )}
                  </Field>
                  <Field label="Kategori *">
                    {(id) => (
                      <select
                        id={id}
                        value={form.categoryId}
                        onChange={(e) => change("categoryId", e.target.value)}
                        required
                      >
                        <option value="">Kategori seçin</option>
                        {categories
                          .filter((c) => c.type === form.type)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    )}
                  </Field>
                  <Field label="Cari hesap">
                    {(id) => (
                      <select
                        id={id}
                        value={form.counterpartyId}
                        onChange={(e) =>
                          change("counterpartyId", e.target.value)
                        }
                        required={form.paymentStatus === "PENDING"}
                      >
                        <option value="">Cari hesap seçin</option>
                        {parties.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                  <Field label="Belge / Referans numarası">
                    {(id) => (
                      <input
                        id={id}
                        value={form.documentNumber}
                        onChange={(e) =>
                          change("documentNumber", e.target.value)
                        }
                        maxLength={80}
                        placeholder="Örn. FTR-2026-001"
                      />
                    )}
                  </Field>
                  <Field label="Ödeme durumu *">
                    {(id) => (
                      <select
                        id={id}
                        value={form.paymentStatus}
                        onChange={(e) =>
                          change("paymentStatus", e.target.value)
                        }
                      >
                        <option value="PAID">
                          {form.type === "INCOME" ? "Tahsil edildi" : "Ödendi"}
                        </option>
                        <option value="PENDING">Bekliyor</option>
                      </select>
                    )}
                  </Field>
                  <Field
                    label={
                      form.paymentStatus === "PENDING"
                        ? "Vade tarihi *"
                        : "Vade tarihi"
                    }
                  >
                    {(id) => (
                      <input
                        id={id}
                        type="date"
                        value={form.dueDate}
                        min={form.date}
                        required={form.paymentStatus === "PENDING"}
                        onChange={(e) => change("dueDate", e.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="Departman / Masraf merkezi" wide>
                    {(id) => (
                      <input
                        id={id}
                        value={form.department}
                        maxLength={100}
                        onChange={(e) => change("department", e.target.value)}
                        placeholder="Örn. Operasyon, Satış, İnsan Kaynakları"
                      />
                    )}
                  </Field>
                  <Field label="Açıklama" wide>
                    {(id) => (
                      <textarea
                        id={id}
                        value={form.description}
                        maxLength={1000}
                        onChange={(e) => change("description", e.target.value)}
                        rows={3}
                        placeholder="İşlemle ilgili açıklama…"
                      />
                    )}
                  </Field>
                  <p className="form-help wide">
                    Bekleyen bir kayıt için cari hesap ve vade zorunludur. Tam
                    tahsilat / ödeme yapıldığında kaydı düzenleyerek durumunu
                    değiştirin. Kısmi ödeme desteklenmez.
                  </p>
                </>
              )}
              {modal === "party" && (
                <>
                  <Field label="Ünvan / Ad soyad *" wide>
                    {(id) => (
                      <input
                        id={id}
                        value={form.name}
                        onChange={(e) => change("name", e.target.value)}
                        required
                        maxLength={200}
                      />
                    )}
                  </Field>
                  <Field label="Cari türü *">
                    {(id) => (
                      <select
                        id={id}
                        value={form.kind}
                        onChange={(e) => change("kind", e.target.value)}
                      >
                        {Object.entries(kinds).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                  <Field label="Vergi / T.C. numarası">
                    {(id) => (
                      <input
                        id={id}
                        value={form.taxNumber}
                        onChange={(e) => change("taxNumber", e.target.value)}
                        inputMode="numeric"
                        pattern="[0-9]{10,11}"
                        maxLength={11}
                      />
                    )}
                  </Field>
                  <Field label="E-posta">
                    {(id) => (
                      <input
                        id={id}
                        type="email"
                        value={form.email}
                        maxLength={200}
                        onChange={(e) => change("email", e.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="Telefon">
                    {(id) => (
                      <input
                        id={id}
                        value={form.phone}
                        maxLength={30}
                        onChange={(e) => change("phone", e.target.value)}
                      />
                    )}
                  </Field>
                </>
              )}
              {modal === "category" && (
                <>
                  <Field label="Kategori adı *">
                    {(id) => (
                      <input
                        id={id}
                        required
                        maxLength={100}
                        value={form.name}
                        onChange={(e) => change("name", e.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="Tür *">
                    {(id) => (
                      <select
                        id={id}
                        value={form.type}
                        onChange={(e) => change("type", e.target.value)}
                      >
                        <option value="EXPENSE">Gider</option>
                        <option value="INCOME">Gelir</option>
                      </select>
                    )}
                  </Field>
                </>
              )}
              {modal === "user" && (
                <>
                  <Field label="Kullanıcı adı *" wide>
                    {(id) => (
                      <input
                        id={id}
                        autoComplete="off"
                        value={form.username}
                        minLength={3}
                        maxLength={80}
                        pattern="[a-zA-Z0-9._-]+"
                        required
                        onChange={(e) => change("username", e.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="E-posta *" wide>
                    {(id) => (
                      <input
                        id={id}
                        type="email"
                        value={form.email}
                        required
                        maxLength={200}
                        onChange={(e) => change("email", e.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="İlk giriş parolası *" wide>
                    {(id) => (
                      <input
                        id={id}
                        type="password"
                        autoComplete="new-password"
                        minLength={12}
                        maxLength={72}
                        required
                        value={form.password}
                        onChange={(e) => change("password", e.target.value)}
                      />
                    )}
                  </Field>
                  <p className="form-help wide">
                    En az 12 karakter. Kullanıcı ilk olarak görüntüleme yetkisi
                    alır; yetkisini ekip listesinden değiştirebilirsiniz.
                  </p>
                </>
              )}
              {modal === "cancel" && (
                <>
                  <p className="form-help wide">
                    Kayıt silinmez. İptal nedeni geçmişe kaydedilir; tutar
                    gelir, gider ve cari bakiyelerinden çıkarılır. Bu işlem geri
                    alınamaz.
                  </p>
                  <Field label="İptal nedeni *" wide>
                    {(id) => (
                      <textarea
                        id={id}
                        required
                        maxLength={500}
                        rows={4}
                        value={form.reason}
                        onChange={(e) => change("reason", e.target.value)}
                      />
                    )}
                  </Field>
                </>
              )}
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                className="ws-button"
                disabled={saving}
                onClick={() => setModal(null)}
              >
                Vazgeç
              </button>
              <button
                className={`ws-button ${modal === "cancel" ? "danger" : "primary"}`}
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Kaydediliyor…"
                  : modal === "cancel"
                    ? "Kaydı iptal et"
                    : "Kaydet"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
