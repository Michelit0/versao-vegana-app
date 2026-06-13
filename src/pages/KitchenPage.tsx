import { Check, ClipboardCheck, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "../components/SearchableSelect";
import type { Product, RecipeItem } from "../types";

type KitchenPageProps = {
  loading: boolean;
  products: Product[];
  recipeItems: RecipeItem[];
};

type Stage = {
  label: string;
  rank: number;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatQuantity(value: number | null, measure: string | null) {
  if (value === null || Number.isNaN(value)) return measure ?? "";
  const formatted = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(value);
  return `${formatted}${measure ? ` ${measure}` : ""}`;
}

function classifyIngredient(name: string): Stage {
  const ingredient = normalize(name);

  if (/(agua|caldo|leite|molho|extrato|vinagre)/.test(ingredient)) return { label: "Liquidos e base", rank: 10 };
  if (/(arroz|feijao|lentilha|grao|quinoa|macarrao|massa|farinha|aveia|proteina|soja|tofu|seitan|batata|mandioca|inhame|banana)/.test(ingredient)) {
    return { label: "Base principal", rank: 20 };
  }
  if (/(cenoura|tomate|abobora|beterraba|milho|ervilha|brocolis|couve|repolho|pimentao|abobrinha|berinjela|palmito|cogumelo)/.test(ingredient)) {
    return { label: "Legumes e recheio", rank: 30 };
  }
  if (/(oleo|azeite|cebola|alho|alho poro|gengibre|castanha|amendoim|gergelim)/.test(ingredient)) return { label: "Aromaticos", rank: 40 };
  if (/(sal|pimenta|paprica|cominho|curry|acafrao|oregano|louro|noz|canela|tempero|ervas)/.test(ingredient)) return { label: "Temperos e sal", rank: 50 };
  if (/(limao|salsa|coentro|cebolinha|cheiro verde|hortela|manjericao|folha|creme|coco)/.test(ingredient)) return { label: "Finalizacao", rank: 60 };

  return { label: "Conferencia final", rank: 70 };
}

export function KitchenPage({ loading, products, recipeItems }: KitchenPageProps) {
  const recipes = useMemo(() => {
    const groups = new Map<number, { value: number; label: string; description: string }>();

    for (const item of recipeItems) {
      if (!item.productId) continue;
      const current = groups.get(item.productId);
      const product = products.find((candidate) => candidate.id === item.productId);
      const count = current ? Number.parseInt(current.description, 10) + 1 : 1;
      groups.set(item.productId, {
        value: item.productId,
        label: item.productName,
        description: `${count} ingredientes | rende ${product?.yieldServings ?? 20} pessoas`
      });
    }

    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [products, recipeItems]);

  const [selectedRecipeId, setSelectedRecipeId] = useState(0);
  const storageKey = selectedRecipeId ? `vv-cozinha-checklist:${selectedRecipeId}` : "vv-cozinha-checklist";
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const selectedProduct = products.find((product) => product.id === selectedRecipeId);
  const baseYield = selectedProduct?.yieldServings ?? 20;
  const [targetServings, setTargetServings] = useState(baseYield);

  useEffect(() => {
    if (!selectedRecipeId && recipes.length) {
      setSelectedRecipeId(recipes[0].value);
    }
  }, [recipes, selectedRecipeId]);

  useEffect(() => {
    if (!selectedRecipeId) {
      setCheckedItems([]);
      return;
    }

    const saved = window.localStorage.getItem(storageKey);
    setCheckedItems(saved ? JSON.parse(saved) : []);
  }, [selectedRecipeId, storageKey]);

  useEffect(() => {
    setTargetServings(baseYield);
  }, [baseYield, selectedRecipeId]);

  const selectedItems = useMemo(() => {
    return recipeItems
      .filter((item) => item.productId === selectedRecipeId)
      .map((item, index) => ({ ...item, stage: classifyIngredient(item.resourceName), originalIndex: index }))
      .sort((a, b) => {
        const orderA = a.preparationOrder ?? Number.POSITIVE_INFINITY;
        const orderB = b.preparationOrder ?? Number.POSITIVE_INFINITY;
        return orderA - orderB || a.stage.rank - b.stage.rank || a.originalIndex - b.originalIndex || a.resourceName.localeCompare(b.resourceName, "pt-BR");
      });
  }, [recipeItems, selectedRecipeId]);

  const selectedRecipe = recipes.find((recipe) => recipe.value === selectedRecipeId);
  const completedCount = selectedItems.filter((item) => checkedItems.includes(item.id)).length;
  const progress = selectedItems.length ? Math.round((completedCount / selectedItems.length) * 100) : 0;
  const factor = baseYield > 0 ? targetServings / baseYield : 1;

  function persist(next: string[]) {
    setCheckedItems(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function toggleItem(itemId: string) {
    const next = checkedItems.includes(itemId) ? checkedItems.filter((id) => id !== itemId) : [...checkedItems, itemId];
    persist(next);
  }

  function resetChecklist() {
    persist([]);
  }

  if (loading) {
    return (
      <section className="empty-state">
        <strong>Carregando receitas</strong>
        <span>Buscando os ingredientes cadastrados no Supabase.</span>
      </section>
    );
  }

  if (!recipes.length) {
    return (
      <section className="empty-state">
        <ClipboardCheck size={28} />
        <strong>Nenhuma receita cadastrada</strong>
        <span>Cadastre os ingredientes em Cadastros &gt; Receita para usar o apoio de cozinha.</span>
      </section>
    );
  }

  return (
    <section className="content-stack">
      <div className="panel kitchen-control-panel">
        <div className="kitchen-control-grid">
          <SearchableSelect label="Receita para cozinhar" value={selectedRecipeId} options={recipes} placeholder="Digite o nome da receita" onChange={setSelectedRecipeId} />
          <label>
            Preparar para quantas pessoas?
            <input type="number" min="1" step="1" value={targetServings} onChange={(event) => setTargetServings(Math.max(1, Number(event.target.value)))} />
          </label>
          <div className="kitchen-progress-card">
            <span>Progresso da receita</span>
            <strong>{progress}%</strong>
            <div className="progress-track" aria-label={`Progresso ${progress}%`}>
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <button className="secondary-action kitchen-reset" type="button" onClick={resetChecklist}>
            <RotateCcw size={17} />
            Limpar checks
          </button>
        </div>
      </div>

      <div className="panel kitchen-recipe-panel">
        <div className="panel-heading">
          <div>
            <h2>{selectedRecipe?.label ?? "Receita"}</h2>
            <span className="muted-count">
              Receita base rende {baseYield} pessoas. Calculando para {targetServings} pessoas.
            </span>
            <span className="muted-count">{completedCount} de {selectedItems.length} ingredientes conferidos</span>
          </div>
          <span className="kitchen-mode-pill">Apoio de preparo</span>
        </div>

        <div className="recipe-checklist">
          {selectedItems.map((item, index) => {
            const checked = checkedItems.includes(item.id);
            return (
              <button className={checked ? "recipe-step done" : "recipe-step"} key={item.id} type="button" onClick={() => toggleItem(item.id)}>
                <span className="step-number">{index + 1}</span>
                <span className="step-check" aria-hidden="true">{checked ? <Check size={20} /> : null}</span>
                <span className="step-copy">
                  <strong>{item.resourceName}</strong>
                  <small>{formatQuantity((item.quantity ?? 0) * factor, item.measure) || "Quantidade nao informada"}</small>
                  {factor !== 1 ? <small>Base: {formatQuantity(item.quantity, item.measure)}</small> : null}
                </span>
                <span className="stage-pill">{item.stage.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
