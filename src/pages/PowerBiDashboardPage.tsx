const POWER_BI_DASHBOARD_URL =
  "https://app.powerbi.com/reportEmbed?reportId=895fdb24-b4b8-4b58-8489-b72c0dc13a50&autoAuth=true&ctid=8e436749-430a-4293-b9d4-a1cde9d44192";

export function PowerBiDashboardPage() {
  return (
    <section className="content-stack">
      <section className="panel bi-dashboard-panel">
        <div className="panel-heading">
          <div>
            <h2>Dashboard Power BI</h2>
            <span className="muted-count">Indicadores completos do Versao Vegana em um unico lugar.</span>
          </div>
          <a className="secondary-action" href={POWER_BI_DASHBOARD_URL} target="_blank" rel="noreferrer">
            Abrir em nova aba
          </a>
        </div>
        <div className="bi-dashboard-frame">
          <iframe
            allowFullScreen
            frameBorder="0"
            src={POWER_BI_DASHBOARD_URL}
            title="versao_vegana_dashboard"
          />
        </div>
      </section>
    </section>
  );
}
