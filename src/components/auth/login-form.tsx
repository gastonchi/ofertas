"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/modules/auth/actions";

const USER_OPTIONS = [
  { value: "gaston", label: "Gastón" },
  { value: "micaela", label: "Micaela" },
] as const;

const initial: LoginState = {};

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="login-form">
      <input type="hidden" name="next" value={nextPath} />
      <label htmlFor="user">Usuario</label>
      <select id="user" name="user" required defaultValue="gaston">
        {USER_OPTIONS.map((user) => (
          <option key={user.value} value={user.value}>
            {user.label}
          </option>
        ))}
      </select>
      <label htmlFor="password">Contraseña</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
      />
      {state.error ? <p className="form-error">{state.error}</p> : null}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
