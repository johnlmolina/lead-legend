"use client";

import { useState, useTransition } from "react";
import { sendMessage, simulateInboundMessage } from "@/app/actions/conversations";
import { generateAiDraft } from "@/app/actions/ai";
import { advanceLeadStatus } from "@/app/actions/leads";
import { SparkIcon } from "@/components/icons";

const INTENT_LABELS: Record<string, string> = {
  interested: "interested",
  not_interested: "not interested",
  unclear: "unclear",
};

export function SendMessageForm({ leadId }: { leadId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, startSendTransition] = useTransition();
  const [isDrafting, startDraftTransition] = useTransition();
  const [assessment, setAssessment] = useState<{
    intent: string;
    qualified: boolean;
    wantsHuman: boolean;
  } | null>(null);
  const [applyingStatus, startApplyTransition] = useTransition();
  const [deliveryNote, setDeliveryNote] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          setError(null);
          setDeliveryNote(null);
          startSendTransition(async () => {
            try {
              const result = await sendMessage(leadId, body);
              setBody("");
              setAssessment(null);
              if (result.note) setDeliveryNote(result.note);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to send.");
            }
          });
        }}
        className="flex gap-2"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          className="input flex-1"
        />
        <button
          type="button"
          disabled={isDrafting}
          onClick={() => {
            setError(null);
            startDraftTransition(async () => {
              const result = await generateAiDraft(leadId);
              if (result.status === "ok") {
                setBody(result.replyText);
                setAssessment({
                  intent: result.intent,
                  qualified: result.qualified,
                  wantsHuman: result.wantsHuman,
                });
              } else if (result.status === "blocked") {
                setError(
                  `AI draft was blocked by a safety check (${result.reasons.join(", ")}) — write this one yourself.`
                );
              } else {
                setError(result.message);
              }
            });
          }}
          className="btn-secondary shrink-0"
        >
          <SparkIcon className="h-3.5 w-3.5" />
          {isDrafting ? "Thinking…" : "Suggest with AI"}
        </button>
        <button type="submit" disabled={isSending} className="btn-primary shrink-0">
          Send
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {deliveryNote && <p className="text-sm text-accent-700">{deliveryNote}</p>}
      {assessment && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3.5 py-2.5 text-sm text-indigo-900">
          <span>
            AI reads this lead as <strong>{INTENT_LABELS[assessment.intent] ?? assessment.intent}</strong>
            {assessment.qualified && " and ready for an estimate"}
            {assessment.wantsHuman && " — recommends handing this off to a person"}
            .
          </span>
          {assessment.qualified && (
            <button
              type="button"
              disabled={applyingStatus}
              onClick={() => {
                startApplyTransition(async () => {
                  try {
                    await advanceLeadStatus(leadId, "qualified");
                    setAssessment(null);
                  } catch {
                    // Only fails if the lead is already past "qualified" or
                    // in lost/do_not_contact — leave the badge as-is either
                    // way; the status dropdown remains the source of truth.
                  }
                });
              }}
              className="rounded-full border border-indigo-300 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-60"
            >
              Mark as qualified
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function SimulateInboundForm({ leadId }: { leadId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return;
        setError(null);
        startTransition(async () => {
          try {
            await simulateInboundMessage(leadId, body);
            setBody("");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to simulate.");
          }
        });
      }}
      className="flex gap-2"
    >
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What the lead would text back…"
        className="input flex-1 border-amber-200 bg-amber-50/60 focus:border-amber-400"
      />
      <button type="submit" disabled={isPending} className="btn-secondary shrink-0 border-amber-300 text-amber-800 hover:bg-amber-50">
        Simulate
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
