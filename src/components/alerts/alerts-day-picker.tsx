"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { formatWeekdayDate } from "@/lib/format";
import { shiftAlertDay } from "@/modules/alerts/date-range";

export function AlertsDayPicker({
  day,
  max,
}: {
  day: string;
  max: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const canGoNext = day < max;

  function navigate(nextDay: string) {
    if (!nextDay || nextDay > max) return;
    startTransition(() => {
      router.push(`/alertas?day=${nextDay}`);
    });
  }

  return (
    <div className="alerts-day-picker" aria-busy={pending}>
      <button
        type="button"
        className="btn-icon alerts-day-nav"
        aria-label="Día anterior"
        disabled={pending}
        onClick={() => navigate(shiftAlertDay(day, -1))}
      >
        <ChevronLeft size={20} aria-hidden />
      </button>

      <label className="alerts-day-input">
        <span className="sr-only">Fecha de alertas</span>
        <input
          type="date"
          name="day"
          value={day}
          max={max}
          disabled={pending}
          onChange={(event) => navigate(event.target.value)}
        />
        <span className="alerts-day-label">{formatWeekdayDate(`${day}T12:00:00.000-03:00`)}</span>
      </label>

      <button
        type="button"
        className="btn-icon alerts-day-nav"
        aria-label="Día siguiente"
        disabled={pending || !canGoNext}
        onClick={() => navigate(shiftAlertDay(day, 1))}
      >
        <ChevronRight size={20} aria-hidden />
      </button>
    </div>
  );
}
