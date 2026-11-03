import { getAppPassword, getMicaelaPassword } from "@/lib/env";

export const APP_USERS = ["gaston", "micaela"] as const;
export type AppUser = (typeof APP_USERS)[number];

export function isAppUser(value: string): value is AppUser {
  return (APP_USERS as readonly string[]).includes(value);
}

export function displayName(user: AppUser): string {
  return user === "gaston" ? "Gastón" : "Micaela";
}

export function getPasswordForUser(user: AppUser): string | undefined {
  if (user === "gaston") return getAppPassword();
  return getMicaelaPassword();
}

export function requirePasswordForUser(user: AppUser): string {
  const password = getPasswordForUser(user);
  if (!password) {
    if (user === "micaela") {
      throw new Error("Falta MICAELA_PASSWORD en el entorno");
    }
    throw new Error("Falta ADMIN_PASSWORD (o APP_PASSWORD) en el entorno");
  }
  return password;
}
