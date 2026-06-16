import { createAllowedUser, updateAllowedUser } from "../lib/repository";
import type { AllowedUser, UserProfile, UserRole } from "../types";
import { Save, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

type SettingsPageProps = {
  allowedUsers: AllowedUser[];
  currentProfile: UserProfile;
  supabaseReady: boolean;
  onChanged: () => Promise<void>;
  onRefresh: () => void;
};

const roleOptions: Array<{ value: UserRole; label: string }> = [
  { value: "admin", label: "Admin tecnico" },
  { value: "socia", label: "Socia" },
  { value: "operacao", label: "Operacao" },
  { value: "cozinha", label: "Cozinha" },
  { value: "consulta", label: "Consulta" },
  { value: "autoatendimento", label: "Autoatendimento" }
];

export function SettingsPage({ allowedUsers, currentProfile, supabaseReady, onChanged, onRefresh }: SettingsPageProps) {
  const [editing, setEditing] = useState<AllowedUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("operacao");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canManageUsers = currentProfile.role === "admin" || currentProfile.role === "socia";

  useEffect(() => {
    if (!editing) return;
    setName(editing.name);
    setEmail(editing.email);
    setRole(editing.role);
    setActive(editing.active);
  }, [editing]);

  function resetForm() {
    setEditing(null);
    setName("");
    setEmail("");
    setRole("operacao");
    setActive(true);
  }

  async function submitUser() {
    setMessage(null);
    if (!name.trim() || !email.trim()) {
      setMessage("Informe nome e email.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateAllowedUser({ id: editing.id, name, email, role, active });
      } else {
        await createAllowedUser({ name, email, role, active });
      }
      resetForm();
      await onChanged();
      setMessage("Usuario permitido salvo.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nao foi possivel salvar usuario.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="content-stack">
      <div className="panel">
        <div className="panel-heading">
          <h2>Ambiente</h2>
        </div>
        <div className="settings-list">
          <div>
            <span>Banco de dados</span>
            <strong>{supabaseReady ? "Supabase conectado" : "Modo demo sem credenciais"}</strong>
          </div>
          <div>
            <span>Usuario atual</span>
            <strong>{currentProfile.name} · {labelRole(currentProfile.role)}</strong>
          </div>
          <div>
            <span>Seguranca</span>
            <strong>Login, perfis, RLS e auditoria</strong>
          </div>
        </div>
        <button className="secondary-action" type="button" onClick={onRefresh}>
          Atualizar dados
        </button>
      </div>

      {canManageUsers ? (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Usuarios permitidos</h2>
              <p>Cadastre quem pode criar login e acessar o sistema.</p>
            </div>
            <button className="secondary-action" type="button" onClick={resetForm}>
              <UserPlus size={17} />
              Novo usuario
            </button>
          </div>

          <div className="form-grid user-form-grid">
            <label>
              Nome completo
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome e sobrenome" />
            </label>
            <label>
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@exemplo.com" />
            </label>
            <label>
              Perfil
              <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
                {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              Status
              <select value={active ? "ativo" : "inativo"} onChange={(event) => setActive(event.target.value === "ativo")}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </label>
            <button className="primary-action" type="button" disabled={saving} onClick={submitUser}>
              <Save size={18} />
              {saving ? "Salvando..." : editing ? "Salvar alteracoes" : "Autorizar usuario"}
            </button>
          </div>

          <div className="user-management-list">
            {allowedUsers.map((user) => (
              <article className="user-management-card" key={user.id}>
                <div>
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>
                <span className={`pill ${user.active ? "finalizado" : "cancelado"}`}>{user.active ? "ativo" : "inativo"}</span>
                <span className="muted-inline">{labelRole(user.role)}</span>
                <button className="secondary-action compact-action" type="button" onClick={() => setEditing(user)}>Editar</button>
              </article>
            ))}
          </div>
          {message ? <div className="alert inline-alert">{message}</div> : null}
        </div>
      ) : null}
    </section>
  );
}

function labelRole(role: UserRole) {
  return roleOptions.find((option) => option.value === role)?.label ?? role;
}
