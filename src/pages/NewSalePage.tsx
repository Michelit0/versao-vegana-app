import { Plus, Save, Trash2, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createCustomer, createSale } from "../lib/repository";
import { currency } from "../lib/format";
import type { Customer, PaymentMethod, Product, Region, SaleItemDraft } from "../types";
import { SearchableSelect } from "../components/SearchableSelect";

type NewSalePageProps = {
  customers: Customer[];
  products: Product[];
  paymentMethods: PaymentMethod[];
  regions: Region[];
  onCustomerCreated: () => Promise<void>;
  onSaved: () => void;
};

export function NewSalePage({ customers, products, paymentMethods, regions, onCustomerCreated, onSaved }: NewSalePageProps) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? 0);
  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods[0]?.id ?? 0);
  const [deliveryType, setDeliveryType] = useState<"retirada" | "entrega">("retirada");
  const [paymentStatus, setPaymentStatus] = useState<"pago" | "pendente" | "pagar_na_retirada">("pago");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [packageFee, setPackageFee] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [saleNote, setSaleNote] = useState("");
  const [items, setItems] = useState<SaleItemDraft[]>([{ productId: products[0]?.id ?? 0, quantity: 1, note: "" }]);
  const [saving, setSaving] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [newCustomerRegionId, setNewCustomerRegionId] = useState(regions[0]?.id ?? 0);
  const [newCustomerDiet, setNewCustomerDiet] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId && customers[0]) setCustomerId(customers[0].id);
    if (!paymentMethodId && paymentMethods[0]) setPaymentMethodId(paymentMethods[0].id);
    if (!newCustomerRegionId && regions[0]) setNewCustomerRegionId(regions[0].id);
    setItems((current) => current.map((item) => item.productId ? item : { ...item, productId: products[0]?.id ?? 0 }));
  }, [customerId, customers, newCustomerRegionId, paymentMethodId, paymentMethods, products, regions]);

  useEffect(() => {
    if (deliveryType === "retirada") {
      setDeliveryFee(0);
      setPackageFee(0);
    }
  }, [deliveryType]);

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
  const regionOptions = regions.map((region) => ({
    value: region.id,
    label: region.name,
    description: `Taxa ${currency.format(region.fee)}`
  }));
  const newCustomerRegion = regions.find((region) => region.id === newCustomerRegionId);

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
      await createSale({ customerId, paymentMethodId, deliveryType, paymentStatus, deliveryFee, packageFee, discount, items, note: saleNote.trim() || null });
      onSaved();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível salvar a venda.");
    } finally {
      setSaving(false);
    }
  }

  async function submitQuickCustomer() {
    setMessage(null);
    if (!newCustomerName.trim() || !newCustomerPhone.trim() || !newCustomerAddress.trim()) {
      setMessage("Informe nome, telefone e endereço do novo cliente.");
      return;
    }

    setSavingCustomer(true);
    try {
      const customer = await createCustomer({
        name: newCustomerName,
        email: newCustomerEmail,
        phone: newCustomerPhone,
        address: newCustomerAddress,
        regionId: newCustomerRegionId || undefined,
        region: newCustomerRegion?.name ?? null,
        dietaryPreferences: newCustomerDiet
      });
      setCustomerId(customer.id);
      setShowCustomerForm(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerEmail("");
      setNewCustomerAddress("");
      setNewCustomerDiet("");
      await onCustomerCreated();
      setMessage("Cliente cadastrado e selecionado na venda atual.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível cadastrar o cliente.");
    } finally {
      setSavingCustomer(false);
    }
  }

  return (
    <section className="content-stack">
      <div className="panel">
        <div className="form-grid sale-header-grid">
          <div className="sale-customer-field">
            <SearchableSelect label="Cliente" value={customerId} options={customerOptions} placeholder="Digite nome, telefone ou região" onChange={setCustomerId} />
          </div>
          <SearchableSelect label="Forma de pagamento" value={paymentMethodId} options={paymentOptions} placeholder="Digite Pix, crédito..." onChange={setPaymentMethodId} />
          <label>
            Atendimento
            <select value={deliveryType} onChange={(event) => setDeliveryType(event.target.value as "retirada" | "entrega")}>
              <option value="retirada">Retirada na loja</option>
              <option value="entrega">Entrega</option>
            </select>
          </label>
          <label>
            Status pagamento
            <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as "pago" | "pendente" | "pagar_na_retirada")}>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="pagar_na_retirada">Pagar na retirada</option>
            </select>
          </label>
          <label>
            Taxa entrega
            <input type="number" min="0" step="0.01" value={deliveryFee} disabled={deliveryType === "retirada"} onChange={(event) => setDeliveryFee(Number(event.target.value))} />
          </label>
          <label>
            Taxa embalagem
            <input type="number" min="0" step="0.01" value={packageFee} disabled={deliveryType === "retirada"} onChange={(event) => setPackageFee(Number(event.target.value))} />
          </label>
          <label>
            Desconto
            <input type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} />
          </label>
          <label className="form-wide">
            Observação do pedido
            <input maxLength={160} value={saleNote} onChange={(event) => setSaleNote(event.target.value)} placeholder="Ex.: retirar as 13h, sem cebola, embalagem separada" />
          </label>
        </div>
        {!showCustomerForm ? (
          <div className="sale-secondary-row">
            <button className="secondary-action compact-action" type="button" onClick={() => setShowCustomerForm(true)}>
              <UserPlus size={16} />
              Novo cliente
            </button>
          </div>
        ) : null}
        {showCustomerForm ? (
          <div className="quick-customer-panel">
            <div className="quick-customer-heading">
              <div>
                <h2>Cadastro rápido de cliente</h2>
                <span>Salva o cliente e mantém esta venda em andamento.</span>
              </div>
              <button className="icon-action" type="button" aria-label="Fechar cadastro rápido" onClick={() => setShowCustomerForm(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="form-grid quick-customer-form">
              <label>
                Nome
                <input value={newCustomerName} onChange={(event) => setNewCustomerName(event.target.value)} placeholder="Nome do cliente" />
              </label>
              <label>
                Telefone
                <input value={newCustomerPhone} onChange={(event) => setNewCustomerPhone(event.target.value)} placeholder="61999999999" />
              </label>
              <label>
                Email
                <input type="email" value={newCustomerEmail} onChange={(event) => setNewCustomerEmail(event.target.value)} placeholder="Opcional" />
              </label>
              <label>
                Endereço
                <input value={newCustomerAddress} onChange={(event) => setNewCustomerAddress(event.target.value)} placeholder="Endereço ou retirada" />
              </label>
              <SearchableSelect label="Região" value={newCustomerRegionId} options={regionOptions} placeholder="Digite a região" onChange={setNewCustomerRegionId} />
              <label>
                Preferências
                <input value={newCustomerDiet} onChange={(event) => setNewCustomerDiet(event.target.value)} placeholder="Ex.: sem gluten" />
              </label>
            </div>
            <div className="quick-customer-actions">
              <button className="secondary-action" type="button" onClick={() => setShowCustomerForm(false)} disabled={savingCustomer}>
                Cancelar
              </button>
              <button className="primary-action" type="button" onClick={submitQuickCustomer} disabled={savingCustomer}>
                <Plus size={18} />
                {savingCustomer ? "Salvando cliente..." : "Cadastrar e selecionar"}
              </button>
            </div>
          </div>
        ) : null}
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
