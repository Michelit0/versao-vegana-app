import { AlertTriangle, ArrowLeft, ArrowRight, CalendarClock, Copy, Edit3, Plus, Save, Trash2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { createActivity, deleteActivity, updateActivity, updateActivityStatus } from "../lib/repository";
import type { Activity, ActivityPriority, ActivityStatus } from "../types";

type PlannerPageProps = {
  activities: Activity[];
  loading: boolean;
  onChanged: () => Promise<void>;
};

type ActivityDraft = {
  id?: number;
  title: string;
  description: string;
  status: ActivityStatus;
  priority: ActivityPriority;
  owner: string;
  category: string;
  startDate: string;
  dueDate: string;
  note: string;
  boardOrder: number;
};

const columns: Array<{ status: ActivityStatus; label: string; description: string }> = [
  { status: "backlog", label: "Backlog", description: "Ideias e demandas ainda nao priorizadas" },
  { status: "a_fazer", label: "A fazer", description: "Entrou na fila da operacao" },
  { status: "em_andamento", label: "Fazendo", description: "Tem alguem trabalhando" },
  { status: "homologacao", label: "Conferir", description: "Precisa validar antes de encerrar" },
  { status: "producao", label: "Pronto para usar", description: "Ja pode entrar na rotina" },
  { status: "finalizado", label: "Finalizado", description: "Resolvido e registrado" }
];

const priorities: Array<{ value: ActivityPriority; label: string }> = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" }
];

const categories = ["Cozinha", "Compras", "Eventos", "Vendas", "Financeiro", "Sistema", "Cliente", "Producao"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseLocalDate(value: string | null) {
  if (!value) return "Sem prazo";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(year, month - 1, day));
}

function dueState(activity: Activity) {
  if (!activity.dueDate || activity.status === "finalizado") return "normal";
  const today = todayIso();
  if (activity.dueDate < today) return "overdue";
  if (activity.dueDate === today) return "today";
  const date = new Date(`${activity.dueDate}T00:00:00`);
  const now = new Date(`${today}T00:00:00`);
  const days = Math.round((date.getTime() - now.getTime()) / 86400000);
  return days <= 2 ? "soon" : "normal";
}

function blankDraft(status: ActivityStatus = "a_fazer"): ActivityDraft {
  return {
    title: "",
    description: "",
    status,
    priority: "media",
    owner: "",
    category: "Cozinha",
    startDate: todayIso(),
    dueDate: "",
    note: "",
    boardOrder: 0
  };
}

function toDraft(activity: Activity, keepId: boolean): ActivityDraft {
  return {
    id: keepId ? activity.id : undefined,
    title: activity.title,
    description: activity.description ?? "",
    status: activity.status,
    priority: activity.priority,
    owner: activity.owner ?? "",
    category: activity.category ?? "Cozinha",
    startDate: activity.startDate ?? "",
    dueDate: activity.dueDate ?? "",
    note: activity.note ?? "",
    boardOrder: activity.boardOrder
  };
}

export function PlannerPage({ activities, loading, onChanged }: PlannerPageProps) {
  const [draft, setDraft] = useState<ActivityDraft>(blankDraft);
  const [mode, setMode] = useState<"novo" | "editar" | "duplicar">("novo");
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const grouped = useMemo(() => {
    return columns.map((column) => ({
      ...column,
      activities: activities
        .filter((activity) => activity.status === column.status)
        .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority) || (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31") || a.boardOrder - b.boardOrder)
    }));
  }, [activities]);

  const alerts = useMemo(() => {
    const overdue = activities.filter((activity) => dueState(activity) === "overdue").length;
    const today = activities.filter((activity) => dueState(activity) === "today").length;
    const urgent = activities.filter((activity) => activity.status !== "finalizado" && activity.priority === "urgente").length;
    return { overdue, today, urgent };
  }, [activities]);

  function openNew(status: ActivityStatus = "a_fazer") {
    setMode("novo");
    setDraft(blankDraft(status));
    setMessage(null);
    setModalOpen(true);
  }

  function openEdit(activity: Activity) {
    setMode("editar");
    setDraft(toDraft(activity, true));
    setMessage(null);
    setModalOpen(true);
  }

  function openDuplicate(activity: Activity) {
    setMode("duplicar");
    setDraft({ ...toDraft(activity, false), title: `${activity.title} - copia` });
    setMessage("Atividade duplicada em edicao. Ajuste os dados antes de salvar.");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setMessage(null);
  }

  async function saveActivity() {
    setMessage(null);
    if (!draft.title.trim()) {
      setMessage("Preencha o titulo da atividade.");
      return;
    }
    setSaving(true);
    try {
      const input = {
        title: draft.title,
        description: draft.description,
        status: draft.status,
        priority: draft.priority,
        owner: draft.owner,
        category: draft.category,
        startDate: draft.startDate,
        dueDate: draft.dueDate,
        note: draft.note,
        boardOrder: draft.boardOrder,
        createdBy: draft.owner || "Versao Vegana"
      };
      if (mode === "editar" && draft.id) {
        await updateActivity({ ...input, id: draft.id });
      } else {
        await createActivity(input);
      }
      await onChanged();
      closeModal();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nao foi possivel salvar a atividade.");
    } finally {
      setSaving(false);
    }
  }

  async function moveActivity(activity: Activity, status: ActivityStatus) {
    if (activity.status === status) return;
    setSaving(true);
    try {
      await updateActivityStatus(activity.id, status, activity.boardOrder);
      await onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nao foi possivel mover a atividade.");
    } finally {
      setSaving(false);
      setDraggingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteActivity(deleteTarget.id);
      await onChanged();
      setDeleteTarget(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nao foi possivel excluir a atividade.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="panel"><h2>Carregando planner</h2><span className="muted-count">Buscando atividades da equipe.</span></section>;
  }

  return (
    <section className="content-stack">
      <section className="panel planner-summary-panel">
        <div className="panel-heading">
          <div>
            <h2>Planner operacional</h2>
            <span className="muted-count">Organize demandas da cozinha, compras, eventos e sistema em um unico quadro.</span>
          </div>
          <button className="primary-action" type="button" onClick={() => openNew()}><Plus size={18} />Nova atividade</button>
        </div>
        <div className="ops-summary-grid">
          <div><strong>{activities.filter((item) => item.status !== "finalizado").length}</strong><span>atividades abertas</span></div>
          <div><strong>{alerts.overdue}</strong><span>atrasadas</span></div>
          <div><strong>{alerts.today}</strong><span>vencem hoje</span></div>
          <div><strong>{alerts.urgent}</strong><span>urgentes</span></div>
        </div>
      </section>

      {message ? <div className="alert inline-alert">{message}</div> : null}

      <section className="planner-board" aria-label="Quadro de atividades">
        {grouped.map((column) => (
          <div
            className="planner-column"
            key={column.status}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              const activity = activities.find((item) => item.id === draggingId);
              if (activity) void moveActivity(activity, column.status);
            }}
          >
            <div className="planner-column-heading">
              <div>
                <strong>{column.label}</strong>
                <span>{column.description}</span>
              </div>
              <button className="icon-action" type="button" aria-label={`Nova atividade em ${column.label}`} onClick={() => openNew(column.status)}><Plus size={17} /></button>
            </div>
            <div className="planner-card-list">
              {column.activities.length ? column.activities.map((activity) => (
                <ActivityCard
                  activity={activity}
                  disabled={saving}
                  key={activity.id}
                  onDelete={() => setDeleteTarget(activity)}
                  onDuplicate={() => openDuplicate(activity)}
                  onEdit={() => openEdit(activity)}
                  onMove={moveActivity}
                  onDragStart={() => setDraggingId(activity.id)}
                />
              )) : <span className="planner-empty">Sem atividades aqui.</span>}
            </div>
          </div>
        ))}
      </section>

      {modalOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Cadastro de atividade">
          <section className="modal-card management-modal-card">
            <div className="panel-heading">
              <div>
                <h2>{mode === "editar" ? "Editar atividade" : mode === "duplicar" ? "Duplicar atividade" : "Nova atividade"}</h2>
                <span className="muted-count">Preencha somente o essencial para a equipe conseguir executar.</span>
              </div>
              <button className="secondary-action" type="button" onClick={closeModal}><XCircle size={17} />Descartar alteracoes</button>
            </div>
            {message ? <div className="alert inline-alert">{message}</div> : null}
            <div className="form-grid management-form">
              <label>Titulo<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ex.: Comprar tomate para evento" /></label>
              <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ActivityStatus })}>{columns.map((column) => <option key={column.status} value={column.status}>{column.label}</option>)}</select></label>
              <label>Prioridade<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as ActivityPriority })}>{priorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}</select></label>
              <label>Responsavel<input value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })} placeholder="Nome ou equipe" /></label>
              <label>Categoria<input list="activity-categories" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></label>
              <datalist id="activity-categories">{categories.map((item) => <option key={item} value={item} />)}</datalist>
              <label>Data inicio<input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></label>
              <label>Prazo<input type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></label>
              <label className="form-wide">Descricao<textarea rows={4} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="O que precisa ser feito?" /></label>
              <label className="form-wide">Observacao<textarea rows={3} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Detalhes, combinados ou impedimentos" /></label>
            </div>
            <button className="primary-action form-action" disabled={saving} onClick={saveActivity} type="button"><Save size={18} />{saving ? "Salvando..." : "Salvar atividade"}</button>
          </section>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Excluir atividade">
          <section className="modal-card">
            <div className="panel-heading">
              <div>
                <h2>Excluir atividade?</h2>
                <span className="muted-count">Ela sera inativada, preservando historico para auditoria.</span>
              </div>
            </div>
            <div className="delete-customer-summary">
              <strong>{deleteTarget.title}</strong>
              <span>{deleteTarget.description || "Sem descricao"}</span>
              <span>Prazo: {parseLocalDate(deleteTarget.dueDate)}</span>
            </div>
            <div className="modal-actions">
              <button className="secondary-action" type="button" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="primary-action danger-primary-action" disabled={saving} type="button" onClick={confirmDelete}><Trash2 size={17} />Confirmar exclusao</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function ActivityCard({ activity, disabled, onDelete, onDragStart, onDuplicate, onEdit, onMove }: { activity: Activity; disabled: boolean; onDelete: () => void; onDragStart: () => void; onDuplicate: () => void; onEdit: () => void; onMove: (activity: Activity, status: ActivityStatus) => Promise<void> }) {
  const currentIndex = columns.findIndex((column) => column.status === activity.status);
  const state = dueState(activity);
  const previous = columns[currentIndex - 1]?.status;
  const next = columns[currentIndex + 1]?.status;

  return (
    <article className={`planner-card priority-${activity.priority} due-${state}`} draggable onDragStart={onDragStart}>
      <div className="planner-card-topline">
        <span className={`priority-chip ${activity.priority}`}>{priorityLabel(activity.priority)}</span>
        {state !== "normal" ? <span className={`due-chip ${state}`}><AlertTriangle size={13} />{state === "overdue" ? "Atrasada" : state === "today" ? "Hoje" : "Perto"}</span> : null}
      </div>
      <strong>{activity.title}</strong>
      {activity.description ? <p>{activity.description}</p> : null}
      <div className="planner-meta">
        <span><CalendarClock size={14} />{parseLocalDate(activity.dueDate)}</span>
        {activity.owner ? <span>{activity.owner}</span> : null}
        {activity.category ? <span>{activity.category}</span> : null}
      </div>
      <div className="planner-card-actions">
        <button className="icon-action" disabled={!previous || disabled} type="button" aria-label="Voltar status" onClick={() => previous && void onMove(activity, previous)}><ArrowLeft size={15} /></button>
        <button className="secondary-action compact-action" type="button" onClick={onEdit}><Edit3 size={15} />Editar</button>
        <button className="secondary-action compact-action" type="button" onClick={onDuplicate}><Copy size={15} />Duplicar</button>
        <button className="icon-action" disabled={!next || disabled} type="button" aria-label="Avancar status" onClick={() => next && void onMove(activity, next)}><ArrowRight size={15} /></button>
        <button className="icon-action danger-action" type="button" aria-label="Excluir atividade" onClick={onDelete}><Trash2 size={15} /></button>
      </div>
    </article>
  );
}

function priorityWeight(priority: ActivityPriority) {
  return { baixa: 1, media: 2, alta: 3, urgente: 4 }[priority];
}

function priorityLabel(priority: ActivityPriority) {
  return { baixa: "Baixa", media: "Media", alta: "Alta", urgente: "Urgente" }[priority];
}
