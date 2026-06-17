import { supabase } from "../lib/supabase";
import { KeyRound, Lock, LogIn, Mail, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

type LoginPageProps = {
  onAuthenticated: () => Promise<void>;
};

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup" | "reset" | "updatePassword">("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const errorDescription = params.get("error_description");
    const type = params.get("type");

    if (errorDescription) {
      setMessage(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
      window.history.replaceState(null, "", authRedirectUrl());
      return;
    }

    if (type === "recovery") {
      setMode("updatePassword");
      setMessage("Informe uma nova senha para concluir a recuperacao de acesso.");
    }
  }, []);

  async function submit() {
    setMessage(null);
    if (!supabase) {
      setMessage("Supabase nao configurado.");
      return;
    }
    if (mode === "reset") {
      if (!email.trim()) {
        setMessage("Informe o email cadastrado para receber o link de recuperacao.");
        return;
      }
    } else if (mode === "updatePassword") {
      if (password.length < 6) {
        setMessage("Informe uma nova senha com pelo menos 6 caracteres.");
        return;
      }
    } else if (!email.trim() || password.length < 6) {
      setMessage("Informe email e senha com pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
        await onAuthenticated();
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: authRedirectUrl() }
        });
        if (error) throw error;
        setMessage("Acesso solicitado. Se o email estiver autorizado, confirme o link recebido antes de entrar.");
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: authRedirectUrl()
        });
        if (error) throw error;
        setMessage("Se este email estiver autorizado, voce recebera um link para criar uma nova senha.");
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage("Senha atualizada. Entrando no sistema...");
        await onAuthenticated();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nao foi possivel autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <img src="/vv.png" alt="Versao Vegana" />
        <div>
          <p className="eyebrow">Sistema interno</p>
          <h1>Versao Vegana</h1>
          <span>Acesso restrito para operacao, cozinha e gestao.</span>
        </div>

        <div className="segmented-control login-mode">
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>Entrar</button>
          <button className={mode === "signup" ? "active" : ""} type="button" onClick={() => setMode("signup")}>Criar acesso</button>
        </div>

        {mode !== "updatePassword" ? (
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@email.com" />
          </label>
        ) : null}
        {mode !== "reset" ? (
          <label>
            {mode === "updatePassword" ? "Nova senha" : "Senha"}
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimo 6 caracteres" />
          </label>
        ) : null}

        <button className="primary-action login-action" type="button" onClick={submit} disabled={loading}>
          {mode === "login" ? <LogIn size={18} /> : mode === "signup" ? <UserPlus size={18} /> : mode === "reset" ? <Mail size={18} /> : <KeyRound size={18} />}
          {loading ? "Validando..." : actionLabel(mode)}
        </button>

        {mode === "login" ? (
          <button className="link-button login-link" type="button" onClick={() => { setMode("reset"); setMessage(null); }}>
            Esqueci minha senha
          </button>
        ) : null}

        {mode === "reset" || mode === "updatePassword" ? (
          <button className="link-button login-link" type="button" onClick={() => { setMode("login"); setMessage(null); }}>
            Voltar para o login
          </button>
        ) : null}

        <div className="login-hint">
          <Lock size={16} />
          <span>Somente emails liberados previamente pelo administrador conseguem criar acesso.</span>
        </div>
        {message ? <div className="alert inline-alert">{message}</div> : null}
      </section>
    </main>
  );
}

function authRedirectUrl() {
  return `${window.location.origin}/sistema`;
}

function actionLabel(mode: "login" | "signup" | "reset" | "updatePassword") {
  if (mode === "login") return "Entrar no sistema";
  if (mode === "signup") return "Criar acesso autorizado";
  if (mode === "reset") return "Enviar link de recuperacao";
  return "Salvar nova senha";
}
