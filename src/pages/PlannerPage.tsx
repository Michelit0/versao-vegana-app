import { AlertTriangle, CalendarClock, CheckCircle2, Copy, Edit3, MoveLeft, MoveRight, Plus, Save, Trash2, UserPlus, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { SearchableSelect } from "../components/SearchableSelect";
import { createActivity, createActivityResponsible, createActivitySubtask, deleteActivity, deleteActivitySubtask, updateActivity, updateActivityStatus, updateActivitySubtask } from "../lib/repository";
import type { Activity, ActivityPriority, ActivityResponsible, ActivityStatus, ActivitySubtask, ActivitySubtaskStatus } from "../types";

type PlannerPageProps = {
  activities: Activity[];
  responsibles: ActivityResponsible[];
  subtasks: ActivitySubtask[];
  loading: boolean;
  onChanged: () => Promise<void>;
};

type ActivityDraft = {
  id?: number;
  title: string;
  description: string;
  status: ActivityStatus;
  priority: ActivityPriority;
  ownerId: number;
  owner: string;
  category: string;
  startDate: string;
  dueDate: string;
  note: string;
  boardOrder: number;
};

type SubtaskDraft = {
  title: string;
  description: string;
  status: ActivitySubtaskStatus;
  priority: ActivityPriority;
  ownerId: number;
  dueDate: string;
};

const columns: Array<{ status: ActivityStatus; label: string; description: string }> = [
  { status: "a_fazer", label: "A fazer", description: "Entrou na fila e precisa de acao" },
  { status: "fazendo", label: "Fazendo", description: "Tem alguem trabalhando agora" },
  { status: "concluido", label: "Concluido", description: "Resolvido e registrado" },
  { status: "impedido", label: "Impedido", description: "Parado por bloqueio ou problema" },
  { status: "aguardando_resposta", label: "Aguardando resposta", description: "Depende de retorno externo" }
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Nao registrado";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function dueState(activity: Activity) {
  if (!activity.dueDate || activity.status === "concluido") return "normal";
  const today = todayIso();
  if (activity.dueDate < today) return "overdue";
  if (activity.dueDate === today) return "today";
  const date = new Date(`${activity.dueDate}T00:00:00`);
  const now = new Date(`${today}T00:00:00`);
  const days = Math.round((date.getTime() - now.getTime()) / 86400000);
  return days <= 2 ? "soon" : "normal";
}

function pendingResponsible(responsibles: ActivityResponsible[]) {
  return responsibles.find((item) => item.fullName.toLowerCase() === "pendente atribuicao") ?? responsibles[0] ?? { id: 1, firstName: "Pendente", lastName: "Atribuicao", fullName: "Pendente Atribuicao", active: true };
}

function blankDraft(responsibles: ActivityResponsible[], status: ActivityStatus = "a_fazer"): ActivityDraft {
  const pending = pendingResponsible(responsibles);
  return {
    title: "",
    description: "",
    status,
    priority: "media",
    ownerId: pending.id,
    owner: pending.fullName,
    category: "Cozinha",
    startDate: todayIso(),
    dueDate: "",
    note: "",
    boardOrder: 0
  };
}

function toDraft(activity: Activity, keepId: boolean, responsibles: ActivityResponsible[]): ActivityDraft {
  const pending = pendingResponsible(responsibles);
  const selected = responsibles.find((item) => item.id === activity.ownerId) ?? responsibles.find((item) => item.fullName === activity.owner) ?? pending;
  return {
    id: keepId ? activity.id : undefined,
    title: activity.title,
    description: activity.description ?? "",
    status: activity.status,
    priority: activity.priority,
    ownerId: selected.id,
    owner: selected.fullName,
    category: activity.category ?? "Cozinha",
    startDate: activity.startDate ?? "",
    dueDate: activity.dueDate ?? "",
    note: activity.note ?? "",
    boardOrder: activity.boardOrder
  };
}

function blankSubtaskDraft(responsibles: ActivityResponsible[]): SubtaskDraft {
  const pending = pendingResponsible(responsibles);
  return { title: "", description: "", status: "a_fazer", priority: "media", ownerId: pending.id, dueDate: "" };
}

export function PlannerPage({ activities, responsibles, subtasks, loading, onChanged }: PlannerPageProps) {
  const [draft, setDraft] = useState<ActivityDraft>(() => blankDraft(responsibles));
  const [mode, setMode] = useState<"novo" | "editar" | "duplicar">("novo");
  const [modalOpen, setModalOpen] = useState(false);
  const [responsibleModalOpen, setResponsibleModalOpen] = useState(false);
  const [responsibleDraft, setResponsibleDraft] = useState({ firstName: "", lastName: "" });
  const [detailTarget, setDetailTarget] = useState<Activity | null>(null);
  const [subtaskDraft, setSubtaskDraft] = useState<SubtaskDraft>(() => blankSubtaskDraft(responsibles));
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const responsibleOptions = useMemo(() => {
    return responsibles.map((item) => ({ value: item.id, label: item.fullName, description: item.fullName.toLowerCase() === "pendente atribuicao" ? "Sem responsavel definido" : null }));
  }, [responsibles]);

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
    const urgent = activities.filter((activity) => activity.status !== "concluido" && activity.priority === "urgente").length;
    return { overdue, today, urgent };
  }, [activities]);

  function openNew(status: ActivityStatus = "a_fazer") {
    setMode("novo");
    setDraft(blankDraft(responsibles, status));
    setMessage(null);
    setModalOpen(true);
  }

  function openEdit(activity: Activity) {
    setMode("editar");
    setDraft(toDraft(activity, true, responsibles));
    setMessage(null);
    setModalOpen(true);
  }

  function openDuplicate(activity: Activity) {
    setMode("duplicar");
    setDraft({ ...toDraft(activity, false, responsibles), title: `${activity.title} - copia` });
    setMessage("Atividade duplicada em edicao. Ajuste os dados antes de salvar.");
    setModalOpen(true);
  }

  function openDetails(activity: Activity) {
    setDetailTarget(activity);
    setSubtaskDraft(blankSubtaskDraft(responsibles));
    setMessage(null);
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
      const responsible = responsibles.find((item) => item.id === draft.ownerId) ?? pendingResponsible(responsibles);
      const input = {
        title: draft.title,
        description: draft.description,
        status: draft.status,
        priority: draft.priority,
        ownerId: responsible.id,
        owner: responsible.fullName,
        category: draft.category,
        startDate: draft.startDate,
        dueDate: draft.dueDate,
        note: draft.note,
        boardOrder: draft.boardOrder,
        createdBy: responsible.fullName || "Versao Vegana"
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

  async function saveResponsible() {
    setMessage(null);
    const firstName = responsibleDraft.firstName.trim();
    const lastName = responsibleDraft.lastName.trim();
    if (!firstName || !lastName) {
      setMessage("Informe nome e sobrenome do responsavel.");
      return;
    }
    if (responsibles.some((item) => item.fullName.toLowerCase() === `${firstName} ${lastName}`.toLowerCase())) {
      setMessage("Responsavel ja cadastrado.");
      return;
    }
    setSaving(true);
    try {
      await createActivityResponsible({ firstName, lastName });
      setResponsibleDraft({ firstName: "", lastName: "" });
      setResponsibleModalOpen(false);
      await onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nao foi possivel cadastrar o responsavel.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSubtask(activity: Activity) {
    setMessage(null);
    if (!subtaskDraft.title.trim()) {
      setMessage("Informe o titulo da subtarefa.");
      return;
    }
    const responsible = responsibles.find((item) => item.id === subtaskDraft.ownerId) ?? pendingResponsible(responsibles);
    setSaving(true);
    try {
      await createActivitySubtask({
        activityId: activity.id,
        title: subtaskDraft.title,
        description: subtaskDraft.description,
        status: subtaskDraft.status,
        priority: subtaskDraft.priority,
        ownerId: responsible.id,
        owner: responsible.fullName,
        dueDate: subtaskDraft.dueDate,
        order: subtasks.filter((item) => item.activityId === activity.id).length + 1
      });
      setSubtaskDraft(blankSubtaskDraft(responsibles));
      await onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nao foi possivel salvar a subtarefa.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSubtask(subtask: ActivitySubtask) {
    setSaving(true);
    try {
      await updateActivitySubtask({
        id: subtask.id,
        activityId: subtask.activityId,
        title: subtask.title,
        description: subtask.description,
        status: subtask.status === "concluida" ? "a_fazer" : "concluida",
        priority: subtask.priority,
        ownerId: subtask.ownerId,
        owner: subtask.owner,
        dueDate: subtask.dueDate,
        order: subtask.order
      });
      await onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nao foi possivel atualizar a subtarefa.");
    } finally {
      setSaving(false);
    }
  }

  async function removeSubtask(subtask: ActivitySubtask) {
    setSaving(true);
    try {
      await deleteActivitySubtask(subtask.id);
      await onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nao foi possivel remover a subtarefa.");
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
          <div className="panel-actions">
            <button className="secondary-action" type="button" onClick={() => setResponsibleModalOpen(true)}><UserPlus size={17} />Responsaveis</button>
            <button className="primary-action" type="button" onClick={() => openNew()}><Plus size={18} />Nova atividade</button>
          </div>
        </div>
        <div className="ops-summary-grid">
          <div><strong>{activities.filter((item) => item.status !== "concluido").length}</strong><span>atividades abertas</span></div>
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
                  onDetails={() => openDetails(activity)}
                  onMove={moveActivity}
                  subtasks={subtasks.filter((item) => item.activityId === activity.id)}
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
              <SearchableSelect label="Responsavel" value={draft.ownerId} options={responsibleOptions} placeholder="Buscar responsavel" onChange={(value) => {
                const responsible = responsibles.find((item) => item.id === value) ?? pendingResponsible(responsibles);
                setDraft({ ...draft, ownerId: responsible.id, owner: responsible.fullName });
              }} />
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

      {responsibleModalOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Cadastro de responsavel">
          <section className="modal-card">
            <div className="panel-heading">
              <div>
                <h2>Responsaveis</h2>
                <span className="muted-count">Nome e sobrenome sao obrigatorios. Pendente ja fica como padrao.</span>
              </div>
              <button className="icon-action" type="button" aria-label="Fechar" onClick={() => setResponsibleModalOpen(false)}><XCircle size={17} /></button>
            </div>
            <div className="responsible-list">
              {responsibles.map((item) => <span key={item.id}>{item.fullName}</span>)}
            </div>
            <div className="form-grid management-form">
              <label>Nome<input value={responsibleDraft.firstName} onChange={(event) => setResponsibleDraft({ ...responsibleDraft, firstName: event.target.value })} placeholder="Ex.: Camila" /></label>
              <label>Sobrenome<input value={responsibleDraft.lastName} onChange={(event) => setResponsibleDraft({ ...responsibleDraft, lastName: event.target.value })} placeholder="Ex.: Silva" /></label>
            </div>
            <button className="primary-action form-action" disabled={saving} type="button" onClick={saveResponsible}><Save size={17} />Cadastrar responsavel</button>
          </section>
        </div>
      ) : null}

      {detailTarget ? (
        <TaskDetailModal
          activity={detailTarget}
          disabled={saving}
          message={message}
          onClose={() => setDetailTarget(null)}
          onRemoveSubtask={removeSubtask}
          onSaveSubtask={saveSubtask}
          onToggleSubtask={toggleSubtask}
          responsibleOptions={responsibleOptions}
          responsibles={responsibles}
          setSubtaskDraft={setSubtaskDraft}
          subtaskDraft={subtaskDraft}
          subtasks={subtasks.filter((item) => item.activityId === detailTarget.id)}
        />
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
              <span>Criada em: {parseLocalDate(deleteTarget.createdAt.slice(0, 10))}</span>
              <span>Responsavel: {deleteTarget.owner || "Nao informado"}</span>
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

function ActivityCard({ activity, disabled, onDelete, onDetails, onDragStart, onDuplicate, onEdit, onMove, subtasks }: { activity: Activity; disabled: boolean; onDelete: () => void; onDetails: () => void; onDragStart: () => void; onDuplicate: () => void; onEdit: () => void; onMove: (activity: Activity, status: ActivityStatus) => Promise<void>; subtasks: ActivitySubtask[] }) {
  const currentIndex = columns.findIndex((column) => column.status === activity.status);
  const state = dueState(activity);
  const previous = columns[currentIndex - 1]?.status;
  const next = columns[currentIndex + 1]?.status;
  const previousLabel = columns[currentIndex - 1]?.label;
  const nextLabel = columns[currentIndex + 1]?.label;
  const completedSubtasks = subtasks.filter((item) => item.status === "concluida").length;

  return (
    <article className={`planner-card priority-${activity.priority} due-${state}`} draggable onDragStart={onDragStart}>
      <div className="planner-card-topline">
        <span className={`priority-chip ${activity.priority}`}>{priorityLabel(activity.priority)}</span>
        {state !== "normal" ? <span className={`due-chip ${state}`}><AlertTriangle size={13} />{state === "overdue" ? "Atrasada" : state === "today" ? "Hoje" : "Perto"}</span> : null}
      </div>
      <button className="planner-card-title-button" type="button" onClick={onDetails}>{activity.title}</button>
      {activity.description ? <p>{activity.description}</p> : null}
      <div className="planner-meta">
        <span><CalendarClock size={14} />{parseLocalDate(activity.dueDate)}</span>
        {activity.owner ? <span>{activity.owner}</span> : null}
        {activity.category ? <span>{activity.category}</span> : null}
        <span>Criada {parseLocalDate(activity.createdAt.slice(0, 10))}</span>
        {activity.assignedAt ? <span>Atribuida {parseLocalDate(activity.assignedAt.slice(0, 10))}</span> : null}
        {subtasks.length ? <span><CheckCircle2 size={14} />{completedSubtasks}/{subtasks.length} subtarefas</span> : null}
      </div>
      <div className="planner-move-actions" aria-label="Movimentar atividade">
        <button className="status-move-action" disabled={!previous || disabled} type="button" onClick={() => previous && void onMove(activity, previous)}>
          <MoveLeft size={14} />
          {previousLabel ? `Mover para ${previousLabel}` : "Sem etapa anterior"}
        </button>
        <button className="status-move-action" disabled={!next || disabled} type="button" onClick={() => next && void onMove(activity, next)}>
          {nextLabel ? `Mover para ${nextLabel}` : "Sem proxima etapa"}
          <MoveRight size={14} />
        </button>
      </div>
      <div className="planner-card-actions">
        <button className="secondary-action compact-action subtle-card-action" type="button" onClick={onEdit}><Edit3 size={14} />Editar</button>
        <button className="secondary-action compact-action subtle-card-action" type="button" onClick={onDuplicate}><Copy size={14} />Duplicar</button>
        <button className="icon-action subtle-delete-action" type="button" aria-label="Excluir atividade" onClick={onDelete}><Trash2 size={15} /></button>
      </div>
    </article>
  );
}

function TaskDetailModal({ activity, disabled, message, onClose, onRemoveSubtask, onSaveSubtask, onToggleSubtask, responsibleOptions, responsibles, setSubtaskDraft, subtaskDraft, subtasks }: {
  activity: Activity;
  disabled: boolean;
  message: string | null;
  onClose: () => void;
  onRemoveSubtask: (subtask: ActivitySubtask) => Promise<void>;
  onSaveSubtask: (activity: Activity) => Promise<void>;
  onToggleSubtask: (subtask: ActivitySubtask) => Promise<void>;
  responsibleOptions: Array<{ value: number; label: string; description?: string | null }>;
  responsibles: ActivityResponsible[];
  setSubtaskDraft: (draft: SubtaskDraft) => void;
  subtaskDraft: SubtaskDraft;
  subtasks: ActivitySubtask[];
}) {
  const completed = subtasks.filter((item) => item.status === "concluida").length;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Detalhes da atividade">
      <section className="modal-card task-detail-modal">
        <div className="panel-heading">
          <div>
            <h2>{activity.title}</h2>
            <span className="muted-count">{completed} de {subtasks.length} subtarefas concluidas</span>
          </div>
          <button className="secondary-action" type="button" onClick={onClose}><XCircle size={17} />Fechar</button>
        </div>
        {message ? <div className="alert inline-alert">{message}</div> : null}
        <div className="task-detail-grid">
          <div><span>Status</span><strong>{columns.find((column) => column.status === activity.status)?.label}</strong></div>
          <div><span>Responsavel</span><strong>{activity.owner || "Pendente"}</strong></div>
          <div><span>Prazo</span><strong>{parseLocalDate(activity.dueDate)}</strong></div>
          <div><span>Criada</span><strong>{formatDateTime(activity.createdAt)}</strong></div>
          <div><span>Atribuicao</span><strong>{formatDateTime(activity.assignedAt)}</strong></div>
          <div><span>Historico</span><strong>Prazos e responsaveis ficam registrados no banco</strong></div>
        </div>
        <div className="task-description-box">
          <strong>Descricao</strong>
          <p>{activity.description || "Sem descricao detalhada."}</p>
          {activity.note ? <small>{activity.note}</small> : null}
        </div>
        <section className="subtask-section">
          <div className="panel-heading">
            <div>
              <h2>Subtarefas</h2>
              <span className="muted-count">Quebre a demanda em passos pequenos e marque o que foi feito.</span>
            </div>
          </div>
          <div className="subtask-list">
            {subtasks.length ? subtasks.map((subtask) => (
              <article className={subtask.status === "concluida" ? "subtask-row done" : "subtask-row"} key={subtask.id}>
                <button className="subtask-check" disabled={disabled} type="button" onClick={() => void onToggleSubtask(subtask)}><CheckCircle2 size={18} /></button>
                <div>
                  <strong>{subtask.title}</strong>
                  <span>{subtask.owner || "Pendente"} • {parseLocalDate(subtask.dueDate)} • {priorityLabel(subtask.priority)}</span>
                  {subtask.description ? <p>{subtask.description}</p> : null}
                </div>
                <button className="icon-action subtle-delete-action" disabled={disabled} type="button" aria-label="Remover subtarefa" onClick={() => void onRemoveSubtask(subtask)}><Trash2 size={15} /></button>
              </article>
            )) : <div className="event-empty-state">Nenhuma subtarefa criada ainda.</div>}
          </div>
          <div className="subtask-form">
            <label>Titulo<input value={subtaskDraft.title} onChange={(event) => setSubtaskDraft({ ...subtaskDraft, title: event.target.value })} placeholder="Ex.: Separar ingredientes" /></label>
            <SearchableSelect label="Responsavel" value={subtaskDraft.ownerId} options={responsibleOptions} placeholder="Buscar responsavel" onChange={(value) => setSubtaskDraft({ ...subtaskDraft, ownerId: value })} />
            <label>Prazo<input type="date" value={subtaskDraft.dueDate} onChange={(event) => setSubtaskDraft({ ...subtaskDraft, dueDate: event.target.value })} /></label>
            <label>Prioridade<select value={subtaskDraft.priority} onChange={(event) => setSubtaskDraft({ ...subtaskDraft, priority: event.target.value as ActivityPriority })}>{priorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}</select></label>
            <label className="form-wide">Descricao<textarea rows={2} value={subtaskDraft.description} onChange={(event) => setSubtaskDraft({ ...subtaskDraft, description: event.target.value })} placeholder="Detalhe opcional" /></label>
            <button className="primary-action form-action" disabled={disabled || !responsibles.length} type="button" onClick={() => void onSaveSubtask(activity)}><Plus size={17} />Adicionar subtarefa</button>
          </div>
        </section>
      </section>
    </div>
  );
}

function priorityWeight(priority: ActivityPriority) {
  return { baixa: 1, media: 2, alta: 3, urgente: 4 }[priority];
}

function priorityLabel(priority: ActivityPriority) {
  return { baixa: "Baixa", media: "Media", alta: "Alta", urgente: "Urgente" }[priority];
}
