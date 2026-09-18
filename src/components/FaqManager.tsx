"use client";

import { useRef, useState, useTransition } from "react";
import { addFaq, deleteFaq } from "@/app/actions/settings";

type Faq = { id: string; question: string; answer: string };

export function FaqManager({ initialFaqs }: { initialFaqs: Faq[] }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {initialFaqs.map((faq) => (
          <li key={faq.id} className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-900">{faq.question}</p>
                <p className="mt-1 text-sm text-zinc-600">{faq.answer}</p>
              </div>
              <button
                type="button"
                disabled={deletingId === faq.id}
                onClick={() => {
                  setDeletingId(faq.id);
                  startTransition(async () => {
                    await deleteFaq(faq.id);
                    setDeletingId(null);
                  });
                }}
                className="btn-danger-ghost shrink-0"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
        {initialFaqs.length === 0 && (
          <li className="text-sm text-zinc-500">
            No FAQs yet — the AI will say a team member will follow up until you add some.
          </li>
        )}
      </ul>

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const question = String(data.get("question") ?? "");
          const answer = String(data.get("answer") ?? "");
          setError(null);
          startTransition(async () => {
            try {
              await addFaq(question, answer);
              formRef.current?.reset();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to add FAQ.");
            }
          });
        }}
        className="space-y-2 rounded-xl border border-dashed border-zinc-300 p-3.5"
      >
        <input name="question" placeholder="Question (e.g. Do you offer financing?)" required className="input" />
        <textarea name="answer" placeholder="Answer" required rows={2} className="input" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={isPending} className="btn-primary btn-sm">
          Add FAQ
        </button>
      </form>
    </div>
  );
}
