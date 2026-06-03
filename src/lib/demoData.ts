import type { Customer, DashboardMetrics, PaymentMethod, Product, Sale } from "../types";

export const demoProducts: Product[] = [
  { id: 1, name: "Brasileirinho", category: "Pratos Principais", price: 28.5, available: true, weight: 500, measure: "grama" },
  { id: 2, name: "Macarrao a Bolonhesa de Lentilha", category: "Pratos Principais", price: 30, available: true, weight: 500, measure: "grama" },
  { id: 3, name: "Moqueca de Banana da Terra", category: "Pratos Principais", price: 30, available: true, weight: 500, measure: "grama" },
  { id: 4, name: "Feijoada Veg", category: "Pratos Principais", price: 34, available: true, weight: 500, measure: "grama" },
  { id: 6, name: "Coca-Cola sem acucar 310ml", category: "Bebidas", price: 5, available: true, weight: 310, measure: "ml" }
];

export const demoCustomers: Customer[] = [
  { id: 1, name: "Teresa Cristina", email: "teresacnsm@gmail.com", phone: "(61) 98385-2016", address: "Quadra 13", region: "Quadra 13, 14 ou 15", dietaryPreferences: "Sem leite" },
  { id: 2, name: "Michel Pinheiro", email: "michaelpinsi35@gmail.com", phone: "(61) 98293-2443", address: "Alto da Boa Vista", region: "Alto da Boa Vista", dietaryPreferences: "Vegetariano estrito" },
  { id: 4, name: "Amanda Haar", email: null, phone: "(61) 98471-0090", address: "Quadra 13", region: "Quadra 13, 14 ou 15", dietaryPreferences: null }
];

export const demoPaymentMethods: PaymentMethod[] = [
  { id: 10, name: "Pix", brand: null, feeRate: 0 },
  { id: 3, name: "Cartao Credito", brand: "Visa ou Master", feeRate: 0.0315 },
  { id: 1, name: "Cartao Debito", brand: "Visa ou Master", feeRate: 0.0137 }
];

export const demoSales: Sale[] = [
  { id: 1, orderedAt: new Date().toISOString(), customerName: "Teresa Cristina", status: "finalizado", paymentMethod: "Pix", grossAmount: 40.8, finalAmount: 40.8 },
  { id: 2, orderedAt: new Date().toISOString(), customerName: "Michel Pinheiro", status: "finalizado", paymentMethod: "Pix", grossAmount: 36.5, finalAmount: 36.5 },
  { id: 3, orderedAt: new Date().toISOString(), customerName: "Amanda Haar", status: "pendente", paymentMethod: "Cartao Credito", grossAmount: 28.5, finalAmount: 27.6 }
];

export const demoDashboard: DashboardMetrics = {
  revenueToday: 104.9,
  revenueMonth: 3150.4,
  openOrders: 1,
  averageTicket: 34.96,
  topProducts: [
    { name: "Moqueca de Banana da Terra", quantity: 18, revenue: 540 },
    { name: "Brasileirinho", quantity: 15, revenue: 427.5 },
    { name: "Feijoada Veg", quantity: 10, revenue: 340 }
  ],
  recentSales: demoSales
};
