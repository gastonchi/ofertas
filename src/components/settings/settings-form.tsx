"use client";

import { useActionState } from "react";
import { ALL_STORES, type AppSettings } from "@/lib/types";
import { STORE_LABELS } from "@/lib/stores";
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
  const selected = settings?.default_stores?.length
    ? settings.default_stores
    : [...ALL_STORES];

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
        <legend>Tiendas por defecto</legend>
        <div className="stores-grid">
          {ALL_STORES.map((store) => (
            <label key={store} className="check-label">
              <input
                type="checkbox"
                name="default_stores"
                value={store}
                defaultChecked={selected.includes(store)}
              />
              {STORE_LABELS[store]}
            </label>
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
