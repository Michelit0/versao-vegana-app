import { supabase } from "../lib/supabase";
import { Lock, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";

type LoginPageProps = {
  onAuthenticated: () => Promise<void>;
};

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setMessage(null);
    if (!supabase) {
      setMessage("Supabase nao configurado.");
      return;
    }
    if (!email.trim() || password.length < 6) {
      setMessage("Informe email e senha com pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email: normalizedEmail, password });
        if (error) throw error;
        setMessage("Acesso criado. Se o Supabase pedir confirmacao por email, confirme antes de entrar.");
      }
      await onAuthenticated();
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

        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@email.com" />
        </label>
        <label>
          Senha
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimo 6 caracteres" />
        </label>

        <button className="primary-action login-action" type="button" onClick={submit} disabled={loading}>
          {mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
          {loading ? "Validando..." : mode === "login" ? "Entrar no sistema" : "Criar acesso autorizado"}
        </button>

        <div className="login-hint">
          <Lock size={16} />
          <span>Somente emails cadastrados por admin ou socia conseguem criar acesso.</span>
        </div>
        {message ? <div className="alert inline-alert">{message}</div> : null}
      </section>
    </main>
  );
}
