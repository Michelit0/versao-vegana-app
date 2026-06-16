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

export type SaleDeliveryType = "retirada" | "entrega";

export type SalePaymentStatus = "pago" | "pendente" | "pagar_na_retirada";

export type SaleKitchenItem = {
  productId: number | null;
  productName: string;
  quantity: number;
  note: string | null;
};

export type Sale = {
  id: number;
  orderedAt: string;
  customerId: number | null;
  customerName: string;
  customerPhone: string | null;
  deliveryType: SaleDeliveryType;
  paymentStatus: SalePaymentStatus;
  note: string | null;
  cancellationReason: string | null;
  status: OrderStatus;
  paymentMethod: string;
  grossAmount: number;
  finalAmount: number;
  items: SaleKitchenItem[];
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

export type ActivityStatus = "a_fazer" | "fazendo" | "concluido" | "impedido" | "aguardando_resposta";

export type ActivityPriority = "baixa" | "media" | "alta" | "urgente";

export type Activity = {
  id: number;
  ownerId?: number | null;
  title: string;
  description: string | null;
  status: ActivityStatus;
  priority: ActivityPriority;
  owner: string | null;
  assignedAt?: string | null;
  category: string | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  note: string | null;
  boardOrder: number;
  active: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ActivityResponsible = {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  active: boolean;
};

export type ActivitySubtaskStatus = "a_fazer" | "fazendo" | "concluida" | "impedida";

export type ActivitySubtask = {
  id: number;
  activityId: number;
  title: string;
  description: string | null;
  status: ActivitySubtaskStatus;
  priority: ActivityPriority;
  ownerId: number | null;
  owner: string | null;
  dueDate: string | null;
  assignedAt: string | null;
  completedAt: string | null;
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type ActivitySummary = {
  open: number;
  overdue: number;
  dueToday: number;
  dueSoon: number;
  highPriority: number;
  completedThisWeek: number;
};

export type UserRole = "admin" | "socia" | "operacao" | "cozinha" | "consulta" | "autoatendimento";

export type UserProfile = {
  id: string;
  name: string;
  role: UserRole;
  active: boolean;
};

export type AllowedUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
