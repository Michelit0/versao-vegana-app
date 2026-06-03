import { Save } from "lucide-react";
import { useState } from "react";
import { SearchableSelect } from "../components/SearchableSelect";
import { currency } from "../lib/format";
import { createProduction, createPurchase } from "../lib/repository";
import type { Measure, Product, Resource, Supplier } from "../types";

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
      setMessage(success);
      await onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível registrar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="content-stack">
      <div className="tab-row">
        <button className={mode === "compra" ? "tab-button active" : "tab-button"} onClick={() => setMode("compra")} type="button">Compra</button>
        <button className={mode === "producao" ? "tab-button active" : "tab-button"} onClick={() => setMode("producao")} type="button">Produção</button>
      </div>
      {message ? <div className="alert inline-alert">{message}</div> : null}
      {mode === "compra" ? (
        <PurchaseForm disabled={saving} measures={measures} onSave={(input) => run(() => createPurchase(input), "Compra registrada e estoque atualizado.")} resources={resourceOptions} suppliers={supplierOptions} />
      ) : (
        <ProductionForm disabled={saving} onSave={(input) => run(() => createProduction(input), "Produção registrada.")} products={productOptions} />
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
  return (
    <section className="panel">
      <div className="panel-heading"><h2>Registrar compra</h2><span className="muted-count">{currency.format(totalCost)}</span></div>
      <div className="form-grid management-form">
        <SearchableSelect label="Recurso comprado" value={resourceId} options={resources} placeholder="Digite o recurso" onChange={setResourceId} />
        <SearchableSelect label="Fornecedor" value={supplierId} options={suppliers} placeholder="Digite o fornecedor" onChange={setSupplierId} />
        <label>Quantidade<input type="number" min="0" step="0.001" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
        <label>Custo total<input type="number" min="0" step="0.01" value={totalCost} onChange={(event) => setTotalCost(Number(event.target.value))} /></label>
        <label>Data da compra<input type="date" value={purchasedAt} onChange={(event) => setPurchasedAt(event.target.value)} /></label>
        <label>Medida<select value={measure} onChange={(event) => setMeasure(event.target.value)}>{measures.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
        <label>Nota fiscal<input value={invoice} onChange={(event) => setInvoice(event.target.value)} /></label>
      </div>
      <button className="primary-action form-action" disabled={disabled} onClick={() => resourceId && supplierId && quantity > 0 && onSave({ resourceId, supplierId, quantity, purchasedAt, totalCost, measure, invoice })} type="button">
        <Save size={18} />{disabled ? "Salvando..." : "Registrar compra"}
      </button>
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
      <div className="panel-heading"><h2>Registrar produção</h2></div>
      <div className="form-grid management-form">
        <SearchableSelect label="Produto produzido" value={productId} options={products} placeholder="Digite o produto" onChange={setProductId} />
        <label>Quantidade produzida<input type="number" min="0" step="0.001" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
        <label>Data de produção<input type="date" value={producedAt} onChange={(event) => setProducedAt(event.target.value)} /></label>
        <label>Data de validade<input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
        <label>Observação<input value={note} onChange={(event) => setNote(event.target.value)} /></label>
      </div>
      <button className="primary-action form-action" disabled={disabled} onClick={() => productId && quantity > 0 && onSave({ productId, quantity, producedAt, expiresAt, note })} type="button">
        <Save size={18} />{disabled ? "Salvando..." : "Registrar produção"}
      </button>
    </section>
  );
}
