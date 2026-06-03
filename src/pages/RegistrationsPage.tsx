import { Save } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { SearchableSelect } from "../components/SearchableSelect";
import { createCustomer, createProduct, createRecipe, createResource, createSupplier } from "../lib/repository";
import type { Category, Customer, Measure, Product, Region, Resource } from "../types";

type RegistrationsPageProps = {
  categories: Category[];
  customers: Customer[];
  measures: Measure[];
  products: Product[];
  regions: Region[];
  resources: Resource[];
  onChanged: () => Promise<void>;
};

type Tab = "cliente" | "fornecedor" | "recurso" | "produto" | "receita";

export function RegistrationsPage({ categories, measures, products, regions, resources, onChanged }: RegistrationsPageProps) {
  const [tab, setTab] = useState<Tab>("cliente");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const productOptions = products.map((item) => ({ value: item.id, label: item.name, description: item.category }));
  const resourceOptions = resources.map((item) => ({ value: item.id, label: item.name, description: `${item.stock} ${item.measure ?? ""}` }));
  const regionOptions = regions.map((item) => ({ value: item.id, label: item.name, description: `Taxa ${item.fee.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` }));
  const categoryOptions = categories.map((item) => ({ value: item.id, label: item.name, description: item.type }));

  async function run(action: () => Promise<unknown>, success: string) {
    setSaving(true);
    setMessage(null);
    try {
      await action();
      setMessage(success);
      await onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="content-stack">
      <div className="tab-row">
        {[
          ["cliente", "Cliente"],
          ["fornecedor", "Fornecedor"],
          ["recurso", "Recurso"],
          ["produto", "Produto"],
          ["receita", "Receita"]
        ].map(([id, label]) => (
          <button className={tab === id ? "tab-button active" : "tab-button"} key={id} onClick={() => setTab(id as Tab)} type="button">
            {label}
          </button>
        ))}
      </div>
      {message ? <div className="alert inline-alert">{message}</div> : null}
      {tab === "cliente" ? <CustomerForm disabled={saving} onSave={(input) => run(() => createCustomer(input), "Cliente cadastrado com sucesso.")} regions={regionOptions} /> : null}
      {tab === "fornecedor" ? <SupplierForm disabled={saving} onSave={(input) => run(() => createSupplier(input), "Fornecedor cadastrado com sucesso.")} /> : null}
      {tab === "recurso" ? <ResourceForm categories={categoryOptions} disabled={saving} measures={measures} onSave={(input) => run(() => createResource(input), "Recurso cadastrado com sucesso.")} /> : null}
      {tab === "produto" ? <ProductForm categories={categoryOptions} disabled={saving} measures={measures} onSave={(input) => run(() => createProduct(input), "Produto cadastrado com sucesso.")} resources={resourceOptions} /> : null}
      {tab === "receita" ? <RecipeForm disabled={saving} onSave={(input) => run(() => createRecipe(input), "Ingrediente incluído na receita.")} products={productOptions} resources={resourceOptions} measures={measures} /> : null}
    </section>
  );
}

function CustomerForm({ disabled, onSave, regions }: { disabled: boolean; onSave: (input: Parameters<typeof createCustomer>[0]) => void; regions: Array<{ value: number; label: string; description?: string }> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [regionId, setRegionId] = useState(regions[0]?.value ?? 0);
  const [birthDate, setBirthDate] = useState("");
  const [diet, setDiet] = useState("");
  const region = useMemo(() => regions.find((item) => item.value === regionId), [regionId, regions]);

  return (
    <FormPanel title="Adicionar cliente" onSubmit={() => name && phone && address && onSave({ name, email, phone, address, regionId, region: region?.label ?? null, birthDate, dietaryPreferences: diet })} disabled={disabled}>
      <label>Nome<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Telefone<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
      <label>Endereço<input value={address} onChange={(event) => setAddress(event.target.value)} /></label>
      <SearchableSelect label="Região" value={regionId} options={regions} placeholder="Digite a região" onChange={setRegionId} />
      <label>Data de nascimento<input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></label>
      <label>Preferências alimentares<input value={diet} onChange={(event) => setDiet(event.target.value)} /></label>
    </FormPanel>
  );
}

function SupplierForm({ disabled, onSave }: { disabled: boolean; onSave: (input: Parameters<typeof createSupplier>[0]) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  return (
    <FormPanel title="Adicionar fornecedor" onSubmit={() => name && onSave({ name, phone, email, note })} disabled={disabled}>
      <label>Nome<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Telefone<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
      <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Observação<input value={note} onChange={(event) => setNote(event.target.value)} /></label>
    </FormPanel>
  );
}

function ResourceForm({ categories, disabled, measures, onSave }: { categories: Array<{ value: number; label: string; description?: string }>; disabled: boolean; measures: Measure[]; onSave: (input: Parameters<typeof createResource>[0]) => void }) {
  const [type, setType] = useState("Ingrediente");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.value ?? 0);
  const [stock, setStock] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [measure, setMeasure] = useState(measures[0]?.name ?? "unidade");
  const [expiresAt, setExpiresAt] = useState("");
  const category = categories.find((item) => item.value === categoryId);
  return (
    <FormPanel title="Adicionar recurso" onSubmit={() => name && onSave({ type, name, categoryId, category: category?.label, stock, unitCost, measure, expiresAt })} disabled={disabled}>
      <label>Tipo<input value={type} onChange={(event) => setType(event.target.value)} /></label>
      <label>Nome<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <SearchableSelect label="Categoria" value={categoryId} options={categories} placeholder="Digite a categoria" onChange={setCategoryId} />
      <label>Estoque<input type="number" min="0" step="0.001" value={stock} onChange={(event) => setStock(Number(event.target.value))} /></label>
      <label>Custo unitário<input type="number" min="0" step="0.01" value={unitCost} onChange={(event) => setUnitCost(Number(event.target.value))} /></label>
      <label>Medida<select value={measure} onChange={(event) => setMeasure(event.target.value)}>{measures.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
      <label>Validade<input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
    </FormPanel>
  );
}

function ProductForm({ categories, disabled, measures, onSave, resources }: { categories: Array<{ value: number; label: string; description?: string }>; disabled: boolean; measures: Measure[]; onSave: (input: Parameters<typeof createProduct>[0]) => void; resources: Array<{ value: number; label: string; description?: string }> }) {
  const [name, setName] = useState("");
  const [resourceId, setResourceId] = useState(resources[0]?.value ?? 0);
  const [categoryId, setCategoryId] = useState(categories[0]?.value ?? 0);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState("");
  const [featuredSelfService, setFeaturedSelfService] = useState(false);
  const [weight, setWeight] = useState(1);
  const [measure, setMeasure] = useState(measures[0]?.name ?? "unidade");
  const [price, setPrice] = useState(0);
  const [available, setAvailable] = useState("Sim");
  const category = categories.find((item) => item.value === categoryId);
  const parsedTags = tags.split(",").map((item) => item.trim()).filter(Boolean);
  return (
    <FormPanel title="Adicionar produto" onSubmit={() => name && price > 0 && onSave({ name, description, category: category?.label ?? "Sem categoria", categoryId, price, available: available === "Sim", weight, measure, resourceId, imageUrl, tags: parsedTags, featuredSelfService })} disabled={disabled}>
      <label>Nome<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <SearchableSelect label="Recurso vinculado ao estoque" value={resourceId} options={resources} placeholder="Digite o recurso" onChange={setResourceId} />
      <SearchableSelect label="Categoria" value={categoryId} options={categories} placeholder="Digite a categoria" onChange={setCategoryId} />
      <label>Descrição<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Resumo curto para o cardápio" /></label>
      <label>URL da imagem<input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." /></label>
      <label>Etiquetas<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="sem gluten, congelado" /></label>
      <label>Peso<input type="number" min="0" step="0.001" value={weight} onChange={(event) => setWeight(Number(event.target.value))} /></label>
      <label>Medida<select value={measure} onChange={(event) => setMeasure(event.target.value)}>{measures.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
      <label>Preço<input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(Number(event.target.value))} /></label>
      <label>Disponibilidade<select value={available} onChange={(event) => setAvailable(event.target.value)}><option>Sim</option><option>Não</option></select></label>
      <label className="checkbox-field"><input type="checkbox" checked={featuredSelfService} onChange={(event) => setFeaturedSelfService(event.target.checked)} /> Destaque no autoatendimento</label>
    </FormPanel>
  );
}

function RecipeForm({ disabled, measures, onSave, products, resources }: { disabled: boolean; measures: Measure[]; onSave: (input: Parameters<typeof createRecipe>[0]) => void; products: Array<{ value: number; label: string; description?: string }>; resources: Array<{ value: number; label: string; description?: string }> }) {
  const [productId, setProductId] = useState(products[0]?.value ?? 0);
  const [resourceId, setResourceId] = useState(resources[0]?.value ?? 0);
  const [quantity, setQuantity] = useState(0);
  const [measure, setMeasure] = useState(measures[0]?.name ?? "unidade");
  return (
    <FormPanel title="Adicionar ingrediente da receita" onSubmit={() => productId && resourceId && quantity > 0 && onSave({ productId, resourceId, quantity, measure })} disabled={disabled}>
      <SearchableSelect label="Produto final" value={productId} options={products} placeholder="Digite o produto" onChange={setProductId} />
      <SearchableSelect label="Ingrediente/Recurso" value={resourceId} options={resources} placeholder="Digite o recurso" onChange={setResourceId} />
      <label>Quantidade do ingrediente<input type="number" min="0" step="0.001" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
      <label>Medida<select value={measure} onChange={(event) => setMeasure(event.target.value)}>{measures.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
    </FormPanel>
  );
}

function FormPanel({ children, disabled, onSubmit, title }: { children: React.ReactNode; disabled: boolean; onSubmit: () => void; title: string }) {
  return (
    <section className="panel">
      <div className="panel-heading"><h2>{title}</h2></div>
      <div className="form-grid management-form">{children}</div>
      <button className="primary-action form-action" disabled={disabled} onClick={onSubmit} type="button">
        <Save size={18} />
        {disabled ? "Salvando..." : "Salvar"}
      </button>
    </section>
  );
}
