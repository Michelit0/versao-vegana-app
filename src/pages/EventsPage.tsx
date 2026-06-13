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

function formatQuantity(value: number, measure: string | null) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(value)}${measure ? ` ${measure}` : ""}`;
}

function listKey(item: { name: string; measure: string | null }) {
  return `${item.name}|${item.measure ?? ""}`;
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
    { id: Date.now(), productId: productOptions[0]?.value ?? 0, servings: productOptions[0] ? products.find((item) => item.id === productOptions[0].value)?.yieldServings ?? 20 : 20 }
  ]);
  const [copied, setCopied] = useState(false);
  const [removedItems, setRemovedItems] = useState<string[]>([]);

  const shoppingList = useMemo(() => {
    const totals = new Map<string, { name: string; measure: string | null; quantity: number }>();

    for (const row of rows) {
      const product = products.find((item) => item.id === row.productId);
      if (!product) continue;
      const baseYield = product.yieldServings ?? 20;
      const factor = baseYield > 0 ? row.servings / baseYield : row.servings;

      for (const ingredient of recipeItems.filter((item) => item.productId === row.productId)) {
        const key = `${ingredient.resourceId ?? ingredient.resourceName}|${ingredient.measure ?? ""}`;
        const current = totals.get(key) ?? { name: ingredient.resourceName, measure: ingredient.measure, quantity: 0 };
        current.quantity += (ingredient.quantity ?? 0) * factor;
        totals.set(key, current);
      }
    }

    return Array.from(totals.values())
      .filter((item) => !removedItems.includes(listKey(item)))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [products, recipeItems, removedItems, rows]);

  const whatsappText = useMemo(() => {
    const productsText = rows.map((row) => {
      const product = products.find((item) => item.id === row.productId);
      return `- ${product?.name ?? "Produto"}: ${row.servings} pessoas`;
    });
    const listText = shoppingList.map((item) => `- ${item.name}: ${formatQuantity(item.quantity, item.measure)}`);
    return [`Lista de compras - ${eventName}`, "", "Cardapio planejado:", ...productsText, "", "Ingredientes consolidados:", ...listText].join("\n");
  }, [eventName, products, rows, shoppingList]);

  function addRow() {
    const firstProduct = productOptions[0]?.value ?? 0;
    setRows((current) => [...current, { id: Date.now(), productId: firstProduct, servings: products.find((item) => item.id === firstProduct)?.yieldServings ?? 20 }]);
  }

  function updateRow(id: number, changes: Partial<EventProduct>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...changes } : row));
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
          {rows.map((row) => {
            const selectedProduct = products.find((product) => product.id === row.productId);
            return (
              <div className="event-product-row" key={row.id}>
                <SearchableSelect label="Produto/receita" value={row.productId} options={productOptions} placeholder="Digite o produto" onChange={(value) => updateRow(row.id, { productId: value, servings: products.find((item) => item.id === value)?.yieldServings ?? 20 })} />
                <label>
                  Pessoas/porcoes
                  <input type="number" min="1" step="1" value={row.servings} onChange={(event) => updateRow(row.id, { servings: Math.max(1, Number(event.target.value)) })} />
                </label>
                <div className="event-yield-note">
                  <span>Rendimento base</span>
                  <strong>{selectedProduct?.yieldServings ?? 20} pessoas</strong>
                </div>
                <button className="icon-action" type="button" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} disabled={rows.length === 1}>
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
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
                <tr><th>Ingrediente</th><th>Quantidade total</th><th>Lista</th></tr>
              </thead>
              <tbody>
                {shoppingList.map((item) => (
                  <tr key={`${item.name}-${item.measure}`}>
                    <td>{item.name}</td>
                    <td><strong>{formatQuantity(item.quantity, item.measure)}</strong></td>
                    <td>
                      <button className="secondary-action compact-action" type="button" onClick={() => setRemovedItems((current) => [...current, listKey(item)])}>
                        <Trash2 size={15} />
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
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
