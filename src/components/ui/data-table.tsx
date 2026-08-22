"use client";

import { LayoutGrid, Table2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export type DataViewMode = "table" | "cards";

const STORAGE_PREFIX = "data-view:";

function ViewToggle({
  value,
  onChange,
}: {
  value: DataViewMode;
  onChange: (view: DataViewMode) => void;
}) {
  return (
    <div className="view-toggle" role="group" aria-label="Modo de vista">
      <button
        type="button"
        className={`btn-icon view-toggle-btn${value === "table" ? " is-active" : ""}`}
        aria-pressed={value === "table"}
        aria-label="Vista tabla"
        onClick={() => onChange("table")}
      >
        <Table2 size={20} aria-hidden />
      </button>
      <button
        type="button"
        className={`btn-icon view-toggle-btn${value === "cards" ? " is-active" : ""}`}
        aria-pressed={value === "cards"}
        aria-label="Vista tarjetas"
        onClick={() => onChange("cards")}
      >
        <LayoutGrid size={20} aria-hidden />
      </button>
    </div>
  );
}

export function DataTable({
  storageKey,
  defaultView = "table",
  header,
  toolbar,
  endToolbar,
  table,
  cards,
}: {
  storageKey: string;
  defaultView?: DataViewMode;
  header?: ReactNode;
  toolbar?: ReactNode;
  endToolbar?: ReactNode;
  table: ReactNode;
  cards: ReactNode;
}) {
  const [view, setView] = useState<DataViewMode>(defaultView);

  useEffect(() => {
    const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`);
    if (stored === "table" || stored === "cards") {
      setView(stored);
    }
  }, [storageKey]);

  function changeView(next: DataViewMode) {
    setView(next);
    window.localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, next);
  }

  return (
    <div className={`data-table-shell view-${view}`}>
      <div className="data-table-toolbar-stack">
        {header ? (
          <div className="data-table-toolbar-row data-table-toolbar-primary">
            {header}
          </div>
        ) : null}
        <div className="data-table-toolbar-row">
          <div className="data-table-toolbar-start">{toolbar}</div>
          <div className="data-table-toolbar-end">
            {endToolbar}
            <div className="desktop-only">
              <ViewToggle value={view} onChange={changeView} />
            </div>
          </div>
        </div>
      </div>
      <div className="table-wrap data-table-view-table">{table}</div>
      <div className="card-grid data-table-view-cards">{cards}</div>
    </div>
  );
}
