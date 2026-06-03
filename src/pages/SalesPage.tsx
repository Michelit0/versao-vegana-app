import { EmptyState } from "../components/EmptyState";
import { currency, parseLocalDate } from "../lib/format";
import type { Sale } from "../types";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

type SalesPageProps = {
  sales: Sale[];
  loading: boolean;
};

export function SalesPage({ sales, loading }: SalesPageProps) {
  const [query, setQuery] = useState("");
  const filteredSales = useMemo(() => {
    const term = normalize(query);
    if (!term) return sales;
    return sales.filter((sale) => normalize([
      String(sale.id),
      sale.customerName,
      sale.paymentMethod,
      sale.status,
      parseLocalDate(sale.orderedAt)
    ].join(" ")).includes(term));
  }, [sales, query]);

  if (loading) return <EmptyState title="Carregando pedidos" description="Conferindo os últimos lançamentos." />;
  if (!sales.length) return <EmptyState title="Nenhum pedido" description="Quando uma venda for criada, ela aparece aqui." />;

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Histórico de pedidos</h2>
        <span className="muted-count">{filteredSales.length} de {sales.length}</span>
      </div>
      <label className="search-field">
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por pedido, cliente, pagamento ou status" />
      </label>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Data</th>
              <th>Cliente</th>
              <th>Pagamento</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((sale) => (
              <tr key={sale.id}>
                <td>#{sale.id}</td>
                <td>{parseLocalDate(sale.orderedAt)}</td>
                <td>{sale.customerName}</td>
                <td>{sale.paymentMethod}</td>
                <td><span className={`pill ${sale.status}`}>{sale.status}</span></td>
                <td>{currency.format(sale.finalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filteredSales.length ? <EmptyState title="Nenhum pedido encontrado" description="Ajuste a busca para conferir outros pedidos." /> : null}
    </section>
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
