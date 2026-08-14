export function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

export function hasSupabaseConfig(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Acepta ADMIN_PASSWORD (Vercel actual) o APP_PASSWORD. */
export function getAppPassword(): string | undefined {
  return process.env.ADMIN_PASSWORD || process.env.APP_PASSWORD || undefined;
}

export function hasAuthConfig(): boolean {
  return Boolean(getAppPassword());
}
