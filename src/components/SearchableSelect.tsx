import { useEffect, useMemo, useState } from "react";

export type SearchableOption = {
  value: number;
  label: string;
  description?: string | null;
};

type SearchableSelectProps = {
  label: string;
  value: number;
  options: SearchableOption[];
  placeholder: string;
  onChange: (value: number) => void;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function SearchableSelect({ label, value, options, placeholder, onChange }: SearchableSelectProps) {
  const selected = options.find((option) => option.value === value);
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(selected?.label ?? "");
  }, [selected?.label]);

  const filtered = useMemo(() => {
    const term = normalize(query);
    if (!term) return options.slice(0, 20);
    return options
      .filter((option) => normalize(`${option.label} ${option.description ?? ""}`).includes(term))
      .slice(0, 20);
  }, [options, query]);

  function selectOption(option: SearchableOption) {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
  }

  return (
    <label className="searchable-field">
      {label}
      <input
        autoComplete="off"
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        value={query}
      />
      {open ? (
        <div className="searchable-menu">
          {filtered.length ? filtered.map((option) => (
            <button key={option.value} type="button" onMouseDown={() => selectOption(option)}>
              <strong>{option.label}</strong>
              {option.description ? <span>{option.description}</span> : null}
            </button>
          )) : <span className="searchable-empty">Nenhum resultado</span>}
        </div>
      ) : null}
    </label>
  );
}
