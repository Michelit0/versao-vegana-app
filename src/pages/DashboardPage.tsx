import { EmptyState } from "../components/EmptyState";
import { KpiCard } from "../components/KpiCard";
import { currency, parseLocalDate } from "../lib/format";
import type { DashboardMetrics } from "../types";

type DashboardPageProps = {
  dashboard: DashboardMetrics | null;
  loading: boolean;
};

export function DashboardPage({ dashboard, loading }: DashboardPageProps) {
  if (loading) return <EmptyState title="Carregando painel" description="Buscando vendas, produtos e resumo financeiro." />;
  if (!dashboard) return <EmptyState title="Sem dados" description="Ainda não há informações para montar o painel." />;

  return (
    <section className="content-stack">
      <div className="kpi-grid">
        <KpiCard label="Vendas hoje" value={currency.format(dashboard.revenueToday)} detail="Pedidos não cancelados" />
        <KpiCard label="Vendas no mês" value={currency.format(dashboard.revenueMonth)} detail="Base operacional" />
        <KpiCard label="Pedidos abertos" value={String(dashboard.openOrders)} detail="Pendentes de finalização" />
        <KpiCard label="Ticket médio" value={currency.format(dashboard.averageTicket)} detail="Média do mês" />
      </div>
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
