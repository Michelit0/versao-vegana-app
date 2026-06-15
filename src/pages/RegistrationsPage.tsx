import { Copy, Edit3, Plus, Save, Search, Trash2, XCircle } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "../components/SearchableSelect";
import { createCustomer, createProduct, createRecipe, createResource, createSupplier, deleteCustomer, deleteProduct, deleteRecipeItem, deleteResource, deleteSupplier, updateCustomer, updateProduct, updateRecipeItem, updateResource, updateSupplier } from "../lib/repository";
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
type CustomerMode = "novo" | "editar" | "duplicar";
type Mode = CustomerMode;
type Option = { value: number; label: string; description?: string };

type CustomerDraft = {
  id?: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  regionId: number;
  birthDate: string;
  diet: string;
};

type SupplierDraft = {
  id?: number;
  name: string;
  phone: string;
  email: string;
  note: string;
};

type ResourceDraft = {
  id?: number;
  type: string;
  name: string;
  categoryId: number;
  stock: number;
  unitCost: number;
  measure: string;
  expiresAt: string;
};

type ProductDraft = {
  id?: number;
  name: string;
  description: string;
  resourceId: number;
  categoryId: number;
  category: string;
  imageUrl: string;
  tags: string;
  featuredSelfService: boolean;
  yieldServings: number;
  weight: number;
  measure: string;
  price: number;
  available: boolean;
};

type RecipeDraft = {
  id?: string;
  productId: number;
  resourceId: number;
  quantity: number;
  measure: string;
  preparationOrder: number;
};

function parseTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCustomerValue(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function onlyDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

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
        <CustomerManager
          customers={customers}
          disabled={saving}
          onCreate={(input) => run(() => createCustomer(input), "Cliente cadastrado com sucesso.")}
          onDelete={(id) => run(() => deleteCustomer(id), "Cliente excluido com sucesso.")}
          onUpdate={(input) => run(() => updateCustomer(input), "Cliente atualizado com sucesso.")}
          regions={regionOptions}
        />
      ) : null}      {tab === "fornecedor" ? <SupplierManager disabled={saving} onCreate={(input) => run(() => createSupplier(input), "Fornecedor cadastrado com sucesso.")} onDelete={(id) => run(() => deleteSupplier(id), "Fornecedor excluido com sucesso.")} onUpdate={(input) => run(() => updateSupplier(input), "Fornecedor atualizado com sucesso.")} suppliers={suppliers} /> : null}
      {tab === "recurso" ? <ResourceManager categories={categoryOptions} disabled={saving} measures={measures} onCreate={(input) => run(() => createResource(input), "Recurso cadastrado com sucesso.")} onDelete={(id) => run(() => deleteResource(id), "Recurso excluido com sucesso.")} onUpdate={(input) => run(() => updateResource(input), "Recurso atualizado com sucesso.")} resources={resources} /> : null}
      {tab === "produto" ? <ProductManager categories={categoryOptions} disabled={saving} measures={measures} onCreate={(input) => run(() => createProduct(input), "Produto cadastrado com sucesso.")} onDelete={(id) => run(() => deleteProduct(id), "Produto excluido com sucesso.")} onUpdate={(input) => run(() => updateProduct(input), "Produto atualizado com sucesso.")} products={products} resources={resourceOptions} /> : null}
      {tab === "receita" ? <RecipeManager disabled={saving} measures={measures} onCreate={(input) => run(() => createRecipe(input), "Ingrediente incluido na receita.")} onDelete={(id) => run(() => deleteRecipeItem(id), "Ingrediente removido da receita.")} onUpdate={(input) => run(() => updateRecipeItem(input), "Ingrediente da receita atualizado.")} products={productOptions} recipeItems={recipeItems} resources={resourceOptions} /> : null}
    </section>
  );
}

function filterItems<T>(items: T[], query: string, getText: (item: T) => string) {
  const term = normalizeCustomerValue(query);
  const filtered = term ? items.filter((item) => normalizeCustomerValue(getText(item)).includes(term)) : items;
  return filtered.slice(0, 24);
}

function EntityCard({ active, detail, note, onDelete, onDuplicate, onEdit, subtitle, title }: { active?: boolean; detail?: string | null; note?: string | null; onDelete: () => void; onDuplicate: () => void; onEdit: () => void; subtitle?: string | null; title: string }) {
  return (
    <article className={active ? "entity-card customer-management-card active" : "entity-card customer-management-card"}>
      <strong>{title}</strong>
      {subtitle ? <span>{subtitle}</span> : null}
      {detail ? <small>{detail}</small> : null}
      {note ? <em>{note}</em> : null}
      <div className="customer-card-actions">
        <button className="secondary-action compact-action" type="button" onClick={onEdit}><Edit3 size={15} />Editar</button>
        <button className="secondary-action compact-action" type="button" onClick={onDuplicate}><Copy size={15} />Duplicar</button>
        <button className="secondary-action compact-action danger-action" type="button" onClick={onDelete}><Trash2 size={15} />Excluir</button>
      </div>
    </article>
  );
}

function ConfirmDelete({ description, disabled, onCancel, onConfirm, rows, title }: { description: string; disabled: boolean; onCancel: () => void; onConfirm: () => void; rows: string[]; title: string }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <section className="modal-card">
        <div className="panel-heading"><div><h2>{title}</h2><span className="muted-count">{description}</span></div></div>
        <div className="delete-customer-summary">{rows.map((row, index) => index === 0 ? <strong key={row}>{row}</strong> : <span key={row}>{row}</span>)}</div>
        <div className="modal-actions">
          <button className="secondary-action" type="button" onClick={onCancel}>Cancelar</button>
          <button className="primary-action danger-primary-action" type="button" disabled={disabled} onClick={onConfirm}><Trash2 size={17} />Confirmar exclusao</button>
        </div>
      </section>
    </div>
  );
}

function ManagerShell({ cards, children, deleteModal, disabled, filtered, formDescription, formTitle, message, newLabel, onDiscard, onNew, onSubmit, query, searchPlaceholder, setQuery, submitLabel, title, total }: { cards: React.ReactNode[]; children: React.ReactNode; deleteModal: React.ReactNode; disabled: boolean; filtered: number; formDescription: string; formTitle: string; message: string | null; newLabel: string; onDiscard?: () => void; onNew: () => void; onSubmit: () => void; query: string; searchPlaceholder: string; setQuery: (value: string) => void; submitLabel: string; title: string; total: number }) {
  return (
    <section className="content-stack">
      <section className="panel">
        <div className="panel-heading">
          <div><h2>{title}</h2><span className="muted-count">{filtered} de {total}</span></div>
          <button className="secondary-action" type="button" onClick={onNew}><Plus size={17} />{newLabel}</button>
        </div>
        <label className="search-field customer-search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} /></label>
        <div className="customer-management-grid">{cards.length ? cards : <span className="muted-count">Nenhum cadastro encontrado.</span>}</div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div><h2>{formTitle}</h2><span className="muted-count">{formDescription}</span></div>
          {onDiscard ? <button className="secondary-action" type="button" onClick={onDiscard}><XCircle size={17} />Descartar alteracoes</button> : null}
        </div>
        {message ? <div className="alert inline-alert">{message}</div> : null}
        <div className="form-grid management-form">{children}</div>
        <button className="primary-action form-action" disabled={disabled} onClick={onSubmit} type="button"><Save size={18} />{disabled ? "Salvando..." : submitLabel}</button>
      </section>
      {deleteModal}
    </section>
  );
}

function CustomerManager({ customers, disabled, onCreate, onDelete, onUpdate, regions }: { customers: Customer[]; disabled: boolean; onCreate: (input: Parameters<typeof createCustomer>[0]) => void; onDelete: (id: number) => void; onUpdate: (input: Parameters<typeof updateCustomer>[0]) => void; regions: Option[] }) {
  const blank = (): CustomerDraft => ({ name: "", email: "", phone: "", address: "", regionId: regions[0]?.value ?? 0, birthDate: "", diet: "" });
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("novo");
  const [draft, setDraft] = useState<CustomerDraft>(blank);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const filtered = useMemo(() => filterItems(customers, query, (item) => `${item.name} ${item.phone ?? ""} ${item.address ?? ""} ${item.region ?? ""} ${item.dietaryPreferences ?? ""}`), [customers, query]);
  function startNew() { setMode("novo"); setDraft(blank()); setLocalMessage(null); }
  function edit(item: Customer) { setMode("editar"); setDraft({ id: item.id, name: item.name, email: item.email ?? "", phone: item.phone ?? "", address: item.address ?? "", regionId: item.regionId ?? regions[0]?.value ?? 0, birthDate: "", diet: item.dietaryPreferences ?? "" }); setLocalMessage(null); }
  function duplicate(item: Customer) { setMode("duplicar"); setDraft({ name: item.name, email: item.email ?? "", phone: item.phone ?? "", address: item.address ?? "", regionId: item.regionId ?? regions[0]?.value ?? 0, birthDate: "", diet: item.dietaryPreferences ?? "" }); setLocalMessage("Cadastro duplicado em edicao. Ajuste nome, telefone ou endereco antes de salvar."); }
  function duplicateFound() { const phone = onlyDigits(draft.phone); const name = normalizeCustomerValue(draft.name); const address = normalizeCustomerValue(draft.address); return customers.find((item) => (mode !== "editar" || item.id !== draft.id) && ((phone && onlyDigits(item.phone) === phone) || (name && address && normalizeCustomerValue(item.name) === name && normalizeCustomerValue(item.address) === address))); }
  function submit() { setLocalMessage(null); if (!draft.name.trim() || !draft.phone.trim() || !draft.address.trim()) return setLocalMessage("Preencha nome, telefone e endereco antes de salvar."); const repeated = duplicateFound(); if (repeated) return setLocalMessage(`Possivel duplicidade: ${repeated.name} (${repeated.phone ?? "sem telefone"}). Ajuste antes de salvar.`); const region = regions.find((item) => item.value === draft.regionId); const input = { name: draft.name, email: draft.email, phone: draft.phone, address: draft.address, regionId: draft.regionId || undefined, region: region?.label ?? null, birthDate: draft.birthDate, dietaryPreferences: draft.diet }; if (mode === "editar" && draft.id) return onUpdate({ ...input, id: draft.id }); onCreate(input); startNew(); }
  return <ManagerShell title="Clientes" total={customers.length} filtered={filtered.length} query={query} setQuery={setQuery} searchPlaceholder="Buscar por nome, telefone, endereco, regiao ou preferencia" newLabel="Novo cliente" onNew={startNew} cards={filtered.map((item) => <EntityCard key={item.id} active={draft.id === item.id && mode === "editar"} title={item.name} subtitle={item.phone || "Sem telefone"} detail={item.address || "Sem endereco"} note={item.dietaryPreferences ?? undefined} onEdit={() => edit(item)} onDuplicate={() => duplicate(item)} onDelete={() => setDeleteTarget(item)} />)} formTitle={mode === "editar" ? "Editar cliente" : mode === "duplicar" ? "Duplicar cliente" : "Novo cliente"} formDescription={mode === "duplicar" ? "Revise e altere os dados antes de salvar o novo cadastro." : "Cadastre e mantenha os dados do cliente em um unico lugar."} onDiscard={mode !== "novo" ? startNew : undefined} message={localMessage} disabled={disabled} submitLabel={mode === "editar" ? "Salvar alteracoes" : "Salvar cliente"} onSubmit={submit} deleteModal={deleteTarget ? <ConfirmDelete title="Excluir cliente?" description="Confira os dados antes de excluir." rows={[deleteTarget.name, `Telefone: ${deleteTarget.phone || "Sem telefone"}`, `Endereco: ${deleteTarget.address || "Sem endereco"}`, `Regiao: ${deleteTarget.region || "Sem regiao"}`]} disabled={disabled} onCancel={() => setDeleteTarget(null)} onConfirm={() => { onDelete(deleteTarget.id); setDeleteTarget(null); if (draft.id === deleteTarget.id) startNew(); }} /> : null}><><label>Nome<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label><label>Email<input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></label><label>Telefone<input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></label><label>Endereco<input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></label><SearchableSelect label="Regiao" value={draft.regionId} options={regions} placeholder="Digite a regiao" onChange={(value) => setDraft({ ...draft, regionId: value })} /><label>Data de nascimento<input type="date" value={draft.birthDate} onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })} /></label><label>Preferencias alimentares<input value={draft.diet} onChange={(e) => setDraft({ ...draft, diet: e.target.value })} /></label></></ManagerShell>;
}

function SupplierManager({ disabled, onCreate, onDelete, onUpdate, suppliers }: { disabled: boolean; onCreate: (input: Parameters<typeof createSupplier>[0]) => void; onDelete: (id: number) => void; onUpdate: (input: Parameters<typeof updateSupplier>[0]) => void; suppliers: Supplier[] }) {
  const blank = (): SupplierDraft => ({ name: "", phone: "", email: "", note: "" });
  const [query, setQuery] = useState(""); const [mode, setMode] = useState<Mode>("novo"); const [draft, setDraft] = useState<SupplierDraft>(blank); const [msg, setMsg] = useState<string | null>(null); const [del, setDel] = useState<Supplier | null>(null);
  const filtered = useMemo(() => filterItems(suppliers, query, (i) => `${i.name} ${i.phone ?? ""} ${i.email ?? ""} ${i.note ?? ""}`), [suppliers, query]);
  function startNew() { setMode("novo"); setDraft(blank()); setMsg(null); }
  function edit(i: Supplier) { setMode("editar"); setDraft({ id: i.id, name: i.name, phone: i.phone ?? "", email: i.email ?? "", note: i.note ?? "" }); setMsg(null); }
  function duplicate(i: Supplier) { setMode("duplicar"); setDraft({ name: i.name, phone: i.phone ?? "", email: i.email ?? "", note: i.note ?? "" }); setMsg("Fornecedor duplicado em edicao. Ajuste os dados antes de salvar."); }
  function submit() { setMsg(null); if (!draft.name.trim()) return setMsg("Preencha o nome antes de salvar."); const rep = suppliers.find((i) => (mode !== "editar" || i.id !== draft.id) && (normalizeCustomerValue(i.name) === normalizeCustomerValue(draft.name) || (draft.phone && onlyDigits(i.phone) === onlyDigits(draft.phone)))); if (rep) return setMsg(`Possivel duplicidade: ${rep.name}. Ajuste antes de salvar.`); if (mode === "editar" && draft.id) return onUpdate({ id: draft.id, name: draft.name, phone: draft.phone, email: draft.email, note: draft.note }); onCreate({ name: draft.name, phone: draft.phone, email: draft.email, note: draft.note }); startNew(); }
  return <ManagerShell title="Fornecedores" total={suppliers.length} filtered={filtered.length} query={query} setQuery={setQuery} searchPlaceholder="Buscar por nome, telefone, email ou observacao" newLabel="Novo fornecedor" onNew={startNew} cards={filtered.map((i) => <EntityCard key={i.id} active={draft.id === i.id && mode === "editar"} title={i.name} subtitle={i.phone || "Sem telefone"} detail={i.email || "Sem email"} note={i.note} onEdit={() => edit(i)} onDuplicate={() => duplicate(i)} onDelete={() => setDel(i)} />)} formTitle={mode === "editar" ? "Editar fornecedor" : mode === "duplicar" ? "Duplicar fornecedor" : "Novo fornecedor"} formDescription="Mantenha contatos de compra em um unico lugar." onDiscard={mode !== "novo" ? startNew : undefined} message={msg} disabled={disabled} submitLabel={mode === "editar" ? "Salvar alteracoes" : "Salvar fornecedor"} onSubmit={submit} deleteModal={del ? <ConfirmDelete title="Excluir fornecedor?" description="Confira os dados antes de excluir." rows={[del.name, `Telefone: ${del.phone || "Sem telefone"}`, `Email: ${del.email || "Sem email"}`]} disabled={disabled} onCancel={() => setDel(null)} onConfirm={() => { onDelete(del.id); setDel(null); if (draft.id === del.id) startNew(); }} /> : null}><><label>Nome<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label><label>Telefone<input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></label><label>Email<input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></label><label>Observacao<input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></label></></ManagerShell>;
}

function ResourceManager({ categories, disabled, measures, onCreate, onDelete, onUpdate, resources }: { categories: Option[]; disabled: boolean; measures: Measure[]; onCreate: (input: Parameters<typeof createResource>[0]) => void; onDelete: (id: number) => void; onUpdate: (input: Parameters<typeof updateResource>[0]) => void; resources: Resource[] }) {
  const blank = (): ResourceDraft => ({ type: "Ingrediente", name: "", categoryId: categories[0]?.value ?? 0, stock: 0, unitCost: 0, measure: measures[0]?.name ?? "unidade", expiresAt: "" });
  const [query, setQuery] = useState(""); const [mode, setMode] = useState<Mode>("novo"); const [draft, setDraft] = useState<ResourceDraft>(blank); const [msg, setMsg] = useState<string | null>(null); const [del, setDel] = useState<Resource | null>(null);
  const filtered = useMemo(() => filterItems(resources, query, (i) => `${i.name} ${i.type ?? ""} ${i.category ?? ""} ${i.measure ?? ""}`), [resources, query]);
  function startNew() { setMode("novo"); setDraft(blank()); setMsg(null); }
  function edit(i: Resource) { setMode("editar"); setDraft({ id: i.id, type: i.type ?? "Ingrediente", name: i.name, categoryId: i.categoryId ?? categories[0]?.value ?? 0, stock: i.stock, unitCost: i.unitCost, measure: i.measure ?? measures[0]?.name ?? "unidade", expiresAt: i.expiresAt ?? "" }); setMsg(null); }
  function duplicate(i: Resource) { setMode("duplicar"); setDraft({ type: i.type ?? "Ingrediente", name: i.name, categoryId: i.categoryId ?? categories[0]?.value ?? 0, stock: i.stock, unitCost: i.unitCost, measure: i.measure ?? measures[0]?.name ?? "unidade", expiresAt: i.expiresAt ?? "" }); setMsg("Recurso duplicado em edicao. Ajuste nome ou medida antes de salvar."); }
  function submit() { setMsg(null); if (!draft.name.trim()) return setMsg("Preencha o nome antes de salvar."); const rep = resources.find((i) => (mode !== "editar" || i.id !== draft.id) && normalizeCustomerValue(i.name) === normalizeCustomerValue(draft.name) && normalizeCustomerValue(i.measure) === normalizeCustomerValue(draft.measure)); if (rep) return setMsg(`Possivel duplicidade: ${rep.name}. Ajuste antes de salvar.`); const category = categories.find((i) => i.value === draft.categoryId); const input = { type: draft.type, name: draft.name, categoryId: draft.categoryId, category: category?.label, stock: draft.stock, unitCost: draft.unitCost, measure: draft.measure, expiresAt: draft.expiresAt }; if (mode === "editar" && draft.id) return onUpdate({ ...input, id: draft.id }); onCreate(input); startNew(); }
  return <ManagerShell title="Recursos" total={resources.length} filtered={filtered.length} query={query} setQuery={setQuery} searchPlaceholder="Buscar por recurso, tipo, categoria ou medida" newLabel="Novo recurso" onNew={startNew} cards={filtered.map((i) => <EntityCard key={i.id} active={draft.id === i.id && mode === "editar"} title={i.name} subtitle={`${i.stock} ${i.measure ?? ""}`} detail={i.category ?? "Sem categoria"} note={i.type} onEdit={() => edit(i)} onDuplicate={() => duplicate(i)} onDelete={() => setDel(i)} />)} formTitle={mode === "editar" ? "Editar recurso" : mode === "duplicar" ? "Duplicar recurso" : "Novo recurso"} formDescription="Use com cuidado: estoque e custo alimentam producao e compras." onDiscard={mode !== "novo" ? startNew : undefined} message={msg} disabled={disabled} submitLabel={mode === "editar" ? "Salvar alteracoes" : "Salvar recurso"} onSubmit={submit} deleteModal={del ? <ConfirmDelete title="Excluir recurso?" description="Confira os dados antes de excluir." rows={[del.name, `Estoque: ${del.stock} ${del.measure ?? ""}`, `Categoria: ${del.category ?? "Sem categoria"}`]} disabled={disabled} onCancel={() => setDel(null)} onConfirm={() => { onDelete(del.id); setDel(null); if (draft.id === del.id) startNew(); }} /> : null}><><label>Tipo<input value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} /></label><label>Nome<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label><SearchableSelect label="Categoria" value={draft.categoryId} options={categories} placeholder="Digite a categoria" onChange={(value) => setDraft({ ...draft, categoryId: value })} /><label>Estoque<input type="number" min="0" step="0.001" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })} /></label><label>Custo unitario<input type="number" min="0" step="0.01" value={draft.unitCost} onChange={(e) => setDraft({ ...draft, unitCost: Number(e.target.value) })} /></label><label>Medida<select value={draft.measure} onChange={(e) => setDraft({ ...draft, measure: e.target.value })}>{measures.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label>Validade<input type="date" value={draft.expiresAt} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} /></label></></ManagerShell>;
}

function ProductManager({ categories, disabled, measures, onCreate, onDelete, onUpdate, products, resources }: { categories: Option[]; disabled: boolean; measures: Measure[]; onCreate: (input: Parameters<typeof createProduct>[0]) => void; onDelete: (id: number) => void; onUpdate: (input: Parameters<typeof updateProduct>[0]) => void; products: Product[]; resources: Option[] }) {
  const blank = (): ProductDraft => ({ name: "", description: "", resourceId: resources[0]?.value ?? 0, categoryId: categories[0]?.value ?? 0, category: categories[0]?.label ?? "Sem categoria", imageUrl: "", tags: "", featuredSelfService: false, yieldServings: 20, weight: 1, measure: measures[0]?.name ?? "unidade", price: 0, available: true });
  const [query, setQuery] = useState(""); const [mode, setMode] = useState<Mode>("novo"); const [draft, setDraft] = useState<ProductDraft>(blank); const [msg, setMsg] = useState<string | null>(null); const [del, setDel] = useState<Product | null>(null);
  const filtered = useMemo(() => filterItems(products, query, (i) => `${i.name} ${i.category} ${i.available ? "disponivel" : "indisponivel"}`), [products, query]);
  function startNew() { setMode("novo"); setDraft(blank()); setMsg(null); }
  function toDraft(i: Product, keepId: boolean): ProductDraft { return { id: keepId ? i.id : undefined, name: i.name, description: i.description ?? "", resourceId: i.resourceId ?? resources[0]?.value ?? 0, categoryId: categories.find((c) => c.label === i.category)?.value ?? categories[0]?.value ?? 0, category: i.category, imageUrl: i.imageUrl ?? "", tags: (i.tags ?? []).join(", "), featuredSelfService: i.featuredSelfService ?? false, yieldServings: i.yieldServings ?? 20, weight: i.weight ?? 1, measure: i.measure ?? measures[0]?.name ?? "unidade", price: i.price, available: i.available }; }
  function edit(i: Product) { setMode("editar"); setDraft(toDraft(i, true)); setMsg(null); }
  function duplicate(i: Product) { setMode("duplicar"); setDraft(toDraft(i, false)); setMsg("Produto duplicado em edicao. Ajuste nome ou categoria antes de salvar."); }
  function submit() { setMsg(null); if (!draft.name.trim() || draft.price < 0) return setMsg("Preencha nome e preco valido antes de salvar."); const category = categories.find((i) => i.value === draft.categoryId); const rep = products.find((i) => (mode !== "editar" || i.id !== draft.id) && normalizeCustomerValue(i.name) === normalizeCustomerValue(draft.name) && normalizeCustomerValue(i.category) === normalizeCustomerValue(category?.label ?? draft.category)); if (rep) return setMsg(`Possivel duplicidade: ${rep.name}. Ajuste antes de salvar.`); const input = { name: draft.name, description: draft.description, category: category?.label ?? draft.category, categoryId: draft.categoryId, price: draft.price, available: draft.available, weight: draft.weight, measure: draft.measure, resourceId: draft.resourceId || undefined, imageUrl: draft.imageUrl, tags: parseTags(draft.tags), featuredSelfService: draft.featuredSelfService, yieldServings: draft.yieldServings }; if (mode === "editar" && draft.id) return onUpdate({ ...input, id: draft.id }); onCreate(input); startNew(); }
  return <ManagerShell title="Produtos" total={products.length} filtered={filtered.length} query={query} setQuery={setQuery} searchPlaceholder="Buscar por produto, categoria ou disponibilidade" newLabel="Novo produto" onNew={startNew} cards={filtered.map((i) => <EntityCard key={i.id} active={draft.id === i.id && mode === "editar"} title={i.name} subtitle={i.category} detail={i.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} note={i.available ? "Disponivel" : "Indisponivel"} onEdit={() => edit(i)} onDuplicate={() => duplicate(i)} onDelete={() => setDel(i)} />)} formTitle={mode === "editar" ? "Editar produto" : mode === "duplicar" ? "Duplicar produto" : "Novo produto"} formDescription="Produtos ficam aqui para consulta, cardapio, autoatendimento e receitas." onDiscard={mode !== "novo" ? startNew : undefined} message={msg} disabled={disabled} submitLabel={mode === "editar" ? "Salvar alteracoes" : "Salvar produto"} onSubmit={submit} deleteModal={del ? <ConfirmDelete title="Excluir produto?" description="Confira os dados antes de excluir." rows={[del.name, `Categoria: ${del.category}`, `Preco: ${del.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`]} disabled={disabled} onCancel={() => setDel(null)} onConfirm={() => { onDelete(del.id); setDel(null); if (draft.id === del.id) startNew(); }} /> : null}><><label>Nome<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label><SearchableSelect label="Recurso vinculado" value={draft.resourceId} options={resources} placeholder="Digite o recurso" onChange={(value) => setDraft({ ...draft, resourceId: value })} /><SearchableSelect label="Categoria" value={draft.categoryId} options={categories} placeholder="Digite a categoria" onChange={(value) => setDraft({ ...draft, categoryId: value })} /><label>Descricao<input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label><label>URL da imagem<input value={draft.imageUrl} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} /></label><label>Etiquetas<input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} /></label><label>Peso<input type="number" min="0" step="0.001" value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value) })} /></label><label>Medida<select value={draft.measure} onChange={(e) => setDraft({ ...draft, measure: e.target.value })}>{measures.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label>Preco<input type="number" min="0" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /></label><label>Rendimento<input type="number" min="1" step="1" value={draft.yieldServings} onChange={(e) => setDraft({ ...draft, yieldServings: Number(e.target.value) })} /></label><label>Disponibilidade<select value={draft.available ? "Sim" : "Nao"} onChange={(e) => setDraft({ ...draft, available: e.target.value === "Sim" })}><option>Sim</option><option>Nao</option></select></label><label className="checkbox-field"><input type="checkbox" checked={draft.featuredSelfService} onChange={(e) => setDraft({ ...draft, featuredSelfService: e.target.checked })} /> Destaque no autoatendimento</label></></ManagerShell>;
}

function RecipeManager({ disabled, measures, onCreate, onDelete, onUpdate, products, recipeItems, resources }: { disabled: boolean; measures: Measure[]; onCreate: (input: Parameters<typeof createRecipe>[0]) => void; onDelete: (id: string) => void; onUpdate: (input: Parameters<typeof updateRecipeItem>[0]) => void; products: Option[]; recipeItems: RecipeItem[]; resources: Option[] }) {
  const blank = (): RecipeDraft => ({ productId: products[0]?.value ?? 0, resourceId: resources[0]?.value ?? 0, quantity: 0, measure: measures[0]?.name ?? "unidade", preparationOrder: 1 });
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("novo");
  const [draft, setDraft] = useState<RecipeDraft>(blank);
  const [msg, setMsg] = useState<string | null>(null);
  const [del, setDel] = useState<RecipeItem | null>(null);
  const filtered = useMemo(() => filterItems(recipeItems, query, (i) => `${i.productName} ${i.resourceName} ${i.measure ?? ""}`), [recipeItems, query]);

  function startNew() {
    setMode("novo");
    setDraft(blank());
    setMsg(null);
  }

  function edit(item: RecipeItem) {
    setMode("editar");
    setDraft({
      id: item.id,
      productId: item.productId ?? products[0]?.value ?? 0,
      resourceId: item.resourceId ?? resources[0]?.value ?? 0,
      quantity: item.quantity ?? 0,
      measure: item.measure ?? measures[0]?.name ?? "unidade",
      preparationOrder: item.preparationOrder ?? 1
    });
    setMsg(null);
  }

  function duplicate(item: RecipeItem) {
    setMode("duplicar");
    setDraft({
      productId: item.productId ?? products[0]?.value ?? 0,
      resourceId: item.resourceId ?? resources[0]?.value ?? 0,
      quantity: item.quantity ?? 0,
      measure: item.measure ?? measures[0]?.name ?? "unidade",
      preparationOrder: item.preparationOrder ?? 1
    });
    setMsg("Ingrediente duplicado em edicao. Ajuste produto, ingrediente ou medida antes de salvar.");
  }

  function submit() {
    setMsg(null);
    if (!draft.productId || !draft.resourceId || draft.quantity <= 0) {
      return setMsg("Selecione produto, ingrediente e uma quantidade maior que zero.");
    }
    const repeated = recipeItems.find((item) => (mode !== "editar" || item.id !== draft.id) && item.productId === draft.productId && item.resourceId === draft.resourceId && normalizeCustomerValue(item.measure) === normalizeCustomerValue(draft.measure));
    if (repeated) {
      return setMsg(`Esse ingrediente ja existe nesta receita: ${repeated.resourceName}. Edite o item existente.`);
    }
    if (mode === "editar" && draft.id) {
      return onUpdate({ id: draft.id, quantity: draft.quantity, measure: draft.measure, preparationOrder: draft.preparationOrder });
    }
    onCreate({ productId: draft.productId, resourceId: draft.resourceId, quantity: draft.quantity, measure: draft.measure, preparationOrder: draft.preparationOrder });
    startNew();
  }

  return <ManagerShell title="Receitas" total={recipeItems.length} filtered={filtered.length} query={query} setQuery={setQuery} searchPlaceholder="Buscar por produto, ingrediente ou medida" newLabel="Novo ingrediente" onNew={startNew} cards={filtered.map((item) => <EntityCard key={item.id} active={draft.id === item.id && mode === "editar"} title={item.productName} subtitle={item.resourceName} detail={`${item.quantity ?? 0} ${item.measure ?? ""}`} note={item.preparationOrder ? `Ordem ${item.preparationOrder}` : undefined} onEdit={() => edit(item)} onDuplicate={() => duplicate(item)} onDelete={() => setDel(item)} />)} formTitle={mode === "editar" ? "Editar ingrediente da receita" : mode === "duplicar" ? "Duplicar ingrediente da receita" : "Novo ingrediente da receita"} formDescription="Monte ou ajuste receitas usadas na cozinha, eventos e lista de compras." onDiscard={mode !== "novo" ? startNew : undefined} message={msg} disabled={disabled} submitLabel={mode === "editar" ? "Salvar alteracoes" : "Salvar ingrediente"} onSubmit={submit} deleteModal={del ? <ConfirmDelete title="Excluir ingrediente da receita?" description="Confira os dados antes de excluir." rows={[del.productName, `Ingrediente: ${del.resourceName}`, `Quantidade: ${del.quantity ?? 0} ${del.measure ?? ""}`]} disabled={disabled} onCancel={() => setDel(null)} onConfirm={() => { onDelete(del.id); setDel(null); if (draft.id === del.id) startNew(); }} /> : null}><><SearchableSelect label="Produto final" value={draft.productId} options={products} placeholder="Digite o produto" onChange={(value) => setDraft({ ...draft, productId: value })} /><SearchableSelect label="Ingrediente/Recurso" value={draft.resourceId} options={resources} placeholder="Digite o ingrediente" onChange={(value) => setDraft({ ...draft, resourceId: value })} /><label>Quantidade<input type="number" min="0" step="0.001" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} /></label><label>Medida<select value={draft.measure} onChange={(e) => setDraft({ ...draft, measure: e.target.value })}>{measures.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label>Ordem de preparo<input type="number" min="1" step="1" value={draft.preparationOrder} onChange={(e) => setDraft({ ...draft, preparationOrder: Number(e.target.value) })} /></label></></ManagerShell>;
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
