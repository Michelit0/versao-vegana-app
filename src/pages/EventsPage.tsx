import { Clipboard, MessageCircle, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { SearchableSelect } from "../components/SearchableSelect";
import type { Product, RecipeItem } from "../types";

type EventsPageProps = {
  products: Product[];
  recipeItems: RecipeItem[];
};

type EventProduct = {
  id: number;
  productId: number;
  servings: number;
};

type ShoppingItem = {
  name: string;
  measure: string | null;
  quantity: number;
  origins: string[];
};

function formatQuantity(value: number, measure: string | null) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(value)}${measure ? ` ${measure}` : ""}`;
}

function listKey(item: { name: string; measure: string | null }) {
  return `${item.name}|${item.measure ?? ""}`;
}

function newEventRow(productId: number, products: Product[]): EventProduct {
  return {
    id: Date.now() + Math.floor(Math.random() * 100000),
    productId,
    servings: products.find((item) => item.id === productId)?.yieldServings ?? 20
  };
}

export function EventsPage({ products, recipeItems }: EventsPageProps) {
  const productOptions = products
    .filter((product) => recipeItems.some((item) => item.productId === product.id))
    .map((product) => ({
      value: product.id,
      label: product.name,
      description: `${product.category} | rende ${product.yieldServings ?? 20} pessoas`
    }));

  const [eventName, setEventName] = useState("Evento Versao Vegana");
  const [rows, setRows] = useState<EventProduct[]>([
    newEventRow(productOptions[0]?.value ?? 0, products)
  ]);
  const [copied, setCopied] = useState(false);
  const [removedItems, setRemovedItems] = useState<string[]>([]);

  const plannedProducts = useMemo(() => {
    const totals = new Map<number, { productId: number; name: string; servings: number; rows: number }>();
    for (const row of rows) {
      const product = products.find((item) => item.id === row.productId);
      if (!product) continue;
      const current = totals.get(row.productId) ?? { productId: row.productId, name: product.name, servings: 0, rows: 0 };
      current.servings += row.servings;
      current.rows += 1;
      totals.set(row.productId, current);
    }
    return Array.from(totals.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [products, rows]);

  const shoppingList = useMemo(() => {
    const totals = new Map<string, { name: string; measure: string | null; quantity: number; origins: Set<string> }>();

    for (const row of rows) {
      const product = products.find((item) => item.id === row.productId);
      if (!product) continue;
      const baseYield = product.yieldServings ?? 20;
      const factor = baseYield > 0 ? row.servings / baseYield : row.servings;

      for (const ingredient of recipeItems.filter((item) => item.productId === row.productId)) {
        const key = `${ingredient.resourceId ?? ingredient.resourceName}|${ingredient.measure ?? ""}`;
        const current = totals.get(key) ?? { name: ingredient.resourceName, measure: ingredient.measure, quantity: 0, origins: new Set<string>() };
        current.quantity += (ingredient.quantity ?? 0) * factor;
        current.origins.add(product.name);
        totals.set(key, current);
      }
    }

    return Array.from(totals.values()).map((item) => ({
      name: item.name,
      measure: item.measure,
      quantity: item.quantity,
      origins: Array.from(item.origins).sort((a, b) => a.localeCompare(b, "pt-BR"))
    }))
      .filter((item) => !removedItems.includes(listKey(item)))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [products, recipeItems, removedItems, rows]);

  const whatsappText = useMemo(() => {
    const productsText = plannedProducts.length
      ? plannedProducts.map((product) => `- ${product.name}: ${product.servings} pessoas`)
      : ["- Nenhum prato selecionado"];
    const listText = shoppingList.length
      ? shoppingList.map((item) => `- ${item.name}: ${formatQuantity(item.quantity, item.measure)}`)
      : ["- Nenhum ingrediente calculado"];
    return [`Lista de compras - ${eventName}`, "", "Cardapio planejado:", ...productsText, "", "Ingredientes consolidados:", ...listText].join("\n");
  }, [eventName, plannedProducts, shoppingList]);

  function addRow() {
    const firstProduct = productOptions[0]?.value ?? 0;
    setRows((current) => [...current, newEventRow(firstProduct, products)]);
  }

  function updateRow(id: number, changes: Partial<EventProduct>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...changes } : row));
  }

  function removeRow(id: number) {
    setRows((current) => current.filter((item) => item.id !== id));
  }

  async function copyList() {
    await navigator.clipboard.writeText(whatsappText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="content-stack">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Planejamento de evento</h2>
            <span className="muted-count">Escolha os pratos e informe para quantas pessoas cada um precisa render.</span>
          </div>
          <button className="secondary-action" type="button" onClick={addRow}>
            <Plus size={17} />
            Adicionar prato
          </button>
        </div>
        <div className="form-grid management-form">
          <label>
            Nome do evento
            <input value={eventName} onChange={(event) => setEventName(event.target.value)} />
          </label>
        </div>
        <div className="event-product-list">
          {rows.length ? rows.map((row, index) => {
            const selectedProduct = products.find((product) => product.id === row.productId);
            return (
              <div className="event-product-row" key={row.id}>
                <span className="event-row-number">{index + 1}</span>
                <SearchableSelect label="Produto/receita" value={row.productId} options={productOptions} placeholder="Digite o produto" onChange={(value) => updateRow(row.id, { productId: value, servings: products.find((item) => item.id === value)?.yieldServings ?? 20 })} />
                <label>
                  Pessoas/porcoes
                  <input type="number" min="1" step="1" value={row.servings} onChange={(event) => updateRow(row.id, { servings: Math.max(1, Number(event.target.value)) })} />
                </label>
                <div className="event-yield-note">
                  <span>Rendimento base</span>
                  <strong>{selectedProduct?.yieldServings ?? 20} pessoas</strong>
                </div>
                <button className="icon-action" type="button" onClick={() => removeRow(row.id)} aria-label="Remover prato">
                  <Trash2 size={16} />
                </button>
              </div>
            );
          }) : (
            <div className="event-empty-state">
              Nenhum prato selecionado. Clique em adicionar prato para montar a lista de compras.
            </div>
          )}
        </div>
        {plannedProducts.length ? (
          <div className="event-planned-summary">
            <strong>Resumo consolidado do cardapio</strong>
            <div>
              {plannedProducts.map((product) => (
                <span key={product.productId}>{product.name}: {product.servings} pessoas{product.rows > 1 ? ` (${product.rows} linhas somadas)` : ""}</span>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="split-layout">
        <div className="panel">
          <div className="panel-heading">
            <h2>Lista de compras consolidada</h2>
            <div className="panel-actions">
              <span className="muted-count">{shoppingList.length} itens</span>
              {removedItems.length ? (
                <button className="secondary-action compact-action" type="button" onClick={() => setRemovedItems([])}>
                  <RotateCcw size={15} />
                  Restaurar removidos
                </button>
              ) : null}
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Ingrediente</th><th>Usado em</th><th>Quantidade total</th><th>Lista</th></tr>
              </thead>
              <tbody>
                {shoppingList.length ? shoppingList.map((item: ShoppingItem) => (
                  <tr key={`${item.name}-${item.measure}`}>
                    <td>{item.name}</td>
                    <td><span className="muted-count">{item.origins.join(", ")}</span></td>
                    <td><strong>{formatQuantity(item.quantity, item.measure)}</strong></td>
                    <td>
                      <button className="secondary-action compact-action" type="button" onClick={() => setRemovedItems((current) => [...current, listKey(item)])}>
                        <Trash2 size={15} />
                        Remover
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4}>Adicione pratos ao planejamento para calcular a lista de compras.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="panel">
          <div className="panel-heading"><h2>Enviar para compras</h2></div>
          <textarea className="whatsapp-textarea" value={whatsappText} readOnly />
          <div className="event-actions">
            <button className="secondary-action" type="button" onClick={copyList}>
              <Clipboard size={17} />
              {copied ? "Copiado" : "Copiar lista"}
            </button>
            <a className="primary-action" href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noreferrer">
              <MessageCircle size={17} />
              Abrir WhatsApp
            </a>
          </div>
        </aside>
      </section>
    </section>
  );
}
