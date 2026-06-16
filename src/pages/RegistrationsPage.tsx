import { Copy, Edit3, Plus, Save, Search, Trash2, XCircle } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { SearchableSelect } from "../components/SearchableSelect";
import {
  createCustomer,
  createProduct,
  createRecipe,
  createResource,
  createSupplier,
  deleteCustomer,
  deleteProduct,
  deleteRecipeItem,
  deleteResource,
  deleteSupplier,
  updateCustomer,
  updateProduct,
  updateRecipeItem,
  updateResource,
  updateSupplier
} from "../lib/repository";
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
type Mode = "novo" | "editar" | "duplicar";
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

type RecipeLineDraft = {
  tempId: string;
  id?: string;
  productId: number;
  resourceId: number;
  quantity: number;
  measure: string;
  preparationOrder: number;
};

type RecipeDraft = {
  productId: number;
  lines: RecipeLineDraft[];
};

type RecipeGroup = {
  productId: number;
  productName: string;
  items: RecipeItem[];
};

function parseTags(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function normalizeValue(value: string | null | undefined) {
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

function tempId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function measureName(measures: Measure[], fallback = "unidade") {
  return measures[0]?.name ?? fallback;
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
      await onChanged();
      setMessage(success);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nao foi possivel salvar.");
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

      {tab === "cliente" ? <CustomerManager customers={customers} disabled={saving} regions={regionOptions} onCreate={(input) => run(() => createCustomer(input), "Cliente cadastrado com sucesso.")} onDelete={(id) => run(() => deleteCustomer(id), "Cliente excluido com sucesso.")} onUpdate={(input) => run(() => updateCustomer(input), "Cliente atualizado com sucesso.")} /> : null}
      {tab === "fornecedor" ? <SupplierManager disabled={saving} suppliers={suppliers} onCreate={(input) => run(() => createSupplier(input), "Fornecedor cadastrado com sucesso.")} onDelete={(id) => run(() => deleteSupplier(id), "Fornecedor excluido com sucesso.")} onUpdate={(input) => run(() => updateSupplier(input), "Fornecedor atualizado com sucesso.")} /> : null}
      {tab === "recurso" ? <ResourceManager categories={categoryOptions} disabled={saving} measures={measures} resources={resources} onCreate={(input) => run(() => createResource(input), "Recurso cadastrado com sucesso.")} onDelete={(id) => run(() => deleteResource(id), "Recurso excluido com sucesso.")} onUpdate={(input) => run(() => updateResource(input), "Recurso atualizado com sucesso.")} /> : null}
      {tab === "produto" ? <ProductManager categories={categoryOptions} disabled={saving} measures={measures} products={products} resources={resourceOptions} onCreate={(input) => run(() => createProduct(input), "Produto cadastrado com sucesso.")} onDelete={(id) => run(() => deleteProduct(id), "Produto excluido com sucesso.")} onUpdate={(input) => run(() => updateProduct(input), "Produto atualizado com sucesso.")} /> : null}
      {tab === "receita" ? <RecipeManager disabled={saving} measures={measures} products={productOptions} recipeItems={recipeItems} resources={resourceOptions} onCreate={(input) => run(() => createRecipe(input), "Receita atualizada com sucesso.")} onDelete={(id) => run(() => deleteRecipeItem(id), "Ingrediente removido da receita.")} onUpdate={(input) => run(() => updateRecipeItem(input), "Receita atualizada com sucesso.")} /> : null}
    </section>
  );
}

function filterItems<T>(items: T[], query: string, getText: (item: T) => string, limit = 24) {
  const term = normalizeValue(query);
  const filtered = term ? items.filter((item) => normalizeValue(getText(item)).includes(term)) : items;
  return filtered.slice(0, limit);
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
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            <span className="muted-count">{description}</span>
          </div>
        </div>
        <div className="delete-customer-summary">
          {rows.map((row, index) => index === 0 ? <strong key={row}>{row}</strong> : <span key={row}>{row}</span>)}
        </div>
        <div className="modal-actions">
          <button className="secondary-action" type="button" onClick={onCancel}>Cancelar</button>
          <button className="primary-action danger-primary-action" type="button" disabled={disabled} onClick={onConfirm}><Trash2 size={17} />Confirmar exclusao</button>
        </div>
      </section>
    </div>
  );
}

function ManagerShell({ cards, children, deleteModal, disabled, filtered, formDescription, formOpen, formTitle, message, newLabel, onCloseForm, onNew, onSubmit, query, searchPlaceholder, setQuery, submitLabel, title, total }: { cards: React.ReactNode[]; children: React.ReactNode; deleteModal: React.ReactNode; disabled: boolean; filtered: number; formDescription: string; formOpen: boolean; formTitle: string; message: string | null; newLabel: string; onCloseForm: () => void; onNew: () => void; onSubmit: () => void; query: string; searchPlaceholder: string; setQuery: (value: string) => void; submitLabel: string; title: string; total: number }) {
  return (
    <section className="content-stack">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            <span className="muted-count">{filtered} de {total}</span>
          </div>
          <button className="secondary-action" type="button" onClick={onNew}><Plus size={17} />{newLabel}</button>
        </div>
        <label className="search-field customer-search-field">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} />
        </label>
        <div className="customer-management-grid">{cards.length ? cards : <span className="muted-count">Nenhum cadastro encontrado.</span>}</div>
      </section>

      {formOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={formTitle}>
          <section className="modal-card management-modal-card">
            <div className="panel-heading">
              <div>
                <h2>{formTitle}</h2>
                <span className="muted-count">{formDescription}</span>
              </div>
              <button className="secondary-action" type="button" onClick={onCloseForm}><XCircle size={17} />Descartar alteracoes</button>
            </div>
            {message ? <div className="alert inline-alert">{message}</div> : null}
            <div className="form-grid management-form">{children}</div>
            <button className="primary-action form-action" disabled={disabled} onClick={onSubmit} type="button"><Save size={18} />{disabled ? "Salvando..." : submitLabel}</button>
          </section>
        </div>
      ) : null}

      {deleteModal}
    </section>
  );
}

function CustomerManager({ customers, disabled, onCreate, onDelete, onUpdate, regions }: { customers: Customer[]; disabled: boolean; onCreate: (input: Parameters<typeof createCustomer>[0]) => void; onDelete: (id: number) => void; onUpdate: (input: Parameters<typeof updateCustomer>[0]) => void; regions: Option[] }) {
  const blank = (): CustomerDraft => ({ name: "", email: "", phone: "", address: "", regionId: regions[0]?.value ?? 0, birthDate: "", diet: "" });
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("novo");
  const [draft, setDraft] = useState<CustomerDraft>(blank);
  const [formOpen, setFormOpen] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const filtered = useMemo(() => filterItems(customers, query, (item) => `${item.name} ${item.phone ?? ""} ${item.address ?? ""} ${item.region ?? ""} ${item.dietaryPreferences ?? ""}`), [customers, query]);

  function closeForm() { setFormOpen(false); setLocalMessage(null); }
  function startNew() { setMode("novo"); setDraft(blank()); setLocalMessage(null); setFormOpen(true); }
  function edit(item: Customer) { setMode("editar"); setDraft({ id: item.id, name: item.name, email: item.email ?? "", phone: item.phone ?? "", address: item.address ?? "", regionId: item.regionId ?? regions[0]?.value ?? 0, birthDate: "", diet: item.dietaryPreferences ?? "" }); setLocalMessage(null); setFormOpen(true); }
  function duplicate(item: Customer) { setMode("duplicar"); setDraft({ name: item.name, email: item.email ?? "", phone: item.phone ?? "", address: item.address ?? "", regionId: item.regionId ?? regions[0]?.value ?? 0, birthDate: "", diet: item.dietaryPreferences ?? "" }); setLocalMessage("Cadastro duplicado em edicao. Ajuste nome, telefone ou endereco antes de salvar."); setFormOpen(true); }
  function duplicateFound() { const phone = onlyDigits(draft.phone); const name = normalizeValue(draft.name); const address = normalizeValue(draft.address); return customers.find((item) => (mode !== "editar" || item.id !== draft.id) && ((phone && onlyDigits(item.phone) === phone) || (name && address && normalizeValue(item.name) === name && normalizeValue(item.address) === address))); }
  function submit() {
    setLocalMessage(null);
    if (!draft.name.trim() || !draft.phone.trim() || !draft.address.trim()) return setLocalMessage("Preencha nome, telefone e endereco antes de salvar.");
    const repeated = duplicateFound();
    if (repeated) return setLocalMessage(`Possivel duplicidade: ${repeated.name} (${repeated.phone ?? "sem telefone"}). Ajuste antes de salvar.`);
    const region = regions.find((item) => item.value === draft.regionId);
    const input = { name: draft.name, email: draft.email, phone: draft.phone, address: draft.address, regionId: draft.regionId || undefined, region: region?.label ?? null, birthDate: draft.birthDate, dietaryPreferences: draft.diet };
    if (mode === "editar" && draft.id) onUpdate({ ...input, id: draft.id }); else onCreate(input);
    closeForm();
  }

  return (
    <ManagerShell title="Clientes" total={customers.length} filtered={filtered.length} query={query} setQuery={setQuery} searchPlaceholder="Buscar por nome, telefone, endereco, regiao ou preferencia" newLabel="Novo cliente" onNew={startNew} formOpen={formOpen} onCloseForm={closeForm} cards={filtered.map((item) => <EntityCard key={item.id} active={draft.id === item.id && mode === "editar"} title={item.name} subtitle={item.phone || "Sem telefone"} detail={item.address || "Sem endereco"} note={item.dietaryPreferences ?? undefined} onEdit={() => edit(item)} onDuplicate={() => duplicate(item)} onDelete={() => setDeleteTarget(item)} />)} formTitle={mode === "editar" ? "Editar cliente" : mode === "duplicar" ? "Duplicar cliente" : "Novo cliente"} formDescription={mode === "duplicar" ? "Revise e altere os dados antes de salvar o novo cadastro." : "Cadastre e mantenha os dados do cliente em um unico lugar."} message={localMessage} disabled={disabled} submitLabel={mode === "editar" ? "Salvar alteracoes" : "Salvar cliente"} onSubmit={submit} deleteModal={deleteTarget ? <ConfirmDelete title="Excluir cliente?" description="Confira os dados antes de excluir." rows={[deleteTarget.name, `Telefone: ${deleteTarget.phone || "Sem telefone"}`, `Endereco: ${deleteTarget.address || "Sem endereco"}`, `Regiao: ${deleteTarget.region || "Sem regiao"}`]} disabled={disabled} onCancel={() => setDeleteTarget(null)} onConfirm={() => { onDelete(deleteTarget.id); setDeleteTarget(null); closeForm(); }} /> : null}>
      <>
        <label>Nome<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
        <label>Email<input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></label>
        <label>Telefone<input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></label>
        <label>Endereco<input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></label>
        <SearchableSelect label="Regiao" value={draft.regionId} options={regions} placeholder="Digite a regiao" onChange={(value) => setDraft({ ...draft, regionId: value })} />
        <label>Data de nascimento<input type="date" value={draft.birthDate} onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })} /></label>
        <label>Preferencias alimentares<input value={draft.diet} onChange={(e) => setDraft({ ...draft, diet: e.target.value })} /></label>
      </>
    </ManagerShell>
  );
}

function SupplierManager({ disabled, onCreate, onDelete, onUpdate, suppliers }: { disabled: boolean; onCreate: (input: Parameters<typeof createSupplier>[0]) => void; onDelete: (id: number) => void; onUpdate: (input: Parameters<typeof updateSupplier>[0]) => void; suppliers: Supplier[] }) {
  const blank = (): SupplierDraft => ({ name: "", phone: "", email: "", note: "" });
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("novo");
  const [draft, setDraft] = useState<SupplierDraft>(blank);
  const [formOpen, setFormOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [del, setDel] = useState<Supplier | null>(null);
  const filtered = useMemo(() => filterItems(suppliers, query, (i) => `${i.name} ${i.phone ?? ""} ${i.email ?? ""} ${i.note ?? ""}`), [suppliers, query]);
  function closeForm() { setFormOpen(false); setMsg(null); }
  function startNew() { setMode("novo"); setDraft(blank()); setMsg(null); setFormOpen(true); }
  function edit(i: Supplier) { setMode("editar"); setDraft({ id: i.id, name: i.name, phone: i.phone ?? "", email: i.email ?? "", note: i.note ?? "" }); setMsg(null); setFormOpen(true); }
  function duplicate(i: Supplier) { setMode("duplicar"); setDraft({ name: i.name, phone: i.phone ?? "", email: i.email ?? "", note: i.note ?? "" }); setMsg("Fornecedor duplicado em edicao. Ajuste os dados antes de salvar."); setFormOpen(true); }
  function submit() {
    setMsg(null);
    if (!draft.name.trim()) return setMsg("Preencha o nome antes de salvar.");
    const repeated = suppliers.find((i) => (mode !== "editar" || i.id !== draft.id) && (normalizeValue(i.name) === normalizeValue(draft.name) || (draft.phone && onlyDigits(i.phone) === onlyDigits(draft.phone))));
    if (repeated) return setMsg(`Possivel duplicidade: ${repeated.name}. Ajuste antes de salvar.`);
    if (mode === "editar" && draft.id) onUpdate({ id: draft.id, name: draft.name, phone: draft.phone, email: draft.email, note: draft.note }); else onCreate({ name: draft.name, phone: draft.phone, email: draft.email, note: draft.note });
    closeForm();
  }

  return (
    <ManagerShell title="Fornecedores" total={suppliers.length} filtered={filtered.length} query={query} setQuery={setQuery} searchPlaceholder="Buscar por nome, telefone, email ou observacao" newLabel="Novo fornecedor" onNew={startNew} formOpen={formOpen} onCloseForm={closeForm} cards={filtered.map((i) => <EntityCard key={i.id} active={draft.id === i.id && mode === "editar"} title={i.name} subtitle={i.phone || "Sem telefone"} detail={i.email || "Sem email"} note={i.note} onEdit={() => edit(i)} onDuplicate={() => duplicate(i)} onDelete={() => setDel(i)} />)} formTitle={mode === "editar" ? "Editar fornecedor" : mode === "duplicar" ? "Duplicar fornecedor" : "Novo fornecedor"} formDescription="Mantenha contatos de compra em um unico lugar." message={msg} disabled={disabled} submitLabel={mode === "editar" ? "Salvar alteracoes" : "Salvar fornecedor"} onSubmit={submit} deleteModal={del ? <ConfirmDelete title="Excluir fornecedor?" description="Confira os dados antes de excluir." rows={[del.name, `Telefone: ${del.phone || "Sem telefone"}`, `Email: ${del.email || "Sem email"}`]} disabled={disabled} onCancel={() => setDel(null)} onConfirm={() => { onDelete(del.id); setDel(null); closeForm(); }} /> : null}>
      <>
        <label>Nome<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
        <label>Telefone<input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></label>
        <label>Email<input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></label>
        <label>Observacao<input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></label>
      </>
    </ManagerShell>
  );
}

function ResourceManager({ categories, disabled, measures, onCreate, onDelete, onUpdate, resources }: { categories: Option[]; disabled: boolean; measures: Measure[]; onCreate: (input: Parameters<typeof createResource>[0]) => void; onDelete: (id: number) => void; onUpdate: (input: Parameters<typeof updateResource>[0]) => void; resources: Resource[] }) {
  const blank = (): ResourceDraft => ({ type: "Ingrediente", name: "", categoryId: categories[0]?.value ?? 0, stock: 0, unitCost: 0, measure: measureName(measures), expiresAt: "" });
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("novo");
  const [draft, setDraft] = useState<ResourceDraft>(blank);
  const [formOpen, setFormOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [del, setDel] = useState<Resource | null>(null);
  const filtered = useMemo(() => filterItems(resources, query, (i) => `${i.name} ${i.type ?? ""} ${i.category ?? ""} ${i.measure ?? ""}`), [resources, query]);
  function closeForm() { setFormOpen(false); setMsg(null); }
  function startNew() { setMode("novo"); setDraft(blank()); setMsg(null); setFormOpen(true); }
  function edit(i: Resource) { setMode("editar"); setDraft({ id: i.id, type: i.type ?? "Ingrediente", name: i.name, categoryId: i.categoryId ?? categories[0]?.value ?? 0, stock: i.stock, unitCost: i.unitCost, measure: i.measure ?? measureName(measures), expiresAt: i.expiresAt ?? "" }); setMsg(null); setFormOpen(true); }
  function duplicate(i: Resource) { setMode("duplicar"); setDraft({ type: i.type ?? "Ingrediente", name: i.name, categoryId: i.categoryId ?? categories[0]?.value ?? 0, stock: i.stock, unitCost: i.unitCost, measure: i.measure ?? measureName(measures), expiresAt: i.expiresAt ?? "" }); setMsg("Recurso duplicado em edicao. Ajuste nome ou medida antes de salvar."); setFormOpen(true); }
  function submit() {
    setMsg(null);
    if (!draft.name.trim()) return setMsg("Preencha o nome antes de salvar.");
    const repeated = resources.find((i) => (mode !== "editar" || i.id !== draft.id) && normalizeValue(i.name) === normalizeValue(draft.name) && normalizeValue(i.measure) === normalizeValue(draft.measure));
    if (repeated) return setMsg(`Possivel duplicidade: ${repeated.name}. Ajuste antes de salvar.`);
    const category = categories.find((i) => i.value === draft.categoryId);
    const input = { type: draft.type, name: draft.name, categoryId: draft.categoryId, category: category?.label, stock: draft.stock, unitCost: draft.unitCost, measure: draft.measure, expiresAt: draft.expiresAt };
    if (mode === "editar" && draft.id) onUpdate({ ...input, id: draft.id }); else onCreate(input);
    closeForm();
  }

  return (
    <ManagerShell title="Recursos" total={resources.length} filtered={filtered.length} query={query} setQuery={setQuery} searchPlaceholder="Buscar por recurso, tipo, categoria ou medida" newLabel="Novo recurso" onNew={startNew} formOpen={formOpen} onCloseForm={closeForm} cards={filtered.map((i) => <EntityCard key={i.id} active={draft.id === i.id && mode === "editar"} title={i.name} subtitle={`${i.stock} ${i.measure ?? ""}`} detail={i.category ?? "Sem categoria"} note={i.type} onEdit={() => edit(i)} onDuplicate={() => duplicate(i)} onDelete={() => setDel(i)} />)} formTitle={mode === "editar" ? "Editar recurso" : mode === "duplicar" ? "Duplicar recurso" : "Novo recurso"} formDescription="Use com cuidado: estoque e custo alimentam producao e compras." message={msg} disabled={disabled} submitLabel={mode === "editar" ? "Salvar alteracoes" : "Salvar recurso"} onSubmit={submit} deleteModal={del ? <ConfirmDelete title="Excluir recurso?" description="Confira os dados antes de excluir." rows={[del.name, `Estoque: ${del.stock} ${del.measure ?? ""}`, `Categoria: ${del.category ?? "Sem categoria"}`]} disabled={disabled} onCancel={() => setDel(null)} onConfirm={() => { onDelete(del.id); setDel(null); closeForm(); }} /> : null}>
      <>
        <label>Tipo<input value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} /></label>
        <label>Nome<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
        <SearchableSelect label="Categoria" value={draft.categoryId} options={categories} placeholder="Digite a categoria" onChange={(value) => setDraft({ ...draft, categoryId: value })} />
        <label>Estoque<input type="number" min="0" step="0.001" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })} /></label>
        <label>Custo unitario<input type="number" min="0" step="0.01" value={draft.unitCost} onChange={(e) => setDraft({ ...draft, unitCost: Number(e.target.value) })} /></label>
        <label>Medida<select value={draft.measure} onChange={(e) => setDraft({ ...draft, measure: e.target.value })}>{measures.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
        <label>Validade<input type="date" value={draft.expiresAt} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} /></label>
      </>
    </ManagerShell>
  );
}

function ProductManager({ categories, disabled, measures, onCreate, onDelete, onUpdate, products, resources }: { categories: Option[]; disabled: boolean; measures: Measure[]; onCreate: (input: Parameters<typeof createProduct>[0]) => void; onDelete: (id: number) => void; onUpdate: (input: Parameters<typeof updateProduct>[0]) => void; products: Product[]; resources: Option[] }) {
  const blank = (): ProductDraft => ({ name: "", description: "", resourceId: resources[0]?.value ?? 0, categoryId: categories[0]?.value ?? 0, category: categories[0]?.label ?? "Sem categoria", imageUrl: "", tags: "", featuredSelfService: false, yieldServings: 20, weight: 1, measure: measureName(measures), price: 0, available: true });
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("novo");
  const [draft, setDraft] = useState<ProductDraft>(blank);
  const [formOpen, setFormOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [del, setDel] = useState<Product | null>(null);
  const filtered = useMemo(() => filterItems(products, query, (i) => `${i.name} ${i.category} ${i.available ? "disponivel" : "indisponivel"}`), [products, query]);
  function closeForm() { setFormOpen(false); setMsg(null); }
  function startNew() { setMode("novo"); setDraft(blank()); setMsg(null); setFormOpen(true); }
  function toDraft(i: Product, keepId: boolean): ProductDraft { return { id: keepId ? i.id : undefined, name: i.name, description: i.description ?? "", resourceId: i.resourceId ?? resources[0]?.value ?? 0, categoryId: categories.find((c) => c.label === i.category)?.value ?? categories[0]?.value ?? 0, category: i.category, imageUrl: i.imageUrl ?? "", tags: (i.tags ?? []).join(", "), featuredSelfService: i.featuredSelfService ?? false, yieldServings: i.yieldServings ?? 20, weight: i.weight ?? 1, measure: i.measure ?? measureName(measures), price: i.price, available: i.available }; }
  function edit(i: Product) { setMode("editar"); setDraft(toDraft(i, true)); setMsg(null); setFormOpen(true); }
  function duplicate(i: Product) { setMode("duplicar"); setDraft(toDraft(i, false)); setMsg("Produto duplicado em edicao. Ajuste nome ou categoria antes de salvar."); setFormOpen(true); }
  function submit() {
    setMsg(null);
    if (!draft.name.trim() || draft.price < 0) return setMsg("Preencha nome e preco valido antes de salvar.");
    const category = categories.find((i) => i.value === draft.categoryId);
    const repeated = products.find((i) => (mode !== "editar" || i.id !== draft.id) && normalizeValue(i.name) === normalizeValue(draft.name) && normalizeValue(i.category) === normalizeValue(category?.label ?? draft.category));
    if (repeated) return setMsg(`Possivel duplicidade: ${repeated.name}. Ajuste antes de salvar.`);
    const input = { name: draft.name, description: draft.description, category: category?.label ?? draft.category, categoryId: draft.categoryId, price: draft.price, available: draft.available, weight: draft.weight, measure: draft.measure, resourceId: draft.resourceId || undefined, imageUrl: draft.imageUrl, tags: parseTags(draft.tags), featuredSelfService: draft.featuredSelfService, yieldServings: draft.yieldServings };
    if (mode === "editar" && draft.id) onUpdate({ ...input, id: draft.id }); else onCreate(input);
    closeForm();
  }

  return (
    <ManagerShell title="Produtos" total={products.length} filtered={filtered.length} query={query} setQuery={setQuery} searchPlaceholder="Buscar por produto, categoria ou disponibilidade" newLabel="Novo produto" onNew={startNew} formOpen={formOpen} onCloseForm={closeForm} cards={filtered.map((i) => <EntityCard key={i.id} active={draft.id === i.id && mode === "editar"} title={i.name} subtitle={i.category} detail={i.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} note={i.available ? "Disponivel" : "Indisponivel"} onEdit={() => edit(i)} onDuplicate={() => duplicate(i)} onDelete={() => setDel(i)} />)} formTitle={mode === "editar" ? "Editar produto" : mode === "duplicar" ? "Duplicar produto" : "Novo produto"} formDescription="Produtos ficam aqui para consulta, cardapio, autoatendimento e receitas." message={msg} disabled={disabled} submitLabel={mode === "editar" ? "Salvar alteracoes" : "Salvar produto"} onSubmit={submit} deleteModal={del ? <ConfirmDelete title="Excluir produto?" description="Confira os dados antes de excluir." rows={[del.name, `Categoria: ${del.category}`, `Preco: ${del.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`]} disabled={disabled} onCancel={() => setDel(null)} onConfirm={() => { onDelete(del.id); setDel(null); closeForm(); }} /> : null}>
      <>
        <label>Nome<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
        <SearchableSelect label="Recurso vinculado" value={draft.resourceId} options={resources} placeholder="Digite o recurso" onChange={(value) => setDraft({ ...draft, resourceId: value })} />
        <SearchableSelect label="Categoria" value={draft.categoryId} options={categories} placeholder="Digite a categoria" onChange={(value) => setDraft({ ...draft, categoryId: value })} />
        <label>Descricao<input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
        <label>URL da imagem<input value={draft.imageUrl} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} /></label>
        <label>Etiquetas<input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} /></label>
        <label>Peso<input type="number" min="0" step="0.001" value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value) })} /></label>
        <label>Medida<select value={draft.measure} onChange={(e) => setDraft({ ...draft, measure: e.target.value })}>{measures.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
        <label>Preco<input type="number" min="0" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /></label>
        <label>Rendimento<input type="number" min="1" step="1" value={draft.yieldServings} onChange={(e) => setDraft({ ...draft, yieldServings: Number(e.target.value) })} /></label>
        <label>Disponibilidade<select value={draft.available ? "Sim" : "Nao"} onChange={(e) => setDraft({ ...draft, available: e.target.value === "Sim" })}><option>Sim</option><option>Nao</option></select></label>
        <label className="checkbox-field"><input type="checkbox" checked={draft.featuredSelfService} onChange={(e) => setDraft({ ...draft, featuredSelfService: e.target.checked })} /> Destaque no autoatendimento</label>
      </>
    </ManagerShell>
  );
}

function groupRecipes(recipeItems: RecipeItem[]): RecipeGroup[] {
  const grouped = new Map<number, RecipeGroup>();
  for (const item of recipeItems) {
    if (!item.productId) continue;
    const current = grouped.get(item.productId) ?? { productId: item.productId, productName: item.productName, items: [] };
    current.items.push(item);
    grouped.set(item.productId, current);
  }
  return [...grouped.values()]
    .map((group) => ({ ...group, items: group.items.sort((a, b) => (a.preparationOrder ?? 9999) - (b.preparationOrder ?? 9999) || a.resourceName.localeCompare(b.resourceName, "pt-BR")) }))
    .sort((a, b) => a.productName.localeCompare(b.productName, "pt-BR"));
}

function lineFromItem(item: RecipeItem, fallbackOrder: number, measures: Measure[]): RecipeLineDraft {
  return {
    tempId: tempId(),
    id: item.id,
    productId: item.productId ?? 0,
    resourceId: item.resourceId ?? 0,
    quantity: item.quantity ?? 0,
    measure: item.measure ?? measureName(measures),
    preparationOrder: item.preparationOrder ?? fallbackOrder
  };
}

function emptyRecipeLine(productId: number, measures: Measure[], order: number): RecipeLineDraft {
  return {
    tempId: tempId(),
    productId,
    resourceId: 0,
    quantity: 0,
    measure: measureName(measures),
    preparationOrder: order
  };
}

function RecipeManager({ disabled, measures, onCreate, onDelete, onUpdate, products, recipeItems, resources }: { disabled: boolean; measures: Measure[]; onCreate: (input: Parameters<typeof createRecipe>[0]) => void; onDelete: (id: string) => void; onUpdate: (input: Parameters<typeof updateRecipeItem>[0]) => void; products: Option[]; recipeItems: RecipeItem[]; resources: Option[] }) {
  const recipeGroups = useMemo(() => groupRecipes(recipeItems), [recipeItems]);
  const blank = (): RecipeDraft => ({ productId: products[0]?.value ?? 0, lines: [emptyRecipeLine(products[0]?.value ?? 0, measures, 1)] });
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("novo");
  const [draft, setDraft] = useState<RecipeDraft>(blank);
  const [formOpen, setFormOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecipeGroup | null>(null);
  const filtered = useMemo(() => filterItems(recipeGroups, query, (group) => `${group.productName} ${group.items.map((item) => item.resourceName).join(" ")}`, 24), [recipeGroups, query]);

  function closeForm() { setFormOpen(false); setMsg(null); }
  function startNew() { setMode("novo"); setDraft(blank()); setMsg(null); setFormOpen(true); }
  function edit(group: RecipeGroup) {
    setMode("editar");
    setDraft({ productId: group.productId, lines: group.items.map((item, index) => lineFromItem(item, index + 1, measures)) });
    setMsg(null);
    setFormOpen(true);
  }
  function duplicate(group: RecipeGroup) {
    setMode("duplicar");
    setDraft({ productId: group.productId, lines: group.items.map((item, index) => ({ ...lineFromItem(item, index + 1, measures), id: undefined, tempId: tempId() })) });
    setMsg("Receita duplicada em edicao. Escolha o produto final e ajuste os ingredientes antes de salvar.");
    setFormOpen(true);
  }
  function changeProduct(productId: number) {
    setDraft((current) => ({ productId, lines: current.lines.map((line) => ({ ...line, productId })) }));
  }
  function updateLine(temp: string, patch: Partial<RecipeLineDraft>) {
    setDraft((current) => ({ ...current, lines: current.lines.map((line) => line.tempId === temp ? { ...line, ...patch, productId: current.productId } : line) }));
  }
  function addLine() {
    setDraft((current) => ({ ...current, lines: [...current.lines, emptyRecipeLine(current.productId, measures, current.lines.length + 1)] }));
  }
  function removeLine(temp: string) {
    setDraft((current) => ({ ...current, lines: current.lines.length > 1 ? current.lines.filter((line) => line.tempId !== temp) : current.lines }));
  }
  function submit() {
    setMsg(null);
    if (!draft.productId) return setMsg("Selecione o produto final da receita.");
    if (!draft.lines.length) return setMsg("Inclua ao menos um ingrediente na receita.");
    const invalid = draft.lines.find((line) => !line.resourceId || line.quantity <= 0);
    if (invalid) return setMsg("Todos os ingredientes precisam ter recurso e quantidade maior que zero.");
    const keys = new Set<string>();
    for (const line of draft.lines) {
      const key = `${line.resourceId}-${normalizeValue(line.measure)}`;
      if (keys.has(key)) return setMsg("Existe ingrediente repetido com a mesma medida. Ajuste ou remova a duplicidade antes de salvar.");
      keys.add(key);
    }
    const previous = mode === "editar" ? recipeItems.filter((item) => item.productId === draft.productId) : [];
    const activeIds = new Set(draft.lines.map((line) => line.id).filter(Boolean));
    for (const item of previous) {
      if (!activeIds.has(item.id)) onDelete(item.id);
    }
    for (const line of draft.lines) {
      const input = { productId: draft.productId, resourceId: line.resourceId, quantity: line.quantity, measure: line.measure, preparationOrder: line.preparationOrder };
      if (mode === "editar" && line.id) onUpdate({ id: line.id, ...input }); else onCreate(input);
    }
    closeForm();
  }

  return (
    <ManagerShell title="Receitas" total={recipeGroups.length} filtered={filtered.length} query={query} setQuery={setQuery} searchPlaceholder="Buscar por receita, produto ou ingrediente" newLabel="Nova receita" onNew={startNew} formOpen={formOpen} onCloseForm={closeForm} cards={filtered.map((group) => <EntityCard key={group.productId} active={draft.productId === group.productId && mode === "editar"} title={group.productName} subtitle={`${group.items.length} ingredientes`} detail={group.items.slice(0, 4).map((item) => item.resourceName).join(", ")} note={group.items.length > 4 ? `+ ${group.items.length - 4} ingredientes` : undefined} onEdit={() => edit(group)} onDuplicate={() => duplicate(group)} onDelete={() => setDeleteTarget(group)} />)} formTitle={mode === "editar" ? "Editar receita" : mode === "duplicar" ? "Duplicar receita" : "Nova receita"} formDescription="Edite a receita inteira: produto final, ingredientes, quantidades, medidas e ordem de preparo." message={msg} disabled={disabled} submitLabel={mode === "editar" ? "Salvar receita" : "Salvar receita"} onSubmit={submit} deleteModal={deleteTarget ? <ConfirmDelete title="Excluir receita?" description="Isso remove todos os ingredientes dessa receita." rows={[deleteTarget.productName, `${deleteTarget.items.length} ingredientes`, deleteTarget.items.slice(0, 8).map((item) => item.resourceName).join(", ")]} disabled={disabled} onCancel={() => setDeleteTarget(null)} onConfirm={() => { deleteTarget.items.forEach((item) => onDelete(item.id)); setDeleteTarget(null); closeForm(); }} /> : null}>
      <>
        <SearchableSelect label="Produto final" value={draft.productId} options={products} placeholder="Digite o produto" onChange={changeProduct} />
        <div className="recipe-form-wide">
          <div className="panel-heading recipe-line-heading">
            <div>
              <h2>Ingredientes da receita</h2>
              <span className="muted-count">{draft.lines.length} item(ns)</span>
            </div>
            <button className="secondary-action" type="button" onClick={addLine}><Plus size={17} />Adicionar ingrediente</button>
          </div>
          <div className="recipe-line-list">
            {draft.lines.map((line, index) => (
              <div className="recipe-line-editor" key={line.tempId}>
                <span className="event-row-number">{index + 1}</span>
                <SearchableSelect label="Ingrediente/Recurso" value={line.resourceId} options={resources} placeholder="Digite o ingrediente" onChange={(value) => updateLine(line.tempId, { resourceId: value })} />
                <label>Quantidade<input type="number" min="0" step="0.001" value={line.quantity} onChange={(e) => updateLine(line.tempId, { quantity: Number(e.target.value) })} /></label>
                <label>Medida<select value={line.measure} onChange={(e) => updateLine(line.tempId, { measure: e.target.value })}>{measures.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
                <label>Ordem<input type="number" min="1" step="1" value={line.preparationOrder} onChange={(e) => updateLine(line.tempId, { preparationOrder: Number(e.target.value) })} /></label>
                <button className="icon-action danger-action" type="button" aria-label="Remover ingrediente" onClick={() => removeLine(line.tempId)}><Trash2 size={17} /></button>
              </div>
            ))}
          </div>
        </div>
      </>
    </ManagerShell>
  );
}
