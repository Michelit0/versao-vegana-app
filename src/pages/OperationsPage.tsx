import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "../components/SearchableSelect";
import { currency } from "../lib/format";
import { createProduction, createPurchase, getPurchaseQuotes } from "../lib/repository";
import type { Measure, Product, PurchaseQuote, Resource, Supplier } from "../types";

type OperationsPageProps = {
  measures: Measure[];
  products: Product[];
  resources: Resource[];
  suppliers: Supplier[];
  onChanged: () => Promise<void>;
};

export function OperationsPage({ measures, products, resources, suppliers, onChanged }: OperationsPageProps) {
  const [mode, setMode] = useState<"compra" | "producao">("compra");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const productOptions = products.map((item) => ({ value: item.id, label: item.name, description: item.category }));
  const resourceOptions = resources.map((item) => ({ value: item.id, label: item.name, description: `${item.stock} ${item.measure ?? ""} em estoque` }));
  const supplierOptions = suppliers.map((item) => ({ value: item.id, label: item.name, description: item.phone }));

  async function run(action: () => Promise<unknown>, success: string) {
    setSaving(true);
    setMessage(null);
    try {
      await action();
      await onChanged();
      setMessage(success);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nao foi possivel registrar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="content-stack">
      <div className="tab-row">
        <button className={mode === "compra" ? "tab-button active" : "tab-button"} onClick={() => setMode("compra")} type="button">Compra</button>
        <button className={mode === "producao" ? "tab-button active" : "tab-button"} onClick={() => setMode("producao")} type="button">Producao</button>
      </div>
      {message ? <div className="alert inline-alert">{message}</div> : null}
      {mode === "compra" ? (
        <PurchaseForm disabled={saving} measures={measures} onSave={(input) => run(() => createPurchase(input), "Compra registrada e estoque atualizado.")} resources={resourceOptions} suppliers={supplierOptions} />
      ) : (
        <ProductionForm disabled={saving} onSave={(input) => run(() => createProduction(input), "Producao registrada.")} products={productOptions} />
      )}
    </section>
  );
}

function PurchaseForm({ disabled, measures, onSave, resources, suppliers }: { disabled: boolean; measures: Measure[]; onSave: (input: Parameters<typeof createPurchase>[0]) => void; resources: Array<{ value: number; label: string; description?: string | null }>; suppliers: Array<{ value: number; label: string; description?: string | null }> }) {
  const [resourceId, setResourceId] = useState(resources[0]?.value ?? 0);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.value ?? 0);
  const [quantity, setQuantity] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [purchasedAt, setPurchasedAt] = useState(new Date().toISOString().slice(0, 10));
  const [measure, setMeasure] = useState(measures[0]?.name ?? "unidade");
  const [invoice, setInvoice] = useState("");
  const [quotes, setQuotes] = useState<PurchaseQuote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);
  const unitCost = quantity > 0 ? totalCost / quantity : 0;
  const selectedResource = resources.find((item) => item.value === resourceId);
  const selectedSupplierQuote = quotes.find((item) => item.supplierId === supplierId);
  const bestQuote = quotes[0];
  const isValid = Boolean(resourceId && supplierId && quantity > 0 && totalCost > 0 && purchasedAt);

  useEffect(() => {
    let active = true;
    setQuotesLoading(true);
    setQuotesError(null);
    getPurchaseQuotes(resourceId)
      .then((items) => {
        if (active) setQuotes(items);
      })
      .catch((err) => {
        if (active) setQuotesError(err instanceof Error ? err.message : "Nao foi possivel carregar historico de precos.");
      })
      .finally(() => {
        if (active) setQuotesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [resourceId]);

  const priceStatus = useMemo(() => {
    if (!unitCost || !bestQuote?.lastUnitCost) return null;
    const diff = unitCost - bestQuote.lastUnitCost;
    const pct = bestQuote.lastUnitCost > 0 ? diff / bestQuote.lastUnitCost : 0;
    if (Math.abs(pct) < 0.03) return "Preco atual esta alinhado com o melhor preco recente.";
    if (diff > 0) return `Preco atual esta ${(pct * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% acima do melhor preco recente.`;
    return `Preco atual esta ${Math.abs(pct * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% abaixo do melhor preco recente.`;
  }, [bestQuote, unitCost]);

  return (
    <div className="purchase-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Registrar compra</h2>
            <span className="muted-count">Custo unitario: {unitCost > 0 ? currency.format(unitCost) : "preencha quantidade e custo"}</span>
          </div>
          <span className="muted-count">{currency.format(totalCost)}</span>
        </div>
        <div className="form-grid management-form">
          <SearchableSelect label="Recurso comprado" value={resourceId} options={resources} placeholder="Digite o recurso" onChange={setResourceId} />
          <SearchableSelect label="Fornecedor" value={supplierId} options={suppliers} placeholder="Digite o fornecedor" onChange={setSupplierId} />
          <label>Quantidade<input type="number" min="0" step="0.001" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
          <label>Custo total<input type="number" min="0" step="0.01" value={totalCost} onChange={(event) => setTotalCost(Number(event.target.value))} /></label>
          <label>Data da compra<input type="date" value={purchasedAt} onChange={(event) => setPurchasedAt(event.target.value)} /></label>
          <label>Medida<select value={measure} onChange={(event) => setMeasure(event.target.value)}>{measures.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
          <label>Nota fiscal<input value={invoice} onChange={(event) => setInvoice(event.target.value)} /></label>
        </div>
        {priceStatus ? <div className="purchase-price-alert">{priceStatus}</div> : null}
        {!isValid ? <p className="muted-count">Informe recurso, fornecedor, quantidade, custo total e data para registrar.</p> : null}
        <button className="primary-action form-action" disabled={disabled || !isValid} onClick={() => onSave({ resourceId, supplierId, quantity, purchasedAt, totalCost, measure, invoice })} type="button">
          <Save size={18} />{disabled ? "Salvando..." : "Registrar compra"}
        </button>
      </section>
      <PurchaseQuotePanel bestQuote={bestQuote} loading={quotesLoading} quotes={quotes} quotesError={quotesError} resourceName={selectedResource?.label ?? "Recurso"} selectedSupplierQuote={selectedSupplierQuote} unitCost={unitCost} />
    </div>
  );
}

function PurchaseQuotePanel({ bestQuote, loading, quotes, quotesError, resourceName, selectedSupplierQuote, unitCost }: { bestQuote?: PurchaseQuote; loading: boolean; quotes: PurchaseQuote[]; quotesError: string | null; resourceName: string; selectedSupplierQuote?: PurchaseQuote; unitCost: number }) {
  return (
    <section className="panel purchase-intelligence-panel">
      <div className="panel-heading">
        <div>
          <h2>Cotacao do recurso</h2>
          <span className="muted-count">{resourceName}</span>
        </div>
      </div>
      {loading ? <span className="muted-count">Carregando historico de compras...</span> : null}
      {quotesError ? <div className="alert inline-alert">{quotesError}</div> : null}
      {!loading && !quotesError && !quotes.length ? <span className="muted-count">Ainda nao ha historico de compra para este recurso.</span> : null}
      {quotes.length ? (
        <>
          <div className="purchase-summary-grid">
            <div>
              <span>Melhor preco recente</span>
              <strong>{bestQuote ? currency.format(bestQuote.lastUnitCost) : "-"}</strong>
              <small>{bestQuote?.supplierName ?? "Sem fornecedor"}</small>
            </div>
            <div>
              <span>Fornecedor selecionado</span>
              <strong>{selectedSupplierQuote ? currency.format(selectedSupplierQuote.lastUnitCost) : "-"}</strong>
              <small>{selectedSupplierQuote ? `${selectedSupplierQuote.purchaseCount} compras` : "Sem historico"}</small>
            </div>
            <div>
              <span>Preco atual</span>
              <strong>{unitCost > 0 ? currency.format(unitCost) : "-"}</strong>
              <small>Calculado pelo lancamento</small>
            </div>
          </div>
          <div className="purchase-quote-list">
            {quotes.slice(0, 6).map((quote) => (
              <article className="purchase-quote-card" key={quote.supplierId}>
                <div>
                  <strong>{quote.supplierName}</strong>
                  <span>Ultimo: {currency.format(quote.lastUnitCost)} em {quote.lastPurchaseDate ? new Date(`${quote.lastPurchaseDate}T00:00:00`).toLocaleDateString("pt-BR") : "sem data"}</span>
                </div>
                <div>
                  <small>Media {currency.format(quote.averageUnitCost)}</small>
                  <small>Menor {currency.format(quote.minimumUnitCost)}</small>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function ProductionForm({ disabled, onSave, products }: { disabled: boolean; onSave: (input: Parameters<typeof createProduction>[0]) => void; products: Array<{ value: number; label: string; description?: string | null }> }) {
  const [productId, setProductId] = useState(products[0]?.value ?? 0);
  const [quantity, setQuantity] = useState(1);
  const [producedAt, setProducedAt] = useState(new Date().toISOString().slice(0, 10));
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  return (
    <section className="panel">
      <div className="panel-heading"><h2>Registrar producao</h2></div>
      <div className="form-grid management-form">
        <SearchableSelect label="Produto produzido" value={productId} options={products} placeholder="Digite o produto" onChange={setProductId} />
        <label>Quantidade produzida<input type="number" min="0" step="0.001" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
        <label>Data de producao<input type="date" value={producedAt} onChange={(event) => setProducedAt(event.target.value)} /></label>
        <label>Data de validade<input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
        <label>Observacao<input value={note} onChange={(event) => setNote(event.target.value)} /></label>
      </div>
      <button className="primary-action form-action" disabled={disabled} onClick={() => productId && quantity > 0 && onSave({ productId, quantity, producedAt, expiresAt, note })} type="button">
        <Save size={18} />{disabled ? "Salvando..." : "Registrar producao"}
      </button>
    </section>
  );
}
