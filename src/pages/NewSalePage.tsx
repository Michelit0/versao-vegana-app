import { Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createSale } from "../lib/repository";
import { currency } from "../lib/format";
import type { Customer, PaymentMethod, Product, SaleItemDraft } from "../types";
import { SearchableSelect } from "../components/SearchableSelect";

type NewSalePageProps = {
  customers: Customer[];
  products: Product[];
  paymentMethods: PaymentMethod[];
  onSaved: () => void;
};

export function NewSalePage({ customers, products, paymentMethods, onSaved }: NewSalePageProps) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? 0);
  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods[0]?.id ?? 0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [packageFee, setPackageFee] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<SaleItemDraft[]>([{ productId: products[0]?.id ?? 0, quantity: 1, note: "" }]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId && customers[0]) setCustomerId(customers[0].id);
    if (!paymentMethodId && paymentMethods[0]) setPaymentMethodId(paymentMethods[0].id);
    setItems((current) => current.map((item) => item.productId ? item : { ...item, productId: products[0]?.id ?? 0 }));
  }, [customerId, customers, paymentMethodId, paymentMethods, products]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      return sum + (product?.price ?? 0) * item.quantity;
    }, 0);
  }, [items, products]);

  const paymentFee = useMemo(() => {
    const method = paymentMethods.find((item) => item.id === paymentMethodId);
    return subtotal * (method?.feeRate ?? 0);
  }, [paymentMethodId, paymentMethods, subtotal]);

  const finalAmount = subtotal + deliveryFee + packageFee - discount - paymentFee;
  const customerOptions = customers.map((customer) => ({
    value: customer.id,
    label: customer.name,
    description: [customer.phone, customer.region].filter(Boolean).join(" - ")
  }));
  const paymentOptions = paymentMethods.map((method) => ({
    value: method.id,
    label: method.name,
    description: method.brand
  }));
  const productOptions = products.map((product) => ({
    value: product.id,
    label: product.name,
    description: `${product.category} - ${currency.format(product.price)}`
  }));

  function updateItem(index: number, patch: Partial<SaleItemDraft>) {
    setItems((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, ...patch } : item));
  }

  async function submitSale() {
    setMessage(null);
    if (!customerId || !paymentMethodId || items.some((item) => !item.productId || item.quantity <= 0)) {
      setMessage("Confira cliente, forma de pagamento e itens antes de salvar.");
      return;
    }
    setSaving(true);
    try {
      await createSale({ customerId, paymentMethodId, deliveryFee, packageFee, discount, items });
      onSaved();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível salvar a venda.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="content-stack">
      <div className="panel">
        <div className="form-grid">
          <SearchableSelect label="Cliente" value={customerId} options={customerOptions} placeholder="Digite nome, telefone ou região" onChange={setCustomerId} />
          <SearchableSelect label="Forma de pagamento" value={paymentMethodId} options={paymentOptions} placeholder="Digite Pix, crédito..." onChange={setPaymentMethodId} />
          <label>
            Taxa entrega
            <input type="number" min="0" step="0.01" value={deliveryFee} onChange={(event) => setDeliveryFee(Number(event.target.value))} />
          </label>
          <label>
            Taxa embalagem
            <input type="number" min="0" step="0.01" value={packageFee} onChange={(event) => setPackageFee(Number(event.target.value))} />
          </label>
          <label>
            Desconto
            <input type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} />
          </label>
        </div>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <h2>Itens do pedido</h2>
          <button
            className="secondary-action"
            type="button"
            onClick={() => setItems((current) => [...current, { productId: products[0]?.id ?? 0, quantity: 1, note: "" }])}
          >
            Adicionar item
          </button>
        </div>
        <div className="items-stack">
          {items.map((item, index) => {
            const product = products.find((candidate) => candidate.id === item.productId);
            return (
              <div className="item-row" key={`${item.productId}-${index}`}>
                <SearchableSelect
                  label="Produto"
                  value={item.productId}
                  options={productOptions}
                  placeholder="Digite o produto"
                  onChange={(productId) => updateItem(index, { productId })}
                />
                <label>
                  Qtd
                  <input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} />
                </label>
                <label>
                  Observação
                  <input placeholder="Ex.: sem pimenta" value={item.note} onChange={(event) => updateItem(index, { note: event.target.value })} />
                </label>
                <div className="line-total">
                  <span>Total do item</span>
                  <strong>{currency.format((product?.price ?? 0) * item.quantity)}</strong>
                </div>
                <div className="line-action">
                  <span>Remover</span>
                  <button
                    className="icon-action"
                    type="button"
                    aria-label="Remover item"
                    onClick={() => setItems((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                    disabled={items.length === 1}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="checkout-bar">
        <div>
          <span>Subtotal</span>
          <strong>{currency.format(subtotal)}</strong>
        </div>
        <div>
          <span>Taxa cartão</span>
          <strong>{currency.format(paymentFee)}</strong>
        </div>
        <div>
          <span>Total final</span>
          <strong>{currency.format(finalAmount)}</strong>
        </div>
        <button className="primary-action" type="button" onClick={submitSale} disabled={saving}>
          <Save size={18} />
          {saving ? "Salvando..." : "Salvar pedido"}
        </button>
      </footer>
      {message ? <div className="alert">{message}</div> : null}
    </section>
  );
}
