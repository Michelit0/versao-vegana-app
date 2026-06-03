import { EmptyState } from "../components/EmptyState";
import type { Customer } from "../types";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

type CustomersPageProps = {
  customers: Customer[];
  loading: boolean;
};

export function CustomersPage({ customers, loading }: CustomersPageProps) {
  const [query, setQuery] = useState("");
  const filteredCustomers = useMemo(() => {
    const term = normalize(query);
    if (!term) return customers;
    return customers.filter((customer) => normalize([
      customer.name,
      customer.phone,
      customer.region,
      customer.address,
      customer.dietaryPreferences
    ].filter(Boolean).join(" ")).includes(term));
  }, [customers, query]);

  if (loading) return <EmptyState title="Carregando clientes" description="Montando a lista de relacionamento." />;
  if (!customers.length) return <EmptyState title="Sem clientes" description="Cadastre clientes para acelerar novos pedidos." />;

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Base de clientes</h2>
        <span className="muted-count">{filteredCustomers.length} de {customers.length}</span>
      </div>
      <label className="search-field">
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, telefone, região ou preferência" />
      </label>
      {filteredCustomers.length ? (
        <div className="card-grid">
          {filteredCustomers.map((customer) => (
            <article className="entity-card" key={customer.id}>
              <strong>{customer.name}</strong>
              <span>{customer.phone || "Telefone não informado"}</span>
              <small>{customer.region || "Região não informada"}</small>
              {customer.dietaryPreferences ? <em>{customer.dietaryPreferences}</em> : null}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Nenhum cliente encontrado" description="Tente buscar por outro nome, telefone ou região." />
      )}
    </section>
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
