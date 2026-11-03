"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  SESSION_COOKIE,
  verifyPassword,
} from "@/lib/auth";
import { isAppUser } from "@/lib/auth/users";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const userRaw = String(formData.get("user") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!isAppUser(userRaw)) {
    return { error: "Elegí quién entra." };
  }

  if (!password) {
    return { error: "Ingresá la contraseña." };
  }

  try {
    if (!verifyPassword(userRaw, password)) {
      return { error: "Contraseña incorrecta." };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falta configurar contraseñas.";
    return {
      error: message.includes("MICAELA")
        ? "Falta configurar MICAELA_PASSWORD en Vercel."
        : "Falta configurar ADMIN_PASSWORD en Vercel.",
    };
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(userRaw), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  redirect(next.startsWith("/") ? next : "/");
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
