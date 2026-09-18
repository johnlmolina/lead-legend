"use client";

import { useRef, useState, useTransition } from "react";
import {
  sendManualReply,
  logManualCall,
  bookEstimate,
  updateLeadStatus,
  generateAiDraft,
} from "@/app/actions/leads";

const STATUS_OPTIONS = [
  "NEW",
  "CONTACTED",
  "CALL_SCHEDULED",
  "CALL_COMPLETED",
  "ESTIMATE_BOOKED",
  "WON",
  "LOST",
];

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  CALL_SCHEDULED: "Call scheduled",
  CALL_COMPLETED: "Call completed",
  ESTIMATE_BOOKED: "Estimate booked",
  WON: "Won",
  LOST: "Lost",
};

export function StatusSelect({ leadId, currentStatus }: { leadId: string; currentStatus: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={currentStatus}
      disabled={isPending}
      onChange={(e) => startTransition(() => updateLeadStatus(leadId, e.target.value))}
      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
    >
      {STATUS_OPTIONS.map((status) => (
        <option key={status} value={status}>
          {STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}

export function ReplyForm({ leadId }: { leadId: string }) {
  const [isPending, startTransition] = useTransition();
  const [isDrafting, startDraftTransition] = useTransition();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          setError(null);
          startTransition(async () => {
            const result = await sendManualReply(leadId, body);
            if (result.deliveryError) {
              setError(result.deliveryError);
            }
            setBody("");
          });
        }}
        className="flex gap-2"
      >
        <input
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Send a reply…"
          required
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={isDrafting}
          onClick={() => {
            setError(null);
            startDraftTransition(async () => {
              try {
                const draft = await generateAiDraft(leadId);
                setBody(draft);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Couldn't generate a draft.");
              }
            });
          }}
          className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
        >
          {isDrafting ? "Thinking…" : "Suggest with AI"}
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          Send
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-amber-600">{error}</p>}
    </div>
  );
}

export function CallForm({ leadId }: { leadId: string }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
      >
        Log a call
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const summary = data.get("summary");
        const outcome = data.get("outcome");
        if (typeof summary !== "string" || !summary.trim() || typeof outcome !== "string") return;
        startTransition(async () => {
          await logManualCall(leadId, summary, outcome);
          formRef.current?.reset();
          setOpen(false);
        });
      }}
      className="space-y-2 rounded-md border border-slate-200 p-3"
    >
      <textarea
        name="summary"
        placeholder="Call summary…"
        required
        rows={2}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <select name="outcome" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
        <option value="BOOKED">Booked estimate</option>
        <option value="FOLLOW_UP">Needs follow-up</option>
        <option value="NO_ANSWER">No answer</option>
        <option value="NOT_INTERESTED">Not interested</option>
      </select>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          Save call
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function EstimateForm({ leadId, defaultTitle }: { leadId: string; defaultTitle: string }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
      >
        Book an estimate
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const title = data.get("title");
        const scheduledAt = data.get("scheduledAt");
        if (typeof title !== "string" || typeof scheduledAt !== "string" || !scheduledAt) return;
        startTransition(async () => {
          await bookEstimate(leadId, title, scheduledAt);
          setOpen(false);
        });
      }}
      className="space-y-2 rounded-md border border-slate-200 p-3"
    >
      <input
        name="title"
        defaultValue={defaultTitle}
        required
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="scheduledAt"
        type="datetime-local"
        required
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
