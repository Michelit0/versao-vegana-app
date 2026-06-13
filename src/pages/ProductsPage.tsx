import { Edit3, Save, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { currency } from "../lib/format";
import { createProduct, deleteProduct, updateProduct } from "../lib/repository";
import type { Product } from "../types";

type ProductsPageProps = {
  products: Product[];
  loading: boolean;
  onChanged: () => void;
};

type ProductDraft = {
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  tags: string;
  price: number;
  available: boolean;
  yieldServings: number;
};

const blankDraft: ProductDraft = {
  name: "",
  description: "",
  category: "Pratos Principais",
  imageUrl: "",
  tags: "",
  price: 0,
  available: true,
  yieldServings: 20
};

export function ProductsPage({ products, loading, onChanged }: ProductsPageProps) {
  const [draft, setDraft] = useState<ProductDraft>(blankDraft);
  const [editing, setEditing] = useState<Product | null>(null);
  const [editDraft, setEditDraft] = useState<ProductDraft>(blankDraft);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const term = normalize(query);
    if (!term) return products;
    return products.filter((product) => normalize([
      product.name,
      product.description,
      product.category,
      ...(product.tags ?? []),
      product.measure,
      product.available ? "disponivel" : "indisponivel"
    ].filter(Boolean).join(" ")).includes(term));
  }, [products, query]);

  async function submitProduct() {
    setMessage(null);
    if (!draft.name.trim() || draft.price <= 0) {
      setMessage("Informe nome e preco maior que zero.");
      return;
    }
    setSaving(true);
    try {
      await createProduct({
        name: draft.name,
        description: draft.description,
        category: draft.category,
        price: draft.price,
        available: draft.available,
        weight: 1,
        measure: "unidade",
        imageUrl: draft.imageUrl,
        tags: parseTags(draft.tags),
        featuredSelfService: false,
        yieldServings: draft.yieldServings
      });
      setDraft(blankDraft);
      await onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nao foi possivel salvar o produto.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(product: Product) {
    setEditing(product);
    setEditDraft({
      name: product.name,
      description: product.description ?? "",
      category: product.category,
      imageUrl: product.imageUrl ?? "",
      tags: product.tags?.join(", ") ?? "",
      price: product.price,
      available: product.available,
      yieldServings: product.yieldServings ?? 20
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setMessage(null);
    setSaving(true);
    try {
      await updateProduct({
        id: editing.id,
        name: editDraft.name,
        description: editDraft.description,
        category: editDraft.category,
        price: editDraft.price,
        available: editDraft.available,
        weight: editing.weight,
        measure: editing.measure,
        resourceId: editing.resourceId,
        imageUrl: editDraft.imageUrl,
        tags: parseTags(editDraft.tags),
        featuredSelfService: editing.featuredSelfService ?? false,
        yieldServings: editDraft.yieldServings
      });
      setEditing(null);
      await onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nao foi possivel atualizar o produto.");
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(product: Product) {
    if (!product.name.toLowerCase().includes("teste")) {
      setMessage("Por seguranca, a tela so remove produtos de teste.");
      return;
    }
    setSaving(true);
    try {
      await deleteProduct(product.id);
      await onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nao foi possivel remover o produto.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <EmptyState title="Carregando produtos" description="Buscando cardapio e disponibilidade." />;
  if (!products.length) return <EmptyState title="Sem produtos" description="Cadastre produtos para vender pelo sistema." />;

  return (
    <section className="content-stack">
      <ProductFormPanel title="Novo produto" draft={draft} disabled={saving} onChange={setDraft} onSave={submitProduct} actionLabel="Salvar produto" />

      {editing ? (
        <ProductFormPanel
          title={`Editar ${editing.name}`}
          draft={editDraft}
          disabled={saving}
          onChange={setEditDraft}
          onCancel={() => setEditing(null)}
          onSave={saveEdit}
          actionLabel="Salvar alteracoes"
        />
      ) : null}

      {message ? <div className="alert inline-alert">{message}</div> : null}

      <section className="panel">
        <div className="panel-heading">
          <h2>Cardapio operacional</h2>
          <span className="muted-count">{filteredProducts.length} de {products.length}</span>
        </div>
        <label className="search-field">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por produto, categoria ou disponibilidade" />
        </label>
        <div className="card-grid">
          {filteredProducts.map((product) => (
            <article className="entity-card product-card" key={product.id}>
              {product.imageUrl ? <img className="product-card-image" src={product.imageUrl} alt={product.name} loading="lazy" /> : null}
              <strong>{product.name}</strong>
              {product.description ? <span>{product.description}</span> : null}
              <span>{product.category}</span>
              <b>{currency.format(product.price)}</b>
              <small>{product.available ? "Disponivel" : "Indisponivel"}</small>
              <small>Rende {product.yieldServings ?? 20} pessoas</small>
              {product.featuredSelfService ? <em>Destaque no autoatendimento</em> : null}
              {product.tags?.length ? <div className="tag-row">{product.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
              <button className="secondary-action" type="button" onClick={() => startEdit(product)} disabled={saving}>
                <Edit3 size={16} />
                Editar
              </button>
              {product.name.toLowerCase().includes("teste") ? (
                <button className="secondary-action danger-action" type="button" onClick={() => removeProduct(product)} disabled={saving}>
                  <Trash2 size={16} />
                  Remover teste
                </button>
              ) : null}
            </article>
          ))}
        </div>
        {!filteredProducts.length ? <EmptyState title="Nenhum produto encontrado" description="Tente buscar por outro produto ou categoria." /> : null}
      </section>
    </section>
  );
}

function ProductFormPanel({ actionLabel, disabled, draft, onCancel, onChange, onSave, title }: {
  actionLabel: string;
  disabled: boolean;
  draft: ProductDraft;
  onCancel?: () => void;
  onChange: (draft: ProductDraft) => void;
  onSave: () => void;
  title: string;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{title}</h2>
        {onCancel ? <button className="icon-action" type="button" onClick={onCancel}><X size={17} /></button> : null}
      </div>
      <div className="form-grid product-form">
        <label>Nome<input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} placeholder="Produto de teste" /></label>
        <label>Descricao<input value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} placeholder="Resumo curto" /></label>
        <label>Categoria<input value={draft.category} onChange={(event) => onChange({ ...draft, category: event.target.value })} /></label>
        <label>URL da imagem<input value={draft.imageUrl} onChange={(event) => onChange({ ...draft, imageUrl: event.target.value })} placeholder="https://..." /></label>
        <label>Etiquetas<input value={draft.tags} onChange={(event) => onChange({ ...draft, tags: event.target.value })} placeholder="sem gluten, congelado" /></label>
        <label>Preco<input type="number" min="0" step="0.01" value={draft.price} onChange={(event) => onChange({ ...draft, price: Number(event.target.value) })} /></label>
        <label>Rendimento da receita<input type="number" min="1" step="1" value={draft.yieldServings} onChange={(event) => onChange({ ...draft, yieldServings: Number(event.target.value) })} /></label>
        <label>Disponibilidade<select value={draft.available ? "Sim" : "Nao"} onChange={(event) => onChange({ ...draft, available: event.target.value === "Sim" })}><option>Sim</option><option>Nao</option></select></label>
        <button className="primary-action form-action" type="button" onClick={onSave} disabled={disabled}>
          <Save size={18} />
          {disabled ? "Salvando..." : actionLabel}
        </button>
      </div>
    </section>
  );
}

function parseTags(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
