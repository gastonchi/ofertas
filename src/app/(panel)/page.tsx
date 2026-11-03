import { AppShell } from "@/components/layout/app-shell";
import { HomeQuickActions } from "@/components/home/home-quick-actions";
import { ProductPageActionsProvider } from "@/components/products/product-page-actions";
import { resolveEnabledStores } from "@/lib/stores";
import { hasSupabaseConfig } from "@/lib/env";
import { getSettings } from "@/modules/settings/actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const configured = hasSupabaseConfig();
  const settings = configured ? await getSettings() : null;
  const trackedStores = resolveEnabledStores(settings?.default_stores);

  return (
    <ProductPageActionsProvider trackedStores={trackedStores}>
      <AppShell title="Inicio" pathname="/">
        {!configured ? (
          <p className="setup-banner">
            Configurá <code>SUPABASE_URL</code> y{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> en Vercel.
          </p>
        ) : null}

        <HomeQuickActions />
      </AppShell>
    </ProductPageActionsProvider>
  );
}
