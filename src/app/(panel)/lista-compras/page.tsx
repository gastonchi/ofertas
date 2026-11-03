import { AppShell } from "@/components/layout/app-shell";
import { ShoppingListPageClient } from "@/components/shopping-list/shopping-list-page-client";
import { hasSupabaseConfig } from "@/lib/env";
import { resolveEnabledStores } from "@/lib/stores";
import { listShoppingListEntries } from "@/modules/shopping-list/queries";
import { getSettings } from "@/modules/settings/actions";

export const dynamic = "force-dynamic";

export default async function ShoppingListPage() {
  const configured = hasSupabaseConfig();
  const settings = configured ? await getSettings() : null;
  const trackedStores = resolveEnabledStores(settings?.default_stores);
  let entries: Awaited<ReturnType<typeof listShoppingListEntries>> = [];
  let loadError: string | null = null;

  if (configured) {
    try {
      entries = await listShoppingListEntries();
    } catch (error) {
      loadError =
        error instanceof Error ? error.message : "No se pudo cargar la lista.";
    }
  }

  return (
    <AppShell title="Lista de compras" pathname="/lista-compras">
      {!configured ? (
        <p className="setup-banner">
          Faltan <code>SUPABASE_URL</code> y{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code>.
        </p>
      ) : null}
      {loadError ? <p className="form-error">{loadError}</p> : null}
      <ShoppingListPageClient
        entries={entries}
        trackedStores={trackedStores}
      />
    </AppShell>
  );
}
