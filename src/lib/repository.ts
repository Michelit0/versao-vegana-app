import { supabase } from "./supabase";
import { demoCustomers, demoDashboard, demoPaymentMethods, demoProducts, demoSales } from "./demoData";
import { cleanText } from "./format";
import type { Category, Customer, DashboardMetrics, Measure, PaymentMethod, Product, PurchaseQuote, RecipeItem, Region, Resource, Sale, SaleItemDraft, Supplier } from "../types";

type NewSaleInput = {
  customerId?: number | null;
  customerName?: string | null;
  paymentMethodId: number;
  deliveryFee: number;
  packageFee: number;
  discount: number;
  items: SaleItemDraft[];
  channel?: "balcao" | "whatsapp" | "instagram" | "ifood" | "indicacao" | "outro";
  status?: "rascunho" | "pendente" | "finalizado" | "cancelado";
  serviceStatus?: "nao_iniciado" | "em_producao" | "pronto" | "entregue" | "retirado" | "cancelado";
  note?: string | null;
};

type NewProductInput = {
  id?: number;
  name: string;
  description?: string | null;
  category: string;
  categoryId?: number | null;
  price: number;
  available: boolean;
  weight?: number | null;
  measure?: string | null;
  resourceId?: number | null;
  imageUrl?: string | null;
  tags?: string[];
  featuredSelfService?: boolean;
  yieldServings?: number;
};

type NewCustomerInput = {
  id?: number;
  name: string;
  email?: string | null;
  phone: string;
  address: string;
  regionId?: number | null;
  region?: string | null;
  birthDate?: string | null;
  dietaryPreferences?: string | null;
};

type NewSupplierInput = {
  id?: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  note?: string | null;
};

type NewResourceInput = {
  id?: number;
  type: string;
  name: string;
  categoryId?: number | null;
  category?: string | null;
  stock: number;
  unitCost: number;
  measure: string;
  expiresAt?: string | null;
};

type NewRecipeInput = {
  productId: number;
  resourceId: number;
  quantity: number;
  measure: string;
  preparationOrder?: number | null;
};

type UpdateRecipeItemInput = {
  id: string;
  quantity: number;
  measure: string;
  preparationOrder?: number | null;
};

type NewProductionInput = {
  productId: number;
  quantity: number;
  producedAt: string;
  expiresAt?: string | null;
  note?: string | null;
};

type NewPurchaseInput = {
  resourceId: number;
  supplierId: number;
  quantity: number;
  purchasedAt: string;
  totalCost: number;
  measure: string;
  invoice?: string | null;
};

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

function isMissingColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === "42703" || candidate.code === "PGRST204" || /column|schema cache/i.test(candidate.message ?? "");
}

function mapProduct(row: any): Product {
  return {
    id: row.id_produto,
    name: cleanText(row.nome_produto),
    description: cleanText(row.descricao, "") || null,
    category: cleanText(row.desc_categoria, "Sem categoria"),
    price: Number(row.preco ?? 0),
    available: String(row.disponibilidade ?? "").toLowerCase() !== "nao",
    weight: row.peso,
    measure: row.tipo_medida,
    resourceId: row.id_recurso,
    imageUrl: row.url_imagem ?? null,
    tags: row.etiquetas ?? [],
    featuredSelfService: Boolean(row.destaque_autoatendimento),
    yieldServings: Number(row.rendimento_pessoas ?? 20)
  };
}

async function nextId(table: string, column: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from(table)
    .select(column)
    .order(column, { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return Number((data as any)?.[column] ?? 0) + 1;
}

export async function getProducts(): Promise<Product[]> {
  if (!supabase) return demoProducts;

  const { data, error } = await supabase
    .from("produtos")
    .select("id_produto,nome_produto,descricao,desc_categoria,preco,disponibilidade,peso,tipo_medida,id_recurso,url_imagem,etiquetas,destaque_autoatendimento,rendimento_pessoas")
    .or("ativo.is.null,ativo.eq.true")
    .order("nome_produto");

  if (error && isMissingColumnError(error)) {
    const { data: legacyData, error: legacyError } = await supabase
      .from("produtos")
      .select("id_produto,nome_produto,desc_categoria,preco,disponibilidade,peso,tipo_medida,id_recurso,url_imagem,etiquetas")
      .or("ativo.is.null,ativo.eq.true")
      .order("nome_produto");
    if (legacyError) throw legacyError;
    return legacyData.map(mapProduct);
  }

  if (error) throw error;
  return data.map(mapProduct);
}

export async function getCustomers(): Promise<Customer[]> {
  if (!supabase) return demoCustomers;

  const { data, error } = await supabase
    .from("clientes")
    .select("id_cliente,nome_cliente,email_cliente,telefone_cliente,endereco_cliente,id_regiao,regiao,preferencias_alimentares")
    .or("ativo.is.null,ativo.eq.true")
    .order("nome_cliente");

  if (error) throw error;
  return data.map((row: any) => ({
    id: row.id_cliente,
    name: cleanText(row.nome_cliente),
    email: row.email_cliente,
    phone: row.telefone_cliente,
    address: cleanText(row.endereco_cliente, "") || null,
    regionId: row.id_regiao,
    region: cleanText(row.regiao, "") || null,
    dietaryPreferences: cleanText(row.preferencias_alimentares, "") || null
  }));
}

export async function getSuppliers(): Promise<Supplier[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("fornecedores")
    .select("id_fornecedor,nome_fornecedor,telefone_fornecedor,email_fornecedor,observacao")
    .or("ativo.is.null,ativo.eq.true")
    .order("nome_fornecedor");
  if (error) throw error;
  return data.map((row: any) => ({
    id: row.id_fornecedor,
    name: cleanText(row.nome_fornecedor),
    phone: row.telefone_fornecedor,
    email: row.email_fornecedor,
    note: cleanText(row.observacao, "") || null
  }));
}

export async function getResources(): Promise<Resource[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("recursos")
    .select("id_recurso,tipo_recurso,nome_recurso,id_categoria_recurso,desc_categoria_rec,qtd_estoque,custo_unitario,tipo_medida,data_validade")
    .or("ativo.is.null,ativo.eq.true")
    .order("nome_recurso");
  if (error) throw error;
  return data.map((row: any) => ({
    id: row.id_recurso,
    type: cleanText(row.tipo_recurso, "") || null,
    name: cleanText(row.nome_recurso),
    categoryId: row.id_categoria_recurso,
    category: cleanText(row.desc_categoria_rec, "") || null,
    stock: Number(row.qtd_estoque ?? 0),
    unitCost: Number(row.custo_unitario ?? 0),
    measure: row.tipo_medida,
    expiresAt: row.data_validade
  }));
}

export async function getRegions(): Promise<Region[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("regioes").select("id_regiao,regiao,taxa").order("regiao");
  if (error) throw error;
  return data.map((row: any) => ({ id: row.id_regiao, name: cleanText(row.regiao), fee: Number(row.taxa ?? 0) }));
}

export async function getCategories(): Promise<Category[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("categorias").select("cod_categoria,categoria,tipo_categoria").order("categoria");
  if (error) throw error;
  return data.map((row: any) => ({ id: row.cod_categoria, name: cleanText(row.categoria), type: cleanText(row.tipo_categoria) }));
}

export async function getMeasures(): Promise<Measure[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("tipos_medida").select("tipo_medida").order("tipo_medida");
  if (error) throw error;
  return data.map((row: any) => ({ name: cleanText(row.tipo_medida) }));
}

function mapRecipeItem(row: any, index: number): RecipeItem {
  return {
    id: String(row.id_receita_item ?? `${row.id_receita ?? "receita"}-${row.id_produto ?? "produto"}-${row.id_recurso ?? "recurso"}-${index}`),
    recipeId: row.id_receita ?? null,
    productId: row.id_produto ?? null,
    productName: cleanText(row.nome_produto, "Produto sem nome"),
    resourceId: row.id_recurso ?? null,
    resourceName: cleanText(row.nome_recurso, "Ingrediente sem nome"),
    quantity: row.qtd_ingrediente === null || row.qtd_ingrediente === undefined ? null : Number(row.qtd_ingrediente),
    measure: row.tipo_medida ?? null,
    preparationOrder: row.ordem_preparo === null || row.ordem_preparo === undefined ? null : Number(row.ordem_preparo)
  };
}

export async function getRecipeItems(): Promise<RecipeItem[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("receitas")
    .select("id_receita_item,id_receita,id_produto,nome_produto,id_recurso,nome_recurso,qtd_ingrediente,tipo_medida,ordem_preparo")
    .not("id_produto", "is", null)
    .order("id_produto")
    .order("id_receita_item");

  if (error && isMissingColumnError(error)) {
    const { data: legacyData, error: legacyError } = await supabase
      .from("receitas")
      .select("id_receita,id_produto,nome_produto,id_recurso,nome_recurso,qtd_ingrediente,tipo_medida")
      .not("id_produto", "is", null)
      .order("id_produto")
      .order("id_receita");
    if (legacyError) throw legacyError;
    return legacyData.map(mapRecipeItem);
  }

  if (error) throw error;
  return data.map(mapRecipeItem);
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  if (!supabase) return demoPaymentMethods;

  const { data, error } = await supabase
    .from("formas_pagamento")
    .select("id_forma_pagamento,forma_pagamento,bandeira,taxa")
    .order("forma_pagamento");

  if (error) throw error;
  return data.map((row) => ({
    id: row.id_forma_pagamento,
    name: cleanText(row.forma_pagamento),
    brand: cleanText(row.bandeira, "") || null,
    feeRate: Number(row.taxa ?? 0)
  }));
}

export async function getPurchaseQuotes(resourceId: number): Promise<PurchaseQuote[]> {
  if (!supabase || !resourceId) return [];

  const { data, error } = await supabase
    .from("vw_cotacao_recursos_fornecedores")
    .select("id_recurso,id_fornecedor,nome_fornecedor,data_ultima_compra,ultimo_custo_unitario,custo_unitario_medio,custo_unitario_minimo,custo_unitario_maximo,qtd_compras,ultima_qtd_comprada,ultima_tipo_medida")
    .eq("id_recurso", resourceId)
    .order("ultimo_custo_unitario", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    resourceId: Number(row.id_recurso),
    supplierId: Number(row.id_fornecedor),
    supplierName: cleanText(row.nome_fornecedor, "Fornecedor nao informado"),
    lastPurchaseDate: row.data_ultima_compra ?? null,
    lastUnitCost: Number(row.ultimo_custo_unitario ?? 0),
    averageUnitCost: Number(row.custo_unitario_medio ?? 0),
    minimumUnitCost: Number(row.custo_unitario_minimo ?? 0),
    maximumUnitCost: Number(row.custo_unitario_maximo ?? 0),
    purchaseCount: Number(row.qtd_compras ?? 0),
    lastQuantity: Number(row.ultima_qtd_comprada ?? 0),
    lastMeasure: row.ultima_tipo_medida ?? null
  }));
}

export async function getSales(): Promise<Sale[]> {
  if (!supabase) return demoSales;

  const { data, error } = await supabase
    .from("pedidos")
    .select("id_pedido,data_pedido,status_pedido,valor_total,valor_final,nome_cliente,forma_pagamento")
    .order("data_pedido", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data.map((row: any) => ({
    id: row.id_pedido,
    orderedAt: row.data_pedido ?? new Date().toISOString(),
    customerName: cleanText(row.nome_cliente, "Cliente nao informado"),
    status: row.status_pedido,
    paymentMethod: cleanText(row.forma_pagamento, "-"),
    grossAmount: Number(row.valor_total ?? 0),
    finalAmount: Number(row.valor_final ?? 0)
  }));
}

export async function getDashboard(): Promise<DashboardMetrics> {
  if (!supabase) return demoDashboard;

  const sales = await getSales();
  const { data: topProductsData } = await supabase
    .from("vw_desempenho_produtos")
    .select("nome_produto,qtd_vendida,receita_bruta")
    .order("qtd_vendida", { ascending: false })
    .limit(5);
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const today = now.toISOString().slice(0, 10);
  const revenueToday = sales
    .filter((sale) => sale.orderedAt.slice(0, 10) === today && sale.status !== "cancelado")
    .reduce((sum, sale) => sum + sale.finalAmount, 0);
  const monthSales = sales.filter((sale) => {
    const date = new Date(sale.orderedAt);
    return date.getMonth() === month && date.getFullYear() === year && sale.status !== "cancelado";
  });

  return {
    revenueToday,
    revenueMonth: monthSales.reduce((sum, sale) => sum + sale.finalAmount, 0),
    openOrders: sales.filter((sale) => sale.status === "pendente").length,
    averageTicket: monthSales.length ? monthSales.reduce((sum, sale) => sum + sale.finalAmount, 0) / monthSales.length : 0,
    topProducts: (topProductsData ?? []).map((row: any) => ({
      name: cleanText(row.nome_produto, "Produto nao informado"),
      quantity: Number(row.qtd_vendida ?? 0),
      revenue: Number(row.receita_bruta ?? 0)
    })),
    recentSales: sales.slice(0, 8)
  };
}

export async function createProduct(input: NewProductInput): Promise<Product> {
  if (!supabase) {
    return {
      id: Math.floor(Math.random() * 100000),
      name: input.name,
      description: input.description ?? null,
      category: input.category,
      price: input.price,
      available: input.available,
      weight: input.weight ?? null,
      measure: input.measure ?? null,
      resourceId: input.resourceId ?? null,
      imageUrl: input.imageUrl ?? null,
      tags: input.tags ?? [],
      featuredSelfService: input.featuredSelfService ?? false,
      yieldServings: input.yieldServings ?? 20
    };
  }

  const client = requireSupabase();
  const nextProductId = await nextId("produtos", "id_produto");
  const row = {
    id_produto: nextProductId,
    nome_produto: input.name.trim(),
    descricao: input.description?.trim() || null,
    categoria: input.categoryId ?? null,
    desc_categoria: input.category.trim() || "Sem categoria",
    preco: input.price,
    disponibilidade: input.available ? "Sim" : "Nao",
    peso: input.weight ?? null,
    tipo_medida: input.measure || null,
    id_recurso: input.resourceId ?? null,
    url_imagem: input.imageUrl?.trim() || null,
    etiquetas: input.tags ?? [],
    destaque_autoatendimento: input.featuredSelfService ?? false,
    rendimento_pessoas: input.yieldServings ?? 20,
    data_inclusao: new Date().toISOString()
  };

  const { data, error } = await client
    .from("produtos")
    .insert(row)
    .select("id_produto,nome_produto,descricao,desc_categoria,preco,disponibilidade,peso,tipo_medida,id_recurso,url_imagem,etiquetas,destaque_autoatendimento,rendimento_pessoas")
    .single();

  if (error && isMissingColumnError(error)) {
    const { descricao, destaque_autoatendimento, rendimento_pessoas, ...legacyRow } = row;
    void descricao;
    void destaque_autoatendimento;
    void rendimento_pessoas;
    const { data: legacyData, error: legacyError } = await client
      .from("produtos")
      .insert(legacyRow)
      .select("id_produto,nome_produto,desc_categoria,preco,disponibilidade,peso,tipo_medida,id_recurso,url_imagem,etiquetas")
      .single();
    if (legacyError) throw legacyError;
    return mapProduct(legacyData);
  }

  if (error) throw error;
  return mapProduct(data);
}

export async function updateProduct(input: NewProductInput & { id: number }): Promise<Product> {
  if (!supabase) {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      category: input.category,
      price: input.price,
      available: input.available,
      weight: input.weight ?? null,
      measure: input.measure ?? null,
      resourceId: input.resourceId ?? null,
      imageUrl: input.imageUrl ?? null,
      tags: input.tags ?? [],
      featuredSelfService: input.featuredSelfService ?? false,
      yieldServings: input.yieldServings ?? 20
    };
  }

  const row = {
    nome_produto: input.name.trim(),
    descricao: input.description?.trim() || null,
    categoria: input.categoryId ?? null,
    desc_categoria: input.category.trim() || "Sem categoria",
    preco: input.price,
    disponibilidade: input.available ? "Sim" : "Nao",
    peso: input.weight ?? null,
    tipo_medida: input.measure || null,
    id_recurso: input.resourceId ?? null,
    url_imagem: input.imageUrl?.trim() || null,
    etiquetas: input.tags ?? [],
    destaque_autoatendimento: input.featuredSelfService ?? false,
    rendimento_pessoas: input.yieldServings ?? 20
  };

  const { data, error } = await requireSupabase()
    .from("produtos")
    .update(row)
    .eq("id_produto", input.id)
    .select("id_produto,nome_produto,descricao,desc_categoria,preco,disponibilidade,peso,tipo_medida,id_recurso,url_imagem,etiquetas,destaque_autoatendimento,rendimento_pessoas")
    .single();

  if (error && isMissingColumnError(error)) {
    const { descricao, destaque_autoatendimento, rendimento_pessoas, ...legacyRow } = row;
    void descricao;
    void destaque_autoatendimento;
    void rendimento_pessoas;
    const { data: legacyData, error: legacyError } = await requireSupabase()
      .from("produtos")
      .update(legacyRow)
      .eq("id_produto", input.id)
      .select("id_produto,nome_produto,desc_categoria,preco,disponibilidade,peso,tipo_medida,id_recurso,url_imagem,etiquetas")
      .single();
    if (legacyError) throw legacyError;
    return mapProduct(legacyData);
  }

  if (error) throw error;
  return mapProduct(data);
}

export async function deleteProduct(productId: number) {
  if (!supabase) return;
  const { data, error } = await supabase.rpc("inativar_produto", { p_id_produto: productId });
  if (error) throw error;
  if (data !== true) throw new Error("Produto nao encontrado para exclusao.");
}

export async function createCustomer(input: NewCustomerInput) {
  const client = requireSupabase();
  const id = await nextId("clientes", "id_cliente");
  const { error } = await client.from("clientes").insert({
    id_cliente: id,
    nome_cliente: input.name.trim(),
    email_cliente: input.email || null,
    telefone_cliente: input.phone.trim(),
    endereco_cliente: input.address.trim(),
    id_regiao: input.regionId ?? null,
    regiao: input.region ?? null,
    data_nascimento: input.birthDate || null,
    preferencias_alimentares: input.dietaryPreferences || null,
    data_inclusao: new Date().toISOString(),
    consentimento_lgpd: true
  });
  if (error) throw error;
  return { id };
}

export async function updateCustomer(input: NewCustomerInput & { id: number }) {
  const { error } = await requireSupabase().from("clientes").update({
    nome_cliente: input.name.trim(),
    email_cliente: input.email || null,
    telefone_cliente: input.phone.trim(),
    endereco_cliente: input.address.trim(),
    id_regiao: input.regionId ?? null,
    regiao: input.region ?? null,
    data_nascimento: input.birthDate || null,
    preferencias_alimentares: input.dietaryPreferences || null
  }).eq("id_cliente", input.id);
  if (error) throw error;
  return { id: input.id };
}

export async function deleteCustomer(customerId: number) {
  const { data, error } = await requireSupabase().rpc("inativar_cliente", { p_id_cliente: customerId });
  if (error) throw error;
  if (data !== true) throw new Error("Cliente nao encontrado para exclusao.");
}

export async function createSupplier(input: NewSupplierInput) {
  const client = requireSupabase();
  const id = await nextId("fornecedores", "id_fornecedor");
  const { error } = await client.from("fornecedores").insert({
    id_fornecedor: id,
    nome_fornecedor: input.name.trim(),
    telefone_fornecedor: input.phone || null,
    email_fornecedor: input.email || null,
    observacao: input.note || null,
    data_inclusao: new Date().toISOString()
  });
  if (error) throw error;
  return { id };
}

export async function updateSupplier(input: NewSupplierInput & { id: number }) {
  const { error } = await requireSupabase().from("fornecedores").update({
    nome_fornecedor: input.name.trim(),
    telefone_fornecedor: input.phone || null,
    email_fornecedor: input.email || null,
    observacao: input.note || null
  }).eq("id_fornecedor", input.id);
  if (error) throw error;
  return { id: input.id };
}

export async function deleteSupplier(supplierId: number) {
  const { data, error } = await requireSupabase().rpc("inativar_fornecedor", { p_id_fornecedor: supplierId });
  if (error) throw error;
  if (data !== true) throw new Error("Fornecedor nao encontrado para exclusao.");
}

export async function createResource(input: NewResourceInput) {
  const client = requireSupabase();
  const id = await nextId("recursos", "id_recurso");
  const { error } = await client.from("recursos").insert({
    id_recurso: id,
    tipo_recurso: input.type,
    nome_recurso: input.name.trim(),
    id_categoria_recurso: input.categoryId ?? null,
    desc_categoria_rec: input.category ?? null,
    qtd_estoque: input.stock,
    custo_unitario: input.unitCost,
    tipo_medida: input.measure,
    data_validade: input.expiresAt || null,
    data_inclusao: new Date().toISOString()
  });
  if (error) throw error;
  return { id };
}

export async function updateResource(input: NewResourceInput & { id: number }) {
  const { error } = await requireSupabase().from("recursos").update({
    tipo_recurso: input.type,
    nome_recurso: input.name.trim(),
    id_categoria_recurso: input.categoryId ?? null,
    desc_categoria_rec: input.category ?? null,
    qtd_estoque: input.stock,
    custo_unitario: input.unitCost,
    tipo_medida: input.measure,
    data_validade: input.expiresAt || null
  }).eq("id_recurso", input.id);
  if (error) throw error;
  return { id: input.id };
}

export async function deleteResource(resourceId: number) {
  const { data, error } = await requireSupabase().rpc("inativar_recurso", { p_id_recurso: resourceId });
  if (error) throw error;
  if (data !== true) throw new Error("Recurso nao encontrado para exclusao.");
}

export async function createRecipe(input: NewRecipeInput) {
  const products = await getProducts();
  const resources = await getResources();
  const product = products.find((item) => item.id === input.productId);
  const resource = resources.find((item) => item.id === input.resourceId);
  const id = await nextId("receitas", "id_receita");
  const row = {
    id_receita: id,
    id_produto: input.productId,
    nome_produto: product?.name ?? null,
    id_recurso: input.resourceId,
    nome_recurso: resource?.name ?? null,
    qtd_ingrediente: input.quantity,
    tipo_medida: input.measure,
    ordem_preparo: input.preparationOrder ?? null
  };
  const { error } = await requireSupabase().from("receitas").insert(row);
  if (error && isMissingColumnError(error)) {
    const { ordem_preparo, ...legacyRow } = row;
    void ordem_preparo;
    const { error: legacyError } = await requireSupabase().from("receitas").insert(legacyRow);
    if (legacyError) throw legacyError;
    return { id };
  }
  if (error) throw error;
  return { id };
}

export async function updateRecipeItem(input: UpdateRecipeItemInput) {
  const row = {
    qtd_ingrediente: input.quantity,
    tipo_medida: input.measure,
    ordem_preparo: input.preparationOrder ?? null
  };
  const { error } = await requireSupabase()
    .from("receitas")
    .update(row)
    .eq("id_receita_item", Number(input.id));
  if (error && isMissingColumnError(error)) {
    const { ordem_preparo, ...legacyRow } = row;
    void ordem_preparo;
    const { error: legacyError } = await requireSupabase()
      .from("receitas")
      .update(legacyRow)
      .eq("id_receita_item", Number(input.id));
    if (legacyError) throw legacyError;
    return;
  }
  if (error) throw error;
}

export async function deleteRecipeItem(recipeItemId: string) {
  const { data, error } = await requireSupabase().rpc("excluir_item_receita", { p_id_receita_item: Number(recipeItemId) });
  if (error) throw error;
  if (data !== true) throw new Error("Ingrediente da receita nao encontrado para exclusao.");
}

export async function createProduction(input: NewProductionInput) {
  const client = requireSupabase();
  const products = await getProducts();
  const product = products.find((item) => item.id === input.productId);
  const id = await nextId("producoes", "id_producao");
  const { error } = await client.from("producoes").insert({
    id_producao: id,
    id_produto: input.productId,
    nome_produto: product?.name ?? null,
    qtd_produzida: input.quantity,
    data_producao: input.producedAt,
    data_validade: input.expiresAt || null,
    observacao: input.note || null
  });
  if (error) throw error;
  const { data: recipeRows, error: recipeError } = await client
    .from("receitas")
    .select("id_recurso,qtd_ingrediente")
    .eq("id_produto", input.productId);
  if (recipeError) throw recipeError;
  if (recipeRows?.length) {
    const resources = await getResources();
    const stockDeltas = new Map<number, number>();
    for (const row of recipeRows as Array<{ id_recurso: number | null; qtd_ingrediente: number | null }>) {
      if (!row.id_recurso) continue;
      stockDeltas.set(row.id_recurso, (stockDeltas.get(row.id_recurso) ?? 0) + Number(row.qtd_ingrediente ?? 0) * input.quantity);
    }
    for (const [resourceId, quantity] of stockDeltas) {
      const resource = resources.find((item) => item.id === resourceId);
      if (!resource) continue;
      const newStock = resource.stock - quantity;
      if (newStock < 0) {
        throw new Error(`Estoque insuficiente para ${resource.name}. Disponivel: ${resource.stock} ${resource.measure ?? ""}. Necessario: ${quantity}.`);
      }
      const { error: stockError } = await client.from("recursos").update({ qtd_estoque: newStock }).eq("id_recurso", resourceId);
      if (stockError) throw stockError;
    }
  }
  return { id };
}

export async function createPurchase(input: NewPurchaseInput) {
  const client = requireSupabase();
  const resources = await getResources();
  const suppliers = await getSuppliers();
  const resource = resources.find((item) => item.id === input.resourceId);
  const supplier = suppliers.find((item) => item.id === input.supplierId);
  const id = await nextId("compras", "id_compra");
  const { error } = await client.from("compras").insert({
    id_compra: id,
    id_recurso: input.resourceId,
    nome_recurso: resource?.name ?? null,
    id_fornecedor: input.supplierId,
    nome_fornecedor: supplier?.name ?? null,
    qtd_comprada: input.quantity,
    data_compra: input.purchasedAt,
    custo_total: input.totalCost,
    tipo_medida: input.measure,
    numero_nota: input.invoice || null
  });
  if (error) throw error;
  if (resource) {
    const newStock = resource.stock + input.quantity;
    const currentValue = resource.stock * resource.unitCost;
    const newUnitCost = newStock > 0 ? (currentValue + input.totalCost) / newStock : input.totalCost / Math.max(input.quantity, 1);
    const { error: stockError } = await client
      .from("recursos")
      .update({ qtd_estoque: newStock, custo_unitario: newUnitCost })
      .eq("id_recurso", input.resourceId);
    if (stockError) throw stockError;
  }
  return { id };
}

export async function createSale(input: NewSaleInput): Promise<{ id: number }> {
  if (!supabase) {
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    return { id: Math.floor(Math.random() * 100000) };
  }

  const client = requireSupabase();
  const products = await getProducts();
  const method = (await getPaymentMethods()).find((item) => item.id === input.paymentMethodId);
  const customer = input.customerId ? (await getCustomers()).find((item) => item.id === input.customerId) : undefined;
  const grossAmount = input.items.reduce((sum, item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return sum + (product?.price ?? 0) * item.quantity;
  }, 0);
  const fee = grossAmount * (method?.feeRate ?? 0);
  const finalAmount = grossAmount + input.deliveryFee + input.packageFee - input.discount - fee;
  const resources = await getResources();
  const stockDeltas = new Map<number, number>();
  for (const item of input.items) {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product?.resourceId) continue;
    stockDeltas.set(product.resourceId, (stockDeltas.get(product.resourceId) ?? 0) + item.quantity);
  }
  for (const [resourceId, quantity] of stockDeltas) {
    const resource = resources.find((candidate) => candidate.id === resourceId);
    if (!resource) continue;
    const newStock = resource.stock - quantity;
    if (newStock < 0) {
      throw new Error(`Estoque insuficiente para ${resource.name}. Disponivel: ${resource.stock} ${resource.measure ?? ""}. Necessario: ${quantity}.`);
    }
  }

  const { data: lastOrder, error: lastOrderError } = await client
    .from("pedidos")
    .select("id_pedido")
    .order("id_pedido", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastOrderError) throw lastOrderError;
  const nextOrderId = Number(lastOrder?.id_pedido ?? 0) + 1;

  const { data: order, error: orderError } = await client
    .from("pedidos")
    .insert({
      id_pedido: nextOrderId,
      data_pedido: new Date().toISOString(),
      id_cliente: input.customerId ?? null,
      nome_cliente: customer?.name ?? input.customerName ?? null,
      id_forma_pagamento: input.paymentMethodId,
      forma_pagamento: method?.name ?? null,
      status_pedido: input.status ?? "pendente",
      valor_total: grossAmount,
      taxa_cartao: fee,
      taxa_entrega: input.deliveryFee,
      taxa_embalagem: input.packageFee,
      desconto: input.discount,
      valor_final: finalAmount,
      canal_venda: input.channel ?? "whatsapp",
      status_atendimento: input.serviceStatus ?? "nao_iniciado",
      observacao: input.note ?? null
    })
    .select("id_pedido")
    .single();

  if (orderError) throw orderError;

  const rows = input.items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    const unitPrice = product?.price ?? 0;
    return {
      id_pedido: order.id_pedido,
      id_produto: item.productId,
      nome_produto: product?.name ?? null,
      quantidade: item.quantity,
      preco_unitario: unitPrice,
      preco_total: unitPrice * item.quantity,
      observacao: item.note || null
    };
  });

  const { error: itemsError } = await client.from("itens_pedido").insert(rows);
  if (itemsError) throw itemsError;
  for (const [resourceId, quantity] of stockDeltas) {
    const resource = resources.find((candidate) => candidate.id === resourceId);
    if (!resource) continue;
    const { error: stockError } = await client
      .from("recursos")
      .update({ qtd_estoque: resource.stock - quantity })
      .eq("id_recurso", resourceId);
    if (stockError) throw stockError;
  }
  return { id: order.id_pedido };
}
