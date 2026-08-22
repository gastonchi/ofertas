"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AlertsDateRange({
  from,
  to,
  max,
}: {
  from: string;
  to: string;
  max: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fromValue, setFromValue] = useState(from);
  const [toValue, setToValue] = useState(to);

  useEffect(() => {
    setFromValue(from);
    setToValue(to);
  }, [from, to]);

  function apply() {
    if (!fromValue || !toValue) return;
    let start = fromValue;
    let end = toValue;
    if (start > end) {
      const swap = start;
      start = end;
      end = swap;
    }
    const params = new URLSearchParams({ from: start, to: end });
    startTransition(() => {
      router.push(`/alertas?${params.toString()}`);
    });
  }

  return (
    <form
      className="date-range"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
    >
      <label>
        Desde
        <input
          type="date"
          name="from"
          value={fromValue}
          max={max}
          disabled={pending}
          onChange={(event) => setFromValue(event.target.value)}
        />
      </label>
      <label>
        Hasta
        <input
          type="date"
          name="to"
          value={toValue}
          max={max}
          disabled={pending}
          onChange={(event) => setToValue(event.target.value)}
        />
      </label>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Buscando…" : "Buscar"}
      </button>
    </form>
  );
}
