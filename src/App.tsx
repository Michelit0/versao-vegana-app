import { BarChart3, ClipboardList, Package, Plus, Settings, ShoppingBag, Users, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CustomersPage } from "./pages/CustomersPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NewSalePage } from "./pages/NewSalePage";
import { OperationsPage } from "./pages/OperationsPage";
import { ProductsPage } from "./pages/ProductsPage";
import { RegistrationsPage } from "./pages/RegistrationsPage";
import { SalesPage } from "./pages/SalesPage";
import { SelfServicePage } from "./pages/SelfServicePage";
import { SettingsPage } from "./pages/SettingsPage";
import { getCategories, getCustomers, getDashboard, getMeasures, getPaymentMethods, getProducts, getRegions, getResources, getSales, getSuppliers } from "./lib/repository";
import { isSupabaseConfigured } from "./lib/supabase";
import type { Category, Customer, DashboardMetrics, Measure, PaymentMethod, Product, Region, Resource, Sale, Supplier } from "./types";

type Page = "dashboard" | "new-sale" | "self-service" | "sales" | "registrations" | "operations" | "customers" | "products" | "settings";

const navItems: Array<{ id: Page; label: string; icon: typeof BarChart3 }> = [
  { id: "dashboard", label: "Painel", icon: BarChart3 },
  { id: "new-sale", label: "Nova venda", icon: Plus },
  { id: "self-service", label: "Autoatendimento", icon: ShoppingBag },
  { id: "sales", label: "Pedidos", icon: ClipboardList },
  { id: "registrations", label: "Cadastros", icon: Users },
  { id: "operations", label: "Operações", icon: Wrench },
  { id: "customers", label: "Clientes", icon: Users },
  { id: "products", label: "Produtos", icon: Package },
  { id: "settings", label: "Sistema", icon: Settings }
];

export function App() {
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [dashboard, setDashboard] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshData() {
    setLoading(true);
    setError(null);
    try {
      const [loadedProducts, loadedCustomers, loadedPayments, loadedSales, loadedDashboard, loadedSuppliers, loadedResources, loadedRegions, loadedCategories, loadedMeasures] = await Promise.all([
        getProducts(),
        getCustomers(),
        getPaymentMethods(),
        getSales(),
        getDashboard(),
        getSuppliers(),
        getResources(),
        getRegions(),
        getCategories(),
        getMeasures()
      ]);
      setProducts(loadedProducts);
      setCustomers(loadedCustomers);
      setPaymentMethods(loadedPayments);
      setSales(loadedSales);
      setDashboard(loadedDashboard);
      setSuppliers(loadedSuppliers);
      setResources(loadedResources);
      setRegions(loadedRegions);
      setCategories(loadedCategories);
      setMeasures(loadedMeasures);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshData();
  }, []);

  const page = useMemo(() => {
    if (activePage === "dashboard") return <DashboardPage dashboard={dashboard} loading={loading} />;
    if (activePage === "new-sale") {
      return (
        <NewSalePage
          customers={customers}
          products={products}
          paymentMethods={paymentMethods}
          regions={regions}
          onCustomerCreated={refreshData}
          onSaved={() => {
            setActivePage("sales");
            void refreshData();
          }}
        />
      );
    }
    if (activePage === "sales") return <SalesPage sales={sales} loading={loading} />;
    if (activePage === "self-service") return <SelfServicePage paymentMethods={paymentMethods} products={products} onSaved={refreshData} />;
    if (activePage === "registrations") return <RegistrationsPage categories={categories} customers={customers} measures={measures} products={products} regions={regions} resources={resources} onChanged={refreshData} />;
    if (activePage === "operations") return <OperationsPage measures={measures} products={products} resources={resources} suppliers={suppliers} onChanged={refreshData} />;
    if (activePage === "customers") return <CustomersPage customers={customers} loading={loading} />;
    if (activePage === "products") return <ProductsPage products={products} loading={loading} onChanged={refreshData} />;
    return <SettingsPage supabaseReady={isSupabaseConfigured} onRefresh={refreshData} />;
  }, [activePage, categories, customers, dashboard, loading, measures, paymentMethods, products, regions, resources, sales, suppliers]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src="/vv.png" alt="Versão Vegana" />
          <div>
            <strong>Versão Vegana</strong>
            <span>Vendas e produção</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Menu principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activePage === item.id ? "nav-item active" : "nav-item"}
                key={item.id}
                onClick={() => setActivePage(item.id)}
                type="button"
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <span className={isSupabaseConfigured ? "status-dot online" : "status-dot demo"} />
          {isSupabaseConfigured ? "Supabase conectado" : "Modo demo local"}
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operacao interna</p>
            <h1>{navItems.find((item) => item.id === activePage)?.label}</h1>
          </div>
          {activePage !== "new-sale" ? (
            <button className="primary-action" type="button" onClick={() => setActivePage("new-sale")}>
              <Plus size={18} />
              Nova venda
            </button>
          ) : null}
        </header>
        {error ? <div className="alert">{error}</div> : null}
        {page}
      </main>
    </div>
  );
}
