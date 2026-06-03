import { Minus, Plus, Receipt, RotateCcw, ShoppingBag, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { currency } from "../lib/format";
import { createSale } from "../lib/repository";
import type { PaymentMethod, Product, SaleItemDraft } from "../types";

type SelfServicePageProps = {
  paymentMethods: PaymentMethod[];
  products: Product[];
  onSaved: () => Promise<void>;
};

export function SelfServicePage({ paymentMethods, products, onSaved }: SelfServicePageProps) {
  const visibleProducts = useMemo(() => products.filter((item) => item.available), [products]);
  const categories = useMemo(() => Array.from(new Set(visibleProducts.map((item) => item.category).filter(Boolean))).sort(), [visibleProducts]);
  const [cart, setCart] = useState<SaleItemDraft[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods[0]?.id ?? 0);
  const [category, setCategory] = useState("destaques");
  const [saving, setSaving] = useState(false);
  const [ticket, setTicket] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentMethodId && paymentMethods[0]?.id) setPaymentMethodId(paymentMethods[0].id);
  }, [paymentMethodId, paymentMethods]);

  useEffect(() => {
    if (!cart.length) return;
    const timer = window.setTimeout(() => {
      setCart([]);
      setCustomerName("");
      setMessage("Carrinho limpo por inatividade.");
    }, 180000);
    return () => window.clearTimeout(timer);
  }, [cart]);

  const filteredProducts = useMemo(() => {
    const list = category === "todos"
      ? visibleProducts
      : category === "destaques"
        ? visibleProducts.filter((item) => item.featuredSelfService)
        : visibleProducts.filter((item) => item.category === category);

    const fallback = category === "destaques" && !list.length ? visibleProducts : list;
    return [...fallback].sort((a, b) => Number(b.featuredSelfService) - Number(a.featuredSelfService) || a.name.localeCompare(b.name, "pt-BR"));
  }, [category, visibleProducts]);

  const total = useMemo(() => cart.reduce((sum, item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return sum + (product?.price ?? 0) * item.quantity;
  }, 0), [cart, products]);

  function addProduct(product: Product) {
    setTicket(null);
    setMessage(null);
    setCart((current) => {
      const found = current.find((item) => item.productId === product.id);
      if (found) return current.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { productId: product.id, quantity: 1, note: "Autoatendimento" }];
    });
  }

  function changeQuantity(productId: number, delta: number) {
    setCart((current) => current
      .map((item) => item.productId === productId ? { ...item, quantity: item.quantity + delta } : item)
      .filter((item) => item.quantity > 0));
  }

  async function finishOrder() {
    if (!cart.length || !paymentMethodId) {
      setMessage("Escolha pelo menos um item e a forma de pagamento.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const order = await createSale({
        customerId: null,
        customerName: customerName.trim() || "Autoatendimento",
        paymentMethodId,
        deliveryFee: 0,
        packageFee: 0,
        discount: 0,
        items: cart,
        channel: "balcao",
        status: "pendente",
        serviceStatus: "nao_iniciado",
        note: "Pedido criado no autoatendimento"
      });
      setTicket(order.id);
      setCart([]);
      setCustomerName("");
      await onSaved();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível finalizar o pedido.");
    } finally {
      setSaving(false);
    }
  }

  function resetOrder() {
    setCart([]);
    setCustomerName("");
    setTicket(null);
    setMessage(null);
  }

  return (
    <section className="self-service-layout">
      <section className="self-service-products">
        <div className="self-service-hero">
          <div>
            <p className="eyebrow">Feira e balcão</p>
            <h2>Escolha, confirme e retire seu número</h2>
          </div>
          <span>{visibleProducts.length} itens disponíveis</span>
        </div>

        <div className="category-chip-row" aria-label="Categorias do cardápio">
          <button className={category === "destaques" ? "category-chip active" : "category-chip"} onClick={() => setCategory("destaques")} type="button">
            <Sparkles size={16} /> Destaques
          </button>
          <button className={category === "todos" ? "category-chip active" : "category-chip"} onClick={() => setCategory("todos")} type="button">Todos</button>
          {categories.map((item) => (
            <button className={category === item ? "category-chip active" : "category-chip"} key={item} onClick={() => setCategory(item)} type="button">
              {item}
            </button>
          ))}
        </div>

        <div className="product-tile-grid">
          {filteredProducts.map((product) => (
            <button className="product-tile self-product-tile" key={product.id} onClick={() => addProduct(product)} type="button">
              {product.imageUrl ? (
                <img className="product-tile-image" src={product.imageUrl} alt={product.name} loading="lazy" />
              ) : (
                <span className="product-image-placeholder"><ShoppingBag size={28} /></span>
              )}
              <span className="product-tile-content">
                <strong>{product.name}</strong>
                {product.description ? <small>{product.description}</small> : null}
                {product.tags?.length ? <span className="tag-row">{product.tags.slice(0, 3).map((tag) => <em key={tag}>{tag}</em>)}</span> : null}
                <b>{currency.format(product.price)}</b>
              </span>
            </button>
          ))}
        </div>
      </section>

      <aside className="checkout-panel" aria-live="polite">
        <div className="panel-heading">
          <h2>Resumo</h2>
          <button className="icon-action" onClick={resetOrder} title="Limpar pedido" type="button"><RotateCcw size={16} /></button>
        </div>
        {ticket ? (
          <div className="ticket-box ticket-box-large">
            <span>Pedido confirmado</span>
            <strong>#{ticket}</strong>
            <small>Mostre este número no balcão.</small>
          </div>
        ) : null}
        <label>Nome para chamar o pedido<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Opcional" /></label>
        <label>Pagamento<select value={paymentMethodId} onChange={(event) => setPaymentMethodId(Number(event.target.value))}>{paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label>
        <div className="cart-list">
          {cart.length ? cart.map((item) => {
            const product = products.find((candidate) => candidate.id === item.productId);
            return (
              <div className="cart-row" key={item.productId}>
                <strong>{product?.name}</strong>
                <span>{currency.format((product?.price ?? 0) * item.quantity)}</span>
                <div>
                  <button className="icon-action" onClick={() => changeQuantity(item.productId, -1)} type="button"><Minus size={16} /></button>
                  <b>{item.quantity}</b>
                  <button className="icon-action" onClick={() => changeQuantity(item.productId, 1)} type="button"><Plus size={16} /></button>
                  <button className="icon-action" onClick={() => changeQuantity(item.productId, -999)} type="button"><Trash2 size={16} /></button>
                </div>
              </div>
            );
          }) : <div className="cart-empty"><ShoppingBag size={24} /><span>Toque nos produtos para montar o pedido.</span></div>}
        </div>
        <div className="self-total"><span>Total</span><strong>{currency.format(total)}</strong></div>
        <button className="primary-action self-finish" disabled={saving || !cart.length} onClick={finishOrder} type="button">
          <Receipt size={20} />{saving ? "Finalizando..." : "Confirmar pedido"}
        </button>
        {message ? <div className="alert inline-alert">{message}</div> : null}
      </aside>
    </section>
  );
}
