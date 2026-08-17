import { AppShell } from "@/components/layout/app-shell";
import { SettingsForm } from "@/components/settings/settings-form";
import { hasSupabaseConfig } from "@/lib/env";
import { getSettings } from "@/modules/settings/actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const configured = hasSupabaseConfig();
  const settings = configured ? await getSettings() : null;
  const gmailReady = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

  return (
    <AppShell title="Configuración" pathname="/configuracion">
      {!configured ? (
        <p className="setup-banner">
          Faltan <code>SUPABASE_URL</code> y <code>SUPABASE_SERVICE_ROLE_KEY</code>.
        </p>
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <h2>Alertas</h2>
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          El job lee esta configuración primero: qué tiendas consultar, qué días
          y a qué hora (Argentina). Cada producto puede limitar todavía más las
          tiendas.
        </p>
        <p className={gmailReady ? "empty-state" : "setup-banner"}>
          Envío de mail: {gmailReady ? "configurado" : "faltan GMAIL_USER / GMAIL_APP_PASSWORD"}
        </p>
        {configured ? (
          <SettingsForm
            settings={settings}
            fallbackEmail={process.env.ALERT_TO_EMAIL ?? process.env.GMAIL_USER}
          />
        ) : null}
      </section>
    </AppShell>
  );
}
