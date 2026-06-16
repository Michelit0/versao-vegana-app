import { EmptyState } from "../components/EmptyState";
import { KpiCard } from "../components/KpiCard";
import { currency, parseLocalDate } from "../lib/format";
import type { ActivitySummary, DashboardMetrics } from "../types";

type DashboardPageProps = {
  activitySummary: ActivitySummary | null;
  customersCount: number;
  dashboard: DashboardMetrics | null;
  loading: boolean;
  productsCount: number;
  recipeItemsCount: number;
  resourcesCount: number;
};

export function DashboardPage({ activitySummary, customersCount, dashboard, loading, productsCount, recipeItemsCount, resourcesCount }: DashboardPageProps) {
  if (loading) return <EmptyState title="Carregando painel" description="Buscando vendas, produtos e resumo financeiro." />;
  if (!dashboard) return <EmptyState title="Sem dados" description="Ainda não há informações para montar o painel." />;

  const today = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", weekday: "long" }).format(new Date());

  return (
    <section className="content-stack">
      <section className="panel today-panel">
        <div>
          <span className="eyebrow">Hoje</span>
          <h2>{today}</h2>
        </div>
        <div className="ops-summary-grid">
          <div><strong>{customersCount}</strong><span>clientes cadastrados</span></div>
          <div><strong>{productsCount}</strong><span>produtos no cardapio</span></div>
          <div><strong>{resourcesCount}</strong><span>recursos/ingredientes</span></div>
          <div><strong>{recipeItemsCount}</strong><span>itens de receita</span></div>
        </div>
      </section>
      <div className="kpi-grid">
        <KpiCard label="Vendas hoje" value={currency.format(dashboard.revenueToday)} detail="Pedidos não cancelados" />
        <KpiCard label="Vendas no mês" value={currency.format(dashboard.revenueMonth)} detail="Base operacional" />
        <KpiCard label="Pedidos abertos" value={String(dashboard.openOrders)} detail="Pendentes de finalização" />
        <KpiCard label="Ticket médio" value={currency.format(dashboard.averageTicket)} detail="Média do mês" />
      </div>
      {activitySummary ? (
        <section className="panel activity-alert-panel">
          <div className="panel-heading">
            <div>
              <h2>Atividades da equipe</h2>
              <span className="muted-count">Alertas rapidos para nao deixar demanda vencer.</span>
            </div>
          </div>
          <div className="ops-summary-grid">
            <div><strong>{activitySummary.open}</strong><span>abertas</span></div>
            <div className={activitySummary.overdue > 0 ? "summary-danger" : ""}><strong>{activitySummary.overdue}</strong><span>atrasadas</span></div>
            <div className={activitySummary.dueToday > 0 ? "summary-warning" : ""}><strong>{activitySummary.dueToday}</strong><span>vencem hoje</span></div>
            <div><strong>{activitySummary.highPriority}</strong><span>alta prioridade</span></div>
          </div>
        </section>
      ) : null}
      <div className="split-layout">
        <section className="panel">
          <div className="panel-heading">
            <h2>Pedidos recentes</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{parseLocalDate(sale.orderedAt)}</td>
                    <td>{sale.customerName}</td>
                    <td><span className={`pill ${sale.status}`}>{sale.status}</span></td>
                    <td>{currency.format(sale.finalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Produtos em destaque</h2>
          </div>
          {dashboard.topProducts.length ? (
            <div className="rank-list">
              {dashboard.topProducts.map((product, index) => (
                <div className="rank-row" key={product.name}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{product.name}</strong>
                    <small>{product.quantity} unidades</small>
                  </div>
                  <b>{currency.format(product.revenue)}</b>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Aguardando itens" description="Com dados reais, esta área mostra os produtos campeões." />
          )}
        </section>
      </div>
    </section>
  );
}
