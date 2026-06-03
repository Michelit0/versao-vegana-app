type KpiCardProps = {
  label: string;
  value: string;
  detail?: string;
};

export function KpiCard({ label, value, detail }: KpiCardProps) {
  return (
    <article className="kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}
