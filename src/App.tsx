import { BarChart3, CalendarDays, ChefHat, ClipboardList, LayoutDashboard, ListTodo, Plus, Settings, ShoppingBag, Users, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DashboardPage } from "./pages/DashboardPage";
import { EventsPage } from "./pages/EventsPage";
import { KitchenPage } from "./pages/KitchenPage";
import { NewSalePage } from "./pages/NewSalePage";
import { OperationsPage } from "./pages/OperationsPage";
import { PlannerPage } from "./pages/PlannerPage";
import { PowerBiDashboardPage } from "./pages/PowerBiDashboardPage";
import { RegistrationsPage } from "./pages/RegistrationsPage";
import { SalesPage } from "./pages/SalesPage";
import { SelfServicePage } from "./pages/SelfServicePage";
import { SettingsPage } from "./pages/SettingsPage";
import { getActivities, getActivityResponsibles, getActivitySubtasks, getActivitySummary, getCategories, getCustomers, getDashboard, getMeasures, getPaymentMethods, getProducts, getRecipeItems, getRegions, getResources, getSales, getSuppliers } from "./lib/repository";
import { isSupabaseConfigured } from "./lib/supabase";
import type { Activity, ActivityResponsible, ActivitySubtask, ActivitySummary, Category, Customer, DashboardMetrics, Measure, PaymentMethod, Product, RecipeItem, Region, Resource, Sale, Supplier } from "./types";

type Page = "dashboard" | "bi-dashboard" | "new-sale" | "self-service" | "kitchen" | "events" | "planner" | "sales" | "registrations" | "operations" | "settings";

const navItems: Array<{ id: Page; label: string; icon: typeof BarChart3 }> = [
  { id: "dashboard", label: "Painel", icon: BarChart3 },
  { id: "bi-dashboard", label: "Dashboard BI", icon: LayoutDashboard },
  { id: "new-sale", label: "Nova venda", icon: Plus },
  { id: "self-service", label: "Autoatendimento", icon: ShoppingBag },
  { id: "kitchen", label: "Cozinha", icon: ChefHat },
  { id: "events", label: "Eventos", icon: CalendarDays },
  { id: "planner", label: "Atividades", icon: ListTodo },
  { id: "sales", label: "Pedidos", icon: ClipboardList },
  { id: "registrations", label: "Cadastros", icon: Users },
  { id: "operations", label: "Operações", icon: Wrench },
  { id: "settings", label: "Sistema", icon: Settings }
];

const pagesWithNewSaleShortcut = new Set<Page>(["dashboard", "sales"]);

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
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityResponsibles, setActivityResponsibles] = useState<ActivityResponsible[]>([]);
  const [activitySubtasks, setActivitySubtasks] = useState<ActivitySubtask[]>([]);
  const [activitySummary, setActivitySummary] = useState<ActivitySummary | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [dashboard, setDashboard] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshData() {
    setLoading(true);
    setError(null);
    try {
      const [loadedProducts, loadedCustomers, loadedPayments, loadedSales, loadedDashboard, loadedSuppliers, loadedResources, loadedRegions, loadedCategories, loadedMeasures, loadedRecipeItems, loadedActivities, loadedActivityResponsibles, loadedActivitySubtasks, loadedActivitySummary] = await Promise.all([
        getProducts(),
        getCustomers(),
        getPaymentMethods(),
        getSales(),
        getDashboard(),
        getSuppliers(),
        getResources(),
        getRegions(),
        getCategories(),
        getMeasures(),
        getRecipeItems(),
        getActivities(),
        getActivityResponsibles(),
        getActivitySubtasks(),
        getActivitySummary()
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
      setRecipeItems(loadedRecipeItems);
      setActivities(loadedActivities);
      setActivityResponsibles(loadedActivityResponsibles);
      setActivitySubtasks(loadedActivitySubtasks);
      setActivitySummary(loadedActivitySummary);
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
    if (activePage === "dashboard") return <DashboardPage activitySummary={activitySummary} customersCount={customers.length} dashboard={dashboard} loading={loading} productsCount={products.length} recipeItemsCount={recipeItems.length} resourcesCount={resources.length} />;
    if (activePage === "bi-dashboard") return <PowerBiDashboardPage />;
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
    if (activePage === "sales") return <SalesPage sales={sales} loading={loading} onChanged={refreshData} />;
    if (activePage === "self-service") return <SelfServicePage paymentMethods={paymentMethods} products={products} onSaved={refreshData} />;
    if (activePage === "kitchen") return <KitchenPage loading={loading} products={products} recipeItems={recipeItems} />;
    if (activePage === "events") return <EventsPage products={products} recipeItems={recipeItems} />;
    if (activePage === "planner") return <PlannerPage activities={activities} loading={loading} responsibles={activityResponsibles} subtasks={activitySubtasks} onChanged={refreshData} />;
    if (activePage === "registrations") return <RegistrationsPage categories={categories} customers={customers} measures={measures} products={products} recipeItems={recipeItems} regions={regions} resources={resources} suppliers={suppliers} onChanged={refreshData} />;
    if (activePage === "operations") return <OperationsPage measures={measures} products={products} resources={resources} suppliers={suppliers} onChanged={refreshData} />;
    return <SettingsPage supabaseReady={isSupabaseConfigured} onRefresh={refreshData} />;
  }, [activePage, activities, activityResponsibles, activitySubtasks, activitySummary, categories, customers, dashboard, loading, measures, paymentMethods, products, recipeItems, regions, resources, sales, suppliers]);

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
          {pagesWithNewSaleShortcut.has(activePage) ? (
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
