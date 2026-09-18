"use client";

import { useState, useTransition } from "react";
import { bookAppointment } from "@/app/actions/calendar";
import { CalendarIcon } from "@/components/icons";

export function BookAppointmentForm({ leadId, defaultTitle }: { leadId: string; defaultTitle: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary">
        <CalendarIcon className="h-3.5 w-3.5" />
        Book an estimate
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!scheduledAt) {
          setError("Pick a date and time.");
          return;
        }
        setError(null);
        startTransition(async () => {
          const result = await bookAppointment(leadId, title, new Date(scheduledAt).toISOString());
          if (result.ok) {
            setOpen(false);
            setScheduledAt("");
          } else {
            setError(result.error);
          }
        });
      }}
      className="max-w-md space-y-2.5 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        className="input"
      />
      <input
        type="datetime-local"
        value={scheduledAt}
        onChange={(e) => setScheduledAt(e.target.value)}
        required
        className="input"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Booking…" : "Confirm"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}
