export type OrderStatus = "rascunho" | "pendente" | "finalizado" | "cancelado";

export type Product = {
  id: number;
  name: string;
  description: string | null;
  category: string;
  price: number;
  available: boolean;
  weight: number | null;
  measure: string | null;
  resourceId?: number | null;
  imageUrl?: string | null;
  tags?: string[];
  featuredSelfService?: boolean;
  yieldServings?: number;
};

export type Customer = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  regionId?: number | null;
  region: string | null;
  dietaryPreferences: string | null;
};

export type PaymentMethod = {
  id: number;
  name: string;
  brand: string | null;
  feeRate: number;
};

export type SaleItemDraft = {
  productId: number;
  quantity: number;
  note: string;
};

export type Sale = {
  id: number;
  orderedAt: string;
  customerName: string;
  status: OrderStatus;
  paymentMethod: string;
  grossAmount: number;
  finalAmount: number;
};

export type DashboardMetrics = {
  revenueToday: number;
  revenueMonth: number;
  openOrders: number;
  averageTicket: number;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  recentSales: Sale[];
};

export type Supplier = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  note: string | null;
};

export type Resource = {
  id: number;
  type: string | null;
  name: string;
  categoryId: number | null;
  category: string | null;
  stock: number;
  unitCost: number;
  measure: string | null;
  expiresAt: string | null;
};

export type PurchaseQuote = {
  resourceId: number;
  supplierId: number;
  supplierName: string;
  lastPurchaseDate: string | null;
  lastUnitCost: number;
  averageUnitCost: number;
  minimumUnitCost: number;
  maximumUnitCost: number;
  purchaseCount: number;
  lastQuantity: number;
  lastMeasure: string | null;
};

export type Region = {
  id: number;
  name: string;
  fee: number;
};

export type Category = {
  id: number;
  name: string;
  type: string;
};

export type Measure = {
  name: string;
};

export type RecipeItem = {
  id: string;
  recipeId: number | null;
  productId: number | null;
  productName: string;
  resourceId: number | null;
  resourceName: string;
  quantity: number | null;
  measure: string | null;
  preparationOrder: number | null;
};
