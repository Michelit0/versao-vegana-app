import { EmptyState } from "../components/EmptyState";
import { currency } from "../lib/format";
import { createProduct, deleteProduct } from "../lib/repository";
import type { Product } from "../types";
import { Save, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type ProductsPageProps = {
  products: Product[];
  loading: boolean;
  onChanged: () => void;
};

export function ProductsPage({ products, loading, onChanged }: ProductsPageProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Pratos Principais");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState("");
  const [featuredSelfService, setFeaturedSelfService] = useState(false);
  const [price, setPrice] = useState(0);
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
    if (!name.trim() || price <= 0) {
      setMessage("Informe nome e preço maior que zero.");
      return;
    }
    setSaving(true);
    try {
      await createProduct({
        name,
        description,
        category,
        price,
        available: true,
        weight: 1,
        measure: "unidade",
        imageUrl,
        tags: tags.split(",").map((item) => item.trim()).filter(Boolean),
        featuredSelfService
      });
      setName("");
      setDescription("");
      setImageUrl("");
      setTags("");
      setFeaturedSelfService(false);
      setPrice(0);
      await onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível salvar o produto.");
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
      setMessage(err instanceof Error ? err.message : "Não foi possível remover o produto.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <EmptyState title="Carregando produtos" description="Buscando cardapio e disponibilidade." />;
  if (!products.length) return <EmptyState title="Sem produtos" description="Cadastre produtos para vender pelo sistema." />;

  return (
    <section className="content-stack">
      <section className="panel">
        <div className="panel-heading">
          <h2>Novo produto</h2>
        </div>
        <div className="form-grid product-form">
          <label>
            Nome
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Produto de teste" />
          </label>
          <label>
            Descrição
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Resumo curto" />
          </label>
          <label>
            Categoria
            <input value={category} onChange={(event) => setCategory(event.target.value)} />
          </label>
          <label>
            URL da imagem
            <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." />
          </label>
          <label>
            Etiquetas
            <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="sem gluten, congelado" />
          </label>
          <label>
            Preço
            <input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(Number(event.target.value))} />
          </label>
          <label className="checkbox-field">
            <input type="checkbox" checked={featuredSelfService} onChange={(event) => setFeaturedSelfService(event.target.checked)} />
            Destaque no autoatendimento
          </label>
          <button className="primary-action form-action" type="button" onClick={submitProduct} disabled={saving}>
            <Save size={18} />
            {saving ? "Salvando..." : "Salvar produto"}
          </button>
        </div>
        {message ? <div className="alert inline-alert">{message}</div> : null}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Cardápio operacional</h2>
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
              <small>{product.available ? "Disponível" : "Indisponível"}</small>
              {product.featuredSelfService ? <em>Destaque no autoatendimento</em> : null}
              {product.tags?.length ? <div className="tag-row">{product.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
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

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
