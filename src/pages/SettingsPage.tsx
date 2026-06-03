type SettingsPageProps = {
  supabaseReady: boolean;
  onRefresh: () => void;
};

export function SettingsPage({ supabaseReady, onRefresh }: SettingsPageProps) {
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
            <span>Importacao inicial</span>
            <strong>scripts/import_xlsx_to_seed.py</strong>
          </div>
          <div>
            <span>Seguranca</span>
            <strong>RLS e perfis no Supabase</strong>
          </div>
        </div>
        <button className="secondary-action" type="button" onClick={onRefresh}>
          Atualizar dados
        </button>
      </div>
    </section>
  );
}
