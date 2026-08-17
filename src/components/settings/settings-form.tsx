"use client";

import { useActionState } from "react";
import { ALL_STORES, type AppSettings } from "@/lib/types";
import { STORE_LABELS } from "@/lib/stores";
import {
  DEFAULT_ALERT_DAYS,
  DEFAULT_ALERT_HOURS,
  WEEKDAYS,
  WEEKDAY_LABELS,
} from "@/lib/schedule";
import {
  updateSettingsAction,
  type SettingsActionState,
} from "@/modules/settings/actions";

const initial: SettingsActionState = {};

export function SettingsForm({
  settings,
  fallbackEmail,
}: {
  settings: AppSettings | null;
  fallbackEmail?: string;
}) {
  const [state, action, pending] = useActionState(updateSettingsAction, initial);
  const selectedStores = settings?.default_stores?.length
    ? settings.default_stores
    : [...ALL_STORES];
  const selectedDays = settings?.alert_days?.length
    ? settings.alert_days
    : [...DEFAULT_ALERT_DAYS];
  const selectedHours = padHours(
    settings?.alert_hours?.length
      ? settings.alert_hours
      : [...DEFAULT_ALERT_HOURS],
  );

  return (
    <form action={action} className="product-form">
      <div className="field">
        <label htmlFor="alert_email">Email de alertas</label>
        <input
          id="alert_email"
          name="alert_email"
          type="email"
          defaultValue={settings?.alert_email ?? fallbackEmail ?? ""}
          placeholder="tu@gmail.com"
        />
        <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
          Si lo dejás vacío, se usa <code>ALERT_TO_EMAIL</code> del entorno.
        </p>
      </div>
      <fieldset className="stores-fieldset">
        <legend>Tiendas a consultar</legend>
        <p className="muted" style={{ margin: "0 0 0.65rem", fontSize: "0.85rem" }}>
          El job solo consulta estas cadenas. Cada producto puede restringir
          todavía más.
        </p>
        <div className="stores-grid">
          {ALL_STORES.map((store) => (
            <label key={store} className="check-label">
              <input
                type="checkbox"
                name="default_stores"
                value={store}
                defaultChecked={selectedStores.includes(store)}
              />
              {STORE_LABELS[store]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="stores-fieldset">
        <legend>Días de alerta</legend>
        <div className="days-grid">
          {WEEKDAYS.map((day) => (
            <label key={day} className="check-label">
              <input
                type="checkbox"
                name="alert_days"
                value={day}
                defaultChecked={selectedDays.includes(day)}
              />
              {WEEKDAY_LABELS[day]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="stores-fieldset">
        <legend>Horarios (Argentina)</legend>
        <p className="muted" style={{ margin: "0 0 0.65rem", fontSize: "0.85rem" }}>
          El chequeo corre en punto. Si no es uno de estos horarios, no consulta
          ni manda mail.
        </p>
        <div className="field-row">
          {selectedHours.map((hour, index) => (
            <div className="field" key={`${hour}-${index}`}>
              <label htmlFor={`alert_hours_${index}`}>Horario {index + 1}</label>
              <input
                id={`alert_hours_${index}`}
                name="alert_hours"
                type="time"
                step={3600}
                defaultValue={hour}
              />
            </div>
          ))}
        </div>
      </fieldset>
      {state.error ? <p className="form-error">{state.error}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}

function padHours(hours: string[]): string[] {
  const next = hours.slice(0, 2);
  while (next.length < 2) next.push("");
  return next;
}
