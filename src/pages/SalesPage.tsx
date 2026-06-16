import { EmptyState } from "../components/EmptyState";
import { parseLocalDate } from "../lib/format";
import { updateSaleStatus } from "../lib/repository";
import type { OrderStatus, Sale, SalePaymentStatus } from "../types";
import { AlertTriangle, CheckCircle2, Clock3, MessageCircle, PackageCheck, RotateCcw, Search, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type SalesPageProps = {
  sales: Sale[];
  loading: boolean;
  onChanged: () => Promise<void>;
};

type TimerState = {
  label: string;
  tone: "ok" | "warning" | "overdue" | "done";
};

type DateFilter = "hoje" | "ontem" | "mes";

const SERVICE_MINUTES_KEY = "vv_order_service_minutes";

const statusLabels: Record<OrderStatus, string> = {
  rascunho: "rascunho",
  pendente: "pendente",
  finalizado: "finalizado",
  cancelado: "cancelado"
};

const paymentLabels: Record<SalePaymentStatus, string> = {
  pago: "pago",
  pendente: "pendente",
  pagar_na_retirada: "pagar na retirada"
};

const statusWeight: Record<OrderStatus, number> = {
  pendente: 0,
  rascunho: 0,
  finalizado: 1,
  cancelado: 2
};

export function SalesPage({ sales, loading, onChanged }: SalesPageProps) {
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("hoje");
  const [now, setNow] = useState(() => Date.now());
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [cancelSale, setCancelSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [serviceMinutesInput, setServiceMinutesInput] = useState(() => String(readServiceMinutes()));
  const serviceMinutes = Number(serviceMinutesInput) > 0 ? Number(serviceMinutesInput) : 20;

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (Number(serviceMinutesInput) > 0) {
      window.localStorage.setItem(SERVICE_MINUTES_KEY, serviceMinutesInput);
    }
  }, [serviceMinutesInput]);

  const filteredByDate = useMemo(() => sales.filter((sale) => matchesDateFilter(sale, dateFilter)), [dateFilter, sales]);

  const queueSales = useMemo(() => {
    const term = normalize(query);
    return filteredByDate
      .filter((sale) => {
        if (!term) return true;
        return normalize([
          String(sale.id),
          sale.customerName,
          sale.paymentMethod,
          sale.paymentStatus,
          sale.deliveryType,
          sale.status,
          getVisibleSaleNote(sale) ?? "",
          sale.items.map((item) => item.productName).join(" "),
          parseLocalDate(sale.orderedAt)
        ].join(" ")).includes(term);
      })
      .sort(compareSalesForKitchenQueue);
  }, [filteredByDate, query]);

  const pendingSales = filteredByDate.filter(isOpenSale);
  const finishedSales = filteredByDate.filter((sale) => sale.status === "finalizado");
  const overdueSales = pendingSales.filter((sale) => getTimerState(sale, now, serviceMinutes).tone === "overdue");
  const notedSales = pendingSales.filter((sale) => Boolean(getVisibleSaleNote(sale)));
  const pendingProducts = useMemo(() => summarizePendingProducts(pendingSales), [pendingSales]);

  async function handleStatusChange(orderId: number, status: OrderStatus, cancellationReason?: string) {
    try {
      setUpdatingOrderId(orderId);
      await updateSaleStatus(orderId, status, cancellationReason);
      await onChanged();
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function submitCancellation() {
    if (!cancelSale || !cancelReason.trim()) return;
    await handleStatusChange(cancelSale.id, "cancelado", cancelReason.trim());
    setCancelSale(null);
    setCancelReason("");
  }

  if (loading) return <EmptyState title="Carregando pedidos" description="Conferindo a fila da cozinha." />;
  if (!sales.length) return <EmptyState title="Nenhum pedido" description="Quando uma venda for criada, ela aparece aqui." />;

  return (
    <section className="panel orders-panel">
      <div className="panel-heading">
        <div>
          <h2>Acompanhamento de pedidos</h2>
          <p>Fila da cozinha em ordem de preparo, com itens, observações e alertas de prazo.</p>
        </div>
        <span className="muted-count">{queueSales.length} de {filteredByDate.length}</span>
      </div>

      <div className="orders-control-panel orders-control-panel-wide" aria-label="Resumo da fila de pedidos">
        <div className="order-kpi-card">
          <strong>{pendingSales.length}</strong>
          <span>na fila</span>
        </div>
        <div className="order-kpi-card">
          <strong>{finishedSales.length}</strong>
          <span>finalizados</span>
        </div>
        <div className={`order-kpi-card ${overdueSales.length ? "danger" : ""}`}>
          <strong>{overdueSales.length}</strong>
          <span>atrasados</span>
        </div>
        <div className={`order-kpi-card ${notedSales.length ? "warning" : ""}`}>
          <strong>{notedSales.length}</strong>
          <span>com observação</span>
        </div>
        <label className="order-service-time">
          <Clock3 size={18} />
          <span>Tempo prometido hoje</span>
          <input
            inputMode="numeric"
            min="1"
            max="240"
            pattern="[0-9]*"
            value={serviceMinutesInput}
            onChange={(event) => setServiceMinutesInput(event.target.value.replace(/\D/g, "").slice(0, 3))}
            aria-label="Tempo prometido em minutos"
          />
          <small>min</small>
        </label>
      </div>

      <section className="pending-products-panel" aria-label="Produtos pendentes para preparo">
        <div className="panel-heading compact-heading">
          <div>
            <h2>Produção pendente</h2>
            <p>Total consolidado dos itens ainda não finalizados.</p>
          </div>
          {notedSales.length ? <span className="observation-alert"><AlertTriangle size={15} /> Atenção às observações</span> : null}
        </div>
        {pendingProducts.length ? (
          <div className="pending-products-grid">
            {pendingProducts.slice(0, 12).map((item) => (
              <span className="pending-product-chip" key={item.productName}>
                <PackageCheck size={15} />
                <strong>{formatQuantity(item.quantity)}</strong>
                {item.productName}
              </span>
            ))}
          </div>
        ) : (
          <span className="muted-inline">Nenhum item pendente no filtro atual.</span>
        )}
      </section>

      <div className="orders-filter-row">
        <div className="segmented-control" aria-label="Filtro de data">
          <button className={dateFilter === "hoje" ? "active" : ""} type="button" onClick={() => setDateFilter("hoje")}>Hoje</button>
          <button className={dateFilter === "ontem" ? "active" : ""} type="button" onClick={() => setDateFilter("ontem")}>Ontem</button>
          <button className={dateFilter === "mes" ? "active" : ""} type="button" onClick={() => setDateFilter("mes")}>Este mês</button>
        </div>
        <label className="search-field orders-search-field">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por pedido, cliente, item, entrega, pagamento ou status" />
        </label>
      </div>

      <div className="table-wrap orders-table-wrap">
        <table className="orders-table orders-kitchen-table">
          <thead>
            <tr>
              <th>Fila</th>
              <th>Entrada</th>
              <th>Cliente</th>
              <th>Itens</th>
              <th>Observação</th>
              <th>Entrega / pagamento</th>
              <th>Prazo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {queueSales.map((sale, index) => {
              const timer = getTimerState(sale, now, serviceMinutes);
              const isUpdating = updatingOrderId === sale.id;
              const rowTone = getRowTone(sale, timer);

              return (
                <tr key={`${sale.id}-${sale.orderedAt}-${index}`} className={`order-row-${rowTone}`}>
                  <td>
                    <strong>#{sale.id}</strong>
                    <span className="order-queue-position">{statusWeight[sale.status] === 0 ? `${openPosition(queueSales, index)} na fila` : "abaixo da fila"}</span>
                  </td>
                  <td>{parseLocalDate(sale.orderedAt)}</td>
                  <td>
                    <div className="order-customer-cell">
                      <strong>{sale.customerName}</strong>
                      {sale.customerPhone ? (
                        <a className="whatsapp-icon-link" href={buildWhatsAppUrl(sale)} target="_blank" rel="noreferrer" aria-label={`Abrir WhatsApp do pedido ${sale.id}`}>
                          <MessageCircle size={18} />
                          WhatsApp
                        </a>
                      ) : (
                        <span className="muted-inline">Sem WhatsApp</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="order-items-list">
                      {sale.items.slice(0, 4).map((item, itemIndex) => (
                        <span key={`${sale.id}-${item.productName}-${itemIndex}`}>
                          <strong>{formatQuantity(item.quantity)}x</strong> {item.productName}
                          {getVisibleItemNote(item.note) ? <em>{truncateText(getVisibleItemNote(item.note) ?? "", 36)}</em> : null}
                        </span>
                      ))}
                      {sale.items.length > 4 ? <small>+{sale.items.length - 4} itens</small> : null}
                    </div>
                  </td>
                  <td>
                    {getVisibleSaleNote(sale) ? <span className="order-note" title={getVisibleSaleNote(sale) ?? ""}>{truncateText(getVisibleSaleNote(sale) ?? "", 95)}</span> : <span className="muted-inline">Sem observação</span>}
                    {sale.cancellationReason ? <span className="order-note danger" title={sale.cancellationReason}>Cancelado: {truncateText(sale.cancellationReason, 70)}</span> : null}
                  </td>
                  <td>
                    <div className="order-fulfillment-cell">
                      <span className={`pill ${sale.deliveryType === "entrega" ? "pendente" : "finalizado"}`}>{sale.deliveryType === "entrega" ? "entrega" : "retirada"}</span>
                      <span className={`pill payment-${sale.paymentStatus}`}>{paymentLabels[sale.paymentStatus]}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`order-timer ${timer.tone}`}>
                      <Clock3 size={15} />
                      {timer.label}
                    </span>
                  </td>
                  <td>
                    <div className="order-status-cell">
                      <span className={`pill ${sale.status}`}>{statusLabels[sale.status]}</span>
                      <div className="order-status-actions">
                        {sale.status === "finalizado" ? (
                          <button className="status-action-button" type="button" disabled={isUpdating} onClick={() => handleStatusChange(sale.id, "pendente")}>
                            <RotateCcw size={15} />
                            Reabrir
                          </button>
                        ) : (
                          <button className="status-action-button primary" type="button" disabled={isUpdating || sale.status === "cancelado"} onClick={() => handleStatusChange(sale.id, "finalizado")}>
                            <CheckCircle2 size={15} />
                            Pronto
                          </button>
                        )}
                        {sale.status !== "cancelado" ? (
                          <button className="status-action-button danger" type="button" disabled={isUpdating} onClick={() => setCancelSale(sale)}>
                            <XCircle size={15} />
                            Cancelar
                          </button>
                        ) : (
                          <button className="status-action-button" type="button" disabled={isUpdating} onClick={() => handleStatusChange(sale.id, "pendente")}>
                            <RotateCcw size={15} />
                            Reabrir
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!queueSales.length ? <EmptyState title="Nenhum pedido encontrado" description="Ajuste a busca ou o filtro de data para conferir outros pedidos." /> : null}

      {cancelSale ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Cancelar pedido">
          <div className="modal-card cancel-order-modal">
            <div className="modal-heading">
              <div>
                <span className="eyebrow">Cancelar pedido</span>
                <h2>Pedido #{cancelSale.id}</h2>
              </div>
              <button className="icon-action" type="button" onClick={() => setCancelSale(null)} aria-label="Fechar cancelamento">
                <XCircle size={18} />
              </button>
            </div>
            <p>O pedido continuará no histórico com status cancelado. Informe o motivo para manter rastreabilidade.</p>
            <label>
              Motivo do cancelamento
              <textarea maxLength={240} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Ex.: cliente desistiu, produto indisponível, pedido duplicado" />
            </label>
            <div className="modal-actions">
              <button className="secondary-action" type="button" onClick={() => setCancelSale(null)}>Voltar</button>
              <button className="danger-action" type="button" disabled={!cancelReason.trim() || updatingOrderId === cancelSale.id} onClick={submitCancellation}>
                Confirmar cancelamento
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function compareSalesForKitchenQueue(a: Sale, b: Sale) {
  const weightDiff = statusWeight[a.status] - statusWeight[b.status];
  if (weightDiff !== 0) return weightDiff;

  const aTime = new Date(a.orderedAt).getTime();
  const bTime = new Date(b.orderedAt).getTime();
  const activeGroup = statusWeight[a.status] === 0;
  const timeDiff = activeGroup ? aTime - bTime : bTime - aTime;
  return timeDiff || a.id - b.id;
}

function getTimerState(sale: Sale, now: number, serviceMinutes: number): TimerState {
  if (sale.status === "finalizado") return { label: "Finalizado", tone: "done" };
  if (sale.status === "cancelado") return { label: "Cancelado", tone: "done" };

  const orderedAt = new Date(sale.orderedAt).getTime();
  if (Number.isNaN(orderedAt)) return { label: "Sem horario", tone: "warning" };

  const deadline = orderedAt + serviceMinutes * 60 * 1000;
  const diffMinutes = Math.ceil((deadline - now) / 60000);
  const elapsedMinutes = Math.max(0, Math.floor((now - orderedAt) / 60000));

  if (diffMinutes < 0) return { label: `Atrasado ${Math.abs(diffMinutes)} min`, tone: "overdue" };
  if (diffMinutes <= 2) return { label: `${diffMinutes} min`, tone: "overdue" };
  if (elapsedMinutes >= serviceMinutes / 2) return { label: `${diffMinutes} min`, tone: "warning" };
  return { label: `${diffMinutes} min`, tone: "ok" };
}

function getRowTone(sale: Sale, timer: TimerState) {
  if (sale.status === "cancelado") return "canceled";
  if (sale.status === "finalizado") return "done";
  return timer.tone;
}

function summarizePendingProducts(sales: Sale[]) {
  const totals = new Map<string, number>();
  for (const sale of sales) {
    for (const item of sale.items) {
      totals.set(item.productName, (totals.get(item.productName) ?? 0) + item.quantity);
    }
  }
  return Array.from(totals, ([productName, quantity]) => ({ productName, quantity }))
    .sort((a, b) => b.quantity - a.quantity || a.productName.localeCompare(b.productName, "pt-BR"));
}

function matchesDateFilter(sale: Sale, filter: DateFilter) {
  const date = new Date(sale.orderedAt);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startTomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const startYesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  if (filter === "hoje") return date >= startToday && date < startTomorrow;
  if (filter === "ontem") return date >= startYesterday && date < startToday;
  return date >= monthStart && date < startTomorrow;
}

function isOpenSale(sale: Sale) {
  return sale.status === "pendente" || sale.status === "rascunho";
}

function openPosition(sales: Sale[], index: number) {
  return sales.slice(0, index + 1).filter(isOpenSale).length;
}

function buildWhatsAppUrl(sale: Sale) {
  const phone = normalizePhoneForBrazil(sale.customerPhone ?? "");
  const firstName = sale.customerName.split(" ")[0] || "tudo bem";
  const message = `Ola, ${firstName}! Seu pedido #${sale.id} da Versao Vegana esta pronto.`;
  return `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
}

function normalizePhoneForBrazil(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function getVisibleSaleNote(sale: Sale) {
  const note = sale.note?.trim();
  if (!note || normalize(note) === "pedido criado no autoatendimento") return null;
  return note;
}

function getVisibleItemNote(note: string | null) {
  const value = note?.trim();
  if (!value || normalize(value) === "autoatendimento") return null;
  return value;
}

function readServiceMinutes() {
  const value = Number(window.localStorage.getItem(SERVICE_MINUTES_KEY));
  return Number.isFinite(value) && value > 0 ? Math.min(value, 240) : 20;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
