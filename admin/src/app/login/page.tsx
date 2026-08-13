import { LoginForm } from "@/components/login-form";
import { hasAuthConfig } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") ? params.next : "/";

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>Ofertas</h1>
        <p>Entrá al panel para editar EANs y precios objetivo.</p>
        {!hasAuthConfig() ? (
          <p className="setup-banner">
            Configurá <code>ADMIN_PASSWORD</code> en Vercel antes de continuar.
          </p>
        ) : (
          <LoginForm nextPath={nextPath} />
        )}
      </div>
    </main>
  );
}
