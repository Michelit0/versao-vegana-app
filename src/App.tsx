import { BarChart3, CalendarDays, ChefHat, ClipboardList, LayoutDashboard, ListTodo, LogOut, Plus, Settings, ShoppingBag, Users, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DashboardPage } from "./pages/DashboardPage";
import { EventsPage } from "./pages/EventsPage";
import { KitchenPage } from "./pages/KitchenPage";
import { LoginPage } from "./pages/LoginPage";
import { NewSalePage } from "./pages/NewSalePage";
import { OperationsPage } from "./pages/OperationsPage";
import { PlannerPage } from "./pages/PlannerPage";
import { PowerBiDashboardPage } from "./pages/PowerBiDashboardPage";
import { RegistrationsPage } from "./pages/RegistrationsPage";
import { SalesPage } from "./pages/SalesPage";
import { SelfServicePage } from "./pages/SelfServicePage";
import { SettingsPage } from "./pages/SettingsPage";
import { getActivities, getActivityResponsibles, getActivitySubtasks, getActivitySummary, getAllowedUsers, getCategories, getCurrentProfile, getCustomers, getDashboard, getMeasures, getPaymentMethods, getProducts, getRecipeItems, getRegions, getResources, getSales, getSuppliers } from "./lib/repository";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import type { Activity, ActivityResponsible, ActivitySubtask, ActivitySummary, AllowedUser, Category, Customer, DashboardMetrics, Measure, PaymentMethod, Product, RecipeItem, Region, Resource, Sale, Supplier, UserProfile, UserRole } from "./types";

type Page = "dashboard" | "bi-dashboard" | "new-sale" | "self-service" | "kitchen" | "events" | "planner" | "sales" | "registrations" | "operations" | "settings";

const navItems: Array<{ id: Page; label: string; icon: typeof BarChart3; roles: UserRole[] }> = [
  { id: "dashboard", label: "Painel", icon: BarChart3, roles: ["admin", "operacao", "cozinha", "consulta"] },
  { id: "bi-dashboard", label: "Dashboard BI", icon: LayoutDashboard, roles: ["admin", "operacao", "consulta"] },
  { id: "new-sale", label: "Nova venda", icon: Plus, roles: ["admin", "operacao"] },
  { id: "self-service", label: "Autoatendimento", icon: ShoppingBag, roles: ["admin", "operacao", "autoatendimento"] },
  { id: "kitchen", label: "Cozinha", icon: ChefHat, roles: ["admin", "operacao", "cozinha"] },
  { id: "events", label: "Eventos", icon: CalendarDays, roles: ["admin", "operacao", "cozinha"] },
  { id: "planner", label: "Atividades", icon: ListTodo, roles: ["admin", "operacao"] },
  { id: "sales", label: "Pedidos", icon: ClipboardList, roles: ["admin", "operacao", "cozinha"] },
  { id: "registrations", label: "Cadastros", icon: Users, roles: ["admin", "operacao"] },
  { id: "operations", label: "Operações", icon: Wrench, roles: ["admin", "operacao"] },
  { id: "settings", label: "Sistema", icon: Settings, roles: ["admin"] }
];

const pagesWithNewSaleShortcut = new Set<Page>(["dashboard", "sales"]);

export function App() {
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(() => window.location.hash.includes("type=recovery"));
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
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

  async function refreshAuthProfile() {
    const current = await getCurrentProfile();
    setProfile(current?.active ? current : null);
    setAuthChecked(true);
    return current;
  }

  async function refreshAllowedUsers(currentProfile = profile) {
    if (!currentProfile || currentProfile.role !== "admin") return;
    setAllowedUsers(await getAllowedUsers());
  }

  async function refreshData() {
    if (!profile) return;
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
      await refreshAllowedUsers(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (window.location.pathname === "/") {
      window.history.replaceState(null, "", "/sistema");
    }
  }, []);

  useEffect(() => {
    void refreshAuthProfile();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      void refreshAuthProfile();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (profile) void refreshData();
  }, [profile?.id]);

  const availableNavItems = useMemo(() => {
    if (!profile) return [];
    return navItems.filter((item) => item.roles.includes(profile.role));
  }, [profile]);

  useEffect(() => {
    if (!profile || availableNavItems.some((item) => item.id === activePage)) return;
    setActivePage(availableNavItems[0]?.id ?? "dashboard");
  }, [activePage, availableNavItems, profile]);

  async function handleLogout() {
    await supabase?.auth.signOut();
    setProfile(null);
    setAllowedUsers([]);
  }

  const page = useMemo(() => {
    if (!profile) return null;
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
    return <SettingsPage allowedUsers={allowedUsers} currentProfile={profile} supabaseReady={isSupabaseConfigured} onChanged={async () => { await refreshAllowedUsers(profile); }} onRefresh={refreshData} />;
  }, [activePage, activities, activityResponsibles, activitySubtasks, activitySummary, allowedUsers, categories, customers, dashboard, loading, measures, paymentMethods, products, profile, recipeItems, regions, resources, sales, suppliers]);

  if (!authChecked) {
    return <main className="login-shell"><section className="login-card"><h1>Carregando sistema...</h1></section></main>;
  }

  if (!profile || passwordRecovery) {
    return <LoginPage onAuthenticated={async () => { setPasswordRecovery(false); const current = await refreshAuthProfile(); if (current?.active) await refreshData(); }} />;
  }

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
          {availableNavItems.map((item) => {
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
        <div className="sidebar-footer sidebar-user-footer">
          <span>{profile.name}</span>
          <small>{profile.role}</small>
          <button type="button" onClick={handleLogout}>
            <LogOut size={15} />
            Sair
          </button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operação interna</p>
            <h1>{availableNavItems.find((item) => item.id === activePage)?.label}</h1>
          </div>
          {pagesWithNewSaleShortcut.has(activePage) && availableNavItems.some((item) => item.id === "new-sale") ? (
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
