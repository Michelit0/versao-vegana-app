import { Save, XCircle } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "../components/SearchableSelect";
import { createCustomer, createProduct, createRecipe, createResource, createSupplier, updateCustomer, updateRecipeItem, updateResource, updateSupplier } from "../lib/repository";
import type { Category, Customer, Measure, Product, RecipeItem, Region, Resource, Supplier } from "../types";

type RegistrationsPageProps = {
  categories: Category[];
  customers: Customer[];
  measures: Measure[];
  products: Product[];
  recipeItems: RecipeItem[];
  regions: Region[];
  resources: Resource[];
  suppliers: Supplier[];
  onChanged: () => Promise<void>;
};

type Tab = "cliente" | "fornecedor" | "recurso" | "produto" | "receita";

export function RegistrationsPage({ categories, customers, measures, products, recipeItems, regions, resources, suppliers, onChanged }: RegistrationsPageProps) {
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
      {tab === "cliente" ? (
        <>
          <CustomerForm disabled={saving} onSave={(input) => run(() => createCustomer(input), "Cliente cadastrado com sucesso.")} regions={regionOptions} />
          <CustomerEditor customers={customers} disabled={saving} onSave={(input) => run(() => updateCustomer(input), "Cliente atualizado com sucesso.")} regions={regionOptions} />
        </>
      ) : null}
      {tab === "fornecedor" ? (
        <>
          <SupplierForm disabled={saving} onSave={(input) => run(() => createSupplier(input), "Fornecedor cadastrado com sucesso.")} />
          <SupplierEditor disabled={saving} onSave={(input) => run(() => updateSupplier(input), "Fornecedor atualizado com sucesso.")} suppliers={suppliers} />
        </>
      ) : null}
      {tab === "recurso" ? (
        <>
          <ResourceForm categories={categoryOptions} disabled={saving} measures={measures} onSave={(input) => run(() => createResource(input), "Recurso cadastrado com sucesso.")} />
          <ResourceEditor categories={categoryOptions} disabled={saving} measures={measures} onSave={(input) => run(() => updateResource(input), "Recurso atualizado com sucesso.")} resources={resources} />
        </>
      ) : null}
      {tab === "produto" ? <ProductForm categories={categoryOptions} disabled={saving} measures={measures} onSave={(input) => run(() => createProduct(input), "Produto cadastrado com sucesso.")} resources={resourceOptions} /> : null}
      {tab === "receita" ? <RecipeForm disabled={saving} onSave={(input) => run(() => createRecipe(input), "Ingrediente incluído na receita.")} products={productOptions} resources={resourceOptions} measures={measures} /> : null}
      {tab === "receita" ? <RecipeEditor disabled={saving} measures={measures} onSave={(input) => run(() => updateRecipeItem(input), "Ingrediente da receita atualizado.")} products={productOptions} recipeItems={recipeItems} /> : null}
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
  const [yieldServings, setYieldServings] = useState(20);
  const [weight, setWeight] = useState(1);
  const [measure, setMeasure] = useState(measures[0]?.name ?? "unidade");
  const [price, setPrice] = useState(0);
  const [available, setAvailable] = useState("Sim");
  const category = categories.find((item) => item.value === categoryId);
  const parsedTags = tags.split(",").map((item) => item.trim()).filter(Boolean);
  return (
    <FormPanel title="Adicionar produto" onSubmit={() => name && price > 0 && onSave({ name, description, category: category?.label ?? "Sem categoria", categoryId, price, available: available === "Sim", weight, measure, resourceId, imageUrl, tags: parsedTags, featuredSelfService, yieldServings })} disabled={disabled}>
      <label>Nome<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <SearchableSelect label="Recurso vinculado ao estoque" value={resourceId} options={resources} placeholder="Digite o recurso" onChange={setResourceId} />
      <SearchableSelect label="Categoria" value={categoryId} options={categories} placeholder="Digite a categoria" onChange={setCategoryId} />
      <label>Descrição<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Resumo curto para o cardápio" /></label>
      <label>URL da imagem<input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." /></label>
      <label>Etiquetas<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="sem gluten, congelado" /></label>
      <label>Peso<input type="number" min="0" step="0.001" value={weight} onChange={(event) => setWeight(Number(event.target.value))} /></label>
      <label>Medida<select value={measure} onChange={(event) => setMeasure(event.target.value)}>{measures.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
      <label>Preço<input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(Number(event.target.value))} /></label>
      <label>Rendimento da receita<input type="number" min="1" step="1" value={yieldServings} onChange={(event) => setYieldServings(Number(event.target.value))} /></label>
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
  const [preparationOrder, setPreparationOrder] = useState(1);
  return (
    <FormPanel title="Adicionar ingrediente da receita" onSubmit={() => productId && resourceId && quantity > 0 && onSave({ productId, resourceId, quantity, measure, preparationOrder })} disabled={disabled}>
      <SearchableSelect label="Produto final" value={productId} options={products} placeholder="Digite o produto" onChange={setProductId} />
      <SearchableSelect label="Ingrediente/Recurso" value={resourceId} options={resources} placeholder="Digite o recurso" onChange={setResourceId} />
      <label>Quantidade do ingrediente<input type="number" min="0" step="0.001" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
      <label>Medida<select value={measure} onChange={(event) => setMeasure(event.target.value)}>{measures.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
      <label>Ordem de preparo<input type="number" min="1" step="1" value={preparationOrder} onChange={(event) => setPreparationOrder(Number(event.target.value))} /></label>
    </FormPanel>
  );
}

function CustomerEditor({ customers, disabled, onSave, regions }: { customers: Customer[]; disabled: boolean; onSave: (input: Parameters<typeof updateCustomer>[0]) => void; regions: Array<{ value: number; label: string; description?: string }> }) {
  const customerOptions = customers.map((item) => ({ value: item.id, label: item.name, description: item.phone ?? item.region ?? "" }));
  const [selectedId, setSelectedId] = useState(customerOptions[0]?.value ?? 0);
  const [draft, setDraft] = useState({ name: "", email: "", phone: "", address: "", regionId: regions[0]?.value ?? 0, diet: "" });
  const selected = customers.find((item) => item.id === selectedId);

  function loadCustomer(id: number) {
    const item = customers.find((customer) => customer.id === id);
    setSelectedId(id);
    if (!item) return;
    setDraft({
      name: item.name,
      email: item.email ?? "",
      phone: item.phone ?? "",
      address: item.address ?? "",
      regionId: item.regionId ?? regions[0]?.value ?? 0,
      diet: item.dietaryPreferences ?? ""
    });
  }

  useEffect(() => {
    if (!selectedId && customerOptions[0]) loadCustomer(customerOptions[0].value);
  }, [customerOptions, selectedId]);

  function save() {
    const region = regions.find((item) => item.value === draft.regionId);
    if (!selected || !draft.name || !draft.phone) return;
    onSave({ id: selected.id, name: draft.name, email: draft.email, phone: draft.phone, address: draft.address, regionId: draft.regionId, region: region?.label ?? null, birthDate: "", dietaryPreferences: draft.diet });
  }

  return (
    <EditPanel title="Editar cliente" description="Altere dados de contato e entrega sem mexer no historico dos pedidos." disabled={disabled} onDiscard={() => selected && loadCustomer(selected.id)} onSave={save}>
      <SearchableSelect label="Cliente" value={selectedId} options={customerOptions} placeholder="Digite o cliente" onChange={loadCustomer} />
      <label>Nome<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label>Email<input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>
      <label>Telefone<input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label>
      <label>Endereco<input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} /></label>
      <SearchableSelect label="Regiao" value={draft.regionId} options={regions} placeholder="Digite a regiao" onChange={(value) => setDraft({ ...draft, regionId: value })} />
      <label>Preferencias alimentares<input value={draft.diet} onChange={(event) => setDraft({ ...draft, diet: event.target.value })} /></label>
    </EditPanel>
  );
}

function SupplierEditor({ disabled, onSave, suppliers }: { disabled: boolean; onSave: (input: Parameters<typeof updateSupplier>[0]) => void; suppliers: Supplier[] }) {
  const supplierOptions = suppliers.map((item) => ({ value: item.id, label: item.name, description: item.phone ?? item.email ?? "" }));
  const [selectedId, setSelectedId] = useState(supplierOptions[0]?.value ?? 0);
  const [draft, setDraft] = useState({ name: "", phone: "", email: "", note: "" });
  const selected = suppliers.find((item) => item.id === selectedId);

  function loadSupplier(id: number) {
    const item = suppliers.find((supplier) => supplier.id === id);
    setSelectedId(id);
    if (!item) return;
    setDraft({ name: item.name, phone: item.phone ?? "", email: item.email ?? "", note: item.note ?? "" });
  }

  useEffect(() => {
    if (!selectedId && supplierOptions[0]) loadSupplier(supplierOptions[0].value);
  }, [selectedId, supplierOptions]);

  function save() {
    if (!selected || !draft.name) return;
    onSave({ id: selected.id, name: draft.name, phone: draft.phone, email: draft.email, note: draft.note });
  }

  return (
    <EditPanel title="Editar fornecedor" description="Mantenha telefone, email e observacoes de compra atualizados." disabled={disabled} onDiscard={() => selected && loadSupplier(selected.id)} onSave={save}>
      <SearchableSelect label="Fornecedor" value={selectedId} options={supplierOptions} placeholder="Digite o fornecedor" onChange={loadSupplier} />
      <label>Nome<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label>Telefone<input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label>
      <label>Email<input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>
      <label>Observacao<input value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label>
    </EditPanel>
  );
}

function ResourceEditor({ categories, disabled, measures, onSave, resources }: { categories: Array<{ value: number; label: string; description?: string }>; disabled: boolean; measures: Measure[]; onSave: (input: Parameters<typeof updateResource>[0]) => void; resources: Resource[] }) {
  const resourceOptions = resources.map((item) => ({ value: item.id, label: item.name, description: `${item.stock} ${item.measure ?? ""}` }));
  const [selectedId, setSelectedId] = useState(resourceOptions[0]?.value ?? 0);
  const [draft, setDraft] = useState({ type: "Ingrediente", name: "", categoryId: categories[0]?.value ?? 0, stock: 0, unitCost: 0, measure: measures[0]?.name ?? "unidade", expiresAt: "" });
  const selected = resources.find((item) => item.id === selectedId);

  function loadResource(id: number) {
    const item = resources.find((resource) => resource.id === id);
    setSelectedId(id);
    if (!item) return;
    setDraft({
      type: item.type ?? "Ingrediente",
      name: item.name,
      categoryId: item.categoryId ?? categories[0]?.value ?? 0,
      stock: item.stock,
      unitCost: item.unitCost,
      measure: item.measure ?? measures[0]?.name ?? "unidade",
      expiresAt: item.expiresAt ?? ""
    });
  }

  useEffect(() => {
    if (!selectedId && resourceOptions[0]) loadResource(resourceOptions[0].value);
  }, [resourceOptions, selectedId]);

  function save() {
    const category = categories.find((item) => item.value === draft.categoryId);
    if (!selected || !draft.name) return;
    onSave({ id: selected.id, type: draft.type, name: draft.name, categoryId: draft.categoryId, category: category?.label, stock: draft.stock, unitCost: draft.unitCost, measure: draft.measure, expiresAt: draft.expiresAt });
  }

  return (
    <EditPanel title="Editar recurso" description="Use com cuidado: estoque e custo alimentam producao e compras." disabled={disabled} onDiscard={() => selected && loadResource(selected.id)} onSave={save}>
      <SearchableSelect label="Recurso" value={selectedId} options={resourceOptions} placeholder="Digite o recurso" onChange={loadResource} />
      <label>Tipo<input value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })} /></label>
      <label>Nome<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <SearchableSelect label="Categoria" value={draft.categoryId} options={categories} placeholder="Digite a categoria" onChange={(value) => setDraft({ ...draft, categoryId: value })} />
      <label>Estoque<input type="number" min="0" step="0.001" value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: Number(event.target.value) })} /></label>
      <label>Custo unitario<input type="number" min="0" step="0.01" value={draft.unitCost} onChange={(event) => setDraft({ ...draft, unitCost: Number(event.target.value) })} /></label>
      <label>Medida<select value={draft.measure} onChange={(event) => setDraft({ ...draft, measure: event.target.value })}>{measures.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
      <label>Validade<input type="date" value={draft.expiresAt} onChange={(event) => setDraft({ ...draft, expiresAt: event.target.value })} /></label>
    </EditPanel>
  );
}

function RecipeEditor({ disabled, measures, onSave, products, recipeItems }: { disabled: boolean; measures: Measure[]; onSave: (input: Parameters<typeof updateRecipeItem>[0]) => void; products: Array<{ value: number; label: string; description?: string }>; recipeItems: RecipeItem[] }) {
  const [productId, setProductId] = useState(products[0]?.value ?? 0);
  const items = recipeItems
    .filter((item) => item.productId === productId)
    .sort((a, b) => (a.preparationOrder ?? 9999) - (b.preparationOrder ?? 9999) || a.resourceName.localeCompare(b.resourceName, "pt-BR"));

  useEffect(() => {
    if (!productId && products[0]) setProductId(products[0].value);
  }, [productId, products]);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Editar receita cadastrada</h2>
          <span className="muted-count">Ajuste quantidade, medida e ordem de preparo de cada ingrediente.</span>
        </div>
      </div>
      <div className="form-grid management-form">
        <SearchableSelect label="Produto final" value={productId} options={products} placeholder="Digite o produto" onChange={setProductId} />
      </div>
      <div className="recipe-edit-list">
        {items.length ? items.map((item, index) => (
          <RecipeItemEditor disabled={disabled} fallbackOrder={index + 1} item={item} key={item.id} measures={measures} onSave={onSave} />
        )) : <span className="muted-count">Nenhum ingrediente cadastrado para este produto.</span>}
      </div>
    </section>
  );
}

function RecipeItemEditor({ disabled, fallbackOrder, item, measures, onSave }: { disabled: boolean; fallbackOrder: number; item: RecipeItem; measures: Measure[]; onSave: (input: Parameters<typeof updateRecipeItem>[0]) => void }) {
  const [quantity, setQuantity] = useState(item.quantity ?? 0);
  const [measure, setMeasure] = useState(item.measure ?? measures[0]?.name ?? "unidade");
  const [preparationOrder, setPreparationOrder] = useState(item.preparationOrder ?? fallbackOrder);

  useEffect(() => {
    setQuantity(item.quantity ?? 0);
    setMeasure(item.measure ?? measures[0]?.name ?? "unidade");
    setPreparationOrder(item.preparationOrder ?? fallbackOrder);
  }, [fallbackOrder, item, measures]);

  return (
    <div className="recipe-edit-row">
      <strong>{item.resourceName}</strong>
      <label>Qtd<input type="number" min="0" step="0.001" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
      <label>Medida<select value={measure} onChange={(event) => setMeasure(event.target.value)}>{measures.map((measureItem) => <option key={measureItem.name}>{measureItem.name}</option>)}</select></label>
      <label>Ordem<input type="number" min="1" step="1" value={preparationOrder} onChange={(event) => setPreparationOrder(Number(event.target.value))} /></label>
      <button className="secondary-action compact-action" disabled={disabled} onClick={() => onSave({ id: item.id, quantity, measure, preparationOrder })} type="button">
        <Save size={15} />
        Salvar item
      </button>
    </div>
  );
}

function EditPanel({ children, description, disabled, onDiscard, onSave, title }: { children: React.ReactNode; description: string; disabled: boolean; onDiscard: () => void; onSave: () => void; title: string }) {
  return (
    <section className="panel edit-panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <span className="muted-count">{description}</span>
        </div>
        <button className="secondary-action" disabled={disabled} onClick={onDiscard} type="button">
          <XCircle size={17} />
          Descartar alteracoes
        </button>
      </div>
      <div className="form-grid management-form">{children}</div>
      <button className="primary-action form-action" disabled={disabled} onClick={onSave} type="button">
        <Save size={18} />
        {disabled ? "Salvando..." : "Salvar alteracoes"}
      </button>
    </section>
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
